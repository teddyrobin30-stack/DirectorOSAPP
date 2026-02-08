import React from 'react';
import { motion } from 'framer-motion';

interface PageTransitionProps {
  children: React.ReactNode;
}

const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.99 }}  // Mouvement plus subtil (8px au lieu de 15)
      animate={{ opacity: 1, y: 0, scale: 1 }}     
      exit={{ opacity: 0, y: -8, scale: 0.99 }}    // Sortie discrète
      transition={{ 
        duration: 0.15,         // Très rapide (0.15s)
        ease: "easeOut"         // Démarre vite, freine à la fin (naturel)
      }}
      className="h-full w-full"
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;