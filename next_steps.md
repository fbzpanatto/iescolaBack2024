# Next Steps

Refactoring backlog identified after the structural reorganization (repositories, services, formatters, split controllers). Items are ordered by priority.

## Recommended order

1. ~~Items 1 and 2 together~~ — done (see below).
2. ~~Items 3 and 4~~ — done (see below). **Next: item 5.**
3. RBAC, built on top of typed routes and centralized error handling.
4. Remaining items as ongoing cleanup.

---

## 1. GET endpoints that write to the database — DONE (retry), write-time sync deferred

`GET /test/:id/:year/:classroom` (`testController.getStudents`) performs writes:

| Method | Writes |
|---|---|
| `studentTestStatusRepository.unifiedTestQuestLinkSql` | 2 INSERT, 4 UPDATE |
| `studentTestStatusRepository.findAndDeleteStatusAndQuestions` | 2 DELETE, 1 UPDATE |
| `readingFluencyLinkRepository.linkReadingSql` | 1 DELETE, 2 INSERT, 4 UPDATE |
| `studentTestStatusRepository.updateStudentTestStatus` | 1 DELETE, 3 UPDATE |
| `readingFluencyRepository.findAndDeleteStatusAndReadingFluency` | 2 DELETE |
| `readingFluencyRepository.updateReadingFluencyStatus` | UPDATE |
| `alphabeticRepository.qLinkAlphabetic` | INSERT IGNORE, INSERT ... ON DUPLICATE KEY UPDATE |

**Corrected analysis.** The original concern ("no shared transaction, interleaved writes") was overstated. Each step already runs in its own transaction, locks the rows it changes with `FOR UPDATE`, and writes with idempotent upserts (`ON DUPLICATE KEY UPDATE` / `INSERT IGNORE`). A step interrupted halfway is repaired on the next screen load. The remaining real risk was a deadlock (1213) or lock wait timeout (1205) surfacing as a 500 on a flow that is just "open the screen" — the same failure `qLinkAlphabetic` had in the past and fixed with a deterministic lock order plus retry.

**Done:**
- The six scored-test and reading-fluency sync steps now run through `withTransaction` (item 2), which retries on 1213/1205 up to 3 attempts with a 50 ms × attempt backoff — the policy `qLinkAlphabetic` and `updateAllStudentTestStatus` already used.
- SQL, statement order, parameters and logs are unchanged. Verified by a side-by-side trace comparison of the old and new code (25 scenarios: identical SQL, parameters, begin/commit/rollback/release sequence, logs and return values) plus `tests/db-transaction.test.ts`.
- The response payload of `getStudents` is unchanged, so the frontend contract (`FetchDataService.getOne('test', ...)`) is preserved.

**Deferred (not 1:1):**
- Merging all sync steps into a single transaction: holds locks longer and can create new deadlocks; only worth it with load testing against MySQL 8.
- Moving the synchronization to write time (test assigned to a classroom, student enrolled or transferred): removes writes from GET, but changes *when* the rows appear and touches many write paths. Treat as a separate, behavior-changing task.

## 2. Connection and transaction management — DONE (helpers), gradual migration pending

- Added `src/services/dbTransaction.ts`:
  - `withTransaction(fn)`: acquires a connection, runs `fn` inside begin/commit, rolls back and releases on error, retries on 1213/1205. `fn` must be idempotent and must not mutate its inputs, because it is re-executed from scratch on retry.
  - `withConnection(fn)`: acquires and always releases a connection, for read-only methods.
- Applied so far to the six sync methods listed in item 1.
- **Pending:** migrate the remaining ~140 `getConnection()` / `release()` blocks gradually, one domain at a time, with the same trace-equivalence check. `qLinkAlphabetic` and `updateAllStudentTestStatus` keep their own retry loops for now and are candidates for `withTransaction`.
- **Pending:** let repository methods accept an optional `conn` so multi-step write operations can share one transaction when that becomes necessary.

## 3. Centralized error handling and error message leakage — DONE (route level), controller refactor pending

**Done:**
- Added `src/utils/sendResponse.ts`. All 131 route handlers that repeated `res.status(response.status).json(response)` now call `sendResponse(res, response)`.
  - Non-500 responses are sent unchanged.
  - 500 responses that carry a `message` keep the same status, the same keys in the same order, and get `message: 'Erro interno do servidor.'`; the original message is logged with `console.error`.
- `havePermission` no longer returns `error.message` on 500 (same `{ message }` body shape, generic text, original logged).
- Frontend contract verified: `FetchDataService.errorHandler` always shows its own generic text on 500 and never displays `error.message`; components only test `response.error` for truthiness, and `inactives.component.ts` reads `error.status === 500` from the body, which is preserved. All 10 deep table components under `components/test/**/tables/` delegate to `utils.service.ts` and only log errors to the browser console.
- Verified by running all 132 route handlers old vs new against 8 response scenarios: 925 identical cases; in the 131 raw-500 cases only the `message` text changed. Plus `tests/send-response.test.ts`.

**Pending (not 1:1, deliberately deferred):**
- Global Express error middleware: it would turn unhandled exceptions from Express's default HTML 500 into JSON, which changes behavior (e.g. `inactives.component.ts` would start seeing `status: 500`).
- Replacing the ~90 `return { status: 500, ... }` controller catches with `throw new HttpError(...)`.
- `catch (error: any)` in `authorization.ts` and in controllers.

## 4. Typing of `req.user` — DONE

- Added `src/interfaces/express.ts` (augments `Express.Request` with `user: JwtPayload`), imported at the top of `src/index.ts` so `ts-node` type-checking (`npm run dev`) also sees it.
- Replaced every `(req as any).user` / `(request as any).user` with `req.user`, and every `res: any` in routes, middlewares and `index.ts` with `res: Response`.
- `authorization.ts` casts the verified token to `JwtPayload`.
- Route param types `Request<{ id: number | string }>` corrected to `Request<{ id: string }>` (Express params are always strings).
- Verified by compiling before and after: the emitted JavaScript is byte-identical except for the `require` of the empty `interfaces/express` module.
- Note: `req.user` is typed as always present, including on `/login` and `/reset-password`, which never read it. If stricter typing is wanted, make it optional and use a dedicated authenticated request type.

## 5. Security quick wins — NEXT

- CORS uses `origin: "*"` together with `credentials: true` (`src/index.ts`). The combination is invalid per spec and effectively leaves the API open to any origin. Replace with an explicit allowlist.
- No rate limiting on `/login` and `/reset-password`.
- The server boots even when `SECRET` is missing (`authorization.ts` falls back to `''`). Validate required environment variables at startup and fail fast.

**Inputs needed before implementing:** the frontend production origin(s) and the development origin (e.g. `http://localhost:4200`). Check how the frontend sends the token (`auth.interceptor.ts`): if it uses the `Authorization` header and no cookies, `credentials: true` is not needed. Before adding fail-fast validation, confirm which environment variables production actually defines (`SECRET`, `DB_*`, `SERVER_PORT`, email and S3 keys), so the server does not refuse to start in production.

## 6. RBAC (role-based access control)

Today there are two mixed permission layers:

1. **`havePermission` + `src/utils/permissions.ts`:** a hardcoded matrix of category × entity × HTTP verb. The entity is derived from the URL string (`req.baseUrl.split('/')[1]...`), so renaming a route silently changes its permission, and it cannot distinguish two endpoints that share the same verb within the same entity.
2. **53 `PER_CAT.*` checks spread across 20 controllers:** some are pure permission gates (e.g. "students cannot access"), others are data-scope rules (`testAccessService.isRestrictedCreator`, a teacher's classrooms).

**Proposed design:**

- Tables: `role`, `permission` (codes such as `test:update`, `report:read`), `role_permission`, `user_role`. Initially map each `person_category` to a role so login does not change.
- Each route declares the action it requires, e.g. `requirePermission('test:update')`, replacing the URL-based entity inference.
- Permissions cached in memory: loaded at boot and invalidated on change, so there is no query per request.
- Split the 53 checks: pure permission gates become database records; data-scope rules become testable policy functions in code (e.g. `canAccessClassroom(user, classroomId)`). Data scoping does not belong in the database.

## 7. Finish TypeORM removal

- Models are still used as types.
- `GenericController` depends on `EntityTarget`.
- `initialConfigs` uses `AppDataSource`.

**Fix:** replace models with plain interfaces/DTOs, then drop the `typeorm` dependency and the decorators (`experimentalDecorators`, `emitDecoratorMetadata`).

## 8. Inheritance → composition

Every controller extends `GenericController`, even those that do not use its CRUD (e.g. `testCreate` calls `super(Test)` for nothing).

**Fix:** turn the generic CRUD into a factory used only by simple catalog routes (bimester, state, disability, etc.).

## 9. Single validation layer

Validation is split between express-validator, class-validator and manual checks inside controllers.

**Fix:** consolidate into `src/schemas/` with typed DTOs.

## 10. Cleanup

- Dead code: `testListingRepository.testByClassroomAndTeacher_backup`, `transport_backup` in `src/services/email.ts`.
- Legacy names: `qfindAllByYearNewImplementation`, `studentsClassroomsNewImplementation`, `bactchQueryAlphaQuestions` (typo).
- Mixed Portuguese/English identifiers: `podeApagarDoS3`, `deletarDoS3`, `moverParaQuestions`, `moverParaLessons`.
- Remaining `SELECT *` queries (e.g. `qCurrentYear`, `qStates`), kept for now by decision since they return few rows.
- Pre-existing unused imports (`StudentClassroom` in `StudentQuestion.ts`, `TeacherBody` in `classroom.ts`, `Bimester` in `studentDisabilities.ts`, `FindManyOptions` in `transfer.ts`, `Schema` in `validators.ts`).

## 11. Tests

With data access isolated in repositories, controllers can be tested with repository stubs and no database.

- Start with critical flows: login, `saveTest` / `updateTest`, transfers, `updateStudentAnswers`.
- Run `npx tsc --noEmit` and `npm test` automatically on every push (CI).
