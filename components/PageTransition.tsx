import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

const PageTransition: React.FC<PageTransitionProps> = ({ children, className }) => {
  const reduceMotion = useReducedMotion();

  const initial = reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.99 };
  const animate = reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 };
  const exit = reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.99 };

  return (
    <motion.div
      initial={initial}
      animate={animate}
      exit={exit}
      transition={{
        duration: reduceMotion ? 0.01 : 0.15,
        ease: 'easeOut',
      }}
      className={`w-full min-h-full ${className || ''}`}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
