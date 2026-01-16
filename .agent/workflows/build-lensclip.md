---
description: Laravel 12 + Inertia Reactで LensClip MVP を設計→実装→検証まで通す（Vision crop + Gemini identify）
---

あなたはAntigravityの実装エージェント。LensClip（親子向け「これなぁに？」スクラップ）をMVPとして完成させる。

# 実行ルール
- まず設計Artifactsを /docs に出す（実装前）
- その後、実装→テスト→README→動作確認（ブラウザで主要導線）まで
- 仕様の曖昧点は勝手に拡張せず、MVPとして最小に落とす（ただし止まらない）
- 重要: Vision=切り抜き（bbox）だけ。Gemini=同定と説明生成。

# フェーズ1: 設計Artifacts生成（実装しない）
/docs に以下を作成する（Markdown）。
1) PRD.md
   - ターゲット、主要ユースケース、MVPスコープ/非スコープ、成功指標
2) UX_FLOW.md
   - 画面遷移（Home→Capture→Processing→Result→Save→Library→Collection）
   - 状態（processing/ready/failed）とUI表現
3) API_SPEC.md
   - ルーティング（Web/JSON）一覧
   - Observation/Tag/CollectionのCRUD（必要最小）
4) DB_SCHEMA.md
   - users, observations, tags, observation_tag, collections, collection_observation, user_achievements(任意)
   - インデックス（user_id + created_at、検索、tag unique）
5) AI_PIPELINE.md
   - Upload→Job→Vision bbox→Crop→Gemini JSON→保存
   - bbox選定ロジック（score/面積/中央寄りの合成で1件）
   - フォールバック（bbox無し→元画像をGemini）
6) TASKS.md
   - PR単位（小さく）でタスク分割、DoD付き
7) TEST_PLAN.md
   - Featureテスト（成功/失敗/再実行/タグ/全削除）を最低限定義

Artifacts出力後、すぐにフェーズ2へ進む（レビュー待ちで停止しない。MVP最短で実装）。

# フェーズ2: プロジェクト作成（Laravel 12 + Inertia React） + Sail
- Laravel 12 Breeze (Inertia + React) の土台を作る
- 直後にLaravel Sailを導入し、Dockerで起動できるようにする
  - sail:install を実行し、servicesは mysql / redis を含める
  - ./vendor/bin/sail up -d で起動確認
- マイグレーション・フロントビルド・テストは原則Sail経由で実行する
  - 例: ./vendor/bin/sail artisan migrate
  - 例: ./vendor/bin/sail npm install
  - 例: ./vendor/bin/sail npm run dev
- アプリURL/ポート、Viteのホットリロードが動くことを確認

# フェーズ3: DBとドメイン骨格
- Migrations:
  observations:
    - id(uuid), user_id
    - status(processing|ready|failed)
    - original_path, cropped_path(nullable), thumb_path
    - crop_bbox(json nullable)
    - vision_objects(json nullable)  // 将来の対象選択に備える
    - ai_json(json nullable)        // Geminiの厳格JSON
    - title, summary, kid_friendly, confidence
    - timestamps, index(user_id, created_at)
  tags: id, user_id, name(unique user_id+name)
  observation_tag: observation_id, tag_id
  collections: id, user_id, name, cover_observation_id(nullable)
  collection_observation: collection_id, observation_id, position(optional)
  user_achievements: id, user_id, code, unlocked_at
- Models/Policies/Requests を整備（userスコープ徹底）

# フェーズ4: 画像アップロード（圧縮のみ）
- POST /observations
  - multipart image
  - バリデーション（MIME、サイズ）
  - 受領後サーバ側で圧縮（original、thumb）
  - Observationをstatus=processingで作成し、Job dispatch
  - response: { id, status }
- Storage:
  - まずlocal disk（public）でOK。パスは推測困難に。
- EXIF除去を可能なら実装（なければTODOとしてdocsへ）

# フェーズ5: AI処理（Job）— Vision crop + Gemini identify
Job: AnalyzeObservationJob(observation_id)
1) Observation取得（processing以外なら終了）
2) Vision Object Localization:
   - REST images:annotate を使用
   - localizedObjectAnnotations から bbox候補取得
   - bbox選定: score優先 + 面積 + 中央寄り（合成で1つ）
3) Crop:
   - bboxに10%マージン付与、画像端でクリップしてcropped生成
   - cropped保存、crop_bbox/vision_objects保存
   - bboxが取れない場合: cropped無し（originalで進める）
4) Gemini:
   - 入力: cropped（なければ original）
   - JSONのみ返すよう強制し、以下の形で厳格パースして保存
     {
       "title": "...",
       "alt_names": ["..."],
       "summary": "...",
       "kid_friendly": "...",
       "category": "plant|animal|insect|food|tool|vehicle|place|other",
       "tags": ["..."],
       "confidence": 0.0-1.0,
       "candidates": [{"name":"", "confidence":0.0}],
       "safety_notes": ["..."],
       "fun_facts": ["..."],
       "questions": ["..."]
     }
5) Observation更新: title/summary/kid_friendly/confidence/ai_json/status=ready
6) 失敗時:
   - status=failed
   - 再実行用のPOST /observations/{id}/retry を用意（同Job再投入）

実API:
- Vision: env(VISION_API_KEY)
- Gemini: env(GEMINI_API_KEY, GEMINI_MODEL)

# フェーズ6: UI（Inertia React）
- Home:
  - 大きい「撮る」CTA（カメラ/アップロード）
  - 今日/合計の達成（件数、バッジ）
- Capture:
  - getUserMedia優先 + input captureフォールバック
- Processing:
  - statusポーリング（/observations/{id}）
- Result:
  - cropped画像（あれば）を表示
  - title + kid_friendly + fun_facts + safety_notes（短く）
  - 保存（タグ付け、コレクション追加）
- Library:
  - 写真グリッド、タグ/検索
- Collections:
  - 作成/編集、追加、カバー設定

# フェーズ7: API（必要最小）
- GET /observations (filter: q, tag, collection)
- GET /observations/{id}
- POST /observations
- POST /observations/{id}/retry
- DELETE /observations/{id}
- DELETE /observations (全削除)
- Tags CRUD（最小）
- Collections CRUD（最小）

# フェーズ8: テスト
- Feature:
  - 作成→processing→(Jobモック)ready
  - failed→retry
  - タグ付け/検索
  - 全削除で画像も消える（可能範囲で）
- Unit:
  - bbox選定（入力→1件）
  - bbox→pixel変換とマージン/クリップ

# フェーズ9: README + 動作確認
- .env.example（キー名のみ）
- セットアップ手順
- 動作確認シナリオ（撮影→結果→保存→一覧→フィルタ）
- 既知の制約（iOSカメラ等があれば記載）
- READMEのセットアップ手順はSail前提で書く
  - 初回: cp .env.example .env / composer install / sail up -d / sail artisan key:generate / sail artisan migrate
  - フロント: sail npm install / sail npm run dev
  - キュー: sail artisan queue:work（またはhorizonは非スコープ）


最後に:
- 作成したファイル一覧
- 起動手順
- 確認観点チェックリスト
を出力する。
