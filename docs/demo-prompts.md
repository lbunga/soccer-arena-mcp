# Demo Prompts for Claude Desktop

A scripted set of prompts that exercise every MCP tool, business rule, edge case, and the
end-to-end unlock flow for VirtualSoccerArena. Use this to demo the project, smoke-test a fresh
install, or verify a change didn't regress something.

**Before you start**
- Backend running (`uvicorn api.main:app --reload --port 8000`)
- Web app running (`npm run dev` in `web/`)
- MCP server wired into Claude Desktop (see [claude_desktop_config.example.json](claude_desktop_config.example.json)) and Claude Desktop restarted
- Demo date window: **June – December 2026**

**Suggested order:** run #3 → #2 → #5 first — these fail loudly when something's wrong. Save
#10 for last; it's the headline demo.

---

## 1. Multi-tool weekend planning

> "I want to play this Saturday afternoon, June 20 2026. What's the weather looking like, what
> slots are open, and what's your rain/cancellation policy in case it pours?"

- **Tests:** `get_weather` + `check_availability` + `query_policy` chained in one turn
- **Expected:** Claude calls all three tools and returns Saturday sessions (06:00–22:00, peak
  block 10:00–16:00 at $200), a summer temp 20–31 °C, and cancellation passages from RAG. No
  booking yet.

---

## 2. Holiday rejection

> "Book me the 6pm slot on Canada Day for Alex, alex@example.com."

- **Tests:** Holiday closure handling (Jul 1 2026 in `HOLIDAYS`)
- **Expected:** `check_availability("2026-07-01")` returns `closed: true, reason: "Holiday
  closure"`. Claude refuses the booking, explains *why*, and offers nearby dates. Should NOT
  call `create_booking`.

---

## 3. Double-booking race

> *(After a booking already exists for 2026-08-15 16:00)*
> "Book Sam at sam@example.com for 4pm on Saturday August 15, 2026."

- **Tests:** Partial unique index `uq_active_slot` rejects a second confirmed row
- **Expected:** Insert raises IntegrityError → friendly "slot taken" error surfaced through
  MCP. Claude reads the error and suggests an alternative slot (e.g., 14:00 or 18:00 same day).

---

## 4. Peak-vs-offpeak reasoning

> "What's the cheapest 2-hour slot on Monday June 22 2026, and how much would I save vs the
> most expensive slot that day?"

- **Tests:** Rate table correctness (weekday off-peak $120 vs peak $160) and Claude's
  arithmetic over `check_availability` output
- **Expected:** Cheapest = any of 08:00 / 10:00 / 12:00 / 14:00 at $120; most expensive = 16:00
  or 18:00 at $160. Savings = $40. Should not hallucinate weekend rates.

---

## 5. Policy synthesis (RAG quality)

> "If I arrive 25 minutes late to my 6pm booking, do I get the full 2 hours, a partial session,
> or no refund? Quote the policy."

- **Tests:** RAG retrieval on the late-arrival section; Claude must ground the answer in
  retrieved text, not training data
- **Expected:** `query_policy("late arrival")` returns the late-arrival passage. Claude
  paraphrases AND quotes — if it answers without quoting, retrieval may not be wired, or the
  chunk isn't being returned. Sanity-check the retrieved passage matches.

---

## 6. Rebook flow (Phase 5 territory — should fail gracefully)

> "I have booking ARENA-7F3K for Friday — move it to Sunday same time."

- **Tests:** Tool surface boundary. In Phase 4 there is no `rebook` / `cancel_booking` tool yet.
- **Expected:** Claude recognizes it can't do this with the 4 tools available, tells the user,
  and offers to *create* a new booking on Sunday (after checking availability) while noting the
  old one needs manual cancellation. Should NOT pretend to have called a nonexistent tool.

---

## 7. Cross-month boundary planning

> "I want a recurring Tuesday evening slot for the next 4 weeks starting July 7 2026. Check
> each date and tell me which are available at the 6pm slot."

- **Tests:** 4 separate `check_availability` calls, parallel tool-use, date arithmetic.
  July 7, 14, 21, 28 — all weekdays, none on the holiday list.
- **Expected:** Claude issues the calls (ideally in parallel), reports each 18:00 slot's status
  and total cost ($160 × 4 = $640 if all open). Confirms no holiday conflicts.

---

## 8. Ambiguous date — disambiguation

> "Book the 8pm slot next Friday."

- **Tests:** Claude resolving relative dates against today; weekday session boundary. Weekday
  sessions cap at 18:00 start — 20:00 isn't a valid weekday session.
- **Expected:** Claude confirms which Friday it means, calls `check_availability`, sees no
  20:00 slot, and tells the user weekday evenings cap at 18:00. Offers 18:00 instead, or
  suggests Saturday for a 20:00 slot.

---

## 9. Out-of-window weather

> "What's the weather like at the arena on March 15, 2027?"

- **Tests:** Demo-window boundary (Jun–Dec 2026)
- **Expected:** Either (a) the tool clamps/rejects, or (b) returns something — but Claude
  should call this out as "outside the demo forecast window" rather than silently returning
  fabricated data. This reveals whether `weather.forecast` handles out-of-window dates per §11
  of the implementation plan.

---

## 10. End-to-end unlock (the headline demo)

> 1. "Check what's open on Saturday June 27, 2026."
> 2. "Book the 12pm slot for Jordan at jordan@example.com."
> 3. *(Open `http://localhost:3000/play` and paste the code from chat.)*

- **Tests:** Full loop — MCP → SQLite write → email → `/validate-code` → game unlock
- **Expected:**
  - Step 1: `check_availability` shows 12:00 weekend peak at $200 available
  - Step 2: `create_booking` returns a code like `ARENA-7F3K`; an `.ics` email arrives
  - Step 3: `POST /validate-code` returns `{ valid: true, booking: {...} }`, the goalkeeper
    game renders, Space starts play
- **The single proof point of the whole project.** If any step silently swallows an error,
  this is where it shows.

---

## Adding new prompts

Keep each entry to: the prompt (block-quoted), **Tests:** (what mechanism it exercises), and
**Expected:** (concrete observable outcome). Avoid prompts that only test "did Claude reply
nicely" — every prompt here should fail loudly if a specific piece of code is broken.
