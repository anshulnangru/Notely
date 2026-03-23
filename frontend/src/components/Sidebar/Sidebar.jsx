import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import usePagesStore from '../../store/usePagesStore'
import useAuthStore from '../../store/useAuthStore'

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
                {!loading && trash.length === 0 && (
                    <div className="panel-empty">Trash is empty</div>
                )}
                {trash.map(page => (
                    <div key={page.id} className="trash-item">
                        <span className="trash-item-emoji">{page.emoji || '📄'}</span>
                        <span className="trash-item-title">{page.title || 'Untitled'}</span>
                        <div className="trash-item-actions">
                            <button className="trash-action-btn restore" title="Restore" onClick={() => restorePage(page.id)}>↩ Restore</button>
                            <button className="trash-action-btn delete" title="Delete permanently" onClick={() => { if (confirm('Permanently delete this page? This cannot be undone.')) permanentDeletePage(page.id) }}>✕</button>
                        </div>
                    </div>
                ))}
                {!loading && trash.length > 0 && (
                    <div className="trash-clear-wrap">
                        <button className="trash-clear-btn" onClick={() => { if (confirm('Permanently delete all trashed pages?')) trash.forEach(p => permanentDeletePage(p.id)) }}>
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

    const handleLogout = () => {
        logout()          // clears Zustand state + localStorage + resets pages store
        navigate('/login')
    }

    return (
        <div className="sidebar-panel fade-in">
            <div className="panel-header">
                <span className="panel-title">⚙️ Settings</span>
                <button className="panel-close-btn" onClick={onClose}>✕</button>
            </div>
            <div className="panel-body">
                {/* Profile */}
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

                {/* Theme */}
                <div className="settings-section">
                    <div className="settings-label">Appearance</div>
                    <div className="settings-theme-row">
                        {['dark', 'light'].map(t => (
                            <button
                                key={t}
                                className={`settings-theme-btn ${theme === t ? 'active' : ''}`}
                                onClick={() => toggleTheme(t)}
                            >
                                {t === 'dark' ? '🌙 Dark' : '☀️ Light'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Workspace */}
                <div className="settings-section">
                    <div className="settings-label">Workspace</div>
                    <div className="settings-info-row">
                        <span className="settings-info-key">Name</span>
                        <span className="settings-info-val">My Workspace</span>
                    </div>
                </div>

                {/* Danger */}
                <div className="settings-section">
                    <button className="settings-logout-btn" onClick={handleLogout}>
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
    const [panel, setPanel] = useState(null)  // 'trash' | 'settings' | null

    const favorites = flattenTree(tree).filter(p => p.is_favorite)
    const isSearching = search.trim().length > 0
    const searchResults = isSearching
        ? flattenTree(tree).filter(p => p.title?.toLowerCase().includes(search.toLowerCase()))
        : []

    const openPanel = (name) => setPanel(p => p === name ? null : name)

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
                    placeholder="🔍 Search pages..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {/* Page nav */}
            <nav className="sidebar-nav">
                {isSearching ? (
                    searchResults.length === 0
                        ? <div className="sidebar-empty">No pages match "{search}"</div>
                        : searchResults.map(p => (
                            <div key={p.id} className="page-item-row search-result"
                                style={{ paddingLeft: `${8 + p.depth * 16}px` }}
                                onClick={() => { navigate(`/page/${p.id}`); setSearch('') }}>
                                <span className="page-emoji">{p.emoji || '📄'}</span>
                                <span className="page-title-text">{p.title || 'Untitled'}</span>
                            </div>
                        ))
                ) : (
                    <>
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

                        {tree.length === 0 && <div className="sidebar-empty">No pages yet</div>}
                        {tree.map(page => <PageTreeItem key={page.id} page={page} depth={0} />)}

                        <button className="new-page-btn" onClick={async () => { const p = await createPage(null); navigate(`/page/${p.id}`) }}>
                            <span>+</span> New page
                        </button>
                    </>
                )}
            </nav>

            {/* ── Trash / Settings panels ── */}
            {panel === 'trash' && <TrashPanel onClose={() => setPanel(null)} />}
            {panel === 'settings' && <SettingsPanel onClose={() => setPanel(null)} />}

            {/* ── Bottom nav bar ── */}
            <div className="sidebar-bottom-nav">
                <button
                    className={`bottom-nav-btn ${panel === 'settings' ? 'active' : ''}`}
                    onClick={() => openPanel('settings')}
                    title="Settings"
                >
                    <span className="bottom-nav-icon">⚙️</span>
                    <span className="bottom-nav-label">Settings</span>
                </button>
                <button
                    className={`bottom-nav-btn ${panel === 'trash' ? 'active' : ''}`}
                    onClick={() => openPanel('trash')}
                    title="Trash"
                >
                    <span className="bottom-nav-icon">🗑</span>
                    <span className="bottom-nav-label">Trash</span>
                </button>
            </div>

            {/* User footer */}
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
