import axios from 'axios'
import { logger } from '../utils/logger'

export const API_BASE = 'http://localhost:8000'

const client = axios.create({
    baseURL: API_BASE,
    headers: { 'Content-Type': 'application/json' },
})

// ── Request interceptor — log every outgoing call ──────────────
client.interceptors.request.use((config) => {
    const token = localStorage.getItem('token')
    if (token) config.headers.Authorization = `Bearer ${token}`

    logger.info(
        `→ ${config.method?.toUpperCase()} ${config.url}`,
        config.data ? { body: config.data } : null
    )
    return config
})

// ── Response interceptor — log success & surface real errors ───
client.interceptors.response.use(
    (res) => {
        logger.info(`✓ ${res.config.method?.toUpperCase()} ${res.config.url} [${res.status}]`)
        return res
    },
    (err) => {
        // Parse and log the real error
        logger.fromAxios(err)

        // Handle 401 — clear session and redirect
        if (err.response?.status === 401) {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            window.location.href = '/login'
        }
        return Promise.reject(err)
    }
)

export default client
