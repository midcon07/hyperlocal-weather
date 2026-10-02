export interface StationReading {
  timestamp: string;
  temperatureF: number | null;
  humidityPct: number | null;
  windSpeedMph: number | null;
  // 10-minute high; absent in snapshots committed before this field existed.
  windGustMph?: number | null;
  windDirectionDeg: number | null;
  rainRateInPerHr: number | null;
  rainDayIn: number | null;
  barometricPressureInHg: number | null;
  /** Barometer's own 3-hour change in inHg (positive = rising). */
  pressureTrendInHg?: number | null;
  uvIndex: number | null;
  solarRadiationWm2: number | null;
}

export interface NwsObservation {
  stationId: string;
  timestamp: string;
  temperatureC: number | null;
  relativeHumidity: number | null;
  windSpeedKmh: number | null;
  windDirectionDeg: number | null;
  barometricPressurePa: number | null;
  textDescription: string | null;
}

export interface NwsForecastPeriod {
  name: string;
  startTime: string;
  endTime: string;
  isDaytime: boolean;
  temperature: number;
  temperatureUnit: string;
  windSpeed: string;
  windDirection: string;
  shortForecast: string;
  probabilityOfPrecipitation: number | null;
}

export interface NwsHourlyPeriod {
  startTime: string;
  temperature: number;
  temperatureUnit: string;
  shortForecast: string;
  probabilityOfPrecipitation: number | null;
}

export interface NwsData {
  gridId: string;
  gridX: number;
  gridY: number;
  observation: NwsObservation | null;
  forecast: NwsForecastPeriod[];
  hourly: NwsHourlyPeriod[];
}

export interface LatestData {
  generatedAt: string | null;
  location: {
    name: string;
    latitude: number;
    longitude: number;
  };
  station: StationReading | null;
  nws: NwsData | null;
}

export interface HistoryEntry {
  timestamp: string;
  stationTemperatureF: number | null;
  nwsTemperatureC: number | null;
}

export interface NwsAlert {
  id: string;
  event: string;
  headline: string | null;
  description: string;
  severity: string;
  urgency: string;
  areaDesc: string;
  effective: string;
  expires: string;
}

export type FlightCategory = "VFR" | "MVFR" | "IFR" | "LIFR";

export interface MetarReading {
  stationId: string;
  raw: string;
  type: string;
  observedAt: string;
  tempC: number | null;
  dewpointC: number | null;
  windDirDeg: number | null;
  windSpeedKt: number | null;
  visibilitySm: string | number | null;
  altimeterInHg: number | null;
  flightCategory: FlightCategory | null;
}
