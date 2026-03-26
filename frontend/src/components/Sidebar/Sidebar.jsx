import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import usePagesStore from '../../store/usePagesStore'
import useAuthStore from '../../store/useAuthStore'
import client from '../../api/client'

// ── Recently viewed helpers ────────────────────────────
const RECENT_KEY = 'recentPages'
const MAX_RECENT = 10

function getRecent() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') } catch { return [] }
}

export function trackRecent(page) {
    const list = getRecent().filter(p => p.id !== page.id)
    list.unshift({ id: page.id, title: page.title, emoji: page.emoji })
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)))
}

// ── Page tree item ───────────────────────────────────
function PageTreeItem({ page, depth = 0 }) {
    const [open, setOpen] = useState(false)
    const { id: activeId } = useParams()
    const navigate = useNavigate()
    const { createPage, deletePage, toggleFavorite } = usePagesStore()
    const hasChildren = page.children && page.children.length > 0
    const isActive = activeId === page.id

    return (
        <div className="page-tree-item">
            <div
                className={`page-item-row ${isActive ? 'active' : ''}`}
                style={{ paddingLeft: `${8 + depth * 16}px` }}
                onClick={() => navigate(`/page/${page.id}`)}
            >
                <button
                    className={`page-toggle-btn ${open ? 'open' : ''}`}
                    onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
                    style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
                >▶</button>
                <span className="page-emoji">{page.emoji || '📄'}</span>
                <span className="page-title-text">{page.title || 'Untitled'}</span>
                <div className="page-item-actions">
                    <button className="page-action-btn" title={page.is_favorite ? 'Unfavorite' : 'Favorite'}
                        onClick={async e => { e.stopPropagation(); await toggleFavorite(page.id) }}>
                        {page.is_favorite ? '★' : '☆'}
                    </button>
                    <button className="page-action-btn" title="Add sub-page"
                        onClick={async e => { e.stopPropagation(); const p = await createPage(page.id); setOpen(true); navigate(`/page/${p.id}`) }}>
                        +
                    </button>
                    <button className="page-action-btn danger" title="Move to Trash"
                        onClick={async e => { e.stopPropagation(); await deletePage(page.id) }}>
                        🗑
                    </button>
                </div>
            </div>
            {open && hasChildren && (
                <div className="page-children">
                    {page.children.map(child => <PageTreeItem key={child.id} page={child} depth={depth + 1} />)}
                </div>
            )}
        </div>
    )
}

function flattenTree(nodes, depth = 0) {
    const result = []
    for (const n of nodes) {
        result.push({ ...n, depth })
        result.push(...flattenTree(n.children || [], depth + 1))
    }
    return result
}

// ── Trash Panel ──────────────────────────────────────
function TrashPanel({ onClose }) {
    const { trash = [], fetchTrash, restorePage, permanentDeletePage } = usePagesStore()
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchTrash().finally(() => setLoading(false))
    }, [])

    return (
        <div className="sidebar-panel fade-in">
            <div className="panel-header">
                <span className="panel-title">🗑 Trash</span>
                <button className="panel-close-btn" onClick={onClose}>✕</button>
            </div>
            <div className="panel-body">
                {loading && <div className="panel-empty">Loading…</div>}
                {!loading && trash.length === 0 && <div className="panel-empty">Trash is empty</div>}
                {trash.map(page => (
                    <div key={page.id} className="trash-item">
                        <span className="trash-item-emoji">{page.emoji || '📄'}</span>
                        <span className="trash-item-title">{page.title || 'Untitled'}</span>
                        <div className="trash-item-actions">
                            <button className="trash-action-btn restore" onClick={() => restorePage(page.id)}>↩ Restore</button>
                            <button className="trash-action-btn delete" onClick={() => { if (confirm('Permanently delete?')) permanentDeletePage(page.id) }}>✕</button>
                        </div>
                    </div>
                ))}
                {!loading && trash.length > 0 && (
                    <div className="trash-clear-wrap">
                        <button className="trash-clear-btn" onClick={() => { if (confirm('Empty trash?')) trash.forEach(p => permanentDeletePage(p.id)) }}>
                            Empty Trash
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

// ── Settings Panel ───────────────────────────────────
function SettingsPanel({ onClose }) {
    const navigate = useNavigate()
    const { user, logout } = useAuthStore()
    const [theme, setTheme] = useState(document.documentElement.getAttribute('data-theme') || 'dark')

    const toggleTheme = (t) => {
        setTheme(t)
        document.documentElement.setAttribute('data-theme', t)
        localStorage.setItem('theme', t)
    }

    return (
        <div className="sidebar-panel fade-in">
            <div className="panel-header">
                <span className="panel-title">⚙️ Settings</span>
                <button className="panel-close-btn" onClick={onClose}>✕</button>
            </div>
            <div className="panel-body">
                <div className="settings-section">
                    <div className="settings-label">Account</div>
                    <div className="settings-profile-row">
                        <div className="settings-avatar">{(user?.name || user?.email || 'U')[0].toUpperCase()}</div>
                        <div>
                            <div className="settings-name">{user?.name || 'User'}</div>
                            <div className="settings-email">{user?.email}</div>
                        </div>
                    </div>
                </div>
                <div className="settings-section">
                    <div className="settings-label">Appearance</div>
                    <div className="settings-theme-row">
                        {['dark', 'light'].map(t => (
                            <button key={t} className={`settings-theme-btn ${theme === t ? 'active' : ''}`} onClick={() => toggleTheme(t)}>
                                {t === 'dark' ? '🌙 Dark' : '☀️ Light'}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="settings-section">
                    <button className="settings-logout-btn" onClick={() => { logout(); navigate('/login') }}>
                        ↩ Sign out
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Main Sidebar ─────────────────────────────────────
export default function Sidebar({ collapsed, onToggle }) {
    const navigate = useNavigate()
    const { tree, createPage } = usePagesStore()
    const { user } = useAuthStore()
    const [search, setSearch] = useState('')
    const [searchResults, setSearchResults] = useState({ pages: [], tasks: [] })
    const [searching, setSearching] = useState(false)
    const [panel, setPanel] = useState(null)  // 'trash' | 'settings' | null
    const [recent, setRecent] = useState(getRecent())

    const favorites = flattenTree(tree).filter(p => p.is_favorite)
    const isSearching = search.trim().length > 0

    // Refresh recently viewed on focus
    useEffect(() => {
        const refresh = () => setRecent(getRecent())
        window.addEventListener('focus', refresh)
        const interval = setInterval(refresh, 2000)
        return () => { window.removeEventListener('focus', refresh); clearInterval(interval) }
    }, [])

    // Global search — debounced
    useEffect(() => {
        if (!isSearching) { setSearchResults({ pages: [], tasks: [] }); return }
        const timer = setTimeout(async () => {
            setSearching(true)
            try {
                const res = await client.get('/tags/search', { params: { q: search } })
                setSearchResults(res.data)
            } catch { /* ignore */ } finally { setSearching(false) }
        }, 300)
        return () => clearTimeout(timer)
    }, [search])

    const openPanel = (name) => setPanel(p => p === name ? null : name)
    const allResults = [...(searchResults.pages || []), ...(searchResults.tasks || [])]

    return (
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
            {/* Header */}
            <div className="sidebar-header">
                <span style={{ fontSize: 20 }}>📝</span>
                <span className="workspace-name">My Workspace</span>
                <div className="sidebar-actions">
                    <button className="icon-btn" title="Collapse sidebar" onClick={onToggle}>◀</button>
                </div>
            </div>

            {/* Search */}
            <div className="sidebar-search-wrap">
                <input
                    className="sidebar-search"
                    type="text"
                    placeholder="🔍 Search pages & tasks..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {/* Page nav */}
            <nav className="sidebar-nav">
                {isSearching ? (
                    searching
                        ? <div className="sidebar-empty">Searching…</div>
                        : allResults.length === 0
                            ? <div className="sidebar-empty">No results for "{search}"</div>
                            : allResults.map(r => (
                                <div key={r.id} className="page-item-row search-result"
                                    style={{ paddingLeft: 12 }}
                                    onClick={() => {
                                        setSearch('')
                                        if (r.type === 'page') navigate(`/page/${r.id}`)
                                        else if (r.page_id) navigate(`/page/${r.page_id}`)
                                    }}>
                                    <span className="page-emoji">{r.emoji || (r.type === 'task' ? '📋' : '📄')}</span>
                                    <span className="page-title-text">{r.title || 'Untitled'}</span>
                                    <span style={{ fontSize: 10, color: 'var(--text-tertiary)', marginLeft: 4 }}>
                                        {r.type === 'task' ? 'task' : 'page'}
                                    </span>
                                </div>
                            ))
                ) : (
                    <>
                        {/* Favorites */}
                        {favorites.length > 0 && (
                            <div className="sidebar-section">
                                <div className="sidebar-section-label">⭐ Favorites</div>
                                {favorites.map(p => (
                                    <div key={p.id} className="page-item-row" style={{ paddingLeft: 12 }}
                                        onClick={() => navigate(`/page/${p.id}`)}>
                                        <span className="page-emoji">{p.emoji || '📄'}</span>
                                        <span className="page-title-text">{p.title || 'Untitled'}</span>
                                    </div>
                                ))}
                                <div className="sidebar-section-divider" />
                            </div>
                        )}

                        {/* Recently viewed */}
                        {recent.length > 0 && (
                            <div className="sidebar-section">
                                <div className="sidebar-section-label">🕒 Recently Viewed</div>
                                {recent.slice(0, 5).map(p => (
                                    <div key={p.id} className="page-item-row" style={{ paddingLeft: 12 }}
                                        onClick={() => navigate(`/page/${p.id}`)}>
                                        <span className="page-emoji">{p.emoji || '📄'}</span>
                                        <span className="page-title-text">{p.title || 'Untitled'}</span>
                                    </div>
                                ))}
                                <div className="sidebar-section-divider" />
                            </div>
                        )}

                        {tree.length === 0 && <div className="sidebar-empty">No pages yet</div>}
                        {tree.map(page => <PageTreeItem key={page.id} page={page} depth={0} />)}

                        <button className="new-page-btn" onClick={async () => { const p = await createPage(null); navigate(`/page/${p.id}`) }}>
                            <span>+</span> New page
                        </button>
                    </>
                )}
            </nav>

            {panel === 'trash' && <TrashPanel onClose={() => setPanel(null)} />}
            {panel === 'settings' && <SettingsPanel onClose={() => setPanel(null)} />}

            <div className="sidebar-bottom-nav"><button className="bottom-nav-btn" onClick={() => navigate("/calendar")} title="Calendar"><span className="bottom-nav-icon">📅</span><span className="bottom-nav-label">Calendar</span></button><button className="bottom-nav-btn" onClick={() => navigate("/dashboard")} title="Dashboard"><span className="bottom-nav-icon">🏠</span><span className="bottom-nav-label">Home</span></button>
                <button className={`bottom-nav-btn ${panel === 'settings' ? 'active' : ''}`} onClick={() => openPanel('settings')} title="Settings">
                    <span className="bottom-nav-icon">⚙️</span>
                    <span className="bottom-nav-label">Settings</span>
                </button>
                <button className={`bottom-nav-btn ${panel === 'trash' ? 'active' : ''}`} onClick={() => openPanel('trash')} title="Trash">
                    <span className="bottom-nav-icon">🗑</span>
                    <span className="bottom-nav-label">Trash</span>
                </button>
            </div>

            <div className="sidebar-footer" title={user?.email}>
                <div className="user-avatar">{(user?.name || user?.email || 'U')[0].toUpperCase()}</div>
                <div className="user-info">
                    <div className="user-name">{user?.name || 'User'}</div>
                    <div className="user-email">{user?.email}</div>
                </div>
            </div>
        </aside>
    )
}
