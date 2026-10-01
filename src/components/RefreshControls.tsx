import { relativeTimeFromNow } from "../lib/format";
import { RefreshIcon } from "../lib/weatherIcons";

interface Props {
  lastUpdated: Date | null;
  secondsUntilRefresh: number;
  loading: boolean;
  live: boolean;
  onRefresh: () => void;
  compact?: boolean;
}

export function RefreshControls({ lastUpdated, secondsUntilRefresh, loading, live, onRefresh, compact }: Props) {
  if (compact) {
    return (
      <div className="refresh-compact" title={live ? `Live · next refresh in ${secondsUntilRefresh}s` : "Synced from GitHub Actions"}>
        <span className={`refresh-dot${live ? " refresh-dot-live" : ""}`} />
        <span className="refresh-compact-time">{lastUpdated ? relativeTimeFromNow(lastUpdated) : "—"}</span>
        <button className="refresh-icon-button" onClick={onRefresh} disabled={loading} aria-label="Refresh now">
          <RefreshIcon size={13} className={loading ? "refresh-icon-spin" : undefined} />
        </button>
      </div>
    );
  }

  return (
    <div className="refresh-controls">
      <span className="refresh-status">
        {live ? "Live" : "Synced"}
        {lastUpdated && ` · updated ${lastUpdated.toLocaleTimeString()}`}
        {live && ` · next refresh in ${secondsUntilRefresh}s`}
      </span>
      <button className="refresh-button" onClick={onRefresh} disabled={loading}>
        {loading ? "Refreshing…" : "Refresh now"}
      </button>
    </div>
  );
}
