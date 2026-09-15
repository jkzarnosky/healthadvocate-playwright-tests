# Project Instructions for Claude Code

## Maintaining PROJECT-LOG.md
Append a new entry to the top of PROJECT-LOG.md (just below the header/legend, above the most recent
existing entry) in either of these cases:

- After completing a real chunk of work — a new test suite, a CI change, a discovery pass.
- After a substantive decision-making session that ships no code but produces real decisions worth
  keeping on record (a scoping call, a tooling choice). If a session would earn an entry in
  DECISIONS.md, it earns a PROJECT-LOG entry too, even with nothing shipped.

Follow the existing format exactly:

- Use today's date, newest entry at the top.
- `[MILESTONE]` line: one or two plain-language sentences on what now works. Write for a reader who
  isn't in this codebase day to day.
- `[DECISION]` bullets: only real decisions — a choice made between two or more real alternatives.
  Skip this section if nothing decision-worthy came up. Name the alternative(s) not chosen and why.
- `Next up`: what's actually next.

Do not add an entry for routine work (formatting, dependency bumps, typo fixes).

## No GitHub Issues/Projects
This is a solo portfolio project — there's no backlog to sync against issues. Track what's done in
PROJECT-LOG.md and what's planned in README.md's "Scope right now" list. Don't create GitHub Issues
or a Project board unless explicitly asked.

## This project targets a live, real company's production site
There is no staging/sandbox environment — every test run hits the real healthadvocate.com. Before
adding a test that submits any form, attempts login, or sends a non-`GET` request anywhere, stop and
confirm with JZ first — see DECISIONS.md ("Scope: passive discovery only...") and
docs/discovery/testability-notes.md ("No staging environment") for why this line exists and where it
currently sits.

## Verifying new tests against the real site before committing
Because there's no staging environment to rehearse against, "the test looks right" isn't enough —
run `npm test` against the live site and read the actual failures before considering a new spec
done. Several real markup quirks in this site (documented in
docs/discovery/testability-notes.md) only surfaced by running tests and reading why they failed, not
by reading the DOM statically.

## Git workflow: no direct pushes to main
`main` is branch-protected (PR + a passing "Run Playwright suite" check required, no direct pushes,
no force-pushes, enforced even for the repo owner/admin). For any change, code or docs:

1. Create a branch (e.g. `homepage-suite`, `docs/...`, `fix/...`).
2. Commit and push the branch, open a PR (`gh pr create`, not `--draft` unless asked).
3. Wait for CI to pass, then tell JZ the PR is ready for review — do not merge it yourself unless
   explicitly told to.
4. JZ reviews and merges (branches auto-delete on merge - repo setting).

This applies to every change, including PROJECT-LOG.md/DECISIONS.md updates and Claude Code's own
doc edits — there is no "small enough to skip the PR" exception. (Earlier commits in this repo's
history were pushed straight to `main`, before this was set up on 2026-09-15 — that's not a
precedent to repeat.)
