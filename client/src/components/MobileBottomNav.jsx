import { Link, useLocation } from "react-router-dom";
import { useCart } from "../hooks/useCart.js";

export default function MobileBottomNav({ onCartOpen }) {
  const { pathname } = useLocation();
  const { totalQty } = useCart();

  return (
    <nav className="mobile-nav-bar" aria-label="Quick navigation">
      <Link
        to="/menu"
        className={`mobile-nav-bar__item${pathname === "/menu" ? " mobile-nav-bar__item--active" : ""}`}
        aria-current={pathname === "/menu" ? "page" : undefined}
      >
        <span className="mobile-nav-bar__icon">☷</span>
        <span className="mobile-nav-bar__label">Menu</span>
      </Link>

      <Link
        to="/"
        className={`mobile-nav-bar__item mobile-nav-bar__item--primary${pathname === "/" ? " mobile-nav-bar__item--active" : ""}`}
        aria-current={pathname === "/" ? "page" : undefined}
      >
        <span className="mobile-nav-bar__icon">⌂</span>
        <span className="mobile-nav-bar__label">Home</span>
      </Link>

      <button
        type="button"
        className="mobile-nav-bar__item"
        onClick={onCartOpen}
        aria-label={`Cart, ${totalQty} items`}
      >
        <span className="mobile-nav-bar__icon">🛒</span>
        <span className="mobile-nav-bar__label">
          Cart {totalQty > 0 && <b className="mobile-nav-bar__badge">{totalQty}</b>}
        </span>
      </button>
    </nav>
  );
}
