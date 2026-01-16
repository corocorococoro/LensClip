---
trigger: always_on
---

# AI Split Rules (Vision=Crop / Gemini=Identify)

- Cloud Vision APIの目的は「主対象の領域推定（bbox）」のみ
  - Object Localizationでbboxを取得し、サーバ側でcropする
  - bboxが取れない場合は元画像でフォールバック
- Geminiの目的は「crop画像を入力に同定＋親子向け説明をJSONで返す」こと
- 画像は original / cropped / thumb を保存（圧縮のみ）
- ステータス: processing | ready | failed
