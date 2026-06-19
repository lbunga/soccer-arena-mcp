"use client";
import { useState } from "react";
import { Button, Card, Input } from "@/components/ui";
import { getWeather, Weather } from "@/lib/api";

const ICON: Record<string, string> = {
  sunny: "☀️",
  overcast: "☁️",
  rainy: "🌧️",
  snow: "❄️",
  flurries: "🌨️",
  windy: "🌬️",
  "partly cloudy": "⛅",
};

export default function WeatherPage() {
  const [date, setDate] = useState("2026-07-15");
  const [data, setData] = useState<Weather | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      setData(await getWeather(date));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  return (
    <div className="space-y-6 py-4">
      <header>
        <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900 font-display-lg">Weather</h1>
        <p className="text-slate-500 text-sm">Mock seasonal forecast for the Jun–Dec 2026 demo window.</p>
      </header>
      <Card className="flex flex-wrap items-end gap-3 p-6">
        <div>
          <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Date</label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <Button onClick={load}>Check</Button>
        {error && <span className="text-rose-500 text-sm font-semibold">{error}</span>}
      </Card>
      {data && (
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="text-5xl">{ICON[data.condition] ?? "🌡️"}</div>
            <div>
              <div className="text-3xl font-black text-slate-900 tracking-tight">{data.temp_c}°C</div>
              <div className="capitalize text-sm font-bold text-slate-500">{data.condition}</div>
              <div className="text-[11px] text-slate-400 font-mono mt-1">{data.date}</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
