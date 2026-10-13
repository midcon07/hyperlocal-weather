import { useState } from "react";
import type { FormEvent } from "react";
import { placeFromGps, placeFromZip, savePlace, useVisitorPlace } from "../lib/visitorLocation";

// "Center on me": a small button in the radar card's header that opens a panel
// to use the browser's location or a ZIP code. The choice is remembered in the
// visitor's own browser, so the map opens on their area every time.

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

  return (
    <div className="loc-picker">
      <button type="button" className="loc-button" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span aria-hidden="true">&#9906;</span> {place ? place.label : "Center on me"}
      </button>

      {open && (
        <div className="loc-panel" role="dialog" aria-label="Center the map on your location">
          <p className="loc-title">Center the radar on you</p>
          <button type="button" className="loc-primary" disabled={busy} onClick={() => void choose(placeFromGps)}>
            Use my current location
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
          {place && (
            <button
              type="button"
              className="loc-clear"
              onClick={() => {
                savePlace(null);
                setOpen(false);
              }}
            >
              Back to Altoona, IA
            </button>
          )}
          <p className="loc-note">Your place is saved only in this browser.</p>
        </div>
      )}
    </div>
  );
}
