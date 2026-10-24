import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useCart } from "../hooks/useCart.js";
import {
  ScrollReveal,
} from "../components/motion/ScrollReveal.jsx";
import { LUXURY_EASE } from "../components/motion/motionTokens.js";

export default function CartPage({ _settings }) {
  const { items, totalPrice, totalQty, setQty, removeItem, clear } = useCart();
  const [tableNumber, setTableNumber] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [waiterModalOpen, setWaiterModalOpen] = useState(false);

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
          <h1 className="heading-md" style={{ marginBottom: 12 }}>YOUR CART IS EMPTY</h1>
          {/* TODO: CLIENT TO CONFIRM */}
          <p className="body-text" style={{ margin: "0 auto 28px" }}>
            Explore our menu to add items to your cart.
          </p>
          <Link to="/menu" className="btn btn--primary btn--full">
            EXPLORE THE MENU
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
            TABLE & DINE-IN SERVICE
          </motion.span>
          <motion.h1
            className="heading-lg"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.2, ease: LUXURY_EASE }}
          >
            REVIEW YOUR ORDER
          </motion.h1>
        </div>
      </div>

      <div className="site-container">
        <div className="cart-layout">
          {/* ── Left Column: Items List ─────────────────────────── */}
          <ScrollReveal className="cart-layout__left" delay={0.05} y={16}>
            <div className="cart-layout__items-head">
              <h2 className="heading-sm">SELECTED ITEMS ({totalQty})</h2>
              <button
                onClick={clear}
                className="cart-clear-btn"
              >
                CLEAR ALL
              </button>
            </div>

            <div className="cart-card-list">
              {items.map((item) => {
                const img = item.images?.[0];
                const unitPrice = item.price + (item._extraPrice ?? 0);
                const lineTotal = unitPrice * item.qty;

                return (
                  <div key={item._cartKey} className="cart-card-item">
                    {/* Thumbnail */}
                    {img ? (
                      <img
                        src={img.thumbUrl || img.url}
                        alt={item.name}
                        className="cart-card-item__img"
                      />
                    ) : (
                      <div className="cart-card-item__placeholder">
                        MC
                      </div>
                    )}

                    {/* Details */}
                    <div className="cart-card-item__details">
                      <div className="cart-card-item__title">
                        {item.name}
                      </div>
                      {item._categoryName && (
                        <div className="cart-card-item__category">
                          {item._categoryName}
                        </div>
                      )}
                      {item._optionNote && (
                        <div className="cart-card-item__notes">
                          {item._optionNote}
                        </div>
                      )}
                      <div className="cart-card-item__unit-price">
                        QAR {unitPrice} each
                      </div>
                    </div>

                    {/* Stepper, Remove & Total */}
                    <div className="cart-card-item__actions">
                      <div className="cart-card-item__top-row">
                        <div className="cart-card-item__total">
                          QAR {lineTotal}
                        </div>
                        <button
                          onClick={() => removeItem(item._cartKey)}
                          className="cart-card-item__remove"
                          aria-label={`Remove ${item.name} from cart`}
                        >
                          ✕
                        </button>
                      </div>
                      <div className="qty-stepper">
                        <button
                          className="qty-stepper__btn"
                          onClick={() => setQty(item._cartKey, item.qty - 1)}
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span className="qty-stepper__val">{item.qty}</span>
                        <button
                          className="qty-stepper__btn"
                          onClick={() => setQty(item._cartKey, item.qty + 1)}
                          aria-label="Increase quantity"
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
                ← ADD MORE ITEMS
              </Link>
            </div>
          </ScrollReveal>

          {/* ── Right Column: Summary & Table Show ───────────────── */}
          <ScrollReveal className="cart-layout__right" delay={0.15} y={16}>
            <div className="cart-summary-card">
              <div className="cart-summary-card__tag">DINE-IN ORDER SUMMARY</div>
              <h2 className="heading-sm" style={{ marginBottom: 20 }}>READY TO ORDER</h2>

              <div className="form-field">
                <label className="form-label" htmlFor="table-number">Table / Seat Number (Optional)</label>
                <input
                  id="table-number"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Table 04, Booth B"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="order-notes">Special Instructions for Kitchen</label>
                <textarea
                  id="order-notes"
                  className="form-textarea"
                  placeholder="e.g. Medium rare steak, extra sauce on the side, no onions..."
                  rows={3}
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                />
              </div>

              <div className="cart-summary-totals">
                <div className="cart-summary-totals__row">
                  <span>Subtotal ({totalQty} items)</span>
                  <span>QAR {totalPrice}</span>
                </div>
                <div className="cart-summary-totals__row">
                  <span>Service & Tax</span>
                  <span>Included</span>
                </div>
                <div className="cart-summary-totals__divider" />
                <div className="cart-summary-totals__final">
                  <span>TOTAL</span>
                  <span className="cart-summary-totals__price">QAR {totalPrice}</span>
                </div>
              </div>

              <button
                className="btn btn--primary btn--full"
                style={{ padding: "18px 24px", fontSize: 14 }}
                onClick={() => setWaiterModalOpen(true)}
              >
                SHOW TO WAITER
              </button>

              <p className="cart-summary-card__hint">
                Tap above when the waiter arrives at your table to display a clean, high-contrast order screen.
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
                <span className="eyebrow" style={{ color: "var(--red)" }}>MEAT CORNER DINE-IN</span>
                <h2 className="heading-md">WAITER ORDER TICKET</h2>
                {tableNumber && (
                  <div className="waiter-modal-card__table-tag">
                    📍 TABLE: {tableNumber}
                  </div>
                )}
              </div>
              <button
                onClick={() => setWaiterModalOpen(false)}
                className="waiter-modal-card__close"
              >
                ✕ CLOSE
              </button>
            </div>

            {/* List */}
            <div className="waiter-modal-card__list">
              {items.map((item, idx) => (
                <div key={idx} className="waiter-modal-card__row">
                  <div className="waiter-modal-card__row-main">
                    <span>{item.qty} × {item.name}</span>
                    <span>QAR {(item.price + (item._extraPrice ?? 0)) * item.qty}</span>
                  </div>
                  {item._optionNote && (
                    <div className="waiter-modal-card__row-note">
                      ↳ {item._optionNote}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {orderNotes && (
              <div className="waiter-modal-card__kitchen-notes">
                <div className="waiter-modal-card__notes-title">KITCHEN NOTES:</div>
                <div className="waiter-modal-card__notes-body">{orderNotes}</div>
              </div>
            )}

            <div className="waiter-modal-card__total-wrap">
              <span className="waiter-modal-card__total-lbl">TOTAL AMOUNT:</span>
              <span className="waiter-modal-card__total-val">
                QAR {totalPrice}
              </span>
            </div>

            <button
              className="btn btn--dark btn--full"
              onClick={() => setWaiterModalOpen(false)}
            >
              DONE / BACK TO ORDER
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
