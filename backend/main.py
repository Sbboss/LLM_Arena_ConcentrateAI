import io
import json
import os
import pathlib
import time
from typing import Optional

import httpx
import pdfplumber
from docx import Document as DocxDocument
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

load_dotenv()

CONCENTRATE_API_KEY = os.getenv("CONCENTRATE_API_KEY", "")
CONCENTRATE_BASE_URL = "https://api.concentrate.ai/v1"

app = FastAPI(title="LLM Arena Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Model list cache ──────────────────────────────────────────────────────────

_models_cache: dict = {"data": None, "fetched_at": 0.0}
CACHE_TTL_SECONDS = 300


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {CONCENTRATE_API_KEY}",
        "Content-Type": "application/json",
    }


@app.get("/api/models")
async def list_models():
    """Return available models, cached for 5 minutes."""
    now = time.time()
    if _models_cache["data"] and now - _models_cache["fetched_at"] < CACHE_TTL_SECONDS:
        return _models_cache["data"]

    if not CONCENTRATE_API_KEY:
        raise HTTPException(status_code=500, detail="CONCENTRATE_API_KEY not set")

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(f"{CONCENTRATE_BASE_URL}/models", headers=_headers())

    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    raw = resp.json()
    models_list = raw.get("data", raw) if isinstance(raw, dict) else raw

    simplified = []
    for m in models_list:
        slug = m.get("slug", "")
        display_name = m.get("name", slug)
        author = m.get("author", {}).get("slug", "unknown")
        providers = m.get("providers", {})

        if providers:
            for provider_slug in providers:
                model_id = f"{provider_slug}/{slug}"
                simplified.append({"id": model_id, "name": display_name, "provider": provider_slug})
        else:
            simplified.append({"id": slug, "name": display_name, "provider": author})

    simplified.sort(key=lambda x: (x["provider"], x["name"]))
    _models_cache["data"] = simplified
    _models_cache["fetched_at"] = now
    return simplified


# ── File upload ───────────────────────────────────────────────────────────────

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt", ".md"}


def _extract_text_pdf(data: bytes) -> str:
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        pages = []
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                pages.append(text)
        return "\n\n".join(pages)


def _extract_text_docx(data: bytes) -> str:
    doc = DocxDocument(io.BytesIO(data))
    return "\n\n".join(p.text for p in doc.paragraphs if p.text.strip())


def _extract_text_plain(data: bytes) -> str:
    return data.decode("utf-8", errors="replace")


@app.post("/api/upload")
async def upload_file(file: UploadFile):
    """Extract text from an uploaded PDF, DOCX, or TXT file."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 10 MB limit")

    try:
        if ext == ".pdf":
            text = _extract_text_pdf(data)
        elif ext in (".docx", ".doc"):
            text = _extract_text_docx(data)
        else:
            text = _extract_text_plain(data)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to extract text: {e}")

    if not text.strip():
        raise HTTPException(status_code=422, detail="No readable text found in file")

    char_count = len(text)
    word_count = len(text.split())

    return {
        "filename": file.filename,
        "text": text,
        "char_count": char_count,
        "word_count": word_count,
    }


# ── Streaming proxy ───────────────────────────────────────────────────────────


class StreamRequest(BaseModel):
    model: str
    prompt: str
    document_text: Optional[str] = None
    temperature: Optional[float] = Field(None, ge=0, le=2)
    max_output_tokens: Optional[int] = Field(None, ge=1, le=16384)
    top_p: Optional[float] = Field(None, ge=0, le=1)


@app.post("/api/stream")
async def stream_response(req: StreamRequest):
    """SSE proxy: streams a Concentrate AI response back to the browser."""
    if not CONCENTRATE_API_KEY:
        raise HTTPException(status_code=500, detail="CONCENTRATE_API_KEY not set")

    if req.document_text:
        full_input = (
            f"The user has provided the following document for context:\n\n"
            f"---\n{req.document_text}\n---\n\n"
            f"User's question/instruction: {req.prompt}"
        )
    else:
        full_input = req.prompt

    body: dict = {
        "model": req.model,
        "input": full_input,
        "stream": True,
    }
    if req.temperature is not None:
        body["temperature"] = req.temperature
    if req.max_output_tokens is not None:
        body["max_output_tokens"] = req.max_output_tokens
    if req.top_p is not None:
        body["top_p"] = req.top_p

    async def event_generator():
        start_time = time.time()
        first_token_time: float | None = None

        async with httpx.AsyncClient(timeout=httpx.Timeout(connect=10, read=120, write=10, pool=10)) as client:
            async with client.stream(
                "POST",
                f"{CONCENTRATE_BASE_URL}/responses",
                headers=_headers(),
                json=body,
            ) as resp:
                if resp.status_code != 200:
                    error_body = await resp.aread()
                    yield f"event: error\ndata: {json.dumps({'error': error_body.decode()})}\n\n"
                    return

                async for raw_line in resp.aiter_lines():
                    if not raw_line.strip():
                        continue

                    if raw_line.startswith("event: "):
                        yield raw_line + "\n"
                        continue

                    if raw_line.startswith("data: "):
                        data_str = raw_line[6:]
                        try:
                            event = json.loads(data_str)
                        except json.JSONDecodeError:
                            yield raw_line + "\n\n"
                            continue

                        event_type = event.get("type", "")

                        if event_type == "response.output_text.delta" and first_token_time is None:
                            first_token_time = time.time()

                        yield raw_line + "\n\n"

                        if event_type in ("response.completed", "response.failed", "response.incomplete"):
                            end_time = time.time()
                            stats = {
                                "type": "arena.stats",
                                "total_time_ms": round((end_time - start_time) * 1000),
                                "time_to_first_token_ms": (
                                    round((first_token_time - start_time) * 1000)
                                    if first_token_time
                                    else None
                                ),
                            }
                            if event_type == "response.completed":
                                usage = event.get("response", {}).get("usage", {})
                                stats["usage"] = usage
                            yield f"event: arena.stats\ndata: {json.dumps(stats)}\n\n"
                    else:
                        yield raw_line + "\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/api/health")
async def health():
    return {"status": "ok"}


# ── Static file serving (production / HF Spaces) ─────────────────────────────

STATIC_DIR = pathlib.Path(__file__).resolve().parent / "static"

if STATIC_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve the React SPA for any non-API route."""
        file_path = STATIC_DIR / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(STATIC_DIR / "index.html")
