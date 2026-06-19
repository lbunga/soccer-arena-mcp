"""FastAPI layer for the Next.js web app — thin wrappers over arena_core."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi import FastAPI, HTTPException  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from pydantic import BaseModel  # noqa: E402

from arena_core import availability, booking, db, weather  # noqa: E402

db.init()

app = FastAPI(title="VirtualSoccerArena API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class CodeIn(BaseModel):
    code: str


@app.get("/availability")
def availability_route(date: str):
    try:
        return availability.get_availability(date)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/weather")
def weather_route(date: str):
    try:
        return weather.forecast(date)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/policies")
def policies_route():
    """Return the seed policy sections so the web app can show them without
    hitting the RAG pipeline. Static read of seed_policies.md."""
    seed = Path(__file__).resolve().parent.parent / "scripts" / "seed_policies.md"
    if not seed.exists():
        return {"sections": []}
    text = seed.read_text(encoding="utf-8")
    sections = []
    current_title, current_body = None, []
    for line in text.splitlines():
        if line.startswith("## "):
            if current_title:
                sections.append({"title": current_title, "body": "\n".join(current_body).strip()})
            current_title = line[3:].strip()
            current_body = []
        elif current_title is not None:
            current_body.append(line)
    if current_title:
        sections.append({"title": current_title, "body": "\n".join(current_body).strip()})
    return {"sections": sections}


@app.post("/validate-code")
def validate_route(payload: CodeIn):
    bk = booking.get_by_code(payload.code.strip())
    valid = bk is not None and bk["status"] == "confirmed"
    return {"valid": valid, "booking": bk if valid else None}


@app.get("/health")
def health():
    return {"ok": True}
