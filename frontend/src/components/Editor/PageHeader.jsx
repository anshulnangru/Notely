import { useState, useRef, useEffect } from 'react'
import usePagesStore from '../../store/usePagesStore'

const EMOJIS = ['📄', '📝', '📚', '🗒', '📋', '📌', '📎', '🗂', '🏠', '🌟', '🚀', '💡', '🎯', '✅', '🔥', '💎', '🌈', '🎨', '🎭', '🎮', '🎸', '🍀', '🌺', '🐉', '🦋', '🌊', '⚡', '🌙', '☀️', '🎉']

export default function PageHeader({ page }) {
    const { updatePageMeta } = usePagesStore()
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)
    const [title, setTitle] = useState(page.title || '')
    const titleRef = useRef()

    useEffect(() => { setTitle(page.title || '') }, [page.id, page.title])

    const handleTitleBlur = async () => {
        if (title !== page.title) {
            await updatePageMeta(page.id, { title })
        }
    }

    const handleTitleKeyDown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); titleRef.current?.blur() }
    }

    const handleEmojiSelect = async (emoji) => {
        setShowEmojiPicker(false)
        await updatePageMeta(page.id, { emoji })
    }

    // Auto-resize textarea
    const handleTitleChange = (e) => {
        setTitle(e.target.value)
        e.target.style.height = 'auto'
        e.target.style.height = e.target.scrollHeight + 'px'
    }

    return (
        <div className="page-header">
            {page.cover_url && (
                <img src={page.cover_url} alt="cover" className="page-cover" />
            )}

            <div style={{ position: 'relative' }}>
                <div
                    className="page-emoji-large"
                    onClick={() => setShowEmojiPicker(s => !s)}
                    title="Change emoji"
                >
                    {page.emoji || '📄'}
                </div>

                {showEmojiPicker && (
                    <div className="emoji-picker-wrapper fade-in" style={{ position: 'absolute', top: 60, left: 0, zIndex: 200, background: 'var(--bg-modal)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 12, display: 'flex', flexWrap: 'wrap', gap: 6, width: 280, boxShadow: 'var(--shadow-lg)' }}>
                        {EMOJIS.map(e => (
                            <button
                                key={e}
                                onClick={() => handleEmojiSelect(e)}
                                style={{ fontSize: 24, background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4, transition: 'background 150ms' }}
                                onMouseEnter={ev => ev.currentTarget.style.background = 'var(--bg-hover)'}
                                onMouseLeave={ev => ev.currentTarget.style.background = 'none'}
                            >
                                {e}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <textarea
                ref={titleRef}
                className="page-title-input"
                value={title}
                placeholder="Untitled"
                onChange={handleTitleChange}
                onBlur={handleTitleBlur}
                onKeyDown={handleTitleKeyDown}
                rows={1}
            />
        </div>
    )
}
