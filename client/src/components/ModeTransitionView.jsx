import { useEffect, useRef } from "react";
import { useMode } from "../hooks/useMode.js";

/**
 * Wraps the content below the mode indicator bar.
 * Registers its DOM element with ModeProvider so runModeSwitch() can
 * animate it via the Web Animations API without keying/remounting the grid.
 *
 * No AnimatePresence, no motion, no key — the same DOM nodes stay mounted.
 */
export default function ModeTransitionView({ children }) {
  const ref = useRef(null);
  const { registerTransitionRef } = useMode();

  useEffect(() => {
    registerTransitionRef(ref.current);
    return () => registerTransitionRef(null);
  }, [registerTransitionRef]);

  return (
    <div className="mode-transition-viewport" ref={ref}>
      <div className="mode-transition-content">
        {children}
      </div>
    </div>
  );
}
