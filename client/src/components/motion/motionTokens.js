/**
 * Standard luxury easing curve:
 * Decelerates smoothly with a soft landing, characteristic of high-end editorial and restaurant brands.
 */
export const LUXURY_EASE = [0.22, 1, 0.36, 1];

/**
 * Common viewport options ensuring animations trigger once when scrolled into view.
 * - once: true  →  IntersectionObserver disconnects after first trigger (no re-observation cost)
 * - amount: 0.15 →  Element must be 15 % visible before animating (avoids premature pop-in)
 * - margin   →  Fire slightly before the element fully enters the viewport for a smooth feel
 */
export const DEFAULT_VIEWPORT = {
  once: true,
  amount: 0.15,
  margin: "0px 0px -40px 0px",
};
