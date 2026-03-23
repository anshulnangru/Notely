import { create } from 'zustand'
import { pagesApi } from '../api/pages'
import { blocksApi } from '../api/blocks'

const usePagesStore = create((set, get) => ({
    tree: [],
    currentPage: null,
    loading: false,

    // ─── Pages ───────────────────────────────────────
    fetchTree: async () => {
        const tree = await pagesApi.list()
        set({ tree })
        return tree
    },

    createPage: async (parentId = null) => {
        const page = await pagesApi.create({ parent_id: parentId })
        await get().fetchTree()
        return page
    },

    deletePage: async (id) => {
        await pagesApi.delete(id)
        if (get().currentPage?.id === id) set({ currentPage: null })
        await get().fetchTree()
    },

    openPage: async (id) => {
        set({ loading: true })
        try {
            const page = await pagesApi.get(id)
            set({ currentPage: page, loading: false })
        } catch {
            set({ loading: false })
        }
    },

    updatePageMeta: async (id, data) => {
        await pagesApi.update(id, data)
        set((s) => ({
            currentPage: s.currentPage?.id === id ? { ...s.currentPage, ...data } : s.currentPage,
        }))
        await get().fetchTree()
    },

    toggleFavorite: async (id) => {
        const tree = get().tree
        const findPage = (nodes) => {
            for (const n of nodes) {
                if (n.id === id) return n
                const found = findPage(n.children || [])
                if (found) return found
            }
            return null
        }
        const page = findPage(tree)
        const newVal = !(page?.is_favorite ?? false)
        await pagesApi.update(id, { is_favorite: newVal })
        await get().fetchTree()
        // Also update currentPage if it's the one being toggled
        set((s) => s.currentPage?.id === id
            ? { currentPage: { ...s.currentPage, is_favorite: newVal } }
            : s
        )
    },

    // ─── Blocks ──────────────────────────────────────
    createBlock: async (pageId, afterOrder, type = 'text', content = '') => {
        const newBlock = await blocksApi.create(pageId, {
            type,
            content,
            order: afterOrder + 1,
        })
        const page = await pagesApi.get(pageId)
        set({ currentPage: page })
        return newBlock
    },

    updateBlock: async (blockId, data) => {
        // Optimistic update first
        set((s) => {
            if (!s.currentPage) return s
            return {
                currentPage: {
                    ...s.currentPage,
                    blocks: s.currentPage.blocks.map((b) =>
                        b.id === blockId ? { ...b, ...data } : b
                    ),
                },
            }
        })
        await blocksApi.update(blockId, data)
    },

    deleteBlock: async (blockId, pageId) => {
        await blocksApi.delete(blockId)
        const page = await pagesApi.get(pageId)
        set({ currentPage: page })
    },

    duplicateBlock: async (blockId, pageId) => {
        const { currentPage } = get()
        if (!currentPage) return
        const block = currentPage.blocks.find(b => b.id === blockId)
        if (!block) return
        await blocksApi.create(pageId, {
            type: block.type,
            content: block.content,
            checked: block.checked,
            order: block.order + 1,
        })
        const page = await pagesApi.get(pageId)
        set({ currentPage: page })
    },

    reorderBlocks: async (pageId, blockIds) => {
        await blocksApi.reorder(pageId, blockIds)
        const page = await pagesApi.get(pageId)
        set({ currentPage: page })
    },

    // ─── Trash ───────────────────────────────────────
    fetchTrash: async () => {
        const trash = await pagesApi.trash()
        set({ trash })
    },

    restorePage: async (id) => {
        await pagesApi.restore(id)
        set((s) => ({ trash: (s.trash || []).filter(p => p.id !== id) }))
        await get().fetchTree()
    },

    permanentDeletePage: async (id) => {
        await pagesApi.permanentDelete(id)
        set((s) => ({ trash: (s.trash || []).filter(p => p.id !== id) }))
    },

    // ─── Reset (called on login/logout to prevent cross-user data leaks) ──────
    reset: () => set({ tree: [], currentPage: null, loading: false, trash: [] }),
}))

export default usePagesStore
