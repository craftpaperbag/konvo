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

## 使用技術と特徴的な設定
- **Docker Compose**
  - `frontend` サービスは `nginx:alpine` イメージで動作。
  - ホスト `3000` をコンテナ `8080` に割り当て。
  - 静的ファイルと Nginx 設定をローカルからマウントし即時反映。
  - `api` サービスは `uvicorn --reload` でホットリロード対応。
  - 2 サービスは `konvo-net` ネットワークで接続。
- **Nginx フロントエンド**
  - 静的ファイルは `/usr/share/nginx/html` から配信。
  - `/api/` へのリクエストは `api:8000` にプロキシ。
  - `try_files` で SPA の直接アクセスにも `index.html` を返却。
- **FastAPI + Uvicorn**
  - Python 3.12 slim をベースに最小構成のイメージを作成。
  - `fastapi` と `uvicorn[standard]` をインストール。
  - `/health` と `/api/ping` の疎通確認エンドポイントを提供。
- **フロントエンド (Vanilla JS)**
  - Web Worker (`worker.js`) で畳み込み処理を並列化。
  - メインスレッドの UI 応答性を確保。
  - カーネルプリセット・正規化・一時停止に対応。
