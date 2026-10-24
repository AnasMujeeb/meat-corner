import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useMenu, useCategories, useBranches, useSettings } from "../api/queries.js";
import ItemModal from "../components/ItemModal.jsx";
import FoodCard from "../components/FoodCard.jsx";
import LazyVideo from "../components/LazyVideo.jsx";
import {
  TICKER_ITEMS,
  HERO_CONTENT,
  STORIES_SECTION,
  CATEGORIES_SECTION,
  FEATURED_SECTION,
  STORY_SECTION,
  CATERING_SECTION,
  LOCATIONS_SECTION,
} from "../content/home.js";

/**
 * Lightweight, zero-runtime-overhead scroll reveal for HomePage
 * - Uses native IntersectionObserver that unobserves immediately after first trigger.
 * - Animates strictly via GPU-accelerated CSS (opacity & transform).
 * - Avoids main-thread layout recalculations on scroll.
 */
function ScrollReveal({
  children,
  className = "",
  delay = 0,
  style = {},
  as: Tag = "div",
  ...props
}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("home-revealed");
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("home-revealed");
          obs.unobserve(el);
        }
      },
      { rootMargin: "0px 0px -40px 0px", threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`home-reveal ${className}`}
      style={{
        ...style,
        ...(delay ? { transitionDelay: `${delay}s` } : {}),
      }}
      {...props}
    >
      {children}
    </Tag>
  );
}

function StaggerContainer({ children, className = "", as: Tag = "div", ...props }) {
  return <Tag className={className} {...props}>{children}</Tag>;
}

function StaggerItem({ children, className = "", delay = 0, as: Tag = "div", ...props }) {
  return (
    <ScrollReveal className={className} delay={delay} as={Tag} {...props}>
      {children}
    </ScrollReveal>
  );
}

function TickerStrip() {
  return (
    <div className="promo-ticker" aria-hidden="true">
      <div className="promo-ticker__track">
        {[...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
          <span key={i}>{item}</span>
        ))}
      </div>
    </div>
  );
}

export default function HomePage({ settings: propSettings, branches: propBranches }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedCat, setSelectedCat] = useState(null);

  const { data: fetchedSettings } = useSettings();
  const { data: fetchedBranches } = useBranches();
  const { data: categories = [], isLoading: catsLoading } = useCategories();
  const { data: featuredData } = useMenu({ tag: "featured", limit: 6 });

  const settings = propSettings || fetchedSettings || {};
  const branches = propBranches?.length ? propBranches : (fetchedBranches || []);
  const featured = featuredData?.items || [];

  const videoUrl = '';
  const showStories = Boolean(STORIES_SECTION.cards && STORIES_SECTION.cards.length > 0);

  return (
    <div className="home-page">
      {/* ── Hero Banner ──────────────────────────────────────────────────────── */}
      <section className="hero-banner overflow-hidden" aria-label="Hero">
        <div className="hero-banner__content h-full">
          <span className="eyebrow home-hero-anim home-hero-anim--eyebrow">
            {HERO_CONTENT.eyebrow}
          </span>
          <h1
            style={{ whiteSpace: "pre-line" }}
            className="home-hero-anim home-hero-anim--heading"
          >
            {HERO_CONTENT.heading}
          </h1>
          <p className="home-hero-anim home-hero-anim--subtext">
            {HERO_CONTENT.subtext}
          </p>
          <div className="hero-banner__actions home-hero-anim home-hero-anim--actions">
            <Link to={HERO_CONTENT.ctaLink} className="btn btn--primary" id="hero-explore-btn">
              {HERO_CONTENT.ctaText}
            </Link>
          </div>
        </div>

        <div
          className="hero-banner__media h-full home-hero-anim home-hero-anim--media"
          aria-hidden="true"
        >
          <LazyVideo
            src="/videos/secondvideo.mp4"
            poster={settings?.heroPoster || "/posters/secondvideo.jpg"}
            className="w-full h-full object-cover"
          />

          <div className="hero-banner__shade" />

          <div className="hero-banner__location-stamp home-hero-anim home-hero-anim--stamp">
            {branches?.find((b) => /centro/i.test(b.name || b.slug))?.name ? `${branches.find((b) => /centro/i.test(b.name || b.slug)).name} • Doha` : "CENTRO • DOHA"}
          </div>
          <div className="hero-banner__live-tag home-hero-anim home-hero-anim--tag">
            {HERO_CONTENT.liveTag}
          </div>
        </div>
      </section>

      {/* ── Ticker ────────────────────────────────────────────────────────────── */}
      <TickerStrip />

      {/* ── Video Stories (Meat Corner in motion) ───────────────────────── */}
      {showStories && (
        <section className="site-section site-section--stories" aria-labelledby="stories-heading">
          <div className="site-container">
            <ScrollReveal className="site-section__header">
              <div>
                <span className="eyebrow">{STORIES_SECTION.eyebrow}</span>
                <h2 id="stories-heading" style={{ whiteSpace: "pre-line" }}>
                  {STORIES_SECTION.heading}
                </h2>
              </div>
              <p className="site-section__intro">
                {STORIES_SECTION.intro}
              </p>
            </ScrollReveal>

            <StaggerContainer className="video-story-grid">
              {STORIES_SECTION.cards.map((card, idx) => (
                <StaggerItem key={idx} delay={idx * 0.08} className="video-story-motion-wrap">
                  <article className="video-story-card">
                    {idx === 0 ? (
                      <LazyVideo
                        src="/videos/fromthekitchen-540p.mp4"
                        poster="/posters/fromthekitchen.jpg"
                        className="w-full h-full object-cover"
                      />
                    ) : idx === 1 ? (
                      <LazyVideo
                        src="/videos/selection-540p.mp4"
                        poster="/posters/selection.jpg"
                        className="w-full h-48 md:h-64 object-cover rounded-t-lg"
                      />
                    ) : idx === 2 || card.title === "THE GATHERING" ? (
                      <LazyVideo
                        src="/videos/img3129-540p.mp4"
                        poster="/posters/img3129.jpg"
                        className="w-full h-full object-cover"
                      />
                    ) : card.video ? (
                      <LazyVideo
                        src={card.video}
                        className="w-full h-full object-cover"
                      />
                    ) : card.image ? (
                      <img src={card.image} alt={card.title} className="video-story-card__media" loading="lazy" width="400" height="300" decoding="async" />
                    ) : videoUrl ? (
                      <LazyVideo src={videoUrl} className="video-story-card__media" />
                    ) : (
                      <div className="video-story-card__media" style={{ background: "#1a1a1a" }} />
                    )}
                    <div className="video-story-overlay">
                      <span>{card.step}</span>
                      <strong>{card.title}</strong>
                      <p>{card.desc}</p>
                    </div>
                  </article>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>
      )}

      {/* ── Best of the Corner (Featured items) ───────────────────────────────── */}
      {featured.length > 0 && (
        <section className="site-section site-section--featured" aria-labelledby="featured-heading">
          <div className="site-container">
            <ScrollReveal className="site-section__header">
              <div>
                <span className="eyebrow">{FEATURED_SECTION.eyebrow}</span>
                <h2 id="featured-heading" style={{ whiteSpace: "pre-line" }}>
                  {FEATURED_SECTION.heading}
                </h2>
              </div>
              <p className="site-section__intro">
                {FEATURED_SECTION.intro}
              </p>
            </ScrollReveal>

            <StaggerContainer className="menu-section-grid">
              {featured.slice(0, 4).map((item, index) => {
                const cat = categories.find((c) => c._id === (item.category?._id || item.category));
                return (
                  <StaggerItem key={item._id} delay={index * 0.08} className="food-card-motion-wrap">
                    <FoodCard
                      item={item}
                      index={index + 1}
                      categoryName={cat?.name}
                      onSelect={(it) => {
                        setSelectedItem(it);
                        setSelectedCat(cat?.name);
                      }}
                    />
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          </div>
        </section>
      )}

      {/* ── Find Your Corner (Categories) ─────────────────────────────────────── */}
      <section className="site-section site-section--categories" aria-labelledby="corner-heading">
        <div className="site-container">
          <ScrollReveal className="site-section__header">
            <div>
              <span className="eyebrow">{CATEGORIES_SECTION.eyebrow}</span>
              <h2 id="corner-heading" style={{ whiteSpace: "pre-line" }}>
                {CATEGORIES_SECTION.heading}
              </h2>
            </div>
          </ScrollReveal>

          <StaggerContainer className="category-showcase">
            {catsLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                <StaggerItem key={i} delay={i * 0.08} className="category-card-motion-wrap">
                  <div className="category-card" style={{ background: "#222" }} />
                </StaggerItem>
              ))
              : categories.slice(0, 4).map((cat, idx) => {
                const rawImg = typeof cat.image === "string" ? cat.image : (cat.image?.thumbUrl || cat.image?.url || "");
                const catImg = rawImg.includes("/uploads/processed/") && !rawImg.includes("_thumb.webp")
                  ? rawImg.replace(/\.webp$/, "_thumb.webp")
                  : rawImg;

                return (
                  <StaggerItem key={cat._id || cat.slug} delay={idx * 0.08} className="category-card-motion-wrap">
                    <Link
                      to={`/menu?category=${cat.slug}`}
                      className="category-card"
                      aria-label={`Browse ${cat.name}`}
                    >
                      {catImg ? (
                        <img
                          src={catImg}
                          alt={cat.name}
                          loading="lazy"
                          width="400"
                          height="300"
                          decoding="async"
                        />
                      ) : (
                        <div style={{ background: "linear-gradient(135deg, #1f1f1f, #141414)", width: "100%", height: "100%", position: "absolute", inset: 0 }} />
                      )}
                      <strong>{cat.name}</strong>
                    </Link>
                  </StaggerItem>
                );
              })}
          </StaggerContainer>
        </div>
      </section>

      {/* ── Story / Split Section ────────────────────────────────────────────── */}
      <section className="story-split story-split--home-story md:h-[400px] lg:h-[420px]" aria-label="Our story">
        <ScrollReveal className="story-split__media h-full min-h-0" delay={0.05}>
          <LazyVideo
            src="/videos/img3084-540p.mp4"
            poster="/posters/img3084.jpg"
            className="w-full h-full object-cover"
          />
        </ScrollReveal>

        <ScrollReveal className="story-split__content story-split__content--accent h-full min-h-0" delay={0.15}>
          <span className="eyebrow" style={{ color: "#fff" }}>{STORY_SECTION.eyebrow}</span>
          <h2 style={{ whiteSpace: "pre-line" }}>{STORY_SECTION.heading}</h2>
          <p>{settings?.aboutText || STORY_SECTION.body}</p>
          <div className="story-split__actions">
            <Link to={STORY_SECTION.ctaLink} className="btn btn--outline-white" id="our-story-btn">
              {STORY_SECTION.ctaText}
            </Link>
          </div>
        </ScrollReveal>
      </section>

      {/* ── Catering Split Section ────────────────────────────────────────────── */}
      <section className="story-split story-split--reverse" aria-label="Catering by Meat Corner">
        <ScrollReveal className="story-split__content" delay={0.05}>
          <span className="eyebrow">{CATERING_SECTION.eyebrow}</span>
          <h2 style={{ whiteSpace: "pre-line" }}>{CATERING_SECTION.heading}</h2>
          <p>{CATERING_SECTION.body}</p>
          <div className="story-split__actions">
            <Link to={CATERING_SECTION.ctaLink} className="btn btn--primary" id="home-catering-btn">
              {CATERING_SECTION.ctaText}
            </Link>
          </div>
        </ScrollReveal>

        <ScrollReveal className="story-split__media" delay={0.15}>
          <img
            src="/uploads/processed/meat-corner-nachos.webp"
            srcSet="/uploads/processed/meat-corner-nachos_thumb.webp 400w, /uploads/processed/meat-corner-nachos.webp 1200w"
            sizes="(max-width: 768px) 100vw, 50vw"
            alt="Meat Corner catering"
            width="800"
            height="600"
            decoding="async"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            loading="lazy"
          />
        </ScrollReveal>
      </section>

      {/* ── Locations Section ────────────────────────────────────────────────── */}
      {branches.length > 0 && (
        <section className="site-section locations-section" id="locations" aria-labelledby="locations-heading">
          <div className="site-container">
            <ScrollReveal className="site-section__header locations-section__header">
              <div>
                <span className="eyebrow">{LOCATIONS_SECTION.eyebrow}</span>
                <h2 id="locations-heading" style={{ whiteSpace: "pre-line" }}>{LOCATIONS_SECTION.heading}</h2>
              </div>
              <p className="site-section__intro">
                {LOCATIONS_SECTION.intro}
              </p>
            </ScrollReveal>

            <StaggerContainer className="location-grid">
              {branches.slice(0, 2).map((b, idx) => (
                <StaggerItem key={b._id || b.name} delay={idx * 0.1} className="location-card-motion-wrap">
                  <a
                    className={`location-card${idx === 1 ? " location-card--featured" : ""}`}
                    href={b.mapUrl || "https://maps.google.com"}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span>{String(idx + 1).padStart(2, "0")} · {b.name}</span>
                    <strong>{LOCATIONS_SECTION.directionsLabel}</strong>
                  </a>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>
      )}

      {selectedItem && (
        <ItemModal
          item={selectedItem}
          categoryName={selectedCat}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}
