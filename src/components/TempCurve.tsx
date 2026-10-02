import { useEffect, useId, useRef, useState } from "react";
import type { NwsHourlyPeriod } from "../types/weather";

interface Props {
  hourly: NwsHourlyPeriod[];
}

const HEIGHT = 190;
const PAD = { left: 16, right: 16, top: 40, bottom: 28 };

const hourFmt = new Intl.DateTimeFormat("en-US", { hour: "numeric" });

function useElementWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const observer = new ResizeObserver(() => setWidth(el.clientWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}

// Smooth curve through the points that never overshoots between them
// (monotone cubic), so a flat afternoon doesn't sprout fake bumps.
function smoothPath(pts: { x: number; y: number }[]) {
  const n = pts.length;
  if (n < 2) return "";
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1].x - pts[i].x);
    slope.push((pts[i + 1].y - pts[i].y) / dx[i]);
  }
  const tangent: number[] = [slope[0]];
  for (let i = 1; i < n - 1; i++) {
    tangent.push(slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2);
  }
  tangent.push(slope[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      tangent[i] = 0;
      tangent[i + 1] = 0;
      continue;
    }
    const a = tangent[i] / slope[i];
    const b = tangent[i + 1] / slope[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      tangent[i] = t * a * slope[i];
      tangent[i + 1] = t * b * slope[i];
    }
  }
  let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const c1x = pts[i].x + dx[i] / 3;
    const c1y = pts[i].y + (tangent[i] * dx[i]) / 3;
    const c2x = pts[i + 1].x - dx[i] / 3;
    const c2y = pts[i + 1].y - (tangent[i + 1] * dx[i]) / 3;
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${pts[i + 1].x.toFixed(1)} ${pts[i + 1].y.toFixed(1)}`;
  }
  return d;
}

export function TempCurve({ hourly: allHourly }: Props) {
  const id = useId();
  const { ref, width } = useElementWidth();

  // If only the bot's older snapshot is available, skip hours already past
  // so "Now" really is the current hour.
  const cutoff = Date.now() - 3600000;
  const hourly = allHourly.filter((p) => new Date(p.startTime).getTime() > cutoff);

  if (hourly.length < 3) return null;

  const temps = hourly.map((p) => p.temperature);
  const unit = hourly[0].temperatureUnit;
  const hiIdx = temps.indexOf(Math.max(...temps));
  const loIdx = temps.indexOf(Math.min(...temps));
  const hi = temps[hiIdx];
  const lo = temps[loIdx];

  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const spread = Math.max(6, hi - lo);
  const yMin = lo - spread * 0.12;
  const yMax = hi + spread * 0.12;
  const xAt = (i: number) => PAD.left + (innerW * i) / (hourly.length - 1);
  const yAt = (t: number) => PAD.top + innerH * (1 - (t - yMin) / (yMax - yMin));
  const pts = hourly.map((p, i) => ({ x: xAt(i), y: yAt(p.temperature) }));

  const spacing = innerW / (hourly.length - 1);
  const labelStep = spacing * 3 >= 54 ? 3 : 6;
  const baseline = HEIGHT - PAD.bottom;
  const line = width > 0 ? smoothPath(pts) : "";
  const area = line ? `${line} L${pts[pts.length - 1].x.toFixed(1)} ${baseline} L${pts[0].x.toFixed(1)} ${baseline} Z` : "";

  const hourOf = (i: number) => hourFmt.format(new Date(hourly[i].startTime));

  return (
    <section className="card temp-curve">
      <h2>Next 24 Hours</h2>
      <div className="temp-curve-summary">
        <span className="hi">High {hi}°{unit} <small>around {hourOf(hiIdx)}</small></span>
        <span className="lo">Low {lo}°{unit} <small>around {hourOf(loIdx)}</small></span>
      </div>
      <div className="temp-curve-plot" ref={ref}>
        {width > 0 && (
          <svg width={width} height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`} role="img"
            aria-label={`Temperature over the next 24 hours, high ${hi}, low ${lo}`}>
            <defs>
              <linearGradient id={`${id}-stroke`} gradientUnits="userSpaceOnUse" x1="0" y1={PAD.top} x2="0" y2={baseline}>
                <stop offset="0" stopColor="#f2683c" />
                <stop offset="0.5" stopColor="#f5b83c" />
                <stop offset="1" stopColor="#3b9ae8" />
              </linearGradient>
              <linearGradient id={`${id}-fill`} gradientUnits="userSpaceOnUse" x1="0" y1={PAD.top} x2="0" y2={baseline}>
                <stop offset="0" stopColor="#f2683c" stopOpacity="0.32" />
                <stop offset="0.5" stopColor="#f5b83c" stopOpacity="0.18" />
                <stop offset="1" stopColor="#3b9ae8" stopOpacity="0.06" />
              </linearGradient>
            </defs>

            <line x1={PAD.left} y1={baseline} x2={width - PAD.right} y2={baseline} className="curve-axis" />
            <path d={area} fill={`url(#${id}-fill)`} />
            <path d={line} className="curve-line" stroke={`url(#${id}-stroke)`} />

            {/* Current hour */}
            <line x1={pts[0].x} y1={PAD.top - 6} x2={pts[0].x} y2={baseline} className="curve-now" />

            {hourly.map((p, i) =>
              i % labelStep === 0 ? (
                <g key={p.startTime}>
                  <text x={xAt(i)} y={baseline + 17} className="curve-hour" textAnchor={i === 0 ? "start" : "middle"}>
                    {i === 0 ? "Now" : hourOf(i)}
                  </text>
                  {i !== hiIdx && i !== loIdx && (
                    <text x={xAt(i)} y={pts[i].y - 9} className="curve-temp" textAnchor={i === 0 ? "start" : "middle"}>
                      {p.temperature}°
                    </text>
                  )}
                </g>
              ) : null
            )}

            <circle cx={pts[0].x} cy={pts[0].y} r="4.5" className="curve-now-dot" />
            <circle cx={pts[hiIdx].x} cy={pts[hiIdx].y} r="5" className="curve-hi-dot" />
            <circle cx={pts[loIdx].x} cy={pts[loIdx].y} r="5" className="curve-lo-dot" />
            <text x={clampX(pts[hiIdx].x, width)} y={pts[hiIdx].y - 11} className="curve-extreme curve-extreme-hi" textAnchor="middle">
              H {hi}°
            </text>
            <text x={clampX(pts[loIdx].x, width)} y={pts[loIdx].y + 20} className="curve-extreme curve-extreme-lo" textAnchor="middle">
              L {lo}°
            </text>
          </svg>
        )}
      </div>
    </section>
  );
}

// Keeps the high/low labels from running off either edge.
function clampX(x: number, width: number) {
  return Math.min(width - 24, Math.max(24, x));
}
