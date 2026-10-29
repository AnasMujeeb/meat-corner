import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { keepPreviousData } from "@tanstack/react-query";
import { useCategories, useMenu, useSettings } from "../api/queries.js";
import ItemModal from "../components/ItemModal.jsx";
import FoodCard from "../components/FoodCard.jsx";
import PageMotionReel from "../components/PageMotionReel.jsx";
import {
  StaggerContainer,
  StaggerItem,
} from "../components/motion/ScrollReveal.jsx";
import { LUXURY_EASE } from "../components/motion/motionTokens.js";
import { MENU_CONTENT } from "../content/menu.js";
import { BADGES } from "../constants/badges.js";

const QUICK_TAGS = [
  { id: "all", label: "All Items" },
  { id: "featured", label: "Featured" },
  { id: "healthy", label: "Healthy" },
  { id: "kids", label: "Kids" },
];

export default function MenuPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get("category") || "";
  const tagParam = searchParams.get("tag") || "";
  const badgeParam = searchParams.get("badge") || "";
  const activeBadge = BADGES[badgeParam.toLowerCase()];

  const [page, setPage] = useState(1);
  const [accumulatedItems, setAccumulatedItems] = useState([]);
  const [lastQueryKey, setLastQueryKey] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedCatName, setSelectedCatName] = useState("");
  // Tracks whether we are mid-transition between filter changes (show skeleton, not empty state)
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimerRef = useRef(null);

  const { data: settings } = useSettings();
  const { data: categories = [], isLoading: _catsLoading } = useCategories();

  // Query params for current fetch
  const queryParams = useMemo(() => {
    const p = { page, limit: 24 };
    if (badgeParam) {
      p.badge = badgeParam.toLowerCase();
    } else {
      if (categoryParam) p.category = categoryParam;
      if (tagParam && tagParam !== "all") p.tag = tagParam;
    }
    return p;
  }, [categoryParam, tagParam, badgeParam, page]);

  // placeholderData: keepPreviousData keeps old category items visible while the new
  // fetch is in-flight, preventing the blank/empty flash on mobile filter taps.
  const { data: menuData, isLoading: itemsLoading, isFetching } = useMenu(queryParams, {
    placeholderData: keepPreviousData,
  });

  // Manage accumulated items for "Load More" pagination
  const currentKey = `${categoryParam}__${tagParam}__${badgeParam}`;

  // Reset pagination and accumulated state cleanly when current filter key changes
  useEffect(() => {
    if (currentKey !== lastQueryKey) {
      setLastQueryKey(currentKey);
      setPage(1);
      setAccumulatedItems([]);
      setIsTransitioning(true);
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = setTimeout(() => setIsTransitioning(false), 5000);
    }
  }, [currentKey, lastQueryKey]);

  // Track fetch completion: clear transitioning state when fetch has genuinely resolved
  const isFetchingRef = useRef(isFetching);
  useEffect(() => {
    if (isFetching) {
      isFetchingRef.current = true;
    } else if (isFetchingRef.current && !isFetching) {
      // Transition from fetching -> finished
      isFetchingRef.current = false;
      setIsTransitioning(false);
      clearTimeout(transitionTimerRef.current);
    } else if (!isFetching && isTransitioning) {
      // Served instantly from TanStack Query cache without network wait
      const timer = setTimeout(() => setIsTransitioning(false), 80);
      return () => clearTimeout(timer);
    }
  }, [isFetching, isTransitioning]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => clearTimeout(transitionTimerRef.current);
  }, []);

  // Touch event tracking for mobile category bar & quick tag pills
  const touchStartPos = useRef({ x: 0, y: 0, time: 0 });
  const lastTouchHandledTime = useRef(0);

  const handleTouchStart = (e) => {
    if (e.touches && e.touches[0]) {
      touchStartPos.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      };
    }
  };

  const handleTouchEnd = (e, callback) => {
    if (!e.changedTouches || !e.changedTouches[0]) return;
    const touch = e.changedTouches[0];
    const dx = Math.abs(touch.clientX - touchStartPos.current.x);
    const dy = Math.abs(touch.clientY - touchStartPos.current.y);
    const dt = Date.now() - touchStartPos.current.time;
    // Under 12px displacement & under 600ms = deliberate tap, not horizontal scroll
    if (dx < 12 && dy < 12 && dt < 600) {
      lastTouchHandledTime.current = Date.now();
      callback();
    }
  };

  const handleOptimizedClick = (callback) => {
    // If onTouchEnd already handled this tap within 450ms, suppress synthetic duplicate click
    if (Date.now() - lastTouchHandledTime.current < 450) {
      return;
    }
    callback();
  };

  const items = useMemo(() => {
    const newItems = menuData?.items || [];
    if (page === 1) {
      return newItems;
    }
    const existingIds = new Set(accumulatedItems.map((i) => i._id));
    const merged = [...accumulatedItems];
    for (const it of newItems) {
      if (!existingIds.has(it._id)) {
        merged.push(it);
      }
    }
    return merged;
  }, [menuData, page, accumulatedItems]);

  function handleSelectCategory(catSlug) {
    setPage(1);
    setAccumulatedItems([]);
    setSearchQuery(""); // Clear search so new category items display immediately
    setIsTransitioning(true);
    clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = setTimeout(() => setIsTransitioning(false), 5000);
    const next = new URLSearchParams(searchParams);
    if (!catSlug) {
      next.delete("category");
    } else {
      next.set("category", catSlug);
    }
    next.delete("tag"); // Reset tag filter when switching category
    next.delete("badge"); // Clear badge filter when switching category
    setSearchParams(next);
  }

  function handleSelectTag(tagId) {
    setPage(1);
    setAccumulatedItems([]);
    setSearchQuery(""); // Clear search when switching tag
    setIsTransitioning(true);
    clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = setTimeout(() => setIsTransitioning(false), 5000);
    const next = new URLSearchParams(searchParams);
    if (!tagId || tagId === "all") {
      next.delete("tag");
    } else {
      next.set("tag", tagId);
    }
    next.delete("badge"); // Clear badge filter when switching tag
    setSearchParams(next);
  }

  function handleSelectBadge(badgeId) {
    setPage(1);
    setAccumulatedItems([]);
    setSearchQuery("");
    setIsTransitioning(true);
    clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = setTimeout(() => setIsTransitioning(false), 5000);
    const next = new URLSearchParams(searchParams);
    next.set("badge", badgeId);
    next.delete("category");
    next.delete("tag");
    setSearchParams(next);
  }

  function handleClearBadge() {
    setPage(1);
    setAccumulatedItems([]);
    setIsTransitioning(true);
    clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = setTimeout(() => setIsTransitioning(false), 5000);
    const next = new URLSearchParams(searchParams);
    next.delete("badge");
    setSearchParams(next);
  }

  function handleLoadMore() {
    setAccumulatedItems(items);
    setPage((prev) => prev + 1);
  }

  // Filter items by client-side search query
  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = item.name?.toLowerCase().includes(q);
    const descMatch = item.description?.toLowerCase().includes(q);
    return nameMatch || descMatch;
  });

  const pagination = menuData?.pagination || {};
  const hasMore = pagination.page < pagination.totalPages;

  // Temporarily disabled — uncomment when hero video settings are re-enabled
  // const validVideo = settings?.heroVideoUrl || '';
  // const showVideoSection = Boolean(validVideo);
  const showVideoSection = false;

  return (
    <div className="menu-page">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <section className="site-section site-section--compact" style={{ paddingBottom: 0 }}>
        <div className="site-container">
          <div className="site-section__header menu-header-wrap" style={{ marginBottom: 20 }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: LUXURY_EASE }}
            >
              <span className="eyebrow">{MENU_CONTENT.eyebrow}</span>
              <h1 className="heading-lg">{MENU_CONTENT.heading}</h1>
            </motion.div>

            {/* Search Input (Grid only, list toggle removed) */}
            <motion.div
              className="menu-toolbar"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.1, ease: LUXURY_EASE }}
            >
              <input
                type="search"
                className="form-input menu-search-input"
                placeholder="Search cuts, burgers, dishes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search menu"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Video Section (directly under THE MENU. heading) ──────── */}
      {showVideoSection && (
        <PageMotionReel
          tag={MENU_CONTENT.reel.tag}
          title={MENU_CONTENT.reel.title}
          subtitle={MENU_CONTENT.reel.subtitle}
        />
      )}

      {/* ── Category Filter Strip & Quick Tags OR Badge Filter Banner ── */}
      {activeBadge ? (
        <motion.div
          className="menu-badge-banner"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: LUXURY_EASE }}
        >
          <div className="site-container menu-badge-banner__inner">
            <div className="menu-badge-banner__left">
              <span className="menu-badge-banner__label">Filtered by badge:</span>
              <div className="menu-badge-banner__chip">
                <img
                  src={activeBadge.icon}
                  alt=""
                  className="menu-badge-banner__icon"
                  width="26"
                  height="26"
                />
                <span className="menu-badge-banner__title">{activeBadge.label}</span>
              </div>
            </div>
            <button
              type="button"
              className="btn btn--outline btn--sm menu-badge-banner__clear"
              onClick={handleClearBadge}
            >
              Show full menu ✕
            </button>
          </div>
        </motion.div>
      ) : (
        <>
          {/* ── Category Filter Strip ─────────────────────────────────────── */}
          <motion.div
            className="category-bar"
            role="tablist"
            aria-label="Menu categories"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: LUXURY_EASE }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={!categoryParam}
              className={`category-bar__tab${!categoryParam ? " category-bar__tab--active" : ""}`}
              onTouchStart={handleTouchStart}
              onTouchEnd={(e) => handleTouchEnd(e, () => handleSelectCategory(""))}
              onClick={() => handleOptimizedClick(() => handleSelectCategory(""))}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat._id || cat.slug}
                type="button"
                role="tab"
                aria-selected={categoryParam === cat.slug}
                className={`category-bar__tab${categoryParam === cat.slug ? " category-bar__tab--active" : ""}`}
                onTouchStart={handleTouchStart}
                onTouchEnd={(e) => handleTouchEnd(e, () => handleSelectCategory(cat.slug))}
                onClick={() => handleOptimizedClick(() => handleSelectCategory(cat.slug))}
              >
                {cat.name}
              </button>
            ))}
          </motion.div>

          {/* ── Quick Tags Strip ────────────────────────────────────────── */}
          <motion.div
            className="quick-tags-bar"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: LUXURY_EASE }}
          >
            <div className="site-container quick-tags-bar__inner">
              {QUICK_TAGS.map((t) => {
                const isSelected = (!tagParam && t.id === "all") || tagParam === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onTouchStart={handleTouchStart}
                    onTouchEnd={(e) => handleTouchEnd(e, () => handleSelectTag(t.id))}
                    onClick={() => handleOptimizedClick(() => handleSelectTag(t.id))}
                    className={`quick-tags-bar__pill${isSelected ? " quick-tags-bar__pill--active" : ""}`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}

      {/* ── Menu Grid Listing ────────────────────────────────────────── */}
      <section className="site-section site-section--menu-list">
        <div className="site-container">
          {/* Show skeleton during initial load, active filter transition, or fetch */}
          {(itemsLoading && page === 1) || isTransitioning || (isFetching && page === 1 && filteredItems.length === 0) ? (
            <div className="menu-section-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="food-card skeleton" style={{ minHeight: 280 }} />
              ))}
            </div>
          ) : filteredItems.length === 0 && !isFetching && !itemsLoading && !isTransitioning ? (
            // Only show "No Dishes Found" when we are definitively done fetching and idle
            <div className="menu-empty-state">
              <h2 className="heading-md" style={{ marginBottom: 12 }}>
                {activeBadge ? `No ${activeBadge.label} Dishes Found` : MENU_CONTENT.emptyState.title}
              </h2>
              <p className="body-text" style={{ margin: "0 auto 24px" }}>
                {activeBadge
                  ? `There are currently no dishes marked with the ${activeBadge.label} badge.`
                  : MENU_CONTENT.emptyState.desc}
              </p>
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => {
                  setSearchQuery("");
                  if (activeBadge) {
                    handleClearBadge();
                  } else {
                    setSearchParams({});
                  }
                }}
              >
                {activeBadge ? "SHOW FULL MENU" : "RESET ALL FILTERS"}
              </button>
            </div>
          ) : filteredItems.length === 0 && (isFetching || isTransitioning) ? (
            // Still fetching — show skeleton rather than empty state
            <div className="menu-section-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="food-card skeleton" style={{ minHeight: 280 }} />
              ))}
            </div>
          ) : (
            <StaggerContainer
              key={`${categoryParam}__${tagParam}__${badgeParam}__${page}`}
              className="menu-section-grid"
              staggerDelay={0.04}
              animate="visible"
            >
              {filteredItems.map((item, idx) => {
                const cat = categories.find((c) => c._id === (item.category?._id || item.category));
                return (
                  <StaggerItem key={item._id} className="food-card-motion-wrap">
                    <FoodCard
                      item={item}
                      index={idx + 1}
                      categoryName={cat?.name}
                      onBadgeClick={handleSelectBadge}
                      onSelect={(it) => {
                        setSelectedItem(it);
                        setSelectedCatName(cat?.name || "");
                      }}
                    />
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          )}

          {/* Load More Button */}
          {hasMore && !searchQuery.trim() && (
            <div style={{ textAlign: "center", marginTop: 40 }}>
              <button
                type="button"
                className="btn btn--outline"
                onClick={handleLoadMore}
                disabled={isFetching}
              >
                {isFetching ? "LOADING..." : "LOAD MORE DISHES"}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Item Detail Modal */}
      {selectedItem && (
        <ItemModal
          item={selectedItem}
          categoryName={selectedCatName}
          onBadgeClick={(bId) => {
            setSelectedItem(null);
            handleSelectBadge(bId);
          }}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}
