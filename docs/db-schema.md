# LensClip データベーススキーマ

このドキュメントは主要な保存対象と関係性を示す。列型、インデックス、制約の正確な定義は migration を一次ソースにする。

## ER図

```mermaid
erDiagram
    users ||--o{ observations : owns
    users ||--o{ tags : owns
    users ||--o{ auth_identities : has
    observations }o--o{ tags : has

    users {
        id bigint PK
        name varchar
        email varchar UK
        role varchar "user|admin"
        password varchar nullable
        created_at timestamp
        updated_at timestamp
    }

    auth_identities {
        id bigint PK
        user_id bigint FK
        provider varchar "google"
        issuer varchar "iss claim"
        subject varchar "sub claim"
        email_at_link varchar nullable
        created_at timestamp
        updated_at timestamp
    }

    observations {
        id uuid PK
        user_id bigint FK
        status enum "processing|ready|failed"
        original_path varchar
        cropped_path varchar nullable
        thumb_path varchar
        crop_bbox json nullable
        vision_objects json nullable
        ai_json json nullable
        title varchar nullable
        summary text nullable
        kid_friendly text nullable
        confidence float nullable
        category varchar "default: other"
        gemini_model varchar nullable
        latitude decimal nullable
        longitude decimal nullable
        error_message varchar nullable
        created_at timestamp
        updated_at timestamp
        deleted_at timestamp nullable
    }

    tags {
        id bigint PK
        user_id bigint FK
        name varchar
        created_at timestamp
        updated_at timestamp
    }

    observation_tag {
        observation_id uuid FK
        tag_id bigint FK
    }

    settings {
        id bigint PK
        key varchar UK
        value text nullable
        created_at timestamp
        updated_at timestamp
    }
```

## テーブル詳細

### observations
主な保存対象:
- 所有者、処理状態、画像パス（original / cropped / thumb）
- Vision の bbox / object 結果、Gemini の構造化結果
- 表示用の title / summary / kid_friendly / confidence
- 手動修正可能な category
- 分析に使用した Gemini モデル名
- 位置情報として緯度・経度のみ
- 失敗時の利用者向けメッセージ

カテゴリ値は `config/categories.php` を一次ソースにする。

### tags
ユーザーに紐づくタグ。AI 分析結果から作成され、手動更新でも使われる。制約と重複扱いは migration と `UpdateObservationTagsAction` / `AnalyzeObservationJob` を一次ソースにする。

### observation_tag
| Column | Type | Constraints |
|--------|------|-------------|
| observation_id | uuid | FK |
| tag_id | bigint | FK |

**インデックス**
- `(observation_id, tag_id)` PRIMARY

### settings
| Column | Type | Constraints | 説明 |
|--------|------|-------------|------|
| id | bigint | PK | |
| key | varchar | UNIQUE | 設定キー |
| value | text | nullable | 設定値 |

**用途**
- `gemini_model`: 使用するGeminiモデル名
- `gemini_allowed_models`: 管理画面で保存するGemini許可モデル一覧（JSON object: model => description）

---

*Last updated: 2026-07-09*
