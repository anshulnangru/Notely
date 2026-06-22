import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import ThemeToggle from '../components/ThemeToggle/ThemeToggle'
import './LandingPage.css'

export default function LandingPage() {
    const navigate = useNavigate()
    const revealRefs = useRef([])

    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                entries.forEach(e => {
                    if (e.isIntersecting) {
                        e.target.classList.add('visible')
                        observer.unobserve(e.target)
                    }
                })
            },
            { threshold: 0.1 }
        )
        revealRefs.current.forEach(el => el && observer.observe(el))
        return () => observer.disconnect()
    }, [])

    const addReveal = el => {
        if (el && !revealRefs.current.includes(el)) revealRefs.current.push(el)
    }

    return (
        <div className="landing-root">
            {/* ── NAV ── */}
            <nav className="landing-nav">
                <a className="nav-logo" href="#">
                    <div className="logo-mark">
                        <svg viewBox="0 0 20 20" fill="none">
                            <rect x="3" y="3" width="6" height="6" rx="1" fill="white"/>
                            <rect x="11" y="3" width="6" height="6" rx="1" fill="white" opacity="0.6"/>
                            <rect x="3" y="11" width="6" height="6" rx="1" fill="white" opacity="0.6"/>
                            <rect x="11" y="11" width="6" height="6" rx="1" fill="white" opacity="0.3"/>
                        </svg>
                    </div>
                    Notely
                </a>
                <div className="nav-right">
                    <a className="lp-nav-link" href="#features">Features</a>
                    <a className="lp-nav-link" href="#how">How it works</a>
                    <button className="lp-nav-link btn-plain" onClick={() => navigate('/login')}>Log in</button>
                    <button className="btn-nav" onClick={() => navigate('/register')}>Get Notely free</button>
                    <ThemeToggle variant="ghost" />
                </div>
            </nav>

            {/* ── HERO ── */}
            <section className="lp-hero">
                <h1>Your Ideas, Documents,<br />&amp; Plans. Unified.<br />Welcome to <span className="underline-word">Notely.</span></h1>
                <p>Notely is the connected workspace where better, faster work happens.</p>
                <button className="btn-hero" onClick={() => navigate('/register')}>
                    Get Notely free
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                </button>
            </section>

            {/* ── ILLUSTRATION ── */}
            <div className="illustration-wrap">
                <svg viewBox="0 0 780 420" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g transform="translate(80, 30)">
                        <ellipse cx="160" cy="340" rx="55" ry="18" fill="#e5e7eb"/>
                        <rect x="130" y="260" width="60" height="100" rx="10" fill="#1a1a1a"/>
                        <rect x="135" y="340" width="18" height="55" rx="9" fill="#1a1a1a"/>
                        <rect x="157" y="340" width="18" height="55" rx="9" fill="#1a1a1a"/>
                        <ellipse cx="144" cy="394" rx="14" ry="8" fill="#1a1a1a"/>
                        <ellipse cx="166" cy="394" rx="14" ry="8" fill="#1a1a1a"/>
                        <rect x="125" y="210" width="70" height="80" rx="12" fill="#1a1a1a"/>
                        <path d="M125 230 Q90 200 80 170" stroke="#1a1a1a" strokeWidth="16" strokeLinecap="round"/>
                        <path d="M195 230 Q230 200 245 175" stroke="#1a1a1a" strokeWidth="16" strokeLinecap="round"/>
                        <circle cx="160" cy="185" r="36" fill="#f5d0a0"/>
                        <path d="M128 172 Q130 148 160 145 Q190 148 192 172" fill="#1a1a1a"/>
                        <circle cx="150" cy="183" r="4" fill="#1a1a1a"/>
                        <circle cx="170" cy="183" r="4" fill="#1a1a1a"/>
                        <path d="M148 200 Q160 194 172 200" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                        <rect x="30" y="100" width="52" height="68" rx="4" fill="white" stroke="#d1d5db" strokeWidth="1.5" transform="rotate(-25 56 134)"/>
                        <line x1="38" y1="118" x2="70" y2="118" stroke="#e5e7eb" strokeWidth="2"/>
                        <line x1="38" y1="126" x2="68" y2="126" stroke="#e5e7eb" strokeWidth="2"/>
                        <line x1="38" y1="134" x2="62" y2="134" stroke="#e5e7eb" strokeWidth="2"/>
                        <rect x="190" y="80" width="52" height="68" rx="4" fill="white" stroke="#d1d5db" strokeWidth="1.5" transform="rotate(18 216 114)"/>
                        <line x1="198" y1="98" x2="230" y2="98" stroke="#e5e7eb" strokeWidth="2"/>
                        <line x1="198" y1="106" x2="228" y2="106" stroke="#e5e7eb" strokeWidth="2"/>
                        <rect x="60" y="40" width="44" height="58" rx="4" fill="white" stroke="#d1d5db" strokeWidth="1.5" transform="rotate(8 82 69)"/>
                        <line x1="67" y1="55" x2="95" y2="55" stroke="#e5e7eb" strokeWidth="2"/>
                        <line x1="67" y1="63" x2="93" y2="63" stroke="#e5e7eb" strokeWidth="2"/>
                        <rect x="175" y="30" width="44" height="58" rx="4" fill="white" stroke="#d1d5db" strokeWidth="1.5" transform="rotate(-12 197 59)"/>
                        <line x1="182" y1="45" x2="210" y2="45" stroke="#e5e7eb" strokeWidth="2"/>
                        <line x1="182" y1="53" x2="208" y2="53" stroke="#e5e7eb" strokeWidth="2"/>
                        <rect x="100" y="20" width="36" height="48" rx="4" fill="white" stroke="#d1d5db" strokeWidth="1.5" transform="rotate(-5 118 44)"/>
                        <path d="M85 160 Q70 150 60 145" stroke="#d1d5db" strokeWidth="1.5" strokeDasharray="4 3"/>
                        <path d="M230 155 Q248 148 255 140" stroke="#d1d5db" strokeWidth="1.5" strokeDasharray="4 3"/>
                    </g>
                    <g transform="translate(430, 30)">
                        <rect x="80" y="270" width="160" height="14" rx="7" fill="#d1d5db"/>
                        <rect x="220" y="270" width="14" height="100" rx="7" fill="#d1d5db"/>
                        <rect x="86" y="270" width="14" height="80" rx="7" fill="#d1d5db"/>
                        <rect x="80" y="340" width="165" height="14" rx="7" fill="#d1d5db"/>
                        <rect x="100" y="200" width="80" height="95" rx="14" fill="#1a1a1a"/>
                        <path d="M110 295 Q108 330 130 360" stroke="#1a1a1a" strokeWidth="20" strokeLinecap="round" fill="none"/>
                        <path d="M170 295 Q175 330 200 345" stroke="#1a1a1a" strokeWidth="20" strokeLinecap="round" fill="none"/>
                        <ellipse cx="134" cy="364" rx="18" ry="10" fill="#1a1a1a"/>
                        <ellipse cx="202" cy="348" rx="18" ry="10" fill="#1a1a1a"/>
                        <path d="M100 230 Q72 240 60 260" stroke="#1a1a1a" strokeWidth="14" strokeLinecap="round" fill="none"/>
                        <path d="M180 230 Q210 235 225 225" stroke="#1a1a1a" strokeWidth="14" strokeLinecap="round" fill="none"/>
                        <rect x="44" y="240" width="68" height="88" rx="8" fill="#1a1a1a"/>
                        <rect x="48" y="244" width="60" height="80" rx="6" fill="#f9fafb"/>
                        <rect x="52" y="248" width="36" height="4" rx="2" fill="#1a1a1a"/>
                        <rect x="52" y="256" width="48" height="3" rx="1.5" fill="#e5e7eb"/>
                        <rect x="52" y="262" width="44" height="3" rx="1.5" fill="#e5e7eb"/>
                        <rect x="52" y="268" width="38" height="3" rx="1.5" fill="#e5e7eb"/>
                        <rect x="52" y="277" width="30" height="4" rx="2" fill="#1a1a1a"/>
                        <rect x="52" y="285" width="46" height="3" rx="1.5" fill="#e5e7eb"/>
                        <rect x="52" y="291" width="40" height="3" rx="1.5" fill="#e5e7eb"/>
                        <rect x="52" y="300" width="20" height="14" rx="4" fill="#1a1a1a"/>
                        <rect x="54" y="302" width="16" height="10" rx="3" fill="#f9fafb"/>
                        <rect x="55" y="304" width="10" height="2" rx="1" fill="#9ca3af"/>
                        <circle cx="140" cy="172" r="34" fill="#f5d0a0"/>
                        <path d="M110 162 Q112 140 140 138 Q168 140 170 162" fill="#1a1a1a"/>
                        <circle cx="130" cy="170" r="3.5" fill="#1a1a1a"/>
                        <circle cx="150" cy="170" r="3.5" fill="#1a1a1a"/>
                        <path d="M128 186 Q140 194 152 186" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                        <rect x="195" y="360" width="80" height="14" rx="3" fill="#9ca3af"/>
                        <rect x="200" y="347" width="72" height="14" rx="3" fill="#d1d5db"/>
                        <rect x="205" y="334" width="64" height="14" rx="3" fill="#e5e7eb"/>
                        <rect x="205" y="375" width="24" height="14" rx="4" fill="#1a1a1a" transform="rotate(-8 217 382)"/>
                    </g>
                    <line x1="390" y1="60" x2="390" y2="390" stroke="#f3f4f6" strokeWidth="2" strokeDasharray="6 6"/>
                    <text x="200" y="415" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="13" fontWeight="600" fill="#9ca3af">Without Notely</text>
                    <text x="580" y="415" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="13" fontWeight="600" fill="#1a1a1a">With Notely</text>
                </svg>
            </div>

            {/* ── SOCIAL PROOF ── */}
            <div className="lp-social-proof" ref={addReveal}>
                <p>Trusted by teams at</p>
                <div className="logos">
                    <span className="logo-pill">Acme Corp</span>
                    <span className="logo-pill">Buildify</span>
                    <span className="logo-pill">NovaTech</span>
                    <span className="logo-pill">Orbit Studios</span>
                    <span className="logo-pill">Stackly</span>
                </div>
            </div>

            {/* ── FEATURES ── */}
            <section className="lp-features" id="features">
                <div className="features-header" ref={addReveal}>
                    <h2>Everything your team needs,<br />nothing it doesn't.</h2>
                    <p>One place for docs, tasks, wikis, and collaboration — no switching apps.</p>
                </div>

                {/* Feature 1 */}
                <div className="feature-row" ref={addReveal}>
                    <div className="feature-text">
                        <div className="feature-tag">Editor</div>
                        <h3>Write anything,<br />any way you like.</h3>
                        <p>A block editor that stays out of your way. Slash commands, drag-and-drop, toggles, callouts, code blocks, and more — all at your fingertips.</p>
                    </div>
                    <div className="feature-visual">
                        <div className="mock-editor">
                            <div className="mock-title">🚀 Sprint Planning — Q1</div>
                            <div className="mock-block" style={{color:'#9ca3af',fontSize:'12px',marginBottom:'12px'}}>Jan 15 · Engineering · Active</div>
                            <div className="mock-block callout">🎯 Goal: Ship the dashboard redesign by Jan 31.</div>
                            <div className="mock-block heading">This week's focus</div>
                            <div className="mock-block">✅ Set up PostgreSQL migration</div>
                            <div className="mock-block">✅ <span style={{textDecoration:'line-through',color:'#9ca3af'}}>Write onboarding copy</span></div>
                            <div className="mock-block">☐ Implement global search (Cmd+K)<span className="cursor-blink"/></div>
                            <div className="mock-slash">
                                <span className="slash-icon">⌘</span>
                                <span style={{color:'#9ca3af'}}>Type / to insert a block...</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Feature 2 */}
                <div className="feature-row reverse" ref={addReveal}>
                    <div className="feature-text">
                        <div className="feature-tag">Tasks</div>
                        <h3>Tasks that live with<br />your docs.</h3>
                        <p>Kanban boards, list views, priorities, subtasks, and due dates — all connected to the pages they belong to. No more context switching.</p>
                    </div>
                    <div className="feature-visual">
                        <div className="mock-kanban">
                            <div className="kanban-col">
                                <div className="kanban-col-title">To do</div>
                                <div className="kanban-card"><span className="kanban-card-tag tag-todo">Todo</span><br/>Write API docs</div>
                                <div className="kanban-card"><span className="kanban-card-tag tag-todo">Todo</span><br/>Mobile responsiveness</div>
                            </div>
                            <div className="kanban-col">
                                <div className="kanban-col-title">In progress</div>
                                <div className="kanban-card"><span className="kanban-card-tag tag-prog">In progress</span><br/>Global search UI</div>
                                <div className="kanban-card"><span className="kanban-card-tag tag-prog">In progress</span><br/>Fix sidebar collapse</div>
                            </div>
                            <div className="kanban-col">
                                <div className="kanban-col-title">Done</div>
                                <div className="kanban-card"><span className="kanban-card-tag tag-done">Done</span><br/>Auth with JWT</div>
                                <div className="kanban-card"><span className="kanban-card-tag tag-done">Done</span><br/>Block editor</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Feature 3 */}
                <div className="feature-row" ref={addReveal}>
                    <div className="feature-text">
                        <div className="feature-tag">Search</div>
                        <h3>Find anything<br />in seconds.</h3>
                        <p>Press Cmd+K anywhere to open instant full-text search across every page, block, and task in your workspace. Your second brain, indexed.</p>
                    </div>
                    <div className="feature-visual">
                        <div className="mock-search">
                            <div className="search-bar">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                                <input value="sprint planning" readOnly/>
                                <span className="search-kbd">⌘K</span>
                            </div>
                            <div className="search-result active">
                                <span className="icon">📄</span>
                                <div>
                                    <div style={{fontWeight:500}}>🚀 <span className="search-highlight">Sprint Planning</span> — Q1</div>
                                    <div style={{fontSize:'11px',color:'#9ca3af'}}>Goal: Ship dashboard by Jan 31</div>
                                </div>
                                <span className="path">Engineering</span>
                            </div>
                            <div className="search-result">
                                <span className="icon">📄</span>
                                <div>
                                    <div style={{fontWeight:500}}><span className="search-highlight">Sprint Planning</span> Template</div>
                                    <div style={{fontSize:'11px',color:'#9ca3af'}}>Reusable page template</div>
                                </div>
                                <span className="path">Templates</span>
                            </div>
                            <div className="search-result">
                                <span className="icon">✓</span>
                                <div>
                                    <div style={{fontWeight:500}}>Task: Review <span className="search-highlight">sprint</span> backlog</div>
                                    <div style={{fontSize:'11px',color:'#9ca3af'}}>Due Jan 20 · High priority</div>
                                </div>
                                <span className="path">Tasks</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── HOW IT WORKS ── */}
            <div className="lp-how" id="how" ref={addReveal}>
                <h2>Up and running in minutes.</h2>
                <div className="steps">
                    <div className="step">
                        <div className="step-num">1</div>
                        <h4>Create your workspace</h4>
                        <p>Sign up free and set up your personal or team workspace in under 60 seconds.</p>
                    </div>
                    <div className="step">
                        <div className="step-num">2</div>
                        <h4>Add your pages</h4>
                        <p>Start from scratch or use a template. Build your wiki, docs, and task boards.</p>
                    </div>
                    <div className="step">
                        <div className="step-num">3</div>
                        <h4>Invite your team</h4>
                        <p>Collaborate in real time. Comment, assign tasks, and stay in sync — together.</p>
                    </div>
                </div>
            </div>

            {/* ── CTA ── */}
            <section className="lp-cta" ref={addReveal}>
                <h2>Get started with <span className="underline-word">Notely.</span></h2>
                <p>Free forever for personal use. No credit card required.</p>
                <button className="btn-hero" onClick={() => navigate('/register')}>
                    Get Notely free
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                </button>
            </section>

            {/* ── FOOTER ── */}
            <footer className="lp-footer">
                <div className="footer-logo">
                    <div className="logo-mark" style={{width:'28px',height:'28px',borderRadius:'6px'}}>
                        <svg viewBox="0 0 20 20" fill="none">
                            <rect x="3" y="3" width="6" height="6" rx="1" fill="white"/>
                            <rect x="11" y="3" width="6" height="6" rx="1" fill="white" opacity="0.6"/>
                            <rect x="3" y="11" width="6" height="6" rx="1" fill="white" opacity="0.6"/>
                            <rect x="11" y="11" width="6" height="6" rx="1" fill="white" opacity="0.3"/>
                        </svg>
                    </div>
                    Notely
                </div>
                <div className="footer-links">
                    <a href="#features">Features</a>
                    <a href="#how">How it works</a>
                    <a href="/login">Log in</a>
                </div>
                <div className="footer-copy">© 2025 Notely</div>
            </footer>
        </div>
    )
}
