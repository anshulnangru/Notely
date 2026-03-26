import { useState, useEffect } from 'react'
import client from '../../api/client'
import useAuthStore from '../../store/useAuthStore'

function Avatar({ user, size = 28 }) {
    const letter = (user?.name || user?.email || 'U')[0].toUpperCase()
    return (
        <div className="comment-avatar" style={{ width: size, height: size, fontSize: size * 0.45 }}>
            {letter}
        </div>
    )
}

function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
}

function renderBody(body) {
    // Highlight @mentions
    return body.split(/(@\w+)/g).map((part, i) =>
        part.startsWith('@')
            ? <span key={i} className="comment-mention">{part}</span>
            : <span key={i}>{part}</span>
    )
}

export default function CommentThread({ pageId, taskId }) {
    const { user } = useAuthStore()
    const [comments, setComments] = useState([])
    const [loading, setLoading] = useState(true)
    const [body, setBody] = useState('')
    const [posting, setPosting] = useState(false)
    const [editId, setEditId] = useState(null)
    const [editBody, setEditBody] = useState('')

    const endpoint = pageId ? `/comments/pages/${pageId}` : `/comments/tasks/${taskId}`

    const load = async () => {
        setLoading(true)
        try {
            const res = await client.get(endpoint)
            setComments(res.data)
        } catch { /* ignore */ } finally { setLoading(false) }
    }

    useEffect(() => { load() }, [pageId, taskId])

    const handlePost = async () => {
        if (!body.trim()) return
        setPosting(true)
        try {
            await client.post('/comments', {
                body: body.trim(),
                page_id: pageId || null,
                task_id: taskId || null,
            })
            setBody('')
            await load()
        } finally { setPosting(false) }
    }

    const handleEdit = async (id) => {
        await client.put(`/comments/${id}`, { body: editBody })
        setEditId(null)
        await load()
    }

    const handleDelete = async (id) => {
        if (!confirm('Delete this comment?')) return
        await client.delete(`/comments/${id}`)
        await load()
    }

    return (
        <div className="comment-thread">
            <div className="comment-thread-title">💬 Comments ({comments.length})</div>

            {loading && <div className="comment-loading">Loading comments…</div>}

            <div className="comment-list">
                {comments.map(c => (
                    <div key={c.id} className="comment-item">
                        <Avatar user={c.author} />
                        <div className="comment-content">
                            <div className="comment-header">
                                <span className="comment-author">{c.author?.name || c.author?.email || 'User'}</span>
                                <span className="comment-time">{timeAgo(c.created_at)}</span>
                                {c.author_id === user?.id && (
                                    <div className="comment-actions">
                                        <button className="comment-action-btn" onClick={() => { setEditId(c.id); setEditBody(c.body) }}>Edit</button>
                                        <button className="comment-action-btn danger" onClick={() => handleDelete(c.id)}>Delete</button>
                                    </div>
                                )}
                            </div>
                            {editId === c.id ? (
                                <div className="comment-edit-area">
                                    <textarea
                                        className="comment-input"
                                        value={editBody}
                                        onChange={e => setEditBody(e.target.value)}
                                        rows={2}
                                        autoFocus
                                    />
                                    <div className="comment-edit-actions">
                                        <button className="comment-save-btn" onClick={() => handleEdit(c.id)}>Save</button>
                                        <button className="comment-cancel-btn" onClick={() => setEditId(null)}>Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="comment-body">{renderBody(c.body)}</div>
                            )}
                        </div>
                    </div>
                ))}

                {!loading && comments.length === 0 && (
                    <div className="comment-empty">No comments yet. Be the first!</div>
                )}
            </div>

            {/* New comment input */}
            <div className="comment-compose">
                <Avatar user={user} />
                <div className="comment-compose-input-wrap">
                    <textarea
                        className="comment-input"
                        placeholder="Write a comment… use @name to mention"
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        rows={2}
                        onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handlePost() }}
                    />
                    <div className="comment-compose-footer">
                        <span className="comment-hint">⌘↵ to post</span>
                        <button className="comment-post-btn" onClick={handlePost} disabled={posting || !body.trim()}>
                            {posting ? 'Posting…' : 'Comment'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
