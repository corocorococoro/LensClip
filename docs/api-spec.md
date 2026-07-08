# LensClip API 仕様書

このドキュメントは、画面や外部呼び出しから見える主要な HTTP 境界をまとめる。詳細なバリデーション値、カテゴリ定義、レート制限値、ページサイズなどの定数は、FormRequest / config / ServiceProvider の実装を一次ソースにする。

## 主要エンドポイント

### 認証（Breeze 標準）
| Method | Path | 説明 |
|--------|------|------|
| GET | `/login` | ログイン画面 |
| POST | `/login` | ログイン処理 |
| GET | `/register` | 登録画面 |
| POST | `/register` | 登録処理 |
| POST | `/logout` | ログアウト |
| GET | `/auth/google/redirect` | Google OAuth 開始 |
| GET | `/auth/google/callback` | Google OAuth コールバック |
| GET/POST | `/auth/google/link` | 既存アカウントとの Google 連携 |

### Observations
| Method | Path | 説明 |
|--------|------|------|
| GET | `/library` | 一覧（検索/フィルタ対応） |
| POST | `/observations` | 新規作成（画像アップロード） |
| GET | `/observations/upload-pending` | クライアント保持中画像のアップロード待ち画面 |
| GET | `/observations/{id}/thumb` | Job 完了前のローカルサムネイル配信 |
| GET | `/observations/{id}` | 詳細取得 |
| GET | `/observations/{id}/processing` | 処理中画面 |
| POST | `/observations/{id}/retry` | 失敗時リトライ |
| PATCH | `/observations/{id}/tags` | タグ更新 |
| PATCH | `/observations/{id}/category` | カテゴリ更新 |
| DELETE | `/observations/{id}` | 単体削除 |
| DELETE | `/observations` | 全削除（確認必須） |

### SSE
| Method | Path | 説明 |
|--------|------|------|
| GET | `/observations/{id}/stream` | ステータス変更のServer-Sent Events |

### Tags
| Method | Path | 説明 |
|--------|------|------|
| GET | `/tags` | ユーザーのタグ一覧 |
| POST | `/tags` | タグ作成 |
| DELETE | `/tags/{id}` | タグ削除 |

### TTS
| Method | Path | 説明 |
|--------|------|------|
| POST | `/tts` | テキストから音声合成 |
| GET | `/tts/audio/{key}` | 音声ファイルのストリーム配信 |

### Admin（管理者専用）
| Method | Path | 説明 |
|--------|------|------|
| GET | `/admin/logs` | アプリケーションログ閲覧 |
| GET | `/admin/settings/ai` | AI設定ページ |
| PUT | `/admin/settings/ai` | Geminiモデル変更 |

### 法的ページ（未認証アクセス可）
| Method | Path | 説明 |
|--------|------|------|
| GET | `/terms` | 利用規約 |
| GET | `/privacy-policy` | プライバシーポリシー |

---

## 詳細仕様

### POST /observations
**リクエスト**
```
Content-Type: multipart/form-data
- image: File (required, supported image type)
- latitude: float (optional, decimal degrees)
- longitude: float (optional, decimal degrees)

```

**レスポンス（201 Created）**
```json
{
  "id": "uuid",
  "status": "processing",
  "thumb_url": "..."
}
```

通常の Inertia 遷移では、作成後に処理中画面へ redirect する。

### GET /observations/{id}
**レスポンス（200 OK）**
```json
{
  "id": "uuid",
  "status": "ready",
  "title": "チューリップ",
  "summary": "春に咲く花です",
  "kid_friendly": "あかくてきれいなおはなだね！",
  "confidence": 0.95,
  "category": "plant",
  "tags": ["花", "植物", "春"],
  "fun_facts": ["チューリップはオランダが有名だよ"],
  "safety_notes": [],
  "original_url": "...",
  "cropped_url": "...",
  "thumb_url": "...",
  "created_at": "2026-01-16T10:00:00Z"
}
```

**status: processing 時**
```json
{
  "id": "uuid",
  "status": "processing",
  "thumb_url": "..."
}
```

**status: failed 時**
```json
{
  "id": "uuid",
  "status": "failed",
  "error_message": "AI分析に失敗しました"
}
```

### PATCH /observations/{id}/category
カテゴリを手動で変更する（AIの判定ミスを親が修正可能）

**リクエスト**
```json
{
  "category": "plant"
}
```

**バリデーション**
- `category`: required。許可値は `config/categories.php` の `id` に従う

**レスポンス（200 OK）**
```json
{
  "category": "plant"
}
```

**認可**: 所有者のみ（ObservationPolicy `update`）

### GET /library
**クエリパラメータ**
| Param | Type | 説明 |
|-------|------|------|
| q | string | タイトル検索 |
| tag | string | タグ名フィルタ |
| view | string | 表示モード: `date`(default), `category`, `map` |
| category | string | カテゴリフィルタ（view=category 時に使用） |
| cursor | string | date/category 詳細ビューの続き取得カーソル |

**view=category 時の追加レスポンス**
- `categories`: カテゴリ定義一覧（`config/categories.php` から生成）
- `categoryCounts`: カテゴリ別の observation 件数

### POST /observations/{id}/retry
失敗したObservationの再分析をキューに投入

**レスポンス（202 Accepted）**
```json
{
  "id": "uuid",
  "status": "processing"
}
```

### DELETE /observations
全削除（確認パラメータ必須）

**リクエスト**
```json
{
  "confirm": true
}
```

---

## レート制限
- `observation-upload`、`observation-retry`、`api-general` の named throttle を使う
- 具体的な制限値は `AppServiceProvider` の RateLimiter 定義を一次ソースにする

---

## 詳細仕様: TTS

### POST /tts
**リクエスト**
```json
{
  "text": "読み上げテキスト",
  "speakingRate": 0.9
}
```

**バリデーション**
- `text`: required string
- `speakingRate`: optional numeric

**レスポンス（200 OK）**
```json
{
  "url": "/tts/audio/{key}",
  "cacheHit": false
}
```

キャッシュ戦略は `TtsService` と `config/services.php` に従う。

### GET /tts/audio/{key}
音声ファイルを`audio/mpeg`でストリーム配信。

---

## 詳細仕様: SSE

### GET /observations/{id}/stream
処理中のObservationのステータス変化をServer-Sent Eventsで通知。

**レスポンスヘッダ**: `Content-Type: text/event-stream`

**イベント**
| event | data | 説明 |
|-------|------|------|
| `ready` | `{}` | 分析完了 |
| `failed` | `{"error_message": "..."}` | 分析失敗 |
| `timeout` | `{}` | 接続タイムアウト |
| `: heartbeat` | - | キープアライブ |

---

*Last updated: 2026-07-08*
