# LensClip 📷

親子向け「これなぁに？」スクラップWebアプリ

写真を撮るとAIが「これはなぁに？」の答えを返し、親子で一緒に学べる図鑑体験を提供します。

## 技術スタック

- **Backend**: Laravel 12 + MySQL
- **Frontend**: Inertia.js + React + TypeScript + Tailwind CSS
- **AI**: Google Cloud Vision API（Object Localization）+ Gemini API
- **Environment**: Docker (Laravel Sail)

## セットアップ

### 1. リポジトリをクローン

```bash
git clone <repository-url>
cd LensClip
```

### 2. 環境変数を設定

```bash
cp .env.example .env
```

`.env` ファイルを編集して、以下のAPIキーを設定してください：

```env
# Google Cloud Vision API
VISION_API_KEY=your-vision-api-key

# Google Gemini API
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.0-flash
```

### 3. Docker環境を起動

```bash
./vendor/bin/sail up -d
```

### 4. 依存関係をインストール

```bash
./vendor/bin/sail composer install
./vendor/bin/sail npm install
```

### 5. アプリケーションキー生成

```bash
./vendor/bin/sail artisan key:generate
```

### 6. データベースマイグレーション

```bash
./vendor/bin/sail artisan migrate
```

### 7. ストレージリンク作成

```bash
./vendor/bin/sail artisan storage:link
```

### 8. フロントエンドビルド

開発モード:
```bash
./vendor/bin/sail npm run dev
```

本番ビルド:
```bash
./vendor/bin/sail npm run build
```

## 動作確認

1. http://localhost にアクセス
2. ユーザー登録 → ログイン
3. 「撮る」ボタンをタップ → 画像をアップロード
4. AI分析待ち → 結果表示
5. ライブラリで一覧確認
6. コレクション作成 → 整理

## 主要機能

- 📷 **撮影・アップロード**: カメラまたはファイル選択
- 🔍 **AI分析**: Vision APIで主対象をCrop → Gemini APIで同定・説明
- 📚 **ライブラリ**: グリッド表示、検索、タグフィルタ
- 📁 **コレクション**: 発見を整理
- 🏷️ **タグ**: AI自動付与＋手動追加

## テスト実行

```bash
./vendor/bin/sail artisan test
```

## 既知の制約

- iOSでのカメラ起動は環境依存（HTTPS必須等）
- API キーなしでは AI 分析はモックデータになります
- 画像サイズ上限: 10MB

## ディレクトリ構成

```
app/
├── Http/Controllers/     # ObservationController, CollectionController等
├── Jobs/                 # AnalyzeObservationJob（非同期AI処理）
├── Models/               # Observation, Tag, Collection
├── Policies/             # ObservationPolicy, CollectionPolicy
└── Services/             # ImageAnalysisService（Vision + Gemini）

resources/js/
├── Layouts/              # AppLayout（下部ナビ付き）
└── Pages/
    ├── Home.tsx          # ホーム（撮るCTA）
    ├── Library.tsx       # ライブラリ
    ├── Observations/     # Processing, Show
    └── Collections/      # Index, Show

docs/
├── PRD.md               # 製品要件定義
├── UX_FLOW.md           # 画面遷移
├── API_SPEC.md          # API仕様
├── DB_SCHEMA.md         # DBスキーマ
├── AI_PIPELINE.md       # AIパイプライン
├── TASKS.md             # タスク一覧
└── TEST_PLAN.md         # テスト計画
```

## ライセンス

MIT
