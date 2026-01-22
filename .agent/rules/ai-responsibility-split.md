# AI Responsibility Split

> **責務分離の不変原則のみ記載**。  
> 処理フローの詳細は `docs/AI_PIPELINE.md`、モデル一覧は `docs/ai-models.md` を参照。

## 責務分離

| サービス | 責務 | 入力 | 出力 |
|---------|------|------|------|
| **Vision API** | 主対象の位置推定（前処理） | 元画像 | bbox 座標 or なし |
| **Gemini API** | 同定 + 説明生成 | crop 画像（または元画像） | 構造化 JSON |

## 不変原則

1. **Vision は切り抜き座標のみ**
   - Object Localization で bbox を取得
   - テキスト認識・分類はしない

2. **Gemini は同定＋説明**
   - 入力画像から「何か」を特定
   - 子供向け説明を JSON 形式で返す

3. **フォールバック戦略**
   - bbox 取得失敗 → 元画像でフォールバック
   - Gemini 失敗 → `status=failed` で保存、リトライ可能

## モデル選択

- 使用可能なモデルは `docs/ai-models.md` を参照
- **Rules にモデル名一覧を書かない**（参照のみ）
- allowlist 外モデルの拒否は `rules/security-invariants.md` と整合

## 画像保存

保存する画像は 3 種類：

| 種類 | 用途 |
|------|------|
| Original | 圧縮済み元画像 |
| Cropped | bbox で切り抜いた画像（なければ null） |
| Thumbnail | 一覧表示用サムネイル |

## ステータス定義

| status | 意味 |
|--------|------|
| `processing` | AI 分析中 |
| `ready` | 分析完了 |
| `failed` | 分析失敗（リトライ可能） |

---

*Last updated: 2026-01-22*
