import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { LUXURY_EASE } from "../components/motion/motionTokens.js";
import { useLanguage } from "../hooks/useLanguage.js";

export default function NotFoundPage() {
  const { t } = useLanguage();

  return (
    <div className="not-found-page site-section">
      <div
        className="site-container"
        style={{
          minHeight: "55dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "48px 16px",
        }}
      >
        <motion.span
          className="eyebrow"
          style={{ color: "var(--red)", marginBottom: 14 }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: LUXURY_EASE }}
        >
          {t("notfound.eyebrow")}
        </motion.span>

        <motion.h1
          className="heading-xl"
          style={{ marginBottom: 16, fontSize: "clamp(28px, 6vw, 44px)" }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.1, ease: LUXURY_EASE }}
        >
          {t("notfound.heading")}
        </motion.h1>

        <motion.p
          className="body-text"
          style={{ maxWidth: 440, margin: "0 auto 32px" }}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.2, ease: LUXURY_EASE }}
        >
          {t("notfound.desc")}
        </motion.p>

        <motion.div
          style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: LUXURY_EASE }}
        >
          <Link to="/menu" className="btn btn--primary">
            {t("notfound.exploreMenu")}
          </Link>
          <Link to="/" className="btn btn--outline">
            {t("notfound.backHome")}
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
