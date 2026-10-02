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
import "./App.css";

function App() {
  const { latest, loading, error } = useWeatherData();
  const nwsLive = useNwsLive();
  const stationLive = useStationLive();
  const alertsLive = useAlertsLive();
  const metarLive = useMetarLive();

  const forecastPeriods = nwsLive.data?.forecast ?? latest?.nws?.forecast ?? [];
  const hourlyPeriods = nwsLive.data?.hourly ?? latest?.nws?.hourly ?? [];

  useSkyTheme(nwsLive.data?.observation?.textDescription ?? latest?.nws?.observation?.textDescription ?? null);

  return (
    <div className="app">
      <AlertBanner live={alertsLive} />

      <header className="app-header">
        <h1>Hyperlocal Weather</h1>
        <p className="location">{latest?.location.name ?? "Loading location…"}</p>
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
            <StationCard
              live={stationLive}
              fallback={latest?.station ?? null}
              nwsLive={nwsLive}
              nwsFallback={latest?.nws ?? null}
            />
            <div className="map-forecast-row">
              <RadarCard />
              <div className="map-forecast-side">
                <TempCurve hourly={hourlyPeriods} />
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
          Data from the National Weather Service (api.weather.gov), aviationweather.gov,
          and a personal Davis Vantage Pro 2 station via WeatherLink.
        </p>
      </footer>
    </div>
  );
}

export default App;
