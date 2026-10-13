import { useState } from "react";
import type { FormEvent } from "react";
import {
  STATION_PLACE,
  placeFromGps,
  placeFromZip,
  resetToApproximatePlace,
  savePlace,
  useVisitorPlace,
} from "../lib/visitorLocation";

// "Center on me": a small button in the radar card's header. The map first
// guesses the visitor's area from their internet connection (see the Worker's
// /where route). This panel lets them correct it with the browser's exact
// location or a ZIP code, or go back to the station's own area. A choice made
// here is remembered in that visitor's own browser only.

export function LocationPicker() {
  const place = useVisitorPlace();
  const [open, setOpen] = useState(false);
  const [zip, setZip] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choose = async (find: () => Promise<Awaited<ReturnType<typeof placeFromGps>>>) => {
    setBusy(true);
    setError(null);
    try {
      savePlace(await find());
      setOpen(false);
      setZip("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const submitZip = (e: FormEvent) => {
    e.preventDefault();
    void choose(() => placeFromZip(zip));
  };

  const atStation = place?.home;
  const label = place ? `${place.label}${place.auto ? " (approx.)" : ""}` : "Center on me";

  return (
    <div className="loc-picker">
      <button type="button" className="loc-button" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span aria-hidden="true">&#9906;</span> {label}
      </button>

      {open && (
        <div className="loc-panel" role="dialog" aria-label="Center the map on your location">
          <p className="loc-title">Center the radar on you</p>
          {place?.auto && (
            <p className="loc-guess">
              The map started near <strong>{place.label}</strong>, a guess from your internet connection. Not right? Use
              one of these:
            </p>
          )}
          <button type="button" className="loc-primary" disabled={busy} onClick={() => void choose(placeFromGps)}>
            Use my exact location
          </button>
          <form onSubmit={submitZip} className="loc-zip">
            <label>
              or enter a ZIP code
              <input
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={5}
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="60187"
              />
            </label>
            <button type="submit" disabled={busy || zip.length < 5}>Go</button>
          </form>
          {error && <p className="loc-error">{error}</p>}
          {!atStation && (
            <button
              type="button"
              className="loc-clear"
              onClick={() => {
                savePlace(STATION_PLACE);
                setOpen(false);
              }}
            >
              Show the station's area (Altoona, IA)
            </button>
          )}
          {place && !place.auto && (
            <button
              type="button"
              className="loc-clear"
              onClick={() => {
                resetToApproximatePlace();
                setOpen(false);
              }}
            >
              Go back to guessing from my connection
            </button>
          )}
          <p className="loc-note">Your place stays in this browser. We never store it.</p>
        </div>
      )}
    </div>
  );
}
