import { cn } from '@/lib/utils';
import { AlertTriangle, AlertCircle, CheckCircle, Info } from 'lucide-react';

type Severity = 'critical' | 'warning' | 'safe' | 'info';

interface SeverityBadgeProps {
  severity: Severity;
  label?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

const severityConfig = {
  critical: {
    classes: 'badge-critical',
    icon: AlertCircle,
    defaultLabel: 'Critical',
  },
  warning: {
    classes: 'badge-warning',
    icon: AlertTriangle,
    defaultLabel: 'Warning',
  },
  safe: {
    classes: 'badge-success',
    icon: CheckCircle,
    defaultLabel: 'Safe',
  },
  info: {
    classes: 'badge-info',
    icon: Info,
    defaultLabel: 'Info',
  },
};

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-1.5',
};

export function SeverityBadge({ 
  severity, 
  label, 
  showIcon = true,
  size = 'md',
  pulse = false
}: SeverityBadgeProps) {
  const config = severityConfig[severity];
  const Icon = config.icon;
  
  return (
    <span 
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full',
        config.classes,
        sizeClasses[size],
        pulse && severity === 'critical' && 'animate-pulse-glow'
      )}
    >
      {showIcon && <Icon className="w-3.5 h-3.5" />}
      {label || config.defaultLabel}
    </span>
  );
}
