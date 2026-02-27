# Deployment Guide（Railway）

LensClip は Railway へのデプロイを想定しています。

---

## 前提

- Railway アカウント
- Google Cloud サービスアカウントキー（Cloud Vision API + GCS 有効化済み）
- Gemini API キー

---

## 1. Volume の作成

Railway ダッシュボードで Volume を作成し、Laravel サービスに以下の設定でアタッチします。

- **Mount Path**: `/app/storage/app`

これにより `storage/app/public` 配下の画像データが永続化されます。

> GCS を使用する場合（推奨）は Volume は不要です。

---

## 2. MySQL の追加

Railway ダッシュボードで MySQL サービスを追加し、Laravel サービスの環境変数に以下を設定します。

```env
DB_CONNECTION=mysql
DB_HOST=${{ MySQL.MYSQLHOST }}
DB_PORT=${{ MySQL.MYSQLPORT }}
DB_DATABASE=${{ MySQL.MYSQLDATABASE }}
DB_USERNAME=${{ MySQL.MYSQLUSER }}
DB_PASSWORD=${{ MySQL.MYSQLPASSWORD }}
```

---

## 3. Start Command

サービスの設定（Settings > Deploy > Start Command）に以下を設定します。

```bash
bash railway/start.sh
```

---

## 4. 環境変数

Variables に以下を設定します。

| 変数 | 値の例 | 説明 |
|-----|-------|------|
| `APP_ENV` | `production` | HTTPS 強制 |
| `APP_KEY` | `php artisan key:generate --show` の出力 | アプリキー |
| `FILESYSTEM_DISK` | `gcs`（推奨）または `public` | ストレージドライバー |
| `QUEUE_CONNECTION` | `redis` または `database` | キュー接続先 |
| `GEMINI_API_KEY` | Gemini API キー | AI 連携用 |
| `GEMINI_MODEL` | `gemini-2.5-flash-lite` | 使用モデル（省略時デフォルト） |

---

## 5. GCS の設定（推奨）

GCS を使う場合は以下も追加します。

| 変数 | 説明 |
|-----|------|
| `GOOGLE_APPLICATION_CREDENTIALS` | サービスアカウントキーのパス（例: `storage/gcs-key.json`） |
| `GOOGLE_CLOUD_PROJECT_ID` | GCP プロジェクト ID |
| `GOOGLE_CLOUD_STORAGE_BUCKET` | GCS バケット名 |

> サービスアカウント 1 本で Cloud Storage・Vision API・Gemini API すべての認証を統合できます。
