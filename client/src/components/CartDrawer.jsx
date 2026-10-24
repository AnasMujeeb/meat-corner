import { Link } from "react-router-dom";
import { useCart } from "../hooks/useCart.js";

function CartItem({ item }) {
  const { setQty } = useCart();
  const img = item.images?.[0];
  const lineTotal = (item.price + (item._extraPrice ?? 0)) * item.qty;

  return (
    <div className="cart-item">
      {img ? (
        <img
          src={img.thumbUrl || img.url}
          alt={item.name}
          className="cart-item__img"
          loading="lazy"
        />
      ) : (
        <div className="cart-item__img-placeholder" aria-hidden="true" />
      )}
      <div className="cart-item__info">
        <div className="cart-item__name">{item.name}</div>
        {item._categoryName && (
          <div className="cart-item__cat">{item._categoryName}</div>
        )}
        {item._optionNote && (
          <div className="cart-item__options-note">{item._optionNote}</div>
        )}
        <div className="cart-item__price">QAR {item.price + (item._extraPrice ?? 0)}</div>
      </div>
      <div className="cart-item__right">
        <div className="cart-item__price-right">QAR {lineTotal}</div>
        <div className="qty-stepper">
          <button
            className="qty-stepper__btn"
            onClick={() => setQty(item._cartKey, item.qty - 1)}
            aria-label="Decrease quantity"
          >−</button>
          <span className="qty-stepper__val" aria-label={`Quantity: ${item.qty}`}>{item.qty}</span>
          <button
            className="qty-stepper__btn"
            onClick={() => setQty(item._cartKey, item.qty + 1)}
            aria-label="Increase quantity"
          >+</button>
        </div>
      </div>
    </div>
  );
}

export default function CartDrawer({ open, onClose }) {
  const { items, totalPrice } = useCart();

  return (
    <>
      <div
        className={`cart-backdrop${open ? " open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`cart-drawer${open ? " open" : ""}`}
        aria-label="Shopping cart"
        role="complementary"
      >
        <div className="cart-drawer__header">
          <span className="cart-drawer__title">Cart</span>
          <button
            className="cart-drawer__close"
            onClick={onClose}
            aria-label="Close cart"
          >
            ✕
          </button>
        </div>

        <div className="cart-drawer__body">
          {items.length === 0 ? (
            <div className="cart-drawer__empty">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 01-8 0"/>
              </svg>
              <span>Your cart is empty</span>
              <button className="btn btn--primary btn--sm" onClick={onClose}>Browse Menu</button>
            </div>
          ) : (
            items.map((item) => <CartItem key={item._cartKey} item={item} />)
          )}
        </div>

        {items.length > 0 && (
          <div className="cart-drawer__footer">
            <div className="cart-drawer__total-row">
              <span className="cart-drawer__total-label">Total</span>
              <span className="cart-drawer__total-price">QAR {totalPrice}</span>
            </div>
            <Link to="/cart" className="btn btn--primary btn--full" onClick={onClose}>
              SHOW TO WAITER
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
