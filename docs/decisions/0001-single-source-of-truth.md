# ADR 0001: Single Source of Truth 戦略

**日付**: 2026-01-22  
**ステータス**: Accepted

## コンテキスト

仕様（APIフィールド、モデル名、画面文言など）が `docs/`、`rules/`、`workflows/` に重複して記載されていた。  
これにより、一方を更新しても他方が古いまま残り、矛盾が発生していた。  
人の注意力に依存せず、常に一貫性が担保される仕組みが必要。

## 決定

### 1. Docs = 仕様の事実 (What / How it behaves)

具体仕様（UI文言、画面構成、APIフィールド、DBカラム、AI手順、受け入れ条件）は **Docs が一次ソース**。

### 2. Rules = 壊さないための法 (How to change without breaking)

Rules は以下のみを保持：
- 不変の強制（絶対禁止・絶対必須）
- 運用の手順（変更時のフロー）
- 監査の強制（Consistency Audit 必須）
- 優先順位（競合時の解決ルール）

**Rules に仕様本文（モデル名一覧、API項目、画面文言）を複製しない。**

### 3. 変更時は必ず Consistency Audit を実施

あらゆる作業の最後に「矛盾・重複・更新漏れ」を検出し、修正してから完了とする。

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

## Consistency Audit 出力フォーマット

```
1) 矛盾一覧（Aの記述 vs Bの記述）
2) 重複一覧（同じ仕様が複数箇所に存在）
3) 更新漏れ候補（古い記述が残っている）
4) 修正提案（どのファイルをどう直すべきか）
5) 変更ファイル一覧（最終）
```

## 影響範囲

| 項目 | 変更前 | 変更後 |
|------|--------|--------|
| モデル名変更 | rules + docs + config 3箇所 | `docs/ai-models.md` のみ |
| API 追加 | rules + docs 2箇所 | `docs/API_SPEC.md` のみ |
| 矛盾発見 | 困難 | 一次ソースが明確なので容易 |

---

*Last updated: 2026-01-22*
