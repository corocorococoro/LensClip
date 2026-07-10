# ローカル開発環境のセットアップ

この文書は、新しい作業環境を起動できる状態にするための手順だけを扱う。実行環境の要件は `composer.json` と `package.json`、依存バージョンは lockfile、環境変数は `.env.example` を一次ソースとする。

## 前提

- Docker Desktop または互換の Docker 環境
- `composer.json` の要件を満たす PHP と Composer
- `package.json` の `engines` を満たす Node.js と npm

## 初回セットアップ

```bash
cp .env.example .env
composer install
npm ci
./vendor/bin/sail up -d
./vendor/bin/sail artisan key:generate
./vendor/bin/sail artisan migrate
./vendor/bin/sail artisan storage:link
```

フロントエンドの開発サーバー:

```bash
npm run dev
```

アプリは通常 `http://localhost` で開く。

## 外部サービスを使う場合

- Google OAuth、Cloud Vision、Cloud TTS、GCS、Gemini の変数名は `.env.example` を参照する
- Application Default Credentials を使わない場合、Google Cloud の認証情報はファイルパスまたは JSON 文字列のどちらか一方だけを設定する
- Gemini のモデル名と allowlist は環境変数ではなく、管理画面から保存する
- AI 分析を確認する前に、対象ユーザーを管理者へ昇格し、管理画面でモデル設定を完了する

管理者への昇格:

```bash
./vendor/bin/sail artisan user:promote your-email@example.com
```

## 完了確認

```bash
npm run build
./vendor/bin/sail test
```

## 切り分けの入口

| 症状 | 最初に確認するもの |
|---|---|
| Sail が起動しない | `./vendor/bin/sail ps`、Docker の状態、`compose.yaml` |
| CSS / JS が更新されない | Vite の起動状態、`public/hot` |
| 分析中のまま進まない | Queue worker、AI 設定、アプリログ |
| 画像が表示されない | storage link と `FILESYSTEM_DISK` |

具体的な設定値やコマンドの追加オプションは、対応する設定ファイルと CLI のヘルプを参照する。
