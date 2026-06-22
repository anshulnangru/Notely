import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '../api/auth'

export default function VerifyEmailPage() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const token = searchParams.get('token') || ''
    const [loading, setLoading] = useState(true)
    const [message, setMessage] = useState('Verifying your email...')
    const [error, setError] = useState('')

    useEffect(() => {
        const verify = async () => {
            if (!token) {
                setError('Missing verification token.')
                setLoading(false)
                return
            }
            try {
                const data = await authApi.verifyEmail(token)
                setMessage(data.message || 'Email verified successfully.')
            } catch (err) {
                setError(err.response?.data?.detail || 'Could not verify email.')
            } finally {
                setLoading(false)
            }
        }
        verify()
    }, [token])

    return (
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg-body)', padding: 24 }}>
            <div style={{ width: '100%', maxWidth: 520, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 20, boxShadow: 'var(--shadow-md)', padding: 32 }}>
                <h1 style={{ fontSize: 32, lineHeight: 1.1, letterSpacing: '-0.04em', marginBottom: 12 }}>Verify Email</h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
                    {loading ? 'Hang on while we confirm your email address.' : error || message}
                </p>
                {!loading && !error && (
                    <button
                        onClick={() => navigate('/login?verified=1')}
                        style={{ padding: '10px 18px', background: 'var(--text-primary)', color: 'var(--bg-primary)', borderRadius: 999, fontWeight: 600 }}
                    >
                        Continue to login
                    </button>
                )}
                {!loading && error && (
                    <Link to="/login" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                        Back to login
                    </Link>
                )}
            </div>
        </div>
    )
}
