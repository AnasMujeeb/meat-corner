import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../api.js";
import { CATERING_CONTENT } from "../content/catering.js";
import PageMotionReel from "../components/PageMotionReel.jsx";
import {
  ScrollReveal,
} from "../components/motion/ScrollReveal.jsx";
import { LUXURY_EASE } from "../components/motion/motionTokens.js";

export default function CateringPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    eventDate: "",
    guestCount: "",
    message: "",
    website: "", // honeypot
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        message: formData.message.trim(),
      };
      if (formData.eventDate) {
        payload.eventDate = formData.eventDate;
      }
      if (formData.guestCount) {
        payload.guestCount = parseInt(formData.guestCount, 10);
      }
      if (formData.website) {
        payload.website = formData.website;
      }

      const res = await api.catering(payload);
      if (res && res.success === false) {
        setError(res.message || "Failed to send catering request. Please check your details.");
      } else {
        setSubmitted(true);
        setFormData({
          name: "",
          email: "",
          phone: "",
          eventDate: "",
          guestCount: "",
          message: "",
          website: "",
        });
      }
    } catch (err) {
      setError(err.message || "A network error occurred. Please try again or reach us via WhatsApp.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="catering-page">
      {/* ── Luxury "COMING SOON!" Hero Layout ────────────────────── */}
      <section className="catering-coming-soon" aria-label="Catering Coming Soon">
        <img
          src="/uploads/processed/meat-corner-nachos.webp"
          alt=""
          className="catering-coming-soon__backdrop"
          aria-hidden="true"
        />
        <div className="catering-coming-soon__shade" aria-hidden="true" />

        <div className="catering-coming-soon__content">
          <motion.span
            className="eyebrow"
            style={{ color: "var(--red)", letterSpacing: "0.22em", display: "inline-block" }}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: LUXURY_EASE }}
          >
            CATERING SERVICES · MEAT CORNER
          </motion.span>

          <motion.h1
            className="catering-coming-soon__title"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: LUXURY_EASE }}
          >
            COMING SOON!
          </motion.h1>

          <motion.div
            className="catering-coming-soon__divider"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, delay: 0.35, ease: LUXURY_EASE }}
          />

          <motion.p
            className="catering-coming-soon__subtext"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4, ease: LUXURY_EASE }}
          >
            We are preparing an elevated, bespoke catering experience for your private events, gatherings, and corporate banquets across Doha.
          </motion.p>

          <motion.div
            className="catering-coming-soon__actions"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55, ease: LUXURY_EASE }}
          >
            <Link to="/menu" className="btn btn--primary">
              EXPLORE OUR MENU
            </Link>
            <Link to="/" className="btn btn--outline-white">
              BACK TO HOME
            </Link>
          </motion.div>
        </div>
      </section>

      {/* 
      ══════════════════════════════════════════════════════════════════
      TEMPORARILY COMMENTED OUT CATERING CONTENT & ENQUIRY FORM
      Uncomment when catering service is officially launched.
      ══════════════════════════════════════════════════════════════════

      <section className="site-section page-hero">
        <div className="site-container">
          <motion.span
            className="eyebrow"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: LUXURY_EASE }}
          >
            {CATERING_CONTENT.hero.eyebrow}
          </motion.span>
          <motion.h1
            className="heading-xl"
            style={{ marginBottom: 20, whiteSpace: "pre-line" }}
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: LUXURY_EASE }}
          >
            {CATERING_CONTENT.hero.heading}
          </motion.h1>
          <motion.p
            className="body-text"
            style={{ maxWidth: 580 }}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35, ease: LUXURY_EASE }}
          >
            {CATERING_CONTENT.hero.intro}
          </motion.p>
        </div>
      </section>

      <PageMotionReel
        tag={CATERING_CONTENT.reel.tag}
        title={CATERING_CONTENT.reel.title}
        subtitle={CATERING_CONTENT.reel.subtitle}
      />

      <section className="story-split" aria-label="Tailored catering selections">
        <ScrollReveal className="story-split__media" delay={0.05} y={20}>
          <img src="/uploads/processed/shashlik-tenderloin.webp" alt="Meat Corner catering setup" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </ScrollReveal>
        <ScrollReveal className="story-split__content" delay={0.15} y={20}>
          <span className="eyebrow">{CATERING_CONTENT.split.eyebrow}</span>
          <h2 style={{ whiteSpace: "pre-line" }}>{CATERING_CONTENT.split.heading}</h2>
          <p>{CATERING_CONTENT.split.body}</p>
        </ScrollReveal>
      </section>

      <section className="site-section">
        <div className="site-container" style={{ maxWidth: 920 }}>
          <ScrollReveal className="site-section__header" style={{ marginBottom: 28 }}>
            <div>
              <span className="eyebrow">{CATERING_CONTENT.formSection.eyebrow}</span>
              <h2 className="heading-lg" style={{ whiteSpace: "pre-line" }}>{CATERING_CONTENT.formSection.heading}</h2>
            </div>
          </ScrollReveal>

          {submitted ? (
            <ScrollReveal className="form-status-box form-status-box--success">
              <h3 className="heading-sm" style={{ color: "var(--red)", marginBottom: 8 }}>
                {CATERING_CONTENT.formSection.successTitle}
              </h3>
              <p className="body-text" style={{ marginBottom: 16 }}>
                {CATERING_CONTENT.formSection.successMessage}
              </p>
              <button className="btn btn--primary btn--sm" onClick={() => setSubmitted(false)}>
                {CATERING_CONTENT.formSection.resetBtnText}
              </button>
            </ScrollReveal>
          ) : (
            <ScrollReveal as="form" onSubmit={handleSubmit} noValidate className="form-grid-layout" delay={0.1}>
              {error && (
                <div className="form-status-box form-status-box--error" style={{ gridColumn: "1 / -1" }}>
                  {error}
                </div>
              )}

              <input
                type="text"
                name="website"
                value={formData.website}
                onChange={handleChange}
                style={{ display: "none" }}
                tabIndex={-1}
                autoComplete="off"
              />

              <div className="form-field">
                <label className="form-label" htmlFor="catering-name">Name <span>*</span></label>
                <input
                  id="catering-name"
                  type="text"
                  name="name"
                  className="form-input"
                  required
                  placeholder="e.g. Fatima Al-Kuwari"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="catering-phone">Phone <span>*</span></label>
                <input
                  id="catering-phone"
                  type="tel"
                  name="phone"
                  className="form-input"
                  required
                  placeholder="+974 5500 0000"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="catering-email">Email <span>*</span></label>
                <input
                  id="catering-email"
                  type="email"
                  name="email"
                  className="form-input"
                  required
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="catering-date">Tentative Event Date</label>
                <input
                  id="catering-date"
                  type="date"
                  name="eventDate"
                  className="form-input"
                  value={formData.eventDate}
                  onChange={handleChange}
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="catering-guests">Estimated Guests</label>
                <input
                  id="catering-guests"
                  type="number"
                  name="guestCount"
                  min="10"
                  className="form-input"
                  placeholder="e.g. 50"
                  value={formData.guestCount}
                  onChange={handleChange}
                />
              </div>

              <div className="form-field form-field--full">
                <label className="form-label" htmlFor="catering-message">Notes & Requests <span>*</span></label>
                <textarea
                  id="catering-message"
                  name="message"
                  className="form-textarea"
                  placeholder="Tell us about service style, timing, venue, budget or special requests..."
                  rows={5}
                  required
                  value={formData.message}
                  onChange={handleChange}
                />
              </div>

              <div className="form-field form-field--full">
                <button
                  type="submit"
                  className="btn btn--primary btn--full"
                  disabled={loading}
                  style={{ minHeight: 52 }}
                >
                  {loading ? CATERING_CONTENT.formSection.submittingBtnText : CATERING_CONTENT.formSection.submitBtnText}
                </button>
              </div>
            </ScrollReveal>
          )}
        </div>
      </section>
      */}
    </div>
  );
}
