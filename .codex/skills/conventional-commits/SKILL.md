---
name: conventional-commits
description: Draft, normalize, and review git commit messages in Conventional Commits format for this repository. Use when Codex needs to suggest a commit title from the current diff, rewrite a free-form message into Conventional Commits, choose a commit type or scope for amazon-ads-system changes, explain the Conventional Commits rules, check whether a proposed message follows the spec, or respond to commit-intent requests such as "コミットして" and "コミットお願い".
---

# Conventional Commits

Inspect the actual change before proposing a message. Keep the Conventional Commits structure strict and always write the commit description and body in Japanese for this repository. Leave spec tokens such as `feat`, `fix`, scopes, `BREAKING CHANGE`, and other required Conventional Commits syntax in their canonical form.

## Workflow

1. Inspect the change surface with `git status --short`, `git diff --stat`, and, when needed, `git diff --cached --name-only` or `git diff --name-only HEAD`.
2. Identify one primary intent. If the diff contains unrelated work, recommend splitting the change into multiple commits before writing the message.
3. Choose the narrowest useful type:
   - `feat`: add a new capability, UI, report section, export, metric, CLI option, or data flow
   - `fix`: correct a bug, KPI mismatch, broken rendering, wrong default, regression, or query issue
   - `docs`: change documentation only
   - `refactor`: reorganize code without intended behavior change
   - `perf`: improve performance without changing behavior
   - `test`: add or update tests only
   - `build`: change build image, dependency packaging, or deployment packaging behavior
   - `ci`: change CI/CD workflow or automation behavior
   - `chore`: maintenance work that does not fit the above
   - `revert`: revert an earlier change
4. Add a scope when it clarifies the affected area. Prefer repository terms such as `pipeline`, `weekly`, `longspan`, `report`, `sql`, `docs`, `oauth`, `backfill`, `templates`, `config`, or `tests`.
   - Prefer `weekly` or `longspan` when the change affects only one report family.
   - Prefer `report` when the same presentation or KPI rule spans multiple report outputs.
   - Prefer `pipeline` when reorganizing shared code or CLI entry points.
   - Prefer `sql` when the core change is a table, view, or migration definition.
   - Prefer `docs` only when no production code, templates, or SQL behavior changes.
5. Write the title as `<type>[optional scope]: <description>`.
   - Keep `type` lowercase.
   - Write the description in Japanese.
   - Keep the description short, specific, and without a trailing period.
   - Avoid vague subjects such as `update`, `misc`, `fix bug`, or `[update]`.
   - Prefer a single commit purpose over listing every touched file.
6. Add a body only when it improves understanding:
   - explain why the change exists
   - call out notable side effects or follow-up work
   - mention paired doc updates when the main type is not `docs`
   - note schema or migration implications
7. Use footers for refs and breaking changes.
   - Mark breaking changes with `!` before `:` and/or a `BREAKING CHANGE:` footer.
   - Keep `BREAKING CHANGE` uppercase.

## Repository Heuristics

- When the user says `コミットして`, `コミットお願い`, or similar commit-intent phrases, treat that as a request to use this skill and derive the message from the current staged or unstaged diff.
- When code and docs change together for the same task, choose the primary behavioral type such as `feat` or `fix`, then mention doc sync in the body instead of switching the title to `docs`.
- When changing BigQuery bootstrap SQL or views, reflect the real intent in the type (`feat`, `fix`, or `refactor`) and mention the required migration/bootstrap update in the body if it helps reviewers.
- When updating both script output and rendered HTML as one feature, treat that as one commit intent rather than separate technical details.
- When the user provides a rough free-form message, normalize it instead of inventing a different scope unless the original clearly misses the main intent.
- When the diff mixes multiple unrelated concerns, provide either multiple candidate commit messages or recommend splitting the commit.

## Response Shape

When the user asks for a commit message, prefer this structure:

1. `Recommended:` one best Conventional Commit title
2. `Why:` one short sentence explaining the chosen type and scope
3. `Optional body:` only when the change needs extra context
4. `Alternatives:` only when scope or intent is genuinely ambiguous

Always keep the `Recommended` title in Conventional Commits format and in Japanese.

## Examples

- `feat(longspan): ASINサマリにCSVダウンロードを追加`
- `fix(weekly): end-date の既定値を前日に修正`
- `refactor(pipeline): レポートCLIの入口を整理`
- `docs(report): weekly review の表示ルールを更新`
- `feat(sql)!: canonical view の列構成を再編成`

## Reference

- Official specification: [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)
