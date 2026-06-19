const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type Slot = {
  start_time: string;
  end_time: string;
  tier: "peak" | "offpeak";
  rate_cad: number;
  available: boolean;
};

export type Availability = {
  date: string;
  closed: boolean;
  reason?: string;
  day_type?: "weekday" | "weekend";
  slots: Slot[];
};

export type Weather = { date: string; temp_c: number; condition: string };

export type PolicySection = { title: string; body: string };

export type ValidateResult = {
  valid: boolean;
  booking: null | {
    code: string;
    name: string;
    booking_date: string;
    start_time: string;
    rate_cad: number;
    status: string;
  };
};

async function getJSON<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

export const getAvailability = (date: string) =>
  getJSON<Availability>(`/availability?date=${encodeURIComponent(date)}`);

export const getWeather = (date: string) =>
  getJSON<Weather>(`/weather?date=${encodeURIComponent(date)}`);

export const getPolicies = () => getJSON<{ sections: PolicySection[] }>(`/policies`);

export async function validateCode(code: string): Promise<ValidateResult> {
  const r = await fetch(`${BASE}/validate-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}
