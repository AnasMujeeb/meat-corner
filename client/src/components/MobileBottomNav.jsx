import { Link, useLocation } from "react-router-dom";
import { useCart } from "../hooks/useCart.js";
import { useLanguage } from "../hooks/useLanguage.js";
import { useMode } from "../hooks/useMode.js";

export default function MobileBottomNav({ onCartOpen }) {
  const { pathname } = useLocation();
  const { totalQty } = useCart();
  const { t } = useLanguage();
  const { mode, isDelivery } = useMode();

  const menuHref = mode ? `/menu/${mode}` : "/menu";

  return (
    <nav
      className={`mobile-nav-bar${isDelivery ? " mobile-nav-bar--delivery" : ""}`}
      aria-label={t("mobileNav.quickNavAria")}
    >
      <Link
        to={menuHref}
        className={`mobile-nav-bar__item${pathname.startsWith("/menu") ? " mobile-nav-bar__item--active" : ""}`}
        aria-current={pathname.startsWith("/menu") ? "page" : undefined}
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

      {/* Cart button stays in the DOM, CSS smoothly hides it without abrupt pop */}
      <button
        type="button"
        className={`mobile-nav-bar__item mobile-nav-bar__item--cart${
          isDelivery ? " mobile-nav-bar__item--cart-hidden" : ""
        }`}
        onClick={isDelivery ? undefined : onCartOpen}
        aria-label={t("mobileNav.cartAria", { cart: t("nav.cart") || "Cart", count: totalQty })}
        aria-hidden={isDelivery ? "true" : undefined}
        tabIndex={isDelivery ? -1 : undefined}
      >
        <span className="mobile-nav-bar__icon">🛒</span>
        <span className="mobile-nav-bar__label">
          {t("nav.cart") || "Cart"} {totalQty > 0 && <b className="mobile-nav-bar__badge">{totalQty}</b>}
        </span>
      </button>
    </nav>
  );
}
