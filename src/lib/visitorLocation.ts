import { useMemo, useSyncExternalStore } from "react";
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
}

const KEY = "hw-visitor-place-v1";
const listeners = new Set<() => void>();
let cached: string | null | undefined;

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
  const raw = useSyncExternalStore(subscribe, read, () => null);
  return useMemo(() => parse(raw), [raw]);
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
