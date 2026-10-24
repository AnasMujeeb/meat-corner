import { motion, useReducedMotion } from "framer-motion";
import { LUXURY_EASE, DEFAULT_VIEWPORT } from "./motionTokens.js";

/**
 * Reusable scroll reveal component with subtle fade-in and vertical rise.
 */
export function ScrollReveal({
  children,
  delay = 0,
  duration = 0.7,
  y = 28,
  x = 0,
  className = "",
  style = {},
  viewport = DEFAULT_VIEWPORT,
  as = "div",
  ...props
}) {
  const shouldReduceMotion = useReducedMotion();
  const MotionComponent = motion[as] || motion.div;

  if (shouldReduceMotion) {
    const Tag = as;
    return (
      <Tag className={className} style={style} {...props}>
        {children}
      </Tag>
    );
  }

  return (
    <MotionComponent
      initial={{ opacity: 0, y, x }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={viewport}
      transition={{
        duration,
        delay,
        ease: LUXURY_EASE,
      }}
      className={className}
      style={style}
      {...props}
    >
      {children}
    </MotionComponent>
  );
}

/**
 * Stagger container for grids and lists (cards, categories, stories).
 * Children with StaggerItem will reveal sequentially.
 */
export function StaggerContainer({
  children,
  staggerDelay = 0.08,
  delayChildren = 0,
  className = "",
  style = {},
  viewport = DEFAULT_VIEWPORT,
  as = "div",
  animate,
  ...props
}) {
  const shouldReduceMotion = useReducedMotion();
  const MotionComponent = motion[as] || motion.div;

  if (shouldReduceMotion) {
    const Tag = as;
    return (
      <Tag className={className} style={style} {...props}>
        {children}
      </Tag>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: delayChildren,
      },
    },
  };

  const isDirectAnimate = Boolean(animate);

  return (
    <MotionComponent
      initial="hidden"
      animate={isDirectAnimate ? animate : undefined}
      whileInView={!isDirectAnimate ? "visible" : undefined}
      viewport={!isDirectAnimate ? viewport : undefined}
      variants={containerVariants}
      className={className}
      style={style}
      {...props}
    >
      {children}
    </MotionComponent>
  );
}

/**
 * Individual item within a StaggerContainer.
 */
export function StaggerItem({
  children,
  y = 28,
  duration = 0.65,
  className = "",
  style = {},
  as = "div",
  ...props
}) {
  const shouldReduceMotion = useReducedMotion();
  const MotionComponent = motion[as] || motion.div;

  if (shouldReduceMotion) {
    const Tag = as;
    return (
      <Tag className={className} style={style} {...props}>
        {children}
      </Tag>
    );
  }

  const itemVariants = {
    hidden: { opacity: 0, y },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration,
        ease: LUXURY_EASE,
      },
    },
  };

  return (
    <MotionComponent
      variants={itemVariants}
      className={className}
      style={style}
      {...props}
    >
      {children}
    </MotionComponent>
  );
}
