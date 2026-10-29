import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Scrolls the window to top (0, 0) instantly on route changes (pathname change).
 * - Uses behavior "instant" to avoid visible scrolling animation even when CSS scroll-behavior: smooth is active.
 * - If the URL contains an anchor hash (#section), scrolls to that element instead.
 * - Does NOT scroll when only query parameters change (e.g. ?category= or ?badge= on /menu).
 * - Preserves native scroll restoration on browser Back/Forward (POP navigation).
 */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navType = useNavigationType();
  const prevPathnameRef = useRef(pathname);

  useEffect(() => {
    // Only act when the pathname itself has changed
    if (prevPathnameRef.current === pathname) {
      return;
    }
    prevPathnameRef.current = pathname;

    // Preserve previous scroll position on browser Back/Forward
    if (navType === "POP") {
      return;
    }

    // If an anchor hash is present, scroll directly to that element
    if (hash) {
      const targetId = decodeURIComponent(hash.slice(1));
      const scrollToHash = () => {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView();
          return true;
        }
        return false;
      };

      if (!scrollToHash()) {
        requestAnimationFrame(() => {
          scrollToHash();
        });
      }
      return;
    }

    // Temporarily bypass CSS html { scroll-behavior: smooth } to guarantee instant jump
    const html = document.documentElement;
    const prevBehavior = html.style.scrollBehavior;
    html.style.scrollBehavior = "auto";
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    html.style.scrollBehavior = prevBehavior;
  }, [pathname, hash, navType]);

  return null;
}

