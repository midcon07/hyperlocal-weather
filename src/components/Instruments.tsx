import { useId } from "react";
import type { ReactNode } from "react";
import { fmt } from "../lib/format";
import type { SunTimes } from "../lib/sky";

// Small drawn instruments (barometer, rain gauge, hygrometer, UV meter)
// in place of plain text rows. Colors come from the theme variables, so
// the same SVGs work on the day and night cards.

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

// Angle in degrees measured clockwise from straight up.
function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.sin(a), y: cy - r * Math.cos(a) };
}

function arcPath(cx: number, cy: number, r: number, fromDeg: number, toDeg: number) {
  const start = polar(cx, cy, r, fromDeg);
  const end = polar(cx, cy, r, toDeg);
  const large = toDeg - fromDeg > 180 ? 1 : 0;
  return `M${start.x.toFixed(2)} ${start.y.toFixed(2)} A${r} ${r} 0 ${large} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

interface TileProps {
  label: string;
  value: ReactNode;
  sub?: string;
  children: ReactNode;
}

function Tile({ label, value, sub, children }: TileProps) {
  return (
    <div className="instrument">
      <div className="instrument-label">{label}</div>
      <div className="instrument-art">{children}</div>
      <div className="instrument-value">{value}</div>
      <div className="instrument-sub">{sub ?? " "}</div>
    </div>
  );
}

// ---- Sun arc: today's sunrise-to-sunset path with the sun's current spot.

const ARC_X0 = 20;
const ARC_X1 = 280;
const ARC_BASE = 66;
const ARC_PEAK = 52;

function arcPoint(f: number) {
  return { x: ARC_X0 + (ARC_X1 - ARC_X0) * f, y: ARC_BASE - ARC_PEAK * Math.sin(Math.PI * f) };
}

function arcPolyline(from: number, to: number) {
  const pts = [];
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const p = arcPoint(from + ((to - from) * i) / steps);
    pts.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
  }
  return pts.join(" ");
}

const clockFmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

function duration(ms: number) {
  const mins = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function SunArc({ times, now }: { times: SunTimes | null; now: Date }) {
  if (!times) return null;
  const { sunrise, sunset } = times;
  const total = sunset.getTime() - sunrise.getTime();
  const raw = (now.getTime() - sunrise.getTime()) / total;
  const isUp = raw >= 0 && raw <= 1;
  const f = clamp(raw, 0, 1);
  const sun = arcPoint(f);

  let status: string;
  if (isUp) status = `Sunset in ${duration(sunset.getTime() - now.getTime())}`;
  else if (raw < 0) status = `Sunrise in ${duration(sunrise.getTime() - now.getTime())}`;
  else status = `Sunrise in ${duration(sunrise.getTime() + 86400000 - now.getTime())}`;

  return (
    <div className="sun-strip">
      <div className="instrument-label">Sun</div>
      <svg viewBox="0 0 300 80" role="img" aria-label={`Sunrise ${clockFmt.format(sunrise)}, sunset ${clockFmt.format(sunset)}`}>
        <line x1="6" y1={ARC_BASE} x2="294" y2={ARC_BASE} className="sun-horizon" />
        <polyline points={arcPolyline(0, 1)} className="sun-track" />
        {isUp && f > 0 && <polyline points={arcPolyline(0, f)} className="sun-track-done" />}
        <circle cx={arcPoint(0).x} cy={ARC_BASE} r="4" className="sun-end" />
        <circle cx={arcPoint(1).x} cy={ARC_BASE} r="4" className="sun-end" />
        {isUp && (
          <g>
            <circle cx={sun.x} cy={sun.y} r="11" className="sun-glow" />
            <circle cx={sun.x} cy={sun.y} r="6.5" className="sun-dot" />
          </g>
        )}
      </svg>
      <div className="sun-times">
        <div>
          <strong>{clockFmt.format(sunrise)}</strong>
          <span>Sunrise</span>
        </div>
        <div className="sun-center">
          <strong>{duration(total)}</strong>
          <span>{status}</span>
        </div>
        <div>
          <strong>{clockFmt.format(sunset)}</strong>
          <span>Sunset</span>
        </div>
      </div>
    </div>
  );
}

// ---- Barometer: antique brass aneroid, 28.5-31.0 inHg over a 240 degree
// sweep. Colors are fixed (not theme variables) -- it's meant to look like
// a cream porcelain dial in a brass case on both the day and night cards.

const BARO_MIN = 28.5;
const BARO_MAX = 31.0;
const SWEEP = 120; // degrees either side of straight up

function baroAngle(inHg: number) {
  const f = (clamp(inHg, BARO_MIN, BARO_MAX) - BARO_MIN) / (BARO_MAX - BARO_MIN);
  return -SWEEP + f * SWEEP * 2;
}

// The traditional weather words, each centered over its pressure range.
const BARO_WORDS: { text: string; center: number }[] = [
  { text: "STORMY", center: -95 },
  { text: "RAIN", center: -46 },
  { text: "CHANGE", center: 0 },
  { text: "FAIR", center: 46 },
  { text: "VERY DRY", center: 96 },
];

export type PressureTrend = {
  direction: "rising" | "falling" | "steady";
  rate: "slowly" | "" | "rapidly";
  label: string;
};

// Classifies the 3-hour barometer change (inHg) the way weather desks do.
export function pressureTrend(change: number | null | undefined): PressureTrend | null {
  if (change === null || change === undefined) return null;
  const size = Math.abs(change);
  if (size < 0.02) return { direction: "steady", rate: "", label: "Steady" };
  const rate = size >= 0.12 ? "rapidly" : size >= 0.06 ? "" : "slowly";
  const direction = change > 0 ? "rising" : "falling";
  const word = direction === "rising" ? "Rising" : "Falling";
  return { direction, rate, label: rate ? `${word} ${rate}` : word };
}

function TrendArrow({ trend }: { trend: PressureTrend }) {
  if (trend.direction === "steady") {
    return (
      <svg className="trend-arrow trend-steady" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <path d="M2 8h11M9.5 4.5 13 8l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  const up = trend.direction === "rising";
  // Down arrows are the up arrow flipped vertically.
  const flip = up ? undefined : "translate(0 16) scale(1 -1)";
  return (
    <svg className={`trend-arrow trend-${trend.direction}`} viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <g transform={flip} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 14V3M4 7l4-4 4 4" />
        {trend.rate === "rapidly" && <path d="M4 11.5l4-4 4 4" opacity="0.55" />}
      </g>
    </svg>
  );
}

export function Barometer({ inHg, trendInHg }: { inHg: number | null; trendInHg?: number | null }) {
  const id = useId();
  const trend = pressureTrend(trendInHg);

  const ticks = [];
  for (let v = 28.5; v <= 31.001; v += 0.1) {
    const angle = baroAngle(v);
    const major = Math.abs(v * 2 - Math.round(v * 2)) < 0.01;
    const outer = polar(50, 50, 40, angle);
    const inner = polar(50, 50, major ? 34.5 : 37, angle);
    ticks.push(
      <line key={v.toFixed(1)} x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y}
        className={major ? "antique-tick-major" : "antique-tick"} />
    );
  }
  const numerals = [29, 30, 31].map((v) => {
    const p = polar(50, 50, 30.5, baroAngle(v));
    return (
      <text key={v} x={p.x} y={p.y} className="antique-num" textAnchor="middle" dominantBaseline="central">
        {v}
      </text>
    );
  });
  const words = BARO_WORDS.map((w) => (
    <g key={w.text}>
      <path id={`${id}-${w.text}`} d={arcPath(50, 50, 24, w.center - 50, w.center + 50)} fill="none" />
      <text className="antique-word">
        <textPath href={`#${id}-${w.text}`} startOffset="50%" textAnchor="middle">{w.text}</textPath>
      </text>
    </g>
  ));

  const reading = inHg ?? 29.92;
  const needleAngle = baroAngle(reading);
  // The brass tell-tale hand parks at the pressure three hours ago.
  const pastAngle = trendInHg === null || trendInHg === undefined || inHg === null ? null : baroAngle(inHg - trendInHg);

  return (
    <Tile
      label="Barometer"
      value={
        <>
          {fmt(inHg, 2, " inHg")}
          {trend && <TrendArrow trend={trend} />}
        </>
      }
      sub={trend ? trend.label : inHg === null ? undefined : pressureWord(inHg)}
    >
      <svg viewBox="0 0 100 100" role="img" aria-label={`Barometer ${fmt(inHg, 2, " inHg")}${trend ? `, ${trend.label.toLowerCase()}` : ""}`}>
        <defs>
          <radialGradient id={`${id}-brass`} cx="35%" cy="28%" r="85%">
            <stop offset="0" stopColor="#f3d98a" />
            <stop offset="0.45" stopColor="#c99a3d" />
            <stop offset="1" stopColor="#7a5418" />
          </radialGradient>
          <radialGradient id={`${id}-face`} cx="50%" cy="45%" r="62%">
            <stop offset="0.55" stopColor="#fbf5e3" />
            <stop offset="1" stopColor="#e6dabb" />
          </radialGradient>
        </defs>
        {/* Case: brass bezel with a beaded edge and a turned inner rim */}
        <circle cx="50" cy="50" r="48" fill={`url(#${id}-brass)`} stroke="#5e4012" strokeWidth="0.8" />
        <circle cx="50" cy="50" r="45.6" fill="none" stroke="#f6e3a4" strokeWidth="0.9" strokeDasharray="0.1 2.2" strokeLinecap="round" />
        <circle cx="50" cy="50" r="43.4" fill="none" stroke="#6b4a14" strokeWidth="0.7" />
        <circle cx="50" cy="50" r="42.2" fill="none" stroke="#f2d889" strokeWidth="0.6" />
        {/* Porcelain dial */}
        <circle cx="50" cy="50" r="41.5" fill={`url(#${id}-face)`} stroke="#3b2b0e" strokeWidth="0.8" />
        {ticks}
        {numerals}
        {words}
        <text x="50" y="68" className="antique-name" textAnchor="middle">ANEROID</text>
        <text x="50" y="74" className="antique-name-small" textAnchor="middle">IRONWOOD</text>
        {/* Brass set-hand showing the pressure three hours ago */}
        {pastAngle !== null && (
          <g className="needle" style={{ transform: `rotate(${pastAngle}deg)`, transformOrigin: "50px 50px" }}>
            <line x1="50" y1="50" x2="50" y2="14.5" stroke="#b8862b" strokeWidth="1.1" strokeLinecap="round" />
            <circle cx="50" cy="14.5" r="1.6" fill="#d9a840" stroke="#7a5418" strokeWidth="0.5" />
          </g>
        )}
        {/* Blued-steel spade hand */}
        <g className="needle" style={{ transform: `rotate(${needleAngle}deg)`, transformOrigin: "50px 50px" }}>
          <line x1="50" y1="58" x2="50" y2="26" stroke="#1d2f52" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M50 12.5 L53.4 20.2 L50 27.5 L46.6 20.2 Z" fill="#26407a" stroke="#101c36" strokeWidth="0.5" />
          <circle cx="50" cy="20.2" r="1.3" fill="#fbf5e3" stroke="#101c36" strokeWidth="0.4" />
        </g>
        <circle cx="50" cy="50" r="3.3" fill={`url(#${id}-brass)`} stroke="#5e4012" strokeWidth="0.6" />
        <circle cx="50" cy="50" r="1" fill="#2a1d08" />
        {/* Glass glint */}
        <path d={arcPath(50, 50, 38, -62, -18)} fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    </Tile>
  );
}

function pressureWord(inHg: number) {
  if (inHg < 29.5) return "Low";
  if (inHg < 29.8) return "Falling weather";
  if (inHg < 30.2) return "Steady";
  return "High";
}

// ---- Rain gauge: clear tube with a fill and a scale that grows as needed.

export function RainGauge({ todayIn, rateInPerHr }: { todayIn: number | null; rateInPerHr: number | null }) {
  const today = todayIn ?? 0;
  const max = today <= 0.5 ? 0.5 : today <= 1 ? 1 : Math.ceil(today);
  const fraction = clamp(today / max, 0, 1);
  const top = 10;
  const bottom = 92;
  const height = bottom - top;
  const fillHeight = fraction * height;
  const raining = (rateInPerHr ?? 0) > 0;
  const clipId = useId();

  const marks = [];
  const step = max <= 0.5 ? 0.1 : max <= 1 ? 0.25 : 0.5;
  for (let v = 0; v <= max + 0.0001; v += step) {
    const y = bottom - (v / max) * height;
    const whole = Math.abs(v - Math.round(v)) < 0.0001 || max <= 0.5 || Math.abs(v * 4 - Math.round(v * 4)) < 0.001;
    marks.push(
      <g key={v.toFixed(2)}>
        <line x1="58" y1={y} x2={whole ? 68 : 64} y2={y} className="baro-tick-major" />
        {whole && (
          <text x="72" y={y} className="dial-num" dominantBaseline="central" fontSize="8">
            {v.toFixed(max <= 0.5 ? 1 : 2).replace(/\.?0+$/, "") || "0"}
          </text>
        )}
      </g>
    );
  }

  return (
    <Tile
      label="Rain today"
      value={fmt(todayIn, 2, " in")}
      sub={raining ? `Raining ${fmt(rateInPerHr, 2, " in/hr")}` : "Rate 0.00 in/hr"}
    >
      <svg viewBox="-6 0 100 100" role="img" aria-label={`Rain today ${fmt(todayIn, 2, " in")}`}>
        <defs>
          <clipPath id={clipId}>
            <rect x="30" y={top} width="22" height={height} rx="4" />
          </clipPath>
        </defs>
        <rect x="30" y={top} width="22" height={height} rx="4" className="gauge-tube" />
        <g clipPath={`url(#${clipId})`}>
          <rect x="30" y={bottom - fillHeight} width="22" height={fillHeight} className="gauge-water"
            style={{ transition: "y 0.6s ease, height 0.6s ease" }} />
          {fillHeight > 0 && (
            <rect x="30" y={bottom - fillHeight} width="22" height="2" className="gauge-water-top" />
          )}
        </g>
        <rect x="30" y={top} width="22" height={height} rx="4" className="gauge-outline" />
        {marks}
        {raining && (
          <>
            <circle cx="41" cy="2" r="1.6" className="rain-drop rain-drop-1" />
            <circle cx="36" cy="2" r="1.3" className="rain-drop rain-drop-2" />
            <circle cx="46" cy="2" r="1.3" className="rain-drop rain-drop-3" />
          </>
        )}
      </svg>
    </Tile>
  );
}

// ---- Hygrometer: a droplet that fills to the humidity percentage.

const DROP_PATH = "M50 8 C50 8 22 42 22 62 A28 28 0 0 0 78 62 C78 42 50 8 50 8 Z";

export function Hygrometer({ pct }: { pct: number | null }) {
  const clipId = useId();
  const fraction = clamp((pct ?? 0) / 100, 0, 1);
  // Droplet spans y=8..90.
  const fillTop = 90 - fraction * 82;

  return (
    <Tile label="Humidity" value={fmt(pct, 0, "%")} sub={pct === null ? undefined : humidityWord(pct)}>
      <svg viewBox="0 0 100 100" role="img" aria-label={`Humidity ${fmt(pct, 0, "%")}`}>
        <defs>
          <clipPath id={clipId}>
            <path d={DROP_PATH} />
          </clipPath>
        </defs>
        <path d={DROP_PATH} className="drop-bg" />
        <g clipPath={`url(#${clipId})`}>
          <rect x="0" y={fillTop} width="100" height="100" className="drop-fill"
            style={{ transition: "y 0.6s ease" }} />
          <path
            d={`M0 ${fillTop} Q 12.5 ${fillTop - 3} 25 ${fillTop} T 50 ${fillTop} T 75 ${fillTop} T 100 ${fillTop} V 100 H 0 Z`}
            className="drop-fill drop-wave"
          />
        </g>
        <path d={DROP_PATH} className="drop-outline" />
      </svg>
    </Tile>
  );
}

function humidityWord(pct: number) {
  if (pct < 30) return "Dry";
  if (pct < 60) return "Comfortable";
  if (pct < 80) return "Humid";
  return "Very humid";
}

// ---- UV meter: half-circle with the standard EPA color bands, 0-12.

const UV_BANDS: { from: number; to: number; color: string }[] = [
  { from: 0, to: 3, color: "#4caf50" },
  { from: 3, to: 6, color: "#f2c230" },
  { from: 6, to: 8, color: "#f28c28" },
  { from: 8, to: 11, color: "#e0463c" },
  { from: 11, to: 12, color: "#8e5bd0" },
];

const UV_MAX = 12;

function uvAngle(uv: number) {
  return -SWEEP + (clamp(uv, 0, UV_MAX) / UV_MAX) * SWEEP * 2;
}

function uvWord(uv: number) {
  if (uv < 3) return "Low";
  if (uv < 6) return "Moderate";
  if (uv < 8) return "High";
  if (uv < 11) return "Very high";
  return "Extreme";
}

export function UvMeter({ uv }: { uv: number | null }) {
  return (
    <Tile label="UV index" value={fmt(uv, 1)} sub={uv === null ? undefined : uvWord(uv)}>
      <svg viewBox="0 0 100 100" role="img" aria-label={`UV index ${fmt(uv, 1)}`}>
        {UV_BANDS.map((b) => (
          <path key={b.from} d={arcPath(50, 52, 38, uvAngle(b.from) + (b.from === 0 ? 0 : 1), uvAngle(b.to) - 1)}
            stroke={b.color} className="uv-band" />
        ))}
        {[0, 3, 6, 9, 12].map((v) => {
          const p = polar(50, 52, 23, uvAngle(v));
          return (
            <text key={v} x={p.x} y={p.y} className="dial-num" fontSize="7" textAnchor="middle" dominantBaseline="central">
              {v}
            </text>
          );
        })}
        <g className="needle" style={{ transform: `rotate(${uvAngle(uv ?? 0)}deg)`, transformOrigin: "50px 52px" }}>
          <line x1="50" y1="58" x2="50" y2="20" className="needle-line" />
        </g>
        <circle cx="50" cy="52" r="3.2" className="needle-hub" />
      </svg>
    </Tile>
  );
}
