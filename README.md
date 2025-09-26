# konvo

## 概要

画像の畳み込み計算を視覚化する簡単なプロジェクトです。dockerが導入されていれば１コマンドで実行できます。

## ディレクトリ構成
```
konvo/
  docker-compose.yaml
  frontend/
    index.html
    style.css
    app.js
    worker.js
    nginx.conf            # / と /api を振り分けるNginx設定
    assets/
  api/
    Dockerfile
    requirements.txt
    main.py               # FastAPIの最小実装
  .dockerignore
  README.md
```
