# remap

位置情報メモアプリ **りまっぷ**（リマインダー × マップ）の紹介サイト。

- 公開先: https://ebiebimanman.github.io/remap/
- App Store: https://t.co/16Txm1J7cD

## 構成

```
website/                 公開されるファイル一式（ビルド不要の静的サイト）
  index.html             TOP / アップデート予定 / バグ報告 の3画面
  styles.css
  app.js                 ハッシュルーティング・メニュー・バグ報告フォーム
  assets/                Figma から書き出したアイコンとイラスト
docs/bug-report-form/    バグ報告フォームの受信側（Google Apps Script）
.github/workflows/       website/ を GitHub Pages に配信する
```

## ローカルで確認する

```sh
cd website && python3 -m http.server 8765
# http://localhost:8765/
```

## デプロイ

`main` の `website/` を変更して push すると、GitHub Actions が自動で反映する。
Pages の Source は **GitHub Actions**。

## バグ報告フォーム

ページ内から Google Apps Script のウェブアプリに POST し、
スクリプト所有者宛にメールが飛ぶ。設定手順は
[docs/bug-report-form/README.md](docs/bug-report-form/README.md) を参照。
