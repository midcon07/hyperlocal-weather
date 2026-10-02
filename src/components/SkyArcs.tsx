import { useId } from "react";
import { clamp } from "./Instruments";
import type { SunTimes } from "../lib/sky";
import type { MoonPass, MoonPhase } from "../lib/moon";

// Rise-to-set arcs for the sun and the moon, side by side. The moon's dot
// is a little phase disc, so the arc doubles as a phase diagram.

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

// "Yesterday"/"Tomorrow" when a rise or set doesn't fall on today's date.
function dayTag(date: Date, now: Date) {
  const dayDiff = Math.round(
    (new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() -
      new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) /
      86400000
  );
  if (dayDiff < 0) return "Yesterday";
  if (dayDiff > 0) return "Tomorrow";
  return null;
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
    <div className="sky-tile">
      <div className="instrument-label">Sun</div>
      <div className="instrument-sub">{status}</div>
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
          <span>of daylight</span>
        </div>
        <div>
          <strong>{clockFmt.format(sunset)}</strong>
          <span>Sunset</span>
        </div>
      </div>
    </div>
  );
}

// A moon disc with the correct lit portion for the phase (0 new .. 0.5 full
// .. 1 new again). Lit on the right while waxing, on the left while waning.
function MoonDisc({ cx, cy, r, phase, opacity = 1 }: { cx: number; cy: number; r: number; phase: number; opacity?: number }) {
  const id = useId();
  const waxing = phase <= 0.5;
  const p = waxing ? phase : 1 - phase; // 0..0.5
  const termRx = Math.abs(Math.cos(2 * Math.PI * p)) * r;
  const gibbous = p > 0.25;
  // Right limb top-to-bottom, then back up along the terminator.
  const lit =
    p < 0.005
      ? ""
      : p > 0.495
        ? `M${cx} ${cy - r} A${r} ${r} 0 1 1 ${cx} ${cy + r} A${r} ${r} 0 1 1 ${cx} ${cy - r}`
        : `M${cx} ${cy - r} A${r} ${r} 0 0 1 ${cx} ${cy + r} A${termRx.toFixed(2)} ${r} 0 0 ${gibbous ? 1 : 0} ${cx} ${cy - r}`;
  const flip = waxing ? undefined : `translate(${2 * cx} 0) scale(-1 1)`;

  return (
    <g opacity={opacity}>
      <defs>
        <clipPath id={id}>
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>
      <circle cx={cx} cy={cy} r={r} className="moon-dark" />
      {lit && <path d={lit} className="moon-lit" transform={flip} />}
      <g clipPath={`url(#${id})`} className="moon-craters">
        <circle cx={cx - r * 0.3} cy={cy - r * 0.25} r={r * 0.22} />
        <circle cx={cx + r * 0.35} cy={cy + r * 0.1} r={r * 0.15} />
        <circle cx={cx - r * 0.05} cy={cy + r * 0.45} r={r * 0.18} />
      </g>
      <circle cx={cx} cy={cy} r={r} className="moon-rim" />
    </g>
  );
}

export function MoonArc({ pass, moon, now }: { pass: MoonPass | null; moon: MoonPhase; now: Date }) {
  const percent = Math.round(moon.illumination * 100);
  const total = pass ? pass.set.getTime() - pass.rise.getTime() : 0;
  const f = pass && pass.isUp ? clamp((now.getTime() - pass.rise.getTime()) / total, 0, 1) : 0;
  const pos = pass && pass.isUp ? arcPoint(f) : arcPoint(0.5);

  let status = "";
  if (pass) {
    status = pass.isUp
      ? `Moonset in ${duration(pass.set.getTime() - now.getTime())}`
      : `Moonrise in ${duration(pass.rise.getTime() - now.getTime())}`;
  }

  return (
    <div className="sky-tile">
      <div className="instrument-label">Moon</div>
      <div className="instrument-sub">{status || " "}</div>
      <svg viewBox="0 0 300 80" role="img" aria-label={`${moon.name}, ${percent} percent lit`}>
        <line x1="6" y1={ARC_BASE} x2="294" y2={ARC_BASE} className="sun-horizon" />
        <polyline points={arcPolyline(0, 1)} className="sun-track" />
        {pass && pass.isUp && f > 0 && <polyline points={arcPolyline(0, f)} className="moon-track-done" />}
        <circle cx={arcPoint(0).x} cy={ARC_BASE} r="4" className="moon-end" />
        <circle cx={arcPoint(1).x} cy={ARC_BASE} r="4" className="moon-end" />
        {pass && pass.isUp && <circle cx={pos.x} cy={pos.y} r="15" className="moon-glow" />}
        <MoonDisc cx={pos.x} cy={pos.y} r={9.5} phase={moon.phase} opacity={pass && pass.isUp ? 1 : 0.55} />
      </svg>
      <div className="sun-times">
        <div>
          <strong>{pass ? clockFmt.format(pass.rise) : "--"}</strong>
          <span>Moonrise{pass && dayTag(pass.rise, now) ? ` · ${dayTag(pass.rise, now)}` : ""}</span>
        </div>
        <div className="sun-center">
          <strong>{percent}% lit</strong>
          <span>{moon.name}</span>
        </div>
        <div>
          <strong>{pass ? clockFmt.format(pass.set) : "--"}</strong>
          <span>Moonset{pass && dayTag(pass.set, now) ? ` · ${dayTag(pass.set, now)}` : ""}</span>
        </div>
      </div>
    </div>
  );
}
