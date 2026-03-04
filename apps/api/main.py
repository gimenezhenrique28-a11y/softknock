from __future__ import annotations

import io
import json
import os
import uuid
from typing import Any

import anthropic
import httpx
from pypdf import PdfReader
from fastapi import FastAPI, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

sessions: dict[str, dict[str, Any]] = {}

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
APIFY_API_KEY = os.environ.get("APIFY_API_KEY", "")

TOOLS = [
    {
        "name": "search_google_maps",
        "description": (
            "Search Google Maps for businesses and companies to find potential leads. "
            "Returns name, address, phone, website, rating, and category."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query e.g. 'fintech startups in New York'",
                },
                "max_results": {
                    "type": "integer",
                    "description": "Max results to return (1-20, default 5)",
                    "default": 5,
                },
            },
            "required": ["query"],
        },
    }
]


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/onboard")
async def onboard(
    name: str = Form(...),
    company_email: str = Form(...),
    company_name: str = Form(...),
    cv: UploadFile = Form(...),
):
    data = await cv.read()
    cv_text = ""
    try:
        reader = PdfReader(io.BytesIO(data))
        cv_text = "\n".join(page.extract_text() or "" for page in reader.pages)
    except Exception:
        cv_text = "(CV parse failed)"

    sid = str(uuid.uuid4())
    sessions[sid] = {
        "name": name,
        "company_email": company_email,
        "company_name": company_name,
        "cv_text": cv_text.strip()[:4000],
    }
    return {"session_id": sid, "name": name}


class ChatRequest(BaseModel):
    session_id: str
    message: str
    history: list[dict] = []


async def _search_google_maps(query: str, max_results: int = 5) -> str:
    if not APIFY_API_KEY:
        return json.dumps({"error": "APIFY_API_KEY not configured"})
    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            r = await client.post(
                "https://api.apify.com/v2/acts/compass~crawler-google-places/runs",
                params={"waitForFinish": 60, "token": APIFY_API_KEY},
                json={
                    "searchStringsArray": [query],
                    "maxCrawledPlacesPerSearch": min(max(1, max_results), 20),
                    "language": "en",
                },
            )
            run = r.json()
            did = run.get("data", {}).get("defaultDatasetId")
            if not did:
                return json.dumps({"error": "no dataset", "detail": run})
            res = await client.get(
                f"https://api.apify.com/v2/datasets/{did}/items",
                params={"token": APIFY_API_KEY},
            )
            items = res.json()
            mapping = {
                "name": "title",
                "address": "address",
                "phone": "phone",
                "website": "website",
                "rating": "totalScore",
                "category": "categoryName",
                "reviews": "reviewsCount",
            }
            return json.dumps(
                [{k: item.get(v) for k, v in mapping.items()} for item in (items if isinstance(items, list) else [])]
            )
    except Exception as e:
        return json.dumps({"error": str(e)})


@app.post("/chat")
async def chat(body: ChatRequest):
    if body.session_id not in sessions:
        raise HTTPException(status_code=401, detail="Invalid session")

    s = sessions[body.session_id]
    system = f"""You are a lead research AI for SoftKnock, a B2B sales intelligence platform.

User: {s['name']} at {s['company_name']} ({s['company_email']})
Background: {s['cv_text']}

Help them find and research leads. Use search_google_maps to discover relevant companies. Be specific and actionable — include company signals, why they're a fit, and recommended outreach angles."""

    messages = body.history + [{"role": "user", "content": body.message}]

    async def generate():
        ac = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
        current = list(messages)

        while True:
            async with ac.messages.stream(
                model="claude-opus-4-6",
                max_tokens=16000,
                thinking={"type": "enabled", "budget_tokens": 8000},
                system=system,
                tools=TOOLS,
                messages=current,
                extra_headers={"anthropic-beta": "interleaved-thinking-2025-05-14"},
            ) as stream:
                async for event in stream:
                    if event.type == "content_block_start":
                        cb = event.content_block
                        if cb.type == "tool_use":
                            yield f"data: {json.dumps({'type': 'tool_start', 'name': cb.name})}\n\n"
                    elif event.type == "content_block_delta":
                        d = event.delta
                        if d.type == "text_delta":
                            yield f"data: {json.dumps({'type': 'text', 'text': d.text})}\n\n"

                final = await stream.get_final_message()

            if final.stop_reason != "tool_use":
                yield f"data: {json.dumps({'type': 'done'})}\n\n"
                break

            # Build assistant content (preserve thinking blocks for multi-turn)
            assistant_blocks = []
            for block in final.content:
                if block.type == "text":
                    assistant_blocks.append({"type": "text", "text": block.text})
                elif block.type == "tool_use":
                    assistant_blocks.append({"type": "tool_use", "id": block.id, "name": block.name, "input": block.input})
                elif block.type == "thinking":
                    assistant_blocks.append({"type": "thinking", "thinking": block.thinking})

            # Execute tool calls
            tool_results = []
            for block in final.content:
                if block.type != "tool_use":
                    continue
                if block.name == "search_google_maps":
                    result = await _search_google_maps(
                        block.input.get("query", ""),
                        block.input.get("max_results", 5),
                    )
                else:
                    result = json.dumps({"error": f"unknown tool: {block.name}"})

                yield f"data: {json.dumps({'type': 'tool_result', 'name': block.name})}\n\n"
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": result,
                })

            current = current + [
                {"role": "assistant", "content": assistant_blocks},
                {"role": "user", "content": tool_results},
            ]

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
