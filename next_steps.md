# Next Steps

Refactoring backlog identified after the structural reorganization (repositories, services, formatters, split controllers). Items are ordered by priority.

## Recommended order

1. ~~Items 1 and 2 together~~ — done (see below).
2. ~~Items 3 and 4~~ — done (see below).
3. ~~Item 5~~ — done (see below). **Next: item 6 (RBAC)**, built on top of typed routes and centralized error handling.
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

## 5. Security quick wins — DONE

**Done:**
- CORS (`src/middleware/cors.ts`): `origin: "*"` + `credentials: true` replaced by a single allowed origin derived from the existing variables, with no new env var. It is the origin of `FRONT_URL` (`https://escola.app`), or of `FRONT_URL_DEV` (`http://localhost:4200`) when `NODE_ENV=development`, the same rule `email.ts` uses. `credentials` was dropped: the frontend sends the JWT in the `Authorization` header (stored in localStorage) and uses no cookies or `withCredentials`.
- Rate limiting (`src/middleware/rateLimit.ts`, `express-rate-limit`, in-memory store), keyed by the normalized email, not by IP, so it needs no proxy configuration:
  - `POST /login` (staff): 10 failed attempts per email per 15 min. Successful logins and 5xx responses are not counted.
  - `POST /reset-password`: 5 requests per email per hour.
  - Blocked requests get `429 { status, message }` plus `Retry-After` and `RateLimit` headers. The window starts at the first counted request and clears on server restart.
  - `POST /login/student` and `POST /login/renew-password` are deliberately NOT limited (students often mistype; renew already requires the emailed token).
- Fail-fast (`src/utils/env.ts`, `assertRequiredEnv()` called in `src/index.ts` before `listen`): the server exits with code 1 listing only the names of missing variables (never values).
  - Required: `SECRET`, `SERVER_PORT`, `DB_HOST`, `DB_USER`, `DB_NAME` (non-empty), `DB_PASS` (defined, may be empty), and `FRONT_URL` (`FRONT_URL_DEV` in development), which must be a valid URL because CORS depends on it.
  - Warning only: `EMAIL`, `EMAIL_PASS`, `RESET_URL` / `RESET_URL_DEV`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`.
- Verified by `tests/security.test.ts` (11 tests), old vs new boot comparison with ts-node in development and production modes (26 requests: identical status and body except the expected CORS headers and 429s), and a local end-to-end run against the real local database (CORS headers, 10×401 then 429 on login, student login never limited, 5×404 then 429 on reset, fail-fast exit codes).

**Pending:**
- Frontend: `FetchDataService.errorHandler` has no `case 429`, so a blocked login or reset shows no dialog. Adding a case that opens the dialog with `message` is a one-line change in `iescolaFront2024`.
- The in-memory store is per process. If the API ever runs in pm2 cluster mode or serverless, move to a shared store.

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
- `SIGTERM` / `SIGINT` handlers in `src/index.ts` only call `Schedulers.shutdown()` and never close the server or exit, so the process ignores `kill` and only stops with `kill -9`. Close the HTTP server and exit after the scheduler shutdown.
- `DB_PORT` is only read by the TypeORM `data-source.ts`, which is never initialized; the mysql2 pool (`src/services/db.ts`) ignores it and always uses 3306.
- 8 high-severity `npm audit` findings pre-date item 5 (body-parser, qs, proxy-addr, nodemailer, mysql2, pm2 chain). Review them in a dedicated dependency-upgrade task, not with `npm audit fix --force`.

## 11. Tests

With data access isolated in repositories, controllers can be tested with repository stubs and no database.

- Start with critical flows: login, `saveTest` / `updateTest`, transfers, `updateStudentAnswers`.
- Run `npx tsc --noEmit` and `npm test` automatically on every push (CI).

## 12. Training (formações) presence screen — DONE

**Done:**
- `qTeacherTrainings` no longer runs N+1 queries (batched by variant); `qPresence` selects explicit columns; list pagination has a deterministic `ORDER BY` and `search` covers month, meeting, discipline, creator and `observation` (LIKE wildcards escaped).
- Presence payload (`GET /training/presence`): `allReferencedTrainings[].observation` (meeting reference date, `DD/MM/YYYY`) and `allReferencedTeachers[].startedAt` (`MIN(teacher_class_discipline.startedAt)`, current year only, else `null`).
- PEBI (category 1): teachers with an ended relation (`endedAt` set) stay listed in the current year when they have any recorded status; the frontend shows them locked and grayed out. They count in the footer percentage only on meetings where they have a status.
- Footer `% PRESENÇA`: per meeting, denominator = teachers with any status marked, numerator = PRESENTE.
- Write guard: `PUT /training/teacher-presence/status/:id` and `.../observation/:id` return `400 "Encontro anterior ao vínculo do professor"` when the meeting date (`training.observation`, `DD/MM/YYYY`) is before the teacher's link start. Current year only; skipped when the teacher already has a status on that meeting, when the observation is not a valid date, or when no active relation exists. Implemented in `teacherClassDisciplineRepository.qIsMeetingBeforeTeacherLink` and `src/utils/meetingDate.ts`.

**Known approximations / pending:**
- The server-side link start is `MIN(startedAt)` over the teacher's active relations in the same classroom category (and discipline for PEBII). The frontend uses the value computed per listed row; for teachers with several relations in different schools the two can differ.
- The reference date lives in the free-text `training.observation`. A dedicated `DATE` column would remove the parsing on both sides.
- Frontend: `TeacherListComponent` now resets the shared radio/history selection on entry (stale `RadioComponent.subject` made Quadro Escolar request `option=2` after using "Disciplinas" in Formações). Other screens that use `RadioComponent` without rendering it may have the same stale-state issue.
