import useThemeStore from '../../store/useThemeStore'
import './ThemeToggle.css'

/**
 * ThemeToggle — a pill toggle button that switches between light and dark.
 * Works on any page. Pass variant="ghost" for the nav bar style.
 */
export default function ThemeToggle({ variant = 'default' }) {
    const { theme, toggle } = useThemeStore()
    const isDark = theme === 'dark'

    return (
        <button
            className={`theme-toggle-btn theme-toggle-${variant}`}
            onClick={toggle}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            <span className="theme-toggle-track">
                <span className={`theme-toggle-thumb ${isDark ? 'dark' : 'light'}`} />
            </span>
            <span className="theme-toggle-label">
                {isDark ? '🌙' : '☀️'}
            </span>
        </button>
    )
}
