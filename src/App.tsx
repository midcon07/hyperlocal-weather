import { StationCard } from "./components/StationCard";
import { NwsCard } from "./components/NwsCard";
import { ForecastList } from "./components/ForecastList";
import { ComparisonChart } from "./components/ComparisonChart";
import { useWeatherData } from "./hooks/useWeatherData";
import { useNwsLive } from "./hooks/useNwsLive";
import { useStationLive } from "./hooks/useStationLive";
import "./App.css";

function App() {
  const { latest, history, loading, error } = useWeatherData();
  const nwsLive = useNwsLive();
  const stationLive = useStationLive();

  const forecastPeriods = nwsLive.data?.forecast ?? latest?.nws?.forecast ?? [];

  return (
    <div className="app">
      <header className="app-header">
        <h1>Hyperlocal Weather</h1>
        <p className="location">{latest?.location.name ?? "Loading location…"}</p>
      </header>

      <main>
        {loading && <p className="empty-state">Loading weather data…</p>}
        {error && <p className="error-state">Error loading data: {error}</p>}

        {!loading && !error && (
          <>
            <section className="card-grid">
              <StationCard live={stationLive} fallback={latest?.station ?? null} />
              <NwsCard live={nwsLive} fallback={latest?.nws ?? null} />
            </section>
            <ComparisonChart history={history} />
            <ForecastList periods={forecastPeriods} />
          </>
        )}
      </main>

      <footer className="app-footer">
        <p>
          Data from the National Weather Service (api.weather.gov) and a
          personal Davis Vantage Pro 2 station via WeatherLink.
        </p>
      </footer>
    </div>
  );
}

export default App;
