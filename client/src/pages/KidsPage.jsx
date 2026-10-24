import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useMenu } from "../api/queries.js";
import { KIDS_CONTENT } from "../content/kids.js";
import ItemModal from "../components/ItemModal.jsx";
import FoodCard from "../components/FoodCard.jsx";
import PageMotionReel from "../components/PageMotionReel.jsx";
import familyMomentsImg from "../../pictures/family moments updated.jpeg";
import {
  ScrollReveal,
  StaggerContainer,
  StaggerItem,
} from "../components/motion/ScrollReveal.jsx";
import { LUXURY_EASE } from "../components/motion/motionTokens.js";

export default function KidsPage() {
  const [selectedItem, setSelectedItem] = useState(null);

  // Fetch only real items tagged "kids"
  const { data: menuData, isLoading } = useMenu({ tag: "kids", limit: 24 });
  const items = menuData?.items || [];

  return (
    <div className="kids-page">
      {/* ── Page Header ────────────────────────────────────────── */}
      <section className="site-section page-hero">
        <div className="site-container">
          <motion.span
            className="eyebrow"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: LUXURY_EASE }}
          >
            {KIDS_CONTENT.hero.eyebrow}
          </motion.span>
          <motion.h1
            className="heading-xl"
            style={{ marginBottom: 20, whiteSpace: "pre-line" }}
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: LUXURY_EASE }}
          >
            {KIDS_CONTENT.hero.heading}
          </motion.h1>
          <motion.p
            className="body-text"
            style={{ maxWidth: 540 }}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35, ease: LUXURY_EASE }}
          >
            {KIDS_CONTENT.hero.intro}
          </motion.p>
        </div>
      </section>

      {/* ── Motion Video Banner ─────────────────────────────────── */}
      <PageMotionReel
        tag={KIDS_CONTENT.reel.tag}
        title={KIDS_CONTENT.reel.title}
        subtitle={KIDS_CONTENT.reel.subtitle}
        backgroundImage={familyMomentsImg}
        posterUrl={familyMomentsImg}
        fullHeight={true}
        contained={false}
        imagePosition="center 50%"
        imageScale={1.16}
      />

      {/* ── Kids Menu Items ────────────────────────────────────────── */}
      <section className="site-section">
        <div className="site-container">
          <ScrollReveal className="site-section__header" style={{ marginBottom: 24 }}>
            <div>
              <span className="eyebrow">{KIDS_CONTENT.listing.eyebrow}</span>
              <h2 className="heading-lg" style={{ whiteSpace: "pre-line" }}>{KIDS_CONTENT.listing.heading}</h2>
            </div>
            <Link to="/menu" className="btn btn--outline" style={{ alignSelf: "flex-end" }}>
              {KIDS_CONTENT.listing.viewAllText}
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
              <h3 className="heading-md" style={{ marginBottom: 12 }}>{KIDS_CONTENT.emptyState.title}</h3>
              <p className="body-text" style={{ margin: "0 auto 20px" }}>
                {KIDS_CONTENT.emptyState.desc}
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
                    categoryName="Kids Menu"
                    onSelect={(it) => setSelectedItem(it)}
                  />
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </div>
      </section>

      {/* ── Split Section: Family Friendly ───────────────────────── */}
      <section className="story-split story-split--reverse" aria-label="Family friendly">
        <ScrollReveal className="story-split__content story-split__content--accent" delay={0.05} y={20}>
          <span className="eyebrow" style={{ color: "#fff" }}>{KIDS_CONTENT.split.eyebrow}</span>
          <h2 style={{ whiteSpace: "pre-line" }}>{KIDS_CONTENT.split.heading}</h2>
          <p>{KIDS_CONTENT.split.body}</p>
          <div className="story-split__actions">
            <Link to="/menu" className="btn btn--outline-white">
              {KIDS_CONTENT.split.ctaText}
            </Link>
          </div>
        </ScrollReveal>
        <ScrollReveal className="story-split__media" delay={0.15} y={20}>
          <img src="/uploads/processed/mac-cheese.webp" alt="Family meals" loading="lazy" decoding="async" width="800" height="600" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </ScrollReveal>
      </section>

      {/* Item Modal */}
      {selectedItem && (
        <ItemModal
          item={selectedItem}
          categoryName="Kids Menu"
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}
