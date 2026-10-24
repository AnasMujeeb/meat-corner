/**
 * Shared Img Helper Component
 * - Ensures width, height, decoding="async" on every image to prevent CLS.
 * - Supports automatic thumb/full srcset generation for uploads.
 * - Supports loading="lazy" (default) or loading="eager" + fetchpriority="high" for hero/LCP.
 */
export default function Img({
  src,
  thumbUrl,
  alt = "",
  width,
  height,
  className = "",
  style = {},
  priority = false, // If true: loading="eager", fetchPriority="high"
  sizes = "(max-width: 760px) 50vw, (max-width: 1200px) 25vw, 400px",
  ...props
}) {
  if (!src) return null;

  // Derive thumb and full URLs if this is an upload
  let finalSrc = src;
  let srcSet;

  if (typeof src === "string" && (src.includes("/uploads/") || src.startsWith("http") || thumbUrl)) {
    const isThumb = src.includes("_thumb.webp");
    const fullUrl = isThumb ? src.replace("_thumb.webp", ".webp") : src;
    const thumb = thumbUrl || (isThumb ? src : (src.endsWith(".webp") ? src.replace(/\.webp$/, "_thumb.webp") : src));

    // For cards/lists (non-priority), use thumbnail as default src with srcset
    if (thumb && fullUrl && thumb !== fullUrl) {
      finalSrc = priority ? fullUrl : thumb;
      srcSet = `${thumb} 400w, ${fullUrl} 1200w`;
    } else {
      finalSrc = thumbUrl && !priority ? thumbUrl : fullUrl;
    }
  }

  return (
    <img
      src={finalSrc}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      width={width || 400}
      height={height || 300}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      className={className}
      style={{ display: "block", maxWidth: "100%", ...style }}
      {...props}
    />
  );
}
