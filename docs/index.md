# LensClip ドキュメント台帳

> **Docs が仕様の一次ソースです。**
> Rules は「運用・強制・監査・優先順位」のみを保持し、仕様本文は持ちません。

## 一次ソース一覧

| ドメイン | 一次ソース | 概要 |
|---------|-----------|------|
| プロダクト定義 | [prd.md](prd.md) | ターゲット、ゴール、機能一覧 |
| データベース | [db-schema.md](db-schema.md) | テーブル、カラム、制約 |
| AI パイプライン | [ai-pipeline.md](ai-pipeline.md) | Vision/Gemini 処理フロー |
| AI モデル許可リスト | [ai-models.md](ai-models.md) | 使用可能な Gemini モデル（**唯一の一次ソース**） |

## セットアップ・デプロイ

| ドキュメント | 概要 |
|------------|------|
| [setup.md](setup.md) | ローカル環境構築手順 |
| [deployment.md](deployment.md) | Railway デプロイ手順 |

## Rules（ガバナンス・パック）

Rules は「不変の強制」「運用の手順」「監査の強制」「優先順位」のみを保持します。
仕様本文が必要な場合は、上記 Docs を参照してください。

| カテゴリ | ファイル |
|---------|---------|
| ガバナンス | [project-governance.md](../.agent/rules/project-governance.md) |
| プロダクト・UI | [product-ui-principles.md](../.agent/rules/product-ui-principles.md) |
| セキュリティ | [security-invariants.md](../.agent/rules/security-invariants.md) |
| 実装規約 | [engineering-standards.md](../.agent/rules/engineering-standards.md) |
| AI 責務分離 | [ai-responsibility-split.md](../.agent/rules/ai-responsibility-split.md) |

---

*Last updated: 2026-02-27*
