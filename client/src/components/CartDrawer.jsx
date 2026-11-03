import { Link } from "react-router-dom";
import { useCart } from "../hooks/useCart.js";
import { useLanguage } from "../hooks/useLanguage.js";
import { localized, getCurrency } from "../utils/localization.js";

function getLocalizedOptionNote(item, lang) {
  if (item.itemRef && item.itemRef.options && item.selectedOptions) {
    const parts = [];
    item.itemRef.options.forEach((opt) => {
      const sel = item.selectedOptions[opt.name];
      const optTitle = localized(opt, "name", lang);
      if (Array.isArray(sel) && sel.length > 0) {
        const labels = sel.map((sLabel) => {
          const choiceObj = opt.choices?.find((c) => c.label === sLabel);
          return choiceObj ? localized(choiceObj, "label", lang) : sLabel;
        });
        parts.push(`${optTitle}: ${labels.join(", ")}`);
      } else if (typeof sel === "string" && sel.trim()) {
        const choiceObj = opt.choices?.find((c) => c.label === sel);
        const label = choiceObj ? localized(choiceObj, "label", lang) : sel;
        parts.push(`${optTitle}: ${label}`);
      }
    });
    if (parts.length > 0) return parts.join(" · ");
  }
  return item._optionNote || "";
}

function CartItem({ item }) {
  const { setQty } = useCart();
  const { t, lang } = useLanguage();
  const img = item.images?.[0];
  const lineTotal = (item.price + (item._extraPrice ?? 0)) * item.qty;
  const currency = getCurrency(lang);
  const itemName = (item.itemRef ? localized(item.itemRef, "name", lang) : "") || (lang === "ar" && item.nameAr ? item.nameAr : item.name);
  const optionNote = getLocalizedOptionNote(item, lang);

  return (
    <div className="cart-item">
      {img ? (
        <img
          src={img.thumbUrl || img.url}
          alt={itemName}
          className="cart-item__img"
          loading="lazy"
        />
      ) : (
        <div className="cart-item__img-placeholder" aria-hidden="true" />
      )}
      <div className="cart-item__info">
        <div className="cart-item__name">{itemName}</div>
        {item._categoryName && (
          <div className="cart-item__cat">{item._categoryName}</div>
        )}
        {optionNote && (
          <div className="cart-item__options-note">{optionNote}</div>
        )}
        <div className="cart-item__price">{currency} {item.price + (item._extraPrice ?? 0)}</div>
      </div>
      <div className="cart-item__right">
        <div className="cart-item__price-right">{currency} {lineTotal}</div>
        <div className="qty-stepper">
          <button
            className="qty-stepper__btn"
            onClick={() => setQty(item._cartKey, item.qty - 1)}
            aria-label={t("cart.decreaseQty")}
          >−</button>
          <span className="qty-stepper__val" aria-label={t("cart.quantityAria", { count: item.qty })}>{item.qty}</span>
          <button
            className="qty-stepper__btn"
            onClick={() => setQty(item._cartKey, item.qty + 1)}
            aria-label={t("cart.increaseQty")}
          >+</button>
        </div>
      </div>
    </div>
  );
}

export default function CartDrawer({ open, onClose }) {
  const { items } = useCart();
  const { t } = useLanguage();

  return (
    <>
      <div
        className={`cart-backdrop${open ? " open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`cart-drawer${open ? " open" : ""}`}
        aria-label={t("cart.drawerAria")}
        role="complementary"
      >
        <div className="cart-drawer__header">
          <span className="cart-drawer__title">{t("cart.title") || "Cart"}</span>
          <button
            className="cart-drawer__close"
            onClick={onClose}
            aria-label={t("cart.closeAria")}
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
              <span>{t("cart.empty") || "Your cart is empty"}</span>
              <button className="btn btn--primary btn--sm" onClick={onClose}>
                {t("cart.browse") || "Browse Menu"}
              </button>
            </div>
          ) : (
            items.map((item) => <CartItem key={item._cartKey} item={item} />)
          )}
        </div>

        {items.length > 0 && (
          <div className="cart-drawer__footer">
            <Link to="/cart" className="btn btn--primary btn--full" onClick={onClose}>
              {t("cart.showWaiter") || "SHOW TO WAITER"}
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
