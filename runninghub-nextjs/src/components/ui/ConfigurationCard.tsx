'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfigurationCardProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  defaultExpanded?: boolean;
  cardClassName?: string;
}

export function ConfigurationCard({
  title,
  description,
  icon: Icon,
  iconBgColor = 'bg-blue-100',
  iconColor = 'text-blue-600',
  subtitle,
  children,
  className = '',
  defaultExpanded = false,
  cardClassName = 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200',
}: ConfigurationCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <Card className={cn('p-4 space-y-4', cardClassName, className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn('p-2 rounded-lg', iconBgColor)}>
            <Icon className={cn('h-5 w-5', iconColor)} />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{title}</h3>
            {description && <p className="text-sm text-gray-600">{description}</p>}
            {!isExpanded && subtitle && (
              <p className="text-xs text-gray-600 mt-1">{subtitle}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-500 hover:text-gray-700 transition-colors"
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {isExpanded && <div className="pt-2 border-t border-blue-200">{children}</div>}
    </Card>
  );
}
