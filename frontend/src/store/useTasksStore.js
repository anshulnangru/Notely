import { create } from 'zustand'
import * as tasksApi from '../api/tasks'

const useTasksStore = create((set, get) => ({
    tasks: [],          // tasks for the currently open page
    allTasks: [],       // tasks across all pages (for dashboard)
    loading: false,
    error: null,

    fetchTasks: async (pageId, filters = {}) => {
        if (!pageId) return
        set({ loading: true, error: null })
        try {
            const res = await tasksApi.getTasks(pageId, filters)
            set({ tasks: res.data, loading: false })
        } catch (err) {
            set({ error: err?.response?.data?.detail || 'Failed to load tasks', loading: false })
        }
    },

    fetchAllTasks: async (filters = {}) => {
        set({ loading: true })
        try {
            const res = await tasksApi.getAllTasks(filters)
            set({ allTasks: res.data, loading: false })
        } catch (err) {
            set({ loading: false })
        }
    },

    createTask: async (pageId, data = {}) => {
        const res = await tasksApi.createTask(pageId, data)
        set(s => ({ tasks: [...s.tasks, res.data] }))
        return res.data
    },

    updateTask: async (taskId, data) => {
        const res = await tasksApi.updateTask(taskId, data)
        set(s => ({
            tasks: s.tasks.map(t => t.id === taskId ? res.data : t),
            allTasks: s.allTasks.map(t => t.id === taskId ? res.data : t),
        }))
        return res.data
    },

    deleteTask: async (taskId) => {
        await tasksApi.deleteTask(taskId)
        set(s => ({
            tasks: s.tasks.filter(t => t.id !== taskId),
            allTasks: s.allTasks.filter(t => t.id !== taskId),
        }))
    },

    // Optimistic status update
    setTaskStatus: async (taskId, status) => {
        set(s => ({
            tasks: s.tasks.map(t => t.id === taskId ? { ...t, status } : t),
        }))
        await tasksApi.updateTask(taskId, { status })
    },

    clearTasks: () => set({ tasks: [], loading: false, error: null }),
}))

export default useTasksStore
