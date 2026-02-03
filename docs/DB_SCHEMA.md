# LensClip データベーススキーマ

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
| Column | Type | Constraints | 説明 |
|--------|------|-------------|------|
| id | uuid | PK | 推測困難なID |
| user_id | bigint | FK, INDEX | 所有者 |
| status | enum | NOT NULL | processing\|ready\|failed |
| original_path | varchar | NOT NULL | 元画像パス |
| cropped_path | varchar | nullable | 切り抜き画像パス |
| thumb_path | varchar | NOT NULL | サムネイルパス |
| crop_bbox | json | nullable | Visionが返したbbox |
| vision_objects | json | nullable | Vision全結果（将来用） |
| ai_json | json | nullable | Gemini全結果 |
| title | varchar | nullable | AI生成タイトル |
| summary | text | nullable | AI生成説明 |
| kid_friendly | text | nullable | 子供向け説明 |
| confidence | float | nullable | 確信度 0.0-1.0 |
| error_message | varchar | nullable | 失敗時メッセージ |
| created_at | timestamp | | 作成日時 |
| updated_at | timestamp | | 更新日時 |
| deleted_at | timestamp | nullable | 論理削除 |

**インデックス**
- `(user_id, created_at)` - ユーザー別時系列
- `(user_id, status)` - ステータスフィルタ

### tags
| Column | Type | Constraints | 説明 |
|--------|------|-------------|------|
| id | bigint | PK | |
| user_id | bigint | FK | 所有者 |
| name | varchar | NOT NULL | タグ名 |

**インデックス**
- `(user_id, name)` UNIQUE - ユーザー内一意

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