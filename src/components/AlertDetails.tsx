import { useState } from "react";
import type { MapAlert } from "../api/mapAlerts";
import { alertColor } from "./AlertOutlines";

// The full text of the alert(s) under a click or tap on the radar: headline,
// the places covered, NWS's description and its "what to do" instructions.
// Several alerts can overlap one spot, so they are listed with the most
// serious open first and the rest one tap away.

const untilFmt = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

function until(expires: string | null) {
  return expires ? `Until ${untilFmt.format(new Date(expires))}` : null;
}

// NWS text arrives hard-wrapped at ~66 columns; join those wrapped lines back
// into paragraphs so it reflows on a phone. Blank lines and "* WHAT..." style
// bullets still start new lines.
function reflow(text: string) {
  return text
    .replace(/\r/g, "")
    .replace(/\n(?!\n|\*|-|\s*$)/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function AlertDetails({ alerts, onClose }: { alerts: MapAlert[]; onClose: () => void }) {
  const [openId, setOpenId] = useState<string | null>(alerts[0]?.id ?? null);

  return (
    <div className="alert-details" role="dialog" aria-label="Alert details">
      <button type="button" className="alert-details-close" onClick={onClose} aria-label="Close alert details">
        ✕
      </button>
      {alerts.map((a) => {
        const open = openId === a.id;
        return (
          <section key={a.id} className="alert-details-item">
            <button
              type="button"
              className="alert-details-head"
              onClick={() => setOpenId(open ? null : a.id)}
              aria-expanded={open}
            >
              <i style={{ background: alertColor(a) }} />
              <span className="alert-details-event">{a.event}</span>
              {until(a.expires) && <span className="alert-details-until">{until(a.expires)}</span>}
              <span className="alert-details-chevron">{open ? "▲" : "▼"}</span>
            </button>
            {open && (
              <div className="alert-details-body">
                {a.headline && <p className="alert-details-headline">{a.headline}</p>}
                <p className="alert-details-area">
                  <strong>Areas:</strong> {a.areaDesc}
                </p>
                <p className="alert-details-text">{reflow(a.description)}</p>
                {a.instruction && (
                  <>
                    <p className="alert-details-label">What to do</p>
                    <p className="alert-details-text">{reflow(a.instruction)}</p>
                  </>
                )}
                {a.senderName && <p className="alert-details-sender">Issued by {a.senderName}</p>}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
