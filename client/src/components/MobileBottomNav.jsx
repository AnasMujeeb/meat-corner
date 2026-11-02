import { Link, useLocation } from "react-router-dom";
import { useCart } from "../hooks/useCart.js";
import { useLanguage } from "../hooks/useLanguage.js";

export default function MobileBottomNav({ onCartOpen }) {
  const { pathname } = useLocation();
  const { totalQty } = useCart();
  const { t } = useLanguage();

  return (
    <nav className="mobile-nav-bar" aria-label={t("mobileNav.quickNavAria")}>
      <Link
        to="/menu"
        className={`mobile-nav-bar__item${pathname === "/menu" ? " mobile-nav-bar__item--active" : ""}`}
        aria-current={pathname === "/menu" ? "page" : undefined}
      >
        <span className="mobile-nav-bar__icon">☷</span>
        <span className="mobile-nav-bar__label">{t("nav.menu") || "Menu"}</span>
      </Link>

      <Link
        to="/"
        className={`mobile-nav-bar__item mobile-nav-bar__item--primary${pathname === "/" ? " mobile-nav-bar__item--active" : ""}`}
        aria-current={pathname === "/" ? "page" : undefined}
      >
        <span className="mobile-nav-bar__icon">⌂</span>
        <span className="mobile-nav-bar__label">{t("nav.home") || "Home"}</span>
      </Link>

      <button
        type="button"
        className="mobile-nav-bar__item"
        onClick={onCartOpen}
        aria-label={t("mobileNav.cartAria", { cart: t("nav.cart") || "Cart", count: totalQty })}
      >
        <span className="mobile-nav-bar__icon">🛒</span>
        <span className="mobile-nav-bar__label">
          {t("nav.cart") || "Cart"} {totalQty > 0 && <b className="mobile-nav-bar__badge">{totalQty}</b>}
        </span>
      </button>
    </nav>
  );
}
