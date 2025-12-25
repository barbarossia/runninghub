'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type CardVariant = 'light' | 'dark';

interface ConfigurationCardProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  variant?: CardVariant;
  iconBgColor?: string;
  iconColor?: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  defaultExpanded?: boolean;
  disabled?: boolean;
}

const VARIANT_STYLES = {
  light: {
    card: 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200',
    title: 'text-gray-900',
    description: 'text-gray-600',
    subtitle: 'text-gray-600',
    border: 'border-blue-200',
    button: 'text-gray-500 hover:text-gray-700',
  },
  dark: {
    card: 'bg-transparent border-white/10',
    title: 'text-white',
    description: 'text-gray-300',
    subtitle: 'text-blue-500/80',
    border: 'border-white/10',
    button: 'text-gray-500 group-hover/header:text-white',
  },
} as const;

export function ConfigurationCard({
  title,
  description,
  icon: Icon,
  variant = 'light',
  iconBgColor,
  iconColor,
  subtitle,
  children,
  className = '',
  defaultExpanded = false,
  disabled = false,
}: ConfigurationCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const styles = VARIANT_STYLES[variant];

  // Default colors based on variant
  const defaultIconBgColor = variant === 'dark' ? 'bg-blue-500/10 group-hover/header:bg-blue-500/20' : 'bg-blue-100';
  const defaultIconColor = variant === 'dark' ? 'text-blue-500' : 'text-blue-600';

  return (
    <Card
      className={cn(
        'p-4 space-y-4',
        styles.card,
        disabled && 'opacity-50 pointer-events-none',
        className
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between cursor-pointer group/header',
          variant === 'dark' && 'transition-colors'
        )}
        onClick={() => !disabled && setIsExpanded(!isExpanded)}
      >
        <div className={cn('flex items-center gap-2', variant === 'dark' ? 'gap-3' : 'gap-2')}>
          <div className={cn('p-2 rounded-lg transition-colors', iconBgColor || defaultIconBgColor)}>
            <Icon className={cn('h-5 w-5', iconColor || defaultIconColor)} />
          </div>
          <div>
            <h3 className={cn('font-semibold', variant === 'dark' ? 'text-lg' : 'text-base', styles.title, variant === 'dark' && 'group-hover/header:text-blue-400 transition-colors')}>
              {title}
            </h3>
            {description && <p className={cn('text-sm', styles.description)}>{description}</p>}
            {!isExpanded && subtitle && (
              <p className={cn('text-xs', styles.subtitle, variant === 'dark' && 'font-medium')}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
        <div className={cn(styles.button, variant === 'dark' && 'transition-colors')}>
          {isExpanded ? <ChevronUp className="h-5 w-4" /> : <ChevronDown className="h-5 w-4" />}
        </div>
      </div>

      {isExpanded && (
        <div className={cn('pt-2 border-t', styles.border)}>{children}</div>
      )}
    </Card>
  );
}
