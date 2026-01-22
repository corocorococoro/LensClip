---
trigger: always_on
---

## Scope
Laravelアプリ全体（Controllers / Models / Services / Actions / Jobs / Console / Policies / Notifications / Views）に適用。

---

## 1. Single Responsibility
- **MUST** 1クラス = 1責務（1つの理由でのみ変更される）。
- **MUST** 1メソッド = 1アウトカム（1つの結果に集中）。
- **SHOULD** 下記は分離する  
  - バリデーション → FormRequest  
  - ユースケース/業務処理 → Service/Action  
  - 監査/ログ → 専用サービス  
  - クエリ構築 → Model scope / Query object（必要なら）

---

## 2. Controllerはオーケストレーションのみ
- **MUST NOT** Controllerに業務ルール・重い分岐・加工を置かない。
- **MUST** Controllerは「依頼 → 実行 → レスポンス」に限定（依存先は1〜3呼び出し目安）。

---

## 3. ValidationはFormRequest
- **MUST** Controller内の `validate()` を禁止し、`FormRequest` に移す。
- **MUST** 永続化に使う入力は `$request->validated()` のみ。

---

## 4. Business logicはService/Action
- **MUST** 非自明な業務ルール/手続きは `app/Services` または `app/Actions` に置く。
- **MUST** ファイル移動/変換/保存などの処理はControllerから分離する。

---

## 5. DRY
- **MUST** 重複した条件・変換・UI断片を放置しない。
- **SHOULD** 再利用は以下を優先  
  - Eloquent scopes  
  - Blade components/partials  
  - 共有メソッド/ヘルパ（乱用禁止）

---

## 6. Eloquent-first / Collections-first
- **SHOULD** まずEloquent（scopes/casts/events/soft deletes）で表現する。
- **SHOULD** 配列より `Collection` を優先（読みやすさ/操作性）。
- **MAY** Query Builder / raw SQL を使う条件  
  - パフォーマンス要件  
  - 複雑SQLの方が明確  
  - DB固有機能が必要  
  - 集計/バルク更新

---

## 7. Mass assignment
- **MUST** `fill/create/update( $validated )` または relation `->create($validated)` を使う。
- **MUST** `$fillable` / `$guarded` を適切に設定する。
- **MUST NOT** 意味なく1項目ずつ代入する（例外は理由がある場合のみ）。

---

## 8. Bladeでクエリ禁止 / N+1防止
- **MUST NOT** Blade内で `Model::...` やDBアクセスを実行しない。
- **MUST** 一覧描画は eager loading（`with/load/loadMissing`）必須。

---

## 9. 大量データはchunk/cursor/queue
- **MUST** 大量処理は `chunk/chunkById/cursor` またはキューJobを使う（メモリ/タイムアウト対策）。

---

## 10. 命名と規約
- **MUST** PSR-12 + Laravel慣習に従う（Controller/Model/relations/routes/migrations/views）。
- **MUST NOT** フレームワーク規約と戦う構造にしない（やるなら理由を文書化）。

---

## 11. HTMLとJS/CSSの責務分離
- **MUST NOT** PHPクラス内でHTML文字列を生成しない。
- **SHOULD NOT** Bladeに大きなJS/CSSをベタ書きしない（Vite等に寄せる）。

---

## 12. Config / Lang / Constants
- **MUST** 画面メッセージ等の文言は `lang/` を使う（ハードコード禁止）。
- **MUST** マジック値は `config/` or 定数/Enum に寄せる。

---

## 13. DI / Service container
- **MUST** 依存はコンストラクタ注入を基本とする。
- **MUST NOT** アプリケーション層で `new SomeService()` しない（Value Objectは例外）。

---

## 14. .env直読み禁止
- **MUST NOT** config以外から `env()` を呼ばない。
- **MUST** 参照は `config()` 経由。

---

## 15. Dateの扱い
- **MUST** DBはdatetimeで持ち、Model castsで `datetime` を使う。
- **MUST** 表示フォーマットはView層で行う（保存/業務処理で文字列化しない）。

---

## 16. DocBlocks
- **SHOULD** 型宣言（引数/戻り値/プロパティ）を優先し、冗長DocBlockは避ける。
- **MAY** 静的解析上必要な最小DocBlock（複雑配列/ジェネリクス等）は許可。

---

## 17. Routesにロジック禁止
- **MUST NOT** routesファイルにロジックを書かない（Controller/Actionへ）。