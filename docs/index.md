# LensClip ドキュメント台帳

> 実装済みの挙動はソースコードを正とする。Docs は、実装を読む前に必要な背景、責務分担、運用上の合意事項を整理する場所。

## ドキュメント一覧

| ドメイン | ファイル | 概要 |
|---------|---------|------|
| プロダクト定義 | [prd.md](prd.md) | ターゲット、ユースケース、機能、UX原則 |
| 画面・導線 | [ux-flow.md](ux-flow.md) | 画面遷移図、UI状態 |
| API 契約 | [api-spec.md](api-spec.md) | エンドポイントと主要な入出力境界 |
| データベース | [db-schema.md](db-schema.md) | ER図、主要テーブル、保存対象 |
| AI パイプライン | [ai-pipeline.md](ai-pipeline.md) | Vision/Gemini/TTS 処理フロー |
| AI モデル許可リスト | [ai-models.md](ai-models.md) | Gemini モデル allowlist の運用方針 |
| セキュリティ制約 | [security-invariants.md](security-invariants.md) | 認証・秘匿情報・AI モデル制御・アップロード検証 |
| 実装規約 | [engineering-standards.md](engineering-standards.md) | アーキテクチャ原則、テスト、PRゲート |
| Laravel 規約 | [laravel-conventions.md](laravel-conventions.md) | Laravel コード規約 |
| セットアップ | [setup.md](setup.md) | 開発環境構築手順 |
| デプロイ | [deploy.md](deploy.md) | Railway デプロイ手順 |

---

*Last updated: 2026-07-08*
