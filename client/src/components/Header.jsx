import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useCart } from "../hooks/useCart.js";
import { useSettings } from "../api/queries.js";
import { useLanguage } from "../hooks/useLanguage.js";

const NAV = [
  { to: "/",         key: "nav.home",    defaultLabel: "Home"      },
  { to: "/menu",     key: "nav.menu",    defaultLabel: "Menu"      },
  { to: "/healthy",  key: "nav.healthy", defaultLabel: "Healthy"   },
  { to: "/kids",     key: "nav.kids",    defaultLabel: "Kids"      },
  // { to: "/catering", key: "nav.catering", defaultLabel: "Catering" },
  { to: "/story",    key: "nav.story",   defaultLabel: "Our Story" },
  { to: "/contact",  key: "nav.contact", defaultLabel: "Contact"   },
];

export default function Header({ onCartOpen }) {
  const { pathname } = useLocation();
  const { totalQty } = useCart();
  const { data: settings } = useSettings();
  const { lang, setLang, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <header className={`site-header${mobileMenuOpen ? " site-header--menu-open" : ""}`}>
        <div className="site-container site-header__inner">
          {/* Logo */}
          <Link
            to="/"
            className="site-header__brand"
            aria-label={t("header.brandAria")}
            onClick={() => setMobileMenuOpen(false)}
          >
            {settings?.logo ? (
              <img
                src={settings.logo}
                alt={settings.brandName || "Meat Corner"}
              />
            ) : (
              <span className="site-header__brand-fallback">MEAT CORNER</span>
            )}
          </Link>

          {/* Desktop Nav */}
          <nav className="site-header__nav" aria-label={t("header.mainNavAria")}>
            {NAV.map(({ to, key, defaultLabel }) => {
              const isActive = pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`site-header__nav-link${isActive ? " site-header__nav-link--active" : ""}`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {t(key) || defaultLabel}
                </Link>
              );
            })}
          </nav>

          {/* Tools */}
          <div className="site-header__actions">
            {/* Desktop Language Toggle */}
            <button
              type="button"
              className="site-header__lang-btn site-header__lang-btn--desktop"
              onClick={() => setLang(lang === "en" ? "ar" : "en")}
              aria-label={lang === "en" ? t("header.switchToAr") : t("header.switchToEn")}
              title={lang === "en" ? "العربية" : "English"}
            >
              {lang === "en" ? "العربية" : "EN"}
            </button>

            {/* Cart Button */}
            <button
              className={`site-header__cart-btn${totalQty > 0 ? " site-header__cart-btn--has-items" : ""}`}
              onClick={onCartOpen}
              aria-label={t("header.cartAria", { cart: t("nav.cart") || "Cart", count: totalQty })}
            >
              <span>{t("nav.cart") || "Cart"}</span>
              {totalQty > 0 && (
                <span className="site-header__cart-count" aria-hidden="true">{totalQty}</span>
              )}
            </button>

            {/* Mobile Hamburger Button */}
            <button
              className="site-header__burger"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? (t("header.closeMenu") || "Close navigation menu") : (t("header.openMenu") || "Open navigation menu")}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Full Nav Panel */}
      {mobileMenuOpen && (
        <div className="mobile-nav-panel mobile-nav-panel--open" role="dialog" aria-label={t("header.mobileNavAria")}>
          {/* Mobile Language Switcher Row */}
          <div className="mobile-nav-panel__lang-row">
            <span className="mobile-nav-panel__lang-label">
              {lang === "en" ? t("header.langLabel") : "اللغة"}
            </span>
            <button
              type="button"
              className="site-header__lang-btn mobile-nav-panel__lang-btn"
              onClick={() => {
                setLang(lang === "en" ? "ar" : "en");
                setMobileMenuOpen(false);
              }}
              aria-label={lang === "en" ? t("header.switchToAr") : t("header.switchToEn")}
            >
              {lang === "en" ? "العربية" : "EN"}
            </button>
          </div>

          <div className="mobile-nav-panel__links">
            {NAV.map(({ to, key, defaultLabel }) => {
              const isActive = pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`mobile-nav-panel__link${isActive ? " mobile-nav-panel__link--active" : ""}`}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t(key) || defaultLabel}
                </Link>
              );
            })}
          </div>

          <div style={{ marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 24 }}>
            <span className="eyebrow" style={{ color: "var(--red)" }}>MEAT CORNER · DOHA</span>
            {settings?.contactPhone && (
              <p style={{ fontSize: 15, color: "#ccc", margin: "6px 0" }}>
                <a href={`tel:${settings.contactPhone}`} style={{ color: "inherit", direction: "ltr", display: "inline-block" }}>
                  {settings.contactPhone}
                </a>
              </p>
            )}
            <p style={{ fontSize: 13, color: "#888", marginTop: 4 }}>
              {t("footer.location") || "Madinat Khalifa & Centro · Doha, Qatar"}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
