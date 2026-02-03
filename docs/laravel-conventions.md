## 目的
- レビューでの判断基準を統一し、保守性・テスト容易性・変更耐性を上げる。
- 「Rulesは強制」「Docsは意図と例外」を分離して運用する。

---

## 1. SRP（Single Responsibility）
### 典型的な悪い例（責務過多の兆候）
- Controllerが以下を全部やる  
  - validate / normalize / logging / ループ処理 / 永続化 / 通知 / redirect
- Modelのアクセサが `auth()` を見て表示名を分岐（権限 + 表示整形の混在）

### 分離の指針
- 入力保証 → FormRequest  
- ルール判断/手続き → Action/Service  
- 永続化/関係 → Model（ただし後述の「Fat model」に注意）

---

## 2. Methods should do just one thing
### 方針
- 「分岐が多い」＝「複数の意図が混在」している可能性が高い。
- “決定（判断）” と “実行（生成/加工）” を分けると読みやすい。

### 例（考え方）
- `getFullNameAttribute()` は
  - 判定：`isVerifiedClient()`
  - 生成：`getFullNameLong()` / `getFullNameShort()`
  に分解する。

---

## 3. Fat models, skinny controllers（ニュアンスあり）
### 目的
- Controllerを薄くし、UI層の責務を限定する。

### 注意
「DB関連を全部Modelへ」は、Modelが巨大化しやすい。

### 推奨（順番）
1. **Eloquent scopes**：再利用条件を最小単位で共有
2. **Query object**：複雑な読み取り・検索条件を1ユースケース単位で隔離
3. **Repository**：複数ストレージ/抽象化が本当に必要な場合のみ

---

## 4. Validation（FormRequest）
### 目的
- 入力保証をControllerから分離し、テスト・再利用・見通しを改善する。

### パターン
- Controllerは `SomeRequest $request` を受ける
- 永続化は `$request->validated()` のみを使う
- `authorize()` は「その操作を許可するか」を担う

---

## 5. Business logic in Service/Action
### どちらを使う？
- **Action**：ユースケース単位（CreateX, UpdateY など）で1つの入口を持つ
- **Service**：横断的能力（画像処理、決済、外部API）を提供する

### 例
- 画像アップロードの `move/resize/store` はControllerから分離する。
- Controllerは「依頼」だけ（`$this->articleService->handleUploadedImage(...)`）。

---

## 6. DRY
### 再利用の定石
- 重複条件 → scope  
- 重複UI → Blade component/partial  
- 重複変換 → 共通メソッド（ただし“便利関数の墓場”にしない）

---

## 7. Eloquent / Query Builder / raw SQL
### 原則
- 読みやすさ・保守性が勝つならEloquent。

### 例外
- 集計・複雑Join・バルク更新・性能最優先の箇所はQuery Builder/raw SQLでもよい。
- その場合、**理由（性能/可読性）をコメントかDocsに残す**。

---

## 8. Mass assignment
### 目的
- 入力と永続化の接点を明確にし、漏れや改修コストを減らす。

### 推奨
- relation create を優先：`$category->articles()->create($validated);`
- `$fillable` / `$guarded` を適切に管理する

---

## 9. Bladeでクエリ禁止 + N+1
### 禁止理由
- Viewでクエリが走ると、影響範囲が見えず性能劣化しやすい。

### 対策
- 一覧は必ず eager loading：`User::with('profile')->get()`

---

## 10. 大量データ処理（chunk/cursor/queue）
### 使い分け
- `chunkById()`：更新しながらの走査に強い（ズレにくい）
- `cursor()`：低メモリでストリーム処理
- Queue Jobs：時間がかかる・分割可能な処理

---

## 11. コメントより命名
### 方針
- 「コメントが必要なコード」は命名/抽出で読みやすくできる可能性が高い。
- ただし仕様の背景（なぜそうするか）はコメント/Docsに残す価値がある。

---

## 12. HTMLとJS/CSSの責務分離
- PHPクラスはHTMLを生成しない（責務とテスト性が悪化する）。
- JS/CSSはVite等のアセット管理へ寄せ、Bladeはデータ橋渡しに留める。

---

## 13. Config / Lang / Constants
- 文言：`__('app.article_added')`
- 種別：`Article::TYPE_NORMAL` や Enum
- 変動値：`config('api.key')`

---

## 14. DI / Service container
- `new` は結合度を上げる。
- DIで差し替え可能にしてテスト容易性を確保する。

---

## 15. .env 直読み禁止
- `.env` は config 経由で吸収し、アプリケーションコードからは `config()` のみ使う。

---

## 16. Dateはオブジェクトとして扱う
- DBはdatetime、Model castsでCarbonにする。
- 文字列フォーマットはView層。

---

## 17. DocBlocks（現実的運用）
- 可能な限り型宣言で代替する。
- 静的解析上必要な最小DocBlock（複雑配列/ジェネリクス等）は許容する。

---

## 18. Routesにロジックを書かない
- routesは「入口の定義」に限定し、処理はController/Actionに寄せる。