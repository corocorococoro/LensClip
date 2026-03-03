# LensClip ドキュメント台帳

> **Docs が仕様・規約の一次ソースです。**

## ドキュメント一覧

| ドメイン | ファイル | 概要 |
|---------|---------|------|
| プロダクト定義 | [prd.md](prd.md) | ターゲット、ユースケース、機能、UX原則 |
| 画面・導線 | [ux-flow.md](ux-flow.md) | 画面遷移図、UI状態 |
| API 契約 | [api-spec.md](api-spec.md) | エンドポイント、リクエスト/レスポンス |
| データベース | [db-schema.md](db-schema.md) | ER図、テーブル定義 |
| AI パイプライン | [ai-pipeline.md](ai-pipeline.md) | Vision/Gemini/TTS 処理フロー |
| AI モデル許可リスト | [ai-models.md](ai-models.md) | Gemini モデル allowlist（**唯一の一次ソース**） |
| 実装規約 | [engineering-standards.md](engineering-standards.md) | アーキテクチャ原則、テスト、PRゲート |
| Laravel 規約 | [laravel-conventions.md](laravel-conventions.md) | Laravel コード規約 |
| セットアップ | [setup.md](setup.md) | 開発環境構築手順 |
| デプロイ | [deploy.md](deploy.md) | Railway デプロイ手順 |

## セキュリティ（常時強制）

| ファイル | 概要 |
|---------|------|
| [security-invariants.md](../.agent/rules/security-invariants.md) | 認証・秘匿情報・AI モデル制御・アップロード検証 |

---

*Last updated: 2026-03-03*
