'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'moonmoon-theme';

type ThemeMode = 'dark' | 'light';

function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* 本次主題仍可使用。 */ }
}

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>('dark');

  useEffect(() => {
    let storedTheme: string | null = null;
    try { storedTheme = localStorage.getItem(STORAGE_KEY); } catch { /* 儲存受限時沿用預設主題。 */ }
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
        className="min-h-11 min-w-11 bg-moon-black border border-moon-border p-3 sm:p-4 opacity-60"
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
      className="min-h-11 min-w-11 bg-moon-black border border-moon-border p-3 sm:p-4 hover:bg-moon-border transition-all group"
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
