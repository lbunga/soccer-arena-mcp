"""Build a VEVENT + send through Gmail SMTP (STARTTLS, port 587).

Requires a Gmail App Password (NOT the regular login password).
"""
from __future__ import annotations

import smtplib
import uuid
from datetime import datetime, timedelta
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from . import config, rules

try:
    from icalendar import Calendar, Event
except ImportError:  # pragma: no cover - lib should be installed
    Calendar = None
    Event = None


def _build_ics(date_str: str, start_time: str, code: str) -> bytes:
    if Calendar is None:
        raise RuntimeError("icalendar package not installed.")

    d = rules.parse_iso_date(date_str)
    h, m = (int(x) for x in start_time.split(":"))
    start = datetime(d.year, d.month, d.day, h, m)
    end = start + timedelta(hours=rules.SESSION_HOURS)

    cal = Calendar()
    cal.add("prodid", "-//VirtualSoccerArena//EN")
    cal.add("version", "2.0")
    cal.add("method", "REQUEST")

    ev = Event()
    ev.add("uid", f"{code}-{uuid.uuid4()}@virtualsoccerarena.local")
    ev.add("summary", f"VirtualSoccerArena booking {code}")
    ev.add("dtstart", start)
    ev.add("dtend", end)
    ev.add("dtstamp", datetime.utcnow())
    ev.add("location", "VirtualSoccerArena (indoor)")
    ev.add("description", f"Your indoor soccer session. Code: {code}")
    cal.add_component(ev)
    return cal.to_ical()


def _attach_ics(msg: MIMEMultipart, ics_bytes: bytes) -> None:
    part = MIMEBase("text", "calendar", method="REQUEST", name="invite.ics")
    part.set_payload(ics_bytes)
    part.add_header("Content-Disposition", 'attachment; filename="invite.ics"')
    msg.attach(part)


def send_invite(
    name: str, email: str, date_str: str, start_time: str, code: str, rate: float
) -> None:
    if not config.GMAIL_ADDRESS or not config.GMAIL_APP_PASSWORD:
        raise RuntimeError("Gmail credentials not configured.")

    ics_bytes = _build_ics(date_str, start_time, code)

    msg = MIMEMultipart()
    msg["Subject"] = f"VirtualSoccerArena booking {code}"
    msg["From"] = config.GMAIL_ADDRESS
    msg["To"] = email
    body = (
        f"Hi {name},\n\n"
        f"Your VirtualSoccerArena session is confirmed.\n\n"
        f"  Date:  {date_str}\n"
        f"  Time:  {start_time} ({rules.SESSION_HOURS}h)\n"
        f"  Rate:  ${rate:.2f} CAD\n"
        f"  Code:  {code}\n\n"
        f"Use the code on the web app to unlock the mini-game.\n"
    )
    msg.attach(MIMEText(body, "plain"))
    _attach_ics(msg, ics_bytes)

    with smtplib.SMTP("smtp.gmail.com", 587) as s:
        s.starttls()
        s.login(config.GMAIL_ADDRESS, config.GMAIL_APP_PASSWORD)
        s.send_message(msg)
