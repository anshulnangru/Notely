import { useState, useEffect, useRef } from 'react'
import client from '../../api/client'

const ICON_MAP = {
    'image': '🖼️', 'pdf': '📄', 'video': '🎥',
    default: '📎',
}

function getIcon(mimetype = '') {
    if (mimetype.startsWith('image/')) return '🖼️'
    if (mimetype === 'application/pdf') return '📄'
    if (mimetype.startsWith('video/')) return '🎥'
    return '📎'
}

function formatBytes(bytes) {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function FileUploadPanel({ pageId, taskId }) {
    const [attachments, setAttachments] = useState([])
    const [uploading, setUploading] = useState(false)
    const [dragOver, setDragOver] = useState(false)
    const fileInputRef = useRef()

    const endpoint = pageId
        ? `/attachments/pages/${pageId}`
        : null  // task attachments not listed here yet

    const load = async () => {
        if (!endpoint) return
        try {
            const res = await client.get(endpoint)
            setAttachments(res.data)
        } catch { /* ignore */ }
    }

    useEffect(() => { load() }, [pageId, taskId])

    const [error, setError] = useState(null)

    const uploadFiles = async (files) => {
        if (!files.length) return
        setUploading(true)
        setError(null)
        try {
            for (const file of files) {
                const form = new FormData()
                form.append('file', file)
                if (pageId) form.append('page_id', pageId)
                if (taskId) form.append('task_id', taskId)
                // Must delete Content-Type so the browser sets the correct
                // multipart/form-data boundary — setting it to undefined does NOT work in Axios
                await client.post('/upload', form, {
                    headers: { 'Content-Type': undefined },
                    transformRequest: (data, headers) => {
                        delete headers['Content-Type']
                        return data
                    },
                })
            }
            await load()
        } catch (err) {
            setError('Upload failed. Please try again.')
            console.error('Upload error:', err)
        } finally { setUploading(false) }
    }

    const handleDrop = (e) => {
        e.preventDefault()
        setDragOver(false)
        uploadFiles(Array.from(e.dataTransfer.files))
    }

    const handleDelete = async (id) => {
        await client.delete(`/attachments/${id}`)
        setAttachments(a => a.filter(x => x.id !== id))
    }

    return (
        <div className="file-panel">
            <div className="file-panel-title">📎 Attachments ({attachments.length})</div>
            {error && <div className="file-upload-error">⚠️ {error}</div>}

            {/* Drop zone */}
            <div
                className={`file-drop-zone ${dragOver ? 'drag-over' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <span className="file-drop-icon">☁️</span>
                <span className="file-drop-text">
                    {uploading ? 'Uploading…' : 'Drop files here or click to upload'}
                </span>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    style={{ display: 'none' }}
                    onChange={e => uploadFiles(Array.from(e.target.files))}
                />
            </div>

            {/* File list */}
            {attachments.length > 0 && (
                <div className="file-list">
                    {attachments.map(att => (
                        <div key={att.id} className="file-item">
                            <span className="file-icon">{getIcon(att.mimetype)}</span>
                            <div className="file-info">
                                <a
                                    className="file-name"
                                    href={`http://localhost:8000${att.url}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >{att.filename}</a>
                                <span className="file-size">{formatBytes(att.size)}</span>
                            </div>
                            <button
                                className="file-delete-btn"
                                onClick={() => handleDelete(att.id)}
                                title="Remove"
                            >✕</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
