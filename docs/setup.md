# セットアップ

## 1. リポジトリをクローン

```bash
git clone <repository-url>
cd LensClip
```

## 2. 環境変数を設定

```bash
cp .env.example .env
```

`.env` ファイルを編集:

```env
# Google Login (Socialite)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI="http://localhost/auth/google/callback"

# Google Cloud Services (GCS, Vision API, TTS API)
# Set exactly one credential source
# Local / Sail: key file path (relative or absolute)
GOOGLE_APPLICATION_CREDENTIALS=service-account.json
# Railway: raw JSON string
# GOOGLE_CREDENTIALS_JSON='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_STORAGE_BUCKET=your-bucket-name

# Google Gemini API
GEMINI_API_KEY=your-gemini-api-key

# Storage (public for local, gcs for production)
FILESYSTEM_DISK=public
```

認証変数の注意:
- `GOOGLE_APPLICATION_CREDENTIALS` と `GOOGLE_CREDENTIALS_JSON` は **同時設定しない**
- `GOOGLE_CREDENTIALS_JSON` は **JSON文字列そのもの**（ファイルパスではない）
- JSON が不正 / ファイルが存在しない場合は起動時にエラーになる（fail-fast）

## 3. Docker環境を起動

```bash
./vendor/bin/sail up -d
```

## 4. 依存関係をインストール

```bash
./vendor/bin/sail composer install
./vendor/bin/sail npm install
```

## 5. アプリケーションキー生成

```bash
./vendor/bin/sail artisan key:generate
```

## 6. データベースマイグレーション

```bash
./vendor/bin/sail artisan migrate
```

## 7. ストレージリンク作成

```bash
./vendor/bin/sail artisan storage:link
```

## 8. フロントエンドビルド

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

## 管理者設定

### 管理者に昇格する

```bash
./vendor/bin/sail artisan user:promote your-email@example.com
```

### 管理画面

| 機能 | URL | 説明 |
|------|-----|------|
| ログ閲覧 | `/admin/logs` | レベル・日付でフィルタ、スタックトレース表示 |
| AI設定 | `/admin/settings/ai` | Geminiモデルの切り替え（即時反映） |

## テスト実行

```bash
./vendor/bin/sail artisan test
```

## トラブルシューティング

### Sailの再起動
```bash
./vendor/bin/sail stop
./vendor/bin/sail up -d
```

### アセット（CSS/JS）の読み込みエラー
Viteサーバーが起動していない可能性:
```bash
./vendor/bin/sail npm run dev
```

### 画像が表示されない
ストレージのシンボリックリンクを再作成:
```bash
./vendor/bin/sail artisan storage:link
```

### AI分析が進まない（処理中のまま）
キューワーカーを起動:
```bash
./vendor/bin/sail artisan queue:work
```

### ログの確認
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
