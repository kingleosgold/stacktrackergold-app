import { useState, useEffect, useCallback } from 'react';

export type Theme = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'stacktracker_theme';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
}

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'system';
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

  const updateResolvedTheme = useCallback((themeValue: Theme) => {
    const resolved = themeValue === 'system' ? getSystemTheme() : themeValue;
    setResolvedTheme(resolved);

    // Update document class for Tailwind dark mode
    if (resolved === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
    updateResolvedTheme(newTheme);
  }, [updateResolvedTheme]);

  useEffect(() => {
    updateResolvedTheme(theme);

    // Listen for system theme changes
    if (theme === 'system' && typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => updateResolvedTheme('system');
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [theme, updateResolvedTheme]);

  return { theme, setTheme, resolvedTheme };
}
