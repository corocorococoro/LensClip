# ドキュメント台帳

## 方針

実装済みの挙動はソースコードとテストを一次ソースとする。Docs はコードから直接読み取れない「なぜ」「変えてはいけないこと」「運用時に何をするか」だけを扱う。

以下は Docs に複製しない。

- ルートやエンドポイントの一覧
- リクエスト、レスポンス、画面 props の例
- DB の列、型、インデックス
- 環境変数、設定値、カテゴリ、閾値の一覧
- 画面に表示する項目やコンポーネントの見た目
- フレームワーク一般のコーディング規約

コードへの入口を示せば足りる内容は文書化しない。文書を更新するのは、プロダクト意図、不変条件、責務分担、判断理由、運用手順が変わったときだけとする。

将来、外部利用者向けの API 契約やスキーマ資料が必要になった場合は、Markdown へ手書きせず、契約テストや実装から生成できる形式を採用する。

## 文書一覧

| 文書 | 責務 | 更新する条件 |
|---|---|---|
| [product-principles.md](product-principles.md) | 誰のどんな課題を解くか、体験上の原則 | 対象利用者、提供価値、体験原則が変わる |
| [user-flows.md](user-flows.md) | 複数画面をまたぐ導線と状態遷移の意図 | 導線、状態の意味、失敗後の復帰方法が変わる |
| [ai-architecture.md](ai-architecture.md) | AI 処理の責務分担と設計理由 | 同期・非同期境界、外部サービス、保存責務が変わる |
| [security-invariants.md](security-invariants.md) | 常に守るセキュリティ・プライバシー制約 | 制約を追加・変更するときだけ |
| [setup.md](setup.md) | 新しい開発環境を立ち上げる手順 | 必要ツールや起動手順が変わる |
| [deploy.md](deploy.md) | Railway のデプロイ・障害切り分け手順 | インフラ構成、起動方式、確認手順が変わる |

## 実装上の一次ソース

| 知りたいこと | 一次ソース |
|---|---|
| HTTP ルート、middleware | `routes/` |
| 入力と認可 | `app/Http/Requests/`、`app/Policies/`、middleware |
| 画面構成と Inertia props | Controller、`resources/js/Pages/`、TypeScript 型 |
| DB 構造と制約 | `database/migrations/`、`app/Models/` |
| カテゴリや Laravel 設定 | `config/` |
| AI プロンプトと解析ロジック | `app/Services/ImageAnalysisService.php` |
| 非同期処理と状態更新 | `app/Jobs/AnalyzeObservationJob.php` |
| 正常系・異常系の保証 | `tests/` |
| 開発・ビルド用コマンド | `composer.json`、`package.json`、`compose.yaml` |
| 本番イメージと起動処理 | `Dockerfile`、`.dockerignore`、`railway/start.sh` |
