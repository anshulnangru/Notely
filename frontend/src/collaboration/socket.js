import { API_BASE } from '../api/client'
import { logger } from '../utils/logger'

function toWebSocketBase(httpBase) {
    if (httpBase.startsWith('https://')) return `wss://${httpBase.slice(8)}`
    if (httpBase.startsWith('http://')) return `ws://${httpBase.slice(7)}`
    return httpBase
}

export function createPageSocket(pageId, token, handlers = {}) {
    const wsBase = toWebSocketBase(API_BASE)
    const socket = new WebSocket(`${wsBase}/ws/pages/${pageId}?token=${encodeURIComponent(token)}`)

    socket.addEventListener('open', () => {
        logger.info(`WS connected /ws/pages/${pageId}`)
        handlers.onOpen?.()
    })

    socket.addEventListener('message', (event) => {
        try {
            handlers.onMessage?.(JSON.parse(event.data))
        } catch (error) {
            logger.warn('WS message parse failed', { pageId, error: error?.message })
        }
    })

    socket.addEventListener('close', (event) => {
        logger.info(`WS closed /ws/pages/${pageId}`, { code: event.code, reason: event.reason })
        handlers.onClose?.(event)
    })

    socket.addEventListener('error', () => {
        logger.warn(`WS error /ws/pages/${pageId}`)
        handlers.onError?.()
    })

    return socket
}
