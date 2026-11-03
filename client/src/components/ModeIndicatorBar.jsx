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
  const { isDelivery, runModeSwitch } = useMode();

  const switchActionLabel = isDelivery
    ? (t("mode.switchToDineIn") || "Switch to Dine In")
    : (t("mode.switchToDelivery") || "Switch to Delivery");

  return (
    <div className="mode-indicator-bar">
      <button
        type="button"
        className="mode-indicator-bar__switch-btn"
        onClick={runModeSwitch}
        aria-label={switchActionLabel}
      >
        <SwapArrowsIcon size={14} />
        <span>{switchActionLabel}</span>
      </button>
    </div>
  );
}
