import { ReactNode, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { useIsMobile } from '@/hooks/use-mobile';

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  className?: string;
  disabled?: boolean;
}

export const PullToRefresh = forwardRef<HTMLDivElement, PullToRefreshProps>(
  ({ children, onRefresh, className, disabled = false }, ref) => {
    const isMobile = useIsMobile();
    const { containerRef, isRefreshing, pullDistance, progress } = usePullToRefresh({
      onRefresh,
      threshold: 80,
      disabled: disabled || !isMobile,
    });

    return (
      <div
        ref={(node) => {
          // Handle both refs
          (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        className={cn('relative overflow-auto', className)}
      >
        {/* Pull indicator */}
        <AnimatePresence>
          {(pullDistance > 0 || isRefreshing) && isMobile && (
            <motion.div
              initial={{ opacity: 0, y: -40 }}
              animate={{ 
                opacity: 1, 
                y: Math.min(pullDistance - 40, 20),
              }}
              exit={{ opacity: 0, y: -40 }}
              className="absolute left-1/2 -translate-x-1/2 z-50 pointer-events-none"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-card border border-border shadow-lg">
                <RefreshCw 
                  className={cn(
                    'w-5 h-5 text-primary transition-transform',
                    isRefreshing && 'animate-spin'
                  )} 
                  style={{
                    transform: isRefreshing 
                      ? undefined 
                      : `rotate(${progress * 360}deg)`,
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content with pull effect */}
        <div
          style={{
            transform: isMobile && pullDistance > 0 
              ? `translateY(${Math.min(pullDistance * 0.5, 40)}px)` 
              : undefined,
            transition: pullDistance === 0 ? 'transform 0.2s ease-out' : undefined,
          }}
        >
          {children}
        </div>
      </div>
    );
  }
);

PullToRefresh.displayName = 'PullToRefresh';
