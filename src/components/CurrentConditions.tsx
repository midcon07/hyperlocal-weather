import type { NwsObservation, StationReading } from "../types/weather";

function celsiusToFahrenheit(c: number | null): number | null {
  return c === null ? null : (c * 9) / 5 + 32;
}

function fmt(value: number | null | undefined, digits = 1, unit = ""): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits)}${unit}`;
}

interface Props {
  station: StationReading | null;
  observation: NwsObservation | null;
}

export function CurrentConditions({ station, observation }: Props) {
  const nwsTempF = celsiusToFahrenheit(observation?.temperatureC ?? null);

  return (
    <section className="card-grid">
      <div className="card">
        <h2>Your Station</h2>
        {station ? (
          <>
            <div className="big-stat">{fmt(station.temperatureF, 0, "°F")}</div>
            <dl className="stat-list">
              <div><dt>Humidity</dt><dd>{fmt(station.humidityPct, 0, "%")}</dd></div>
              <div><dt>Wind</dt><dd>{fmt(station.windSpeedMph, 0, " mph")}</dd></div>
              <div><dt>Rain rate</dt><dd>{fmt(station.rainRateInPerHr, 2, " in/hr")}</dd></div>
              <div><dt>Rain today</dt><dd>{fmt(station.rainDayIn, 2, " in")}</dd></div>
              <div><dt>Pressure</dt><dd>{fmt(station.barometricPressureInHg, 2, " inHg")}</dd></div>
              <div><dt>UV Index</dt><dd>{fmt(station.uvIndex, 1)}</dd></div>
            </dl>
            <p className="timestamp">Updated {new Date(station.timestamp).toLocaleString()}</p>
          </>
        ) : (
          <p className="empty-state">No station data yet. Configure WeatherLink secrets to start collecting readings.</p>
        )}
      </div>

      <div className="card">
        <h2>NWS Observed</h2>
        {observation ? (
          <>
            <div className="big-stat">{fmt(nwsTempF, 0, "°F")}</div>
            <dl className="stat-list">
              <div><dt>Conditions</dt><dd>{observation.textDescription ?? "—"}</dd></div>
              <div><dt>Humidity</dt><dd>{fmt(observation.relativeHumidity, 0, "%")}</dd></div>
              <div><dt>Wind</dt><dd>{fmt(observation.windSpeedKmh ? observation.windSpeedKmh * 0.621371 : null, 0, " mph")}</dd></div>
              <div><dt>Station</dt><dd>{observation.stationId}</dd></div>
            </dl>
            <p className="timestamp">Updated {new Date(observation.timestamp).toLocaleString()}</p>
          </>
        ) : (
          <p className="empty-state">No NWS observation yet.</p>
        )}
      </div>
    </section>
  );
}
