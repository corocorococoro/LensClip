# AI モデル許可リスト

Gemini モデル allowlist の実体は `config/services.php` の `services.gemini.allowed_models`。このドキュメントは、運用上の扱いと更新時の確認観点だけを書く。

## 方針

- allowlist 外モデルはサーバ側で拒否する
- 管理画面の選択肢は allowlist から生成する
- デフォルトモデルも `config/services.php` を一次ソースにする

## 更新手順

1. `config/services.php` の `services.gemini.allowed_models` と必要なデフォルト値を更新する
2. 管理画面で選択肢が正しく出ることを確認する
3. allowlist 外モデル拒否テストを含めて確認する

## 廃止ポリシー

- 廃止予定モデルは変更内容や PR に廃止時期を明記
- 廃止日の 2 週間前までに Allowlist から削除
- 削除前にデフォルトが廃止モデルでないことを確認

## 注意事項

- **Rules / docs に Allowlist を複製しない**（参照のみ）
- **allowlist 外モデルはサーバ側で必ず拒否**（Security invariants 参照）

---

*Last updated: 2026-07-08*
