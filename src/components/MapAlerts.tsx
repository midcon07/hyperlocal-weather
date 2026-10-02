import { useState } from "react";
import type { MapAlert } from "../api/mapAlerts";
import type { LiveSourceState } from "../hooks/useLiveSource";
import { LEVEL_RANK, levelFor } from "../lib/alertLevel";
import type { AlertLevel } from "../lib/alertLevel";

// Our own stand-in for NWS's "Alert" button on the radar: the same kind of
// list (watches, warnings, advisories), but limited to the area the map
// covers, and it lets the radar's own panels be cropped away. Alerts are
// grouped by type, because one event can be dozens of near-identical
// alerts (for instance a river flood warning per forecast point).


const untilFmt = new Intl.DateTimeFormat("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" });
const clockFmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

function until(expires: string | null) {
  if (!expires) return null;
  const date = new Date(expires);
  const sameDay = date.toDateString() === new Date().toDateString();
  return `Until ${sameDay ? clockFmt.format(date) : untilFmt.format(date)}`;
}

interface Group {
  event: string;
  level: AlertLevel;
  alerts: MapAlert[];
}

function group(alerts: MapAlert[]): Group[] {
  const byEvent = new Map<string, MapAlert[]>();
  for (const a of alerts) byEvent.set(a.event, [...(byEvent.get(a.event) ?? []), a]);
  return [...byEvent.entries()]
    .map(([event, list]) => ({ event, level: levelFor(event), alerts: list }))
    .sort((a, b) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level] || b.alerts.length - a.alerts.length);
}

interface Props {
  live: LiveSourceState<MapAlert[]>;
  open: boolean;
  onToggle: () => void;
  /** Short label ("4 alerts") for the small map, where space is tight. */
  compact?: boolean;
}

export function MapAlerts({ live, open, onToggle, compact = false }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const groups = group(live.data ?? []);

  let label: string;
  let tone: string;
  if (live.data === null) {
    label = live.error ? "Alerts unavailable" : "Alerts…";
    tone = "idle";
  } else if (groups.length === 0) {
    label = "No alerts in view";
    tone = "clear";
  } else {
    const top = groups[0];
    label = compact
      ? `${groups.length} alert${groups.length === 1 ? "" : "s"}`
      : `${top.event}${top.alerts.length > 1 ? ` ×${top.alerts.length}` : ""}${
          groups.length > 1 ? ` +${groups.length - 1} more` : ""
        }`;
    tone = top.level;
  }

  return (
    <div className="map-alerts">
      <button type="button" className={`map-alerts-pill map-alerts-pill--${tone}`} onClick={onToggle} aria-expanded={open}>
        <span className="map-alerts-dot" />
        {label}
        <span className="map-alerts-chevron">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="map-alerts-panel">
          {groups.length === 0 ? (
            <p className="map-alerts-empty">
              {live.data === null
                ? live.error
                  ? "Couldn't reach the NWS alert feed. Will retry."
                  : "Loading alerts…"
                : "No active watches or warnings in the area this map covers."}
            </p>
          ) : (
            groups.map((g) => {
              const isOpen = expanded === g.event;
              const single = g.alerts.length === 1 ? g.alerts[0] : null;
              const areas = [...new Set(g.alerts.flatMap((a) => a.areaDesc.split("; ")))];
              return (
                <div key={g.event} className={`map-alert-item map-alert-item--${g.level}`}>
                  <button
                    type="button"
                    className="map-alert-toggle"
                    onClick={() => setExpanded(isOpen ? null : g.event)}
                    aria-expanded={isOpen}
                  >
                    <span className="map-alert-event">
                      {g.event}
                      {g.alerts.length > 1 && <span className="map-alert-count"> ×{g.alerts.length}</span>}
                    </span>
                    <span className="map-alert-area">{areas.join("; ")}</span>
                    {single && until(single.expires) && <span className="map-alert-until">{until(single.expires)}</span>}
                  </button>
                  {isOpen && (
                    <div className="map-alert-body">
                      {single ? (
                        <>
                          {single.headline && <p className="map-alert-headline">{single.headline}</p>}
                          <p>{single.description}</p>
                        </>
                      ) : (
                        g.alerts.map((a) => (
                          <p key={a.id} className="map-alert-row">
                            <strong>{a.areaDesc}</strong>
                            {until(a.expires) && <span> — {until(a.expires)}</span>}
                          </p>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
