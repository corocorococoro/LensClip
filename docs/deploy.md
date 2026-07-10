# Railway 運用

この文書は Railway でデプロイ・障害切り分けを行うための運用手順だけを扱う。イメージの内容は `Dockerfile` と `.dockerignore`、起動処理は `railway/start.sh`、環境変数は `.env.example` と `config/` を一次ソースとする。

## 構成

- Web アプリケーション
- MySQL
- Queue worker。現在は Web と同じサービス内で起動する
- Redis は Queue 接続に採用した場合だけ必要
- 画像をローカルディスクへ保存する場合は永続 Volume、GCS を使う場合は対象バケットと権限が必要

ローカルディスクを選ぶ場合、Railway Volume は現在のコンテナ内保存先である `/app/storage/app` へマウントする。このパスの一次ソースは `Dockerfile`、`railway/start.sh`、`config/filesystems.php` とする。

## デプロイ

Railway の Start Command は次を使う。

```bash
bash railway/start.sh
```

環境変数の名前は `.env.example` を入口にし、本番の値は Railway のリソース参照と各プロバイダーの設定から確定する。ローカル用の値を本番へコピーせず、秘密情報をリポジトリへ保存しない。

## 現在の起動方式で注意すること

- 起動時 migration と storage link は失敗してもプロセスが継続するため、デプロイ成功表示だけでは正常性を判断できない
- Queue worker は Web プロセスと同居しているため、再起動・メモリ・ログを同じサービスで監視する
- ローカル保存を選ぶ場合、Volume がないと再デプロイで画像が失われる
- Gemini の allowlist と current model は DB 上の管理設定なので、新しい DB では管理画面から設定が必要

## デプロイ後の確認

1. 起動ログで migration、storage link、Queue worker、Web server の開始を確認する
2. トップページとログイン画面が開くことを確認する
3. 管理画面で AI 設定が有効か確認する
4. 画像を1件アップロードし、分析中から成功または説明可能な失敗へ遷移することを確認する
5. 保存した画像が再表示できることを確認する

## 障害切り分け

| 症状 | 確認する境界 |
|---|---|
| 起動直後に落ちる | 起動ログ、DB 接続、Google 認証情報の競合 |
| migration が反映されない | 起動ログと DB、`railway/start.sh` の migration 結果 |
| 分析が進まない | Queue worker、Queue 接続、AI 設定、外部サービス認証 |
| 画像保存に失敗する | `FILESYSTEM_DISK`、Volume または GCS の権限 |
| 再デプロイ後に画像が消える | ローカル保存と Volume の接続 |

具体的な変数名、worker オプション、ビルド手順は実装ファイルを確認し、この文書へ転記しない。
