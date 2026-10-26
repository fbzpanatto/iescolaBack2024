# iescolaBack2024

## Stack & Architecture
- Backend: Node.js, Express, TypeScript, MySQL.
- Database: TypeORM (legacy, being removed) and mysql2 (new standard).
- Entrypoint: `src/index.ts` (starts the server and mounts every Router).
- TypeORM DataSource: `src/data-source.ts`.
- Routes: `src/routes/` — each Router maps HTTP verbs to a controller method.
- Controllers: `src/controller/` — HTTP-facing logic, one file per use case when an entity grows (e.g. `test.ts`, `testCreate.ts`, `testUpdate.ts`, `testGraphic.ts`, `testQuery.ts`; `student.ts`, `studentCreate.ts`, `studentUpdate.ts`).
- Generic CRUD base: `src/controller/genericController.ts` (`findAllWhere`, `findOneById`, `save`, `updateId` driven by `GenericTableConfig`). It holds no domain queries.
- Data access (mysql2): `src/repositories/<domain>.repository.ts`, each exporting a singleton (e.g. `yearRepository`, `testRepository`, `studentTestStatusRepository`). Controllers call `xRepository.method(...)`, never `this.method(...)` for queries.
- Domain services: `src/services/<name>.service.ts` (e.g. `test-question.service.ts`, `test-totals.service.ts`, `test-access.service.ts`, `student-similarity.service.ts`), plus infrastructure services (`email.ts`, `s3.service.ts`).
- mysql2 connection pool: `src/services/db.ts` (`connectionPool`).
- Formatters: `src/utils/formatters/<domain>.formatter.ts` (static classes, e.g. `TestFormatter`, `TestReportFormatter`, `StudentFormatter`).
- Generic helpers: `src/utils/helpers.ts` (`Helper` date/code utilities and `HttpError`); `src/utils/sqlDateTime.ts` (`toSqlUtcDateTime`).
- Middlewares: `src/middleware/`.
- Schemas/Validation: `src/schemas/`.
- Models (TypeORM): `src/model/`.

## Commands
- Dev: `npm run dev`
- Build: `npm run build`
- Type-check: `npx tsc --noEmit`
- Tests: `npm test`

## Project rules
- DO NOT write new code using TypeORM. All migrations and new code use plain mysql2.
- Before migrating a TypeORM method, read the `escolapp-mysql2` skill to follow the query, transaction and formatting patterns.
- Never use `SELECT *`.
- Local database access is **READ-ONLY** (SELECT, DESCRIBE, EXPLAIN).
- New queries go into the matching domain repository; new response shaping goes into the matching formatter. Keep files under ~500 lines by splitting per domain or use case.
- Tests stub data access on the repository singletons (e.g. `mock.method(yearRepository, 'qCurrentYear', ...)`), not on controller instances.
