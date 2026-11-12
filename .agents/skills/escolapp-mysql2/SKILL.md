---
name: escolapp-mysql2
description: TypeORM-to-plain-mysql2 migration and SQL query writing in EscolApp. Use when creating, migrating or reviewing any database access method — SELECT/INSERT/UPDATE/DELETE queries, transactions, controllers that still use AppDataSource. Covers the project's mandatory patterns for connections, transactions, parameterization, return formatting and performance.
---

# EscolApp — data access with mysql2

## Critical context

EscolApp is **in production** and its automated test coverage is still **limited**
(`tests/`: a golden master for `testController.getStudents`, student-token contracts and
the transaction helpers). Most validation is manual, end to end. A silent error reaches
the end user.

Direct consequences for your behavior:
- Precision is worth more than speed. Prefer asking to assuming.
- When migrating a method, the logic and business rules must stay **identical**.
  You are rewriting the access mechanism, not redesigning the method.
- The shape of the returned object is a **contract with the frontend**. If the shape
  changes, the screen breaks. Preserving the shape matters as much as returning the right data.
- If you spot a bug or a possible improvement during a migration, **report it separately**
  instead of fixing it in the same change. One change at a time.

## Project state

Two access styles coexist today:
- **TypeORM (`AppDataSource`)** — legacy, being removed.
- **mysql2 (`connectionPool`)** — the target. All new or migrated code uses it.

Never suggest TypeORM, Prisma, Sequelize or any other ORM.

### Where things live
- Routes: `src/routes/*.ts` — thin, they only validate and call the controller.
- Controllers: `src/controller/*.ts` — HTTP-facing logic, split by use case when an entity
  grows (e.g. `test.ts`, `testCreate.ts`, `testUpdate.ts`, `testGraphic.ts`, `testQuery.ts`).
  Some still contain `AppDataSource` calls to migrate.
- Generic CRUD base: `src/controller/genericController.ts` (`findAllWhere`, `findOneById`,
  `save`, `updateId`). **It holds no domain queries — do not add methods there.**
- mysql2 methods: `src/repositories/<domain>.repository.ts`, each exporting a singleton
  (`yearRepository`, `testRepository`, `studentTestStatusRepository`, ...). **This is where
  every new or migrated method is born.** Pick the repository of the domain the query
  belongs to; create a new one only for a new domain.
- Formatters: `src/utils/formatters/<domain>.formatter.ts` — static classes
  (`TestFormatter`, `TestReportFormatter`, `StudentFormatter`, ...).
- Generic helpers: `src/utils/helpers.ts` (`Helper` date/code utilities and `HttpError`);
  `src/utils/sqlDateTime.ts` (`toSqlUtcDateTime`).
- Domain services: `src/services/<name>.service.ts`.
- Connection pool: `src/services/db.ts`, exported as `connectionPool`.
- Transaction helpers: `src/services/dbTransaction.ts` (`withTransaction`, `withConnection`).

Controllers call repositories as `xRepository.method(...)`, never `this.method(...)`.

## Layered flow

Route → Controller → Repository method.

The route validates params with middlewares (`ID_PARAM`, `CLASSROOM_ID_PARAM`, `havePermission`),
calls the controller and responds:

```typescript
const response = await controller.getStudents(req, req.user);
return sendResponse(res, response)
```

`req.user` is typed through `src/interfaces/express.ts` — never write `(req as any).user`.
`sendResponse` (`src/utils/sendResponse.ts`) sends non-500 responses unchanged; on a 500 with
a `message` it keeps status and keys, replaces the text with a generic one and logs the original.

Never put logic in the route.

**Response envelope** (built in the controller):
- Success: `{ status: 200, data }` — or `201` on creation
- Not found: `{ status: 404, message: "..." }`
- Error: `{ status: 500, message: error.message }` — the raw text is logged and hidden from
  the client by `sendResponse`; the body keys (`status`, `message`) are part of the contract
  (`inactives.component.ts` reads `error.status` from the body).

## Pattern 1 — Read (SELECT / GET)

```typescript
async qTestQuestions(testId: number | string) {
  let conn;
  try {
    conn = await connectionPool.getConnection();
    const query =
      `
      SELECT
          tq.id AS test_question_id,
          tq.order AS test_question_order,
          tq.answer AS test_question_answer,
          tq.active AS test_question_active,
          qt.id AS question_id,
          qg.id AS question_group_id,
          qg.name AS question_group_name,
          sk.id AS skill_id,
          sk.reference AS skill_reference,
          sk.description AS skill_description
      FROM test_question AS tq
      INNER JOIN question AS qt ON tq.questionId = qt.id
        LEFT JOIN skill AS sk ON qt.skillId = sk.id
      INNER JOIN question_group AS qg ON tq.questionGroupId = qg.id
      INNER JOIN test AS tt ON tq.testId = tt.id
      WHERE tt.id = ?
      ORDER BY qg.id, tq.order
    `
    const [ queryResult ] = await conn.query(query, [testId])
    return TestFormatter.testQuestions(queryResult as qTestQuestions[])
  }
  catch (error) { console.error(error); throw error }
  finally { if (conn) { conn.release() } }
}
```

(Real example: `testQuestionRepository.qTestQuestions`.)

Inviolable rules of this pattern:
- `let conn;` declared outside the `try` — otherwise the `finally` cannot see it.
- `finally { if (conn) { conn.release() } }` **always**. An unreleased connection exhausts the pool.
- `catch` logs and **rethrows** (`throw error`). Never swallow the error.
- Destructure as `const [ queryResult ] = await ...` (rows; discards fields).

`withConnection(async (conn) => { ... })` from `dbTransaction.ts` is the equivalent
shorthand (it always releases). The explicit form above remains valid and is what most
existing read methods use; migrate them only one domain at a time.

## Pattern 2 — Write (INSERT / UPDATE / DELETE)

**Standard for new and migrated write methods: `withTransaction`.**

```typescript
async qSetFirstLevel(studentId: number, levelId: number, userId: number) {
  try {
    return await withTransaction(async (conn) => {
      const query = `
        INSERT INTO alphabetic_first (studentId, alphabeticFirstId, createdByUser, updatedByUser, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE alphabeticFirstId = VALUES(alphabeticFirstId), updatedByUser = VALUES(updatedByUser), updatedAt = VALUES(updatedAt)
      `
      const [ queryResult ] = await conn.query(query, [studentId, levelId, userId, userId])
      return queryResult as ResultSetHeader
    })
  }
  catch (error) { console.error(error); throw error }
}
```

`withTransaction` acquires the connection, calls `beginTransaction()`, commits on success,
rolls back on error and always releases. It also **retries the whole callback** on deadlock
(1213) or lock wait timeout (1205), up to 3 attempts with a 50 ms × attempt backoff — the
same policy `alphabeticRepository.qLinkAlphabetic` and
`studentTestStatusRepository.updateAllStudentTestStatus` implement by hand.

Rules of this pattern:
- Early returns are plain `return` inside the callback — the helper commits.
  Never call `commit()`, `rollback()` or `release()` inside the callback.
- ⚠️ The callback is re-executed from scratch on retry: it must be **idempotent**
  (read current state, then write with upserts) and must **not mutate its parameters**.
  Accumulate in local arrays/sets only.
- Keep the outer `try/catch` only when the method logs; methods that did not log can
  simply `return withTransaction(...)`.
- `ON DUPLICATE KEY UPDATE` with `VALUES(...)` for upserts.
- `FOR UPDATE` when reading rows the transaction itself will change — only on the
  affected rows, never the whole table.
- When several statements lock rows of the same tables, issue them in a deterministic
  order (sorted ids) so concurrent requests queue instead of deadlocking.

**Legacy explicit form** (still present in many methods; valid, but do not write new ones):

```typescript
let conn;
try {
  conn = await connectionPool.getConnection()
  await conn.beginTransaction();
  // ...
  await conn.commit()          // on EVERY success path, including early returns:
                               // if (nothing.length === 0) { await conn.commit(); return }
}
catch (error) { if (conn) await conn.rollback(); console.error(error); throw error }
finally { if (conn) { conn.release() } }
```

Converting a legacy method to `withTransaction` must keep SQL, statement order, parameters
and logs identical; verify it by comparing the old and new execution traces before shipping.

## Pattern 3 — Orchestration (in the controller)

Call several repository methods (`Promise.all` when independent) and process in
memory: `map` / `reduce` / `flatMap` / `filter`, with `Map` to index by id.
Immutability with spread. Early returns.

**Never run a query inside a loop.** Fetch everything at once and index in memory.

In batch operations, separate **decision** from **execution**: walk the data once,
classifying into buckets (`toInsert`, `toUpdate`, `toDelete`), then execute each one
in batch, always under `if (array.length > 0)`.

## `conn.query()` is the standard — and array expansion

Use `conn.query()` across the project. It escapes values client-side and is safe
against SQL injection as long as you use `?`.

Each `?` consumes **one element** of the parameter array. When that element is itself
an array, mysql2 expands it into a comma-separated list — without parentheses,
which you write in the SQL:

```typescript
const query = `SELECT ... WHERE id IN (?)`;
const [ queryResult ] = await conn.query(query, [ids]);   // RIGHT
// await conn.query(query, ids);                          // WRONG
```

With other parameters, each takes its own position:

```typescript
const query = `... WHERE testId = ? AND studentId IN (?)`;
await conn.query(query, [testId, studentIds]);
```

For batch INSERTs without SQL functions, an array of arrays avoids building placeholders:

```typescript
const query = `INSERT INTO table_name (colA, colB) VALUES ?`;
await conn.query(query, [[[1, 'x'], [2, 'y']]]);   // becomes (1,'x'),(2,'y')
```

When the INSERT needs SQL functions (`NOW()`) or fixed interleaved columns, build the
placeholders manually and flatten the values with `flatMap` — this is the pattern already
used in the project.

## Parameterization — absolute rule

**Never** interpolate values into the SQL string. Not even internal numeric ids.

```typescript
// WRONG
const cases = rows.map(r => `WHEN id = ${r.id} THEN ${r.newId}`).join(' ');

// RIGHT
let caseStatement = 'CASE id ';
const queryParams: any[] = [];
rows.forEach(r => { caseStatement += 'WHEN ? THEN ? '; queryParams.push(r.id, r.newId) });
caseStatement += 'END';
queryParams.push(userId, ids);
```

Interpolate only SQL structure you generate yourself (placeholders, controlled column
names) — never data.

## MySQL reserved words — beware of column names and aliases

Column, table or alias names that collide with a MySQL reserved word break the query with
`ER_PARSE_ERROR`, even if the rest of the SQL is correct. The error usually points at a
fragment that looks perfectly valid, which confuses the diagnosis.

Real case found during the migration: `SELECT MAX(CAST(name AS UNSIGNED)) AS maxValue
FROM year` failed with `syntax error near 'maxValue FROM year'`. The query itself was
correct — the problem was only the alias `maxValue`, because `MAXVALUE` is a MySQL reserved
word (used in `PARTITION ... VALUES LESS THAN (MAXVALUE)`). Renaming the alias
(`maxYearName`) fixed it.

Practical rules:
- When choosing a new alias or column name, avoid generic one-word names
  (`value`, `key`, `order`, `group`, `range`, `rank`, `year`, `date`, `interval`,
  `condition`, `desc`, `match`) — several are reserved or have special meaning in MySQL.
  Prefer compound names (`maxYearName` instead of `maxValue`).
- If you really need a reserved word as an identifier, wrap it in backticks:
  `` `value` ``. That must be the exception, not the rule — prefer renaming.
- If an `ER_PARSE_ERROR` shows up in a query that looks syntactically obvious, suspect a
  reserved identifier first before rewriting the whole query. Test it in isolation: run
  just `SELECT 1 AS <name>;` on the local database to confirm.
- With read access to the local database, validate the query (or a minimized version of
  it) directly before considering the migration done — this catches this kind of error
  without depending on the user testing in the frontend.

## `SELECT` without `ORDER BY` has no order — and sometimes the order IS the contract

MySQL guarantees no order without `ORDER BY`. In practice it often returns a stable order
for a while (index used, cache, chosen plan), which makes the problem look nonexistent
until the day the plan changes and the screen comes out different.

When the returned array becomes **column order, tab order or item order on screen**, that
order is a contract with the frontend just as much as the object shape — the same rule as
the "Return shape" section applies.

Real case, found on 2026-08-05 and **still open**: `readingFluencyRepository.qReadingFluencyHeaders`
has no `ORDER BY`. The `exam_levels` array it returns is exactly the order of the level
columns in the reading-fluency grid. Observed live on the local database: two consecutive
GETs of the same screen returned `LF|LS|NL` in one and `NL|LS|LF` in the other. The columns
swap places between loads, with nothing changed.

This is not just cosmetic: it is the screen where the teacher records reading level by
clicking the cell. Columns that move between loads invite the wrong click, and the click
writes straight to the database. It reaches the three screens that consume these headers —
the classroom grid (`testController.getStudents`), the comparison/grouped view
(`testGraphicController.getGraphic` / `getGroupedFullParallel`) and the report
(`reportController`).

Practical rules:
- If the result feeds a visible order on screen, an explicit `ORDER BY` is **mandatory**,
  on a deterministic column (an `id`, or a dedicated ordering column).
- `GROUP BY` does not sort either — MySQL 8 dropped that guarantee.
- When migrating a TypeORM method that had `order: { ... }` in its `find()`, the
  corresponding `ORDER BY` must appear in the new query. It is a silent, easy loss,
  because nothing breaks in the day's manual test.
- A formatter that builds an array with `push` (like
  `ReadingFluencyFormatter.readingFluencyHeaders`) only **preserves** the order of the rows
  it received — it fixes nothing. The order must come from the SQL.

## Return shape — the most sensitive point of the migration

TypeORM returns **nested** objects:
```typescript
{ id, studentId, ra, dv, person: { id, name, birth } }
```

mysql2 returns **flat** rows:
```typescript
{ id, studentId, ra, dv, personId, name, birth }
```

When migrating, the final object delivered to the frontend **must have exactly the same
shape as before**. Always:
1. JOIN with explicit aliases (`p.id AS person_id`, `p.name AS person_name`).
2. Rebuild the nesting in the domain formatter in `src/utils/formatters/`
   (e.g. `StudentFormatter.xxx()`).
3. When creating a new method, put the formatting in the domain formatter right away
   instead of building the object inline in the `return`. If you find inline formatting
   during a migration, it is a good opportunity to move it to the formatter.

**Watch out for dates.** The pool uses `dateStrings: true` and `timezone: '-03:00'`, so
dates come back as **strings**, not `Date` objects. When migrating a method that returns a
date, confirm the format TypeORM delivered and explicitly flag any difference — it is a
classic source of silent breakage in the frontend. To write a `Date`/ISO string as the raw
UTC literal TypeORM used to store, use `toSqlUtcDateTime` from `src/utils/sqlDateTime.ts`.

## Local database access — READ-ONLY

There is a local copy of the database running, with credentials in `.env`
(`DB_HOST`, `DB_USER`, `DB_NAME`, `DB_PASS`). Use it to **confirm the real schema**
before writing queries — column names, types, existing indexes.

Allowed:
- `DESCRIBE <table>` / `SHOW CREATE TABLE <table>`
- `SHOW INDEX FROM <table>`
- Read-only `SELECT` and `EXPLAIN`

**Forbidden, even on the local database:** `INSERT`, `UPDATE`, `DELETE`, `ALTER`, `DROP`,
`TRUNCATE`, `CREATE` — any write or DDL. A corrupted local copy causes hours of hunting a
bug that does not exist in the code.

If you need a write operation to validate something, describe the command and ask the
developer to run it.

## Performance when writing queries

- One JOIN instead of several queries. Never produce an N+1 pattern.
- **Never `SELECT *`** — list the columns you need.
- `EXISTS` / `NOT EXISTS` instead of `IN (subquery)` when the subquery may return many rows.
- Aliases to flatten joins.
- Filter early in the `WHERE`; do not fetch rows that will be discarded in memory.
- Aggregate in the database (`COUNT`, `SUM`, `GROUP BY`) instead of counting in JS.

### Index note
When writing a read query or one with JOINs, add a short comment at the end listing the
indexes the query expects:

```sql
-- Índices esperados: student_classroom(classroomId), student_classroom(yearId), alphabetic(studentId, testId)
```

If you have access to the local database, **check with `SHOW INDEX` whether they exist**
and say what you found. Without that check, make it clear it is an assumption.

## Protocol when migrating a TypeORM method

1. Read the whole original method and identify the business rule and the exact return shape.
2. **Confirm the method/route still has a real caller in the frontend before migrating.**
   The frontend repository is at `/home/fbzpanatto/Documents/Repositorios/iescolaFront2024`.
   Find the matching URL/subResource in `src/app/services/utils.service.ts`
   (`putById`/`saveData`/`getOne`/etc. calls of `FetchDataService`) and confirm it matches
   the Express route (`src/routes/*.ts`) of the method you are about to migrate. Orphan
   methods (route without caller) are leftovers from earlier refactorings — do not migrate
   them; flag them as removal candidates and see the "Methods removed as dead code" section
   before deciding. Migrating dead code costs time and also creates a new mysql2 method
   nobody tests or uses.
3. Also read the TypeORM model(s) involved in `src/model/*.ts`. They are the most reliable
   source of column/FK names (`@JoinColumn`, `ManyToOne`/`OneToOne` relations), indexes and
   constraints (`@Index(..., { unique: true })`) and of which columns are `select: false`
   (not returned by `SELECT *`/`find()` by default — this affects what the original TypeORM
   object actually contained). Table names follow the snake_case of the class name
   (`AlphabeticFirst` → `alphabetic_first`, `StudentTestStatus` → `student_test_status`);
   FK names follow `relationName + Id` (`alphabeticFirst` → `alphabeticFirstId`).
4. If the schema is still unclear, query the local database before writing the query.
5. Write the complete mysql2 method in the right domain repository, following the
   appropriate pattern.
6. State explicitly: **what goes in** (parameters), **what comes out** (object shape) and
   **what changed** — ideally nothing besides the access mechanism.
7. Flag separately any risk, shape difference (especially dates) or perceived bug, without
   changing it.

## Tests

Tests stub data access on the repository singletons, not on controller instances:

```typescript
mock.method(yearRepository, 'qCurrentYear', async () => ({ name: 2025 }) as never)
```

Run `npx tsc --noEmit` and `npm test` before considering a change done.

## Methods removed as dead code

History of methods found without a real caller during migrations — kept here so that, if
something seems "missing" in the future, the explanation is recorded instead of turning
into a bug hunt from scratch.

- **`StudentQuestion.ts#updateReadingFluency_backUp`** (removed on 2026-07-27).
  It was the TypeORM version of `updateReadingFluency`; the `PUT /:id/reading-fluency`
  route already pointed only to the mysql2 version (`updateReadingFluency`, right below it
  in the file). It stayed as a "backup" from an earlier migration and was never removed.
- **`StudentQuestion.ts#updateAlphabeticFirstLevel`** + route
  `PUT /:id/alphabetic-first-level` + `genericController.ts#qUpsertAlphabeticFirstLevel`
  (removed on 2026-07-27). No caller in `iescolaFront2024` (searching for
  `alphabetic-first-level` in the frontend returned nothing). The "initial literacy level"
  button on the screen uses a different route — `PUT /student/:id/first-level`
  (`student.ts`, method `qSetFirstLevel`, now in `studentRepository`) — which already
  existed and is still in use.

## Style

- Answers and code comments in Portuguese.
- Strongly typed TypeScript; always `async/await`, never callbacks or `.then`.
- Deliver the complete method, not loose snippets.
