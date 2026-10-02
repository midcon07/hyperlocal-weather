// Small hand-rolled SVG icon set so conditions/wind/etc. read visually
// instead of as plain text/numbers. All icons use currentColor so they
// inherit whatever text color the surrounding element sets.

import type { CSSProperties } from "react";

interface IconProps {
  size?: number;
  className?: string;
}

export function SunIcon({ size = 20, className }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="4.5" />
      <line x1="12" y1="1.5" x2="12" y2="4" />
      <line x1="12" y1="20" x2="12" y2="22.5" />
      <line x1="1.5" y1="12" x2="4" y2="12" />
      <line x1="20" y1="12" x2="22.5" y2="12" />
      <line x1="4.4" y1="4.4" x2="6.1" y2="6.1" />
      <line x1="17.9" y1="17.9" x2="19.6" y2="19.6" />
      <line x1="4.4" y1="19.6" x2="6.1" y2="17.9" />
      <line x1="17.9" y1="6.1" x2="19.6" y2="4.4" />
    </svg>
  );
}

export function MoonIcon({ size = 20, className }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.3 14.9A8.5 8.5 0 1 1 9.1 3.7a7 7 0 0 0 11.2 11.2Z" />
    </svg>
  );
}

export function CloudIcon({ size = 20, className }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 18.5a5 5 0 0 1-.6-9.97A6 6 0 0 1 18 10a4.5 4.5 0 0 1-1 8.5H7Z" />
    </svg>
  );
}

export function CloudSunIcon({ size = 20, className }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="7.5" cy="7" r="3" fill="currentColor" stroke="none" />
      <line x1="7.5" y1="0.8" x2="7.5" y2="2.1" />
      <line x1="1.5" y1="7" x2="2.8" y2="7" />
      <line x1="3.2" y1="3.1" x2="4.1" y2="4" />
      <path d="M9 20.5a5 5 0 0 1-.6-9.97A6 6 0 0 1 20 11a4.5 4.5 0 0 1-1 8.5H9Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function CloudMoonIcon({ size = 20, className }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8.3 7.9a4 4 0 0 0 5.4 4.86 3.1 3.1 0 0 1-4.9-2.56c0-.8.27-1.53.73-2.1a4 4 0 0 0-1.23-.2Z" />
      <path d="M9 20.5a5 5 0 0 1-.6-9.97A6 6 0 0 1 20 11a4.5 4.5 0 0 1-1 8.5H9Z" />
    </svg>
  );
}

export function CloudRainIcon({ size = 20, className }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M7 15.5a5 5 0 0 1-.6-9.97A6 6 0 0 1 18 7a4.5 4.5 0 0 1-1 8.5H7Z" fill="currentColor" stroke="none" />
      <line x1="8" y1="18.5" x2="7" y2="21" />
      <line x1="12" y1="18.5" x2="11" y2="21" />
      <line x1="16" y1="18.5" x2="15" y2="21" />
    </svg>
  );
}

export function CloudSnowIcon({ size = 20, className }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M7 15.5a5 5 0 0 1-.6-9.97A6 6 0 0 1 18 7a4.5 4.5 0 0 1-1 8.5H7Z" fill="currentColor" stroke="none" />
      <line x1="8" y1="18" x2="8" y2="22" />
      <line x1="6" y1="20" x2="10" y2="20" />
      <line x1="16" y1="18" x2="16" y2="22" />
      <line x1="14" y1="20" x2="18" y2="20" />
    </svg>
  );
}

export function CloudLightningIcon({ size = 20, className }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 14.5a5 5 0 0 1-.6-9.97A6 6 0 0 1 18 6a4.5 4.5 0 0 1-1 8.5H7Z" fill="currentColor" stroke="none" />
      <path d="M12.5 14.5 10 19h3l-1.5 4 4.5-5.5h-3l1.5-3Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FogIcon({ size = 20, className }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <line x1="3" y1="8" x2="21" y2="8" />
      <line x1="5" y1="12" x2="19" y2="12" />
      <line x1="3" y1="16" x2="21" y2="16" />
      <line x1="6" y1="20" x2="18" y2="20" />
    </svg>
  );
}

export function WindLinesIcon({ size = 20, className }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M3 8h11a2.5 2.5 0 1 0-2.4-3.2" />
      <path d="M3 13h15a2.5 2.5 0 1 1-2.4 3.2" />
      <path d="M3 18h9" />
    </svg>
  );
}

export function DropletIcon({ size = 18, className }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.5s6.5 7.2 6.5 11.9a6.5 6.5 0 1 1-13 0C5.5 9.7 12 2.5 12 2.5Z" />
    </svg>
  );
}

export function GaugeIcon({ size = 18, className }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15a8 8 0 1 1 16 0" />
      <line x1="12" y1="15" x2="15.5" y2="10.5" />
      <circle cx="12" cy="15" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function UvIcon({ size = 18, className }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="4.5" />
      <line x1="12" y1="19.5" x2="12" y2="22" />
      <line x1="2" y1="12" x2="4.5" y2="12" />
      <line x1="19.5" y1="12" x2="22" y2="12" />
      <line x1="5" y1="5" x2="6.7" y2="6.7" />
      <line x1="17.3" y1="17.3" x2="19" y2="19" />
    </svg>
  );
}

// Three-cup anemometer, hand-rolled. `spinSeconds` (if given) drives a CSS
// rotation animation via inline style -- faster wind, shorter duration.
export function AnemometerIcon({ size = 20, className, spinSeconds }: IconProps & { spinSeconds?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <g
        className={spinSeconds ? "anemometer-spin" : undefined}
        style={spinSeconds ? { animationDuration: `${spinSeconds}s`, transformOrigin: "12px 12px" } : undefined}
      >
        <line x1="12" y1="12" x2="12" y2="4.3" />
        <circle cx="12" cy="3.6" r="1.6" fill="currentColor" stroke="none" />
        <line x1="12" y1="12" x2="18.6" y2="15.8" />
        <circle cx="19.3" cy="16.2" r="1.6" fill="currentColor" stroke="none" />
        <line x1="12" y1="12" x2="5.4" y2="15.8" />
        <circle cx="4.7" cy="16.2" r="1.6" fill="currentColor" stroke="none" />
      </g>
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

// The top of the author's own Davis anemometer mast, redrawn from a photo:
// a silver pole with a black clamp bracket, a curved arm rising to the
// instrument, the wind vane on top (silver fin, pointed nose) and the three
// wind cups on their own hub just below it. The pole deliberately runs off
// the bottom edge -- it reads as "the top of a taller pole".
//
// The real thing is photographed from slightly below, so this keeps that
// view honestly: the cups orbit on a squashed ellipse (viewed at a tilt),
// and the vane is foreshortened by its heading -- broadside when the wind
// is from the east or west, nearly end-on from the north or south, with
// the pointed nose toward the side the wind comes from. Black parts adapt
// to the theme via CSS variables; the cups take the wind-level color.
export function WindMastIcon({
  width = 44,
  height = 76,
  className,
  spinSeconds,
  directionDeg,
  flutterSeconds,
  flutterDeg = 6,
  gusting,
}: {
  width?: number;
  height?: number;
  className?: string;
  spinSeconds?: number;
  directionDeg?: number | null;
  // Vane wobble about its heading: period and swing in degrees. Omit for calm.
  flutterSeconds?: number;
  flutterDeg?: number;
  // Pulses a ring around the cups.
  gusting?: boolean;
}) {
  const sin = typeof directionDeg === "number" ? Math.sin((directionDeg * Math.PI) / 180) : 0.55;
  const vaneScaleX = (sin >= 0 ? 1 : -1) * Math.max(0.2, Math.abs(sin));

  return (
    <svg className={className} width={width} height={height} viewBox="0 0 64 110" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <polygon className="mast-silver" points="23,110 26.5,82 33.5,82 37,110" strokeWidth="0.8" />
      <line className="mast-highlight" x1="27.8" y1="86" x2="25.4" y2="110" strokeWidth="1.1" />

      <path className="mast-body-stroke" d="M30 78 C29 62 33 49 41 38" strokeWidth="2.6" />
      <rect className="mast-body-fill" x="37" y="35.5" width="8.5" height="4" rx="1" />
      <rect className="mast-body-fill" x="22" y="76" width="16" height="9" rx="2.2" />
      <circle className="mast-body-fill" cx="19.6" cy="82" r="1.7" />

      <line className="mast-body-stroke" x1="41" y1="15" x2="41" y2="33" strokeWidth="2" />
      <ellipse className="mast-body-fill" cx="41" cy="33" rx="3.2" ry="4.2" />

      {gusting && (
        <ellipse className="gust-ring" cx="41" cy="31" rx="17" ry="10" strokeWidth="1.2" style={{ transformOrigin: "41px 31px" }} />
      )}

      <g transform="translate(41 31) scale(1 0.6)">
        <g
          className={spinSeconds ? "anemometer-spin" : undefined}
          style={spinSeconds ? { animationDuration: `${spinSeconds}s`, transformOrigin: "0px 0px" } : undefined}
        >
          {[0, 120, 240].map((angle) => (
            <g key={angle} transform={`rotate(${angle})`}>
              <line className="mast-body-stroke" x1="0" y1="0" x2="0" y2="-9" strokeWidth="1.3" />
              <path d="M0 -14.4 A4.2 4.2 0 0 0 0 -6 Z" fill="currentColor" />
              <circle cx="-1.9" cy="-11.6" r="0.9" fill="rgba(255,255,255,0.55)" />
            </g>
          ))}
        </g>
      </g>

      <ellipse className="mast-edge-stroke" cx="41" cy="31" rx="4.2" ry="2.3" strokeWidth="0.9" />
      <circle cx="40" cy="31.6" r="1.1" fill="rgba(255,255,255,0.75)" />

      <g transform={`translate(41 13) scale(${vaneScaleX} 1)`}>
        <g
          className={flutterSeconds ? "vane-flutter" : undefined}
          style={
            flutterSeconds
              ? ({ animationDuration: `${flutterSeconds}s`, transformOrigin: "0px 0px", "--flutter-deg": `${flutterDeg}deg` } as CSSProperties)
              : undefined
          }
        >
          <polygon className="mast-silver" points="-3,-1.4 -21,-4.6 -17.2,0.4 -3,1.2" strokeWidth="0.6" />
          <path className="mast-body-fill" d="M2.5 -1.3 L14 -0.9 L17 0 L14 0.9 L2.5 1.3Z" />
        </g>
      </g>
      <ellipse className="mast-body-fill" cx="41" cy="13" rx="2.8" ry="3.2" />
    </svg>
  );
}

export function RefreshIcon({ size = 14, className }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 15.4-6.4L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15.4 6.4L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}

export function CompassArrowIcon({ size = 14, className, directionDeg }: IconProps & { directionDeg: number }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      style={{ transform: `rotate(${directionDeg}deg)` }}
    >
      <path d="M12 2 16 14 12 11.5 8 14Z" />
      <rect x="11.1" y="11" width="1.8" height="10" rx="0.9" />
    </svg>
  );
}

const CONDITION_RULES: Array<{ test: RegExp; day: typeof SunIcon; night: typeof SunIcon }> = [
  { test: /thunder|t-?storm/i, day: CloudLightningIcon, night: CloudLightningIcon },
  { test: /snow|sleet|flurr|wintry/i, day: CloudSnowIcon, night: CloudSnowIcon },
  { test: /rain|shower|drizzle/i, day: CloudRainIcon, night: CloudRainIcon },
  { test: /fog|haze|mist|smoke/i, day: FogIcon, night: FogIcon },
  { test: /wind/i, day: WindLinesIcon, night: WindLinesIcon },
  { test: /overcast|cloudy/i, day: CloudIcon, night: CloudIcon },
  { test: /partly|mostly sunny|mostly clear|few clouds|scattered/i, day: CloudSunIcon, night: CloudMoonIcon },
  { test: /clear|sunny|fair/i, day: SunIcon, night: MoonIcon },
];

// Faster wind -> shorter spin duration. No speed (or calm) -> no spin.
export function windSpinSeconds(speedMph: number | null): number | undefined {
  if (!speedMph || speedMph <= 0) return undefined;
  return Math.min(6, Math.max(0.4, 12 / speedMph));
}

export function getConditionIcon(text: string | null | undefined, isDaytime = true) {
  if (!text) return isDaytime ? SunIcon : MoonIcon;
  for (const rule of CONDITION_RULES) {
    if (rule.test.test(text)) return isDaytime ? rule.day : rule.night;
  }
  return isDaytime ? CloudSunIcon : CloudMoonIcon;
}
