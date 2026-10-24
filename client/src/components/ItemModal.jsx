import { useState, useEffect } from "react";
import { useCart } from "../hooks/useCart.js";

function getInitialSelections(item) {
  const init = {};
  (item?.options || []).forEach((opt) => {
    if (opt.type === "single" && opt.choices.length > 0) {
      init[opt.name] = opt.choices[0].label;
    } else {
      init[opt.name] = [];
    }
  });
  return init;
}

export default function ItemModal({ item, categoryName, onClose }) {
  const { addItem } = useCart();
  const [selections, setSelections] = useState(() => getInitialSelections(item));
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  // Close on Escape key & Lock body scroll
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        onClose?.();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  if (!item) return null;

  // Calculate extra price from selections
  let extraPrice = 0;
  (item.options || []).forEach((opt) => {
    opt.choices.forEach((c) => {
      if (opt.type === "single" && selections[opt.name] === c.label) {
        extraPrice += c.extraPrice || 0;
      }
      if (opt.type === "multiple" && selections[opt.name]?.includes(c.label)) {
        extraPrice += c.extraPrice || 0;
      }
    });
  });

  const totalPrice = (item.price + extraPrice) * qty;

  function toggleChoice(optName, choiceLabel, type) {
    setSelections((prev) => {
      if (type === "single") {
        return { ...prev, [optName]: choiceLabel };
      } else {
        const cur = prev[optName] || [];
        return {
          ...prev,
          [optName]: cur.includes(choiceLabel)
            ? cur.filter((l) => l !== choiceLabel)
            : [...cur, choiceLabel],
        };
      }
    });
  }

  function buildOptionNote() {
    const parts = [];
    (item.options || []).forEach((opt) => {
      const sel = selections[opt.name];
      if (Array.isArray(sel) && sel.length > 0) {
        parts.push(`${opt.name}: ${sel.join(", ")}`);
      } else if (typeof sel === "string" && sel) {
        parts.push(`${opt.name}: ${sel}`);
      }
    });
    return parts.join(" · ");
  }

  function handleAdd() {
    for (const opt of item.options || []) {
      if (opt.required) {
        const sel = selections[opt.name];
        if (!sel || (Array.isArray(sel) && sel.length === 0)) {
          alert(`Please select ${opt.name}`);
          return;
        }
      }
    }
    for (let i = 0; i < qty; i++) {
      addItem({
        _id: item._id,
        name: item.name,
        price: item.price,
        _extraPrice: extraPrice,
        images: item.images,
        _categoryName: categoryName,
        _optionNote: buildOptionNote(),
        selectedOptions: selections,
      });
    }
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      onClose();
    }, 800);
  }

  const rawImg = item.images?.[0];
  const imgSrc = typeof rawImg === "string" ? rawImg : (rawImg?.url || rawImg?.thumbUrl || "");
  const imgAlt = typeof rawImg === "object" ? (rawImg?.alt || item.name) : item.name;

  // Nutrition entries that exist
  const nut = item.nutrition || {};
  const hasNutrition =
    nut.calories != null ||
    nut.fat != null ||
    nut.protein != null ||
    nut.carbs != null ||
    nut.fiber != null;

  return (
    <div
      className="item-modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="item-modal" role="dialog" aria-modal="true" aria-label={item.name}>
        {/* Modal Image */}
        <div className="item-modal__img-container">
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={imgAlt}
              className="item-modal__img"
              width="580"
              height="326"
              decoding="async"
              loading="eager"
            />
          ) : (
            <div className="item-modal__img-placeholder">
              <span>MEAT CORNER</span>
            </div>
          )}
          <button
            onClick={onClose}
            className="item-modal__close-btn"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="item-modal__body">
          <div className="item-modal__header">
            <div>
              {categoryName && <span className="item-modal__category">{categoryName}</span>}
              <h2 className="item-modal__name">{item.name}</h2>
            </div>
            <div className="item-modal__price">QAR {item.price + extraPrice}</div>
          </div>

          {/* Allergens Chips */}
          {item.allergens?.length > 0 && (
            <div className="item-modal__allergens" aria-label="Allergens">
              <span className="allergens-label">Contains:</span>
              {item.allergens.map((alg) => (
                <span key={alg} className="chip chip-allergen">
                  {alg}
                </span>
              ))}
            </div>
          )}

          {/* Full Description */}
          {(item.description || item.description_en || item.tagline) && (
            <p className="item-modal__desc">
              {item.description || item.description_en || item.tagline}
            </p>
          )}
          {(item.descriptionAr || item.description_ar) && (
            <p className="item-modal__desc item-modal__desc--ar" dir="rtl">
              {item.descriptionAr || item.description_ar}
            </p>
          )}

          {/* Collapsible Nutrition Details (only existing values) */}
          {hasNutrition && (
            <details className="item-modal__nutrition-details">
              <summary className="item-modal__nutrition-summary">
                <span>Nutrition Details</span>
                <span className="toggle-indicator">▾</span>
              </summary>
              <div className="item-modal__nutrition-grid">
                {nut.calories != null && (
                  <div className="nutrition-stat">
                    <span className="nutrition-stat__val">{nut.calories}</span>
                    <span className="nutrition-stat__lbl">Calories (kcal)</span>
                  </div>
                )}
                {nut.protein != null && (
                  <div className="nutrition-stat">
                    <span className="nutrition-stat__val">{nut.protein}g</span>
                    <span className="nutrition-stat__lbl">Protein</span>
                  </div>
                )}
                {nut.fat != null && (
                  <div className="nutrition-stat">
                    <span className="nutrition-stat__val">{nut.fat}g</span>
                    <span className="nutrition-stat__lbl">Fat</span>
                  </div>
                )}
                {nut.carbs != null && (
                  <div className="nutrition-stat">
                    <span className="nutrition-stat__val">{nut.carbs}g</span>
                    <span className="nutrition-stat__lbl">Carbohydrates</span>
                  </div>
                )}
                {nut.fiber != null && (
                  <div className="nutrition-stat">
                    <span className="nutrition-stat__val">{nut.fiber}g</span>
                    <span className="nutrition-stat__lbl">Dietary Fiber</span>
                  </div>
                )}
              </div>
            </details>
          )}

          {/* Options */}
          {(item.options || []).map((opt) => (
            <div key={opt.name} className="item-modal__option-group">
              <div className="item-modal__option-title">
                {opt.name}
                {opt.required && <span>REQUIRED</span>}
              </div>
              {opt.choices.map((choice) => {
                const sel = selections[opt.name];
                const isSelected =
                  opt.type === "single"
                    ? sel === choice.label
                    : (sel || []).includes(choice.label);
                return (
                  <div
                    key={choice.label}
                    className="option-choice"
                    onClick={() => toggleChoice(opt.name, choice.label, opt.type)}
                    role={opt.type === "single" ? "radio" : "checkbox"}
                    aria-checked={isSelected}
                    tabIndex={0}
                    onKeyDown={(e) =>
                      e.key === "Enter" && toggleChoice(opt.name, choice.label, opt.type)
                    }
                  >
                    <div className="option-choice__left">
                      <div
                        className={
                          opt.type === "single"
                            ? `option-choice__radio${isSelected ? " selected" : ""}`
                            : `option-choice__check${isSelected ? " selected" : ""}`
                        }
                      >
                        {isSelected && opt.type === "multiple" && "✓"}
                      </div>
                      <span className="option-choice__label">{choice.label}</span>
                    </div>
                    {choice.extraPrice > 0 && (
                      <span className="option-choice__extra">+QAR {choice.extraPrice}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="item-modal__footer">
          <div className="qty-stepper">
            <button
              className="qty-stepper__btn"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="qty-stepper__val">{qty}</span>
            <button
              className="qty-stepper__btn"
              onClick={() => setQty((q) => q + 1)}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
          <button
            className={`btn ${added ? "btn--outline" : "btn--primary"}`}
            style={{ flex: 1 }}
            onClick={handleAdd}
            disabled={added}
          >
            {added ? "ADDED ✓" : `ADD TO CART — QAR ${totalPrice}`}
          </button>
        </div>
      </div>
    </div>
  );
}
