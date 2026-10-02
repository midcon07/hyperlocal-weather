export type SkyCondition = "clear" | "cloudy" | "precip" | "storm";
export type SkyTheme = "day" | "night";

// True when the sun is above the horizon at the given place and time
// (standard low-precision solar position, good to about a minute --
// plenty for choosing a day or night look).
export function isSunUp(date: Date, latitude: number, longitude: number): boolean {
  const rad = Math.PI / 180;
  const d = date.getTime() / 86400000 + 2440587.5 - 2451545.0;

  const meanLon = (280.46 + 0.9856474 * d) % 360;
  const anomaly = ((357.528 + 0.9856003 * d) % 360) * rad;
  const eclipticLon = (meanLon + 1.915 * Math.sin(anomaly) + 0.02 * Math.sin(2 * anomaly)) * rad;
  const obliquity = (23.439 - 0.0000004 * d) * rad;

  const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLon));
  const rightAscension = Math.atan2(Math.cos(obliquity) * Math.sin(eclipticLon), Math.cos(eclipticLon));

  const gmstHours = (18.697374558 + 24.06570982441908 * d) % 24;
  const hourAngle = (gmstHours * 15 + longitude) * rad - rightAscension;

  const elevation = Math.asin(
    Math.sin(latitude * rad) * Math.sin(declination) +
      Math.cos(latitude * rad) * Math.cos(declination) * Math.cos(hourAngle)
  );

  // -0.833 degrees accounts for atmospheric refraction and the sun's radius.
  return elevation / rad > -0.833;
}

export type IconTone = "sun" | "moon" | "cloud" | "rain" | "snow" | "storm";

// Picks the accent color family for a condition icon, so a sunny icon
// reads orange and rain reads blue instead of everything being one tint.
export function iconTone(text: string | null | undefined, isDaytime: boolean): IconTone {
  if (text && /snow|sleet|flurr|wintry|ice/i.test(text)) return "snow";
  const sky = skyFromConditions(text);
  if (sky === "storm") return "storm";
  if (sky === "precip") return "rain";
  if (sky === "cloudy") return "cloud";
  return isDaytime ? "sun" : "moon";
}

// Buckets NWS's free-form observation text into the four looks the page has.
export function skyFromConditions(text: string | null | undefined): SkyCondition {
  if (!text) return "clear";
  if (/thunder|t-?storm/i.test(text)) return "storm";
  if (/rain|shower|drizzle|snow|sleet|flurr|wintry/i.test(text)) return "precip";
  if (/overcast|mostly cloudy|^cloudy|fog|haze|mist|smoke/i.test(text)) return "cloudy";
  return "clear";
}
