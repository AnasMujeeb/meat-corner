import { useState } from "react";
import { motion } from "framer-motion";
import { api } from "../api.js";
import { useBranches, useSettings } from "../api/queries.js";
import { useLanguage } from "../hooks/useLanguage.js";
import { CONTACT_CONTENT } from "../content/contact.js";
import PageMotionReel from "../components/PageMotionReel.jsx";
import getTouchedImg from "../../pictures/get touched updated.jpeg";
import {
  ScrollReveal,
  StaggerContainer,
  StaggerItem,
} from "../components/motion/ScrollReveal.jsx";
import { LUXURY_EASE } from "../components/motion/motionTokens.js";

export default function ContactPage() {
  const { data: branches = [] } = useBranches();
  const { data: settings = {} } = useSettings();
  const { t } = useLanguage();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
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
      if (formData.website) {
        payload.website = formData.website;
      }

      const res = await api.contact(payload);
      if (res && res.success === false) {
        setError(res.message || t("contact.form.errorGeneric"));
      } else {
        setSubmitted(true);
        setFormData({ name: "", email: "", phone: "", message: "", website: "" });
      }
    } catch (err) {
      setError(err.message || t("contact.form.errorNetwork"));
    } finally {
      setLoading(false);
    }
  }

  const whatsappHref = settings?.socials?.whatsapp
    ? (settings.socials.whatsapp.startsWith("http")
        ? settings.socials.whatsapp
        : `https://wa.me/${settings.socials.whatsapp.replace(/[^0-9]/g, "")}`)
    : "https://wa.me/97470033738";

  const talabatHref = settings?.socials?.talabat || "https://www.talabat.com/qatar";

  return (
    <div className="contact-page">
      {/* ── Page Hero ────────────────────────────────────────────── */}
      <section className="site-section page-hero">
        <div className="site-container">
          <motion.span
            className="eyebrow"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: LUXURY_EASE }}
          >
            {t("contact.hero.eyebrow")}
          </motion.span>
          <motion.h1
            className="heading-xl"
            style={{ marginBottom: 20, whiteSpace: "pre-line" }}
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: LUXURY_EASE }}
          >
            {t("contact.hero.heading")}
          </motion.h1>
          <motion.p
            className="body-text"
            style={{ maxWidth: 540 }}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35, ease: LUXURY_EASE }}
          >
            {t("contact.hero.intro")}
          </motion.p>
        </div>
      </section>

      {/* ── Motion Video Banner ─────────────────────────────────── */}
      <PageMotionReel
        tag={t("contact.reel.tag")}
        title={t("contact.reel.title")}
        subtitle={t("contact.reel.subtitle")}
        backgroundImage={getTouchedImg}
        posterUrl={getTouchedImg}
        fullHeight={true}
        contained={false}
        imagePosition="58% 30%"
        imageScale={1.04}
      />

      {/* ── Locations Cards Section ─────────────────────────────── */}
      <section className="site-section">
        <div className="site-container">
          <ScrollReveal className="site-section__header branch-head">
            <div>
              <span className="eyebrow">{t("contact.branches.eyebrow")}</span>
              <h2 className="heading-lg" style={{ whiteSpace: "pre-line" }}>{t("contact.branches.heading")}</h2>
            </div>
            <p className="site-section__intro">
              {t("contact.branches.intro")}
            </p>
          </ScrollReveal>

          <StaggerContainer className="contact-branches-grid" staggerDelay={0.08}>
            {branches.map((b, idx) => (
              <StaggerItem key={b._id || b.name} className="contact-card branch-card">
                <span className="branch-number">{String(idx + 1).padStart(2, "0")}</span>
                <h3>{b.name}</h3>
                <p>
                  {b.address && <>{b.address}<br /></>}
                  {b.openingHours && <>{b.openingHours}<br /></>}
                  {b.phone && (
                    <a href={`tel:${b.phone}`}>{b.phone}</a>
                  )}
                </p>
                {b.mapUrl && (
                  <a
                    className="btn btn--primary"
                    href={b.mapUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                    style={{ marginTop: "auto" }}
                  >
                    {t("contact.branches.directions")}
                  </a>
                )}
              </StaggerItem>
            ))}

            {/* General Contact Info Card */}
            <StaggerItem className="contact-card">
              <h3>{t("contact.directContact")}</h3>
              <p>
                {settings?.contactPhone && (
                  <>
                    <b>{t("contact.phone")}</b><br />
                    <a href={`tel:${settings.contactPhone}`}>{settings.contactPhone}</a>
                    <br /><br />
                  </>
                )}
                {settings?.contactEmail && (
                  <>
                    <b>{t("contact.email")}</b><br />
                    <a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a>
                    <br /><br />
                  </>
                )}
                {settings?.socials?.instagram && (
                  <>
                    <b>{t("contact.instagram")}</b><br />
                    <a href={settings.socials.instagram} target="_blank" rel="noopener noreferrer">
                      @meatcorner.qa
                    </a>
                  </>
                )}
              </p>
              <div style={{ display: "flex", gap: 10, marginTop: "auto", flexWrap: "wrap" }}>
                {Boolean(settings?.socials?.whatsapp) && (
                  <a className="btn btn--primary" href={whatsappHref} target="_blank" rel="noopener noreferrer">
                    WhatsApp
                  </a>
                )}
                {Boolean(settings?.socials?.talabat) && (
                  <a className="btn btn--outline" href={talabatHref} target="_blank" rel="noopener noreferrer">
                    Talabat
                  </a>
                )}
              </div>
            </StaggerItem>
          </StaggerContainer>
        </div>
      </section>

      {/* ── Quick Message Form Section ───────────────────────────── */}
      <section className="site-section" style={{ paddingTop: 0 }}>
        <div className="site-container" style={{ maxWidth: 920 }}>
          <ScrollReveal className="site-section__header" style={{ marginBottom: 28 }}>
            <div>
              <span className="eyebrow">{t("contact.form.eyebrow")}</span>
              <h2 className="heading-lg" style={{ whiteSpace: "pre-line" }}>{t("contact.form.heading")}</h2>
            </div>
          </ScrollReveal>

          {submitted ? (
            <ScrollReveal className="form-status-box form-status-box--success">
              <h3 className="heading-sm" style={{ color: "var(--red)", marginBottom: 8 }}>
                {t("contact.form.successTitle")}
              </h3>
              <p className="body-text" style={{ marginBottom: 16 }}>
                {t("contact.form.successMessage")}
              </p>
              <button className="btn btn--primary btn--sm" onClick={() => setSubmitted(false)}>
                {t("contact.form.resetBtn")}
              </button>
            </ScrollReveal>
          ) : (
            <ScrollReveal as="form" onSubmit={handleSubmit} noValidate className="form-grid-layout" delay={0.1}>
              {error && (
                <div className="form-status-box form-status-box--error" style={{ gridColumn: "1 / -1" }}>
                  {error}
                </div>
              )}

              {/* Honeypot field */}
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
                <label className="form-label" htmlFor="contact-name">{t("contact.form.nameLabel")} <span>*</span></label>
                <input
                  id="contact-name"
                  type="text"
                  name="name"
                  className="form-input"
                  placeholder={t("contact.form.namePlaceholder")}
                  required
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="contact-phone">{t("contact.form.phoneLabel")} <span>*</span></label>
                <input
                  id="contact-phone"
                  type="tel"
                  name="phone"
                  className="form-input"
                  placeholder={t("contact.form.phonePlaceholder")}
                  required
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>

              <div className="form-field form-field--full">
                <label className="form-label" htmlFor="contact-email">{t("contact.form.emailLabel")} <span>*</span></label>
                <input
                  id="contact-email"
                  type="email"
                  name="email"
                  className="form-input"
                  placeholder={t("contact.form.emailPlaceholder")}
                  required
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              <div className="form-field form-field--full">
                <label className="form-label" htmlFor="contact-message">{t("contact.form.messageLabel")} <span>*</span></label>
                <textarea
                  id="contact-message"
                  name="message"
                  className="form-textarea"
                  placeholder={t("contact.form.messagePlaceholder")}
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
                  {loading ? t("contact.form.submittingBtn") : t("contact.form.submitBtn")}
                </button>
              </div>
            </ScrollReveal>
          )}
        </div>
      </section>
    </div>
  );
}
