import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useCart } from "../hooks/useCart.js";
import { useSettings } from "../api/queries.js";

const NAV = [
  { to: "/",         label: "Home"      },
  { to: "/menu",     label: "Menu"      },
  { to: "/healthy",  label: "Healthy"   },
  { to: "/kids",     label: "Kids"      },
  // { to: "/catering", label: "Catering"  },
  { to: "/story",    label: "Our Story" },
  { to: "/contact",  label: "Contact"   },
];

export default function Header({ onCartOpen }) {
  const { pathname } = useLocation();
  const { totalQty } = useCart();
  const { data: settings } = useSettings();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className={`site-header${mobileMenuOpen ? " site-header--menu-open" : ""}`}>
        <div className="site-container site-header__inner">
          {/* Logo */}
          <Link
            to="/"
            className="site-header__brand"
            aria-label="Meat Corner - Home"
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
          <nav className="site-header__nav" aria-label="Main navigation">
            {NAV.map(({ to, label }) => {
              const isActive = pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`site-header__nav-link${isActive ? " site-header__nav-link--active" : ""}`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Tools */}
          <div className="site-header__actions">
            <button
              className={`site-header__cart-btn${totalQty > 0 ? " site-header__cart-btn--has-items" : ""}`}
              onClick={onCartOpen}
              aria-label={`Open cart, ${totalQty} items`}
            >
              <span>Cart</span>
              {totalQty > 0 && (
                <span className="site-header__cart-count" aria-hidden="true">{totalQty}</span>
              )}
            </button>

            {/* Mobile Hamburger Button */}
            <button
              className="site-header__burger"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Full Nav Panel */}
      {mobileMenuOpen && (
        <div className="mobile-nav-panel mobile-nav-panel--open" role="dialog" aria-label="Mobile navigation panel">
          <div className="mobile-nav-panel__links">
            {NAV.map(({ to, label }) => {
              const isActive = pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`mobile-nav-panel__link${isActive ? " mobile-nav-panel__link--active" : ""}`}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {label}
                </Link>
              );
            })}
          </div>

          <div style={{ marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 24 }}>
            <span className="eyebrow" style={{ color: "var(--red)" }}>MEAT CORNER · DOHA</span>
            {settings?.contactPhone && (
              <p style={{ fontSize: 15, color: "#ccc", margin: "6px 0" }}>
                <a href={`tel:${settings.contactPhone}`} style={{ color: "inherit" }}>{settings.contactPhone}</a>
              </p>
            )}
            <p style={{ fontSize: 13, color: "#888", marginTop: 4 }}>
              Madinat Khalifa & Centro · Doha, Qatar
            </p>
          </div>
        </div>
      )}
    </>
  );
}
