import { motion } from 'framer-motion';
import { ReactNode, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: 'primary' | 'danger' | 'info' | 'warning' | 'destructive' | 'success';
  delay?: number;
  hover?: boolean;
}

const glowClasses = {
  primary: 'hover:shadow-[0_0_40px_hsl(158_64%_52%/0.3)]',
  danger: 'hover:shadow-[0_0_40px_hsl(4_90%_58%/0.3)]',
  destructive: 'hover:shadow-[0_0_40px_hsl(4_90%_58%/0.3)]',
  info: 'hover:shadow-[0_0_40px_hsl(189_94%_43%/0.3)]',
  warning: 'hover:shadow-[0_0_40px_hsl(38_92%_50%/0.3)]',
  success: 'hover:shadow-[0_0_40px_hsl(158_64%_52%/0.3)]',
};

export const GlowCard = forwardRef<HTMLDivElement, GlowCardProps>(({ 
  children, 
  className, 
  glowColor = 'primary',
  delay = 0,
  hover = true 
}, ref) => {
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ 
        duration: 0.6, 
        delay,
        ease: [0.21, 0.47, 0.32, 0.98]
      }}
      whileHover={hover ? { y: -5, scale: 1.02 } : undefined}
      className={cn(
        'glass-card p-6 transition-all duration-500',
        hover && glowClasses[glowColor],
        className
      )}
    >
      {children}
    </motion.div>
  );
});

GlowCard.displayName = 'GlowCard';
