import { Variants } from 'framer-motion';

export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

export const cardHoverMotion = {
  whileHover: {
    scale: 1.015,
    boxShadow: '0 12px 28px -4px rgba(0, 0, 0, 0.45), 0 0 16px rgba(20, 184, 166, 0.15)',
    transition: { duration: 0.2, ease: 'easeOut' },
  },
  whileTap: { scale: 0.99 },
};
