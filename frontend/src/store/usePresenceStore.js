import { create } from 'zustand'

const usePresenceStore = create((set) => ({
    pageId: null,
    selfSessionId: null,
    participants: [],
    connectionState: 'disconnected',
    connectionMessage: '',

    setConnecting: (pageId) => set((state) => ({
        pageId,
        connectionState: 'connecting',
        connectionMessage: '',
        participants: state.pageId === pageId ? state.participants : [],
    })),

    setConnected: () => set({ connectionState: 'connected', connectionMessage: '' }),

    setDisconnected: (message = '') => set({
        connectionState: 'disconnected',
        connectionMessage: message,
        selfSessionId: null,
        participants: [],
    }),

    applySnapshot: (pageId, participants, selfSessionId) => set({
        pageId,
        participants,
        selfSessionId,
        connectionState: 'connected',
        connectionMessage: '',
    }),

    upsertParticipant: (participant) => set((state) => {
        const others = state.participants.filter(p => p.sessionId !== participant.sessionId)
        return { participants: [...others, participant] }
    }),

    removeParticipant: (sessionId) => set((state) => ({
        participants: state.participants.filter(p => p.sessionId !== sessionId),
    })),

    reset: () => set({
        pageId: null,
        selfSessionId: null,
        participants: [],
        connectionState: 'disconnected',
        connectionMessage: '',
    }),
}))

export default usePresenceStore
