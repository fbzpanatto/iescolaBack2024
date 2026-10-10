# iescolaBack2024
 

## Classroom percentage in Assessments and Simulados

Rule: in `AVL_ITA` (7) and `SIM_ITA` (6; `SIM_4_9` in the front end), a cell with no answer from an eligible student counts as an error, i.e. it stays in the denominator. This applies to the answer-sheet screen (`GET students`, `TestController.getStudents`) and to the comparison (`classroom/:id/graphic`, `Helper.classroomDataStructure`), which must always match. Diagnostic, literacy, reading and fluency tests do not follow this rule and were not changed.

- Category list: `SCORED_TEST_CATEGORIES_IDS` (`src/utils/enums.ts`); formula: `Helper.scoreRate`; empty cell: `Helper.isUnassignedEmptyCell`.
- Eligibility (unchanged): students with no answers at all, OE/TR and answers from another classroom are left out.
- Tests: `npm test` (golden master in `tests/__snapshots__/baseline.json`, captured before the change, plus parity between the screens).

## GET /test/:id/preview

Read-only preview of a test, for staff.

- Access: staff only. Users in the `ALUN` (student) category are rejected with 403.
- Scope: `SIM_ITA` tests only (category 6).
- Read-only: it does not issue a token, does not apply any time window and does not record any answers.
- Visibility: mirrors the test list (the same tests the user sees there) plus tests owned by the requesting user.
- Payload: the questions payload without the `answer` field. The student payload (`GET /test/:id`) returns `answer: "hidden"` instead, so the two payloads differ by that key.

Status codes:

| Code | When |
| --- | --- |
| 200 | Preview returned. |
| 400 | Invalid (non-numeric) id, test is not `SIM_ITA`, or the test has no questions. |
| 403 | Requesting user is `ALUN`, or the test is not visible to the user. |
| 404 | Test not found. |
