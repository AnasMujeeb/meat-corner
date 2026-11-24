import { useEffect, useRef, useState, useCallback } from "react";
import { useLanguage } from "../hooks/useLanguage.js";

/**
 * PhotoViewer - Full-screen modal viewer for item photo on phones with touch zoom & pan.
 *
 * Supported interactions:
 * - Pinch-to-zoom (scale 1x to 4x) around gesture midpoint.
 * - Double-tap to toggle between 1x and 2.5x centered on tapped point.
 * - Single-finger panning when zoomed (scale > 1), strictly clamped to photo bounds.
 * - Reset zoom/position when closing or changing src; re-clamped on screen rotation.
 * - Native gesture prevention on iOS (gesturestart / gesturechange / gestureend).
 */
export default function PhotoViewer({ src, alt, onClose }) {
  const { t } = useLanguage();
  const closeBtnRef = useRef(null);
  const containerRef = useRef(null);
  const imgRef = useRef(null);

  // Transform state: scale and translation (px)
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });

  // Refs for gesture tracking (avoiding stale state in event listeners)
  const transformRef = useRef({ scale: 1, x: 0, y: 0 });
  transformRef.current = transform;

  const activePointers = useRef(new Map());
  const pinchStartDist = useRef(0);
  const pinchStartScale = useRef(1);
  const pinchStartMidpoint = useRef({ x: 0, y: 0 });
  const panStartPointer = useRef({ x: 0, y: 0 });
  const panStartTransform = useRef({ x: 0, y: 0 });
  const lastTapTime = useRef(0);
  const lastTapPos = useRef({ x: 0, y: 0 });

  // Clamps translation x and y so the zoomed image never leaves empty gaps past container bounds
  const clampTranslation = useCallback((scale, x, y) => {
    if (scale <= 1 || !containerRef.current || !imgRef.current) {
      return { x: 0, y: 0 };
    }

    const container = containerRef.current.getBoundingClientRect();
    const imgNaturalW = imgRef.current.naturalWidth || container.width;
    const imgNaturalH = imgRef.current.naturalHeight || container.height;

    // Calculate base fitted size of image (object-fit: contain)
    const containerAspect = container.width / container.height;
    const imgAspect = imgNaturalW / imgNaturalH;

    let baseW = container.width;
    let baseH = container.height;
    if (imgAspect > containerAspect) {
      baseH = container.width / imgAspect;
    } else {
      baseW = container.height * imgAspect;
    }

    const scaledW = baseW * scale;
    const scaledH = baseH * scale;

    // Maximum pan allowed from center
    const maxPanX = Math.max(0, (scaledW - container.width) / 2);
    const maxPanY = Math.max(0, (scaledH - container.height) / 2);

    const clampedX = Math.min(maxPanX, Math.max(-maxPanX, x));
    const clampedY = Math.min(maxPanY, Math.max(-maxPanY, y));

    return { x: clampedX, y: clampedY };
  }, []);

  // Reset transform when src changes
  useEffect(() => {
    setTransform({ scale: 1, x: 0, y: 0 });
  }, [src]);

  // Re-clamp position on window resize / orientation change
  useEffect(() => {
    function handleResize() {
      const cur = transformRef.current;
      if (cur.scale > 1) {
        const clamped = clampTranslation(cur.scale, cur.x, cur.y);
        setTransform({ scale: cur.scale, x: clamped.x, y: clamped.y });
      } else {
        setTransform({ scale: 1, x: 0, y: 0 });
      }
    }

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, [clampTranslation]);

  // Keyboard navigation & iOS safari gesture preventDefault
  useEffect(() => {
    closeBtnRef.current?.focus();

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose?.();
      }
    }

    function preventIosGestures(e) {
      e.preventDefault();
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("gesturestart", preventIosGestures, { passive: false });
    document.addEventListener("gesturechange", preventIosGestures, { passive: false });
    document.addEventListener("gestureend", preventIosGestures, { passive: false });

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("gesturestart", preventIosGestures);
      document.removeEventListener("gesturechange", preventIosGestures);
      document.removeEventListener("gestureend", preventIosGestures);
    };
  }, [onClose]);

  // Pointer event handlers for pinch-to-zoom and drag-to-pan
  const handlePointerDown = (e) => {
    // Only handle primary touches / pen
    containerRef.current?.setPointerCapture?.(e.pointerId);
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const pointers = Array.from(activePointers.current.values());

    if (pointers.length === 2) {
      // Pinch started
      const p1 = pointers[0];
      const p2 = pointers[1];
      pinchStartDist.current = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      pinchStartScale.current = transformRef.current.scale;
      pinchStartMidpoint.current = {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2,
      };
      panStartTransform.current = {
        x: transformRef.current.x,
        y: transformRef.current.y,
      };
    } else if (pointers.length === 1) {
      // Pan started or potential double-tap
      panStartPointer.current = { x: e.clientX, y: e.clientY };
      panStartTransform.current = {
        x: transformRef.current.x,
        y: transformRef.current.y,
      };

      // Check double-tap
      const now = Date.now();
      const distFromLastTap = Math.hypot(
        e.clientX - lastTapPos.current.x,
        e.clientY - lastTapPos.current.y
      );

      if (now - lastTapTime.current < 300 && distFromLastTap < 30) {
        // Double-tap detected
        lastTapTime.current = 0;
        const currentScale = transformRef.current.scale;
        if (currentScale > 1.05) {
          // Zoom out to 1x
          setTransform({ scale: 1, x: 0, y: 0 });
        } else {
          // Zoom in to 2.5x around tap position
          const targetScale = 2.5;
          const rect = containerRef.current.getBoundingClientRect();
          const tapCenterX = e.clientX - (rect.left + rect.width / 2);
          const tapCenterY = e.clientY - (rect.top + rect.height / 2);

          // Translate so tapped point moves toward center
          const targetX = -tapCenterX * (targetScale - 1);
          const targetY = -tapCenterY * (targetScale - 1);

          const clamped = clampTranslation(targetScale, targetX, targetY);
          setTransform({ scale: targetScale, x: clamped.x, y: clamped.y });
        }
      } else {
        lastTapTime.current = now;
        lastTapPos.current = { x: e.clientX, y: e.clientY };
      }
    }
  };

  const handlePointerMove = (e) => {
    if (!activePointers.current.has(e.pointerId)) return;
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const pointers = Array.from(activePointers.current.values());

    if (pointers.length >= 2) {
      // Multi-touch Pinch
      const p1 = pointers[0];
      const p2 = pointers[1];
      const currentDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);

      if (pinchStartDist.current > 0) {
        const factor = currentDist / pinchStartDist.current;
        const newScale = Math.min(4, Math.max(1, pinchStartScale.current * factor));

        // Adjust translation around pinch midpoint
        const currentMid = {
          x: (p1.x + p2.x) / 2,
          y: (p1.y + p2.y) / 2,
        };

        const rect = containerRef.current.getBoundingClientRect();
        const midRelX = currentMid.x - (rect.left + rect.width / 2);
        const midRelY = currentMid.y - (rect.top + rect.height / 2);

        const deltaScale = newScale - pinchStartScale.current;
        const targetX = panStartTransform.current.x - (midRelX * deltaScale) / (pinchStartScale.current || 1);
        const targetY = panStartTransform.current.y - (midRelY * deltaScale) / (pinchStartScale.current || 1);

        const clamped = clampTranslation(newScale, targetX, targetY);
        setTransform({ scale: newScale, x: clamped.x, y: clamped.y });
      }
    } else if (pointers.length === 1 && transformRef.current.scale > 1) {
      // Single-finger Pan (only active when zoomed)
      const dx = e.clientX - panStartPointer.current.x;
      const dy = e.clientY - panStartPointer.current.y;

      const targetX = panStartTransform.current.x + dx;
      const targetY = panStartTransform.current.y + dy;

      const clamped = clampTranslation(transformRef.current.scale, targetX, targetY);
      setTransform({ scale: transformRef.current.scale, x: clamped.x, y: clamped.y });
    }
  };

  const handlePointerUp = (e) => {
    activePointers.current.delete(e.pointerId);
    try {
      containerRef.current?.releasePointerCapture?.(e.pointerId);
    } catch {
      // Ignore if pointer capture already released
    }

    if (activePointers.current.size === 1) {
      // Reset pan start pointer for remaining finger
      const remaining = Array.from(activePointers.current.values())[0];
      panStartPointer.current = { x: remaining.x, y: remaining.y };
      panStartTransform.current = {
        x: transformRef.current.x,
        y: transformRef.current.y,
      };
    } else if (activePointers.current.size === 0) {
      pinchStartDist.current = 0;
      // If scale snapped back near 1, smoothly reset
      if (transformRef.current.scale <= 1.05) {
        setTransform({ scale: 1, x: 0, y: 0 });
      } else {
        const clamped = clampTranslation(
          transformRef.current.scale,
          transformRef.current.x,
          transformRef.current.y
        );
        setTransform({
          scale: transformRef.current.scale,
          x: clamped.x,
          y: clamped.y,
        });
      }
    }
  };

  if (!src) return null;

  return (
    <div
      className="photo-viewer-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={alt || t("itemModal.photoViewer") || "Photo"}
      onClick={(e) => {
        // If clicking outside the active image content while at 1x scale, close
        if (e.target === e.currentTarget && transform.scale <= 1) {
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
        ref={containerRef}
        className="photo-viewer-content"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <img
          ref={imgRef}
          src={src}
          alt={alt || ""}
          className="photo-viewer-img"
          decoding="async"
          draggable={false}
          style={{
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0px) scale(${transform.scale})`,
            transformOrigin: "center center",
            transition: activePointers.current.size > 0 ? "none" : "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
            touchAction: "none",
            willChange: "transform",
          }}
        />
      </div>
    </div>
  );
}
