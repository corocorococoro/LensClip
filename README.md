# LensClip 📷

**散歩が、冒険になる。**

「これなぁに？」——公園の虫、散歩中の草花、空を飛ぶ鳥。
写真を1枚撮るだけで、子どもにわかる言葉で答えが届く。親子で使う、デジタル図鑑アプリ。

発見は日付・カテゴリ・地図で蓄積されていき、使うたびに**世界にひとつの図鑑**が育つ。

**Demo**: https://lensclip.up.railway.app/

---

## 機能

| 機能 | 概要 |
|------|------|
| 📷 撮影・アップロード | カメラ or ファイル選択、位置情報取得、WebP 圧縮・EXIF 除去 |
| 🔍 AI 同定 | Vision API で主対象を検出 → bbox 合成スコアで選定 → Gemini で同定・説明生成（最大3候補） |
| 🔊 英名読み上げ | Cloud TTS API で同定結果の英名を発音（英単語学習、MD5 キャッシュ, 7日 TTL） |
| 📚 ライブラリ | グリッド表示、全文検索、タグフィルタ、カテゴリビュー、マップビュー |
| 🏷️ タグ・カテゴリ | AI 自動付与 + 手動追加・修正 |
| ⚡ リアルタイム通知 | SSE で分析完了を即時反映（ポーリング不要） |
| 🔐 認証 | Breeze (Email/Password) + Google OAuth (Socialite) |
| ⚙️ 管理画面 | ログ閲覧、Gemini モデル切替（allowlist 制御） |

---

## アーキテクチャ

![Laravel](https://img.shields.io/badge/Laravel-12-FF2D20?style=flat&logo=laravel&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript&logoColor=white)
![Google Cloud](https://img.shields.io/badge/Google_Cloud-4285F4?style=flat&logo=googlecloud&logoColor=white)
![Railway](https://img.shields.io/badge/Railway-0B0D0E?style=flat&logo=railway&logoColor=white)

| Layer | Stack |
|-------|-------|
| Backend | Laravel 12, PHP 8.5, MySQL |
| Frontend | Inertia.js v2, React 18, TypeScript, Tailwind CSS v3 |
| AI / ML | Google Cloud Vision API (Object Localization), Gemini API |
| TTS | Google Cloud Text-to-Speech API |
| Storage | GCS (prod) / local public (dev) |
| Queue | Redis (prod) / database (dev) |
| Auth | Laravel Breeze, Laravel Socialite |
| Infra | Docker (Laravel Sail), Railway |

### AI パイプライン

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant App as Web Server
    participant Q as Queue Worker
    participant Vision as Cloud Vision API
    participant Gemini as Gemini API
    participant GCS as Cloud Storage

    User->>App: 画像アップロード
    App->>GCS: original + thumb 保存
    App->>Q: Job をキュー投入
    App-->>User: { status: processing }

    Q->>Vision: Object Localization
    Vision-->>Q: bbox 座標（主対象の位置）
    Q->>GCS: crop 画像を保存
    Q->>Gemini: crop 画像 + プロンプト
    Gemini-->>Q: JSON（title / summary / kid_friendly ...）
    Q-->>Q: status = ready

    User->>App: SSE /observations/{id}/stream
    App-->>User: { status: ready, title: "テントウムシ", ... }
```

---

## 技術的ハイライト

**Vision API bbox 選定**: 複数検出オブジェクトから合成スコア `score×0.5 + areaRatio×0.3 + centerBonus×0.2` で最適な1件を選定し、10% マージン付きで crop。bbox なしの場合は原画像でフォールバック。

**Gemini 構造化 JSON 出力**: `response_mime_type: application/json` で厳格モード。最大3候補のカード情報（名前、英名、confidence、子供向け説明、見分けポイント、豆知識）を1リクエストで生成。カテゴリは `config/categories.php` から動的にプロンプト注入。

**SSE リアルタイム通知**: `text/event-stream` でステータス変化を push。2秒間隔の heartbeat、90秒タイムアウト。ポーリングからの移行で UX を改善。

**非同期 Queue 処理**: `AnalyzeObservationJob` で Vision → Crop → Gemini を冪等に実行。Redis キュー + 状態管理 (`processing` → `ready` / `failed`) + ユーザー操作リトライ。

**TTS キャッシュ**: テキスト + 音声 + 速度の MD5 ハッシュをキーに、Storage ディスク（GCS / local）にキャッシュ。TTL 7日で自動クリーンアップ。

**ストレージ抽象化**: `FILESYSTEM_DISK` 一つで GCS / local を切替。画像・TTS 音声・サムネイルすべて同一の Storage facade 経由。

---

## 開発ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [docs/prd.md](docs/prd.md) | プロダクト定義、ユースケース、UX原則 |
| [docs/ux-flow.md](docs/ux-flow.md) | 画面遷移図、UI 状態 |
| [docs/api-spec.md](docs/api-spec.md) | API エンドポイント仕様 |
| [docs/db-schema.md](docs/db-schema.md) | ER図、テーブル定義 |
| [docs/ai-pipeline.md](docs/ai-pipeline.md) | Vision / Gemini / TTS 処理フロー |
| [docs/ai-models.md](docs/ai-models.md) | Gemini モデル allowlist |
| [docs/engineering-standards.md](docs/engineering-standards.md) | アーキテクチャ原則、テスト、PRゲート |
| [docs/laravel-conventions.md](docs/laravel-conventions.md) | Laravel コード規約 |
| [docs/setup.md](docs/setup.md) | 開発環境構築手順 |
| [docs/deploy.md](docs/deploy.md) | Railway デプロイ手順 |

---

## ライセンス

MIT
