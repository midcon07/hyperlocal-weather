import { useId } from "react";
import type { ReactNode } from "react";
import { fmt } from "../lib/format";

// Drawn instruments in the style of 1880s brass-and-porcelain hardware
// (barometer, hygrometer, UV dial, copper rain gauge, glass thermometer).
// The instrument faces use fixed period colors rather than theme variables
// so they look like real objects on both the day and night cards.

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

// Angle in degrees measured clockwise from straight up.
export function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.sin(a), y: cy - r * Math.cos(a) };
}

export function arcPath(cx: number, cy: number, r: number, fromDeg: number, toDeg: number) {
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

// ---- Shared brass dial parts

const SWEEP = 120; // degrees either side of straight up (a 240 degree dial)

function dialAngle(value: number, min: number, max: number) {
  return -SWEEP + ((clamp(value, min, max) - min) / (max - min)) * SWEEP * 2;
}

// Brass bezel with a beaded edge, turned inner rims and a porcelain face.
function BrassCase({ id }: { id: string }) {
  return (
    <>
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
      <circle cx="50" cy="50" r="48" fill={`url(#${id}-brass)`} stroke="#5e4012" strokeWidth="0.8" />
      <circle cx="50" cy="50" r="45.6" fill="none" stroke="#f6e3a4" strokeWidth="0.9" strokeDasharray="0.1 2.2" strokeLinecap="round" />
      <circle cx="50" cy="50" r="43.4" fill="none" stroke="#6b4a14" strokeWidth="0.7" />
      <circle cx="50" cy="50" r="42.2" fill="none" stroke="#f2d889" strokeWidth="0.6" />
      <circle cx="50" cy="50" r="41.5" fill={`url(#${id}-face)`} stroke="#3b2b0e" strokeWidth="0.8" />
    </>
  );
}

function GlassGlint() {
  return <path d={arcPath(50, 50, 38, -62, -18)} fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="2.2" strokeLinecap="round" />;
}

function DialHub({ id }: { id: string }) {
  return (
    <>
      <circle cx="50" cy="50" r="3.3" fill={`url(#${id}-brass)`} stroke="#5e4012" strokeWidth="0.6" />
      <circle cx="50" cy="50" r="1" fill="#2a1d08" />
    </>
  );
}

// Blued-steel spade hand (or a red-lacquered one) pointing up, rotated.
function SpadeHand({ angle, fill = "#26407a", edge = "#101c36", tip = 12.5 }: { angle: number; fill?: string; edge?: string; tip?: number }) {
  const bodyBottom = tip + 15;
  const mid = tip + 7.7;
  return (
    <g className="needle" style={{ transform: `rotate(${angle}deg)`, transformOrigin: "50px 50px" }}>
      <line x1="50" y1="58" x2="50" y2={bodyBottom - 1} stroke={edge} strokeWidth="1.3" strokeLinecap="round" />
      <path d={`M50 ${tip} L53.4 ${tip + 7.7} L50 ${bodyBottom} L46.6 ${tip + 7.7} Z`} fill={fill} stroke={edge} strokeWidth="0.5" />
      <circle cx="50" cy={mid} r="1.3" fill="#fbf5e3" stroke={edge} strokeWidth="0.4" />
    </g>
  );
}

interface DialTicks {
  min: number;
  max: number;
  step: number;
  /** Every Nth tick is a major (longer, bolder) tick. */
  majorEvery: number;
}

function Ticks({ min, max, step, majorEvery }: DialTicks) {
  const out = [];
  const count = Math.round((max - min) / step);
  for (let i = 0; i <= count; i++) {
    const v = min + i * step;
    const angle = dialAngle(v, min, max);
    const major = i % majorEvery === 0;
    const outer = polar(50, 50, 40, angle);
    const inner = polar(50, 50, major ? 34.5 : 37, angle);
    out.push(
      <line key={i} x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y}
        className={major ? "antique-tick-major" : "antique-tick"} />
    );
  }
  return <>{out}</>;
}

function Numerals({ values, min, max, radius = 30.5 }: { values: number[]; min: number; max: number; radius?: number }) {
  return (
    <>
      {values.map((v) => {
        const p = polar(50, 50, radius, dialAngle(v, min, max));
        return (
          <text key={v} x={p.x} y={p.y} className="antique-num" textAnchor="middle" dominantBaseline="central">
            {v}
          </text>
        );
      })}
    </>
  );
}

// Words printed along an arc, each centered at a dial angle.
function ArcWords({ id, words, radius = 24 }: { id: string; words: { text: string; center: number }[]; radius?: number }) {
  return (
    <>
      {words.map((w) => (
        <g key={w.text}>
          <path id={`${id}-${w.text}`} d={arcPath(50, 50, radius, w.center - 50, w.center + 50)} fill="none" />
          <text className="antique-word">
            <textPath href={`#${id}-${w.text}`} startOffset="50%" textAnchor="middle">{w.text}</textPath>
          </text>
        </g>
      ))}
    </>
  );
}

// ---- Barometer: 28.5-31.0 inHg

const BARO_MIN = 28.5;
const BARO_MAX = 31.0;

// The traditional weather words, each centered over its pressure range.
const BARO_WORDS = [
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

function pressureWord(inHg: number) {
  if (inHg < 29.5) return "Low";
  if (inHg < 29.8) return "Falling weather";
  if (inHg < 30.2) return "Steady";
  return "High";
}

export function Barometer({ inHg, trendInHg }: { inHg: number | null; trendInHg?: number | null }) {
  const id = useId();
  const trend = pressureTrend(trendInHg);
  const needleAngle = dialAngle(inHg ?? 29.92, BARO_MIN, BARO_MAX);
  // The brass tell-tale hand parks at the pressure three hours ago.
  const pastAngle =
    trendInHg === null || trendInHg === undefined || inHg === null
      ? null
      : dialAngle(inHg - trendInHg, BARO_MIN, BARO_MAX);

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
        <BrassCase id={id} />
        <Ticks min={BARO_MIN} max={BARO_MAX} step={0.1} majorEvery={5} />
        <Numerals values={[29, 30, 31]} min={BARO_MIN} max={BARO_MAX} />
        <ArcWords id={id} words={BARO_WORDS} />
        <text x="50" y="68" className="antique-name" textAnchor="middle">ANEROID</text>
        <text x="50" y="74" className="antique-name-small" textAnchor="middle">IRONWOOD</text>
        {pastAngle !== null && (
          <g className="needle" style={{ transform: `rotate(${pastAngle}deg)`, transformOrigin: "50px 50px" }}>
            <line x1="50" y1="50" x2="50" y2="14.5" stroke="#b8862b" strokeWidth="1.1" strokeLinecap="round" />
            <circle cx="50" cy="14.5" r="1.6" fill="#d9a840" stroke="#7a5418" strokeWidth="0.5" />
          </g>
        )}
        <SpadeHand angle={needleAngle} />
        <DialHub id={id} />
        <GlassGlint />
      </svg>
    </Tile>
  );
}

// ---- Hygrometer: 0-100 % relative humidity, same brass case in red-hand style.

const HYGRO_WORDS = [
  { text: "DRY", center: -92 },
  { text: "COMFORT", center: 0 },
  { text: "DAMP", center: 90 },
];

function humidityWord(pct: number) {
  if (pct < 30) return "Dry";
  if (pct < 60) return "Comfortable";
  if (pct < 80) return "Humid";
  return "Very humid";
}

export function Hygrometer({ pct }: { pct: number | null }) {
  const id = useId();
  return (
    <Tile label="Humidity" value={fmt(pct, 0, "%")} sub={pct === null ? undefined : humidityWord(pct)}>
      <svg viewBox="0 0 100 100" role="img" aria-label={`Humidity ${fmt(pct, 0, "%")}`}>
        <BrassCase id={id} />
        {/* Comfort band, 30-60 percent */}
        <path d={arcPath(50, 50, 36.2, dialAngle(30, 0, 100), dialAngle(60, 0, 100))}
          fill="none" stroke="#8cc29a" strokeWidth="1.8" strokeLinecap="butt" strokeOpacity="0.85" />
        <Ticks min={0} max={100} step={5} majorEvery={2} />
        <Numerals values={[0, 20, 40, 60, 80, 100]} min={0} max={100} radius={30} />
        <ArcWords id={id} words={HYGRO_WORDS} radius={21} />
        <text x="50" y="69" className="antique-name" textAnchor="middle" style={{ fontSize: "3.6px", letterSpacing: "0.5px" }}>HYGROMETER</text>
        <text x="50" y="74" className="antique-name-small" textAnchor="middle">PER CENT</text>
        <SpadeHand angle={dialAngle(pct ?? 0, 0, 100)} fill="#a02f2f" edge="#4b1212" />
        <DialHub id={id} />
        <GlassGlint />
      </svg>
    </Tile>
  );
}

// ---- Rain gauge: copper funnel gauge with a graduated glass measure.

export function RainGauge({ todayIn, rateInPerHr }: { todayIn: number | null; rateInPerHr: number | null }) {
  const id = useId();
  const today = todayIn ?? 0;
  const max = today <= 0.5 ? 0.5 : today <= 1 ? 1 : Math.ceil(today);
  const fraction = clamp(today / max, 0, 1);
  const top = 14;
  const bottom = 88;
  const height = bottom - top;
  const fillHeight = fraction * height;
  const raining = (rateInPerHr ?? 0) > 0;

  const marks = [];
  const step = max <= 0.5 ? 0.1 : max <= 1 ? 0.25 : 0.5;
  for (let v = 0; v <= max + 0.0001; v += step) {
    const y = bottom - (v / max) * height;
    const labeled = max <= 0.5 || Math.abs(v * 4 - Math.round(v * 4)) < 0.001;
    marks.push(
      <g key={v.toFixed(2)}>
        <line x1="70" y1={y} x2={labeled ? 75 : 73} y2={y} className="antique-tick-major" />
        {labeled && (
          <text x="77" y={y} className="antique-num" dominantBaseline="central" fontSize="5.6">
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
      <svg viewBox="0 0 100 100" role="img" aria-label={`Rain today ${fmt(todayIn, 2, " in")}`}>
        <defs>
          <linearGradient id={`${id}-copper`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#8a4a22" />
            <stop offset="0.35" stopColor="#e19a5c" />
            <stop offset="0.6" stopColor="#c9783c" />
            <stop offset="1" stopColor="#6e3918" />
          </linearGradient>
          <linearGradient id={`${id}-glass`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.75" />
            <stop offset="0.5" stopColor="#e8f3fb" stopOpacity="0.55" />
            <stop offset="1" stopColor="#c7dcec" stopOpacity="0.7" />
          </linearGradient>
          <clipPath id={`${id}-tube`}>
            <rect x="60" y={top} width="9" height={height} rx="3" />
          </clipPath>
        </defs>

        {/* Funnel and cylinder */}
        <rect x="17" y="42" width="28" height="48" rx="2.5" fill={`url(#${id}-copper)`} stroke="#4a230c" strokeWidth="0.7" />
        <path d="M8 24 L18 43 L44 43 L54 24 Z" fill={`url(#${id}-copper)`} stroke="#4a230c" strokeWidth="0.7" />
        <ellipse cx="31" cy="24" rx="23" ry="4.6" fill="#d58d4e" stroke="#4a230c" strokeWidth="0.7" />
        <ellipse cx="31" cy="24.6" rx="19" ry="3.2" fill="#3a1c0a" />
        <rect x="16" y="41" width="30" height="4" rx="1" fill="#d9b04a" stroke="#6e4d14" strokeWidth="0.5" />
        <rect x="16" y="86" width="30" height="4.5" rx="1" fill="#d9b04a" stroke="#6e4d14" strokeWidth="0.5" />

        {/* Pipe from the cylinder to the measuring glass */}
        <rect x="45" y="84" width="16" height="3.6" rx="1.2" fill="#d9b04a" stroke="#6e4d14" strokeWidth="0.5" />

        {/* Graduated glass measure in a brass frame */}
        <rect x="57.5" y="10.5" width="14" height="82" rx="3" fill="#d9b04a" stroke="#6e4d14" strokeWidth="0.6" />
        <rect x="60" y={top} width="9" height={height} rx="3" fill={`url(#${id}-glass)`} />
        <g clipPath={`url(#${id}-tube)`}>
          <rect x="60" y={bottom - fillHeight} width="9" height={fillHeight} className="gauge-water"
            style={{ transition: "y 0.6s ease, height 0.6s ease" }} />
          {fillHeight > 0 && <rect x="60" y={bottom - fillHeight} width="9" height="1.4" className="gauge-water-top" />}
        </g>
        <rect x="61.2" y={top + 2} width="1.6" height={height - 4} rx="0.8" fill="#fff" fillOpacity="0.7" />
        {marks}

        {raining && (
          <>
            <circle cx="26" cy="4" r="1.4" className="rain-drop rain-drop-1" />
            <circle cx="33" cy="4" r="1.2" className="rain-drop rain-drop-2" />
            <circle cx="39" cy="4" r="1.2" className="rain-drop rain-drop-3" />
          </>
        )}
      </svg>
    </Tile>
  );
}

// ---- Thermometer: glass tube with red spirit on an ivory plaque, -20 to 110 F.

const THERMO_MIN = -20;
const THERMO_MAX = 110;
const THERMO_TOP = 10;
const THERMO_BASE = 88;

export function Thermometer({ tempF }: { tempF: number | null }) {
  const id = useId();
  const level = THERMO_BASE - ((clamp(tempF ?? THERMO_MIN, THERMO_MIN, THERMO_MAX) - THERMO_MIN) / (THERMO_MAX - THERMO_MIN)) * (THERMO_BASE - THERMO_TOP);

  const marks = [];
  for (let v = THERMO_MIN; v <= THERMO_MAX; v += 10) {
    const y = THERMO_BASE - ((v - THERMO_MIN) / (THERMO_MAX - THERMO_MIN)) * (THERMO_BASE - THERMO_TOP);
    const labeled = (v + THERMO_MIN * -1) % 20 === 0;
    marks.push(
      <g key={v}>
        <line x1="19" y1={y} x2={labeled ? 25 : 23} y2={y} className="antique-tick-major" />
        {labeled && (
          <text x="27" y={y} className="antique-num" dominantBaseline="central" fontSize="4.6">{v}</text>
        )}
      </g>
    );
  }

  return (
    <svg className="thermometer" viewBox="0 0 46 112" role="img" aria-label={`Thermometer ${fmt(tempF, 0, " degrees F")}`}>
      <defs>
        <linearGradient id={`${id}-plaque`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#fbf5e3" />
          <stop offset="1" stopColor="#e3d6b4" />
        </linearGradient>
        <linearGradient id={`${id}-brass`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#f3d98a" />
          <stop offset="0.5" stopColor="#c99a3d" />
          <stop offset="1" stopColor="#7a5418" />
        </linearGradient>
        <clipPath id={`${id}-bore`}>
          <rect x="10.5" y={THERMO_TOP - 4} width="5" height={THERMO_BASE - THERMO_TOP + 8} rx="2.5" />
        </clipPath>
      </defs>

      <rect x="2" y="2" width="42" height="108" rx="6" fill={`url(#${id}-brass)`} stroke="#5e4012" strokeWidth="0.8" />
      <rect x="4.5" y="4.5" width="37" height="103" rx="4" fill={`url(#${id}-plaque)`} stroke="#6b4a14" strokeWidth="0.6" />

      {/* Glass tube and bulb */}
      <rect x="9.5" y={THERMO_TOP - 5} width="7" height={THERMO_BASE - THERMO_TOP + 9} rx="3.5" fill="#f4f0e4" stroke="#8a8f99" strokeWidth="0.7" />
      <circle cx="13" cy="95" r="7.5" fill="#f4f0e4" stroke="#8a8f99" strokeWidth="0.7" />
      <rect x="10.5" y="86" width="5" height="9" fill="#c0302c" />
      <circle cx="13" cy="95" r="6" fill="#c0302c" />
      <g clipPath={`url(#${id}-bore)`}>
        <rect x="10.5" y={level} width="5" height={THERMO_BASE + 10 - level} fill="#c0302c" style={{ transition: "y 0.6s ease, height 0.6s ease" }} />
      </g>
      <rect x="11.6" y={THERMO_TOP} width="1" height={THERMO_BASE - THERMO_TOP} fill="#fff" fillOpacity="0.6" />
      <circle cx="11" cy="93" r="1.6" fill="#fff" fillOpacity="0.55" />

      {marks}
      <text x="31" y="105" className="antique-name-small" textAnchor="middle" fontSize="4.6">F</text>
    </svg>
  );
}
