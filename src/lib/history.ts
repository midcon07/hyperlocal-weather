// Daily weather history: reading the per-station CSV files written by
// scripts/fetch-wu-history.mjs (public/data/history/<STATION>.csv) and the
// summaries the history page shows from them.

export interface DayRecord {
  date: string; // YYYY-MM-DD
  tempHigh: number | null;
  tempLow: number | null;
  tempAvg: number | null;
  dewHigh: number | null;
  dewLow: number | null;
  dewAvg: number | null;
  humHigh: number | null;
  humLow: number | null;
  humAvg: number | null;
  windHigh: number | null;
  windLow: number | null;
  windAvg: number | null;
  gustHigh: number | null;
  presHigh: number | null;
  presLow: number | null;
  precip: number | null;
}

export interface StationIndexEntry {
  id: string;
  label: string;
  first: string | null;
  last: string | null;
  days: number;
}

const FIELDS: Record<string, keyof DayRecord> = {
  temp_high_f: "tempHigh",
  temp_low_f: "tempLow",
  temp_avg_f: "tempAvg",
  dewpoint_high_f: "dewHigh",
  dewpoint_low_f: "dewLow",
  dewpoint_avg_f: "dewAvg",
  humidity_high_pct: "humHigh",
  humidity_low_pct: "humLow",
  humidity_avg_pct: "humAvg",
  wind_high_mph: "windHigh",
  wind_low_mph: "windLow",
  wind_avg_mph: "windAvg",
  gust_high_mph: "gustHigh",
  pressure_high_inhg: "presHigh",
  pressure_low_inhg: "presLow",
  precip_total_in: "precip",
};

export function parseHistoryCsv(text: string): DayRecord[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((h) => h.trim());
  const dateCol = header.indexOf("date");
  if (dateCol < 0) return [];
  const columns = header.map((h) => FIELDS[h]);

  const days: DayRecord[] = [];
  for (const line of lines.slice(1)) {
    const cells = line.split(",");
    const day: DayRecord = {
      date: cells[dateCol],
      tempHigh: null, tempLow: null, tempAvg: null,
      dewHigh: null, dewLow: null, dewAvg: null,
      humHigh: null, humLow: null, humAvg: null,
      windHigh: null, windLow: null, windAvg: null,
      gustHigh: null, presHigh: null, presLow: null, precip: null,
    };
    columns.forEach((field, i) => {
      if (!field) return;
      const raw = cells[i];
      const n = raw === undefined || raw.trim() === "" ? NaN : Number(raw);
      (day[field] as number | null) = Number.isFinite(n) ? n : null;
    });
    days.push(day);
  }
  return days.sort((a, b) => a.date.localeCompare(b.date));
}

// A day with nothing recorded (the station was off, or didn't exist yet).
export const hasData = (d: DayRecord) => d.tempHigh !== null || d.tempLow !== null || d.precip !== null;

const nums = (values: (number | null)[]) => values.filter((v): v is number => v !== null);
const avg = (values: number[]) => (values.length ? values.reduce((s, v) => s + v, 0) / values.length : null);

// ---- Slices of time

export function lastDays(days: DayRecord[], count: number): DayRecord[] {
  return days.slice(Math.max(0, days.length - count));
}

export function daysInYear(days: DayRecord[], year: number): DayRecord[] {
  return days.filter((d) => d.date.startsWith(`${year}-`));
}

// The same calendar day (e.g. 10-12) in every year on record.
export function sameDayEachYear(days: DayRecord[], monthDay: string): DayRecord[] {
  return days.filter((d) => d.date.slice(5) === monthDay && hasData(d));
}

// ---- Roll-ups

export interface Period {
  label: string; // "2024-06" or "2024"
  days: number;
  tempHigh: number | null; // average of the daily highs
  tempLow: number | null; // average of the daily lows
  hottest: number | null;
  coldest: number | null;
  precip: number; // total
}

export function rollUp(days: DayRecord[], size: "month" | "year"): Period[] {
  const groups = new Map<string, DayRecord[]>();
  for (const d of days) {
    if (!hasData(d)) continue;
    const key = size === "month" ? d.date.slice(0, 7) : d.date.slice(0, 4);
    groups.set(key, [...(groups.get(key) ?? []), d]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, list]) => {
      const highs = nums(list.map((d) => d.tempHigh));
      const lows = nums(list.map((d) => d.tempLow));
      return {
        label,
        days: list.length,
        tempHigh: avg(highs),
        tempLow: avg(lows),
        hottest: highs.length ? Math.max(...highs) : null,
        coldest: lows.length ? Math.min(...lows) : null,
        precip: nums(list.map((d) => d.precip)).reduce((s, v) => s + v, 0),
      };
    });
}

// ---- Records

export interface RecordLine {
  label: string;
  value: string;
  date: string;
}

function best(days: DayRecord[], pick: (d: DayRecord) => number | null, highest: boolean) {
  let found: { v: number; date: string } | null = null;
  for (const d of days) {
    const v = pick(d);
    if (v === null) continue;
    if (!found || (highest ? v > found.v : v < found.v)) found = { v, date: d.date };
  }
  return found;
}

export function records(days: DayRecord[]): RecordLine[] {
  const lines: RecordLine[] = [];
  const add = (label: string, hit: { v: number; date: string } | null, fmt: (v: number) => string) => {
    if (hit) lines.push({ label, value: fmt(hit.v), date: hit.date });
  };
  add("Hottest day", best(days, (d) => d.tempHigh, true), (v) => `${v}°F`);
  add("Coldest night", best(days, (d) => d.tempLow, false), (v) => `${v}°F`);
  add("Wettest day", best(days, (d) => d.precip, true), (v) => `${v.toFixed(2)} in`);
  add("Strongest gust", best(days, (d) => d.gustHigh, true), (v) => `${v} mph`);
  add("Highest pressure", best(days, (d) => d.presHigh, true), (v) => `${v.toFixed(2)} inHg`);
  add("Lowest pressure", best(days, (d) => d.presLow, false), (v) => `${v.toFixed(2)} inHg`);
  return lines;
}

export const formatDay = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
