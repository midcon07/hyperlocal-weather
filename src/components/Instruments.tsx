import { useId } from "react";
import type { ReactNode } from "react";
import { fmt } from "../lib/format";

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
  value: string;
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

// ---- Barometer: round aneroid dial, 28.5-31.0 inHg over a 240 degree sweep.

const BARO_MIN = 28.5;
const BARO_MAX = 31.0;
const SWEEP = 120; // degrees either side of straight up

function baroAngle(inHg: number) {
  const f = (clamp(inHg, BARO_MIN, BARO_MAX) - BARO_MIN) / (BARO_MAX - BARO_MIN);
  return -SWEEP + f * SWEEP * 2;
}

export function Barometer({ inHg }: { inHg: number | null }) {
  const ticks = [];
  for (let v = 28.5; v <= 31.001; v += 0.1) {
    const angle = baroAngle(v);
    const major = Math.abs(v * 2 - Math.round(v * 2)) < 0.01;
    const outer = polar(50, 50, 38, angle);
    const inner = polar(50, 50, major ? 31 : 34, angle);
    ticks.push(
      <line key={v.toFixed(1)} x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y}
        className={major ? "baro-tick-major" : "baro-tick"} />
    );
  }
  const labels = [29, 30, 31].map((v) => {
    const p = polar(50, 50, 23, baroAngle(v));
    return (
      <text key={v} x={p.x} y={p.y} className="dial-num" textAnchor="middle" dominantBaseline="central">
        {v}
      </text>
    );
  });
  const needleAngle = inHg === null ? baroAngle(29.92) : baroAngle(inHg);

  return (
    <Tile label="Barometer" value={fmt(inHg, 2, " inHg")} sub={inHg === null ? undefined : pressureWord(inHg)}>
      <svg viewBox="0 0 100 100" role="img" aria-label={`Barometer ${fmt(inHg, 2, " inHg")}`}>
        <circle cx="50" cy="50" r="46" className="dial-bezel" />
        <circle cx="50" cy="50" r="42" className="dial-face" />
        {ticks}
        {labels}
        <text x="29" y="79" className="dial-word" textAnchor="middle">RAIN</text>
        <text x="71" y="79" className="dial-word" textAnchor="middle">FAIR</text>
        <g className="needle" style={{ transform: `rotate(${needleAngle}deg)`, transformOrigin: "50px 50px" }}>
          <line x1="50" y1="58" x2="50" y2="14" className="needle-line" />
        </g>
        <circle cx="50" cy="50" r="3.2" className="needle-hub" />
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
