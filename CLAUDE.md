# iescolaBack2024

<!-- delivery-cycle:start -->
# Autonomous delivery cycle

Requests usually arrive as a handoff prompt with a plan already approved in a planning chat. Treat that plan, its scope and its "do not touch" list as the source of truth and do not re-ask what it already answers. The user calls no command: run the cycle automatically.

## Triage (main session, before delegating)
Classify the task, then use only the agents and models in the table. Pass `model` explicitly on every subagent call.

| Class | When | Agents and models |
|---|---|---|
| TRIVIAL | 1-2 files, mechanical or obvious (rename, small fix, doc translation) | `coder` (haiku if purely mechanical, else sonnet) then `reviewer` (sonnet). No architect |
| STANDARD | The handoff has an approved plan naming the exact files and functions | `coder` (sonnet) then `reviewer` (sonnet). No architect |
| COMPLEX | No plan, plan conflicts with code, files or functions not named, or shared/core code | `architect` (sonnet; opus only if subtle cross-module invariants) then `coder` (sonnet) then `reviewer` (sonnet) |
| HIGH | Matches a HIGH criterion below | `architect` (opus), `coder` (sonnet), `reviewer` (opus). Stop after the review and hand over to the user |

- Never use opus for `coder`. Never add agents beyond the table. When unsure between two classes, take the lighter one unless a HIGH criterion matches.
- Subagents cannot call other subagents: you chain them. Run them one at a time, never in parallel on the same files.

## HIGH criteria (defaults; the Project notes section may add more)
- Authentication, authorization, session or token handling, secrets.
- Database schema, migrations, persisted data shape, or any destructive data operation.
- Money, billing, scoring or economy rules, and anything where the source of truth must not trust client-reported values.
- Public API or contract changes consumed by another project or by clients in production.
- Concurrency, security-sensitive or shared core code.
- Behavior no automated test pins down (UI layout, game feel, physics, external integrations): the reviewer returns NEEDS_MANUAL_CHECK and you stop.

## Cycle
1. Delegate per the table. If the architect reports an ambiguity that changes what gets built, ask the user ONE short question; otherwise decide and continue.
2. On REJECTED, send the findings back to `coder`, then re-run `reviewer`. Maximum 2 correction rounds per step; then stop and report.
3. Multi-step plans: run the steps in order. Stop and hand over at the first HIGH step, at BLOCKED or NEEDS_MANUAL_CHECK, or after 2 failed correction rounds.
4. Never run git add, commit, push, amend, reset, stash or branch changes. Committing is exclusively the user's job. Do not edit project .md documentation during steps; list the documentation updates as pending in the report.
5. Write the full report to `.phase-notes/<yyyy-mm-dd>-<short-slug>.txt` in en-US: request, class chosen and why, models used, plan, files changed with line counts, reviewer verdict and risk per step, results and key numbers of each verification command (point to the log files, not raw log tails), correction rounds, pending documentation updates, "anything odd".
6. Final message in the CLI, max 10 lines: verdict, risk, report path, and one ready line per step: `git add <files> && git commit -m "<conventional commit message>"`. Then stop.

## Verification (one final check, run once; a handoff prompt may override any of these)
- `coder`: implement and check only that it compiles (type-check/build). No test suites, audits or perf runs.
- Final verification runs ONCE, by `reviewer` only, after the code is done: build + existing tests + the single heavy proof the handoff names. After a correction round, re-run only what the correction can affect.
- Nobody repeats a check another agent already ran; the orchestrator never re-runs the reviewer's verification.
- New tests only when the handoff asks, and minimal (one case proving the new behaviour). No mutant batteries unless the handoff asks.
- Tests run only if the repo has test files (check at run time; otherwise skip and say so in the report).
- Browser audits and perf: the minimum that proves the gate (1 run per scenario); an extra run only if a result is within 20% of its gate; perf only when the step touches a hot path or rendering.

## Token budget (a handoff prompt may override any of these)
- Every command's output goes to a log file under `.phase-notes/out/<step>-*.log`; only summary lines enter the conversation (grep PASS|FAIL|GATE|SUMMARY or tail -n 20). Never print full logs or large JSON.
- Reports: results and numbers, no raw log tails (point to the log files); target <= ~150 lines.
- Subagents return at most 15 lines to the orchestrator.

Code rules: strict typing wherever the language supports it, guard clauses, no code comments except a short one that prevents a real trap. Never remove existing comments unless the plan asks: comment cleanup is a separate commit, done only when the user asks; list stale comments in the report instead. Documentation (.md and .txt, reports included) is always en-US; when a step creates or edits documentation, translate any pt-BR found in the files it touches to en-US without losing context, meaning or semantics (domain terms, proper names, UI texts and code identifiers stay as they are).

## Detected checks (regenerated by the installer; confirm against the project's real gates)
- type-check: `npx tsc --noEmit`
- build: `npm run build`
- tests: `npm test`
<!-- delivery-cycle:end -->

## Project notes
Project-specific rules go here: extra HIGH criteria, traps, forbidden paths, manual checks. The installer never edits outside the delivery-cycle markers.
