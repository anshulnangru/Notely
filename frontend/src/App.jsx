import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import useAuthStore from './store/useAuthStore'
import usePagesStore from './store/usePagesStore'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import EditorPage from './pages/EditorPage'
import DashboardPage from './pages/DashboardPage'
import CalendarPage from './pages/CalendarPage'

function ProtectedRoute({ children }) {
    const { token } = useAuthStore()
    if (!token) return <Navigate to="/login" replace />
    return children
}

function HomeRedirect() {
    const tree = usePagesStore(s => s.tree)
    const fetchTree = usePagesStore(s => s.fetchTree)
    const createPage = usePagesStore(s => s.createPage)
    const navigate = useNavigate()
    const [error, setError] = useState(null)

    useEffect(() => {
        const init = async () => {
            try {
                const pages = await fetchTree()
                if (!pages || pages.length === 0) {
                    await createPage(null)
                    await fetchTree()
                }
            } catch (err) {
                console.error('Failed to load workspace:', err)
                setError(err?.response?.data?.detail || err?.message || 'Could not connect to backend.')
            }
        }
        init()
    }, [])

    if (error) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-secondary)', gap: 12 }}>
                <span style={{ fontSize: 32 }}>⚠️</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Failed to load workspace</span>
                <span style={{ fontSize: 13, maxWidth: 360, textAlign: 'center' }}>{error}</span>
                <button
                    style={{ marginTop: 8, padding: '8px 20px', background: 'var(--accent)', color: '#fff', borderRadius: 6, fontWeight: 600 }}
                    onClick={() => { setError(null); window.location.reload() }}
                >Retry</button>
                <button
                    style={{ fontSize: 13, color: 'var(--text-secondary)' }}
                    onClick={() => navigate('/login')}
                >← Back to login</button>
            </div>
        )
    }

    if (tree.length > 0) return <Navigate to="/dashboard" replace />

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div className="spinner" /> Setting up your workspace...
            </div>
        </div>
    )
}

export default function App() {
    const fetchTree = usePagesStore(s => s.fetchTree)
    const { token } = useAuthStore()

    useEffect(() => {
        if (token) fetchTree()
    }, [token])

    const P = ({ children }) => <ProtectedRoute>{children}</ProtectedRoute>

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/" element={<P><HomeRedirect /></P>} />
                <Route path="/dashboard" element={<P><DashboardPage /></P>} />
                <Route path="/calendar" element={<P><CalendarPage /></P>} />
                <Route path="/page/:id" element={<P><EditorPage /></P>} />
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </BrowserRouter>
    )
}
