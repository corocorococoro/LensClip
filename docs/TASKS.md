# LensClip タスク一覧

## PR1: DBリファクタ - Observation モデル
**DoD**: 新スキーマでマイグレーション完了、既存テストがパス

### タスク
- [ ] 既存の `scraps`, `scrap_tag` テーブルを削除するマイグレーション作成
- [ ] `observations` テーブルのマイグレーション作成（uuid, status, paths, ai_json等）
- [ ] `tags` テーブルにuser_idを追加、uniqueインデックス追加
- [ ] `observation_tag` ピボットテーブル作成
- [ ] `collections` テーブル作成
- [ ] `collection_observation` ピボットテーブル作成
- [ ] `Observation` モデル作成（fillable, casts, relationships）
- [ ] `Tag`, `Collection` モデル更新
- [ ] `ObservationPolicy` 作成（userスコープ）
- [ ] マイグレーション実行、動作確認

---

## PR2: 画像アップロード（非同期化）
**DoD**: POSTでprocessing状態のObservation作成、Jobがdispatchされる

### タスク
- [ ] `StoreObservationRequest` FormRequest作成（バリデーション）
- [ ] `ObservationController::store` 作成
  - 画像圧縮・保存
  - Observation作成（status=processing）
  - AnalyzeObservationJob dispatch
- [ ] `AnalyzeObservationJob` スケルトン作成（処理は次PR）
- [ ] ルート追加 `POST /observations`
- [ ] テスト: アップロード→processing状態確認

---

## PR3: AI処理Job（Vision Crop + Gemini）
**DoD**: Jobが完了し、ready/failedに更新される

### タスク
- [ ] `VisionService` 作成（Object Localization）
- [ ] `CropService` 作成（bbox選定、マージン付与、crop保存）
- [ ] `GeminiService` リファクタ（jsonSchemaモード）
- [ ] `AnalyzeObservationJob` 実装
  - Vision呼び出し
  - Crop処理
  - Gemini呼び出し
  - Observation更新（ready/failed）
- [ ] テスト: Jobモックでready遷移確認
- [ ] テスト: Vision失敗時のフォールバック確認

---

## PR4: API追加（CRUD）
**DoD**: 全APIエンドポイントが動作

### タスク
- [ ] `GET /observations` (検索/フィルタ)
- [ ] `GET /observations/{id}`
- [ ] `POST /observations/{id}/retry`
- [ ] `DELETE /observations/{id}`
- [ ] `DELETE /observations` (全削除)
- [ ] Tags CRUD
- [ ] Collections CRUD
- [ ] テスト: 各エンドポイント動作確認

---

## PR5: フロントエンド（Home/Capture/Processing）
**DoD**: 撮影→アップロード→ポーリング→結果表示が動作

### タスク
- [ ] `Home.tsx` 作成（撮るCTA）
- [ ] `Capture.tsx` 作成（カメラ or ファイル選択）
- [ ] `Processing.tsx` 作成（ポーリング）
- [ ] `Result.tsx` 作成（結果表示、タグ選択）
- [ ] 下部ナビ実装（Home/Library/Collections）
- [ ] ルート更新

---

## PR6: フロントエンド（Library/Collections）
**DoD**: 一覧表示、検索、フィルタ、コレクション管理が動作

### タスク
- [ ] `Library.tsx` 作成（グリッド、検索、タグフィルタ）
- [ ] `Detail.tsx` 作成（詳細表示）
- [ ] `Collections.tsx` 作成（一覧、作成）
- [ ] `CollectionDetail.tsx` 作成（写真一覧）
- [ ] タグ/コレクション管理UI

---

## PR7: テスト・ドキュメント
**DoD**: Featureテスト完備、README更新

### タスク
- [ ] Featureテスト: 作成→ready遷移
- [ ] Featureテスト: failed→retry
- [ ] Featureテスト: タグ付け/検索
- [ ] Featureテスト: 全削除
- [ ] Unitテスト: bbox選定
- [ ] Unitテスト: crop計算
- [ ] README.md更新（セットアップ、動作確認）
- [ ] .env.example更新

---

## 優先順位
1. PR1（DB）→ PR2（アップロード）→ PR3（AI）が最優先
2. PR4（API）と PR5（UI）は並行可能
3. PR7（テスト）は各PRで追加しつつ、最後に統合テスト
