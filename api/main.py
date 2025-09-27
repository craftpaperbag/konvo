from fastapi import FastAPI

app = FastAPI(title="konvo API")


@app.get("/health")
def health_check() -> dict[str, str]:
    """ヘルスチェック用のエンドポイント。"""
    return {"status": "ok"}


@app.get("/api/ping")
def ping() -> dict[str, str]:
    """接続確認用のエンドポイント。"""
    return {"message": "pong"}
