import { createContext, useContext, useEffect, useMemo, useRef } from 'react'
import useAuthStore from '../store/useAuthStore'
import usePresenceStore from '../store/usePresenceStore'
import usePagesStore from '../store/usePagesStore'
import { createPageSocket } from './socket'

const CollaborationContext = createContext({
    focusBlock: () => {},
})

export function useCollaboration() {
    return useContext(CollaborationContext)
}

export default function CollaborationProvider({ pageId, children }) {
    const token = useAuthStore(s => s.token)
    const setConnecting = usePresenceStore(s => s.setConnecting)
    const setDisconnected = usePresenceStore(s => s.setDisconnected)
    const applySnapshot = usePresenceStore(s => s.applySnapshot)
    const upsertParticipant = usePresenceStore(s => s.upsertParticipant)
    const removeParticipant = usePresenceStore(s => s.removeParticipant)
    const applyRemotePageUpdate = usePagesStore(s => s.applyRemotePageUpdate)
    const applyRemoteBlockCreated = usePagesStore(s => s.applyRemoteBlockCreated)
    const applyRemoteBlockUpdated = usePagesStore(s => s.applyRemoteBlockUpdated)
    const applyRemoteBlockDeleted = usePagesStore(s => s.applyRemoteBlockDeleted)
    const applyRemoteBlocksReordered = usePagesStore(s => s.applyRemoteBlocksReordered)

    const socketRef = useRef(null)
    const reconnectTimerRef = useRef(null)
    const heartbeatTimerRef = useRef(null)
    const mountedRef = useRef(false)

    useEffect(() => {
        mountedRef.current = true
        return () => { mountedRef.current = false }
    }, [])

    useEffect(() => {
        if (!pageId || !token) {
            setDisconnected()
            return
        }

        let shouldReconnect = true
        let reconnectDelay = 1000

        const clearTimers = () => {
            if (reconnectTimerRef.current) {
                window.clearTimeout(reconnectTimerRef.current)
                reconnectTimerRef.current = null
            }
            if (heartbeatTimerRef.current) {
                window.clearInterval(heartbeatTimerRef.current)
                heartbeatTimerRef.current = null
            }
        }

        const sendHeartbeat = () => {
            if (socketRef.current?.readyState === WebSocket.OPEN) {
                socketRef.current.send(JSON.stringify({ type: 'presence.heartbeat', payload: {} }))
            }
        }

        const connect = () => {
            setConnecting(pageId)
            const socket = createPageSocket(pageId, token, {
                onOpen: () => {
                    reconnectDelay = 1000
                    heartbeatTimerRef.current = window.setInterval(sendHeartbeat, 20000)
                },
                onMessage: (event) => {
                    if (event.type === 'presence.snapshot') {
                        applySnapshot(pageId, event.payload?.participants || [], event.payload?.selfSessionId || null)
                    } else if (event.type === 'presence.join' || event.type === 'presence.focus_block') {
                        if (event.payload) upsertParticipant(event.payload)
                    } else if (event.type === 'presence.leave') {
                        removeParticipant(event.payload?.sessionId)
                    } else if (event.type === 'page.updated') {
                        if (event.payload?.page) applyRemotePageUpdate(event.payload.page)
                    } else if (event.type === 'block.created') {
                        if (event.payload?.block) applyRemoteBlockCreated(event.payload.pageId, event.payload.block)
                    } else if (event.type === 'block.updated') {
                        if (event.payload?.block) applyRemoteBlockUpdated(event.payload.pageId, event.payload.block)
                    } else if (event.type === 'block.deleted') {
                        if (event.payload?.blockId) applyRemoteBlockDeleted(event.payload.pageId, event.payload.blockId)
                    } else if (event.type === 'blocks.reordered') {
                        if (event.payload?.blocks) applyRemoteBlocksReordered(event.payload.pageId, event.payload.blocks)
                    }
                },
                onClose: (event) => {
                    clearTimers()
                    const code = event?.code
                    const reason = event?.reason || ''
                    const isPolicyOrFatal = code === 1008 || code === 1002 || code === 1003
                    setDisconnected(reason)

                    if (!mountedRef.current || !shouldReconnect || isPolicyOrFatal) return

                    reconnectTimerRef.current = window.setTimeout(() => {
                        connect()
                    }, reconnectDelay)
                    reconnectDelay = Math.min(reconnectDelay * 2, 10000)
                },
                onError: () => {
                    clearTimers()
                },
            })

            socketRef.current = socket
        }

        connect()

        return () => {
            shouldReconnect = false
            clearTimers()
            socketRef.current?.close()
            socketRef.current = null
            setDisconnected()
        }
    }, [
        pageId,
        token,
        setConnecting,
        setDisconnected,
        applySnapshot,
        upsertParticipant,
        removeParticipant,
        applyRemotePageUpdate,
        applyRemoteBlockCreated,
        applyRemoteBlockUpdated,
        applyRemoteBlockDeleted,
        applyRemoteBlocksReordered,
    ])

    const value = useMemo(() => ({
        focusBlock(blockId) {
            if (socketRef.current?.readyState !== WebSocket.OPEN) return
            socketRef.current.send(JSON.stringify({
                type: 'presence.focus_block',
                payload: { blockId },
            }))
        },
    }), [])

    return (
        <CollaborationContext.Provider value={value}>
            {children}
        </CollaborationContext.Provider>
    )
}
