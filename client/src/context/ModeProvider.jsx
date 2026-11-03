import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const STORAGE_KEY = "mc_mode";
const VALID_MODES = ["dine-in", "delivery"];

export const ModeContext = createContext({
  mode: null, // "dine-in" | "delivery" | null
  setMode: () => {},
  switchMode: () => {},
  runModeSwitch: () => {},
  registerTransitionRef: () => {},
  isDineIn: false,
  isDelivery: false,
});

function getInitialMode() {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved && VALID_MODES.includes(saved)) {
      return saved;
    }
  } catch {
    // SessionStorage restricted
  }
  return null;
}

export function ModeProvider({ children }) {
  const [mode, setModeState] = useState(getInitialMode);
  const location = useLocation();
  const navigate = useNavigate();

  // Ref to the animated wrapper registered by ModeTransitionView
  const transitionRef = useRef(null);
  // Prevent concurrent animations
  const isAnimating = useRef(false);

  // Keep data-mode attribute on <html> in sync with current mode
  useEffect(() => {
    if (mode) {
      document.documentElement.setAttribute("data-mode", mode);
    } else {
      document.documentElement.removeAttribute("data-mode");
    }
  }, [mode]);

  // Sync mode whenever URL path matches /menu/dine-in, /menu/delivery, or /menu
  useEffect(() => {
    const path = location.pathname.toLowerCase();
    if (path.startsWith("/menu/dine-in")) {
      setModeState("dine-in");
      try {
        sessionStorage.setItem(STORAGE_KEY, "dine-in");
      } catch {}
    } else if (path.startsWith("/menu/delivery")) {
      setModeState("delivery");
      try {
        sessionStorage.setItem(STORAGE_KEY, "delivery");
      } catch {}
    } else if (path === "/menu") {
      // Explicitly on /menu chooser: clear mode so chooser is shown
      setModeState(null);
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
  }, [location.pathname]);

  const setMode = useCallback((newMode) => {
    if (VALID_MODES.includes(newMode) || newMode === null) {
      setModeState(newMode);
      try {
        if (newMode) {
          sessionStorage.setItem(STORAGE_KEY, newMode);
        } else {
          sessionStorage.removeItem(STORAGE_KEY);
        }
      } catch {}
    }
  }, []);

  /** Called by ModeTransitionView to register its wrapper element */
  const registerTransitionRef = useCallback((el) => {
    transitionRef.current = el;
  }, []);

  /**
   * Internal commit: update state + sessionStorage + navigate.
   * Does NOT animate.
   */
  const commitSwitch = useCallback((nextMode, currentPath, currentSearch) => {
    setModeState(nextMode);
    try {
      sessionStorage.setItem(STORAGE_KEY, nextMode);
    } catch {}
    const path = currentPath.toLowerCase();
    if (path.startsWith("/menu")) {
      navigate(`/menu/${nextMode}${currentSearch || ""}`);
    }
  }, [navigate]);

  /**
   * Directly toggles the mode: dine-in <-> delivery in ONE click.
   * Used by ModeChooser (which doesn't need animation).
   * On /menu/* navigates to /menu/<new mode>; on /healthy or /kids stays on same page.
   */
  const switchMode = useCallback(() => {
    const nextMode = mode === "delivery" ? "dine-in" : "delivery";
    commitSwitch(nextMode, location.pathname, location.search);
  }, [mode, location.pathname, location.search, commitSwitch]);

  /**
   * Animated mode switch using Web Animations API.
   * Animates the wrapper registered via registerTransitionRef, then commits.
   * Ignores clicks while a transition is already running.
   * Softer slide:
   *  - exit: translateX 0 -> -40px (RTL +40px), opacity 1 -> 0.35, 150ms ease-in
   *  - enter: from +40px (RTL -40px), opacity 0.35 -> 1, 200ms ease-out
   * Never fades to fully blank.
   */
  const runModeSwitch = useCallback(() => {
    if (isAnimating.current) return;

    const nextMode = mode === "delivery" ? "dine-in" : "delivery";
    const currentPath = location.pathname;
    const currentSearch = location.search;

    // Respect prefers-reduced-motion
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wrapperEl = transitionRef.current;

    if (prefersReduced || !wrapperEl) {
      commitSwitch(nextMode, currentPath, currentSearch);
      return;
    }

    isAnimating.current = true;

    const isRTL = document.documentElement.dir === "rtl";
    const exitX = isRTL ? "40px" : "-40px";
    const enterX = isRTL ? "-40px" : "40px";

    // Exit animation: softer slide, never fully blank (opacity 1 -> 0.35)
    const exitAnim = wrapperEl.animate(
      [
        { transform: "translateX(0)", opacity: 1 },
        { transform: `translateX(${exitX})`, opacity: 0.35 },
      ],
      { duration: 150, easing: "ease-in", fill: "forwards" }
    );

    exitAnim.finished.then(() => {
      // Commit the mode change (state + sessionStorage + navigate)
      commitSwitch(nextMode, currentPath, currentSearch);

      // Let React flush the new content before entering
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const enterAnim = wrapperEl.animate(
            [
              { transform: `translateX(${enterX})`, opacity: 0.35 },
              { transform: "translateX(0)", opacity: 1 },
            ],
            { duration: 200, easing: "ease-out", fill: "forwards" }
          );

          enterAnim.finished.then(() => {
            exitAnim.cancel();
            enterAnim.cancel();
            isAnimating.current = false;
          });
        });
      });
    });
  }, [mode, location.pathname, location.search, commitSwitch]);

  const value = useMemo(() => ({
    mode,
    setMode,
    switchMode,
    runModeSwitch,
    registerTransitionRef,
    isDineIn: mode === "dine-in",
    isDelivery: mode === "delivery",
  }), [mode, setMode, switchMode, runModeSwitch, registerTransitionRef]);

  return (
    <ModeContext.Provider value={value}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  const context = useContext(ModeContext);
  if (!context) {
    throw new Error("useMode must be used within a ModeProvider");
  }
  return context;
}
