# LensClip UX フロー

## 画面遷移図

```mermaid
flowchart TD
    subgraph Auth
        Welcome[Welcome] --> Login[Login]
        Welcome --> Register[Register]
    end

    Login --> Home
    Register --> Home

    subgraph Main["メイン画面（認証後）"]
        Home[Home<br/>📸 撮る CTA]
        Library[Library<br/>📚 ライブラリ]
    end

    subgraph Admin["管理画面（adminのみ）"]
        AdminLogs[Admin Logs]
        AdminAi[AI Settings]
    end

    Home -->|カメラ/アップロード| UploadPending[UploadPending<br/>プレビュー + アップロード]
    UploadPending -->|送信完了| ObservationShowProcessing[Observation Show<br/>🔍 しらべています...]
    ObservationShowProcessing -->|成功| Result[Observation Show<br/>結果表示]
    ObservationShowProcessing -->|失敗| Failed[Observation Show<br/>❌ エラー]
    ObservationShowProcessing -->|timeout| Timeout[Observation Show<br/>状態を確認]
    Timeout -->|状態を確認| ObservationShowProcessing
    Timeout -->|戻る| Library
    Failed -->|リトライ| ObservationShowProcessing
    Failed -->|戻る| Home

    Result -->|戻る| Home
    Result --> Library

    Library -->|写真タップ| Detail[Detail<br/>詳細表示]
    Detail --> Library

    Home -->|admin user: 管理| AdminLogs
    AdminLogs --> AdminAi
    AdminAi --> AdminLogs
```

## 状態管理

### Observation ステータス
| 状態 | 意味 | UI表現 |
|------|------|--------|
| `processing` | AI分析中 | `/observations/{id}` で待機UI |
| `ready` | 分析完了 | `/observations/{id}` で結果表示 |
| `failed` | 分析失敗 | `/observations/{id}` でエラーメッセージ + リトライボタン |

### SSE（Server-Sent Events）
- `processing` 中は `/observations/{id}/stream` への SSE 接続でステータス監視
- サーバー側は処理中に heartbeat を送信
- `ready` / `failed` イベントでは同じ URL のままサーバ状態を再取得する
- `timeout` は DB 状態を変更しないため、画面側で再確認または戻る導線を出す
- Library で待つ場合は SSE を閉じ、表示中の `processing` カードだけを軽量ステータス API で定期確認する

## 画面詳細

### Home
- **大きな「撮る」CTAボタン**（画面中央または下部固定）
- 今日の撮影数（シンプル表示）
- 最近の発見（3枚程度のプレビュー）

### UploadPending
- カメラまたはファイル選択後のプレビュー表示
- 位置情報が取得できた場合はアップロード時に緯度・経度を送信
- アップロード中の進捗表示
- 送信後は `/observations/{id}` へ遷移し、`processing` UI を表示

### Observation Show: Processing
- `/observations/{id}` 内の状態表示
- アニメーションスピナー（🔍 or カスタム）
- 「しらべています...」テキスト
- timeout 時はリトライではなく、状態確認またはライブラリへ戻る導線を表示

### Observation Show: Result
- **切り抜き画像**（croppedがあれば）
- **タイトル**（大きく表示）
- **カテゴリバッジ**（色付きpill表示、タップで編集モード）
  - 編集モード: 全カテゴリを色付きボタンで並べ、タップで即変更
  - AIが自動分類した結果を親が手動修正可能
  - カテゴリ定義は `config/categories.php` 参照
- **候補カード**（これかも？: 複数候補をタップ切替）
- **発見場所**（緯度・経度がある場合）
- **子供向け説明**（kid_friendly）
- **見分けポイント**（look_for）
- **豆知識**（fun_facts）
- **安全注意**（safety_notes、あれば目立たせる）
- **タグ**

### Observation Show: Failed
- エラーアイコン + メッセージ
- 「もういちどしらべる」ボタン
- 「もどる」ボタン

### Admin: AI Settings
- Gemini の許可モデル一覧を編集
- 各モデルの疎通確認
- 保存後の AI 分析で使うモデルを選択
- 設定が未設定または不正でも、管理者が修復できる画面として表示

### Library
- **表示モード切替**: 日付 / カテゴリ / マップ
- 写真グリッド（2~4列）
- 検索バー
- タグフィルタ（横スクロール chips）
- 表示中の `processing` カードがある場合だけ、カード単位の軽量ステータス確認を行い、`ready` / `failed` へ切り替える

**カテゴリビュー** (`?view=category`)
- カテゴリカードをグリッド表示（色付き、サムネプレビュー付き）
- カテゴリタップで絞り込み表示
- カテゴリ定義は `config/categories.php` 参照

## ナビゲーション
モバイル下部固定ナビ:
- 🏠 Home
- 📚 Library
