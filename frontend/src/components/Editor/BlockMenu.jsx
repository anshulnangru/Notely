import { useState, useRef, useEffect } from 'react'
import usePagesStore from '../../store/usePagesStore'

const TURN_INTO_TYPES = [
  { type: 'text',     icon: '¶',   label: 'Text' },
  { type: 'h1',       icon: 'H1',  label: 'Heading 1' },
  { type: 'h2',       icon: 'H2',  label: 'Heading 2' },
  { type: 'h3',       icon: 'H3',  label: 'Heading 3' },
  { type: 'todo',     icon: '☑',   label: 'To-do' },
  { type: 'bullet',   icon: '•',   label: 'Bullet List' },
  { type: 'numbered', icon: '1.',  label: 'Numbered List' },
  { type: 'toggle',   icon: '▶',   label: 'Toggle' },
  { type: 'callout',  icon: '💡',  label: 'Callout' },
  { type: 'quote',    icon: '"',   label: 'Quote' },
  { type: 'code',     icon: '</>',  label: 'Code' },
  { type: 'image',    icon: '🖼',  label: 'Image' },
  { type: 'table',    icon: '⊞',   label: 'Table' },
  { type: 'kanban',   icon: '⛶',   label: 'Board (Kanban)' },
  { type: 'todolist', icon: '☑️',  label: 'Task List' },
  { type: 'calendar', icon: '📅',  label: 'Calendar' },
  { type: 'divider',  icon: '—',   label: 'Divider' },
]

const INSERT_TYPES = [
  { type: 'kanban',   icon: '⛶',  label: 'Board (Kanban)' },
  { type: 'table',    icon: '⊞',  label: 'Table' },
  { type: 'calendar', icon: '📅', label: 'Calendar' },
  { type: 'todolist', icon: '☑️', label: 'Task List' },
  { type: 'callout',  icon: '💡', label: 'Callout' },
  { type: 'image',    icon: '🖼', label: 'Image' },
  { type: 'divider',  icon: '—',  label: 'Divider' },
]

export default function BlockMenu({ block, pageId, position, menuRef, onClose }) {
  const ref = useRef()
  const { updateBlock, deleteBlock, duplicateBlock, createBlock } = usePagesStore()
  const [view, setView] = useState('main') // 'main' | 'turnInto' | 'insertBelow'

  // Sync menuRef for the scroll listener in Block.jsx
  useEffect(() => {
    if (menuRef) menuRef.current = ref.current
  }, [menuRef])

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const handleTurnInto = async (type) => {
    const containerTypes = ['calendar', 'todolist', 'table', 'kanban']
    const content = containerTypes.includes(type)
      ? '{}'
      : type === 'callout' ? '💡|' + block.content
      : type === 'divider' ? ''
      : block.content
    await updateBlock(block.id, { type, content })
    onClose()
  }

  const handleInsertBelow = async (type) => {
    const content = type === 'calendar' || type === 'todolist' || type === 'table' ? '{}' :
                    type === 'callout' ? '💡|' : ''
    await createBlock(pageId, block.order, type, content)
    onClose()
  }

  const handleDuplicate = async () => {
    await duplicateBlock(block.id, pageId)
    onClose()
  }

  const handleDelete = async () => {
    await deleteBlock(block.id, pageId)
    onClose()
  }

  const BackBtn = ({ label = '‹ Back' }) => (
    <button className="ctx-menu-item ctx-back" onMouseDown={e => { e.preventDefault(); setView('main') }}>
      {label}
    </button>
  )

  return (
    <div
      ref={ref}
      className="block-context-menu fade-in"
      style={{ position: 'fixed', top: position?.top ?? 0, left: position?.left ?? 0, zIndex: 9999 }}
    >
      {view === 'main' && (
        <>
          <div className="ctx-section-label">Actions</div>
          <button className="ctx-menu-item" onMouseDown={e => { e.preventDefault(); handleDuplicate() }}>
            <span className="ctx-icon">⧉</span> Duplicate block
          </button>
          <button className="ctx-menu-item" onMouseDown={e => { e.preventDefault(); setView('turnInto') }}>
            <span className="ctx-icon">↺</span> Turn into <span className="ctx-arrow">›</span>
          </button>

          <div className="ctx-divider" />
          <div className="ctx-section-label">Insert below</div>

          {INSERT_TYPES.map(bt => (
            <button key={bt.type} className="ctx-menu-item" onMouseDown={e => { e.preventDefault(); handleInsertBelow(bt.type) }}>
              <span className="ctx-icon">{bt.icon}</span> {bt.label}
            </button>
          ))}

          <div className="ctx-divider" />
          <button className="ctx-menu-item ctx-danger" onMouseDown={e => { e.preventDefault(); handleDelete() }}>
            <span className="ctx-icon">🗑</span> Delete block
          </button>
        </>
      )}

      {view === 'turnInto' && (
        <>
          <BackBtn />
          <div className="ctx-divider" />
          {TURN_INTO_TYPES.filter(bt => bt.type !== block.type).map(bt => (
            <button key={bt.type} className="ctx-menu-item" onMouseDown={e => { e.preventDefault(); handleTurnInto(bt.type) }}>
              <span className="ctx-icon">{bt.icon}</span> {bt.label}
            </button>
          ))}
        </>
      )}
    </div>
  )
}
