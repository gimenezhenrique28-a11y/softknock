import sys
import os
import traceback

_import_error: str | None = None

try:
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "apps", "api"))
    from main import app  # noqa: F401  — Vercel picks up `app` as the ASGI handler
except Exception:
    _import_error = traceback.format_exc()
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse

    app = FastAPI()

    @app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
    async def _error(path: str = ""):
        return JSONResponse({"error": "import_failed", "detail": _import_error}, status_code=500)
