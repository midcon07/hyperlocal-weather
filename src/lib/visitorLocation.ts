import { useMemo, useSyncExternalStore } from "react";
import siteConfig from "../../config/site.config.json";
import { milesBetween } from "./geo";
import { MAP_CENTER, MAP_DEFAULT_ZOOM } from "./mapView";
import type { MapPosition } from "./radarEmbed";

// Lets a visitor center the radar on their own spot (a friend in Wheaton,
// Illinois sees Chicago-area weather, not Altoona's). The choice is kept in
// that visitor's own browser only and never sent anywhere except, for a ZIP
// code, to a free ZIP-to-coordinates lookup.

export interface VisitorPlace {
  lat: number;
  lon: number;
  /** What to call it, e.g. "Wheaton, IL" or "Your location". */
  label: string;
  /** Guessed from the visitor's internet connection, not chosen by them. */
  auto?: boolean;
  /** The station's own area, picked on purpose (no dot is drawn for it). */
  home?: boolean;
}

export const STATION_PLACE: VisitorPlace = { lat: MAP_CENTER.lat, lon: MAP_CENTER.lon, label: "Altoona, IA", home: true };

const KEY = "hw-visitor-place-v1";
const listeners = new Set<() => void>();
let cached: string | null | undefined;

// A first guess at where the visitor is, from the Worker's /where route (the
// connection's rough location). Kept only in memory for this page load, and
// used only when the visitor hasn't chosen a place themselves.
let autoRaw: string | null = null;
let detecting = false;

export async function detectPlace() {
  if (detecting || autoRaw || read()) return;
  const proxy = import.meta.env.VITE_WEATHERLINK_PROXY_URL;
  if (!proxy) return;
  detecting = true;
  try {
    const res = await fetch(new URL("/where", proxy));
    if (!res.ok) return;
    const d = (await res.json()) as { lat: number; lon: number; city: string | null; region: string | null };
    if (!Number.isFinite(d.lat) || !Number.isFinite(d.lon) || read()) return;
    const place: VisitorPlace = {
      lat: d.lat,
      lon: d.lon,
      label: d.city && d.region ? `${d.city}, ${d.region}` : "Near you",
      auto: true,
    };
    autoRaw = JSON.stringify(place);
    listeners.forEach((l) => l());
  } catch {
    // No guess is fine: the map just starts at the station.
  } finally {
    detecting = false;
  }
}

function read(): string | null {
  if (cached === undefined) {
    try {
      cached = localStorage.getItem(KEY);
    } catch {
      cached = null;
    }
  }
  return cached;
}

export function savePlace(place: VisitorPlace | null) {
  cached = place ? JSON.stringify(place) : null;
  try {
    if (cached) localStorage.setItem(KEY, cached);
    else localStorage.removeItem(KEY);
  } catch {
    // Private browsing or blocked storage: the choice just lasts this visit.
  }
  listeners.forEach((l) => l());
}

function parse(raw: string | null): VisitorPlace | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as VisitorPlace;
    return Number.isFinite(p.lat) && Number.isFinite(p.lon) ? p : null;
  } catch {
    return null;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// The visitor's chosen place, or null (use the station's own area).
export function useVisitorPlace(): VisitorPlace | null {
  const raw = useSyncExternalStore(subscribe, () => read() ?? autoRaw, () => null);
  return useMemo(() => parse(raw), [raw]);
}

// ---- Which place the whole page is about

// Within this many miles of the station, the page shows the station's own
// readings (the visitor's place just centers the radar). Farther away, the page
// is about the visitor's place instead and uses nearby official stations.
export const NEAR_STATION_MILES = 25;

export interface ActivePlace {
  lat: number;
  lon: number;
  label: string;
  /** True when the page is about somewhere other than the station's area. */
  remote: boolean;
  /** Changes whenever the place does; used to reload data. */
  key: string;
}

export function useActivePlace(): ActivePlace {
  const place = useVisitorPlace();
  return useMemo(() => {
    const { latitude, longitude, name } = siteConfig.location;
    if (!place || place.home || milesBetween(latitude, longitude, place.lat, place.lon) <= NEAR_STATION_MILES) {
      return { lat: latitude, lon: longitude, label: name, remote: false, key: "station" };
    }
    return {
      lat: place.lat,
      lon: place.lon,
      label: place.label,
      remote: true,
      key: `${place.lat.toFixed(2)},${place.lon.toFixed(2)}`,
    };
  }, [place]);
}

// Forget the saved choice and go back to guessing from the connection.
export function resetToApproximatePlace() {
  autoRaw = null;
  savePlace(null);
  void detectPlace();
}

// Where the map starts and where "Reset view" goes.
export function homeFor(place: VisitorPlace | null): MapPosition {
  return place
    ? { lon: place.lon, lat: place.lat, zoom: MAP_DEFAULT_ZOOM }
    : { lon: MAP_CENTER.lon, lat: MAP_CENTER.lat, zoom: MAP_DEFAULT_ZOOM };
}

// ---- Ways to find a place

export function placeFromGps(): Promise<VisitorPlace> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("This browser can't share a location."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, label: "Your location" }),
      (err) =>
        reject(
          new Error(
            err.code === err.PERMISSION_DENIED
              ? "Location sharing was declined. You can enter a ZIP code instead."
              : "Couldn't find your location. You can enter a ZIP code instead."
          )
        ),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 }
    );
  });
}

export async function placeFromZip(zip: string): Promise<VisitorPlace> {
  const clean = zip.trim().slice(0, 5);
  if (!/^\d{5}$/.test(clean)) throw new Error("Please enter a 5-digit ZIP code.");
  const res = await fetch(`https://api.zippopotam.us/us/${clean}`);
  if (res.status === 404) throw new Error("That ZIP code wasn't found.");
  if (!res.ok) throw new Error("The ZIP lookup isn't answering right now. Please try again.");
  const data = (await res.json()) as {
    places?: { "place name": string; latitude: string; longitude: string; "state abbreviation": string }[];
  };
  const p = data.places?.[0];
  if (!p) throw new Error("That ZIP code wasn't found.");
  return { lat: Number(p.latitude), lon: Number(p.longitude), label: `${p["place name"]}, ${p["state abbreviation"]}` };
}
