---
trigger: always_on
---

# Engineering Standards (2026 SV Baseline)

> **実装規約のみ記載**。具体的な API 項目は `docs/api-spec.md`、DB 項目は `docs/db-schema.md`、UX/処理フローは `docs/ux-flow.md` / `docs/ai-pipeline.md` を参照。  
> **一次ソースは docs**。このドキュメントは「開発の強制ルール／判断基準／PRのゲート」を定義する。

---

## 技術スタック

- Backend: Laravel 12 + Inertia.js
- Frontend: React + TypeScript
- Auth: Laravel Breeze
- Dev Env: Laravel Sail（Docker）必須
- Queue: Redis（Sail）
- DB: **MySQL（Sail標準）を原則**  
  - 例外（テスト高速化等）で SQLite を使う場合は **「prod と差が出ない範囲」**に限定し、差異は明記する。

---

## 0. 変更の基本方針（最重要）

- **Docs → Code の順で変更する**（仕様→実装）
- **破壊的変更は段階移行**（互換期間を作る）
- **状態遷移が絡む機能は「設計してから実装」**（status / retry / 冪等性を先に決める）

---

## 1. 開発環境ルール（MUST）

### Sail 経由でコマンド実行

```bash
./vendor/bin/sail artisan ...
./vendor/bin/sail composer ...
./vendor/bin/sail npm ...
```

### キュー設定（Redis）

- `QUEUE_CONNECTION=redis`（開発・本番）
- Job 実装は **冪等（idempotent）**を前提にする（再実行されても壊れない）

### 変更反映

- **ジョブ処理コード変更時**: ワーカー再起動
```bash
./vendor/bin/sail artisan queue:restart
```

- **設定・ルート変更時**: キャッシュクリア
```bash
./vendor/bin/sail artisan optimize:clear
```

---

## 2. アーキテクチャ原則（MUST）

### 薄い Controller

- Controller は **入力の受け取り**と **レスポンス整形**のみ
- ビジネスロジックは UseCase / Service / Action へ移す
- 目安: Controller に if/loop が増え始めたら UseCase に退避

### 依存方向（逆流禁止）

- Controller → UseCase/Service → Repository/Model
- Model / Repository から Controller / Request / Inertia を参照しない

### 明示的な状態遷移（フローの設計）

- 複雑な非同期処理（AI等）は **status カラムで状態管理**する
- 想定される失敗は例外で 500 にせず、**`failed` 等の状態で表現**する
- 状態は「画面で説明できる」粒度にする（ユーザーが次に何をすべきかが分かる）

推奨の基本形:
- `queued` → `processing` → `ready`
- 失敗は `failed`（必要なら `failed_retryable` / `failed_permanent`）

### 例外処理（MUST）

- 想定内（AIエラー、bboxなし、外部APIの一時失敗等）:
  - 例外で落とさず **状態 + メッセージ**でUIに出す
- 想定外（バグ／整合性破壊／契約違反）:
  - 500（例外）で良いが、**必ずログとトレース**を残す

### フレームワークのデフォルトを壊さない（MUST）

以下はすべて **禁止**：

- **ServiceProvider の boot/register で環境変数の存在チェックを throw する**
  - `package:discover` 等のビルドステップでも boot が走るため、Dockerビルドが壊れる
  - 設定ミスは **使用時に自然に失敗** させる（Laravel の思想）
- **config() や env() にハードコードのフォールバック値を独自追加する**
  - 設定が足りないならエラーで気づくべき。黙って動くのは問題の隠蔽
- **Dockerfile にダミー環境変数を追加してビルドを通す**
  - 根本原因（boot 時のチェック等）を修正する
- **動かすために無理矢理フォールバックやデフォルト値を差し込む**
  - 必要な設定がないことを正しく伝えるのが正解

---

## 3. データ境界（Validation / DTO）（MUST）

### FormRequest 必須

- Controller 内の `$request->validate()` は禁止
- FormRequest を使う（例外は「動的ルールが妥当で、FormRequest で表現しにくい」場合のみ）

推奨パターン:
- Controller: `$data = $request->validated();`
- UseCase: `$useCase->execute($data);`

### validated の扱い（推奨）

- `$request->input()` を多用しない（型が曖昧になる）
- **境界で整形してから渡す**（例: DTO / ValueObject / 配列でも可）
- 型変換が必要なら Request/DTO 側で吸収する

---

## 4. キュー / 非同期設計（SV流の最低ライン）

### MUST

- Job は **冪等性**を満たす（同じ job が複数回走っても正しい）
- 外部APIは **リトライ戦略**を持つ（指数バックオフ等）
- 重要処理は **タイムアウト／最大試行回数／失敗時の状態**を明示
- 再実行のトリガー（ユーザー操作 or 自動）を決める

### SHOULD

- 失敗時に「原因カテゴリ」を保持（例: `error_code`, `error_message`）
- 進捗が必要なら `progress`（0-100）または段階 status を持つ
- 重い処理は「同期HTTP内で完結させない」

---

## 5. フロントエンド規約（MUST）

### 型安全

- Props はすべて TypeScript の `interface` / `type` で定義
- `any` の導入は原則禁止（導入するなら理由をコメント）

### ビルド検証必須（PR前ゲート）

```bash
npm run build
```

- `npm run dev` は型エラーを見逃すことがあるため **PR前に必ず build**

---

## 6. テスト規約（MUST）

### Sail 経由でテスト実行

```bash
./vendor/bin/sail artisan test
```

### カバレッジの方針

- Feature テスト:
  - 重要フロー（アップロード → Job → 結果）を必ずカバー
  - 認証・認可の境界テスト必須（許可/不許可の両方）
- Unit テスト:
  - 複雑なロジック（bbox選定、crop、スコアリング等）をカバー

### テスト用画像

- `public/images/lp/` の画像を使用（ladybug, pinecone, sunflower）
- ブラウザテスト／画像解析テストはこれらで再現性を担保する

※ 詳細観点は `docs/test-plan.md` を参照

---

## 7. コード規約（MUST）

### デッドコード禁止

- ルートから参照されていない Controller は残さない
- 使われていない Service / Model / Action は削除する
- 「将来使うかも」は禁止（必要になった時に戻す）

### 命名規則

- `docs/`: kebab-case（例: `api-spec.md`）
- PHP クラス: PascalCase（Laravel標準）
- DB/カラム/enum/status: **読み手が UI で説明できる名前**（略語地獄を避ける）

### 静的解析の偽陽性

- 無視する場合は **日本語コメントで理由**を残す（「何が」「なぜ」「いつ外すか」）

---

## 8. PR ゲート（MUST）

PR 前に必ず通す:

```bash
./vendor/bin/sail artisan test
./vendor/bin/sail npm run build
```

推奨（導入済みなら必須化）:
- PHP: formatter / lint / static analysis（例: Pint / Larastan 等）
- TS: eslint / tsc（strict）/ formatter

---

## 9. 変更時チェックリスト（MUST）

- [ ] docs（api-spec / db-schema / ux-flow / ai-pipeline）の更新が必要か確認した
- [ ] status 遷移（成功/失敗/再実行）を定義した
- [ ] 想定内失敗が 500 になっていない（UIで説明できる）
- [ ] Job が冪等（再実行安全）になっている
- [ ] Feature テスト（重要フロー）を追加/更新した
- [ ] `artisan test` と `npm run build` を通した

---

*Last updated: 2026-01-23*