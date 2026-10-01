// Small hand-rolled SVG icon set so conditions/wind/etc. read visually
// instead of as plain text/numbers. All icons use currentColor so they
// inherit whatever text color the surrounding element sets.

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

// A taller, more illustrative version: the top few feet of a mast with the
// anemometer cups mounted on top and a small wind vane below, rotated to
// the actual wind direction. The pole deliberately runs off the bottom
// edge of the viewBox -- it's meant to read as "the top of a taller pole",
// not the whole thing.
export function WindMastIcon({
  width = 44,
  height = 84,
  className,
  spinSeconds,
  directionDeg,
}: {
  width?: number;
  height?: number;
  className?: string;
  spinSeconds?: number;
  directionDeg?: number | null;
}) {
  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox="0 0 48 90"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    >
      <line x1="24" y1="90" x2="24" y2="30" />
      {typeof directionDeg === "number" && (
        <g transform={`rotate(${directionDeg} 24 58)`}>
          <line x1="24" y1="58" x2="24" y2="47" strokeWidth="1.6" />
          <path d="M24 44.5 27 51 24 49.3 21 51Z" fill="currentColor" stroke="none" />
        </g>
      )}
      <g
        className={spinSeconds ? "anemometer-spin" : undefined}
        style={spinSeconds ? { animationDuration: `${spinSeconds}s`, transformOrigin: "24px 18px" } : undefined}
      >
        <line x1="24" y1="18" x2="24" y2="7.5" />
        <circle cx="24" cy="6" r="2.6" fill="currentColor" stroke="none" />
        <line x1="24" y1="18" x2="32.4" y2="23" />
        <circle cx="33.5" cy="23.6" r="2.6" fill="currentColor" stroke="none" />
        <line x1="24" y1="18" x2="15.6" y2="23" />
        <circle cx="14.5" cy="23.6" r="2.6" fill="currentColor" stroke="none" />
      </g>
      <circle cx="24" cy="18" r="1.9" fill="currentColor" stroke="none" />
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
