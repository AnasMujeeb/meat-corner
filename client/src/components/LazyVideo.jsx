import { useEffect, useRef, useState } from "react";

/**
 * LazyVideo Component
 * - Plays EVERY video currently visible in the viewport (>= 35% intersection).
 * - Immediately pauses playback as soon as the video leaves the viewport (< 35% intersection).
 * - preload="none" and static poster prior to playback.
 * - Respects prefers-reduced-motion and Save-Data network preference.
 */
export default function LazyVideo({
  src,
  poster,
  sources = [],
  className = "",
  style = {},
  autoPlay = true,
  loop = true,
  muted = true,
  playsInline = true,
  ariaHidden = "true",
}) {
  const videoRef = useRef(null);
  const [hasLoadedSource, setHasLoadedSource] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [saveData, setSaveData] = useState(false);

  // Detect user preferences once on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(motionQuery.matches);
    const conn =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;
    if (conn?.saveData) setSaveData(true);
  }, []);

  const canAutoplay = autoPlay && !prefersReducedMotion && !saveData;

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setHasLoadedSource(true);
      if (canAutoplay) el.play().catch(() => {});
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
          setHasLoadedSource(true);
          if (canAutoplay) {
            el.play().catch(() => {});
          }
        } else if (!entry.isIntersecting || entry.intersectionRatio < 0.35) {
          el.pause();
        }
      },
      {
        rootMargin: "0px",
        threshold: [0, 0.35, 0.5, 0.75, 1.0],
      }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      el.pause();
    };
  }, [canAutoplay]);

  // When source is populated, if canAutoplay is true, load & start playback
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !hasLoadedSource) return;
    el.load();
    if (canAutoplay) {
      el.play().catch(() => {});
    }
  }, [hasLoadedSource, canAutoplay]);

  return (
    <video
      ref={videoRef}
      className={className}
      style={style}
      poster={poster}
      preload="none"
      muted={muted}
      loop={loop}
      playsInline={playsInline}
      aria-hidden={ariaHidden}
    >
      {hasLoadedSource && (
        <>
          {sources.map((s, idx) => (
            <source key={idx} src={s.src} type={s.type} />
          ))}
          {src && sources.length === 0 && <source src={src} />}
        </>
      )}
    </video>
  );
}
