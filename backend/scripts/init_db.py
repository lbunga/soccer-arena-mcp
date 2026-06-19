"""Create the SQLite schema (idempotent)."""
from __future__ import annotations

import sys
from pathlib import Path

# Allow running this script directly without installing the package.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from arena_core import db, config


def main() -> None:
    print(f"[init_db] using {config.ARENA_DB_PATH}")
    db.init()
    print("[init_db] schema ready")


if __name__ == "__main__":
    main()
