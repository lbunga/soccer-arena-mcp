# VirtualSoccerArena

A local, Claude-Desktop-driven booking demo for a fictional indoor soccer arena in Toronto, ON.
Claude books sessions through an **MCP server**; a separate **Next.js web app**
shows info and hosts a code-locked mini-game. Both sit on **one shared Python
core + one SQLite file**.

## What it demonstrates

Inside **Claude Desktop**, you ask Claude to check availability, read a policy,
check the weather, and book a 2-hour session. Claude calls your local MCP tools,
and a booking lands in SQLite with a unique code. You then open the **web app** (featuring custom Toronto, ON styling and a vector CN Tower skyline backdrop),
enter that code on the dashboard, and a custom cyberpunk robot goalkeeper mini-game unlocks — proving Claude and the
web app share one source of truth.

### Four features

1. **Policy check** — RAG over a ~100-page policy PDF. LlamaIndex retrieves;
   Claude synthesizes.
2. **Availability & rates** — computed from rules (open hours, peak/off-peak,
   weekend uplift, Ontario holiday closures), minus already-booked slots.
3. **Booking & confirmation** — returns a unique code and emails an `.ics`
   calendar invite.
4. **Weather forecast** — mock seasonal data for the demo window (Jun-Dec 2026).

## Architecture

```
Claude Desktop ──stdio──► MCP server ─┐
                                      ├─► arena_core ─► SQLite (arena.db)
Browser ──HTTP──► FastAPI ─────────────┘            ─► Pinecone (policy vectors)
                                                    ─► OpenAI  (embeddings)
                                                    ─► Gmail   (.ics invite)
```

All business logic lives in **`arena_core`**. Two "front doors" import it: the
MCP server (for Claude) and FastAPI (for the web app). **Availability is never
stored** — it's computed. Bookings in SQLite are the single source of truth.

## Prerequisites

- Python 3.11+ and Node.js 18+
- **Claude Desktop** installed (local MCP servers don't work in the browser)
- An **OpenAI** API key (embeddings)
- A **Pinecone** account + API key
- A **Gmail** account with 2-Step Verification ON and a generated **App Password**

## Setup

```bash
git clone <this-repo>
cd soccer-arena-mcp
cp .env.example .env       # fill in real values

# --- backend ---
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt

# Create the SQLite schema
python scripts/init_db.py

# Drop your policy PDF(s) into backend/policies/, then embed + upsert to Pinecone (run once)
python -m arena_core.policy.ingest
# (or pass a specific path: python -m arena_core.policy.ingest path/to/file.pdf)
```

> ⚠️ **Pinecone dimension** must equal `EMBEDDING_DIM`. If you change the
> embedding model, delete and recreate the Pinecone index.

## Run the API + web app

```bash
# Terminal 1 — API for the web app
cd backend
uvicorn api.main:app --reload --port 8000

# Terminal 2 — web app
cd web
npm install
npm run dev      # http://localhost:3000
```

## Wire the MCP server into Claude Desktop

Edit `claude_desktop_config.json` (see `docs/claude_desktop_config.example.json`)
and **restart Claude Desktop**. Use the **absolute path to the venv Python** and
set `cwd` to `backend/`.

Windows example:

```json
{
  "mcpServers": {
    "virtualsoccerarena": {
      "command": "C:\\path\\to\\soccer-arena-mcp\\backend\\.venv\\Scripts\\python.exe",
      "args": ["-m", "mcp_server.server"],
      "cwd": "C:\\path\\to\\soccer-arena-mcp\\backend"
    }
  }
}
```

The config file lives at:

- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

## Run the demo

1. In Claude Desktop: *"What's open at the arena on July 4, 2026?"* → `check_availability`
2. *"What's the cancellation policy?"* → `query_policy`
3. *"Book the 6pm slot for Alex (alex@example.com)."* → `create_booking` → Claude shows the code
4. Open `http://localhost:3000`, enter the booking code in the "Play Now" zone → goalkeeper mini-game unlocks (or navigate directly to `http://localhost:3000/play`)

See [docs/demo-prompts.md](docs/demo-prompts.md) for 10 scripted prompts that exercise every
MCP tool, edge case, and the end-to-end unlock flow — useful for smoke-testing and regression
checks.

## Repository layout

```
backend/        # Python — arena_core, MCP server, FastAPI, scripts, tests
web/            # Next.js (App Router, TS, Tailwind) — info pages + mini-game
docs/           # Claude Desktop config example + demo prompts
```

## Tests

```bash
cd backend
pytest -q
```

Covers: day-type detection, sessions per day type, peak/off-peak, rate table,
holiday closures, availability subtracts confirmed bookings, double-booking
rejected, booking-code alphabet safe.

## Known gotchas

- **Gmail App Password** — Gmail rejects your normal password over SMTP. Enable
  2-Step Verification and generate a 16-char App Password.
- **Pinecone dimension** — must equal the OpenAI embedding model's output dim (e.g., `512` for `text-embedding-3-small`).
- **SQLite + two processes** — WAL is enabled in `db.py` so MCP and FastAPI can
  read/write concurrently.
- **MCP server path** — absolute venv Python path + `cwd`, then restart Claude.
- **Demo window** — weather/rates are defined for Jun-Dec 2026.
- **Secrets** — never commit `.env`; only `.env.example`.
- **Idempotent ingest** — `ingest.py` clears the Pinecone index before re-upserting.
