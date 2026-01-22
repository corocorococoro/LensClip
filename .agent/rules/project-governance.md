# Project Governance

> **メタルール**: 他のすべての Rules/Docs に適用される上位ルール

## Single Source of Truth

1. **仕様本文は Docs のみ**
   - API項目、DBカラム、モデル名、画面文言などの具体値は `docs/*.md` に記載
   - Rules / Workflows に仕様を複製しない
   - 仕様参照が必要な場合は Docs のファイル名を明示

2. **Rules は「法」のみ**
   - 不変の強制（絶対禁止・絶対必須）
   - 運用の手順（変更時のフロー）
   - 監査の強制（Consistency Audit 必須）
   - 優先順位（競合時の解決ルール）

## 競合時の優先順位

1. **最新の Docs**（Last updated が新しいもの）
2. **Decision ログ** (`docs/decisions/*.md`)
3. **Workflows** (`.agent/workflows/*.md`)
4. **Rules** (`rules/*.md`)

> [!CAUTION]
> **例外**: `rules/security-invariants.md` は常に強制（例外なし）

## 完了条件 (Definition of Done)

変更作業の完了には以下が必須：

- [ ] Docs 更新（必要なら）
- [ ] 実装更新（必要なら）
- [ ] テスト実行（最低ラインを満たす）
- [ ] **Consistency Audit を実施し、矛盾/重複/漏れが解消されている**

## Consistency Audit（必須）

あらゆる作業の最後に実施し、以下の形式で出力：

```
1) 矛盾一覧（Aの記述 vs Bの記述）
2) 重複一覧（同じ仕様が複数箇所に存在）
3) 更新漏れ候補（古い記述が残っている）
4) 修正提案（どのファイルをどう直すべきか）
5) 変更ファイル一覧（最終）
```

## テスト最低ライン

PR/変更の完了には以下のテストが必須：

- 未認証で `/admin/*` にアクセス不可
- 一般ユーザーで `/admin/*` は 403
- admin のみ logs/settings へアクセス可
- allowlist 外モデルは拒否される（サーバ側）

具体テストケースの詳細は `docs/TEST_PLAN.md` を参照。

---

*Last updated: 2026-01-22*
