# LensClip API 仕様書

## エンドポイント一覧

### 認証（Breeze 標準）
| Method | Path | 説明 |
|--------|------|------|
| GET | `/login` | ログイン画面 |
| POST | `/login` | ログイン処理 |
| GET | `/register` | 登録画面 |
| POST | `/register` | 登録処理 |
| POST | `/logout` | ログアウト |

### Observations
| Method | Path | 説明 |
|--------|------|------|
| GET | `/library` | 一覧（検索/フィルタ対応） |
| POST | `/observations` | 新規作成（画像アップロード） |
| GET | `/observations/{id}` | 詳細取得 |
| POST | `/observations/{id}/retry` | 失敗時リトライ |
| DELETE | `/observations/{id}` | 単体削除 |
| DELETE | `/observations` | 全削除（確認必須） |

### Tags
| Method | Path | 説明 |
|--------|------|------|
| GET | `/tags` | ユーザーのタグ一覧 |
| POST | `/tags` | タグ作成 |
| DELETE | `/tags/{id}` | タグ削除 |

### Admin（管理者専用）
| Method | Path | 説明 |
|--------|------|------|
| GET | `/admin/logs` | アプリケーションログ閲覧 |
| GET | `/admin/settings/ai` | AI設定ページ |
| PUT | `/admin/settings/ai` | Geminiモデル変更 |

---

## 詳細仕様

### POST /observations
**リクエスト**
```
Content-Type: multipart/form-data
- image: File (required, max 10MB, image/*)
```

**レスポンス（201 Created）**
```json
{
  "id": "uuid",
  "status": "processing",
  "thumb_url": "/storage/observations/xxx_thumb.webp"
}
```

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
  "original_url": "/storage/observations/xxx.webp",
  "cropped_url": "/storage/observations/xxx_cropped.webp",
  "thumb_url": "/storage/observations/xxx_thumb.webp",
  "created_at": "2026-01-16T10:00:00Z"
}
```

**status: processing 時**
```json
{
  "id": "uuid",
  "status": "processing",
  "thumb_url": "/storage/observations/xxx_thumb.webp"
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

### GET /library
**クエリパラメータ**
| Param | Type | 説明 |
|-------|------|------|
| q | string | タイトル検索 |
| tag | string | タグ名フィルタ |
| page | int | ページ番号 |
| per_page | int | 1ページあたり件数（default: 20, max: 50） |

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
- 画像アップロード: 10回/分
- その他API: 60回/分
