import { useEffect, useState } from "react";

// Touch browsers (iPhone, iPad) hide the scrollbar until you scroll, so a
// visitor can miss that the page continues. This draws a slim, always-on
// position strip along the right edge (touch devices only; desktop browsers
// have their own scrollbar) and a "More below" cue that fades once the page
// has been scrolled.

interface HintState {
  scrollable: boolean;
  thumbTop: number;
  thumbHeight: number;
  atTop: boolean;
}

const EDGE = 12; // gap above and below the strip

function measure(): HintState {
  const doc = document.documentElement;
  const viewport = window.innerHeight;
  const total = doc.scrollHeight;
  const scrollable = total > viewport + 8;
  const track = viewport - EDGE * 2;
  const thumbHeight = Math.max(36, (track * viewport) / total);
  const progress = scrollable ? Math.min(1, Math.max(0, window.scrollY / (total - viewport))) : 0;
  return {
    scrollable,
    thumbHeight,
    thumbTop: EDGE + (track - thumbHeight) * progress,
    atTop: window.scrollY < 60,
  };
}

export function ScrollHint() {
  const [state, setState] = useState<HintState>(() => ({ scrollable: false, thumbTop: EDGE, thumbHeight: 0, atTop: true }));

  useEffect(() => {
    const update = () => setState(measure());
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    // The page grows as data and images arrive, so watch its height too.
    const observer = new ResizeObserver(update);
    observer.observe(document.body);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      observer.disconnect();
    };
  }, []);

  if (!state.scrollable) return null;

  return (
    <>
      <div className="scroll-strip" aria-hidden="true">
        <div className="scroll-strip-thumb" style={{ height: state.thumbHeight, transform: `translateY(${state.thumbTop}px)` }} />
      </div>
      <button
        type="button"
        className={`scroll-cue${state.atTop ? "" : " scroll-cue--hidden"}`}
        onClick={() => window.scrollBy({ top: window.innerHeight * 0.8, behavior: "smooth" })}
        tabIndex={state.atTop ? 0 : -1}
        aria-hidden={!state.atTop}
      >
        More below <span className="scroll-cue-arrow">&#9660;</span>
      </button>
    </>
  );
}
