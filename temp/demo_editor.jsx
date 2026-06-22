import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import usePagesStore from '../store/usePagesStore'
import useTasksStore from '../store/useTasksStore'
import Sidebar, { trackRecent } from '../components/Sidebar/Sidebar'
import PageHeader from '../components/Editor/PageHeader'
import BlockEditor from '../components/Editor/BlockEditor'
import StatusBar from '../components/Editor/StatusBar'
import TaskList from '../components/Tasks/TaskList'
import CommentThread from '../components/Comments/CommentThread'
import NotificationBell from '../components/Notifications/NotificationBell'
import FileUploadPanel from '../components/Editor/FileUploadPanel'
import CollaborationProvider from '../collaboration/CollaborationProvider'

const TABS = [
    { id: 'editor', label: '📝 Editor' },
    { id: 'tasks', label: '📋 Tasks' },
    { id: 'comments', label: '💬 Comments' },
    { id: 'files', label: '📎 Files' },
]

export default function EditorPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const currentPage = usePagesStore(s => s.currentPage)
    const loading = usePagesStore(s => s.loading)
    const openTabs = usePagesStore(s => s.openTabs)
    const openPage = usePagesStore(s => s.openPage)
    const hydrateOpenTab = usePagesStore(s => s.hydrateOpenTab)
    const closeOpenTab = usePagesStore(s => s.closeOpenTab)
    const createPage = usePagesStore(s => s.createPage)
    const fetchTasks = useTasksStore(s => s.fetchTasks)
    const clearTasks = useTasksStore(s => s.clearTasks)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [activeTab, setActiveTab] = useState('editor')

    const prevIdRef = useRef(null)
    useEffect(() => {
        if (id && id !== prevIdRef.current) {
            prevIdRef.current = id
            if (!hydrateOpenTab(id)) openPage(id)
            fetchTasks(id)
            setActiveTab('editor')
        }
        return () => { if (!id) clearTasks() }
    }, [id, hydrateOpenTab, openPage, fetchTasks, clearTasks])

    const prevPageIdRef = useRef(null)
    useEffect(() => {
        if (currentPage && currentPage.id !== prevPageIdRef.current) {
            prevPageIdRef.current = currentPage.id
            trackRecent(currentPage)
        }
    }, [currentPage?.id])

    const handleNewPage = async () => {
        const page = await createPage(null)
        navigate(`/page/${page.id}`)
    }

    const handleCloseTab = (pageId) => {
        const currentIndex = openTabs.findIndex(tab => tab.id === pageId)
        const nextTab = openTabs[currentIndex + 1] || openTabs[currentIndex - 1]
        const isCurrent = currentPage?.id === pageId

        closeOpenTab(pageId)

        if (!isCurrent) return
        if (nextTab) navigate(`/page/${nextTab.id}`)
        else navigate('/dashboard')
    }

    return (
        <div className="app-layout">
            <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(s => !s)} />

            {sidebarCollapsed && (
                <button
                    className="sidebar-toggle-btn"
                    style={{ position: 'fixed', top: 10, left: 10, zIndex: 100 }}
                    onClick={() => setSidebarCollapsed(false)}
                    title="Open sidebar"
                >▶</button>
            )}

            <div className="main-content">
                <div className="editor-header-shell">
                    {openTabs.length > 0 && (
                        <div className="page-tabs-strip">
                            {openTabs.map(tab => (
                                <button
                                    key={tab.id}
                                    className={`page-tab-btn ${currentPage?.id === tab.id ? 'active' : ''}`}
                                    onClick={() => navigate(`/page/${tab.id}`)}
                                    title={tab.title || 'Untitled'}
                                >
                                    <span className="page-tab-emoji">{tab.emoji || '📄'}</span>
                                    <span className="page-tab-title">{tab.title || 'Untitled'}</span>
                                    <span
                                        className="page-tab-close"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleCloseTab(tab.id)
                                        }}
                                        role="button"
                                        aria-label={`Close ${tab.title || 'Untitled'} tab`}
                                    >
                                        ×
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="editor-topbar">
                        {!sidebarCollapsed && (
                            <button className="sidebar-toggle-btn" onClick={() => setSidebarCollapsed(true)} title="Collapse sidebar">◀</button>
                        )}
                        <div className="topbar-breadcrumb">
                            {currentPage ? (
                                <>
                                    <span className="crumb-emoji">{currentPage.emoji}</span>
                                    <span className="crumb-title">{currentPage.title || 'Untitled'}</span>
                                </>
                            ) : (
                                <span>Select a page</span>
                            )}
                        </div>

                        {currentPage && (
                            <div className="editor-tabs">
                                {TABS.map(tab => (
                                    <button
                                        key={tab.id}
                                        className={`editor-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                                        onClick={() => setActiveTab(tab.id)}
                                    >{tab.label}</button>
                                ))}
                            </div>
                        )}

                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <NotificationBell />
                        </div>
                    </div>
                </div>

                <div className="editor-scroll">
                    {loading ? (
                        <div className="loading-overlay">
                            <div className="spinner" /> Loading...
                        </div>
                    ) : !currentPage ? (
                        <div className="empty-state">
                            <span className="empty-state-icon">📝</span>
                            <h2 className="empty-state-title">No page selected</h2>
                            <p className="empty-state-desc">Select a page from the sidebar, or create a new one.</p>
                            <button className="btn-create-page" onClick={handleNewPage}>+ New Page</button>
                        </div>
                    ) : (
                        <CollaborationProvider pageId={currentPage.id}>
                            {activeTab === 'editor' ? (
                                <div className="editor-wrapper">
                                    <PageHeader page={currentPage} />
                                    <BlockEditor page={currentPage} />
                                </div>
                            ) : activeTab === 'tasks' ? (
                                <div className="editor-wrapper">
                                    <TaskList page={currentPage} />
                                </div>
                            ) : activeTab === 'comments' ? (
                                <div className="editor-wrapper">
                                    <CommentThread pageId={currentPage.id} />
                                </div>
                            ) : (
                                <div className="editor-wrapper">
                                    <FileUploadPanel pageId={currentPage.id} />
                                </div>
                            )}
                        </CollaborationProvider>
                    )}
                </div>

                {currentPage && activeTab === 'editor' && <StatusBar page={currentPage} />}
            </div>
        </div>
    )
}
