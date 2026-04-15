# YAML ↔ JSON

YAML と JSON を相互変換するブラウザツール。独自 YAML パーサ実装、双方向ライブ変換、エラー表示。ゼロ依存 / ビルドステップ不要。

**Live Demo**: https://sen.ltd/portfolio/yaml-json/

## Features

- 双方向ライブ変換（YAML → JSON / JSON → YAML）
- 独自 YAML サブセットパーサ（`key: value`、リスト、ネスト、クォート文字列、数値、真偽値、null、ブロックスカラー `|`/`>`、コメント）
- エラー表示（行番号付き）
- 整形ボタン（YAML / JSON どちらも整形）
- サンプル（基本設定 / Kubernetes / GitHub Actions / ネスト構造）
- ダーク / ライトテーマ切替
- 日本語 / 英語 UI 切替
- ゼロ依存・ビルド不要（バニラ JS + ES Modules）

## Usage

```bash
# ローカルで起動
npm run serve
# http://localhost:8080 を開く
```

## Tests

```bash
npm test
```

## Supported YAML Subset

| Feature | Support |
|---|---|
| Scalars (string, number, boolean, null) | ✅ |
| Quoted strings (single and double) | ✅ |
| Maps (`key: value`) | ✅ |
| Sequences (`- item`) | ✅ |
| Nested maps and sequences | ✅ |
| Block scalars (`|` literal, `>` folded) | ✅ |
| Comments (`#`) | ✅ |
| Document markers (`---`) | ✅ |
| Multiple documents | ❌ |
| Anchors and aliases | ❌ |
| Tags | ❌ |

## License

MIT © 2026 SEN LLC (SEN 合同会社)

<!-- sen-publish:links -->
## Links

- 🌐 Demo: https://sen.ltd/portfolio/yaml-json/
- 📝 dev.to: https://dev.to/sendotltd/a-yaml-json-converter-with-a-handwritten-yaml-subset-parser-3da2
<!-- /sen-publish:links -->
