import client from './client'

export const getTasks = (pageId, params = {}) =>
    client.get(`/pages/${pageId}/tasks`, { params })

export const getAllTasks = (params = {}) =>
    client.get('/tasks', { params })

export const createTask = (pageId, data) =>
    client.post(`/pages/${pageId}/tasks`, data)

export const getTask = (taskId) =>
    client.get(`/tasks/${taskId}`)

export const updateTask = (taskId, data) =>
    client.put(`/tasks/${taskId}`, data)

export const deleteTask = (taskId) =>
    client.delete(`/tasks/${taskId}`)

export const reorderTasks = (pageId, taskIds) =>
    client.put(`/pages/${pageId}/tasks/reorder`, taskIds)
