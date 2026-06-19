"use client";
import { useState, useEffect } from "react";
import { getAvailability, getWeather, validateCode, Availability, Weather } from "@/lib/api";
import { Card, Input, Button, Badge } from "@/components/ui";
import { SoccerGame } from "@/components/SoccerGame";

type Booking = NonNullable<Awaited<ReturnType<typeof validateCode>>["booking"]>;

export default function HomePage() {
  // Default to July 24, 2026 (matching the user's mock template day)
  const [date, setDate] = useState("2026-07-24");
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Play Unlock state
  const [code, setCode] = useState("");
  const [unlocked, setUnlocked] = useState<Booking | null>(null);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  // Load availability and weather for the selected date
  async function loadData(targetDate: string) {
    setLoading(true);
    setError(null);
    try {
      const [availRes, weatherRes] = await Promise.all([
        getAvailability(targetDate),
        getWeather(targetDate),
      ]);
      setAvailability(availRes);
      setWeather(weatherRes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  // Reload when date changes
  useEffect(() => {
    loadData(date);
  }, [date]);

  // Code unlocking
  async function handleUnlock() {
    if (!code.trim()) return;
    setUnlocking(true);
    setUnlockError(null);
    try {
      const res = await validateCode(code.trim().toUpperCase());
      if (res.valid && res.booking) {
        setUnlocked(res.booking);
      } else {
        setUnlockError("Invalid or cancelled code.");
      }
    } catch (e) {
      setUnlockError(e instanceof Error ? e.message : "Failed to validate code");
    } finally {
      setUnlocking(false);
    }
  }

  // Parse active date to render the calendar grid
  const parsedDate = new Date(date);
  const year = isNaN(parsedDate.getTime()) ? 2026 : parsedDate.getFullYear();
  const month = isNaN(parsedDate.getTime()) ? 6 : parsedDate.getMonth(); // 0-indexed
  const activeDayNum = isNaN(parsedDate.getTime()) ? 24 : parsedDate.getDate();

  const monthName = parsedDate.toLocaleString("en-US", { month: "long" });

  // Compute calendar days
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // Sunday is 0
  const mondayOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // Align Mon=0, Sun=6

  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Extract booked slots (available = false) to show as Next/Booked Sessions
  const bookedSlots = availability?.slots.filter((s) => !s.available) || [];

  // Weather stats calculations
  const getWindSpeed = (condition?: string) => {
    if (!condition) return "10 km/h W";
    if (condition.includes("windy")) return "28 km/h NW";
    if (condition.includes("rain") || condition.includes("storm")) return "18 km/h S";
    return "12 km/h NE";
  };

  const getHumidity = (condition?: string) => {
    if (!condition) return "50%";
    if (condition.includes("rain") || condition.includes("overcast")) return "85%";
    if (condition.includes("snow")) return "70%";
    return "45%";
  };

  const getPitchTemp = (tempC?: number) => {
    if (tempC === undefined) return "20.0°C";
    return `${(tempC - 2.5).toFixed(1)}°C`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter py-lg">
      
      {/* LEFT COLUMN: Availability, Calendar & Date Picker */}
      <aside className="lg:col-span-3 space-y-md">
        <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl shadow-sm">
          <div className="flex justify-between items-center mb-md">
            <h2 className="font-headline-md text-headline-md tracking-tight">Availability</h2>
            <span className="text-secondary font-label-md text-xs font-semibold uppercase tracking-widest flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
              Live
            </span>
          </div>

          {/* Date Picker Input */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
              Selected Date
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-xs font-medium"
            />
          </div>

          {/* Dynamic Calendar Title */}
          <div className="text-center font-bold text-sm text-on-surface mb-2 uppercase tracking-wide">
            {monthName} {year}
          </div>

          {/* Calendar Grid */}
          <div className="space-y-2">
            <div className="grid grid-cols-7 text-center font-label-md text-[10px] text-on-surface-variant font-bold border-b border-outline-variant pb-1">
              <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {/* Empty offset padding slots */}
              {Array.from({ length: mondayOffset }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square"></div>
              ))}
              {/* Actual calendar buttons */}
              {calendarDays.map((d) => {
                const isSelected = d === activeDayNum;
                return (
                  <button
                    key={`day-${d}`}
                    onClick={() => {
                      const dayStr = d.toString().padStart(2, "0");
                      const monthStr = (month + 1).toString().padStart(2, "0");
                      setDate(`${year}-${monthStr}-${dayStr}`);
                    }}
                    className={`aspect-square flex items-center justify-center font-semibold text-xs border border-transparent rounded transition-all ${
                      isSelected
                        ? "bg-primary text-white shadow-md scale-105"
                        : "text-slate-700 hover:border-primary hover:bg-slate-100"
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Booked Sessions / Next Bookings on this date */}
          <div className="mt-8 space-y-sm">
            <h3 className="font-label-md text-[10px] font-bold uppercase text-on-surface-variant border-b border-outline-variant pb-1 tracking-wider">
              Booked Sessions
            </h3>
            <div className="space-y-2 max-h-[160px] overflow-y-auto no-scrollbar">
              {bookedSlots.length > 0 ? (
                bookedSlots.map((s) => (
                  <div
                    key={s.start_time}
                    className="flex items-center justify-between p-2.5 border border-outline-variant rounded-lg bg-surface-container-low/50 hover:bg-surface-container-low transition-colors"
                  >
                    <div>
                      <p className="font-button text-[11px] font-bold text-slate-800 uppercase">RESERVED</p>
                      <p className="text-[10px] text-on-surface-variant font-mono">
                        {s.start_time} - {s.end_time}
                      </p>
                    </div>
                    <Badge tone="taken">booked</Badge>
                  </div>
                ))
              ) : (
                <div className="text-[11px] text-slate-400 py-3 text-center italic">
                  No reservations on this date.
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* CENTER COLUMN: Play/Interactive Zone */}
      <section className="lg:col-span-6 space-y-md">
        <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl min-h-[600px] flex flex-col relative overflow-hidden shadow-sm">
          {/* Header */}
          <div className="flex justify-between items-start mb-lg relative z-10 flex-wrap gap-4">
            <div>
              <h1 className="font-display-lg text-2xl font-black uppercase tracking-tighter text-on-surface">
                {unlocked ? "GOALKEEPER DOODLE" : "PLAY NOW"}
              </h1>
              <p className="text-on-surface-variant text-xs flex items-center gap-1 mt-1 font-medium">
                <span className="w-2 h-2 rounded-full bg-secondary"></span>
                Surface Condition: Optimal (4.2mm)
              </p>
            </div>

            {/* Mini Unlock Form (if not unlocked) */}
            {!unlocked && (
              <div className="flex items-end gap-1.5 self-end">
                <div className="flex flex-col gap-1">
                  <label className="font-label-md text-[10px] font-bold uppercase text-on-surface-variant tracking-wider">
                    Booking Code
                  </label>
                  <input
                    type="text"
                    placeholder="ARENA-XXXX"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                    disabled={unlocking}
                    className="bg-surface-container border border-outline-variant px-3 py-1.5 text-xs text-on-surface font-mono rounded-md focus:border-primary focus:ring-0 outline-none h-10 w-32 uppercase placeholder:text-slate-400 placeholder:font-sans"
                  />
                </div>
                <button
                  onClick={handleUnlock}
                  disabled={unlocking || !code.trim()}
                  className="bg-secondary text-white w-10 h-10 rounded-md flex items-center justify-center hover:bg-secondary/90 active:scale-95 transition-all shadow-md self-end disabled:opacity-40"
                  title="Unlock game"
                >
                  <span className="material-symbols-outlined text-lg" data-icon="play_arrow">
                    play_arrow
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Show unlock error if code invalid */}
          {!unlocked && unlockError && (
            <div className="mb-4 text-xs font-semibold text-rose-500 bg-rose-50 border border-rose-100 p-2 rounded relative z-10">
              ⚠️ {unlockError}
            </div>
          )}

          {/* Interactive Field/Game Visualization */}
          <div className="flex-grow bg-surface-container-low border border-outline-variant rounded-xl relative overflow-hidden flex flex-col items-center justify-center min-h-[420px]">
            {unlocked ? (
              // Game UI if unlocked
              <div className="w-full h-full p-2 flex flex-col justify-center items-center">
                <SoccerGame />
              </div>
            ) : (
              // Locked Field Mockup UI
              <div className="absolute inset-0 flex flex-col pitch-grid group">
                <div className="absolute inset-0 flex items-center justify-center p-md">
                  <div className="relative w-full h-full bg-secondary/5 border-4 border-outline-variant rounded-lg overflow-hidden flex items-center justify-center">
                    
                    {/* Stylized Bleachers */}
                    <div className="absolute top-0 w-full h-12 bg-surface-container-highest border-b border-outline-variant flex gap-1 px-2 py-1">
                      <div className="flex-grow bg-outline-variant/10 rounded-sm"></div>
                      <div className="flex-grow bg-outline-variant/10 rounded-sm"></div>
                      <div className="flex-grow bg-outline-variant/10 rounded-sm"></div>
                      <div className="flex-grow bg-outline-variant/10 rounded-sm"></div>
                    </div>
                    <div className="absolute bottom-0 w-full h-12 bg-surface-container-highest border-t border-outline-variant flex gap-1 px-2 py-1">
                      <div className="flex-grow bg-outline-variant/10 rounded-sm"></div>
                      <div className="flex-grow bg-outline-variant/10 rounded-sm"></div>
                      <div className="flex-grow bg-outline-variant/10 rounded-sm"></div>
                      <div className="flex-grow bg-outline-variant/10 rounded-sm"></div>
                    </div>
                    <div className="absolute left-0 h-full w-12 bg-surface-container-highest border-r border-outline-variant flex flex-col gap-1 py-2 px-1">
                      <div className="flex-grow bg-outline-variant/10 rounded-sm"></div>
                      <div className="flex-grow bg-outline-variant/10 rounded-sm"></div>
                    </div>
                    <div className="absolute right-0 h-full w-12 bg-surface-container-highest border-l border-outline-variant flex flex-col gap-1 py-2 px-1">
                      <div className="flex-grow bg-outline-variant/10 rounded-sm"></div>
                      <div className="flex-grow bg-outline-variant/10 rounded-sm"></div>
                    </div>

                    {/* Lush Green Pitch */}
                    <div className="w-4/5 h-2/3 bg-secondary/80 relative shadow-md overflow-hidden rounded-md border border-white/20">
                      {/* Mowed Grass Stripes */}
                      <div className="absolute inset-0 flex flex-col">
                        <div className="flex-grow bg-black/5"></div>
                        <div className="flex-grow"></div>
                        <div className="flex-grow bg-black/5"></div>
                        <div className="flex-grow"></div>
                        <div className="flex-grow bg-black/5"></div>
                        <div className="flex-grow"></div>
                        <div className="flex-grow bg-black/5"></div>
                      </div>
                      
                      {/* Crisp White Pitch Markings */}
                      <div className="absolute inset-2 border border-white/50"></div>
                      <div className="absolute left-1/2 top-2 bottom-2 w-px bg-white/50"></div>
                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 border border-white/50 rounded-full"></div>
                      {/* Penalty Areas */}
                      <div className="absolute left-2 top-1/4 bottom-1/4 w-12 border border-l-0 border-white/50"></div>
                      <div className="absolute right-2 top-1/4 bottom-1/4 w-12 border border-r-0 border-white/50"></div>
                    </div>
                  </div>
                </div>

                {/* Animated Pulsing Player Dots */}
                <div className="absolute top-1/3 left-1/4 w-3.5 h-3.5 bg-primary rounded-full animate-ping shadow-[0_0_10px_rgba(188,0,10,0.5)] z-20"></div>
                <div className="absolute top-1/3 left-1/4 w-3.5 h-3.5 bg-primary rounded-full shadow-[0_0_10px_rgba(188,0,10,0.5)] z-20"></div>

                <div className="absolute top-1/2 left-2/3 w-3.5 h-3.5 bg-primary rounded-full animate-ping delay-75 shadow-[0_0_10px_rgba(188,0,10,0.5)] z-20"></div>
                <div className="absolute top-1/2 left-2/3 w-3.5 h-3.5 bg-primary rounded-full shadow-[0_0_10px_rgba(188,0,10,0.5)] z-20"></div>

                <div className="absolute bottom-1/3 left-1/2 w-3.5 h-3.5 bg-primary rounded-full animate-ping delay-150 shadow-[0_0_10px_rgba(188,0,10,0.5)] z-20"></div>
                <div className="absolute bottom-1/3 left-1/2 w-3.5 h-3.5 bg-primary rounded-full shadow-[0_0_10px_rgba(188,0,10,0.5)] z-20"></div>


                {/* Unlock call to action banner overlay */}
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[1.5px] z-20 flex flex-col items-center justify-center text-center p-6">
                  <div className="bg-slate-950/90 border border-outline-variant p-6 rounded-xl max-w-sm shadow-xl space-y-4">
                    <span className="text-3xl">🔒</span>
                    <h3 className="text-lg font-bold text-pitch-50 uppercase tracking-tight">Game Locked</h3>
                    <p className="text-xs text-slate-400">
                      Book a slot in Claude Desktop to generate a booking code. Enter your code at the top-right to unlock the Goalkeeper minigame!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* RIGHT COLUMN: Weather & Stadium Conditions */}
      <section className="lg:col-span-3 space-y-md">
        
        {/* Conditions Card */}
        <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl shadow-sm">
          <div className="flex justify-between items-start mb-md">
            <h2 className="font-headline-md text-headline-md tracking-tight">Conditions</h2>
            <span className="material-symbols-outlined text-primary text-3xl" data-icon="sunny">
              {weather?.condition === "rainy" ? "rainy" : weather?.condition === "snow" ? "ac_unit" : "sunny"}
            </span>
          </div>

          <div className="flex items-end gap-1.5 mb-lg">
            <span className="font-display-lg text-4xl md:text-5xl font-black tracking-tighter text-slate-900">
              {weather ? `${weather.temp_c}°C` : "24°C"}
            </span>
            <span className="font-label-md text-xs font-bold text-on-surface-variant mb-1 capitalize tracking-wide">
              {weather ? weather.condition : "Sunny"}
            </span>
          </div>

          <div className="space-y-2 border-t border-outline-variant/60 pt-4">
            <div className="flex justify-between border-b border-outline-variant/30 py-2">
              <span className="text-xs text-on-surface-variant font-medium">Wind Speed</span>
              <span className="font-bold text-xs text-slate-800">{getWindSpeed(weather?.condition)}</span>
            </div>
            <div className="flex justify-between border-b border-outline-variant/30 py-2">
              <span className="text-xs text-on-surface-variant font-medium">Humidity</span>
              <span className="font-bold text-xs text-slate-800">{getHumidity(weather?.condition)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-xs text-on-surface-variant font-medium">Pitch Temp</span>
              <span className="font-bold text-xs text-secondary">{getPitchTemp(weather?.temp_c)}</span>
            </div>
          </div>
        </div>

        {/* Stadium Location Mini Card */}
        <div className="bg-surface-container-lowest border border-outline-variant overflow-hidden group h-48 relative rounded-xl shadow-sm">
          <div
            className="absolute inset-0 opacity-75 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              backgroundImage: "url('/toronto_skyline.png')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-transparent to-transparent"></div>
          <div className="absolute bottom-4 left-4 z-10">
            <p className="font-label-md text-on-surface-variant uppercase text-[9px] font-bold tracking-wider">Arena Location</p>
            <p className="font-bold text-xs text-on-surface font-sans uppercase tracking-tight">Toronto, ON</p>
          </div>
        </div>
      </section>

      {/* Live availability slot lists at the bottom of the grid if desired */}
      {availability && (
        <div className="lg:col-span-12">
          <Card className="border border-outline-variant rounded-xl shadow-sm p-md">
            <div className="flex justify-between items-center mb-4 border-b border-outline-variant/60 pb-3 flex-wrap gap-2">
              <div>
                <h3 className="font-headline-md text-base font-bold text-slate-900 uppercase">
                  Arena Reservation Grid
                </h3>
                <p className="text-xs text-slate-500">
                  {availability.day_type === "weekend" ? "Weekend Tier Uplift Active" : "Standard Weekday Rates"}
                </p>
              </div>
              {availability.closed ? (
                <Badge tone="taken">Closed Today</Badge>
              ) : (
                <Badge tone="offpeak">Operational</Badge>
              )}
            </div>

            {availability.closed ? (
              <div className="p-8 text-center text-rose-500 font-bold bg-rose-50/50 border border-rose-100 rounded-lg">
                ❌ Closed: {availability.reason || "Holiday closure"}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {availability.slots.map((s) => (
                  <div
                    key={s.start_time}
                    className={`flex items-center justify-between border rounded-lg px-4 py-3 transition-all ${
                      s.available
                        ? "border-outline-variant bg-white shadow-sm hover:border-secondary"
                        : "border-rose-100 bg-rose-50/20 opacity-80"
                    }`}
                  >
                    <div>
                      <div className="font-mono text-sm font-bold text-slate-800">
                        {s.start_time} – {s.end_time}
                      </div>
                      <div className="text-[11px] text-slate-500 font-semibold">${s.rate_cad} CAD</div>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      <Badge tone={s.tier === "peak" ? "peak" : "offpeak"}>{s.tier}</Badge>
                      {s.available ? (
                        <span className="text-[10px] text-secondary font-bold uppercase tracking-wider">Open</span>
                      ) : (
                        <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider">Booked</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

    </div>
  );
}
