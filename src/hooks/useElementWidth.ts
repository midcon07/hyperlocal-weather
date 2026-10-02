import { useEffect, useRef, useState } from "react";

// Tracks an element's rendered size so SVG and iframe content can be
// sized in real pixels instead of stretching with CSS.
export function useElementSize() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, ...size };
}

export function useElementWidth() {
  const { ref, width } = useElementSize();
  return { ref, width };
}
