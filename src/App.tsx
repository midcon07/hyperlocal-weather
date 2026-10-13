import { useEffect, useState } from "react";
import { StationCard } from "./components/StationCard";
import { ForecastList } from "./components/ForecastList";
import { TempCurve } from "./components/TempCurve";
import { RadarCard } from "./components/RadarCard";
import { AlertBanner } from "./components/AlertBanner";
import { MetarStrip } from "./components/MetarStrip";
import { ScrollHint } from "./components/ScrollHint";
import { useWeatherData } from "./hooks/useWeatherData";
import { useNwsLive } from "./hooks/useNwsLive";
import { useStationLive } from "./hooks/useStationLive";
import { useAlertsLive } from "./hooks/useAlertsLive";
import { useMetarLive } from "./hooks/useMetarLive";
import { useSkyTheme } from "./hooks/useSkyTheme";
import { describeStation, nwsAsStation } from "./lib/nwsStation";
import { detectPlace, useActivePlace } from "./lib/visitorLocation";
import "./App.css";

function App() {
  // The page is about the station's own area, unless the visitor is far away
  // (see useActivePlace): then it shows official stations near them instead,
  // and none of the personal station's data.
  const place = useActivePlace();
  const { latest, loading, error } = useWeatherData();
  const nwsLive = useNwsLive(place);
  const stationLive = useStationLive();
  const alertsLive = useAlertsLive(place);
  const metarLive = useMetarLive(place.remote, nwsLive.data?.nearbyAirports);

  useEffect(() => {
    void detectPlace(); // a first guess at the visitor's area, unless they've chosen
  }, []);

  // The "Weather history" link only shows once some history has been loaded,
  // and only for the personal station's own area (that is whose history it is).
  const [hasHistory, setHasHistory] = useState(false);
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/history/index.json`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list: { days: number }[]) => setHasHistory(list.some((s) => s.days > 0)))
      .catch(() => setHasHistory(false));
  }, []);

  // The committed snapshot is for the station's area only.
  const snapshot = place.remote ? null : latest;
  const forecastPeriods = nwsLive.data?.forecast ?? snapshot?.nws?.forecast ?? [];
  const hourlyPeriods = nwsLive.data?.hourly ?? snapshot?.nws?.hourly ?? [];
  const conditions = nwsLive.data?.observation?.textDescription ?? snapshot?.nws?.observation?.textDescription ?? null;

  useSkyTheme(conditions, place.lat, place.lon);

  return (
    <div className="app">
      <AlertBanner live={alertsLive} />

      <header className="app-header">
        <h1>Hyperlocal Weather</h1>
        <p className="location">{place.remote ? place.label : (latest?.location.name ?? "Loading location…")}</p>
        {hasHistory && !place.remote && (
          <nav className="header-links">
            <a className="history-link" href={`${import.meta.env.BASE_URL}?history=1`}>
              Weather history →
            </a>
          </nav>
        )}
        <button
          type="button"
          className="scroll-note"
          onClick={() => window.scrollBy({ top: window.innerHeight * 0.8, behavior: "smooth" })}
        >
          Scroll down for radar, forecast &amp; more <span className="scroll-note-arrow">&#9660;</span>
        </button>
      </header>

      <main>
        {loading && <p className="empty-state">Loading weather data…</p>}
        {error && <p className="error-state">Error loading data: {error}</p>}

        {!loading && !error && (
          <>
            {place.remote ? (
              <StationCard
                live={nwsAsStation(nwsLive)}
                fallback={null}
                nwsLive={nwsLive}
                nwsFallback={null}
                title={`Weather in ${place.label}`}
                subtitle={describeStation(nwsLive.data?.observation)}
                lat={place.lat}
                lon={place.lon}
                remote
              />
            ) : (
              <StationCard
                live={stationLive}
                fallback={latest?.station ?? null}
                nwsLive={nwsLive}
                nwsFallback={latest?.nws ?? null}
                title="Ironwood Weather"
                lat={place.lat}
                lon={place.lon}
                remote={false}
              />
            )}
            <div className="map-forecast-row">
              <RadarCard />
              <div className="map-forecast-side">
                <TempCurve hourly={hourlyPeriods} lat={place.lat} lon={place.lon} />
                <ForecastList periods={forecastPeriods} />
              </div>
            </div>
            <MetarStrip live={metarLive} />
          </>
        )}
      </main>

      <ScrollHint />

      <footer className="app-footer">
        <p>
          {place.remote
            ? "Data from the National Weather Service (api.weather.gov) and aviationweather.gov."
            : "Data from the National Weather Service (api.weather.gov), aviationweather.gov, and a personal Davis Vantage Pro 2 station via WeatherLink."}
        </p>
      </footer>
    </div>
  );
}

export default App;
