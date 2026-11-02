import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useLanguage } from "../hooks/useLanguage.js";
import { STORY_CONTENT } from "../content/story.js";
import PageMotionReel from "../components/PageMotionReel.jsx";
import craftsAtmosphereImg from "../../pictures/crafts and atmosphere.jpeg";
import ourStoryImg from "../../pictures/our-story.webp";
import {
  ScrollReveal,
  StaggerContainer,
  StaggerItem,
} from "../components/motion/ScrollReveal.jsx";
import { LUXURY_EASE } from "../components/motion/motionTokens.js";

export default function StoryPage() {
  const { story, reel, concept } = STORY_CONTENT;
  const { t } = useLanguage();

  return (
    <div className="story-page">
      {/* ── Page Hero: Our Story Header & Lead ────────────────────────────── */}
      <section className="site-section page-hero">
        <div className="site-container">
          <motion.span
            className="eyebrow"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: LUXURY_EASE }}
          >
            {t("story.hero.eyebrow")}
          </motion.span>

          <motion.h1
            className="heading-xl"
            style={{ marginBottom: 20, whiteSpace: "pre-line" }}
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: LUXURY_EASE }}
          >
            {t("story.hero.heading")}
          </motion.h1>

          <motion.div
            className="story-lead-block"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.32, ease: LUXURY_EASE }}
          >
            <p className="story-lead-text">
              {t("story.hero.lead")}
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Our Story: Milestone Journey Grid ──────────────────────────────── */}
      <section className="site-section story-journey-section">
        <div className="site-container">
          <ScrollReveal className="site-section__header" style={{ marginBottom: 20 }}>
            <div>
              <span className="eyebrow">{t("story.journey.eyebrow")}</span>
              <h2 className="heading-md" style={{ letterSpacing: "-0.01em" }}>
                {t("story.journey.heading")}
              </h2>
            </div>
          </ScrollReveal>

          <StaggerContainer className="story-journey-grid" staggerDelay={0.12}>
            {story.milestones.map((m, idx) => {
              const isToday = idx === 2;
              const mNum = idx + 1;
              return (
                <StaggerItem
                  key={m.year}
                  className={`story-milestone-card${isToday ? " story-milestone-card--featured" : ""}`}
                >
                  <div className="story-milestone-card__head">
                    <span className="story-milestone-card__year">{t(`story.journey.m${mNum}.year`) || m.year}</span>
                    <span className="story-milestone-card__location">{t(`story.journey.m${mNum}.location`) || m.location}</span>
                  </div>
                  <h3 className="story-milestone-card__title">{t(`story.journey.m${mNum}.subtitle`) || m.subtitle}</h3>
                  <p className="story-milestone-card__text">{t(`story.journey.m${mNum}.text`) || m.text}</p>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        </div>
      </section>

      {/* ── Crafts and Atmosphere Section ───────────────────────────────────── */}
      <section className="site-section story-atmosphere-section" aria-label={t("story.atmosphere.aria")}>
        <div className="site-container">
          {/* Section image directly above the Crafts and Atmosphere heading */}
          <ScrollReveal y={24} duration={0.8}>
            <div className="story-atmosphere-card">
              <img
                src={craftsAtmosphereImg}
                alt={t("story.atmosphere.imgAlt")}
                className="story-atmosphere-img"
                loading="lazy"
                decoding="async"
                width="1516"
                height="1038"
              />
              <div className="story-atmosphere-card__overlay" />
            </div>
          </ScrollReveal>

          {/* Crafts and Atmosphere section heading */}
          <ScrollReveal className="story-atmosphere-header" delay={0.15} y={20}>
            <span className="eyebrow">{t("story.reel.tag")}</span>
            <h2 className="heading-lg" style={{ marginTop: 8, marginBottom: 12 }}>
              {t("story.reel.title")}
            </h2>
            <p className="body-text" style={{ maxWidth: 640 }}>
              {t("story.reel.subtitle")}
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Our Concept Section: A Steakhouse for Different Lifestyles ───────── */}
      <section className="story-split story-split--concept" aria-label={t("story.concept.aria")}>
        <ScrollReveal className="story-split__media" delay={0.05} y={20}>
          <img
            src={ourStoryImg}
            alt={t("story.concept.imgAlt")}
            loading="lazy"
            decoding="async"
            width="1179"
            height="1503"
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 45%" }}
          />
        </ScrollReveal>

        <ScrollReveal className="story-split__content" delay={0.15} y={20}>
          <span className="eyebrow" style={{ color: "var(--red2)" }}>
            {t("story.concept.eyebrow")}
          </span>
          <h2 style={{ whiteSpace: "pre-line" }}>
            {t("story.concept.heading")}
          </h2>

          {concept.paragraphs.map((p, i) => (
            <p key={i} className="concept-paragraph">
              {t(`story.concept.p${i + 1}`) || p}
            </p>
          ))}

          <div className="concept-chips">
            {concept.features.map((feat, i) => (
              <span key={feat} className="concept-chip">
                {t(`story.concept.feat${i + 1}`) || feat}
              </span>
            ))}
          </div>

          <div className="story-split__actions">
            <Link to={concept.ctaLink} className="btn btn--primary" id="story-menu-btn">
              {t("story.concept.cta")} →
            </Link>
          </div>
        </ScrollReveal>
      </section>
    </div>
  );
}
