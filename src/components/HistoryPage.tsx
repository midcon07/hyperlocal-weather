import { useEffect, useMemo, useState } from "react";
import { useSkyTheme } from "../hooks/useSkyTheme";
import { daysInYear, formatDay, hasData, lastDays, parseHistoryCsv, records, rollUp, sameDayEachYear } from "../lib/history";
import type { DayRecord, StationIndexEntry } from "../lib/history";
import { TrendCharts } from "./HistoryCharts";
import type { TrendPoint } from "./HistoryCharts";

// The weather history page (?history=1): daily summaries from the station
// files in public/data/history. Pick a day to see its numbers and the same day
// in other years, chart a stretch of time, and see records and rainfall by
// month.

const BASE = import.meta.env.BASE_URL;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type RangeKey = "30" | "90" | "365" | "all";
const RANGES: { key: RangeKey; label: string }[] = [
  { key: "30", label: "30 days" },
  { key: "90", label: "90 days" },
  { key: "365", label: "1 year" },
  { key: "all", label: "All years" },
];

const fmt = (v: number | null, digits = 0, unit = "") => (v === null ? "-" : `${v.toFixed(digits)}${unit}`);

function Tile({ label, main, sub }: { label: string; main: string; sub?: string }) {
  return (
    <div className="hist-tile">
      <div className="hist-tile-label">{label}</div>
      <div className="hist-tile-main">{main}</div>
      {sub && <div className="hist-tile-sub">{sub}</div>}
    </div>
  );
}

function DayCard({ day }: { day: DayRecord }) {
  return (
    <div className="hist-tiles">
      <Tile label="Temperature" main={`${fmt(day.tempHigh, 0, "°")} / ${fmt(day.tempLow, 0, "°")}`} sub={`average ${fmt(day.tempAvg, 0, "°F")}`} />
      <Tile label="Dew point" main={`${fmt(day.dewHigh, 0, "°")} / ${fmt(day.dewLow, 0, "°")}`} sub={`average ${fmt(day.dewAvg, 0, "°F")}`} />
      <Tile label="Humidity" main={`${fmt(day.humHigh, 0, "%")} / ${fmt(day.humLow, 0, "%")}`} sub={`average ${fmt(day.humAvg, 0, "%")}`} />
      <Tile label="Wind" main={`${fmt(day.windAvg, 0, " mph")} avg`} sub={`high ${fmt(day.windHigh, 0, " mph")}, gust ${fmt(day.gustHigh, 0, " mph")}`} />
      <Tile label="Pressure" main={`${fmt(day.presHigh, 2)} / ${fmt(day.presLow, 2)}`} sub="inHg, high / low" />
      <Tile label="Rain" main={fmt(day.precip, 2, " in")} />
    </div>
  );
}

export function HistoryPage() {
  useSkyTheme(null);
  const [index, setIndex] = useState<StationIndexEntry[] | null>(null);
  const [stationId, setStationId] = useState<string | null>(null);
  const [days, setDays] = useState<DayRecord[] | null>(null);
  const [date, setDate] = useState<string>("");
  const [range, setRange] = useState<RangeKey>("90");

  useEffect(() => {
    document.title = "Weather History - Hyperlocal Weather";
    fetch(`${BASE}data/history/index.json`)
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => [])
      .then((list: StationIndexEntry[]) => {
        const usable = list.filter((s) => s.days > 0);
        setIndex(usable);
        setStationId((current) => current ?? usable[usable.length - 1]?.id ?? null);
      });
  }, []);

  useEffect(() => {
    if (!stationId) return;
    setDays(null);
    fetch(`${BASE}data/history/${stationId}.csv`)
      .then((r) => (r.ok ? r.text() : ""))
      .then((text) => {
        const parsed = parseHistoryCsv(text);
        setDays(parsed);
        const lastWithData = [...parsed].reverse().find(hasData);
        setDate(lastWithData?.date ?? "");
      })
      .catch(() => setDays([]));
  }, [stationId]);

  const withData = useMemo(() => (days ?? []).filter(hasData), [days]);
  const station = index?.find((s) => s.id === stationId);

  const day = withData.find((d) => d.date === date) ?? null;
  const sameDay = useMemo(() => (date ? sameDayEachYear(withData, date.slice(5)) : []), [withData, date]);

  const trend = useMemo(() => {
    const grain: "day" | "month" = range === "all" ? "month" : "day";
    if (grain === "month") {
      const points: TrendPoint[] = rollUp(withData, "month").map((p) => ({ key: p.label, high: p.tempHigh, low: p.tempLow, rain: p.precip }));
      return { grain, points };
    }
    const slice = lastDays(withData, Number(range));
    const points: TrendPoint[] = slice.map((d) => ({ key: d.date, high: d.tempHigh, low: d.tempLow, rain: d.precip }));
    return { grain, points };
  }, [withData, range]);

  const years = useMemo(() => [...new Set(withData.map((d) => d.date.slice(0, 4)))].sort().reverse(), [withData]);
  const monthly = useMemo(() => rollUp(withData, "month"), [withData]);
  const rainFor = (year: string, month: number) => monthly.find((p) => p.label === `${year}-${String(month + 1).padStart(2, "0")}`)?.precip ?? null;
  const yearRain = (year: string) => daysInYear(withData, Number(year)).reduce((s, d) => s + (d.precip ?? 0), 0);
  const recordLines = useMemo(() => records(withData), [withData]);

  return (
    <div className="app history-page">
      <header className="app-header">
        <h1>Weather History</h1>
        <p className="location">{station ? `${station.label} - ${station.first} to ${station.last}` : "Altoona, IA"}</p>
        <a className="history-back" href={BASE}>← Back to current weather</a>
      </header>

      <main>
        {index === null && <p className="empty-state">Loading history…</p>}
        {index !== null && index.length === 0 && (
          <section className="card">
            <h2>History is on its way</h2>
            <p className="empty-state">No daily records have been added yet. They will appear here as soon as the history files are loaded.</p>
          </section>
        )}

        {index !== null && index.length > 0 && (
          <>
            {index.length > 1 && (
              <div className="hist-station-pick">
                <label>
                  Station{" "}
                  <select value={stationId ?? ""} onChange={(e) => setStationId(e.target.value)}>
                    {index.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label} ({s.first?.slice(0, 4)}-{s.last?.slice(0, 4)})
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            {days === null && <p className="empty-state">Loading {station?.label ?? "station"}…</p>}

            {days !== null && withData.length === 0 && (
              <section className="card">
                <p className="empty-state">This station has no recorded days yet.</p>
              </section>
            )}

            {days !== null && withData.length > 0 && (
              <>
                <section className="card">
                  <div className="card-header">
                    <h2>A day in the record</h2>
                    <input
                      type="date"
                      className="hist-date"
                      value={date}
                      min={withData[0].date}
                      max={withData[withData.length - 1].date}
                      onChange={(e) => setDate(e.target.value)}
                      aria-label="Pick a day"
                    />
                  </div>
                  {day ? (
                    <>
                      <p className="hist-day-title">{formatDay(day.date)}</p>
                      <DayCard day={day} />
                    </>
                  ) : (
                    <p className="empty-state">Nothing was recorded on that day. Pick another.</p>
                  )}

                  {sameDay.length > 1 && (
                    <>
                      <h3 className="hist-sub">This day in other years</h3>
                      <div className="hist-table-wrap">
                        <table className="hist-table">
                          <thead>
                            <tr><th>Year</th><th>High</th><th>Low</th><th>Rain</th></tr>
                          </thead>
                          <tbody>
                            {[...sameDay].reverse().map((d) => (
                              <tr key={d.date} className={d.date === date ? "is-selected" : ""}>
                                <td><button type="button" onClick={() => setDate(d.date)}>{d.date.slice(0, 4)}</button></td>
                                <td>{fmt(d.tempHigh, 0, "°")}</td>
                                <td>{fmt(d.tempLow, 0, "°")}</td>
                                <td>{fmt(d.precip, 2, '"')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </section>

                <section className="card">
                  <div className="card-header">
                    <h2>Trends</h2>
                    <div className="hist-ranges" role="group" aria-label="Time range">
                      {RANGES.map((r) => (
                        <button key={r.key} type="button" className={range === r.key ? "is-on" : ""} onClick={() => setRange(r.key)}>
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <TrendCharts points={trend.points} grain={trend.grain} />
                </section>

                <section className="card">
                  <h2>Records</h2>
                  <div className="hist-records">
                    {recordLines.map((r) => (
                      <button key={r.label} type="button" className="hist-record" onClick={() => setDate(r.date)}>
                        <span className="hist-record-label">{r.label}</span>
                        <span className="hist-record-value">{r.value}</span>
                        <span className="hist-record-date">{formatDay(r.date)}</span>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="card">
                  <h2>Rainfall by month (inches)</h2>
                  <div className="hist-table-wrap">
                    <table className="hist-table hist-table--months">
                      <thead>
                        <tr>
                          <th>Year</th>
                          {MONTHS.map((m) => <th key={m}>{m}</th>)}
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {years.map((y) => (
                          <tr key={y}>
                            <td>{y}</td>
                            {MONTHS.map((_, m) => {
                              const v = rainFor(y, m);
                              return <td key={m}>{v === null ? "" : v.toFixed(2)}</td>;
                            })}
                            <td><strong>{yearRain(y).toFixed(2)}</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
