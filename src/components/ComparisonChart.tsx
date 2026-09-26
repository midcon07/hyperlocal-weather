import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HistoryEntry } from "../types/weather";

interface Props {
  history: HistoryEntry[];
}

export function ComparisonChart({ history }: Props) {
  const data = history.map((h) => ({
    time: new Date(h.timestamp).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    }),
    "Your Station (°F)": h.stationTemperatureF,
    "NWS Observed (°F)":
      h.nwsTemperatureC === null ? null : (h.nwsTemperatureC * 9) / 5 + 32,
  }));

  return (
    <section className="card">
      <h2>Station vs. NWS Temperature</h2>
      {data.length > 1 ? (
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="time" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} unit="°F" />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="Your Station (°F)"
                stroke="#2563eb"
                dot={false}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="NWS Observed (°F)"
                stroke="#f97316"
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="empty-state">
          Not enough history yet — check back after a few data-fetch runs.
        </p>
      )}
    </section>
  );
}
