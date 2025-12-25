'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Only set mounted to true after client-side hydration
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setMounted(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const isDark = mounted && theme === 'dark';

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => mounted && setTheme(isDark ? 'light' : 'dark')}
      className="h-9 w-9 relative overflow-hidden"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      disabled={!mounted}
    >
      <motion.div
        initial={false}
        animate={{ rotate: isDark ? 180 : 0, scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="relative"
      >
        {isDark ? (
          <Moon className="h-5 w-5" />
        ) : (
          <Sun className="h-5 w-5" />
        )}
      </motion.div>
    </Button>
  );
}
