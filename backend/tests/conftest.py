"""Shared fixtures. Points arena_core at a temp SQLite file per test."""
from __future__ import annotations

import importlib
import os
import sys
from pathlib import Path

import pytest

# Make `arena_core` importable when running pytest from the backend directory
# or the repo root.
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))


@pytest.fixture(autouse=True)
def mock_email_service(monkeypatch):
    from arena_core import email_service
    monkeypatch.setattr(email_service, "send_invite", lambda *args, **kwargs: None)


@pytest.fixture
def fresh_db(tmp_path, monkeypatch):
    db_path = tmp_path / "test_arena.db"
    monkeypatch.setenv("ARENA_DB_PATH", str(db_path))

    # Re-import config/db so they pick up the new env.
    from arena_core import config as cfg
    importlib.reload(cfg)
    from arena_core import db as db_mod
    importlib.reload(db_mod)
    db_mod.init()

    # Also reload modules that captured `db` at import time.
    from arena_core import availability, booking
    importlib.reload(availability)
    importlib.reload(booking)

    yield db_mod
