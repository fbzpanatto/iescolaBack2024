# Backend Structure

Reference for how `iescolaBack2024` is organized and where new code should go. Project rules (mysql2 only, read-only local database, contracts with the frontend) are in `CLAUDE.md`; this file describes the layout.

## Stack

- Node.js 22, Express 5, TypeScript (strict), MySQL
- Data access: `mysql2` pool (standard for all new code); TypeORM is legacy and being removed
- Validation: `express-validator` (`checkSchema`); security: `helmet`, `cors`, `express-rate-limit`, JWT (`jsonwebtoken`), `bcrypt`
- Other: `node-schedule` (cron jobs), `nodemailer`, AWS S3 (`@aws-sdk/client-s3`)
- Tests: Node's built-in test runner (`node --test`) with `ts-node/register/transpile-only`

Scripts:

| Script | What it does |
| --- | --- |
| `npm run dev` | `nodemon` on `src/index.ts` with `NODE_ENV=development` |
| `npm run build` | `rimraf ./public && tsc` (compiles `src/` into `public/`) |
| `npm start` | runs `public/index.js` with `NODE_ENV=production` |
| `npm run pm2` | build, then start under pm2 |
| `npm test` | runs `tests/**/*.test.ts` |
| `npx tsc --noEmit` | type-check |

`vercel.json` points to `public/index.js`.

## Top level

```
.
├── CLAUDE.md          project rules for Claude Code
├── STRUCTURE.md       this file
├── next_steps.md      refactoring backlog, ordered by priority
├── src/               TypeScript sources
├── tests/             test suite and baseline snapshots
├── migrations/        dated SQL scripts (with rollback files), listed in .gitignore
├── public/            compiled JavaScript (tsc outDir), generated and git-ignored
├── package.json, tsconfig.json, vercel.json
└── .env               local variables (never commit); required names are validated in src/utils/env.ts
```

`tsconfig.json`: `rootDir` is `./src`, `outDir` is `./public`, strict mode on, `tests` excluded from the build.

## `src/`

```
src/
├── index.ts          entrypoint: env check, middlewares, router mounting, listen, schedulers
├── data-source.ts    TypeORM DataSource (legacy)
├── routes/           one Router per resource
├── controller/       HTTP-facing logic
├── repositories/     mysql2 data access, one singleton per domain
├── services/         db pool, transactions, domain and infrastructure services
├── middleware/       auth, permissions, cors, rate limit, validators
├── schemas/          express-validator schemas
├── utils/            helpers, enums, env, permissions, formatters
├── interfaces/       shared types and Express augmentation
├── model/            TypeORM entities (legacy)
└── mock/             seed data
```

### Request flow

```
request
  -> index.ts (cors, helmet, json parser)
  -> authorization (all routes except /login and /reset-password)
  -> routes/<resource>.ts   (validators, havePermission)
  -> controller/<resource>.ts
  -> repositories/<domain>.repository.ts   (mysql2, parameterized SQL)
  -> utils/formatters/<domain>.formatter.ts (response shaping)
  -> sendResponse(res, response)
```

### `index.ts`

- Loads `dotenv`, imports `interfaces/express` (augments `Express.Request` with `user`), calls `assertRequiredEnv()` before `listen`.
- Mounts every Router under `route.use("/<path>", authorization, <Router>)`; `/login` and `/reset-password` are mounted without `authorization`; `GET /` answers `{ message: "OK" }`.
- Starts `Schedulers.initialize()` after `listen` and shuts them down on `SIGTERM`/`SIGINT`.
- A new resource needs its Router imported and mounted here.

### `routes/`

- One file per resource (`year.ts`, `test.ts`, `student.ts`, ...), each exporting a Router (e.g. `YearRouter`).
- Each handler maps an HTTP verb to a controller method and answers with `sendResponse(res, response)` (`utils/sendResponse.ts`), which hides raw 500 messages from the client and logs them.
- Validators and `havePermission` are composed per route, for example `ID_PARAM`, `VALIDATE_YEAR`, `BODY_VALIDATION_YEAR`.
- `initialConfigs.ts` seeds initial data from `mock/` and is not mounted in `index.ts`.

### `controller/`

- A controller is a class (usually extending `GenericController`) exported as a singleton (e.g. `yearController`).
- Responses are `{ status, data }` or `{ status, message }`.
- When an entity grows, split by use case, one file each: `test.ts`, `testCreate.ts`, `testUpdate.ts`, `testGraphic.ts`, `testQuery.ts`; `student.ts`, `studentCreate.ts`, `studentUpdate.ts`.
- `genericController.ts` is the generic CRUD base (`findAllWhere`, `findOneById`, `save`, `updateId`, driven by `GenericTableConfig`). It holds no domain queries.
- Controllers call `xRepository.method(...)` for data; they never run queries themselves.

### `repositories/` (mysql2)

- `<domain>.repository.ts`, each exporting a singleton (`yearRepository`, `testRepository`, `studentTestStatusRepository`, ...).
- Method names follow the `q<Action>` style used in the codebase (e.g. `qYearsWithPeriods`, `qCreateYear`).
- Large domains are split into several repositories: tests (`test`, `test-listing`, `test-question`, `test-token`), students (`student`, `student-test`, `student-test-status`, `student-merge`), reports (`alphabetic`, `alphabetic-report`, `reading-fluency`, `reading-fluency-link`), plus `auth`, `catalog`, `classroom`, `history`, `lesson`, `school`, `teacher`, `teacher-class-discipline`, `training`, `transfer`, `year`.
- Follow the `escolapp-mysql2` skill for queries, transactions and formatting. Never `SELECT *`.

### `services/`

- `db.ts`: mysql2 `connectionPool`.
- `dbTransaction.ts`: `withTransaction` (retries on deadlock 1213 and lock wait timeout 1205; the callback must be idempotent) and `withConnection`.
- Domain services: `test-question.service.ts`, `test-totals.service.ts`, `test-access.service.ts`, `student-similarity.service.ts`.
- Infrastructure: `email.ts`, `s3.service.ts`.

### `middleware/`

- `authorization.ts` (verifies the Bearer JWT with `SECRET` and sets `req.user`; answers 401 otherwise), `havePermission.ts` (derives the entity from the first URL segment with dashes removed, then checks person category + entity + HTTP method in `utils/permissions.ts`; answers 403 otherwise), `cors.ts` (single allowed origin from `FRONT_URL` / `FRONT_URL_DEV`), `rateLimit.ts` (per-email limiters on `POST /login` and `POST /reset-password`; `POST /login/student` stays without rate limiting), `validators.ts` (`express-validator` chains built from `schemas/`), `brazilianUTCheck.ts` (`checkDatetime`: blocks requests on weekends and outside 06:00-19:00, `America/Sao_Paulo`).

### `schemas/`

`express-validator` schemas, one per domain (`classroom`, `student`, `studentQuestion`, `studentTestQuestions`, `teacher`, `test`, `training`, `year`, `first-level`). Each is wrapped in `validators.ts` as `VALIDATE_*` plus a `BODY_VALIDATION_*` handler.

### `utils/`

- `formatters/`: `<domain>.formatter.ts`, static classes that shape responses (`TestFormatter`, `TestReportFormatter`, `StudentFormatter`, `AlphabeticFormatter`, `ReadingFluencyFormatter`, `TrainingFormatter`, `UserFormatter`).
- `enums.ts`: ids and constants (`TEST_CATEGORIES_IDS`, `PER_CAT`, `TRANSFER_STATUS`, option labels, ...).
- `permissions.ts`: permission table by person category, entity and method.
- `env.ts`: `assertRequiredEnv()`; a new required variable must be added here and defined in production before deploying.
- `helpers.ts` (`Helper` date/code utilities, `HttpError`), `sqlDateTime.ts` (`toSqlUtcDateTime`), `sendResponse.ts`, `schedulers.ts` (`node-schedule` jobs, e.g. closing expired tests), `answerKeys.ts`, `correctLabels.ts`, `generatePassword.ts`, `studentLoginSanitizer.ts`, `studentToken.ts`, `meetingDate.ts`, `bodyValidations.ts`, `getTimeZone.ts`.

### `interfaces/`

- `express.ts`: augments `Express.Request` with `user: JwtPayload`; use `req.user`, never `(req as any).user`.
- `interfaces.ts`: shared types (including `JwtPayload`).

### `model/` and `data-source.ts` (legacy)

TypeORM entities (one per table, indexed by `model/index.ts`) and the DataSource. Do not write new code with TypeORM; they stay until the remaining controllers are migrated.

## Tests

```
tests/
├── *.test.ts          unit/behavior tests (security, send-response, db-transaction, student-token, ...)
├── fixtures.ts        shared fixtures
├── capture.ts         captures responses for the baseline
├── baseline.ts        regenerates __snapshots__/baseline.json (run once, before a change)
└── __snapshots__/     baseline.json
```

- Tests stub data access on the repository singletons (e.g. `mock.method(yearRepository, 'qCurrentYear', ...)`), not on controller instances.
- The baseline freezes legacy response payloads so migrations can be checked against them.

## Where does new code go?

| You are adding | Put it in |
| --- | --- |
| A new endpoint on an existing resource | `routes/<resource>.ts` -> controller method -> repository method |
| A new resource | `routes/`, `controller/`, `repositories/`, mount in `index.ts`, add schema in `schemas/` if it has a body |
| A SQL query | the matching `repositories/<domain>.repository.ts` |
| Response shaping | the matching `utils/formatters/<domain>.formatter.ts` |
| A write that touches several tables | repository method using `withTransaction` (idempotent callback) |
| Business logic shared by several controllers | `services/<name>.service.ts` |
| Body or param validation | `schemas/` plus `validators.ts` |
| A required environment variable | `utils/env.ts`, then define it in production before deploy |
| A scheduled job | `utils/schedulers.ts` |
| A schema change | a dated SQL script in `migrations/` with its rollback |

## Rules that shape the layout

- Keep files under ~500 lines by splitting per domain or use case (more repositories, more controller files), never by changing logic.
- The response payload is a contract with the frontend (`iescolaFront2024`, `src/app/shared/services/fetch-data.service.ts`): keep status codes, body keys and key order unless a change is agreed.
- Local database access is read-only (SELECT, DESCRIBE, EXPLAIN).
- No `SELECT *`; no new TypeORM code.
