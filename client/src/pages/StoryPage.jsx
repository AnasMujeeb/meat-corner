import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { STORY_CONTENT } from "../content/story.js";
import PageMotionReel from "../components/PageMotionReel.jsx";
import craftsAtmosphereImg from "../../pictures/crafts and atmosphere.jpeg";
import outsideImg from "../../pictures/outside pic.jpeg";
import {
  ScrollReveal,
  StaggerContainer,
  StaggerItem,
} from "../components/motion/ScrollReveal.jsx";
import { LUXURY_EASE } from "../components/motion/motionTokens.js";

export default function StoryPage() {
  const { story, reel, concept } = STORY_CONTENT;

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
            {story.eyebrow}
          </motion.span>

          <motion.h1
            className="heading-xl"
            style={{ marginBottom: 20, whiteSpace: "pre-line" }}
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: LUXURY_EASE }}
          >
            {story.heading}
          </motion.h1>

          <motion.div
            className="story-lead-block"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.32, ease: LUXURY_EASE }}
          >
            <p className="story-lead-text">
              {story.lead}
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Our Story: Milestone Journey Grid ──────────────────────────────── */}
      <section className="site-section story-journey-section">
        <div className="site-container">
          <ScrollReveal className="site-section__header" style={{ marginBottom: 20 }}>
            <div>
              <span className="eyebrow">THE JOURNEY</span>
              <h2 className="heading-md" style={{ letterSpacing: "-0.01em" }}>
                FROM MADINAT KHALIFA TO CENTRO DOHA
              </h2>
            </div>
          </ScrollReveal>

          <StaggerContainer className="story-journey-grid" staggerDelay={0.12}>
            {story.milestones.map((m, idx) => {
              const isToday = idx === 2;
              return (
                <StaggerItem
                  key={m.year}
                  className={`story-milestone-card${isToday ? " story-milestone-card--featured" : ""}`}
                >
                  <div className="story-milestone-card__head">
                    <span className="story-milestone-card__year">{m.year}</span>
                    <span className="story-milestone-card__location">{m.location}</span>
                  </div>
                  <h3 className="story-milestone-card__title">{m.subtitle}</h3>
                  <p className="story-milestone-card__text">{m.text}</p>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        </div>
      </section>

      {/* ── Crafts and Atmosphere Section ───────────────────────────────────── */}
      <section className="site-section story-atmosphere-section" aria-label="Crafts and Atmosphere">
        <div className="site-container">
          {/* Section image directly above the Crafts and Atmosphere heading */}
          <ScrollReveal y={24} duration={0.8}>
            <div className="story-atmosphere-card">
              <img
                src={craftsAtmosphereImg}
                alt="Meat Corner restaurant atmosphere and dining interior"
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
            <span className="eyebrow">{reel.tag}</span>
            <h2 className="heading-lg" style={{ marginTop: 8, marginBottom: 12 }}>
              {reel.title}
            </h2>
            <p className="body-text" style={{ maxWidth: 640 }}>
              {reel.subtitle}
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Our Concept Section: A Steakhouse for Different Lifestyles ───────── */}
      <section className="story-split story-split--concept" aria-label="Our concept">
        <ScrollReveal className="story-split__media" delay={0.05} y={20}>
          <img
            src={outsideImg}
            alt="Meat Corner restaurant exterior"
            loading="lazy"
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
          />
        </ScrollReveal>

        <ScrollReveal className="story-split__content" delay={0.15} y={20}>
          <span className="eyebrow" style={{ color: "var(--red2)" }}>
            {concept.eyebrow}
          </span>
          <h2 style={{ whiteSpace: "pre-line" }}>
            {concept.heading}
          </h2>

          {concept.paragraphs.map((p, i) => (
            <p key={i} className="concept-paragraph">
              {p}
            </p>
          ))}

          <div className="concept-chips">
            {concept.features.map((feat) => (
              <span key={feat} className="concept-chip">
                {feat}
              </span>
            ))}
          </div>

          <div className="story-split__actions">
            <Link to={concept.ctaLink} className="btn btn--primary" id="story-menu-btn">
              {concept.ctaText} →
            </Link>
          </div>
        </ScrollReveal>
      </section>
    </div>
  );
}
