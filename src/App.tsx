import { CurrentConditions } from "./components/CurrentConditions";
import { ForecastList } from "./components/ForecastList";
import { ComparisonChart } from "./components/ComparisonChart";
import { useWeatherData } from "./hooks/useWeatherData";
import "./App.css";

function App() {
  const { latest, history, loading, error } = useWeatherData();

  return (
    <div className="app">
      <header className="app-header">
        <h1>Hyperlocal Weather</h1>
        <p className="location">{latest?.location.name ?? "Loading location…"}</p>
        {latest?.generatedAt && (
          <p className="timestamp">
            Last data refresh: {new Date(latest.generatedAt).toLocaleString()}
          </p>
        )}
      </header>

      <main>
        {loading && <p className="empty-state">Loading weather data…</p>}
        {error && <p className="error-state">Error loading data: {error}</p>}

        {!loading && !error && (
          <>
            <CurrentConditions
              station={latest?.station ?? null}
              observation={latest?.nws?.observation ?? null}
            />
            <ComparisonChart history={history} />
            <ForecastList periods={latest?.nws?.forecast ?? []} />
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
