import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import usePagesStore from '../../store/usePagesStore'
import useAuthStore from '../../store/useAuthStore'
import useThemeStore from '../../store/useThemeStore'
import ThemeToggle from '../ThemeToggle/ThemeToggle'
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

export function removeFromRecent(pageId) {
    const list = getRecent().filter(p => p.id !== pageId)
    localStorage.setItem(RECENT_KEY, JSON.stringify(list))
}

// ── Resize constants ──────────────────────────────────
const SIDEBAR_MIN = 180
const SIDEBAR_MAX = 480
const SIDEBAR_DEFAULT = 240
const SIDEBAR_WIDTH_KEY = 'sidebarWidth'

function getSavedWidth() {
    try {
        const w = parseInt(localStorage.getItem(SIDEBAR_WIDTH_KEY), 10)
        return (w >= SIDEBAR_MIN && w <= SIDEBAR_MAX) ? w : SIDEBAR_DEFAULT
    } catch { return SIDEBAR_DEFAULT }
}

// ── SVG Icons ─────────────────────────────────────────
const Icons = {
    search: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <circle cx="7" cy="7" r="5" /><path d="M11 11l3 3" />
        </svg>
    ),
    home: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 8l6-5.5L14 8" /><path d="M3.5 7v5.5a1 1 0 001 1h2V10.5h3v3h2a1 1 0 001-1V7" />
        </svg>
    ),
    meetings: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="5.5" cy="5" r="2" /><circle cx="10.5" cy="5" r="2" />
            <path d="M1 13c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" /><path d="M10 9c2 0 4.5 1.5 4.5 4" />
        </svg>
    ),
    ai: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 1v2.5M8 12.5V15M15 8h-2.5M3.5 8H1M12.5 3.5l-1.8 1.8M5.3 9.2l-1.8 1.8M12.5 12.5l-1.8-1.8M5.3 6.8L3.5 5" />
            <circle cx="8" cy="8" r="2" />
        </svg>
    ),
    inbox: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 10l3-3h6l3 3" /><rect x="2" y="10" width="12" height="4" rx="1" /><path d="M3 4h10v6" />
        </svg>
    ),
    library: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 2v12M7 2v12M11 2l2 12" />
        </svg>
    ),
    projects: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="8" r="6" /><path d="M8 5v3l2.5 1.5" />
        </svg>
    ),
    newPage: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="2" width="10" height="12" rx="1.5" /><path d="M6 8h4M8 6v4" />
        </svg>
    ),
    settings: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="8" r="2.5" />
            <path d="M8 1.5v1.3M8 13.2v1.3M2.6 4.3l1.1.7M12.3 11l1.1.7M1.5 8h1.3M13.2 8h1.3M2.6 11.7l1.1-.7M12.3 5l1.1-.7" />
        </svg>
    ),
    trash: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.5 4h11M5.5 4V2.5h5V4M3.5 4l.5 9.5a1 1 0 001 .5h6a1 1 0 001-.5l.5-9.5" />
            <path d="M6.5 7v4M9.5 7v4" />
        </svg>
    ),
    plus: (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M7 2v10M2 7h10" />
        </svg>
    ),
    collaborate: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="5" r="3" /><path d="M2 14c0-3 2.7-5 6-5s6 2 6 5" /><path d="M8 2v10M2 7h12" />
        </svg>
    ),
    edit: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 2.5l2.5 2.5L5.5 13H3v-2.5L11 2.5z" />
        </svg>
    ),
    chevronDown: (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3.5l3 3 3-3" />
        </svg>
    ),
    agent: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="2" width="10" height="8" rx="2" /><circle cx="6" cy="6" r="1" fill="currentColor" /><circle cx="10" cy="6" r="1" fill="currentColor" /><path d="M5 12h6M8 10v2" />
        </svg>
    ),
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

function filterTree(nodes, predicate) {
    const result = []

    for (const node of nodes) {
        const filteredChildren = filterTree(node.children || [], predicate)
        if (predicate(node) || filteredChildren.length > 0) {
            result.push({
                ...node,
                children: filteredChildren,
            })
        }
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
    const { theme, setTheme } = useThemeStore()

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
                            <button key={t} className={`settings-theme-btn ${theme === t ? 'active' : ''}`} onClick={() => setTheme(t)}>
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

// ── Sidebar Nav Item ─────────────────────────────────
function NavItem({ icon, label, onClick, active, badge }) {
    return (
        <button className={`sidebar-nav-item ${active ? 'active' : ''}`} onClick={onClick}>
            <span className="sidebar-nav-icon">{icon}</span>
            <span className="sidebar-nav-label">{label}</span>
            {badge && <span className="sidebar-nav-badge">{badge}</span>}
        </button>
    )
}

// ── Main Sidebar ─────────────────────────────────────
export default function Sidebar({ collapsed, onToggle }) {
    const navigate = useNavigate()
    const location = useLocation()
    const { tree, createPage, deletePage: storeDeletePage } = usePagesStore()
    const { user } = useAuthStore()
    const [search, setSearch] = useState('')
    const [searchResults, setSearchResults] = useState({ pages: [], tasks: [] })
    const [searching, setSearching] = useState(false)
    const [panel, setPanel] = useState(null)  // 'trash' | 'settings' | null
    const [recent, setRecent] = useState(getRecent())
    const [recentsOpen, setRecentsOpen] = useState(true)
    const [privateOpen, setPrivateOpen] = useState(true)
    const [sharedOpen, setSharedOpen] = useState(true)

    // ── Resize state ──
    const [sidebarWidth, setSidebarWidth] = useState(getSavedWidth)
    const [isDraggingSidebar, setIsDraggingSidebar] = useState(false)
    const isResizing = useRef(false)
    const sidebarRef = useRef(null)

    const updateSidebarWidth = useCallback((clientX) => {
        const sidebar = sidebarRef.current
        if (!sidebar) return
        const rect = sidebar.getBoundingClientRect()
        let newWidth = clientX - rect.left
        newWidth = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, newWidth))
        setSidebarWidth(newWidth)
    }, [])

    const favorites = flattenTree(tree).filter(p => p.is_favorite)
    const isSearching = search.trim().length > 0
    const userName = user?.name || 'User'
    const privatePages = filterTree(tree, page => page.owner_id === user?.id)
    const sharedPages = filterTree(tree, page => page.owner_id !== user?.id)

    // Build a set of all active page IDs to filter recents
    const allPageIds = new Set(flattenTree(tree).map(p => p.id))
    // Only show recents for pages that still exist in the tree
    const filteredRecent = recent.filter(p => allPageIds.has(p.id))

    // Refresh recently viewed on focus
    useEffect(() => {
        const refresh = () => setRecent(getRecent())
        window.addEventListener('focus', refresh)
        const interval = setInterval(refresh, 2000)
        return () => { window.removeEventListener('focus', refresh); clearInterval(interval) }
    }, [])

    // ── Resize handlers ──
    const stopResizing = useCallback(() => {
        isResizing.current = false
        setIsDraggingSidebar(false)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        setSidebarWidth(w => {
            localStorage.setItem(SIDEBAR_WIDTH_KEY, String(w))
            return w
        })
    }, [])

    const handleResizeStart = useCallback((e) => {
        e.preventDefault()
        isResizing.current = true
        setIsDraggingSidebar(true)
        document.body.style.cursor = 'col-resize'
        document.body.style.userSelect = 'none'
        updateSidebarWidth(e.clientX)

        const handleResizeMove = (e) => {
            if (!isResizing.current) return
            updateSidebarWidth(e.clientX)
        }

        const handleResizeEnd = () => {
            stopResizing()
            document.removeEventListener('mousemove', handleResizeMove)
            document.removeEventListener('mouseup', handleResizeEnd)
        }

        document.addEventListener('mousemove', handleResizeMove)
        document.addEventListener('mouseup', handleResizeEnd)
    }, [stopResizing, updateSidebarWidth])

    const handleResizeTouchStart = useCallback((e) => {
        const touch = e.touches?.[0]
        if (!touch) return
        isResizing.current = true
        setIsDraggingSidebar(true)
        document.body.style.userSelect = 'none'
        updateSidebarWidth(touch.clientX)

        const handleTouchMove = (event) => {
            const nextTouch = event.touches?.[0]
            if (!isResizing.current || !nextTouch) return
            updateSidebarWidth(nextTouch.clientX)
        }

        const handleTouchEnd = () => {
            stopResizing()
            document.removeEventListener('touchmove', handleTouchMove)
            document.removeEventListener('touchend', handleTouchEnd)
        }

        document.addEventListener('touchmove', handleTouchMove, { passive: true })
        document.addEventListener('touchend', handleTouchEnd)
    }, [stopResizing, updateSidebarWidth])

    useEffect(() => () => stopResizing(), [stopResizing])

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
        <aside
            ref={sidebarRef}
            className={`sidebar ${collapsed ? 'collapsed' : ''} ${isDraggingSidebar ? 'is-resizing' : ''}`}
            style={collapsed ? undefined : { width: sidebarWidth, minWidth: sidebarWidth }}
        >
            {/* ── Header: User name + edit icon ── */}
            <div className="sidebar-header">
                <div className="sidebar-header-avatar">{userName[0].toUpperCase()}</div>
                <span className="workspace-name">{userName}'s Notely</span>
                <div className="sidebar-actions">
                    <button className="icon-btn" title="Edit" onClick={() => openPanel('settings')}>
                        {Icons.edit}
                    </button>
                    <button className="icon-btn" title={collapsed ? 'Expand' : 'Collapse'} onClick={onToggle}>
                        {Icons.chevronDown}
                    </button>
                </div>
            </div>

            {/* ── Search ── */}
            <div className="sidebar-search-wrap">
                <div className="sidebar-search-inner">
                    <span className="sidebar-search-icon">{Icons.search}</span>
                    <input
                        className="sidebar-search"
                        type="text"
                        placeholder="Search"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* ── Scrollable nav area ── */}
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
                        {/* ── Quick nav items ── */}
                        <div className="sidebar-quick-nav">
                            <NavItem icon={Icons.home} label="Home"
                                active={location.pathname === '/dashboard'}
                                onClick={() => navigate('/dashboard')} />
                            <NavItem icon={Icons.meetings} label="Meetings"
                                active={location.pathname === '/calendar'}
                                onClick={() => navigate('/calendar')} />
                            <NavItem icon={Icons.ai} label="Notely AI"
                                active={false}
                                onClick={() => {}} />
                            <NavItem icon={Icons.inbox} label="Inbox"
                                active={location.pathname === '/inbox'}
                                onClick={() => navigate('/inbox')} />
                            <NavItem icon={Icons.library} label="Library"
                                active={false}
                                onClick={() => {}} />
                        </div>

                        {/* ── Recents ── */}
                        {filteredRecent.length > 0 && (
                            <div className="sidebar-section">
                                <button className="sidebar-section-header" onClick={() => setRecentsOpen(o => !o)}>
                                    <span className="sidebar-section-label">Recents</span>
                                    <span className={`sidebar-section-chevron ${recentsOpen ? 'open' : ''}`}>{Icons.chevronDown}</span>
                                </button>
                                {recentsOpen && (
                                    <div className="sidebar-section-items">
                                        {filteredRecent.slice(0, 5).map(p => (
                                            <div key={p.id} className="page-item-row" style={{ paddingLeft: 12 }}
                                                onClick={() => navigate(`/page/${p.id}`)}>
                                                <span className="page-emoji">{p.emoji || '📄'}</span>
                                                <span className="page-title-text">{p.title || 'Untitled'}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Agents ── */}
                        <div className="sidebar-section">
                            <div className="sidebar-section-header-static">
                                <span className="sidebar-section-label">Agents</span>
                                <span className="sidebar-beta-badge">Beta</span>
                            </div>
                            <div className="sidebar-section-items">
                                <button className="sidebar-add-item" onClick={() => {}}>
                                    <span className="sidebar-add-icon">{Icons.plus}</span>
                                    <span>New agent</span>
                                </button>
                            </div>
                        </div>

                        {/* ── Favorites ── */}
                        {favorites.length > 0 && (
                            <div className="sidebar-section">
                                <div className="sidebar-section-header-static">
                                    <span className="sidebar-section-label">Favorites</span>
                                </div>
                                <div className="sidebar-section-items">
                                    {favorites.map(p => (
                                        <div key={p.id} className="page-item-row" style={{ paddingLeft: 12 }}
                                            onClick={() => navigate(`/page/${p.id}`)}>
                                            <span className="page-emoji">{p.emoji || '📄'}</span>
                                            <span className="page-title-text">{p.title || 'Untitled'}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── Private ── */}
                        <div className="sidebar-section">
                            <button className="sidebar-section-header" onClick={() => setPrivateOpen(o => !o)}>
                                <span className="sidebar-section-label">Private</span>
                                <span className={`sidebar-section-chevron ${privateOpen ? 'open' : ''}`}>{Icons.chevronDown}</span>
                            </button>
                            {privateOpen && (
                                <div className="sidebar-section-items">
                                    <NavItem icon={Icons.projects} label="Projects" onClick={() => navigate('/dashboard')} />

                                    <button className="sidebar-add-item" onClick={async () => {
                                        const p = await createPage(null)
                                        navigate(`/page/${p.id}`)
                                    }}>
                                        <span className="sidebar-add-icon">{Icons.newPage}</span>
                                        <span>New page</span>
                                    </button>

                                    {privatePages.length === 0 && <div className="sidebar-empty">No private pages yet</div>}
                                    {privatePages.map(page => <PageTreeItem key={page.id} page={page} depth={0} />)}
                                </div>
                            )}
                        </div>

                        {/* ── Shared ── */}
                        <div className="sidebar-section">
                            <button className="sidebar-section-header" onClick={() => setSharedOpen(o => !o)}>
                                <span className="sidebar-section-label">Shared</span>
                                <span className={`sidebar-section-chevron ${sharedOpen ? 'open' : ''}`}>{Icons.chevronDown}</span>
                            </button>
                            {sharedOpen && (
                                <div className="sidebar-section-items">
                                    {sharedPages.length === 0 && <div className="sidebar-empty">Shared pages will appear here</div>}
                                    {sharedPages.map(page => <PageTreeItem key={page.id} page={page} depth={0} />)}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </nav>

            {/* ── Panels (Trash / Settings) ── */}
            {panel === 'trash' && <TrashPanel onClose={() => setPanel(null)} />}
            {panel === 'settings' && <SettingsPanel onClose={() => setPanel(null)} />}

            {/* ── Bottom items (vertical list, not horizontal) ── */}
            <div className="sidebar-bottom-section">
                <NavItem icon={Icons.settings} label="Settings"
                    active={panel === 'settings'}
                    onClick={() => openPanel('settings')} />
                <NavItem icon={Icons.trash} label="Trash"
                    active={panel === 'trash'}
                    onClick={() => openPanel('trash')} />
            </div>

            {/* ── Resize handle ── */}
            {!collapsed && (
                <div
                    className="sidebar-resize-handle"
                    onMouseDown={handleResizeStart}
                    onTouchStart={handleResizeTouchStart}
                    role="separator"
                    aria-orientation="vertical"
                    aria-label="Resize sidebar"
                />
            )}
        </aside>
    )
}
