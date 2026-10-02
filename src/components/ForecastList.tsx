import { getConditionIcon } from "../lib/weatherIcons";
import { iconTone } from "../lib/sky";
import type { NwsForecastPeriod } from "../types/weather";

interface Props {
  periods: NwsForecastPeriod[];
}

// NWS returns alternating day/night periods; the cards pair each day with
// the night that follows it so a card reads like "63 / 46".
interface DayCard {
  key: string;
  label: string;
  day: NwsForecastPeriod | null;
  night: NwsForecastPeriod | null;
}

const weekdayFmt = new Intl.DateTimeFormat("en-US", { weekday: "short" });

function sameDate(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildCards(periods: NwsForecastPeriod[]): DayCard[] {
  const cards: DayCard[] = [];
  const today = new Date();
  let i = 0;
  while (i < periods.length) {
    const p = periods[i];
    if (!p.isDaytime) {
      // A leading night period ("Tonight", "Overnight") stands alone.
      cards.push({ key: p.startTime, label: p.name, day: null, night: p });
      i += 1;
      continue;
    }
    const next = periods[i + 1];
    const night = next && !next.isDaytime ? next : null;
    const date = new Date(p.startTime);
    const label = sameDate(date, today) ? "Today" : `${weekdayFmt.format(date)} ${date.getDate()}`;
    cards.push({ key: p.startTime, label, day: p, night });
    i += night ? 2 : 1;
  }
  return cards;
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

  const cards = buildCards(periods);

  return (
    <section className="card">
      <h2>Forecast</h2>
      <div className="forecast-scroll">
        {cards.map((c) => {
          // The day's weather drives the card; a night-only card uses the night.
          const lead = c.day ?? (c.night as NwsForecastPeriod);
          const Icon = getConditionIcon(lead.shortForecast, lead.isDaytime);
          const tone = iconTone(lead.shortForecast, lead.isDaytime);
          const pops = [c.day, c.night]
            .map((p) => p?.probabilityOfPrecipitation ?? 0)
            .filter((n) => n > 0);
          const pop = pops.length ? Math.max(...pops) : 0;
          return (
            <div className="forecast-item" data-tone={tone} key={c.key}>
              <div className="forecast-name">{c.label}</div>
              <span className="icon-tone forecast-icon" data-tone={tone}>
                <Icon size={36} />
              </span>
              <div className="forecast-temps">
                {c.day && <span className="forecast-high">{c.day.temperature}°</span>}
                {c.night && <span className="forecast-low">{c.night.temperature}°</span>}
              </div>
              <div className="forecast-desc">{lead.shortForecast}</div>
              {pop > 0 && <div className="forecast-pop">&#9748; {pop}%</div>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
