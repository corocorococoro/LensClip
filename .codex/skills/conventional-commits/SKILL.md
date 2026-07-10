---
name: conventional-commits
description: Draft, normalize, review, or execute Git commits for this repository using Conventional Commits. Use for commit-message requests and commit-intent requests such as 「コミットして」「コミットお願い」.
---

# Conventional Commits

1. Read [AGENTS.md](../../../AGENTS.md), then inspect `git status --short`, `git diff --stat`, and the relevant staged or unstaged diff.
2. Preserve unrelated user changes. If the diff contains independent intents, recommend separate commits.
3. Choose the type from the actual primary intent:
   - `feat`: user-visible capability
   - `fix`: incorrect behavior or regression
   - `docs`: documentation-only change
   - `refactor`: structural change without intended behavior change
   - `perf`: performance improvement
   - `test`: test-only change
   - `build`: dependency or packaging change
   - `ci`: CI/CD change
   - `chore`: other maintenance
   - `revert`: revert an earlier change
4. Add a scope only when the affected area is unambiguous from the diff. Do not maintain a repository-specific scope allowlist in this skill.
5. Format the title as `<type>[optional scope]: <Japanese description>`.
   - Keep the title concise and specific.
   - Do not end it with punctuation.
   - Use `!` and a `BREAKING CHANGE:` footer for breaking changes.
6. Add a body only when it explains motivation, behavioral impact, migration, or an important verification result.
7. When asked only for wording, return one recommended title and an optional body. When explicitly asked to commit, verify the intended file scope before staging and committing.

Treat the current diff and repository rules as the source of truth. Do not copy product specifications, directory inventories, or fixed scope lists into this skill.
