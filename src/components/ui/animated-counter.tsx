import { forwardRef, useEffect, useRef } from 'react';
import { motion, useInView, useSpring, useTransform } from 'framer-motion';

interface AnimatedCounterProps {
  value: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  className?: string;
}

export const AnimatedCounter = forwardRef<HTMLSpanElement, AnimatedCounterProps>(({ 
  value, 
  suffix = '', 
  prefix = '',
  duration = 2,
  className = ''
}, forwardedRef) => {
  const internalRef = useRef<HTMLSpanElement>(null);
  const ref = (forwardedRef as React.RefObject<HTMLSpanElement>) || internalRef;
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  
  const spring = useSpring(0, {
    damping: 30,
    stiffness: 100,
    duration: duration * 1000,
  });
  
  const display = useTransform(spring, (current) => 
    Math.floor(current).toLocaleString()
  );

  useEffect(() => {
    if (isInView) {
      spring.set(value);
    }
  }, [isInView, spring, value]);

  return (
    <motion.span 
      ref={ref} 
      className={`font-display tabular-nums ${className}`}
    >
      {prefix}
      <motion.span>{display}</motion.span>
      {suffix}
    </motion.span>
  );
});

AnimatedCounter.displayName = 'AnimatedCounter';