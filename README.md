# LensClip 📷

親子向け「これなぁに？」スクラップWebアプリ

写真を撮るとAIが「これはなぁに？」の答えを返し、親子で一緒に学べる図鑑体験を提供します。

### デモURL
https://lensclip.up.railway.app/


## 技術スタック

- **Backend**: Laravel 12 + MySQL
- **Frontend**: Inertia.js + React + TypeScript + Tailwind CSS
- **AI**: Google Cloud Vision API（Object Localization）+ Gemini API
- **Environment**: Docker (Laravel Sail)

## セットアップ

### 1. リポジトリをクローン

```bash
git clone <repository-url>
cd LensClip
```

### 2. 環境変数を設定

```bash
cp .env.example .env
```

`.env` ファイルを編集して、以下のAPIキーを設定してください：

```env
# Google Gemini API Key
GEMINI_API_KEY=your-gemini-api-key

# Storage (local, public, gcs, s3)
FILESYSTEM_DISK=local

# Google Cloud Storage (Required if FILESYSTEM_DISK=gcs)
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_STORAGE_BUCKET=your-bucket-name
GOOGLE_CLOUD_KEY_FILE=path/to/service-account.json
```

### 3. Docker環境を起動

```bash
./vendor/bin/sail up -d
```

### 4. 依存関係をインストール

```bash
./vendor/bin/sail composer install
./vendor/bin/sail npm install
```

### 5. アプリケーションキー生成

```bash
./vendor/bin/sail artisan key:generate
```

### 6. データベースマイグレーション

```bash
./vendor/bin/sail artisan migrate
```

### 7. ストレージリンク作成

```bash
./vendor/bin/sail artisan storage:link
```

### 8. フロントエンドビルド

開発モード:
```bash
./vendor/bin/sail npm run dev
```

本番ビルド:
```bash
./vendor/bin/sail npm run build
```

## 動作確認

1. http://localhost にアクセス
2. ユーザー登録 → ログイン
3. 「しらべる」ボタンをタップ → 画像をアップロード
4. AI分析待ち → 結果表示
5. ライブラリで一覧確認

## 主要機能

- 📷 **撮影・アップロード**: カメラまたはファイル選択
- 🔍 **AI分析**: Vision APIで主対象をCrop → Gemini APIで同定・説明
- 📚 **ライブラリ**: グリッド表示、検索、タグフィルタ
- 🏷️ **タグ**: AI自動付与＋手動追加

## テスト実行

```bash
./vendor/bin/sail artisan test
```

## 管理者設定

### 管理者に昇格する

特定のユーザーを管理者に昇格するには、以下のコマンドを実行します：

```bash
./vendor/bin/sail artisan user:promote your-email@example.com
```

### 管理画面へのアクセス

管理者としてログインすると以下のURLにアクセスできます：

- `/admin/logs` - アプリケーションログの閲覧
- `/admin/settings/ai` - Geminiモデルの切り替え

### 管理者機能

| 機能 | URL | 説明 |
|------|-----|------|
| ログ閲覧 | `/admin/logs` | レベル・日付でフィルタ、スタックトレース表示 |
| AI設定 | `/admin/settings/ai` | Geminiモデルの切り替え（即時反映） |

## 困ったときは（トラブルシューティング）

アプリにアクセスできない、または画像が表示されないなどの問題が発生した場合は、以下の手順を試してください：

### 1. Sailの再起動
コンテナの状態が不安定な場合、一度停止して起動し直すのが最も効果的です。
```bash
./vendor/bin/sail stop
./vendor/bin/sail up -d
```

### 2. アセット（CSS/JS）の読み込みエラー
ブラウザ画面が真っ白な場合、Viteサーバーが起動していない可能性があります。
```bash
./vendor/bin/sail npm run dev
```

### 3. 画像が表示されない
ストレージのシンボリックリンクが切れている可能性があります。
```bash
./vendor/bin/sail artisan storage:link
```

### 4. AI分析が進まない（処理中のまま）
非同期ジョブを実行するワーカーが起動しているか確認してください。
```bash
./vendor/bin/sail artisan queue:work
```

### 5. ログの確認
原因が不明な場合は、以下のコマンドでログを確認してください。
```bash
# Dockerコンテナのログ
./vendor/bin/sail logs app

# Laravelのアプリケーションログ
./vendor/bin/sail exec app tail -f storage/logs/laravel.log
```

## 既知の制約

- iOSでのカメラ起動は環境依存（HTTPS必須等）
- API キーなしでは AI 分析はモックデータになります
- 画像サイズ上限: 10MB

## ディレクトリ構成

```
app/
├── Http/Controllers/     # ObservationController, TagController等
├── Jobs/                 # AnalyzeObservationJob（非同期AI処理）
├── Models/               # Observation, Tag
├── Policies/             # ObservationPolicy
└── Services/             # ImageAnalysisService（Vision + Gemini）

resources/js/
├── Layouts/              # AppLayout（下部ナビ付き）
├── Components/           # ObservationCard, ui/（Button, Card等）
└── Pages/
    ├── Home.tsx          # ホーム（しらべるCTA）
    ├── Library.tsx       # ライブラリ
    └── Observations/     # Processing, Show

docs/
├── index.md             # ドキュメント台帳
├── prd.md               # 製品要件定義
├── ux-flow.md           # 画面遷移
├── api-spec.md          # API仕様
├── db-schema.md         # DBスキーマ
├── ai-pipeline.md       # AIパイプライン
├── ai-models.md         # AIモデル許可リスト
├── test-plan.md         # テスト計画
└── decisions/           # 決定ログ (ADR)

.agent/rules/
├── project-governance.md      # ガバナンス・SSOT
├── product-ui-principles.md   # プロダクト・UI方針
├── security-invariants.md     # セキュリティ絶対ルール
├── engineering-standards.md   # 実装規約
├── ai-responsibility-split.md # AI責務分離
└── laravel-conventions.md     # Laravel規約
```

## Railway へのデプロイ

### 1. Volume の作成と接続
Railway のダッシュボードで Volume を作成し、Laravel サービスに以下の設定でアタッチしてください。
- **Mount Path**: `/app/storage/app`
  - これにより `storage/app/public` 配下の画像データが永続化されます。

### 2. MySQLの作成
Railway のダッシュボードで MySQL を作成。Laravel側の環境変数は
```
DB_CONNECTION=mysql
DB_HOST=${{ MySQL.MYSQLHOST }}
DB_PORT=${{ MySQL.MYSQLPORT }}
DB_DATABASE=${{ MySQL.MYSQLDATABASE }}
DB_USERNAME=${{ MySQL.MYSQLUSER }}
DB_PASSWORD=${{ MySQL.MYSQLPASSWORD }}
```

### 3. Start Command
サービスの設定（Settings > Deploy > Start Command）に以下を設定してください。
```bash
bash railway/start.sh
```

### 4. 環境変数の設定
Variables に以下を追加してください。
- `FILESYSTEM_DISK`: `gcs` (推奨) または `public`
- `QUEUE_CONNECTION`: `redis` (Redisサービスを別途追加し、`REDIS_URL` がある場合) または `database`
- `GEMINI_API_KEY`, `GEMINI_MODEL`: AI連携用
- `APP_KEY`: `php artisan key:generate --show` で生成したもの
- `APP_ENV`: `production` 強制httpsに。

**GCSを使用する場合（推奨）:**
- `GOOGLE_CLOUD_PROJECT_ID`: GCPプロジェクトID
- `GOOGLE_CLOUD_STORAGE_BUCKET`: GCSバケット名
- `GOOGLE_CLOUD_KEY_FILE`: サービスアカウントキーへのパス（例: `storage/gcs-key.json`）
  - ※ キーファイルをリポジトリに含めるか、ビルド時に生成する必要があります。
---

## ライセンス

MIT
