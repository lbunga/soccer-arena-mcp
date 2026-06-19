"""Typed shapes used at the FastAPI / MCP boundaries."""
from __future__ import annotations

from pydantic import BaseModel, EmailStr


class Slot(BaseModel):
    start_time: str
    end_time: str
    tier: str  # "peak" | "offpeak"
    rate_cad: float
    available: bool


class Availability(BaseModel):
    date: str
    closed: bool
    day_type: str | None = None
    reason: str | None = None
    slots: list[Slot] = []


class BookingIn(BaseModel):
    name: str
    email: EmailStr
    date: str
    start_time: str


class Booking(BaseModel):
    code: str
    name: str
    email: str
    booking_date: str
    start_time: str
    rate_cad: float
    status: str
    created_at: str


class CodeIn(BaseModel):
    code: str
