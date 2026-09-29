export function RadarCard() {
  return (
    <section className="card radar-card">
      <div className="card-header">
        <h2>Radar — KDMX (Des Moines)</h2>
        <a
          className="radar-link"
          href="https://radar.weather.gov/station/KDMX/standard"
          target="_blank"
          rel="noreferrer"
        >
          Full view ↗
        </a>
      </div>
      <img
        className="radar-image"
        src="https://radar.weather.gov/ridge/standard/KDMX_loop.gif"
        alt="NWS KDMX radar loop"
        loading="lazy"
      />
    </section>
  );
}
