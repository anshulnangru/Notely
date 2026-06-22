import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '../api/auth'

export default function ResetPasswordPage() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const token = searchParams.get('token') || ''
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState(token ? '' : 'Missing password reset token.')

    const handleSubmit = async (event) => {
        event.preventDefault()
        setError('')
        setMessage('')

        if (!token) {
            setError('Missing password reset token.')
            return
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters.')
            return
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.')
            return
        }

        setLoading(true)
        try {
            const data = await authApi.resetPassword(token, password)
            setMessage(data.message || 'Password reset successfully. You can log in now.')
        } catch (err) {
            setError(err.response?.data?.detail || 'Could not reset password.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg-body)', padding: 24 }}>
            <div style={{ width: '100%', maxWidth: 520, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 20, boxShadow: 'var(--shadow-md)', padding: 32 }}>
                <h1 style={{ fontSize: 32, lineHeight: 1.1, marginBottom: 12 }}>Reset Password</h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
                    Enter a new password for your Notely account.
                </p>

                {error && (
                    <div style={{ color: 'var(--danger)', marginBottom: 16, fontSize: 14 }}>
                        {error}
                    </div>
                )}
                {message && (
                    <div style={{ color: 'var(--success)', marginBottom: 16, fontSize: 14 }}>
                        {message}
                    </div>
                )}

                {!message && (
                    <form onSubmit={handleSubmit}>
                        <label htmlFor="new-password" style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>
                            New password
                        </label>
                        <input
                            id="new-password"
                            type="password"
                            autoComplete="new-password"
                            value={password}
                            onChange={event => setPassword(event.target.value)}
                            style={{ width: '100%', padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 14, background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                        />

                        <label htmlFor="confirm-password" style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>
                            Confirm password
                        </label>
                        <input
                            id="confirm-password"
                            type="password"
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={event => setConfirmPassword(event.target.value)}
                            style={{ width: '100%', padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 18, background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                        />

                        <button
                            type="submit"
                            disabled={loading || !token}
                            style={{ padding: '10px 18px', background: 'var(--text-primary)', color: 'var(--bg-primary)', borderRadius: 999, fontWeight: 600 }}
                        >
                            {loading ? 'Resetting...' : 'Reset password'}
                        </button>
                    </form>
                )}

                <div style={{ marginTop: 20 }}>
                    <Link to="/login" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                        Back to login
                    </Link>
                </div>

                {message && (
                    <button
                        onClick={() => navigate('/login?reset=1')}
                        style={{ marginTop: 16, padding: '10px 18px', background: 'var(--text-primary)', color: 'var(--bg-primary)', borderRadius: 999, fontWeight: 600 }}
                    >
                        Continue to login
                    </button>
                )}
            </div>
        </div>
    )
}
