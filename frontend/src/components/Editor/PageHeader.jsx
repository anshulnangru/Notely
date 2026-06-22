import { useState, useRef, useEffect } from 'react'
import usePagesStore from '../../store/usePagesStore'
import usePresenceStore from '../../store/usePresenceStore'
import { pagesApi } from '../../api/pages'

const EMOJIS = ['📄', '📝', '📚', '🗒', '📋', '📌', '📎', '🗂', '🏠', '🌟', '🚀', '💡', '🎯', '✅', '🔥', '💎', '🌈', '🎨', '🎭', '🎮', '🎸', '🍀', '🌺', '🐉', '🦋', '🌊', '⚡', '🌙', '☀️', '🎉']

export default function PageHeader({ page }) {
    const { updatePageMeta, currentPageRole } = usePagesStore()
    const participants = usePresenceStore(s => s.participants)
    const selfSessionId = usePresenceStore(s => s.selfSessionId)
    const connectionState = usePresenceStore(s => s.connectionState)
    const connectionMessage = usePresenceStore(s => s.connectionMessage)
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)
    const [showShareModal, setShowShareModal] = useState(false)
    const [permissions, setPermissions] = useState([])
    const [pendingInvites, setPendingInvites] = useState([])
    const [currentUserRole, setCurrentUserRole] = useState('viewer')
    const [shareEmail, setShareEmail] = useState('')
    const [shareRole, setShareRole] = useState('viewer')
    const [sharing, setSharing] = useState(false)
    const [permissionsLoading, setPermissionsLoading] = useState(false)
    const [shareError, setShareError] = useState('')
    const [shareMessage, setShareMessage] = useState('')
    const [shareMessageTone, setShareMessageTone] = useState('success')
    const [title, setTitle] = useState(page.title || '')
    const titleRef = useRef()

    useEffect(() => { setTitle(page.title || '') }, [page.id, page.title])

    const handleTitleBlur = async () => {
        if (!['owner', 'editor'].includes(currentPageRole)) return
        if (title !== page.title) {
            await updatePageMeta(page.id, { title })
        }
    }

    const handleTitleKeyDown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); titleRef.current?.blur() }
    }

    const handleEmojiSelect = async (emoji) => {
        if (!['owner', 'editor'].includes(currentPageRole)) return
        setShowEmojiPicker(false)
        await updatePageMeta(page.id, { emoji })
    }

    // Auto-resize textarea
    const handleTitleChange = (e) => {
        setTitle(e.target.value)
        e.target.style.height = 'auto'
        e.target.style.height = e.target.scrollHeight + 'px'
    }

    const peers = participants.filter(p => p.sessionId !== selfSessionId)
    const connectionLabel = connectionState === 'connected'
        ? `${peers.length + 1} live`
        : connectionState === 'connecting'
            ? 'Connecting...'
            : 'Offline'

    const openShareModal = async () => {
        setShowShareModal(true)
        setPermissionsLoading(true)
        setShareError('')
        setShareMessage('')
        setShareMessageTone('success')
        try {
            const data = await pagesApi.getPermissions(page.id)
            setPermissions(data.permissions || [])
            setPendingInvites(data.pending_invites || [])
            setCurrentUserRole(data.current_user_role || 'viewer')
        } catch (err) {
            setShareError(err?.response?.data?.detail || 'Could not load sharing settings')
        } finally {
            setPermissionsLoading(false)
        }
    }

    const handleShare = async (e) => {
        e.preventDefault()
        if (!shareEmail.trim()) return
        setSharing(true)
        setShareError('')
        setShareMessage('')
        setShareMessageTone('success')
        try {
            const result = await pagesApi.grantPermission(page.id, {
                email: shareEmail.trim(),
                role: shareRole,
            })
            if (result.permission) {
                setPermissions(prev => {
                    const others = prev.filter(p => p.id !== result.permission.id && p.subject_id !== result.permission.subject_id)
                    return [...others, result.permission]
                })
            }
            if (result.invite) {
                setPendingInvites(prev => {
                    const others = prev.filter(invite => invite.id !== result.invite.id && invite.email !== result.invite.email)
                    return [result.invite, ...others]
                })
            }
            setShareMessageTone(result.email_sent ? 'success' : 'warning')
            setShareMessage(
                result.email_sent
                    ? (result.access_granted
                        ? 'Access granted and invite email sent successfully.'
                        : 'Invite created successfully and email sent. The recipient can sign up with that email to gain access.')
                    : (result.access_granted
                        ? `Access granted, but the invite email was not sent because the server email provider is not configured. ${result.email_error ? `Details: ${result.email_error}` : ''}`.trim()
                        : `Invite created, but the email was not sent because the server email provider is not configured. The recipient will still receive access automatically after signing up with this email. ${result.email_error ? `Details: ${result.email_error}` : ''}`.trim())
            )
            setShareEmail('')
        } catch (err) {
            setShareError(err?.response?.data?.detail || 'Could not share this page')
        } finally {
            setSharing(false)
        }
    }

    const handleRevoke = async (permissionId) => {
        try {
            await pagesApi.revokePermission(page.id, permissionId)
            setPermissions(prev => prev.filter(permission => permission.id !== permissionId))
        } catch (err) {
            setShareError(err?.response?.data?.detail || 'Could not remove access')
        }
    }

    const handlePermissionRoleChange = async (permissionId, nextRole) => {
        try {
            const updated = await pagesApi.updatePermission(page.id, permissionId, { role: nextRole })
            setPermissions(prev => prev.map(permission => permission.id === permissionId ? updated : permission))
        } catch (err) {
            setShareError(err?.response?.data?.detail || 'Could not update access')
        }
    }

    const handleInviteRoleChange = async (inviteId, nextRole) => {
        try {
            const updated = await pagesApi.updateInvite(page.id, inviteId, { role: nextRole })
            setPendingInvites(prev => prev.map(invite => invite.id === inviteId ? updated : invite))
        } catch (err) {
            setShareError(err?.response?.data?.detail || 'Could not update pending invite')
        }
    }

    return (
        <div className="page-header">
            {page.cover_url && (
                <img src={page.cover_url} alt="cover" className="page-cover" />
            )}

            <div style={{ position: 'relative' }}>
                <div
                    className="page-emoji-large"
                    onClick={() => ['owner', 'editor'].includes(currentPageRole) && setShowEmojiPicker(s => !s)}
                    title={['owner', 'editor'].includes(currentPageRole) ? 'Change emoji' : 'Read only'}
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
                readOnly={!['owner', 'editor'].includes(currentPageRole)}
            />

            <div className="page-collab-row">
                <div className={`page-collab-status ${connectionState}`}>
                    <span className="page-collab-dot" />
                    <span>{connectionState === 'disconnected' && connectionMessage ? `Offline: ${connectionMessage}` : connectionLabel}</span>
                </div>

                <div className="page-collab-avatars">
                    {participants.slice(0, 5).map(participant => (
                        <div
                            key={participant.sessionId}
                            className="page-collab-avatar"
                            title={participant.user?.name || 'Collaborator'}
                        >
                            {(participant.user?.name || '?').slice(0, 1).toUpperCase()}
                        </div>
                    ))}
                </div>

                {currentPageRole && (
                    <div className={`page-role-badge ${currentPageRole}`}>
                        {currentPageRole === 'owner' || currentPageRole === 'editor' ? currentPageRole : `read only: ${currentPageRole}`}
                    </div>
                )}

                <button className="page-share-btn" onClick={openShareModal}>
                    Share
                </button>
            </div>

            {showShareModal && (
                <div className="modal-backdrop" onClick={() => setShowShareModal(false)}>
                    <div className="task-modal share-modal" onClick={e => e.stopPropagation()}>
                        <div className="task-modal-header">
                            <h2 className="task-modal-title">Share page</h2>
                            <button className="modal-close-btn" onClick={() => setShowShareModal(false)}>✕</button>
                        </div>

                        <div className="task-modal-body">
                            <div className="share-modal-subtitle">
                                Owners can invite editors, commenters, and viewers. Permissions inherit to child pages.
                            </div>

                            {shareError && <div className="file-upload-error">{shareError}</div>}
                            {shareMessage && <div className={`share-info-note ${shareMessageTone}`}>{shareMessage}</div>}

                            {currentUserRole === 'owner' && (
                                <form className="share-form" onSubmit={handleShare}>
                                    <input
                                        className="task-modal-input"
                                        placeholder="Invite by email"
                                        value={shareEmail}
                                        onChange={e => setShareEmail(e.target.value)}
                                    />
                                    <select
                                        className="task-modal-select"
                                        value={shareRole}
                                        onChange={e => setShareRole(e.target.value)}
                                    >
                                        <option value="viewer">Viewer</option>
                                        <option value="commenter">Commenter</option>
                                        <option value="editor">Editor</option>
                                    </select>
                                    <button className="task-modal-save-btn" type="submit" disabled={sharing}>
                                        {sharing ? 'Sharing...' : 'Invite'}
                                    </button>
                                </form>
                            )}

                            {currentUserRole !== 'owner' && (
                                <div className="share-readonly-note">
                                    Your role is <strong>{currentUserRole}</strong>. Only the page owner can change sharing.
                                </div>
                            )}

                            <div className="share-list">
                                {permissionsLoading && <div className="panel-empty">Loading collaborators...</div>}
                                {!permissionsLoading && permissions.length === 0 && pendingInvites.length === 0 && (
                                    <div className="panel-empty">Only the page owner currently has access.</div>
                                )}
                                {!permissionsLoading && permissions.map(permission => (
                                    <div key={`${permission.id}-${permission.inherited_from_permission_id || 'direct'}`} className="share-list-item">
                                        <div>
                                            <div className="share-list-name">
                                                {permission.user?.name || permission.user?.email || permission.subject_id}
                                            </div>
                                            <div className="share-list-meta">
                                                {permission.user?.email || permission.subject_id}
                                                {permission.inherited_from_permission_id ? ' • inherited' : ' • direct'}
                                            </div>
                                        </div>
                                        <div className="share-list-actions">
                                            {currentUserRole === 'owner' && !permission.inherited_from_permission_id ? (
                                                <select
                                                    className="share-role-select"
                                                    value={permission.role}
                                                    onChange={e => handlePermissionRoleChange(permission.id, e.target.value)}
                                                >
                                                    <option value="viewer">Viewer</option>
                                                    <option value="commenter">Commenter</option>
                                                    <option value="editor">Editor</option>
                                                </select>
                                            ) : (
                                                <span className="share-role-chip">{permission.role}</span>
                                            )}
                                            {currentUserRole === 'owner' && !permission.inherited_from_permission_id && (
                                                <button className="trash-action-btn delete" onClick={() => handleRevoke(permission.id)}>
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {!permissionsLoading && pendingInvites.map(invite => (
                                    <div key={`invite-${invite.id}`} className="share-list-item pending">
                                        <div>
                                            <div className="share-list-name">{invite.email}</div>
                                            <div className="share-list-meta">Pending signup • invited access after registration</div>
                                        </div>
                                        <div className="share-list-actions">
                                            {currentUserRole === 'owner' ? (
                                                <select
                                                    className="share-role-select"
                                                    value={invite.role}
                                                    onChange={e => handleInviteRoleChange(invite.id, e.target.value)}
                                                >
                                                    <option value="viewer">Viewer</option>
                                                    <option value="commenter">Commenter</option>
                                                    <option value="editor">Editor</option>
                                                </select>
                                            ) : (
                                                <span className="share-role-chip">{invite.role}</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
