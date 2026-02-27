# Setup Guide

## Prerequisites

以下が必要です：

- **Docker Desktop**（Sail 実行環境）
- **Google Cloud アカウント**
  - Cloud Vision API を有効化したサービスアカウントキー
  - Gemini API キー
  - （任意）Google Cloud Storage バケット
- **（任意）Google OAuth 認証情報**（Google ログイン機能を使う場合）

---

## セットアップ手順

### 1. リポジトリをクローン

```bash
git clone <repository-url>
cd LensClip
```

### 2. 環境変数を設定

```bash
cp .env.example .env
```

`.env` を以下のように編集してください：

```env
# Google OAuth（Google ログインを使う場合）
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI="http://localhost/auth/google/callback"

# Google Cloud（Vision API + GCS）
GOOGLE_APPLICATION_CREDENTIALS=your-service-account-file.json
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_STORAGE_BUCKET=your-bucket-name

# Gemini API
GEMINI_API_KEY=your-gemini-api-key

# ストレージドライバー（public=ローカル / gcs=Google Cloud Storage）
FILESYSTEM_DISK=public
```

### 3. Docker 環境を起動

```bash
./vendor/bin/sail up -d
```

### 4. 依存関係をインストール

```bash
./vendor/bin/sail composer install
./vendor/bin/sail npm install
```

### 5. アプリケーションキーを生成

```bash
./vendor/bin/sail artisan key:generate
```

### 6. データベースマイグレーション

```bash
./vendor/bin/sail artisan migrate
```

### 7. ストレージリンクを作成

```bash
./vendor/bin/sail artisan storage:link
```

### 8. フロントエンドを起動

開発モード（ホットリロードあり）：

```bash
./vendor/bin/sail npm run dev
```

http://localhost にアクセスして動作確認してください。

---

## 環境変数一覧

| キー | 説明 | 必須 |
|-----|------|------|
| `GOOGLE_APPLICATION_CREDENTIALS` | サービスアカウントキーのファイルパス | AI 機能使用時 |
| `GOOGLE_CLOUD_PROJECT_ID` | GCP プロジェクト ID | AI 機能使用時 |
| `GOOGLE_CLOUD_STORAGE_BUCKET` | GCS バケット名 | GCS 使用時 |
| `GEMINI_API_KEY` | Gemini API キー | AI 機能使用時 |
| `GOOGLE_CLIENT_ID` | OAuth クライアント ID | Google ログイン使用時 |
| `GOOGLE_CLIENT_SECRET` | OAuth クライアントシークレット | Google ログイン使用時 |
| `FILESYSTEM_DISK` | ストレージドライバー（`public` / `gcs`） | |
| `QUEUE_CONNECTION` | キュー接続先（`redis` / `database`） | |

> API キーが未設定の場合、AI 分析は失敗（`status: failed`）になります。

---

## テスト実行

```bash
./vendor/bin/sail artisan test
```

---

## 管理者設定

特定のユーザーを管理者に昇格するには：

```bash
./vendor/bin/sail artisan user:promote your-email@example.com
```

管理者は以下にアクセスできます：

- `/admin/logs` ── アプリケーションログの閲覧
- `/admin/settings/ai` ── Gemini モデルの切り替え

---

## トラブルシューティング

### アプリにアクセスできない

```bash
./vendor/bin/sail stop && ./vendor/bin/sail up -d
```

### CSS/JS が読み込まれない（画面が真っ白）

Vite サーバーが起動していない可能性があります。

```bash
./vendor/bin/sail npm run dev
```

### 画像が表示されない

ストレージのシンボリックリンクが切れている可能性があります。

```bash
./vendor/bin/sail artisan storage:link
```

### AI 分析が進まない（processing のまま）

キューワーカーが起動しているか確認してください。

```bash
./vendor/bin/sail artisan queue:work
```

### ログを確認したい

```bash
./vendor/bin/sail exec app tail -f storage/logs/laravel.log
```
