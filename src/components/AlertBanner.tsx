import { useState } from "react";
import type { LiveSourceState } from "../hooks/useLiveSource";
import type { NwsAlert } from "../types/weather";

interface Props {
  live: LiveSourceState<NwsAlert[]>;
}

type AlertLevel = "warning" | "watch" | "advisory" | "statement";

const LEVEL_RANK: Record<AlertLevel, number> = {
  warning: 3,
  watch: 2,
  advisory: 1,
  statement: 0,
};

function levelFor(event: string): AlertLevel {
  const e = event.toLowerCase();
  if (e.includes("warning")) return "warning";
  if (e.includes("watch")) return "watch";
  if (e.includes("advisory")) return "advisory";
  return "statement";
}

export function AlertBanner({ live }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const alerts = live.data ?? [];
  const hasAlerts = alerts.length > 0;

  const highest = alerts.reduce<AlertLevel>((acc, a) => {
    const lvl = levelFor(a.event);
    return LEVEL_RANK[lvl] > LEVEL_RANK[acc] ? lvl : acc;
  }, "statement");

  return (
    <div className={`alert-banner ${hasAlerts ? `alert-banner--${highest}` : "alert-banner--clear"}`}>
      <div className="alert-banner-row">
        <span className="alert-banner-label">
          <span className="alert-dot" />
          Watches &amp; Warnings
        </span>

        {hasAlerts ? (
          <div className="alert-ticker">
            <div className="alert-ticker-track">
              {[...alerts, ...alerts].map((a, i) => (
                <span key={`${a.id}-${i}`} className="alert-ticker-item">
                  <strong>{a.event}</strong> — {a.areaDesc}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <span className="alert-clear-text">No active watches or warnings — all clear</span>
        )}
      </div>

      {hasAlerts && (
        <div className="alert-list">
          {alerts.map((a) => {
            const open = expandedId === a.id;
            const level = levelFor(a.event);
            return (
              <div key={a.id} className={`alert-item alert-item--${level}`}>
                <button
                  className="alert-item-toggle"
                  onClick={() => setExpandedId(open ? null : a.id)}
                  aria-expanded={open}
                >
                  <span className="alert-item-event">{a.event}</span>
                  <span className="alert-item-area">{a.areaDesc}</span>
                  <span className="alert-item-chevron">{open ? "▲" : "▼"}</span>
                </button>
                {open && (
                  <div className="alert-item-body">
                    {a.headline && <p className="alert-item-headline">{a.headline}</p>}
                    <p className="alert-item-desc">{a.description}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
