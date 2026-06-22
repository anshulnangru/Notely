import { useMemo, useState } from 'react'
import { useNavigate, Navigate, useSearchParams } from 'react-router-dom'
import useAuthStore from '../store/useAuthStore'
import { authApi } from '../api/auth'
import ThemeToggle from '../components/ThemeToggle/ThemeToggle'
import './LoginPage.css'

export default function LoginPage() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const { login, token } = useAuthStore()

    const [email, setEmail]           = useState('')
    const [password, setPassword]     = useState('')
    const [showPwd, setShowPwd]       = useState(false)
    const [remember, setRemember]     = useState(false)
    const [loading, setLoading]       = useState(false)
    const [error, setError]           = useState('')
    const [info, setInfo]             = useState('')
    const [resending, setResending]   = useState(false)
    const [forgotLoading, setForgotLoading] = useState(false)
    const [resetUrl, setResetUrl]     = useState('')
    const [emailErr, setEmailErr]     = useState(false)
    const [passwordErr, setPasswordErr] = useState(false)
    const registeredEmail = searchParams.get('email') || ''
    const justRegistered = searchParams.get('registered') === '1'

    // Already logged in — bounce home
    if (token) return <Navigate to="/" replace />

    const initialInfo = useMemo(() => {
        if (searchParams.get('verified') === '1') return 'Email verified successfully. You can log in now.'
        if (searchParams.get('reset') === '1') return 'Password reset successfully. You can log in now.'
        if (justRegistered && registeredEmail) return `Account created for ${registeredEmail}. Please verify your email before logging in.`
        return ''
    }, [searchParams, justRegistered, registeredEmail])

    const validate = () => {
        const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
        const pwdOk   = password.length >= 6
        setEmailErr(!emailOk)
        setPasswordErr(!pwdOk)
        return emailOk && pwdOk
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        if (!validate()) return

        setLoading(true)
        try {
            await login(email.trim(), password)
            navigate('/')
        } catch (err) {
            setError(err.response?.data?.detail || 'Invalid email or password. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const handleResendVerification = async () => {
        const targetEmail = (email || registeredEmail).trim()
        if (!targetEmail) {
            setError('Enter your email address first so we can resend verification.')
            return
        }
        setResending(true)
        setError('')
        try {
            const data = await authApi.resendVerification(targetEmail)
            setInfo(data.message || 'Verification email sent. Check your inbox.')
        } catch (err) {
            setError(err.response?.data?.detail || 'Could not resend verification email.')
        } finally {
            setResending(false)
        }
    }

    const handleForgotPassword = async () => {
        const targetEmail = email.trim()
        const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)
        if (!emailOk) {
            setEmailErr(true)
            setError('Enter your email address first so we can send a password reset link.')
            return
        }

        setForgotLoading(true)
        setError('')
        setInfo('')
        setResetUrl('')
        try {
            const data = await authApi.forgotPassword(targetEmail)
            setInfo(data.message || 'If an account exists for that email, a password reset link has been sent.')
            if (data.reset_url) setResetUrl(data.reset_url)
        } catch (err) {
            setError(err.response?.data?.detail || 'Could not start password reset.')
        } finally {
            setForgotLoading(false)
        }
    }

    return (
        <div className="lp2-root">

            {/* ── NAV ── */}
            <nav className="lp2-nav">
                <a className="lp2-logo" href="/landing">
                    <div className="lp2-logo-mark">
                        <svg viewBox="0 0 20 20" fill="none">
                            <rect x="3" y="3" width="6" height="6" rx="1" fill="white"/>
                            <rect x="11" y="3" width="6" height="6" rx="1" fill="white" opacity="0.6"/>
                            <rect x="3" y="11" width="6" height="6" rx="1" fill="white" opacity="0.6"/>
                            <rect x="11" y="11" width="6" height="6" rx="1" fill="white" opacity="0.3"/>
                        </svg>
                    </div>
                    Notely
                </a>
                <div className="lp2-nav-right">
                    <span className="lp2-nav-text">Don't have an account?</span>
                    <button className="lp2-btn-nav" onClick={() => navigate('/register')}>
                        Get Notely free
                    </button>
                    <ThemeToggle variant="ghost" />
                </div>
            </nav>

            {/* ── MAIN ── */}
            <main className="lp2-main">
                <div className="lp2-wrapper">

                    {/* LEFT PANEL */}
                    <div className="lp2-left">
                        <div className="lp2-left-top">
                            <div className="lp2-headline">
                                Welcome back<br />to <span className="lp2-underline">Notely.</span>
                            </div>
                            <div className="lp2-sub">
                                Your workspace is waiting. Pick up right where you left off.
                            </div>

                            {/* Mini app preview */}
                            <div className="lp2-mini-preview">
                                <div className="lp2-mini-topbar">
                                    <div className="lp2-mini-dot" style={{background:'#dc2626'}}/>
                                    <div className="lp2-mini-dot" style={{background:'#f59e0b'}}/>
                                    <div className="lp2-mini-dot" style={{background:'#22c55e'}}/>
                                    <div className="lp2-mini-urlbar"/>
                                </div>
                                <div className="lp2-mini-body">
                                    <div className="lp2-mini-sidebar">
                                        <div className="lp2-mini-item active">⌂ Home</div>
                                        <div className="lp2-mini-item">📄 Pages</div>
                                        <div className="lp2-mini-item">✓ Tasks</div>
                                        <div className="lp2-mini-item">📅 Calendar</div>
                                        <div className="lp2-mini-divider"/>
                                        <div className="lp2-mini-item">🚀 Sprint Q1</div>
                                        <div className="lp2-mini-item">📋 Roadmap</div>
                                        <div className="lp2-mini-item">📝 Meeting…</div>
                                    </div>
                                    <div className="lp2-mini-content">
                                        <div className="lp2-mini-title">🚀 Sprint Planning</div>
                                        <div className="lp2-mini-line long"/>
                                        <div className="lp2-mini-line medium"/>
                                        <div className="lp2-mini-line short"/>
                                        <div style={{height:'8px'}}/>
                                        <div className="lp2-mini-line medium"/>
                                        <div className="lp2-mini-line long"/>
                                        <div className="lp2-mini-line short"/>
                                        <div style={{height:'8px'}}/>
                                        <div className="lp2-mini-actions">
                                            <div className="lp2-mini-action-ghost"/>
                                            <div className="lp2-mini-action-solid"/>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Testimonial */}
                        <div className="lp2-testimonial">
                            <div className="lp2-testimonial-text">
                                "Notely replaced three apps for us. Our team docs, tasks, and meeting notes all live in one place now."
                            </div>
                            <div className="lp2-testimonial-author">
                                <div className="lp2-author-avatar">R</div>
                                <div>
                                    <div className="lp2-author-name">Riya Sharma</div>
                                    <div className="lp2-author-role">Product Lead, NovaTech</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT PANEL */}
                    <div className="lp2-right">
                        <div className="lp2-form-title">Log in</div>
                        <div className="lp2-form-subtitle">
                            New here?{' '}
                            <button className="lp2-link-btn" onClick={() => navigate('/register')}>
                                Create a free account →
                            </button>
                        </div>

                        {/* Error banner */}
                        {error && (
                            <div className="lp2-error-banner">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <circle cx="12" cy="12" r="10"/>
                                    <line x1="12" y1="8" x2="12" y2="12"/>
                                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                                </svg>
                                <span>{error}</span>
                            </div>
                        )}

                        {(info || initialInfo) && (
                            <div className="lp2-success-banner">
                                <span>
                                    {info || initialInfo}
                                    {resetUrl && (
                                        <>
                                            {' '}
                                            <a href={resetUrl}>Open reset link</a>
                                        </>
                                    )}
                                </span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} noValidate>

                            {/* Email */}
                            <div className="lp2-field">
                                <label htmlFor="lp2-email">Email address</label>
                                <div className="lp2-field-wrap">
                                    <input
                                        id="lp2-email"
                                        type="email"
                                        placeholder="you@example.com"
                                        autoComplete="email"
                                        value={email}
                                        onChange={e => { setEmail(e.target.value); setEmailErr(false); setError(''); setResetUrl('') }}
                                        className={emailErr ? 'lp2-input error' : 'lp2-input'}
                                    />
                                </div>
                                {emailErr && <div className="lp2-field-error">Please enter a valid email address.</div>}
                            </div>

                            {/* Password */}
                            <div className="lp2-field">
                                <label htmlFor="lp2-password">Password</label>
                                <div className="lp2-field-wrap">
                                    <input
                                        id="lp2-password"
                                        type={showPwd ? 'text' : 'password'}
                                        placeholder="Enter your password"
                                        autoComplete="current-password"
                                        value={password}
                                        onChange={e => { setPassword(e.target.value); setPasswordErr(false); setError('') }}
                                        className={passwordErr ? 'lp2-input error pwd-pad' : 'lp2-input pwd-pad'}
                                    />
                                    <button
                                        type="button"
                                        className="lp2-pwd-toggle"
                                        onClick={() => setShowPwd(v => !v)}
                                        aria-label="Toggle password visibility"
                                    >
                                        {showPwd ? (
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                                                <line x1="1" y1="1" x2="23" y2="23"/>
                                            </svg>
                                        ) : (
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                                <circle cx="12" cy="12" r="3"/>
                                            </svg>
                                        )}
                                    </button>
                                </div>
                                {passwordErr && <div className="lp2-field-error">Password must be at least 6 characters.</div>}
                            </div>

                            <button type="button" className="lp2-forgot" onClick={handleForgotPassword} disabled={forgotLoading}>
                                {forgotLoading ? 'Sending reset link...' : 'Forgot password?'}
                            </button>

                            <button type="button" className="lp2-forgot" onClick={handleResendVerification} disabled={resending}>
                                {resending ? 'Sending verification...' : 'Resend verification email'}
                            </button>

                            <div className="lp2-remember-row">
                                <input
                                    type="checkbox"
                                    id="lp2-remember"
                                    checked={remember}
                                    onChange={e => setRemember(e.target.checked)}
                                />
                                <label htmlFor="lp2-remember">Keep me logged in for 30 days</label>
                            </div>

                            <button
                                id="login-submit"
                                type="submit"
                                className={`lp2-btn-submit${loading ? ' loading' : ''}`}
                                disabled={loading}
                            >
                                <span className="lp2-btn-text">Log in to Notely</span>
                                <span className="lp2-btn-spinner"/>
                            </button>
                        </form>

                        <div className="lp2-terms">
                            By logging in, you agree to our{' '}
                            <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
                        </div>
                    </div>
                </div>
            </main>

            {/* ── FOOTER ── */}
            <footer className="lp2-footer">
                <div className="lp2-footer-copy">© 2025 Notely</div>
                <div className="lp2-footer-links">
                    <a href="#">Privacy</a>
                    <a href="#">Terms</a>
                    <a href="#">Help</a>
                </div>
            </footer>
        </div>
    )
}
