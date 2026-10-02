import { SETTLE_MS } from "../hooks/useRadarMap";
import type { RadarMap } from "../hooks/useRadarMap";
import { radarUrl } from "../lib/radarEmbed";

// The stacked copies of the NWS map for one useRadarMap controller. Each layer
// is one iframe at the position it was loaded for; its container is shifted
// and scaled to where the target now is, so the newest ready layer always
// looks right while a sharper copy loads behind it.

interface Props {
  map: RadarMap;
  /** Width of the visible window and the offset of the iframe above it. */
  width: number;
  chromeTop: number;
  frameClass: string;
}

export function RadarLayers({ map, width, chromeTop, frameClass }: Props) {
  const { target, layers, markReady, toScreen, centerOf, iframeHeight } = map;
  if (!target || width <= 0) return null;

  return (
    <>
      {layers.map((layer) => {
        const c = centerOf(layer.view);
        const at = toScreen(target, layer.view.lon, layer.view.lat);
        const scale = 2 ** (target.zoom - layer.view.zoom);
        return (
          <div
            key={layer.id}
            className="radar-layer"
            style={{
              opacity: layer.ready ? 1 : 0,
              transformOrigin: `${c.x}px ${c.y}px`,
              transform: `translate(${at.x - c.x}px, ${at.y - c.y}px) scale(${scale})`,
            }}
          >
            <iframe
              className={frameClass}
              src={radarUrl(layer.view)}
              title="NWS radar"
              tabIndex={-1}
              style={{ top: -chromeTop, width, height: iframeHeight }}
              onLoad={() => {
                if (!layer.ready) setTimeout(() => markReady(layer.id), SETTLE_MS);
              }}
            />
          </div>
        );
      })}
    </>
  );
}
