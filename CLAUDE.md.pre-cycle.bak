# iescolaBack2024

# Autonomous delivery cycle

Any request in plain language to implement, fix, refactor or change something in this project is a task for the cycle below. The user does not call any command; run it automatically.

1. Invoke the `architect` subagent with the user's request. If it reports ambiguity that changes what gets built, ask the user ONE short question; otherwise decide and continue. For a large request, the architect splits it into ordered steps; execute them one after another.
2. For each step: `coder` implements the plan, then `reviewer` verifies it. On REJECTED, send the findings back to `coder` and re-review. Maximum 2 correction rounds per step; then stop and report.
3. Subagents cannot call other subagents: you (the main session) chain them.
4. Stop and ask the user before proceeding when the reviewer returns RISK: HIGH, BLOCKED, or when the architect marks the step HIGH (auth, schema or migration, money, data contracts, behavior with no test covering it). Present the plan and the findings; do not continue on your own.
5. Never run git add, commit, push, amend, reset, stash or branch changes. Committing is exclusively the user's job. Do not edit project .md documentation during steps; list documentation updates as pending in the report.
6. Write the full report to `.phase-notes/<yyyy-mm-dd>-<short-slug>.txt` in en-US: request, plan, files changed with line counts, reviewer verdict and risk per step, full output of each verification command, correction rounds, pending documentation updates, "anything odd".
7. Final message in the CLI, max 10 lines: verdict, risk, report path, and one ready line per step: `git add <files> && git commit -m "<conventional commit message>"`. Then stop.

Code rules: strict TypeScript without `any`, explicit return types, guard clauses, no code comments except a short one that prevents a real trap. Documentation is always en-US.

Verification defaults for the reviewer: npx tsc --noEmit and npm test (local test MySQL). Never touch .env.
