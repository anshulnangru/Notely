import client from './client'

export const blocksApi = {
    create: (pageId, data) => client.post(`/pages/${pageId}/blocks`, data).then(r => r.data),
    update: (blockId, data) => client.put(`/blocks/${blockId}`, data).then(r => r.data),
    delete: (blockId) => client.delete(`/blocks/${blockId}`).then(r => r.data),
    reorder: (pageId, blockIds) => client.put(`/pages/${pageId}/blocks/reorder`, { block_ids: blockIds }).then(r => r.data),
}
