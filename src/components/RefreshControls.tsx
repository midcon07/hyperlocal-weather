interface Props {
  lastUpdated: Date | null;
  secondsUntilRefresh: number;
  loading: boolean;
  live: boolean;
  onRefresh: () => void;
}

export function RefreshControls({ lastUpdated, secondsUntilRefresh, loading, live, onRefresh }: Props) {
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
