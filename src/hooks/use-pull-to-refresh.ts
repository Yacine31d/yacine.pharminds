import { useState, useEffect, useCallback, useRef } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  disabled?: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  disabled = false,
}: UsePullToRefreshOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const currentY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled || isRefreshing) return;
      
      const container = containerRef.current;
      if (!container) return;
      
      // Only trigger if at the top of the scroll container
      if (container.scrollTop > 0) return;
      
      startY.current = e.touches[0].clientY;
    },
    [disabled, isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (disabled || isRefreshing || startY.current === 0) return;
      
      const container = containerRef.current;
      if (!container || container.scrollTop > 0) {
        startY.current = 0;
        setPullDistance(0);
        return;
      }

      currentY.current = e.touches[0].clientY;
      const diff = currentY.current - startY.current;
      
      if (diff > 0) {
        // Apply resistance to make it feel natural
        const resistance = 0.5;
        const distance = Math.min(diff * resistance, threshold * 1.5);
        setPullDistance(distance);
        
        if (distance > 10) {
          e.preventDefault();
        }
      }
    },
    [disabled, isRefreshing, threshold]
  );

  const handleTouchEnd = useCallback(async () => {
    if (disabled || isRefreshing) return;

    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }

    startY.current = 0;
    currentY.current = 0;
    setPullDistance(0);
  }, [disabled, isRefreshing, onRefresh, pullDistance, threshold]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const progress = Math.min(pullDistance / threshold, 1);

  return {
    containerRef,
    isRefreshing,
    pullDistance,
    progress,
  };
}
