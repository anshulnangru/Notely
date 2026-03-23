// Block.jsx — v3 (calendar + todolist + context menu + markdown shortcuts)
import { useRef, useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import usePagesStore from '../../store/usePagesStore'
import SlashMenu from './SlashMenu'
import BlockMenu from './BlockMenu'

console.log('[Block.jsx v3] loaded')   // ← remove after confirming

// ── Markdown shortcuts ─────────────────────────────
const MD_SHORTCUTS = [
    { pattern: /^# $/, type: 'h1' },
    { pattern: /^## $/, type: 'h2' },
    { pattern: /^### $/, type: 'h3' },
    { pattern: /^- $/, type: 'bullet' },
    { pattern: /^\* $/, type: 'bullet' },
    { pattern: /^1\. $/, type: 'numbered' },
    { pattern: /^\[\] $/, type: 'todo' },
    { pattern: /^> $/, type: 'quote' },
    { pattern: /^```$/, type: 'code' },
    { pattern: /^---$/, type: 'divider' },
]

// ── TodoBlock (single checkbox) ───────────────────
function TodoBlock({ block, onChange, onKeyDown, inputRef }) {
    const { updateBlock } = usePagesStore()
    return (
        <div className="block-todo-row">
            <div
                className={`todo-checkbox ${block.checked ? 'checked' : ''}`}
                onClick={() => updateBlock(block.id, { checked: !block.checked })}
            >
                {block.checked ? '✓' : ''}
            </div>
            <textarea
                ref={inputRef}
                className={`block-editable todo-text ${block.checked ? 'checked' : ''}`}
                value={block.content}
                placeholder="To-do"
                onChange={e => onChange(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                style={{ resize: 'none' }}
            />
        </div>
    )
}

// ── BulletBlock ───────────────────────────────────
function BulletBlock({ block, onChange, onKeyDown, inputRef }) {
    return (
        <div className="block-bullet-row">
            <div className="bullet-marker"><div className="bullet-dot" /></div>
            <textarea
                ref={inputRef}
                className="block-editable"
                value={block.content}
                placeholder="List item"
                onChange={e => onChange(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                style={{ resize: 'none' }}
            />
        </div>
    )
}

// ── NumberedBlock ─────────────────────────────────
function NumberedBlock({ block, numberedIdx, onChange, onKeyDown, inputRef }) {
    return (
        <div className="block-numbered-row">
            <div className="numbered-marker">{numberedIdx + 1}.</div>
            <textarea
                ref={inputRef}
                className="block-editable"
                value={block.content}
                placeholder="List item"
                onChange={e => onChange(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                style={{ resize: 'none' }}
            />
        </div>
    )
}

// ── ToggleBlock ───────────────────────────────────
function ToggleBlock({ block, onChange, onKeyDown, inputRef }) {
    const [open, setOpen] = useState(false)
    return (
        <div className="block-toggle">
            <div className="toggle-header">
                <span className={`toggle-arrow ${open ? 'open' : ''}`} onClick={() => setOpen(o => !o)}>▶</span>
                <textarea
                    ref={inputRef}
                    className="block-editable"
                    value={block.content}
                    placeholder="Toggle"
                    onChange={e => onChange(e.target.value)}
                    onKeyDown={onKeyDown}
                    rows={1}
                    style={{ resize: 'none', flex: 1 }}
                />
            </div>
            {open && (
                <div className="toggle-children">
                    <div style={{ color: 'var(--text-tertiary)', fontSize: 13, padding: '4px 0' }}>
                        Click to add content inside toggle
                    </div>
                </div>
            )}
        </div>
    )
}

// ── CalloutBlock ──────────────────────────────────
const CALLOUT_EMOJIS = ['💡', '⚠️', '✅', '❌', '📌', '🔥', '💬', '📢', '🎯', '🧪']

function CalloutBlock({ block, onChange, onKeyDown, inputRef }) {
    const parts = block.content.includes('|')
        ? [block.content.split('|')[0], block.content.split('|').slice(1).join('|')]
        : ['💡', block.content]
    const [emojiVal, setEmojiVal] = useState(parts[0])
    const [showPicker, setShowPicker] = useState(false)
    const content = parts[1]

    const handleEmojiSelect = (e) => {
        setEmojiVal(e)
        onChange(`${e}|${content}`)
        setShowPicker(false)
    }

    return (
        <div className="block-callout">
            <div style={{ position: 'relative', flexShrink: 0 }}>
                <span className="callout-emoji" onClick={() => setShowPicker(s => !s)}>{emojiVal}</span>
                {showPicker && (
                    <div className="callout-emoji-picker fade-in">
                        {CALLOUT_EMOJIS.map(e => (
                            <button key={e} className="callout-emoji-opt" onMouseDown={ev => { ev.preventDefault(); handleEmojiSelect(e) }}>{e}</button>
                        ))}
                    </div>
                )}
            </div>
            <textarea
                ref={inputRef}
                className="block-editable callout-text"
                value={content}
                placeholder="Callout text..."
                onChange={e => onChange(`${emojiVal}|${e.target.value}`)}
                onKeyDown={onKeyDown}
                rows={1}
                style={{ resize: 'none', flex: 1 }}
            />
        </div>
    )
}

// ── ImageBlock ────────────────────────────────────
function ImageBlock({ block, onChange }) {
    const [inputUrl, setInputUrl] = useState('')
    const [imgError, setImgError] = useState(false)

    // ── URL not yet set → show the form ──
    if (!block.content) {
        return (
            <div className="block-image-placeholder">
                <span className="image-placeholder-icon">🖼</span>
                <form
                    style={{ display: 'flex', gap: 8, flex: 1 }}
                    onSubmit={e => {
                        e.preventDefault()
                        const url = inputUrl.trim()
                        if (url) { onChange(url); setInputUrl('') }
                    }}
                >
                    <input
                        className="image-url-input"
                        type="text"
                        placeholder="Paste image URL and press Enter…"
                        value={inputUrl}
                        onChange={e => setInputUrl(e.target.value)}
                        autoFocus
                    />
                    <button type="submit" className="image-url-btn">Embed</button>
                </form>
            </div>
        )
    }

    // ── URL is set → show the image ──
    return (
        <div className="block-image-wrap">
            {imgError ? (
                <div className="block-image-error">
                    ⚠️ Could not load image.
                    <button className="image-change-url-btn" onClick={() => { onChange(''); setImgError(false) }}>
                        Change URL
                    </button>
                </div>
            ) : (
                <img
                    src={block.content}
                    alt="Embedded image"
                    className="block-image"
                    onLoad={() => setImgError(false)}
                    onError={() => setImgError(true)}
                />
            )}
            {!imgError && (
                <div className="block-image-overlay">
                    <button className="image-change-url-btn" onClick={() => { onChange(''); setInputUrl(block.content); setImgError(false) }}>
                        ✎ Change URL
                    </button>
                </div>
            )}
        </div>
    )
}

// ── CalendarBlock ─────────────────────────────────
const CAL_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const CAL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function CalendarBlock({ block, onChange }) {
    const today = new Date()
    const parse = () => { try { return JSON.parse(block.content || '{}') } catch { return {} } }
    const data = parse()

    const [year, setYear] = useState(data.year ?? today.getFullYear())
    const [month, setMonth] = useState(data.month ?? today.getMonth())
    const [selected, setSelected] = useState(null)
    const [inputVal, setInputVal] = useState('')

    const save = (patch) => onChange(JSON.stringify({ ...parse(), ...patch }))

    const prevMonth = () => {
        if (month === 0) { setYear(y => y - 1); setMonth(11); save({ year: year - 1, month: 11 }) }
        else { setMonth(m => m - 1); save({ year, month: month - 1 }) }
    }
    const nextMonth = () => {
        if (month === 11) { setYear(y => y + 1); setMonth(0); save({ year: year + 1, month: 0 }) }
        else { setMonth(m => m + 1); save({ year, month: month + 1 }) }
    }

    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
    while (cells.length % 7 !== 0) cells.push(null)

    const events = data.events || {}
    const pad = n => String(n).padStart(2, '0')
    const toKey = d => `${year}-${pad(month + 1)}-${pad(d)}`
    const todayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`

    const addEvent = e => {
        e.preventDefault()
        if (!inputVal.trim() || !selected) return
        const ev = { ...events, [selected]: [...(events[selected] || []), inputVal.trim()] }
        save({ year, month, events: ev })
        setInputVal('')
    }

    const removeEvent = (key, idx) => {
        const list = (events[key] || []).filter((_, i) => i !== idx)
        const ev = { ...events }
        if (list.length === 0) delete ev[key]
        else ev[key] = list
        save({ year, month, events: ev })
    }

    return (
        <div className="block-calendar">
            <div className="cal-header">
                <button className="cal-nav-btn" onClick={prevMonth}>‹</button>
                <span className="cal-month-label">{CAL_MONTHS[month]} {year}</span>
                <button className="cal-nav-btn" onClick={nextMonth}>›</button>
            </div>
            <div className="cal-grid">
                {CAL_DAYS.map(d => <div key={d} className="cal-day-label">{d}</div>)}
                {cells.map((day, i) => {
                    const key = day ? toKey(day) : null
                    const isToday = key === todayKey
                    const isSelected = key === selected
                    const hasEvents = key && (events[key]?.length > 0)
                    return (
                        <div
                            key={i}
                            className={['cal-cell', !day ? 'cal-empty' : '', isToday ? 'cal-today' : '', isSelected ? 'cal-selected' : ''].join(' ')}
                            onClick={() => day && setSelected(isSelected ? null : key)}
                        >
                            {day && <span className="cal-day-num">{day}</span>}
                            {hasEvents && <span className="cal-dot" />}
                        </div>
                    )
                })}
            </div>
            {selected && (
                <div className="cal-event-panel fade-in">
                    <div className="cal-event-date">{selected}</div>
                    {(!events[selected] || events[selected].length === 0) && (
                        <div className="cal-no-events">No events yet. Add one below.</div>
                    )}
                    {(events[selected] || []).map((ev, i) => (
                        <div key={i} className="cal-event-item">
                            <span className="cal-event-dot">•</span>
                            <span className="cal-event-text">{ev}</span>
                            <button className="cal-event-del" onClick={() => removeEvent(selected, i)}>✕</button>
                        </div>
                    ))}
                    <form onSubmit={addEvent} className="cal-event-form">
                        <input className="cal-event-input" placeholder="Add event or note..." value={inputVal} onChange={e => setInputVal(e.target.value)} autoFocus />
                        <button type="submit" className="cal-event-add-btn">+</button>
                    </form>
                </div>
            )}
        </div>
    )
}

// ── TodoListBlock ─────────────────────────────────
let _uid = 0
const uid = () => `tl${++_uid}_${Date.now()}`

function TodoListBlock({ block, onChange }) {
    const parse = () => {
        try {
            const d = JSON.parse(block.content || '{}')
            return { title: d.title ?? 'Task List', items: d.items ?? [] }
        } catch { return { title: 'Task List', items: [] } }
    }
    const data = parse()
    const save = patch => onChange(JSON.stringify({ ...parse(), ...patch }))

    const addItem = () => save({ items: [...data.items, { id: uid(), text: '', done: false }] })
    const updateItem = (id, patch) => save({ items: data.items.map(it => it.id === id ? { ...it, ...patch } : it) })
    const removeItem = (id) => save({ items: data.items.filter(it => it.id !== id) })

    const done = data.items.filter(i => i.done).length
    const pct = data.items.length ? Math.round((done / data.items.length) * 100) : 0

    return (
        <div className="block-todolist">
            <div className="tl-header">
                <input className="tl-title" value={data.title} placeholder="Task List" onChange={e => save({ title: e.target.value })} />
                <span className="tl-progress-label">{done}/{data.items.length}</span>
            </div>
            {data.items.length > 0 && (
                <div className="tl-progress-wrap">
                    <div className="tl-progress-bar" style={{ width: `${pct}%` }} />
                </div>
            )}
            <div className="tl-items">
                {data.items.map(item => (
                    <div key={item.id} className="tl-item">
                        <div className={`tl-checkbox ${item.done ? 'checked' : ''}`} onClick={() => updateItem(item.id, { done: !item.done })}>
                            {item.done ? '✓' : ''}
                        </div>
                        <input
                            className={`tl-item-input ${item.done ? 'done' : ''}`}
                            value={item.text}
                            placeholder="Task..."
                            onChange={e => updateItem(item.id, { text: e.target.value })}
                            onKeyDown={e => {
                                if (e.key === 'Enter') { e.preventDefault(); addItem() }
                                if (e.key === 'Backspace' && item.text === '') { e.preventDefault(); removeItem(item.id) }
                            }}
                        />
                        <button className="tl-del-btn" onClick={() => removeItem(item.id)}>✕</button>
                    </div>
                ))}
            </div>
            <button className="tl-add-btn" onClick={addItem}>+ Add task</button>
        </div>
    )
}

// ── Kanban Board Block ─────────────────────────
const LABEL_META = {
    High:   { color: '#ef4444', bg: '#fef2f2' },
    Medium: { color: '#f59e0b', bg: '#fffbeb' },
    Low:    { color: '#22c55e', bg: '#f0fdf4' },
}

function KanbanCard({ card, allCols, colId, onUpdate, onDelete, onMove }) {
    const [hover, setHover] = useState(false)
    const lm = LABEL_META[card.label] || null

    return (
        <div className="kanban-card" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
            {lm && (
                <span className="kanban-badge" style={{ color: lm.color, background: lm.bg, border: `1px solid ${lm.color}44` }}>
                    {card.label}
                </span>
            )}
            <textarea
                className="kanban-card-text"
                value={card.title}
                placeholder="Card title..."
                onChange={e => onUpdate({ title: e.target.value })}
                rows={1}
            />
            {hover && (
                <div className="kanban-card-row">
                    <select className="kanban-label-sel" value={card.label || ''} onChange={e => onUpdate({ label: e.target.value })}>
                        <option value="">No label</option>
                        <option value="High">🔴 High</option>
                        <option value="Medium">🟡 Medium</option>
                        <option value="Low">🟢 Low</option>
                    </select>
                    {allCols.filter(c => c.id !== colId).length > 0 && (
                        <select className="kanban-move-sel" value="" onChange={e => e.target.value && onMove(e.target.value)}>
                            <option value="">Move to…</option>
                            {allCols.filter(c => c.id !== colId).map(c => (
                                <option key={c.id} value={c.id}>{c.title}</option>
                            ))}
                        </select>
                    )}
                    <button className="kanban-del-card-btn" onClick={onDelete} title="Delete card">🗑</button>
                </div>
            )}
        </div>
    )
}

function KanbanColumn({ col, allCols, onUpdateCol, onDeleteCol, onAddCard, onUpdateCard, onDeleteCard, onMoveCard }) {
    const [editTitle, setEditTitle] = useState(false)
    const [titleVal, setTitleVal] = useState(col.title)

    const commitTitle = () => { onUpdateCol({ title: titleVal }); setEditTitle(false) }

    return (
        <div className="kanban-col">
            <div className="kanban-col-header">
                <span className="kanban-col-dot" style={{ background: col.color }} />
                {editTitle ? (
                    <input
                        className="kanban-col-title-input"
                        value={titleVal}
                        autoFocus
                        onChange={e => setTitleVal(e.target.value)}
                        onBlur={commitTitle}
                        onKeyDown={e => { if (e.key === 'Enter') commitTitle() }}
                    />
                ) : (
                    <span className="kanban-col-title" onClick={() => setEditTitle(true)}>{col.title}</span>
                )}
                <span className="kanban-col-count">{col.cards.length}</span>
                <button className="kanban-del-col-btn" onClick={onDeleteCol} title="Delete column">✕</button>
            </div>

            <div className="kanban-cards">
                {col.cards.map(card => (
                    <KanbanCard
                        key={card.id}
                        card={card}
                        allCols={allCols}
                        colId={col.id}
                        onUpdate={patch => onUpdateCard(card.id, patch)}
                        onDelete={() => onDeleteCard(card.id)}
                        onMove={toColId => onMoveCard(card.id, toColId)}
                    />
                ))}
            </div>

            <button className="kanban-add-card-btn" onClick={onAddCard}>+ New card</button>
        </div>
    )
}

let _kid = 0
const kid = () => `k${++_kid}_${Date.now()}`

function KanbanBlock({ block, onChange }) {
    const parse = () => {
        try {
            const d = JSON.parse(block.content || '{}')
            if (!d.columns) throw new Error()
            return d
        } catch {
            return {
                columns: [
                    { id: 'c1', title: 'Not started', color: '#6b7280', cards: [] },
                    { id: 'c2', title: 'In progress',  color: '#3b82f6', cards: [] },
                    { id: 'c3', title: 'Done',          color: '#22c55e', cards: [] },
                ]
            }
        }
    }

    const save = (cols) => onChange(JSON.stringify({ columns: cols }))
    const d = parse()

    const addCard = (colId) => save(d.columns.map(col =>
        col.id === colId ? { ...col, cards: [...col.cards, { id: kid(), title: '', label: '' }] } : col
    ))

    const updateCard = (colId, cardId, patch) => save(d.columns.map(col =>
        col.id === colId ? { ...col, cards: col.cards.map(c => c.id === cardId ? { ...c, ...patch } : c) } : col
    ))

    const deleteCard = (colId, cardId) => save(d.columns.map(col =>
        col.id === colId ? { ...col, cards: col.cards.filter(c => c.id !== cardId) } : col
    ))

    const moveCard = (fromColId, cardId, toColId) => {
        let card = null
        const cols = d.columns
            .map(col => {
                if (col.id === fromColId) { card = col.cards.find(c => c.id === cardId); return { ...col, cards: col.cards.filter(c => c.id !== cardId) } }
                return col
            })
            .map(col => col.id === toColId && card ? { ...col, cards: [...col.cards, card] } : col)
        save(cols)
    }

    const updateColumn = (colId, patch) => save(d.columns.map(col => col.id === colId ? { ...col, ...patch } : col))
    const deleteColumn = (colId) => save(d.columns.filter(col => col.id !== colId))
    const addColumn = () => save([...d.columns, { id: kid(), title: 'New section', color: '#8b5cf6', cards: [] }])

    return (
        <div className="block-kanban">
            <div className="kanban-board">
                {d.columns.map(col => (
                    <KanbanColumn
                        key={col.id}
                        col={col}
                        allCols={d.columns}
                        onUpdateCol={patch => updateColumn(col.id, patch)}
                        onDeleteCol={() => deleteColumn(col.id)}
                        onAddCard={() => addCard(col.id)}
                        onUpdateCard={(cid, patch) => updateCard(col.id, cid, patch)}
                        onDeleteCard={cid => deleteCard(col.id, cid)}
                        onMoveCard={(cid, toColId) => moveCard(col.id, cid, toColId)}
                    />
                ))}
                <button className="kanban-add-col-btn" onClick={addColumn}>+ Add section</button>
            </div>
        </div>
    )
}

// ── Table Block ───────────────────────────────
function TableBlock({ block, onChange }) {
    const parse = () => {
        try {
            const d = JSON.parse(block.content || '{}')
            const rows = d.rows ?? 3
            const cols = d.cols ?? 3
            // ensure data matrix is correct size
            const data = Array.from({ length: rows }, (_, r) =>
                Array.from({ length: cols }, (_, c) => d.data?.[r]?.[c] ?? '')
            )
            return { rows, cols, data, hasHeader: d.hasHeader ?? true }
        } catch {
            return { rows: 3, cols: 3, data: [['','',''],['','',''],['','','']], hasHeader: true }
        }
    }
    const d = parse()

    const save = (patch) => onChange(JSON.stringify({ ...parse(), ...patch }))

    const updateCell = (r, c, val) => {
        const data = parse().data
        data[r][c] = val
        save({ data })
    }

    const addRow = () => {
        const { rows, cols, data } = parse()
        save({ rows: rows + 1, cols, data: [...data, Array(cols).fill('')] })
    }

    const addCol = () => {
        const { rows, cols, data } = parse()
        save({ rows, cols: cols + 1, data: data.map(row => [...row, '']) })
    }

    const removeRow = (idx) => {
        const { rows, cols, data } = parse()
        if (rows <= 1) return
        save({ rows: rows - 1, cols, data: data.filter((_, i) => i !== idx) })
    }

    const removeCol = (idx) => {
        const { rows, cols, data } = parse()
        if (cols <= 1) return
        save({ rows, cols: cols - 1, data: data.map(row => row.filter((_, i) => i !== idx)) })
    }

    return (
        <div className="block-table-wrap">
            <div className="block-table-scroll">
                <table className="block-table">
                    <tbody>
                        {d.data.map((row, r) => (
                            <tr key={r} className={r === 0 && d.hasHeader ? 'tbl-header-row' : ''}>
                                {row.map((cell, c) => (
                                    <td key={c} className="tbl-cell">
                                        <input
                                            className={`tbl-cell-input ${r === 0 && d.hasHeader ? 'tbl-header-cell' : ''}`}
                                            value={cell}
                                            placeholder={r === 0 && d.hasHeader ? `Column ${c + 1}` : ''}
                                            onChange={e => updateCell(r, c, e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Tab') {
                                                    e.preventDefault()
                                                    // Move to next cell
                                                    const nextC = c + 1
                                                    const nextR = r + (nextC >= d.cols ? 1 : 0)
                                                    const nc = nextC >= d.cols ? 0 : nextC
                                                    if (nextR < d.rows) {
                                                        const next = document.querySelector(`[data-cell="${nextR}-${nc}"]`)
                                                        next?.focus()
                                                    } else {
                                                        addRow()
                                                    }
                                                }
                                            }}
                                            data-cell={`${r}-${c}`}
                                        />
                                    </td>
                                ))}
                                <td className="tbl-row-del-cell">
                                    <button className="tbl-del-btn" title="Delete row" onClick={() => removeRow(r)}>✕</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Column delete row */}
                <div className="tbl-col-controls">
                    {d.data[0]?.map((_, c) => (
                        <div key={c} className="tbl-col-del-wrap">
                            <button className="tbl-del-btn" title="Delete column" onClick={() => removeCol(c)}>✕</button>
                        </div>
                    ))}
                    <div className="tbl-col-del-wrap" />
                </div>
            </div>

            {/* Control buttons */}
            <div className="tbl-controls">
                <button className="tbl-add-btn" onClick={addRow}>+ Add row</button>
                <button className="tbl-add-btn" onClick={addCol}>+ Add column</button>
                <label className="tbl-header-toggle">
                    <input type="checkbox" checked={d.hasHeader} onChange={e => save({ hasHeader: e.target.checked })} />
                    Header row
                </label>
            </div>
        </div>
    )
}

// ── Main Block Component ──────────────────────────
export default function Block({ block, pageId, idx, numberedIdx, focusNext, focusPrev }) {
    const { updateBlock, deleteBlock, createBlock } = usePagesStore()
    const inputRef = useRef()
    const menuBtnRef = useRef()
    const [slashState, setSlashState] = useState(null)
    const [showMenu, setShowMenu] = useState(false)
    const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })

    // Close menu on scroll
    useEffect(() => {
        if (!showMenu) return
        const close = () => setShowMenu(false)
        window.addEventListener('scroll', close, true)
        return () => window.removeEventListener('scroll', close, true)
    }, [showMenu])

    const openMenu = (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (showMenu) { setShowMenu(false); return }
        const rect = menuBtnRef.current?.getBoundingClientRect()
        if (rect) {
            setMenuPos({ top: rect.bottom + 4, left: Math.max(4, rect.right - 180) })
        }
        setShowMenu(true)
    }

    const autoResize = () => {
        const el = inputRef.current
        if (!el) return
        el.style.height = 'auto'
        el.style.height = el.scrollHeight + 'px'
    }

    const handleContentChange = useCallback(async (val) => {
        autoResize()

        // Markdown shortcut detection
        const shortcut = MD_SHORTCUTS.find(s => s.pattern.test(val))
        if (shortcut) {
            const startContent = shortcut.type === 'callout' ? '💡|' : ''
            await updateBlock(block.id, { type: shortcut.type, content: startContent })
            setTimeout(() => inputRef.current?.focus(), 30)
            return
        }

        // Slash menu detection
        const slashIdx = val.lastIndexOf('/')
        if (slashIdx !== -1 && !val.slice(slashIdx + 1).includes(' ')) {
            const query = val.slice(slashIdx + 1)
            const rect = inputRef.current?.getBoundingClientRect()
            setSlashState({ query, slashIdx, rect })
        } else {
            setSlashState(null)
        }

        await updateBlock(block.id, { content: val })
    }, [block.id, updateBlock])

    const handleKeyDown = async (e) => {
        if (slashState && ['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key)) return

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            const newBlock = await createBlock(pageId, block.order, 'text')
            setTimeout(() => focusNext(newBlock?.id), 80)
        } else if (e.key === 'Backspace' && block.content === '' && idx > 0) {
            e.preventDefault()
            await deleteBlock(block.id, pageId)
            setTimeout(() => focusPrev(), 80)
        } else if (e.key === 'ArrowUp') {
            const el = inputRef.current
            if (el && el.selectionStart === 0) { e.preventDefault(); focusPrev() }
        } else if (e.key === 'ArrowDown') {
            const el = inputRef.current
            if (el && el.selectionStart === el.value.length) { e.preventDefault(); focusNext() }
        }
    }

    const handleSlashSelect = async (type) => {
        setSlashState(null)
        const base = block.content.slice(0, slashState?.slashIdx ?? block.content.length)
        let startContent = ''
        if (type === 'divider') { await updateBlock(block.id, { type: 'divider', content: '' }); return }
        if (type === 'callout') startContent = `💡|${base}`
        else if (type === 'calendar') startContent = '{}'
        else if (type === 'todolist') startContent = '{}'
        else startContent = base
        await updateBlock(block.id, { type, content: startContent })
        setTimeout(() => inputRef.current?.focus(), 50)
    }

    const cProps = { block, onChange: handleContentChange, onKeyDown: handleKeyDown, inputRef }

    const slashPos = slashState?.rect
        ? { top: slashState.rect.bottom + window.scrollY + 4, left: slashState.rect.left + window.scrollX }
        : { top: 0, left: 0 }

    const renderContent = () => {
        switch (block.type) {
            case 'h1': return <textarea ref={inputRef} className="block-editable block-h1" value={block.content} placeholder="Heading 1" onChange={e => handleContentChange(e.target.value)} onKeyDown={handleKeyDown} rows={1} style={{ resize: 'none' }} />
            case 'h2': return <textarea ref={inputRef} className="block-editable block-h2" value={block.content} placeholder="Heading 2" onChange={e => handleContentChange(e.target.value)} onKeyDown={handleKeyDown} rows={1} style={{ resize: 'none' }} />
            case 'h3': return <textarea ref={inputRef} className="block-editable block-h3" value={block.content} placeholder="Heading 3" onChange={e => handleContentChange(e.target.value)} onKeyDown={handleKeyDown} rows={1} style={{ resize: 'none' }} />
            case 'todo': return <TodoBlock {...cProps} />
            case 'bullet': return <BulletBlock {...cProps} />
            case 'numbered': return <NumberedBlock {...cProps} numberedIdx={numberedIdx} />
            case 'toggle': return <ToggleBlock {...cProps} />
            case 'callout': return <CalloutBlock {...cProps} />
            case 'image': return <ImageBlock block={block} onChange={val => updateBlock(block.id, { content: val })} />
            case 'calendar': return <CalendarBlock block={block} onChange={val => updateBlock(block.id, { content: val })} />
            case 'todolist': return <TodoListBlock block={block} onChange={val => updateBlock(block.id, { content: val })} />
            case 'table':    return <TableBlock block={block} onChange={val => updateBlock(block.id, { content: val })} />
            case 'kanban':   return <KanbanBlock block={block} onChange={val => updateBlock(block.id, { content: val })} />
            case 'divider': return <hr className="block-divider" />
            case 'quote': return <textarea ref={inputRef} className="block-editable block-quote" value={block.content} placeholder="Quote" onChange={e => handleContentChange(e.target.value)} onKeyDown={handleKeyDown} rows={1} style={{ resize: 'none' }} />
            case 'code': return <textarea ref={inputRef} className="block-editable block-code" value={block.content} placeholder="// Code..." onChange={e => handleContentChange(e.target.value)} onKeyDown={handleKeyDown} rows={1} style={{ resize: 'none' }} spellCheck={false} />
            default: return <textarea ref={inputRef} className="block-editable" value={block.content} placeholder="Type '/' for commands..." onChange={e => handleContentChange(e.target.value)} onKeyDown={handleKeyDown} rows={1} style={{ resize: 'none' }} />
        }
    }

    return (
        <div className="block-row" id={`block-${block.id}`}>
            <span className="block-drag-handle" title="Drag to reorder">⠿</span>
            <div className="block-content">
                {renderContent()}
                {slashState && (
                    <SlashMenu
                        position={slashPos}
                        query={slashState.query}
                        onSelect={handleSlashSelect}
                        onClose={() => setSlashState(null)}
                    />
                )}
            </div>

            {/* ⋮ menu button — always visible, full opacity on hover */}
            <button
                ref={menuBtnRef}
                className="block-menu-btn"
                title="Block options"
                onMouseDown={openMenu}
            >
                ⋮
            </button>

            {/* Menu rendered in a portal at body level — never clipped */}
            {showMenu && createPortal(
                <BlockMenu
                    block={block}
                    pageId={pageId}
                    position={menuPos}
                    onClose={() => setShowMenu(false)}
                />,
                document.body
            )}
        </div>
    )
}
