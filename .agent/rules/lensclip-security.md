---
trigger: always_on
---

# Security/Privacy Rules

- 画像アップロードはMIME/実体検証、サイズ上限、レート制限(throttle)
- EXIF（GPS等）は可能なら除去して保存
- ログに画像内容やAI全文を出さない（サマリのみ）
- APIキーはサーバー側のみで使用（クライアントへ露出させない）
