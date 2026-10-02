import { useEffect } from "react";
import siteConfig from "../../config/site.config.json";
import { isSunUp, skyFromConditions } from "../lib/sky";
import type { SkyCondition, SkyTheme } from "../lib/sky";

const SKY_VALUES: SkyCondition[] = ["clear", "cloudy", "precip", "storm"];

// `?theme=day|night` and `?sky=clear|cloudy|precip|storm` force a look so
// each variant can be previewed without waiting for the weather to cooperate.
function readOverrides(): { theme?: SkyTheme; sky?: SkyCondition } {
  const params = new URLSearchParams(window.location.search);
  const theme = params.get("theme");
  const sky = params.get("sky");
  return {
    theme: theme === "day" || theme === "night" ? theme : undefined,
    sky: SKY_VALUES.includes(sky as SkyCondition) ? (sky as SkyCondition) : undefined,
  };
}

// Sets data-theme (day/night, from the real sun position at the station)
// and data-sky (from current conditions) on <html>; the CSS turns those
// into the page gradient and card colors.
export function useSkyTheme(conditionsText: string | null | undefined) {
  useEffect(() => {
    const { latitude, longitude } = siteConfig.location;
    const overrides = readOverrides();

    function apply() {
      const theme: SkyTheme = overrides.theme ?? (isSunUp(new Date(), latitude, longitude) ? "day" : "night");
      const root = document.documentElement;
      root.dataset.theme = theme;
      root.dataset.sky = overrides.sky ?? skyFromConditions(conditionsText);
    }

    apply();
    const interval = setInterval(apply, 60_000);
    return () => clearInterval(interval);
  }, [conditionsText]);
}
