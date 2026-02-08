import React from 'react';
import { motion } from 'framer-motion';

interface PageTransitionProps {
  children: React.ReactNode;
}

const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.98 }} // État de départ (invisible, légèrement bas et petit)
      animate={{ opacity: 1, y: 0, scale: 1 }}     // État final (visible, place normale)
      exit={{ opacity: 0, y: -15, scale: 0.98 }}   // État de sortie (disparait vers le haut)
      transition={{ 
        type: "spring", 
        stiffness: 260, 
        damping: 20, 
        duration: 0.3 
      }}
      className="h-full w-full" // Prend toute la place disponible
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;