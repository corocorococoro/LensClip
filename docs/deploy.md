# Railway デプロイ

## 1. Volume の作成と接続
Railway のダッシュボードで Volume を作成し、Laravel サービスに以下の設定でアタッチ:
- **Mount Path**: `/app/storage/app`
  - `storage/app/public` 配下の画像データが永続化される

## 2. MySQLの作成
Railway のダッシュボードで MySQL を作成。Laravel側の環境変数:
```
DB_CONNECTION=mysql
DB_HOST=${{ MySQL.MYSQLHOST }}
DB_PORT=${{ MySQL.MYSQLPORT }}
DB_DATABASE=${{ MySQL.MYSQLDATABASE }}
DB_USERNAME=${{ MySQL.MYSQLUSER }}
DB_PASSWORD=${{ MySQL.MYSQLPASSWORD }}
```

## 3. Start Command
サービスの設定（Settings > Deploy > Start Command）:
```bash
bash railway/start.sh
```

## 4. 環境変数
Variables に以下を追加:
- `FILESYSTEM_DISK`: `gcs` (推奨) または `public`
- `QUEUE_CONNECTION`: `redis` (Redisサービスを別途追加し、`REDIS_URL` がある場合) または `database`
- `GEMINI_API_KEY`, `GEMINI_MODEL`: AI連携用
- `APP_KEY`: `php artisan key:generate --show` で生成したもの
- `APP_ENV`: `production` 強制httpsに。

**GCSを使用する場合（推奨）:**
- `FILESYSTEM_DISK`: `gcs`
- `GOOGLE_APPLICATION_CREDENTIALS`: サービスアカウントキーへのパス（例: `storage/gcs-key.json`）
- `GOOGLE_CLOUD_PROJECT_ID`: GCPプロジェクトID
- `GOOGLE_CLOUD_STORAGE_BUCKET`: GCSバケット名

> Cloud Storage だけでなく、Vision API や Text-to-Speech API など、すべての Google Cloud SDK が共通の認証で動作します。
