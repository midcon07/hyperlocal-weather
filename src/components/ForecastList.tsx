import { getConditionIcon } from "../lib/weatherIcons";
import { iconTone } from "../lib/sky";
import type { NwsForecastPeriod } from "../types/weather";

interface Props {
  periods: NwsForecastPeriod[];
}

export function ForecastList({ periods }: Props) {
  if (periods.length === 0) {
    return (
      <section className="card">
        <h2>Forecast</h2>
        <p className="empty-state">No forecast data yet.</p>
      </section>
    );
  }

  return (
    <section className="card">
      <h2>Forecast</h2>
      <div className="forecast-scroll">
        {periods.map((p) => {
          const Icon = getConditionIcon(p.shortForecast, p.isDaytime);
          return (
            <div className="forecast-item" key={p.startTime}>
              <div className="forecast-name">{p.name}</div>
              <span className="icon-tone forecast-icon" data-tone={iconTone(p.shortForecast, p.isDaytime)}>
                <Icon size={32} />
              </span>
              <div className="forecast-temp">{p.temperature}°{p.temperatureUnit}</div>
              <div className="forecast-desc">{p.shortForecast}</div>
              {p.probabilityOfPrecipitation !== null && p.probabilityOfPrecipitation > 0 && (
                <div className="forecast-pop">☔ {p.probabilityOfPrecipitation}%</div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
