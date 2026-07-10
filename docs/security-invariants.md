# セキュリティ不変条件

この文書は、実装方式が変わっても常に守る境界だけを扱う。具体的なルート、設定キー、検証値はソースコードとテストを一次ソースとする。

## 認証と認可

- 管理機能はサーバ側で管理者だけに許可する。UI で隠すだけでは認可とみなさない
- 観察記録とタグの参照・変更・削除は所有者だけに許可する
- 所有権や権限が確定できない場合は拒否し、推測で補わない

## 秘密情報と利用者データ

- 外部サービスの認証情報はサーバ側だけで扱い、ブラウザへ渡さない
- 秘密情報、個人識別子、画像データ、利用者が入力・生成した本文、AI のフルレスポンスをログへ出さない。識別が必要な場合は不可逆なフィンガープリントまたは内部 ID を使う
- 利用者向けエラーには内部例外、認証情報、外部サービスのレスポンス本文を含めない
- 秘密情報をリポジトリへ保存しない

## AI の制御

- 利用するモデルはサーバ側で明示的に設定し、許可リスト外のモデルを拒否する
- 未設定、不正、許可リスト外のモデルを別モデルへ自動で置換しない
- 画像解析には安全性判定を適用し、拒否時は内部情報を含まない復帰可能な案内を返す
- ブラウザから外部 AI API を直接呼ばない

## アップロードと画像

- アップロードは宣言された MIME だけでなくファイル実体も検証し、レート制限を適用する
- 位置情報として永続化してよい EXIF は緯度・経度だけとし、保存画像は再エンコードしてその他の EXIF を残さない
- アップロード直後のローカル画像は、Job が正規化して最終保存先へ移すまでの中間データとして扱う

## 一次ソース

| 関心事 | 一次ソース |
|---|---|
| 管理者境界 | `routes/`、`app/Http/Middleware/AdminMiddleware.php` |
| 所有権 | `app/Policies/`、各 Controller、関連テスト |
| アップロード検証とレート制限 | `app/Http/Requests/StoreObservationRequest.php`、`app/Rules/ImageMagicBytes.php`、`app/Providers/AppServiceProvider.php` |
| モデル制御と安全性 | `app/Services/GeminiModelRegistry.php`、`app/Services/ImageAnalysisService.php`、関連テスト |
| 画像の正規化と保存 | `app/Services/ObservationService.php`、`app/Jobs/AnalyzeObservationJob.php` |
| ログの秘匿処理 | ログを出力する実装、`app/Http/Controllers/Admin/LogController.php`、関連テスト |
