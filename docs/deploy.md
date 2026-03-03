# Railway デプロイ

このドキュメントは、LensClip を Railway に本番デプロイするときの手順と運用上の注意点をまとめたものです。

## 0. 前提（実装準拠）

このリポジトリは Dockerfile でビルドされ、起動時に `railway/start.sh` を実行します。  
`start.sh` は次を実行します。

1. `php artisan migrate --force || true`
2. `php artisan storage:link || true`
3. `php artisan queue:work --tries=3 --timeout=90 &`
4. `php artisan serve --host=0.0.0.0 --port=$PORT`

`migrate` / `storage:link` は失敗しても起動継続するため、デプロイ直後にログ確認が必要です。

## 1. Railway 側で用意するサービス

1. Web サービス（このリポジトリ）
2. MySQL（必須）
3. Redis（任意。`QUEUE_CONNECTION=redis` のときのみ）

## 2. 必須環境変数

### アプリ共通

| 変数 | 例 / 値 |
|------|---------|
| `APP_KEY` | `php artisan key:generate --show` の出力 |
| `APP_ENV` | `production` |
| `APP_DEBUG` | `false` |
| `APP_URL` | `https://<your-service>.up.railway.app` |
| `DB_CONNECTION` | `mysql` |
| `DB_HOST` | `${{ MySQL.MYSQLHOST }}` |
| `DB_PORT` | `${{ MySQL.MYSQLPORT }}` |
| `DB_DATABASE` | `${{ MySQL.MYSQLDATABASE }}` |
| `DB_USERNAME` | `${{ MySQL.MYSQLUSER }}` |
| `DB_PASSWORD` | `${{ MySQL.MYSQLPASSWORD }}` |
| `QUEUE_CONNECTION` | `database` または `redis` |
| `FILESYSTEM_DISK` | `gcs` または `public` |
| `GEMINI_API_KEY` | Gemini API キー |
| `GEMINI_MODEL` | 例: `gemini-2.5-flash-lite` |

### Google Cloud 認証（Vision / TTS 用。常に必須）

| 変数 | 説明 |
|------|------|
| `GOOGLE_CREDENTIALS_JSON` **または** `GOOGLE_APPLICATION_CREDENTIALS` | どちらか一方のみ設定 |
| `GOOGLE_CLOUD_PROJECT_ID` | GCP プロジェクト ID |

### Google OAuth（Google ログインを使う場合のみ）

| 変数 | 説明 |
|------|------|
| `GOOGLE_CLIENT_ID` | OAuth クライアントID |
| `GOOGLE_CLIENT_SECRET` | OAuth クライアントシークレット |
| `GOOGLE_REDIRECT_URI` | `https://<domain>/auth/google/callback` |

## 3. Google 認証の設定ルール（重要）

1. `GOOGLE_CREDENTIALS_JSON` と `GOOGLE_APPLICATION_CREDENTIALS` は同時設定しない
2. Railway では `GOOGLE_CREDENTIALS_JSON`（JSON文字列）を推奨
3. `GOOGLE_APPLICATION_CREDENTIALS` を使う場合は、実在する読み取り可能なパスを指定
4. 認証設定が不正だと起動時に fail-fast で例外になります

## 4. ストレージ戦略

### A. `FILESYSTEM_DISK=gcs`（推奨）

| 追加で必要な変数 | 値 |
|-----------------|----|
| `GOOGLE_CLOUD_STORAGE_BUCKET` | GCS バケット名 |

- 画像保存先は GCS
- Railway Volume は不要

### B. `FILESYSTEM_DISK=public`（ローカルディスク）

1. Railway で Volume を作成して Web サービスにアタッチ
2. Mount Path は `/app/storage/app`

| 追加で必要な変数 | 値 |
|-----------------|----|
| なし | - |

- 画像保存先はコンテナ内 `storage/app/public`
- **Vision / TTS 用の Google 認証は引き続き必須**
- `GOOGLE_CLOUD_STORAGE_BUCKET` は不要

## 5. Queue 設定

### A. `QUEUE_CONNECTION=database`（シンプル）

- 追加サービス不要
- Worker は `start.sh` が起動

### B. `QUEUE_CONNECTION=redis`

- Railway に Redis サービスを追加
- `REDIS_URL`（または `REDIS_HOST` / `REDIS_PORT` 等）を設定

## 6. Start Command

Railway Settings > Deploy > Start Command:

```bash
bash railway/start.sh
```

## 7. デプロイ後の確認

1. Deploy Logs に `Starting queue worker...` と `Starting web server...` が出る
2. `php artisan migrate` の失敗ログが出ていない
3. `/` と `/login` にアクセスできる
4. 画像アップロード後、`processing` から `ready` または `failed` に遷移する
5. `failed` が連続する場合は Google 認証設定と Queue 接続を確認する

## 8. よくある詰まり

| 症状 | 主な原因 | 対処 |
|------|---------|------|
| 起動直後に例外で落ちる | Google 認証変数の二重設定 / JSON不正 / パス不正 | `GOOGLE_CREDENTIALS_JSON` と `GOOGLE_APPLICATION_CREDENTIALS` を見直す |
| 画像は保存できるが分析が進まない | Queue worker が動いていない / Queue 接続不一致 | `QUEUE_CONNECTION` と worker 起動ログを確認 |
| `FILESYSTEM_DISK=public` で画像が消える | Volume 未アタッチ | `/app/storage/app` に Volume を接続 |
| `FILESYSTEM_DISK=gcs` で保存失敗 | バケット未設定 / 権限不足 | `GOOGLE_CLOUD_STORAGE_BUCKET` とサービスアカウント権限を確認 |

---

*Last updated: 2026-03-03*
