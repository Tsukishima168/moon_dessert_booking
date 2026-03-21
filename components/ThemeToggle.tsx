'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'moonmoon-theme';

type ThemeMode = 'dark' | 'light';

function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  localStorage.setItem(STORAGE_KEY, theme);
}

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>('dark');

  useEffect(() => {
    const storedTheme = localStorage.getItem(STORAGE_KEY);
    const nextTheme = storedTheme === 'light' ? 'light' : 'dark';
    setTheme(nextTheme);
    applyTheme(nextTheme);
    setMounted(true);
  }, []);

  const handleToggle = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  if (!mounted) {
    return (
      <button
        type="button"
        disabled
        className="bg-moon-black border border-moon-border p-3 sm:p-4 opacity-60"
        aria-label="主題切換"
      >
        <Sun size={18} className="text-moon-text sm:h-5 sm:w-5" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="bg-moon-black border border-moon-border p-3 sm:p-4 hover:bg-moon-border transition-all group"
      aria-label={theme === 'dark' ? '切換為淺色模式' : '切換為深色模式'}
      title={theme === 'dark' ? '切換為淺色模式' : '切換為深色模式'}
    >
      {theme === 'dark' ? (
        <Sun size={18} className="text-moon-text sm:h-5 sm:w-5 group-hover:text-moon-accent transition-colors" />
      ) : (
        <Moon size={18} className="text-moon-text sm:h-5 sm:w-5 group-hover:text-moon-accent transition-colors" />
      )}
    </button>
  );
}
