import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useLanguage } from "../hooks/useLanguage.js";
import { useMode } from "../hooks/useMode.js";
import { LUXURY_EASE } from "./motion/motionTokens.js";

export default function ModeChooser({ onSelectMode }) {
  const { t } = useLanguage();
  const { setMode } = useMode();
  const navigate = useNavigate();
  const location = useLocation();

  function handleChoose(selected) {
    setMode(selected);
    if (onSelectMode) {
      onSelectMode(selected);
    } else {
      const search = location.search || "";
      navigate(`/menu/${selected}${search}`);
    }
  }

  return (
    <section className="mode-chooser-section">
      <div className="site-container">
        <motion.div
          className="mode-chooser-header"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: LUXURY_EASE }}
        >
          <span className="eyebrow">{t("mode.chooserEyebrow")}</span>
          <h1 className="heading-lg" style={{ whiteSpace: "pre-line" }}>
            {t("mode.chooserHeading")}
          </h1>
        </motion.div>

        <div className="mode-chooser-grid">
          {/* Card 1: Dine In */}
          <motion.div
            className="mode-card mode-card--dine-in"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: LUXURY_EASE }}
            onClick={() => handleChoose("dine-in")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleChoose("dine-in");
              }
            }}
          >
            <div className="mode-card__badge">🍽️</div>
            <h2 className="mode-card__title">{t("mode.dineInTitle")}</h2>
            <p className="mode-card__desc">{t("mode.dineInDesc")}</p>
            <button
              type="button"
              className="btn btn--primary btn--full mode-card__btn"
              onClick={(e) => {
                e.stopPropagation();
                handleChoose("dine-in");
              }}
            >
              {t("mode.dineInAction")}
            </button>
          </motion.div>

          {/* Card 2: Delivery */}
          <motion.div
            className="mode-card mode-card--delivery"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: LUXURY_EASE }}
            onClick={() => handleChoose("delivery")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleChoose("delivery");
              }
            }}
          >
            <div className="mode-card__badge">🛵</div>
            <h2 className="mode-card__title">{t("mode.deliveryTitle")}</h2>
            <p className="mode-card__desc">{t("mode.deliveryDesc")}</p>
            <button
              type="button"
              className="btn btn--outline btn--full mode-card__btn"
              onClick={(e) => {
                e.stopPropagation();
                handleChoose("delivery");
              }}
            >
              {t("mode.deliveryAction")}
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
