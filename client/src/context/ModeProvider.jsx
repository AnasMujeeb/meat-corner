import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const STORAGE_KEY = "mc_mode";
const VALID_MODES = ["dine-in", "delivery"];

export const ModeContext = createContext({
  mode: null, // "dine-in" | "delivery" | null
  setMode: () => {},
  switchMode: () => {},
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

  // Directly toggles the mode: dine-in <-> delivery in ONE click
  // On /menu/* navigates to /menu/<new mode>; on /healthy or /kids stays on same page.
  const switchMode = useCallback(() => {
    const nextMode = mode === "delivery" ? "dine-in" : "delivery";
    setModeState(nextMode);
    try {
      sessionStorage.setItem(STORAGE_KEY, nextMode);
    } catch {}

    const path = location.pathname.toLowerCase();
    if (path.startsWith("/menu")) {
      navigate(`/menu/${nextMode}${location.search || ""}`);
    }
  }, [mode, location.pathname, location.search, navigate]);

  const value = useMemo(() => ({
    mode,
    setMode,
    switchMode,
    isDineIn: mode === "dine-in",
    isDelivery: mode === "delivery",
  }), [mode, setMode, switchMode]);

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
