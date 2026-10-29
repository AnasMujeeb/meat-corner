import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../hooks/useCart.js";
import ItemModal from "./ItemModal.jsx";
import { BADGES } from "../constants/badges.js";

/**
 * Shared Food Card component used across Home, Menu, Healthy, and Kids pages.
 * Displays a 2-digit numbered badge (01, 02...), fixed aspect ratio image,
 * tag / category (like "NEW ADDITIONS"), title, price, and a tap-friendly + add button.
 * Clicking the card opens the item detail modal to view full details and description.
 */
export default function FoodCard({
  item,
  index,
  categoryName,
  onSelect,
  onAdd,
  onBadgeClick,
}) {
  const { addItem } = useCart();
  const navigate = useNavigate();
  const [internalModalOpen, setInternalModalOpen] = useState(false);

  if (!item) return null;

  function handleBadgeClick(badgeId, e) {
    e.stopPropagation();
    if (onBadgeClick) {
      onBadgeClick(badgeId);
    } else {
      navigate(`/menu?badge=${encodeURIComponent(badgeId)}`);
    }
  }

  const rawImg = item.images?.[0];
  const thumbUrl = typeof rawImg === "object" ? (rawImg?.thumbUrl || "") : "";
  const mainUrl = typeof rawImg === "string" ? rawImg : (rawImg?.url || rawImg?.thumbUrl || "");
  const defaultImg = thumbUrl || mainUrl || "";
  const srcSet = thumbUrl && mainUrl && thumbUrl !== mainUrl ? `${thumbUrl} 400w, ${mainUrl} 1200w` : undefined;
  const imgAlt = typeof rawImg === "object" ? (rawImg?.alt || item.name) : item.name;
  const priceFormatted = Number(item.price).toFixed(2);
  const badgeNum = index != null ? String(index).padStart(2, "0") : null;
  const isEager = index != null && index <= 6;
  const isPriority = index != null && index <= 2;

  function handleClick() {
    if (onSelect) {
      onSelect(item);
    } else {
      setInternalModalOpen(true);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  }

  function handleAddClick(e) {
    e.stopPropagation();
    if (onAdd) {
      onAdd(item, e);
      return;
    }
    // If item has options, open the detail modal so user can choose
    if (item.options && item.options.length > 0) {
      handleClick();
      return;
    }
    // Otherwise directly add to cart
    addItem({
      _id: item._id,
      name: item.name,
      price: item.price,
      images: item.images,
      _categoryName: categoryName || item.category?.name || "",
      selectedOptions: {},
    });
  }

  const categoryTitle =
    categoryName || item.category?.name || item.tagline || (item.tags && item.tags[0]) || "";

  return (
    <>
      <article
        className="food-card"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label={`${item.name}, QAR ${priceFormatted}`}
      >
        <div className="food-card__media">
          {defaultImg ? (
            <img
              src={defaultImg}
              srcSet={srcSet}
              sizes="(max-width: 760px) 50vw, (max-width: 1200px) 25vw, 300px"
              alt={imgAlt}
              className="food-card__img"
              loading={isEager ? "eager" : "lazy"}
              fetchPriority={isPriority ? "high" : "auto"}
              width="400"
              height="300"
              decoding="async"
            />
          ) : (
            <div className="food-card__placeholder">
              <span>MEAT CORNER</span>
            </div>
          )}
          {badgeNum && <span className="food-card__badge-num">{badgeNum}</span>}
        </div>

        <div className="food-card__body">
          {categoryTitle && (
            <span className="food-card__category">{categoryTitle}</span>
          )}
          <div className="food-card__title-row">
            <h3 className="food-card__name">{item.name}</h3>
            {Array.isArray(item.badges) && item.badges.length > 0 && (
              <div
                className="food-card__badges"
                role="group"
                aria-label="Item badges"
                onClick={(e) => e.stopPropagation()}
              >
                {item.badges.map((bId) => {
                  const b = BADGES[bId];
                  if (!b) return null;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      className="food-card__badge-btn"
                      aria-label={b.label}
                      title={b.label}
                      onClick={(e) => handleBadgeClick(b.id, e)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation();
                        }
                      }}
                    >
                      <img
                        src={b.icon}
                        alt=""
                        aria-hidden="true"
                        className="food-card__badge-icon"
                        width="28"
                        height="28"
                        loading="lazy"
                        decoding="async"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="food-card__footer">
            <span className="food-card__price">QAR {priceFormatted}</span>
            <button
              type="button"
              className="food-card__add-btn"
              aria-label={`Add ${item.name} to cart`}
              onClick={handleAddClick}
            >
              +
            </button>
          </div>
        </div>
      </article>

      {internalModalOpen && !onSelect && (
        <ItemModal
          item={item}
          categoryName={categoryTitle}
          onBadgeClick={onBadgeClick}
          onClose={() => setInternalModalOpen(false)}
        />
      )}
    </>
  );
}
