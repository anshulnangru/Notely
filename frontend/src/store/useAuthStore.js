import { create } from 'zustand'
import { authApi } from '../api/auth'
import usePagesStore from './usePagesStore'
import usePresenceStore from './usePresenceStore'

const useAuthStore = create((set) => ({
    token: localStorage.getItem('token') || null,
    user: JSON.parse(localStorage.getItem('user') || 'null'),

    login: async (email, password) => {
        // Clear any stale state from a previous session before logging in
        usePagesStore.getState().reset()

        const data = await authApi.login({ email, password })
        localStorage.setItem('token', data.access_token)
        localStorage.setItem('user', JSON.stringify(data.user))
        set({ token: data.access_token, user: data.user })
        return data
    },

    register: async (email, password, name) => {
        // Clear any stale state from a previous session before registering
        usePagesStore.getState().reset()

        const data = await authApi.register({ email, password, name })
        return data
    },

    logout: () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        // Reset pages store so the next user doesn't see stale data
        usePagesStore.getState().reset()
        usePresenceStore.getState().reset()
        set({ token: null, user: null })
    },
}))

export default useAuthStore
