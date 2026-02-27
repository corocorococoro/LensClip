# LensClip — AI エージェント向けオリエンテーション

> **このファイルはあなた（AIエージェント）のためのものです。**
> セッションをまたいで記憶がリセットされるため、作業開始時にこのファイルを読んでプロジェクト全体像を把握してください。

---

## このアプリは何か

子どもの「これなぁに？」に答える親子向けデジタル図鑑 Web アプリ。

- 写真をアップロード → Vision API で主対象を検出 → Gemini API が子ども向け説明を生成
- 分析結果はライブラリに蓄積され、タグ・カテゴリ・地図で振り返れる
- ターゲット: 3〜6歳の子どもを持つ親

**スタック**: Laravel 12 + Inertia.js + React/TypeScript + MySQL + Redis + GCS
**デプロイ**: Railway（Docker）

---

## タスク別：どこを読むか

| やりたいこと | 読む場所 |
|-------------|---------|
| 機能一覧・ユースケースを知りたい | [prd.md](prd.md) |
| DBテーブル・カラムを確認したい | [db-schema.md](db-schema.md) |
| AI処理の流れを知りたい | [ai-pipeline.md](ai-pipeline.md) |
| Geminiの許可モデルを確認したい | [ai-models.md](ai-models.md) ← **唯一の一次ソース** |
| ローカル環境を立ち上げたい | [setup.md](setup.md) |
| Railway にデプロイしたい | [deployment.md](deployment.md) |

---

## 絶対に守るルール（作業前に確認）

### 禁止事項（security-invariants.md より）
- `/admin/*` は admin ロール以外 **403**（UI で隠すだけでは不可、サーバ側で強制）
- 他ユーザーの Observation / Tag へのアクセス禁止（所有権チェック必須）
- APIキー（Gemini, Vision）はサーバ側のみ。フロントから直接呼ばない
- allowlist 外 Gemini モデルはサーバ側で拒否する
- アップロード: MIME + ファイルヘッダ（マジックバイト）両方で検証
- GPS（緯度・経度）以外の EXIF は削除する

### 実装規約（engineering-standards.md より）
- Controller は薄く。ロジックは UseCase / Service / Action へ
- バリデーションは FormRequest（Controller 内 `validate()` 禁止）
- Job は冪等（同じ Job を複数回実行しても壊れない）
- 状態遷移: `processing` → `ready` / `failed`（想定内の失敗は 500 にしない）
- `env()` は config 経由のみ（Laravel規約）
- **コード変更前に必ず対象ファイルを Read してから Edit する**

### 変更完了の条件（project-governance.md より）
1. 関連 docs の更新
2. コード実装
3. `./vendor/bin/sail artisan test` を通す
4. `./vendor/bin/sail npm run build` を通す
5. **Consistency Audit**（矛盾・重複・漏れを確認して報告）

---

## AI パイプラインの概要

```
アップロード
  → Observation 作成 (status=processing)
  → AnalyzeObservationJob をキューに投入
    → Vision API: bbox 取得
    → 切り抜き（bbox あり）or 元画像（なし）で Gemini へ
    → Observation 更新 (status=ready or failed)
```

- 失敗時: `status=failed` で保存、ユーザーがワンタップでリトライ可能
- Gemini モデルは `settings` テーブルの `gemini_model` キーで管理
- 許可モデル一覧は [ai-models.md](ai-models.md) を参照

---

## 重要な設計ポイント

| 項目 | 詳細 |
|------|------|
| Observation ID | UUID（推測困難） |
| カテゴリマスター | `config/categories.php` が唯一の一次ソース |
| 画像保存 | original / thumb / cropped の 3 種類 |
| キュー | Redis（`QUEUE_CONNECTION=redis`） |
| 認証 | Laravel Breeze（メール + Google OAuth） |
| 開発環境 | Laravel Sail 必須（`./vendor/bin/sail ...`） |

---

*このファイルは AI エージェント向けです。仕様の一次ソースは各 docs ファイルにあります。*
*Last updated: 2026-02-27*
