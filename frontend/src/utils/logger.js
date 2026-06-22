/**
 * Notely Frontend Logger
 * ──────────────────────
 * Captures every API error with full context and renders a
 * floating dev-log panel in the bottom-right corner (dev only).
 */

const IS_DEV = import.meta.env.DEV

// ── In-memory log store ───────────────────────────────────────
const MAX_ENTRIES = 100
let entries = []
let listeners = []

function subscribe(fn) {
    listeners.push(fn)
    return () => { listeners = listeners.filter(l => l !== fn) }
}

function notify() {
    listeners.forEach(fn => fn([...entries]))
}

function addEntry(level, message, detail = null) {
    const entry = {
        id:      Date.now() + Math.random(),
        level,        // 'info' | 'warn' | 'error'
        message,
        detail,
        time:    new Date().toLocaleTimeString(),
    }
    entries = [entry, ...entries].slice(0, MAX_ENTRIES)
    notify()

    // Always log to browser console too
    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
    fn(`[Notely ${level.toUpperCase()}]`, message, detail ?? '')
}

// ── Public API ────────────────────────────────────────────────
export const logger = {
    info:  (msg, detail) => addEntry('info',  msg, detail),
    warn:  (msg, detail) => addEntry('warn',  msg, detail),
    error: (msg, detail) => addEntry('error', msg, detail),

    /** Parse an Axios error into a human description */
    fromAxios(err) {
        const status  = err.response?.status
        const url     = err.config?.url
        const method  = err.config?.method?.toUpperCase()
        const detail  = err.response?.data?.detail
        const body    = err.response?.data

        let message = `${method} ${url} → ${status ?? 'Network Error'}`
        if (detail) message += `: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`

        addEntry('error', message, { status, url, method, responseBody: body, raw: err.message })
        return message
    },

    subscribe,
    getEntries: () => [...entries],
}

// ── Dev panel (mounted once) ───────────────────────────────────
if (IS_DEV) {
    mountDevPanel()
}

function mountDevPanel() {
    // Avoid double-mount on HMR
    if (document.getElementById('notely-log-panel')) return

    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mountDevPanel)
        return
    }

    const style = document.createElement('style')
    style.textContent = `
    #notely-log-toggle {
        position: fixed; bottom: 16px; right: 16px; z-index: 99999;
        background: #1a1a1a; color: #f0ede6;
        border: none; border-radius: 8px;
        padding: 6px 14px; font: 500 12px/1 'DM Sans', system-ui;
        cursor: pointer; display: flex; align-items: center; gap: 6px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.3);
        transition: background 0.15s;
    }
    #notely-log-toggle:hover { background: #333; }
    #notely-log-toggle .log-badge {
        background: #e53935; color: #fff;
        border-radius: 99px; min-width: 18px; height: 18px;
        font-size: 10px; font-weight: 700;
        display: flex; align-items: center; justify-content: center;
        padding: 0 4px;
    }
    #notely-log-panel {
        position: fixed; bottom: 56px; right: 16px; z-index: 99998;
        width: 480px; max-height: 60vh;
        background: #0e0e0d; color: #f0ede6;
        border: 1px solid rgba(255,255,255,0.10);
        border-radius: 12px; overflow: hidden;
        box-shadow: 0 12px 48px rgba(0,0,0,0.6);
        font: 300 12px/1.5 'DM Sans', monospace;
        display: none; flex-direction: column;
    }
    #notely-log-panel.open { display: flex; }
    .nlp-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 10px 14px;
        border-bottom: 1px solid rgba(255,255,255,0.07);
        font-weight: 500; font-size: 13px; flex-shrink: 0;
    }
    .nlp-header-actions { display: flex; gap: 8px; }
    .nlp-clear-btn, .nlp-close-btn {
        font-size: 11px; padding: 3px 8px; border-radius: 4px;
        border: 1px solid rgba(255,255,255,0.12);
        background: none; color: #9b9a97; cursor: pointer;
    }
    .nlp-clear-btn:hover { color: #fff; border-color: rgba(255,255,255,0.3); }
    .nlp-close-btn:hover { color: #fff; }
    .nlp-list {
        overflow-y: auto; flex: 1; padding: 6px;
        display: flex; flex-direction: column; gap: 4px;
    }
    .nlp-entry {
        border-radius: 6px; padding: 7px 10px;
        background: rgba(255,255,255,0.04);
        border-left: 3px solid transparent;
        cursor: pointer;
    }
    .nlp-entry.error  { border-color: #e53935; }
    .nlp-entry.warn   { border-color: #f59e0b; }
    .nlp-entry.info   { border-color: rgba(255,255,255,0.15); }
    .nlp-entry-top { display: flex; gap: 8px; align-items: baseline; }
    .nlp-time  { color: #4d4b45; font-size: 10px; flex-shrink: 0; }
    .nlp-level { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; flex-shrink: 0; }
    .nlp-entry.error .nlp-level  { color: #e53935; }
    .nlp-entry.warn  .nlp-level  { color: #f59e0b; }
    .nlp-entry.info  .nlp-level  { color: #9b9a97; }
    .nlp-msg { font-size: 12px; word-break: break-word; }
    .nlp-detail {
        margin-top: 5px; padding: 6px 8px;
        background: rgba(0,0,0,0.35); border-radius: 4px;
        font-size: 11px; color: #8a877f; white-space: pre-wrap;
        word-break: break-all; display: none;
    }
    .nlp-entry.expanded .nlp-detail { display: block; }
    .nlp-empty { padding: 24px; text-align: center; color: #4d4b45; font-size: 12px; }
    `
    document.head.appendChild(style)

    // Toggle button
    const btn = document.createElement('button')
    btn.id = 'notely-log-toggle'
    btn.innerHTML = `🪵 Logs <span class="log-badge" id="nlp-badge" style="display:none">0</span>`
    document.body.appendChild(btn)

    // Panel
    const panel = document.createElement('div')
    panel.id = 'notely-log-panel'
    panel.innerHTML = `
        <div class="nlp-header">
            <span>Notely Dev Log</span>
            <div class="nlp-header-actions">
                <button class="nlp-clear-btn" id="nlp-clear">Clear</button>
                <button class="nlp-close-btn" id="nlp-close">✕</button>
            </div>
        </div>
        <div class="nlp-list" id="nlp-list">
            <div class="nlp-empty">No log entries yet.</div>
        </div>
    `
    document.body.appendChild(panel)

    // Toggle open/close
    btn.addEventListener('click', () => panel.classList.toggle('open'))
    document.getElementById('nlp-close').addEventListener('click', () => panel.classList.remove('open'))
    document.getElementById('nlp-clear').addEventListener('click', () => {
        entries = []
        notify()
    })

    // Render
    let errorCount = 0
    subscribe((logs) => {
        const list = document.getElementById('nlp-list')
        if (!list) return
        errorCount = logs.filter(l => l.level === 'error').length
        const badge = document.getElementById('nlp-badge')
        if (badge) {
            badge.textContent = errorCount
            badge.style.display = errorCount > 0 ? 'flex' : 'none'
        }
        if (logs.length === 0) {
            list.innerHTML = '<div class="nlp-empty">No log entries yet.</div>'
            return
        }
        list.innerHTML = logs.map(e => `
            <div class="nlp-entry ${e.level}" data-id="${e.id}">
                <div class="nlp-entry-top">
                    <span class="nlp-time">${e.time}</span>
                    <span class="nlp-level">${e.level}</span>
                    <span class="nlp-msg">${escHtml(e.message)}</span>
                </div>
                ${e.detail ? `<div class="nlp-detail">${escHtml(JSON.stringify(e.detail, null, 2))}</div>` : ''}
            </div>
        `).join('')

        // Click to expand detail
        list.querySelectorAll('.nlp-entry').forEach(el => {
            el.addEventListener('click', () => el.classList.toggle('expanded'))
        })
    })
}

function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}
