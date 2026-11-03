import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useLanguage } from "../hooks/useLanguage.js";
import { useMode } from "../hooks/useMode.js";

function SwapArrowsIcon({ size = 15 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      className="mode-indicator-bar__switch-icon"
    >
      <path d="M7 16V4M7 4L3 8M7 4L11 8" />
      <path d="M17 8V20M17 20L21 16M17 20L13 16" />
    </svg>
  );
}

export default function ModeIndicatorBar() {
  const { t } = useLanguage();
  const { mode, isDelivery, switchMode } = useMode();
  const shouldReduceMotion = useReducedMotion();

  const switchActionLabel = isDelivery
    ? (t("mode.switchToDineIn") || "Switch to Dine In")
    : (t("mode.switchToDelivery") || "Switch to Delivery");

  return (
    <div className="mode-indicator-bar">
      <div className="mode-indicator-bar__info">
        <span className="mode-indicator-bar__label">
          {t("mode.currentMode", { mode: "" }).replace(":", "").trim()}:
        </span>

        {/* Animate badge with mode change */}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={mode}
            className={`mode-indicator-bar__badge ${
              isDelivery ? "mode-indicator-bar__badge--delivery" : "mode-indicator-bar__badge--dine-in"
            }`}
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: shouldReduceMotion ? 0 : 6 }}
            transition={{ duration: shouldReduceMotion ? 0.15 : 0.35, ease: "easeOut" }}
            style={{ willChange: "transform, opacity" }}
          >
            {isDelivery ? t("mode.deliveryLabel") : t("mode.dineInLabel")}
          </motion.span>
        </AnimatePresence>
      </div>

      <button
        type="button"
        className="mode-indicator-bar__switch-btn"
        onClick={switchMode}
        aria-label={switchActionLabel}
      >
        <SwapArrowsIcon size={14} />
        {/* Animate button label with mode change */}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={switchActionLabel}
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -6 }}
            transition={{ duration: shouldReduceMotion ? 0.15 : 0.35, ease: "easeOut" }}
            style={{ display: "inline-block", willChange: "transform, opacity" }}
          >
            {switchActionLabel}
          </motion.span>
        </AnimatePresence>
      </button>
    </div>
  );
}
