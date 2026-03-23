import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import usePagesStore from '../store/usePagesStore'
import Sidebar from '../components/Sidebar/Sidebar'
import PageHeader from '../components/Editor/PageHeader'
import BlockEditor from '../components/Editor/BlockEditor'
import StatusBar from '../components/Editor/StatusBar'

export default function EditorPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { currentPage, loading, openPage, createPage } = usePagesStore()
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

    useEffect(() => {
        if (id) openPage(id)
    }, [id])

    const handleNewPage = async () => {
        const page = await createPage(null)
        navigate(`/page/${page.id}`)
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
                {/* Topbar */}
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
                </div>

                {/* Editor area */}
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
                        <div className="editor-wrapper">
                            <PageHeader page={currentPage} />
                            <BlockEditor page={currentPage} />
                        </div>
                    )}
                </div>

                {/* Status bar */}
                {currentPage && <StatusBar page={currentPage} />}
            </div>
        </div>
    )
}
