import { useEffect, useRef } from "react";
import { useLanguage } from "../hooks/useLanguage.js";

/**
 * PhotoViewer - Full-screen modal viewer for item photo on phones.
 */
export default function PhotoViewer({ src, alt, onClose }) {
  const { t } = useLanguage();
  const closeBtnRef = useRef(null);

  useEffect(() => {
    // Focus close button on mount
    closeBtnRef.current?.focus();

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose?.();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (!src) return null;

  return (
    <div
      className="photo-viewer-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={alt || t("itemModal.photoViewer") || "Photo"}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      }}
    >
      <button
        ref={closeBtnRef}
        type="button"
        className="photo-viewer-close-btn"
        aria-label={t("itemModal.close")}
        onClick={(e) => {
          e.stopPropagation();
          onClose?.();
        }}
      >
        ✕
      </button>

      <div
        className="photo-viewer-content"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose?.();
          }
        }}
      >
        <img
          src={src}
          alt={alt || ""}
          className="photo-viewer-img"
          decoding="async"
        />
      </div>
    </div>
  );
}
