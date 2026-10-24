import { useState, useEffect } from "react";
import { useSettings } from "../api/queries.js";
import { ScrollReveal } from "./motion/ScrollReveal.jsx";

/**
 * Shared motion video reel section used on Menu and subpages.
 * Displays title overlay, shade, and conditionally loads video only after page
 * becomes interactive (and not on slow connection, saveData, or prefers-reduced-motion).
 */
export default function PageMotionReel({
  tag = "",
  title = "",
  subtitle = "",
  videoUrl: customVideoUrl,
  posterUrl: customPosterUrl,
  backgroundImage: customBgImage,
  overlay,
  fullHeight = true,
  contained = false,
  imagePosition = "center center",
  imageScale = 1.08,
  heroHeight,
  className = "",
  style = {},
}) {
  const { data: settings } = useSettings();
  const [canPlayVideo, setCanPlayVideo] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionQuery.matches) return;

    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn?.saveData) return;
    if (conn?.effectiveType && ["slow-2g", "2g"].includes(conn.effectiveType)) return;

    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(() => setCanPlayVideo(true), { timeout: 1500 });
      return () => window.cancelIdleCallback(id);
    } else {
      const timer = setTimeout(() => setCanPlayVideo(true), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  const logoUrl = settings?.logo;
  // Temporarily disabled — uncomment when hero video settings are re-enabled
  // const video = customVideoUrl || settings?.heroVideoUrl || '';
  const video = customVideoUrl || '';
  const rawPoster = customBgImage || customPosterUrl || '';
  // Ensure settings.logo is NEVER used as poster or background image
  const poster = rawPoster && rawPoster !== logoUrl ? rawPoster : '';

  const sectionStyle = {
    ...(heroHeight ? { height: heroHeight, minHeight: heroHeight } : {}),
    ...style,
  };

  return (
    <section
      className={`menu-video-reel ${fullHeight ? "menu-video-reel--full-hero" : ""} ${className}`.trim()}
      style={sectionStyle}
      aria-label={title || "Hero banner"}
    >
      <div className="menu-video-reel__frame">
        {canPlayVideo && video ? (
          <video
            className="menu-video-reel__video"
            src={video}
            poster={poster || undefined}
            autoPlay
            muted
            loop
            playsInline
            preload="none"
          />
        ) : poster ? (
          contained ? (
            <>
              {/* ── Ambient Backdrop Fill ── */}
              <div className="menu-video-reel__backdrop" aria-hidden="true">
                <img
                  src={poster}
                  alt=""
                  className="menu-video-reel__backdrop-img"
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  width="1200"
                  height="675"
                />
                <div className="menu-video-reel__backdrop-tint" />
              </div>

              {/* ── Contained Foreground Stage ── */}
              <div className="menu-video-reel__stage">
                <img
                  src={poster}
                  alt={title || "Hero banner"}
                  className="menu-video-reel__poster-contained"
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  width="1200"
                  height="675"
                />
              </div>
            </>
          ) : (
            <img
              src={poster}
              alt={title || "Hero banner"}
              className="menu-video-reel__poster"
              loading="eager"
              fetchPriority="high"
              decoding="async"
              width="1600"
              height="900"
              style={{
                objectFit: "cover",
                objectPosition: imagePosition,
                transform: `scale(${imageScale})`,
              }}
            />
          )
        ) : (
          <div
            className="menu-video-reel__fallback"
            style={{ background: "#1a1a1a", width: "100%", height: "100%", position: "absolute", inset: 0 }}
          />
        )}
        <div
          className="menu-video-reel__shade"
          style={overlay ? { background: overlay } : undefined}
        />
        <ScrollReveal className="menu-video-reel__content" y={20} duration={0.8}>
          {tag && <span className="menu-video-reel__tag">{tag}</span>}
          {title && <strong className="menu-video-reel__title">{title}</strong>}
          {subtitle && <p className="menu-video-reel__subtitle">{subtitle}</p>}
        </ScrollReveal>
      </div>
    </section>
  );
}
