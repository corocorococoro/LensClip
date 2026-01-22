---
trigger: always_on
---

# Engineering Standards

> **実装規約のみ記載**。具体的な API 項目は `docs/API_SPEC.md`、DB 項目は `docs/DB_SCHEMA.md` を参照。

## 技術スタック

- **Backend**: Laravel 12 + Inertia.js
- **Frontend**: React + TypeScript
- **認証**: Laravel Breeze
- **開発環境**: Laravel Sail (Docker) 必須

## 開発環境ルール

1. **Sail 経由でコマンド実行**
   ```bash
   ./vendor/bin/sail artisan ...
   ./vendor/bin/sail composer ...
   ./vendor/bin/sail npm ...
   ```

2. **DB**: MySQL（Sail 標準）
3. **Queue**: Redis（Sail で起動し、queue を redis に設定）

## アーキテクチャ原則

1. **薄い Controller**
   - Controller はリクエスト解析とレスポンス整形のみ
   - ビジネスロジックは Service / Action / UseCase 層へ

2. **明示的な状態遷移**
   - 複雑なフロー（AI 処理等）は status カラムで状態管理
   - 失敗は 500 ではなく、明示的な `failed` 状態で表現

3. **依存方向**
   - Controller → UseCase/Service → Repository/Model
   - 逆方向の依存は禁止

4. **例外処理**
   - 予期される失敗（AI エラー、bbox なし等）は UI で表現
   - 予期しない例外のみ 500

## フロントエンド規約

1. **型安全**
   - Props はすべて TypeScript interface で定義

2. **ビルド検証必須**
   ```bash
   npm run build
   ```
   - `npm run dev` は一部の型エラーを見逃すため、PR 前に必ず本番ビルドで確認

## テスト規約

1. **Sail 経由でテスト実行**
   ```bash
   ./vendor/bin/sail artisan test
   ```
   - ローカル PHP バージョンではなく Sail コンテナで実行する

2. **Feature テスト**
   - 重要フロー（アップロード → Job → 結果）をカバー
   - 認証・認可の境界テスト必須

3. **Unit テスト**
   - 複雑なロジック（bbox 選定アルゴリズム等）をカバー

テスト観点の詳細は `docs/test-plan.md` を参照。

## コード規約

1. **FormRequest 必須**
   - Controller 内の `$request->validate()` は禁止
   - FormRequest を使用する（動的ルールの場合は例外）

2. **デッドコード禁止**
   - ルートから参照されていない Controller は残さない
   - 使われていない Service / Model は削除する

3. **ファイル命名規則**
   - `docs/`: kebab-case（例: `api-spec.md`）
   - PHP クラス: PascalCase（Laravel 標準）

4. **静的解析の偽陽性**
   - 無視する場合は日本語コメントで理由を残す

---

*Last updated: 2026-01-22*
