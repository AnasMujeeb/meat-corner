import { useState, useEffect } from "react";
import { useCart } from "../hooks/useCart.js";

function getInitialSelections(item) {
  const init = {};
  (item?.options || []).forEach((opt) => {
    // Pre-select first choice only for text-based single required groups (like steak doneness)
    if (
      opt.type === "single" &&
      opt.groupType !== "photo" &&
      opt.required &&
      opt.choices?.length > 0
    ) {
      init[opt.name] = opt.choices[0].label;
    } else if (opt.type === "single") {
      init[opt.name] = "";
    } else {
      init[opt.name] = [];
    }
  });
  return init;
}

function getGroupHint(opt, selections) {
  const sel = selections[opt.name];
  const isSingle = opt.type === "single";
  const target = isSingle ? 1 : (opt.maxSelections || opt.choices.length || 1);
  const count = isSingle ? (sel ? 1 : 0) : (Array.isArray(sel) ? sel.length : 0);

  if (count >= target && target > 0) {
    return { text: "Done ✓", state: "done" };
  }

  if (opt.required) {
    const remaining = target - count;
    if (count === 0) {
      return { text: target === 1 ? "Choose 1" : `Choose ${target}`, state: "pending" };
    }
    return {
      text: remaining === 1 ? "Choose 1 more" : `Choose ${remaining} more`,
      state: "progress",
    };
  }

  if (target > 1) {
    return { text: `Choose up to ${target}`, state: "optional" };
  }
  return { text: "Optional", state: "optional" };
}

function isGroupComplete(opt, selections) {
  if (!opt.required) return true;
  const sel = selections[opt.name];
  if (opt.type === "single") {
    return Boolean(sel && typeof sel === "string" && sel.trim() !== "");
  }
  const target = opt.maxSelections || 1;
  return Array.isArray(sel) && sel.length >= target;
}

function isChoiceDisabled(opt, choiceLabel, selections) {
  if (opt.type === "single") return false;
  const cur = selections[opt.name] || [];
  const max = opt.maxSelections || opt.choices.length || 999;
  const isSelected = cur.includes(choiceLabel);
  return !isSelected && cur.length >= max;
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

    // Freeze background body scroll position for iOS Safari and mobile browsers
    const scrollY = window.scrollY;
    const prevOverflow = document.body.style.overflow;
    const prevPosition = document.body.style.position;
    const prevTop = document.body.style.top;
    const prevWidth = document.body.style.width;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
      document.body.style.position = prevPosition;
      document.body.style.top = prevTop;
      document.body.style.width = prevWidth;
      window.scrollTo(0, scrollY);
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

  function toggleChoice(opt, choiceLabel) {
    setSelections((prev) => {
      if (opt.type === "single") {
        if (prev[opt.name] === choiceLabel && !opt.required) {
          return { ...prev, [opt.name]: "" };
        }
        return { ...prev, [opt.name]: choiceLabel };
      } else {
        const cur = prev[opt.name] || [];
        const max = opt.maxSelections || opt.choices.length || 999;
        if (cur.includes(choiceLabel)) {
          return { ...prev, [opt.name]: cur.filter((l) => l !== choiceLabel) };
        } else {
          if (cur.length >= max) {
            return prev;
          }
          return { ...prev, [opt.name]: [...cur, choiceLabel] };
        }
      }
    });
  }

  function buildOptionNote() {
    const parts = [];
    (item.options || []).forEach((opt) => {
      const sel = selections[opt.name];
      if (Array.isArray(sel) && sel.length > 0) {
        parts.push(`${opt.name}: ${sel.join(", ")}`);
      } else if (typeof sel === "string" && sel.trim()) {
        parts.push(`${opt.name}: ${sel}`);
      }
    });
    return parts.join(" · ");
  }

  const allRequiredSatisfied = (item.options || []).every((opt) =>
    isGroupComplete(opt, selections)
  );

  function handleAdd() {
    if (!allRequiredSatisfied) {
      return;
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
        {/* Pinned close button on top-right of popup */}
        <button
          onClick={onClose}
          className="item-modal__close-btn"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="item-modal__body">
          {/* Modal Image inside scrollable body */}
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
          </div>

          <div className="item-modal__content">
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

          {/* Option Groups */}
          {(item.options || []).map((opt) => {
            const isPhotoGroup = opt.groupType === "photo";
            const isSingle = opt.type === "single";
            const sel = selections[opt.name];
            const hint = getGroupHint(opt, selections);

            return (
              <div key={opt.name} className="item-modal__option-group">
                <div className="item-modal__option-header">
                  <div className="item-modal__option-title">
                    <span>{opt.name}</span>
                    {opt.required && <span className="badge-required">REQUIRED</span>}
                  </div>
                  <div className={`option-hint-badge option-hint-badge--${hint.state}`}>
                    {hint.text}
                  </div>
                </div>

                {/* Photo-based 3-Column Grid */}
                {isPhotoGroup ? (
                  <div className="item-modal__photo-grid" role="group" aria-label={opt.name}>
                    {opt.choices.map((choice) => {
                      const isSelected = isSingle
                        ? sel === choice.label
                        : (sel || []).includes(choice.label);
                      const disabled = isChoiceDisabled(opt, choice.label, selections);
                      const imgUrl = choice.image?.thumbUrl || choice.image?.url;

                      return (
                        <button
                          key={choice.label}
                          type="button"
                          className={`photo-option-tile${isSelected ? " selected" : ""}${disabled ? " disabled" : ""}`}
                          onClick={() => !disabled && toggleChoice(opt, choice.label)}
                          disabled={disabled}
                          role={isSingle ? "radio" : "checkbox"}
                          aria-checked={isSelected}
                          aria-disabled={disabled}
                        >
                          <div className="photo-option-tile__img-wrap">
                            {imgUrl ? (
                              <img
                                src={imgUrl}
                                alt={choice.label}
                                className="photo-option-tile__img"
                                loading="lazy"
                                decoding="async"
                                width="140"
                                height="140"
                              />
                            ) : (
                              <div className="photo-option-tile__placeholder">
                                <span>{choice.label.slice(0, 4).toUpperCase()}</span>
                              </div>
                            )}
                            <div className={`photo-option-tile__check${isSelected ? " selected" : ""}`}>
                              {isSelected ? "✓" : ""}
                            </div>
                          </div>
                          <span className="photo-option-tile__name">{choice.label}</span>
                          {choice.extraPrice > 0 && (
                            <span className="photo-option-tile__extra">+QAR {choice.extraPrice}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  /* Text-only Group (Doneness / Chips) */
                  <div className="item-modal__text-grid" role="group" aria-label={opt.name}>
                    {opt.choices.map((choice) => {
                      const isSelected = isSingle
                        ? sel === choice.label
                        : (sel || []).includes(choice.label);
                      const disabled = isChoiceDisabled(opt, choice.label, selections);

                      return (
                        <button
                          key={choice.label}
                          type="button"
                          className={`text-choice-tile${isSelected ? " selected" : ""}${disabled ? " disabled" : ""}`}
                          onClick={() => !disabled && toggleChoice(opt, choice.label)}
                          disabled={disabled}
                          role={isSingle ? "radio" : "checkbox"}
                          aria-checked={isSelected}
                          aria-disabled={disabled}
                        >
                          <span className={`text-choice-tile__indicator${isSelected ? " selected" : ""}`}>
                            {isSelected ? "✓" : ""}
                          </span>
                          <span className="text-choice-tile__label">{choice.label}</span>
                          {choice.extraPrice > 0 && (
                            <span className="text-choice-tile__extra">+QAR {choice.extraPrice}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          </div>
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
            style={{
              opacity: !allRequiredSatisfied && !added ? 0.65 : 1,
              cursor: !allRequiredSatisfied && !added ? "not-allowed" : "pointer",
            }}
            onClick={handleAdd}
            disabled={!allRequiredSatisfied || added}
          >
            {added
              ? "ADDED ✓"
              : allRequiredSatisfied
              ? `ADD TO CART — QAR ${totalPrice}`
              : "Select required options"}
          </button>
        </div>
      </div>
    </div>
  );
}
