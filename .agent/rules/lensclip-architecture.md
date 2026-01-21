---
trigger: always_on
---

# Architecture Rules (Laravel)

- Laravel 12 + Inertia React を前提（Breezeで認証）
- Controllerは薄く、UseCase/Service/Action層へ寄せる（OOP）
- 例外/失敗系（AI失敗、bbox無し等）を必ず設計し、状態遷移で表現
- 秘密情報はコミット禁止（.env、サービスキー、APIキー）
- 重要フローはFeatureテストで押さえる（作成→job→結果、タグ、全削除）

## 開発環境（必須）
- Laravel Sail + Docker を前提にローカル環境を構築する
- composer / artisan / npm は原則 Sail 経由で実行する（例: ./vendor/bin/sail artisan）
- DBはMySQL（Sail標準）を優先。RedisもSailで起動してqueueをredisにする

## 検証ルール（必須）
- フロントエンド（.tsx/.ts）を変更したら、必ず `npm run build` を実行してTypeScriptビルドが通ることを確認する
- `npm run dev` は型エラーを見逃すことがあるため、本番ビルドで検証すること
