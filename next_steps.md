# Next Steps

Refactoring backlog identified after the structural reorganization (repositories, services, formatters, split controllers). Items are ordered by priority.

## Recommended order

1. Items 1 and 2 together (they remove the data-integrity risk).
2. Items 3, 4 and 5 (cheap, reduce exposure).
3. RBAC, built on top of typed routes and centralized error handling.
4. Remaining items as ongoing cleanup.

---

## 1. GET endpoints that write to the database (real risk)

`GET /test/:id/:year/:classroom` (`testController.getStudents`) performs writes:

| Method | Writes |
|---|---|
| `studentTestStatusRepository.unifiedTestQuestLinkSql` | 2 INSERT, 4 UPDATE |
| `studentTestStatusRepository.findAndDeleteStatusAndQuestions` | 2 DELETE, 1 UPDATE |
| `readingFluencyLinkRepository.linkReadingSql` | 1 DELETE, 2 INSERT, 4 UPDATE |
| `studentTestStatusRepository.updateStudentTestStatus` | 1 DELETE, 3 UPDATE |

Each call acquires its own connection, with no shared transaction. Two teachers opening the same screen at the same time can produce interleaved writes.

**Fix:** move the synchronization to write time (when a test is assigned to a classroom or a student is enrolled), or at minimum run all of it in a single idempotent transaction.

## 2. Connection and transaction management

- 143 repeated `connectionPool.getConnection()` / `conn.release()` blocks.
- Every repository method opens its own connection, so multi-step operations cannot share a transaction.

**Fix:** introduce `withConnection(fn)` and `withTransaction(fn)` helpers, and let repository methods accept an optional `conn` parameter.

## 3. Centralized error handling and error message leakage

- Controllers return `{ status, message: error.message }` in 91 places, exposing raw MySQL error text to the client.
- Every route repeats `res.status(response.status).json(response)`.

**Fix:** Express 5 already forwards async errors natively. Throw `HttpError` (already exists in `src/utils/helpers.ts`) and add a single error middleware. Controllers get smaller and internal details stop leaking.

## 4. Typing of `req.user`

- 56 occurrences of `(req as any).user` in `src/routes/` alone.

**Fix:** augment `Express.Request` with `user: JwtPayload` via declaration merging. Removes this `any` across the whole project at low cost.

## 5. Security quick wins

- CORS uses `origin: "*"` together with `credentials: true` (`src/index.ts`). The combination is invalid per spec and effectively leaves the API open to any origin. Replace with an explicit allowlist.
- No rate limiting on `/login` and `/reset-password`.
- The server boots even when `SECRET` is missing (`authorization.ts` falls back to `''`). Validate required environment variables at startup and fail fast.

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
