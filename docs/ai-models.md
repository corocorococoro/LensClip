# AI モデル許可リスト

> **これが Gemini モデルの唯一の一次ソースです。**  
> Rules やコードからはこのファイルを参照してください。  
> Rules にモデル名一覧を複製することは禁止です。

## 許可リスト (Allowlist)

| モデル名 | 用途 | 備考 |
|---------|------|------|
| `gemini-2.5-flash-lite` | **デフォルト** | 高速・低コスト |
| `gemini-2.5-flash` | 標準 | バランス型 |
| `gemini-2.5-pro` | 高精度 | コスト高、必要時のみ |

## デフォルトモデル

```
gemini-2.5-flash-lite
```

## 更新手順

1. **決定ログ作成**: `docs/decisions/` に ADR を追加
2. **このファイル更新**: Allowlist に追加/削除
3. **実装追従**: `config/services.php` の `gemini.allowed_models` を更新
4. **Consistency Audit**: 矛盾・重複がないか監査
5. **テスト実行**: allowlist 外モデル拒否テストを含む

## 廃止ポリシー

- 廃止予定モデルは「備考」欄に廃止時期を明記
- 廃止日の 2 週間前までに Allowlist から削除
- 削除前にデフォルトが廃止モデルでないことを確認

## 注意事項

- **Rules に Allowlist を複製しない**（参照のみ）
- **allowlist 外モデルはサーバ側で必ず拒否**（Security invariants 参照）

---

*Last updated: 2026-01-22*
