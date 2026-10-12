import { useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useElementWidth } from "../hooks/useElementWidth";

// Two linked charts for the history page: daily or monthly high/low
// temperature as a band, and rainfall as bars, sharing one time axis and one
// hover readout. Drawn in real pixels (the width is measured) so text stays
// readable at any size.

export interface TrendPoint {
  /** Machine label: "2024-06-14" for a day, "2024-06" for a month. */
  key: string;
  high: number | null;
  low: number | null;
  rain: number | null;
}

interface Props {
  points: TrendPoint[];
  /** "day" points get "Jun 14" labels, "month" points "Jun 2024". */
  grain: "day" | "month";
}

const PAD = { left: 40, right: 12, top: 10, bottom: 24 };
const TEMP_HEIGHT = 190;
const RAIN_HEIGHT = 110;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function label(key: string, grain: "day" | "month") {
  const [y, m, d] = key.split("-");
  const month = MONTHS[Number(m) - 1];
  return grain === "day" ? `${month} ${Number(d)}, ${y}` : `${month} ${y}`;
}

function shortLabel(key: string, grain: "day" | "month") {
  const [y, m, d] = key.split("-");
  const month = MONTHS[Number(m) - 1];
  return grain === "day" ? `${month} ${Number(d)}` : `${month} '${y.slice(2)}`;
}

// Runs of consecutive points that have a value, so a gap in the record breaks
// the line instead of being drawn across.
function runs(values: (number | null)[]) {
  const out: number[][] = [];
  let current: number[] = [];
  values.forEach((v, i) => {
    if (v === null) {
      if (current.length) out.push(current);
      current = [];
    } else current.push(i);
  });
  if (current.length) out.push(current);
  return out;
}

function niceStep(range: number, target: number) {
  const raw = range / target;
  const pow = 10 ** Math.floor(Math.log10(raw || 1));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

export function TrendCharts({ points, grain }: Props) {
  const { ref, width } = useElementWidth();
  const [active, setActive] = useState<number | null>(null);

  if (points.length < 2) return <p className="empty-state">Not enough days recorded in this range to draw a chart.</p>;

  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const x = (i: number) => PAD.left + (innerW * i) / (points.length - 1);

  // Temperature scale
  const highs = points.map((p) => p.high);
  const lows = points.map((p) => p.low);
  const all = [...highs, ...lows].filter((v): v is number => v !== null);
  const tMin = all.length ? Math.min(...all) : 0;
  const tMax = all.length ? Math.max(...all) : 1;
  const tStep = niceStep(tMax - tMin || 10, 5);
  const tLo = Math.floor(tMin / tStep) * tStep;
  const tHi = Math.ceil(tMax / tStep) * tStep;
  const tInnerH = TEMP_HEIGHT - PAD.top - PAD.bottom;
  const ty = (v: number) => PAD.top + tInnerH * (1 - (v - tLo) / (tHi - tLo || 1));
  const tTicks: number[] = [];
  for (let v = tLo; v <= tHi + 1e-9; v += tStep) tTicks.push(v);

  // Rain scale
  const rainMax = Math.max(0.1, ...points.map((p) => p.rain ?? 0));
  const rStep = niceStep(rainMax, 3);
  const rHi = Math.ceil(rainMax / rStep) * rStep;
  const rInnerH = RAIN_HEIGHT - PAD.top - PAD.bottom;
  const ry = (v: number) => PAD.top + rInnerH * (1 - v / rHi);
  const rTicks: number[] = [];
  for (let v = 0; v <= rHi + 1e-9; v += rStep) rTicks.push(v);
  const barW = Math.max(1, Math.min(14, innerW / points.length - 1));

  // Time-axis labels: about one per 90px.
  const labelEvery = Math.max(1, Math.round(points.length / Math.max(2, Math.floor(innerW / 90))));
  const axisIdx = points.map((_, i) => i).filter((i) => i % labelEvery === 0);
  // Keep the first and last labels inside the chart instead of clipped.
  const anchorFor = (i: number) => (x(i) < PAD.left + 28 ? "start" : x(i) > width - PAD.right - 28 ? "end" : "middle");

  const onMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = (e.clientX - rect.left - PAD.left) / (innerW || 1);
    setActive(Math.max(0, Math.min(points.length - 1, Math.round(frac * (points.length - 1)))));
  };

  const hoverPoint = active !== null ? points[active] : null;

  // Pieces of the temperature band: filled area between low and high, plus the two lines.
  const bandRuns = runs(points.map((p, i) => (p.high !== null && p.low !== null ? i : null)));
  const bandPath = bandRuns
    .map(
      (r) =>
        r.map((i, k) => `${k ? "L" : "M"}${x(i).toFixed(1)} ${ty(points[i].high as number).toFixed(1)}`).join(" ") +
        " " +
        [...r].reverse().map((i) => `L${x(i).toFixed(1)} ${ty(points[i].low as number).toFixed(1)}`).join(" ") +
        " Z"
    )
    .join(" ");
  const linePath = (values: (number | null)[]) =>
    runs(values)
      .map((r) => r.map((i, k) => `${k ? "L" : "M"}${x(i).toFixed(1)} ${ty(values[i] as number).toFixed(1)}`).join(" "))
      .join(" ");

  return (
    <div className="history-charts" ref={ref}>
      <div className="history-readout">
        {hoverPoint ? (
          <>
            <strong>{label(hoverPoint.key, grain)}</strong>
            <span className="hi">High {hoverPoint.high !== null ? `${Math.round(hoverPoint.high)}°F` : "-"}</span>
            <span className="lo">Low {hoverPoint.low !== null ? `${Math.round(hoverPoint.low)}°F` : "-"}</span>
            <span>Rain {hoverPoint.rain !== null ? `${hoverPoint.rain.toFixed(2)} in` : "-"}</span>
          </>
        ) : (
          <span className="muted">
            Point at the chart for details{grain === "month" ? " (monthly averages and rain totals)" : ""}.
          </span>
        )}
      </div>

      {width > 0 && (
        <>
          <svg width={width} height={TEMP_HEIGHT} onPointerMove={onMove} onPointerLeave={() => setActive(null)} role="img"
            aria-label="High and low temperature over time">
            {tTicks.map((v) => (
              <g key={v}>
                <line x1={PAD.left} x2={width - PAD.right} y1={ty(v)} y2={ty(v)} className="hist-grid" />
                <text x={PAD.left - 6} y={ty(v)} className="hist-axis" textAnchor="end" dominantBaseline="central">{v}°</text>
              </g>
            ))}
            <path d={bandPath} className="hist-band" />
            <path d={linePath(highs)} className="hist-line hist-line--high" />
            <path d={linePath(lows)} className="hist-line hist-line--low" />
            {axisIdx.map((i) => (
              <text key={i} x={x(i)} y={TEMP_HEIGHT - 6} className="hist-axis" textAnchor={anchorFor(i)}>{shortLabel(points[i].key, grain)}</text>
            ))}
            {active !== null && <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={TEMP_HEIGHT - PAD.bottom} className="hist-cursor" />}
          </svg>

          <svg width={width} height={RAIN_HEIGHT} onPointerMove={onMove} onPointerLeave={() => setActive(null)} role="img"
            aria-label="Rainfall over time">
            {rTicks.map((v) => (
              <g key={v}>
                <line x1={PAD.left} x2={width - PAD.right} y1={ry(v)} y2={ry(v)} className="hist-grid" />
                <text x={PAD.left - 6} y={ry(v)} className="hist-axis" textAnchor="end" dominantBaseline="central">{v.toFixed(v < 1 ? 1 : 0)}"</text>
              </g>
            ))}
            {points.map((p, i) =>
              p.rain && p.rain > 0 ? (
                <rect key={p.key} x={x(i) - barW / 2} y={ry(p.rain)} width={barW} height={ry(0) - ry(p.rain)} className="hist-rain" />
              ) : null
            )}
            {axisIdx.map((i) => (
              <text key={i} x={x(i)} y={RAIN_HEIGHT - 6} className="hist-axis" textAnchor={anchorFor(i)}>{shortLabel(points[i].key, grain)}</text>
            ))}
            {active !== null && <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={RAIN_HEIGHT - PAD.bottom} className="hist-cursor" />}
          </svg>
        </>
      )}
    </div>
  );
}
