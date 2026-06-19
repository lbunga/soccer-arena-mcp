"use client";
import { useState } from "react";
import { Button, Card, Input } from "@/components/ui";
import { validateCode } from "@/lib/api";
import { SoccerGame } from "@/components/SoccerGame";

type Booking = NonNullable<Awaited<ReturnType<typeof validateCode>>["booking"]>;

export default function PlayPage() {
  const [code, setCode] = useState("");
  const [unlocked, setUnlocked] = useState<null | Booking>(null);
  const [error, setError] = useState<string | null>(null);

  async function tryUnlock() {
    setError(null);
    try {
      const res = await validateCode(code.trim().toUpperCase());
      if (res.valid && res.booking) {
        setUnlocked(res.booking);
      } else {
        setError("Invalid or cancelled code.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to validate");
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-pitch-50">Goalkeeper Doodle</h1>
        <p className="text-slate-400">
          Locked. Book a session through Claude Desktop → enter the code → play.
        </p>
      </header>

      {!unlocked && (
        <Card className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[14rem]">
            <label className="block text-xs text-slate-400 mb-1">Booking code</label>
            <Input
              placeholder="ARENA-XXXX"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && tryUnlock()}
            />
          </div>
          <Button onClick={tryUnlock} disabled={!code.trim()}>
            Unlock
          </Button>
          {error && <span className="text-rose-400 text-sm">{error}</span>}
        </Card>
      )}

      {unlocked && (
        <>
          <Card className="mb-4">
            <div className="text-sm text-slate-400 flex flex-wrap items-center justify-between gap-2">
              <div>
                Welcome, <span className="text-pitch-50 font-semibold">{unlocked.name}</span> · Booking{" "}
                <span className="font-mono text-pitch-50 font-semibold">{unlocked.code}</span> ·{" "}
                {unlocked.booking_date} {unlocked.start_time}
              </div>
              <div className="text-xs bg-pitch-900/40 text-pitch-300 border border-pitch-800 px-2.5 py-0.5 rounded-full font-medium">
                Interactive Game Unlocked
              </div>
            </div>
          </Card>
          <SoccerGame />
        </>
      )}
    </div>
  );
}
