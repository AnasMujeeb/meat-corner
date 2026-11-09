import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useCart } from "../hooks/useCart.js";
import { useLanguage } from "../hooks/useLanguage.js";
import { useMode } from "../hooks/useMode.js";
import {
  ScrollReveal,
} from "../components/motion/ScrollReveal.jsx";
import { LUXURY_EASE } from "../components/motion/motionTokens.js";
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

export default function CartPage({ _settings }) {
  const { isDelivery } = useMode();
  const { items, totalQty, setQty, removeItem, clear } = useCart();
  const { t, lang } = useLanguage();
  const [tableNumber, setTableNumber] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [waiterModalOpen, setWaiterModalOpen] = useState(false);
  const currency = getCurrency(lang);

  // In delivery mode, cart is not available — redirect to menu
  if (isDelivery) {
    return <Navigate to="/menu/delivery" replace />;
  }

  if (items.length === 0) {
    return (
      <div className="site-container cart-empty-section">
        <ScrollReveal className="cart-empty-panel">
          <div className="cart-empty-panel__icon-wrap">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
          </div>
          <h1 className="heading-md" style={{ marginBottom: 12 }}>{t("cart.emptyTitle")}</h1>
          {/* TODO: CLIENT TO CONFIRM */}
          <p className="body-text" style={{ margin: "0 auto 28px" }}>
            {t("cart.emptySubtitle")}
          </p>
          <Link to="/menu" className="btn btn--primary btn--full">
            {t("cart.exploreMenu")}
          </Link>
        </ScrollReveal>
      </div>
    );
  }

  return (
    <div className="cart-page-wrap">
      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="cart-page-header">
        <div className="site-container">
          <motion.span
            className="eyebrow"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: LUXURY_EASE }}
          >
            {t("cart.headerEyebrow")}
          </motion.span>
          <motion.h1
            className="heading-lg"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.2, ease: LUXURY_EASE }}
          >
            {t("cart.headerTitle")}
          </motion.h1>
        </div>
      </div>

      <div className="site-container">
        <div className="cart-layout">
          {/* ── Left Column: Items List ─────────────────────────── */}
          <ScrollReveal className="cart-layout__left" delay={0.05} y={16}>
            <div className="cart-layout__items-head">
              <h2 className="heading-sm">{t("cart.selectedItems", { count: totalQty })}</h2>
              <button
                onClick={clear}
                className="cart-clear-btn"
              >
                {t("cart.clearAll")}
              </button>
            </div>

            <div className="cart-card-list">
              {items.map((item) => {
                const img = item.images?.[0];
                const unitPrice = item.price + (item._extraPrice ?? 0);
                const lineTotal = unitPrice * item.qty;
                const itemName = (item.itemRef ? localized(item.itemRef, "name", lang) : "") || (lang === "ar" && item.nameAr ? item.nameAr : item.name);
                const optionNote = getLocalizedOptionNote(item, lang);

                return (
                  <div key={item._cartKey} className="cart-card-item">
                    {/* Thumbnail */}
                    {img ? (
                      <img
                        src={img.thumbUrl || img.url}
                        alt={itemName}
                        className="cart-card-item__img"
                        width="72"
                        height="72"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="cart-card-item__placeholder">
                        MC
                      </div>
                    )}

                    {/* Details */}
                    <div className="cart-card-item__details">
                      <div className="cart-card-item__title">
                        {itemName}
                      </div>
                      {item._categoryName && (
                        <div className="cart-card-item__category">
                          {item._categoryName}
                        </div>
                      )}
                      {optionNote && (
                        <div className="cart-card-item__notes">
                          {optionNote}
                        </div>
                      )}
                      <div className="cart-card-item__unit-price">
                        {lang === "ar" ? `${currency} ${unitPrice} للواحدة` : `QAR ${unitPrice} each`}
                      </div>
                    </div>

                    {/* Stepper, Remove & Total */}
                    <div className="cart-card-item__actions">
                      <div className="cart-card-item__top-row">
                        <div className="cart-card-item__total">
                          {currency} {lineTotal}
                        </div>
                        <button
                          onClick={() => removeItem(item._cartKey)}
                          className="cart-card-item__remove"
                          aria-label={t("cart.removeItemAria", { name: itemName })}
                        >
                          ✕
                        </button>
                      </div>
                      <div className="qty-stepper">
                        <button
                          className="qty-stepper__btn"
                          onClick={() => setQty(item._cartKey, item.qty - 1)}
                          aria-label={t("cart.decreaseQty")}
                        >
                          −
                        </button>
                        <span className="qty-stepper__val">{item.qty}</span>
                        <button
                          className="qty-stepper__btn"
                          onClick={() => setQty(item._cartKey, item.qty + 1)}
                          aria-label={t("cart.increaseQty")}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 24 }}>
              <Link to="/menu" className="btn btn--outline btn--sm">
                {t("cart.addMoreItems")}
              </Link>
            </div>
          </ScrollReveal>

          {/* ── Right Column: Summary & Table Show ───────────────── */}
          <ScrollReveal className="cart-layout__right" delay={0.15} y={16}>
            <div className="cart-summary-card">
              <div className="cart-summary-card__tag">{t("cart.summaryTag")}</div>
              <h2 className="heading-sm" style={{ marginBottom: 20 }}>{t("cart.readyToOrder")}</h2>

              <div className="form-field">
                <label className="form-label" htmlFor="table-number">{t("cart.tableNumberLabel")}</label>
                <input
                  id="table-number"
                  type="text"
                  className="form-input"
                  placeholder={t("cart.tableNumberPlaceholder")}
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="order-notes">{t("cart.orderNotesLabel")}</label>
                <textarea
                  id="order-notes"
                  className="form-textarea"
                  placeholder={t("cart.orderNotesPlaceholder")}
                  rows={3}
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                />
              </div>

              <div className="cart-summary-totals">
                <div className="cart-summary-totals__row" style={{ marginBottom: 0 }}>
                  <span>{t("cart.serviceTax")}</span>
                  <span>{t("cart.included")}</span>
                </div>
              </div>

              <button
                className="btn btn--primary btn--full"
                style={{ padding: "18px 24px", fontSize: 14 }}
                onClick={() => setWaiterModalOpen(true)}
              >
                {t("cart.showToWaiter")}
              </button>

              <p className="cart-summary-card__hint">
                {t("cart.waiterHint")}
              </p>
            </div>
          </ScrollReveal>
        </div>
      </div>

      {/* ── Show to Waiter Fullscreen Modal ────────────────────── */}
      {waiterModalOpen && (
        <div
          className="waiter-modal-backdrop"
          onClick={() => setWaiterModalOpen(false)}
        >
          <div
            className="waiter-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="waiter-modal-card__header">
              <div>
                <span className="eyebrow" style={{ color: "var(--red)" }}>{t("cart.waiterModalEyebrow")}</span>
                <h2 className="heading-md">{t("cart.waiterTicketTitle")}</h2>
                {tableNumber && (
                  <div className="waiter-modal-card__table-tag">
                    {t("cart.waiterTableTag", { tableNumber })}
                  </div>
                )}
              </div>
              <button
                onClick={() => setWaiterModalOpen(false)}
                className="waiter-modal-card__close"
              >
                {t("cart.waiterClose")}
              </button>
            </div>

            {/* List */}
            <div className="waiter-modal-card__list">
              {items.map((item, idx) => {
                const itemName = (item.itemRef ? localized(item.itemRef, "name", lang) : "") || (lang === "ar" && item.nameAr ? item.nameAr : item.name);
                const optionNote = getLocalizedOptionNote(item, lang);
                return (
                  <div key={idx} className="waiter-modal-card__row">
                    <div className="waiter-modal-card__row-main">
                      <span>{item.qty} × {itemName}</span>
                      <span>{currency} {(item.price + (item._extraPrice ?? 0)) * item.qty}</span>
                    </div>
                    {optionNote && (
                      <div className="waiter-modal-card__row-note">
                        ↳ {optionNote}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {orderNotes && (
              <div className="waiter-modal-card__kitchen-notes">
                <div className="waiter-modal-card__notes-title">{t("cart.kitchenNotes")}</div>
                <div className="waiter-modal-card__notes-body">{orderNotes}</div>
              </div>
            )}

            <button
              className="btn btn--dark btn--full"
              onClick={() => setWaiterModalOpen(false)}
            >
              {t("cart.waiterDone")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
