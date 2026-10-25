import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useMenu } from "../api/queries.js";
import { HEALTHY_CONTENT } from "../content/healthy.js";
import ItemModal from "../components/ItemModal.jsx";
import FoodCard from "../components/FoodCard.jsx";
import PageMotionReel from "../components/PageMotionReel.jsx";
import balancedMealsImg from "../../pictures/balanced-meals.jpg";
import {
  ScrollReveal,
  StaggerContainer,
  StaggerItem,
} from "../components/motion/ScrollReveal.jsx";
import { LUXURY_EASE } from "../components/motion/motionTokens.js";

export default function HealthyPage() {
  const [selectedItem, setSelectedItem] = useState(null);

  // Fetch only real items tagged "healthy"
  const { data: menuData, isLoading } = useMenu({ tag: "healthy", limit: 24 });
  const items = menuData?.items || [];

  return (
    <div className="healthy-page">
      {/* ── Page Header ────────────────────────────────────────── */}
      <section className="site-section page-hero">
        <div className="site-container">
          <motion.span
            className="eyebrow"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: LUXURY_EASE }}
          >
            {HEALTHY_CONTENT.hero.eyebrow}
          </motion.span>
          <motion.h1
            className="heading-xl"
            style={{ marginBottom: 20, whiteSpace: "pre-line" }}
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: LUXURY_EASE }}
          >
            {HEALTHY_CONTENT.hero.heading}
          </motion.h1>
          <motion.p
            className="body-text"
            style={{ maxWidth: 560 }}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35, ease: LUXURY_EASE }}
          >
            {HEALTHY_CONTENT.hero.intro}
          </motion.p>
        </div>
      </section>

      {/* ── Motion Video Banner ─────────────────────────────────── */}
      <PageMotionReel
        tag={HEALTHY_CONTENT.reel.tag}
        title={HEALTHY_CONTENT.reel.title}
        subtitle={HEALTHY_CONTENT.reel.subtitle}
        backgroundImage={balancedMealsImg}
        posterUrl={balancedMealsImg}
        fullHeight={true}
        contained={false}
        imagePosition="52% 18%"
        imageScale={1.03}
      />

      {/* ── Split Section: Balanced Options ────────────────────── */}
      <section className="story-split" aria-label="Balanced options">
        <ScrollReveal className="story-split__media" delay={0.05} y={20}>
          <img src="/uploads/processed/chicken-shawarma-bowl.webp" alt="Healthy selections at Meat Corner" loading="lazy" decoding="async" width="800" height="600" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </ScrollReveal>
        <ScrollReveal className="story-split__content" delay={0.15} y={20}>
          <span className="eyebrow">{HEALTHY_CONTENT.split.eyebrow}</span>
          <h2 style={{ whiteSpace: "pre-line" }}>{HEALTHY_CONTENT.split.heading}</h2>
          <p>{HEALTHY_CONTENT.split.body}</p>
        </ScrollReveal>
      </section>

      {/* ── Healthy Dishes Listing ─────────────────────────────── */}
      <section className="site-section">
        <div className="site-container">
          <ScrollReveal className="site-section__header" style={{ marginBottom: 24 }}>
            <div>
              <span className="eyebrow">{HEALTHY_CONTENT.listing.eyebrow}</span>
              <h2 className="heading-lg" style={{ whiteSpace: "pre-line" }}>{HEALTHY_CONTENT.listing.heading}</h2>
            </div>
            <Link to="/menu" className="btn btn--outline" style={{ alignSelf: "flex-end" }}>
              {HEALTHY_CONTENT.listing.viewAllText}
            </Link>
          </ScrollReveal>

          {isLoading ? (
            <div className="menu-section-grid">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="food-card skeleton" style={{ minHeight: 280 }} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="menu-empty-state">
              <h3 className="heading-md" style={{ marginBottom: 12 }}>{HEALTHY_CONTENT.emptyState.title}</h3>
              <p className="body-text" style={{ margin: "0 auto 20px" }}>
                {HEALTHY_CONTENT.emptyState.desc}
              </p>
              <Link to="/menu" className="btn btn--primary btn--sm">
                BROWSE FULL MENU
              </Link>
            </div>
          ) : (
            <StaggerContainer className="menu-section-grid" staggerDelay={0.07}>
              {items.map((item, idx) => (
                <StaggerItem key={item._id} className="food-card-motion-wrap">
                  <FoodCard
                    item={item}
                    index={idx + 1}
                    categoryName="Healthy Dishes"
                    onSelect={(it) => setSelectedItem(it)}
                  />
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </div>
      </section>

      {/* Item Modal */}
      {selectedItem && (
        <ItemModal
          item={selectedItem}
          categoryName="Healthy Dishes"
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}
