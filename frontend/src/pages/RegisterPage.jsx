import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import useAuthStore from '../store/useAuthStore'
import ThemeToggle from '../components/ThemeToggle/ThemeToggle'
import './RegisterPage.css'

export default function RegisterPage() {
    const navigate = useNavigate()
    const { register, token } = useAuthStore()

    const [name, setName]           = useState('')
    const [email, setEmail]         = useState('')
    const [password, setPassword]   = useState('')
    const [showPwd, setShowPwd]     = useState(false)
    const [agree, setAgree]         = useState(false)
    const [loading, setLoading]     = useState(false)
    const [error, setError]         = useState('')
    const [success, setSuccess]     = useState('')
    const [agreeErr, setAgreeErr]   = useState(false)
    const [nameErr, setNameErr]     = useState(false)
    const [emailErr, setEmailErr]   = useState(false)
    const [passwordErr, setPasswordErr] = useState(false)

    // Already logged in — bounce home
    if (token) return <Navigate to="/" replace />

    const validate = () => {
        const nameOk  = name.trim().length > 0
        const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
        const pwdOk   = password.length >= 6
        const agreeOk = agree
        setNameErr(!nameOk)
        setEmailErr(!emailOk)
        setPasswordErr(!pwdOk)
        setAgreeErr(!agreeOk)
        return nameOk && emailOk && pwdOk && agreeOk
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')
        if (!validate()) return

        setLoading(true)
        try {
            const data = await register(email.trim(), password, name.trim())
            setSuccess(data.message || 'Account created. Check your inbox to verify your email.')
            navigate(`/login?registered=1&email=${encodeURIComponent(email.trim())}`)
        } catch (err) {
            const detail = err.response?.data?.detail
            let msg = 'Registration failed. Please try again.'
            if (typeof detail === 'string') msg = detail
            else if (Array.isArray(detail)) msg = detail.map(d => d.msg || JSON.stringify(d)).join(', ')
            setError(msg)
        } finally {
            setLoading(false)
        }
    }

    /* Password strength */
    const strength = password.length === 0 ? 0
        : password.length < 6  ? 1
        : password.length < 10 ? 2
        : 3
    const strengthLabel = ['', 'Weak', 'Fair', 'Strong'][strength]
    const strengthColor = ['', '#ef4444', '#f59e0b', '#22c55e'][strength]

    return (
        <div className="rp-root">

            {/* ── NAV ── */}
            <nav className="rp-nav">
                <a className="rp-logo" href="/landing">
                    <div className="rp-logo-mark">
                        <svg viewBox="0 0 20 20" fill="none">
                            <rect x="3" y="3" width="6" height="6" rx="1" fill="white"/>
                            <rect x="11" y="3" width="6" height="6" rx="1" fill="white" opacity="0.6"/>
                            <rect x="3" y="11" width="6" height="6" rx="1" fill="white" opacity="0.6"/>
                            <rect x="11" y="11" width="6" height="6" rx="1" fill="white" opacity="0.3"/>
                        </svg>
                    </div>
                    Notely
                </a>
                <div className="rp-nav-right">
                    <span className="rp-nav-text">Already have an account?</span>
                    <button className="rp-btn-nav" onClick={() => navigate('/login')}>Log in</button>
                    <ThemeToggle variant="ghost" />
                </div>
            </nav>

            {/* ── MAIN ── */}
            <main className="rp-main">
                <div className="rp-wrapper">

                    {/* LEFT PANEL */}
                    <div className="rp-left">
                        <div className="rp-left-top">
                            <div className="rp-headline">
                                Your second brain<br />starts with <span className="rp-underline">Notely.</span>
                            </div>
                            <div className="rp-sub">
                                Free forever for personal use. No credit card required. Set up in 60 seconds.
                            </div>

                            {/* Feature list */}
                            <ul className="rp-features">
                                {[
                                    { icon: '✍️', title: 'Rich block editor', desc: 'Write with slash commands, callouts, code blocks & more.' },
                                    { icon: '✅', title: 'Kanban task boards', desc: 'Tasks that live right inside your docs.' },
                                    { icon: '🔍', title: 'Instant search', desc: 'Cmd+K finds anything across your whole workspace.' },
                                    { icon: '👥', title: 'Team collaboration', desc: 'Comments, @mentions, and real-time updates.' },
                                ].map(f => (
                                    <li key={f.title} className="rp-feature-item">
                                        <div className="rp-feature-icon">{f.icon}</div>
                                        <div>
                                            <div className="rp-feature-title">{f.title}</div>
                                            <div className="rp-feature-desc">{f.desc}</div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Social proof */}
                        <div className="rp-proof">
                            <div className="rp-proof-avatars">
                                {['A','B','C','D'].map(l => (
                                    <div key={l} className="rp-proof-avatar">{l}</div>
                                ))}
                            </div>
                            <div className="rp-proof-text">
                                <strong>4,200+ teams</strong> already use Notely to stay organised.
                            </div>
                        </div>
                    </div>

                    {/* RIGHT PANEL */}
                    <div className="rp-right">
                        <div className="rp-form-title">Create your account</div>
                        <div className="rp-form-subtitle">
                            Already have one?{' '}
                            <button className="rp-link-btn" onClick={() => navigate('/login')}>
                                Log in →
                            </button>
                        </div>

                        {/* Error banner */}
                        {error && (
                            <div className="rp-error-banner">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <circle cx="12" cy="12" r="10"/>
                                    <line x1="12" y1="8" x2="12" y2="12"/>
                                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                                </svg>
                                <span>{error}</span>
                            </div>
                        )}

                        {success && (
                            <div className="rp-success-banner">
                                <span>{success}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} noValidate>

                            {/* Full name */}
                            <div className="rp-field">
                                <label htmlFor="rp-name">Full name</label>
                                <input
                                    id="rp-name"
                                    type="text"
                                    placeholder="Jane Smith"
                                    autoComplete="name"
                                    autoFocus
                                    value={name}
                                    onChange={e => { setName(e.target.value); setNameErr(false); setError('') }}
                                    className={nameErr ? 'rp-input error' : 'rp-input'}
                                />
                                {nameErr && <div className="rp-field-error">Please enter your name.</div>}
                            </div>

                            {/* Email */}
                            <div className="rp-field">
                                <label htmlFor="rp-email">Email address</label>
                                <input
                                    id="rp-email"
                                    type="email"
                                    placeholder="you@example.com"
                                    autoComplete="email"
                                    value={email}
                                    onChange={e => { setEmail(e.target.value); setEmailErr(false); setError('') }}
                                    className={emailErr ? 'rp-input error' : 'rp-input'}
                                />
                                {emailErr && <div className="rp-field-error">Please enter a valid email address.</div>}
                            </div>

                            {/* Password */}
                            <div className="rp-field">
                                <label htmlFor="rp-password">Password</label>
                                <div className="rp-field-wrap">
                                    <input
                                        id="rp-password"
                                        type={showPwd ? 'text' : 'password'}
                                        placeholder="Min. 6 characters"
                                        autoComplete="new-password"
                                        value={password}
                                        onChange={e => { setPassword(e.target.value); setPasswordErr(false); setError('') }}
                                        className={passwordErr ? 'rp-input error pwd-pad' : 'rp-input pwd-pad'}
                                    />
                                    <button
                                        type="button"
                                        className="rp-pwd-toggle"
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

                                {/* Strength bar */}
                                {password.length > 0 && (
                                    <div className="rp-strength-wrap">
                                        <div className="rp-strength-bars">
                                            {[1,2,3].map(i => (
                                                <div
                                                    key={i}
                                                    className="rp-strength-bar"
                                                    style={{ background: strength >= i ? strengthColor : '#e5e7eb' }}
                                                />
                                            ))}
                                        </div>
                                        <span className="rp-strength-label" style={{ color: strengthColor }}>
                                            {strengthLabel}
                                        </span>
                                    </div>
                                )}
                                {passwordErr && <div className="rp-field-error">Password must be at least 6 characters.</div>}
                            </div>

                            {/* Terms */}
                            <div className="rp-agree-row">
                                <input
                                    type="checkbox"
                                    id="rp-agree"
                                    checked={agree}
                                    onChange={e => { setAgree(e.target.checked); setAgreeErr(false) }}
                                    style={agreeErr ? { outline: '2px solid #e53935', borderRadius: 3 } : {}}
                                />
                                <label htmlFor="rp-agree" style={agreeErr ? { color: '#e53935' } : {}}>
                                    I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>
                                </label>
                            </div>
                            {agreeErr && <div className="rp-field-error">You must agree to the Terms to continue.</div>}

                            <button
                                id="register-submit"
                                type="submit"
                                className={`rp-btn-submit${loading ? ' loading' : ''}`}
                                disabled={loading}
                            >
                                <span className="rp-btn-text">Create free account</span>
                                <span className="rp-btn-spinner"/>
                            </button>
                        </form>

                        <div className="rp-terms">
                            By signing up, you agree to our{' '}
                            <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
                        </div>
                    </div>

                </div>
            </main>

            {/* ── FOOTER ── */}
            <footer className="rp-footer">
                <div className="rp-footer-copy">© 2025 Notely</div>
                <div className="rp-footer-links">
                    <a href="#">Privacy</a>
                    <a href="#">Terms</a>
                    <a href="#">Help</a>
                </div>
            </footer>
        </div>
    )
}
