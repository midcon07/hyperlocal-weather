import { useEffect, useState } from "react";
import { useMapAlertsLive } from "../hooks/useMapAlertsLive";
import { useSkyTheme } from "../hooks/useSkyTheme";
import { layoutFor, mapPageStart } from "../lib/radarEmbed";
import { RadarModal } from "./RadarModal";

// The enlarged radar as a page of its own (opened by "Open in new tab"): the
// same alert outlines, hover cards, full-warning panel and drag/zoom as the
// dialog, filling the whole tab, starting wherever the dashboard was looking.

export function RadarPage() {
  const alerts = useMapAlertsLive();
  const [alertsOpen, setAlertsOpen] = useState(false);
  useSkyTheme(null);

  useEffect(() => {
    document.title = "Radar - Hyperlocal Weather";
  }, []);

  return (
    <RadarModal
      page
      alerts={alerts}
      alertsOpen={alertsOpen}
      onToggleAlerts={() => setAlertsOpen((v) => !v)}
      coverageWidth={layoutFor(Math.max(320, window.innerWidth - 32)).nativeWidth}
      startView={mapPageStart(window.location.search)}
    />
  );
}
