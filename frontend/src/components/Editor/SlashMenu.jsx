import { useState, useEffect } from 'react'

export const BLOCK_TYPES = [
    { type: 'text', icon: '¶', label: 'Text', desc: 'Plain paragraph' },
    { type: 'h1', icon: 'H1', label: 'Heading 1', desc: 'Large heading' },
    { type: 'h2', icon: 'H2', label: 'Heading 2', desc: 'Medium heading' },
    { type: 'h3', icon: 'H3', label: 'Heading 3', desc: 'Small heading' },
    { type: 'todo', icon: '☑', label: 'To-do', desc: 'Checkbox task' },
    { type: 'bullet', icon: '•', label: 'Bullet list', desc: 'Unordered list' },
    { type: 'numbered', icon: '1.', label: 'Numbered list', desc: 'Ordered list' },
    { type: 'toggle', icon: '▶', label: 'Toggle', desc: 'Collapsible block' },
    { type: 'callout', icon: '💡', label: 'Callout', desc: 'Highlighted callout box' },
    { type: 'quote', icon: '"', label: 'Quote', desc: 'Block quote' },
    { type: 'code', icon: '</>', label: 'Code', desc: 'Code snippet' },
    { type: 'image', icon: '🖼', label: 'Image', desc: 'Embed an image by URL' },
    { type: 'table',    icon: '⊞',  label: 'Table',    desc: 'Grid with rows and columns' },
    { type: 'kanban',   icon: '⛶',  label: 'Board',    desc: 'Kanban board with cards and columns' },
    { type: 'calendar', icon: '📅', label: 'Calendar', desc: 'Monthly calendar with events' },
    { type: 'todolist', icon: '☑️', label: 'Task List', desc: 'Checklist with progress bar' },
    { type: 'divider',  icon: '—',  label: 'Divider',  desc: 'Horizontal rule' },
]

export default function SlashMenu({ position, onSelect, onClose, query }) {
    const [selected, setSelected] = useState(0)

    const filtered = query
        ? BLOCK_TYPES.filter(b =>
            b.label.toLowerCase().includes(query.toLowerCase()) ||
            b.type.includes(query.toLowerCase())
        )
        : BLOCK_TYPES

    useEffect(() => { setSelected(0) }, [query])

    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, filtered.length - 1)) }
            if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
            if (e.key === 'Enter') { e.preventDefault(); if (filtered[selected]) onSelect(filtered[selected].type) }
            if (e.key === 'Escape') { onClose() }
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [filtered, selected, onSelect, onClose])

    if (filtered.length === 0) { onClose(); return null }

    return (
        <div className="slash-menu fade-in" style={{ top: position.top, left: position.left }}>
            <div className="slash-menu-header">Block types</div>
            {filtered.map((bt, i) => (
                <div
                    key={bt.type}
                    className={`slash-menu-item ${i === selected ? 'selected' : ''}`}
                    onMouseDown={(e) => { e.preventDefault(); onSelect(bt.type) }}
                    onMouseEnter={() => setSelected(i)}
                >
                    <div className="slash-menu-icon">{bt.icon}</div>
                    <div>
                        <div className="slash-menu-label">{bt.label}</div>
                        <div className="slash-menu-desc">{bt.desc}</div>
                    </div>
                </div>
            ))}
        </div>
    )
}
