/**
 * useThemeStore — single source of truth for light/dark mode.
 * Reads from localStorage, writes to documentElement data-theme.
 * Import and call useThemeStore() from any component.
 */
import { create } from 'zustand'

const STORAGE_KEY = 'notely-theme'

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(STORAGE_KEY, theme)
}

// Read saved preference, fallback to OS preference
function detectTheme() {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'dark' || saved === 'light') return saved
    // OS-level preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const initialTheme = detectTheme()
applyTheme(initialTheme)

const useThemeStore = create((set) => ({
    theme: initialTheme,
    toggle: () => set((s) => {
        const next = s.theme === 'dark' ? 'light' : 'dark'
        applyTheme(next)
        return { theme: next }
    }),
    setTheme: (theme) => set(() => {
        applyTheme(theme)
        return { theme }
    }),
}))

export default useThemeStore
