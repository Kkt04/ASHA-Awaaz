import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('asha_theme');
    if (saved) return saved === 'dark';
    return false; // Light theme by default for first-time users as specified
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('asha_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('asha_theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`touch-target p-2 rounded-xl transition-all duration-200 flex items-center justify-center border ${
        isDark
          ? 'bg-dark-card border-dark-border text-amber-400 hover:bg-dark-surface hover:text-amber-300'
          : 'bg-surface-warm border-gray-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900'
      } ${className}`}
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-amber-400 animate-in fade-in" />
      ) : (
        <Moon className="w-5 h-5 text-emerald-800 animate-in fade-in" />
      )}
    </button>
  );
};
