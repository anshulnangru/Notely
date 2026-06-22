import client from './client'

export const pagesApi = {
    list:            ()       => client.get('/pages').then(r => r.data),
    get:             (id)     => client.get(`/pages/${id}`).then(r => r.data),
    create:          (data)   => client.post('/pages', data).then(r => r.data),
    update:          (id, d)  => client.put(`/pages/${id}`, d).then(r => r.data),
    delete:          (id)     => client.delete(`/pages/${id}`).then(r => r.data),
    move:            (id, d)  => client.put(`/pages/${id}/move`, d).then(r => r.data),
    // Trash
    trash:           ()       => client.get('/pages/trash').then(r => r.data),
    restore:         (id)     => client.post(`/pages/${id}/restore`).then(r => r.data),
    permanentDelete: (id)     => client.delete(`/pages/${id}/permanent`).then(r => r.data),
    getPermissions:  (id)     => client.get(`/pages/${id}/permissions`).then(r => r.data),
    grantPermission: (id, d)  => client.post(`/pages/${id}/permissions`, d).then(r => r.data),
    revokePermission:(id, permissionId) => client.delete(`/pages/${id}/permissions/${permissionId}`).then(r => r.data),
    updatePermission:(id, permissionId, d) => client.patch(`/pages/${id}/permissions/${permissionId}`, d).then(r => r.data),
    updateInvite:    (id, inviteId, d) => client.patch(`/pages/${id}/invites/${inviteId}`, d).then(r => r.data),
}
