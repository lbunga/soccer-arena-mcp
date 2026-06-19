"""Environment-backed settings. Loads .env from repo root if present."""
from __future__ import annotations

import os
from pathlib import Path

try:
    from dotenv import load_dotenv

    # Look for .env in repo root (two levels up from this file: arena_core -> backend -> root)
    _ROOT = Path(__file__).resolve().parents[2]
    load_dotenv(_ROOT / ".env")
except ImportError:
    pass


def _get(key: str, default: str | None = None, required: bool = False) -> str:
    val = os.getenv(key, default)
    if required and not val:
        raise RuntimeError(f"Missing required env var: {key}")
    return val or ""


# Database
_raw_db_path = _get("ARENA_DB_PATH", "./arena.db")
if Path(_raw_db_path).is_absolute():
    ARENA_DB_PATH = _raw_db_path
else:
    # Resolve relative to the backend directory (parent of arena_core)
    ARENA_DB_PATH = str((Path(__file__).resolve().parents[1] / _raw_db_path).resolve())

# OpenAI embeddings
OPENAI_API_KEY = _get("OPENAI_API_KEY", "")
EMBEDDING_MODEL = _get("EMBEDDING_MODEL", "text-embedding-3-small")
EMBEDDING_DIM = int(_get("EMBEDDING_DIM", "512"))

# Pinecone
PINECONE_API_KEY = _get("PINECONE_API_KEY", "")
PINECONE_INDEX = _get("PINECONE_INDEX", "virtualsoccerarena-policies")
PINECONE_CLOUD = _get("PINECONE_CLOUD", "aws")
PINECONE_REGION = _get("PINECONE_REGION", "us-east-1")

# Gmail SMTP
GMAIL_ADDRESS = _get("GMAIL_ADDRESS", "")
GMAIL_APP_PASSWORD = _get("GMAIL_APP_PASSWORD", "")
