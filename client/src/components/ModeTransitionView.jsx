import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useLanguage } from "../hooks/useLanguage.js";
import { useMode } from "../hooks/useMode.js";

/**
 * Wraps content below the mode indicator bar with an overlapping cross-slide transition:
 * - mode="popLayout" so exit and enter overlap simultaneously with no blank gap
 * - In LTR: exiting slides 0 -> -80px (fade 1 -> 0); entering slides +80px -> 0 (fade 0 -> 1)
 * - In RTL: exiting slides 0 -> +80px (fade 1 -> 0); entering slides -80px -> 0 (fade 0 -> 1)
 * - Duration: ~350ms with easeOut
 * - Uses transform only (will-change: transform)
 * - Container clips horizontally (overflow-x: clip) to prevent page scroll or layout jump
 * - Prefers-reduced-motion: quick clean fade only
 */
export default function ModeTransitionView({ children }) {
  const { mode } = useMode();
  const { dir } = useLanguage();
  const shouldReduceMotion = useReducedMotion();

  const isRTL = dir === "rtl";
  // LTR: enter from +80, exit to -80
  // RTL: enter from -80, exit to +80
  const enterOffset = isRTL ? -80 : 80;
  const exitOffset = isRTL ? 80 : -80;

  const variants = {
    initial: {
      opacity: 0,
      x: shouldReduceMotion ? 0 : enterOffset,
    },
    animate: {
      opacity: 1,
      x: 0,
      transition: {
        duration: shouldReduceMotion ? 0.15 : 0.35,
        ease: [0.16, 1, 0.3, 1], // easeOut
      },
    },
    exit: {
      opacity: 0,
      x: shouldReduceMotion ? 0 : exitOffset,
      transition: {
        duration: shouldReduceMotion ? 0.15 : 0.35,
        ease: [0.4, 0, 0.7, 1],
      },
    },
  };

  return (
    <div className="mode-transition-viewport">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={mode || "none"}
          className="mode-transition-content"
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          style={{ willChange: "transform, opacity" }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
