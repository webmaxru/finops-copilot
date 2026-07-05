import { useEffect } from 'react';
import { useStore } from '../state/store';

/** Light/dark theme switch. Applies the theme to <html data-theme> so the CSS
 * palette variables switch, and persists via the store (localStorage). */
export default function ThemeToggle() {
  const theme = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <button
      type="button"
      className="icon-btn"
      onClick={toggleTheme}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      aria-label="Toggle light/dark theme"
    >
      <span aria-hidden>{theme === 'dark' ? '☀' : '☾'}</span>
      <span className="btn-label">{theme === 'dark' ? 'Light' : 'Dark'}</span>
    </button>
  );
}
