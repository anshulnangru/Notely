import { create } from 'zustand'
import { pagesApi } from '../api/pages'
import { blocksApi } from '../api/blocks'

function upsertOpenTab(tabs, page, role) {
    const nextTab = {
        id: page.id,
        title: page.title,
        emoji: page.emoji,
        page,
        role,
    }

    const existingIndex = tabs.findIndex(tab => tab.id === page.id)
    if (existingIndex === -1) return [...tabs, nextTab]

    return tabs.map((tab, index) => index === existingIndex
        ? { ...tab, ...nextTab }
        : tab
    )
}

function updateOpenTab(tabs, id, updater) {
    return tabs.map((tab) => {
        if (tab.id !== id) return tab
        const nextPage = updater(tab.page)
        return {
            ...tab,
            title: nextPage?.title ?? tab.title,
            emoji: nextPage?.emoji ?? tab.emoji,
            page: nextPage,
        }
    })
}

function syncPageAndTabs(state, pageId, updater) {
    const nextCurrentPage = state.currentPage?.id === pageId
        ? updater(state.currentPage)
        : state.currentPage

    const nextTabs = updateOpenTab(state.openTabs, pageId, updater)

    return {
        currentPage: nextCurrentPage,
        openTabs: nextTabs,
    }
}

const usePagesStore = create((set, get) => ({
    tree: [],
    currentPage: null,
    currentPageRole: null,
    openTabs: [],
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
        if (get().currentPage?.id === id) set({ currentPage: null, currentPageRole: null })
        set((s) => ({ openTabs: s.openTabs.filter(tab => tab.id !== id) }))
        await get().fetchTree()
    },

    openPage: async (id) => {
        set({ loading: true })
        try {
            const [page, permissionSummary] = await Promise.all([
                pagesApi.get(id),
                pagesApi.getPermissions(id).catch(() => null),
            ])
            set({
                currentPage: page,
                currentPageRole: permissionSummary?.current_user_role || null,
                openTabs: upsertOpenTab(get().openTabs, page, permissionSummary?.current_user_role || null),
                loading: false,
            })
        } catch {
            set({ loading: false })
        }
    },

    closeOpenTab: (id) => {
        set((s) => ({
            openTabs: s.openTabs.filter(tab => tab.id !== id),
            currentPage: s.currentPage?.id === id ? null : s.currentPage,
            currentPageRole: s.currentPage?.id === id ? null : s.currentPageRole,
        }))
    },

    hydrateOpenTab: (id) => {
        const tab = get().openTabs.find(entry => entry.id === id)
        if (!tab?.page) return false
        set({
            currentPage: tab.page,
            currentPageRole: tab.role ?? null,
            loading: false,
        })
        return true
    },

    applyRemotePageUpdate: (page) => {
        set((s) => syncPageAndTabs(s, page.id, (existingPage) => {
            if (!existingPage) return existingPage
            return {
                ...existingPage,
                ...page,
            }
        }))
    },

    applyRemoteBlockCreated: (pageId, block) => {
        set((s) => syncPageAndTabs(s, pageId, (page) => {
            if (!page) return page
            const existing = page.blocks.find((entry) => entry.id === block.id)
            const blocks = existing
                ? page.blocks.map((entry) => entry.id === block.id ? block : entry)
                : [...page.blocks, block]
            return { ...page, blocks }
        }))
    },

    applyRemoteBlockUpdated: (pageId, block) => {
        set((s) => syncPageAndTabs(s, pageId, (page) => {
            if (!page) return page
            return {
                ...page,
                blocks: page.blocks.map((entry) => entry.id === block.id ? block : entry),
            }
        }))
    },

    applyRemoteBlockDeleted: (pageId, blockId) => {
        set((s) => syncPageAndTabs(s, pageId, (page) => {
            if (!page) return page
            return {
                ...page,
                blocks: page.blocks.filter((entry) => entry.id !== blockId),
            }
        }))
    },

    applyRemoteBlocksReordered: (pageId, blocks) => {
        set((s) => syncPageAndTabs(s, pageId, (page) => {
            if (!page) return page
            return {
                ...page,
                blocks,
            }
        }))
    },

    updatePageMeta: async (id, data) => {
        const role = get().currentPageRole
        if (!['owner', 'editor'].includes(role)) return
        await pagesApi.update(id, data)
        set((s) => ({
            currentPage: s.currentPage?.id === id ? { ...s.currentPage, ...data } : s.currentPage,
            openTabs: updateOpenTab(s.openTabs, id, (page) => page ? { ...page, ...data } : page),
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
            ? {
                currentPage: { ...s.currentPage, is_favorite: newVal },
                openTabs: updateOpenTab(s.openTabs, id, (page) => page ? { ...page, is_favorite: newVal } : page),
            }
            : {
                openTabs: updateOpenTab(s.openTabs, id, (page) => page ? { ...page, is_favorite: newVal } : page),
            }
        )
    },

    // ─── Blocks ──────────────────────────────────────
    createBlock: async (pageId, afterOrder, type = 'text', content = '') => {
        const role = get().currentPageRole
        if (!['owner', 'editor'].includes(role)) return null
        const newBlock = await blocksApi.create(pageId, {
            type,
            content,
            order: afterOrder + 1,
        })
        const page = await pagesApi.get(pageId)
        set((s) => ({
            currentPage: page,
            openTabs: upsertOpenTab(s.openTabs, page, s.currentPageRole),
        }))
        return newBlock
    },

    updateBlock: async (blockId, data) => {
        const role = get().currentPageRole
        if (!['owner', 'editor'].includes(role)) return
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
                openTabs: updateOpenTab(s.openTabs, s.currentPage.id, (page) => page ? {
                    ...page,
                    blocks: page.blocks.map((b) => b.id === blockId ? { ...b, ...data } : b),
                } : page),
            }
        })
        await blocksApi.update(blockId, data)
    },

    deleteBlock: async (blockId, pageId) => {
        const role = get().currentPageRole
        if (!['owner', 'editor'].includes(role)) return
        await blocksApi.delete(blockId)
        const page = await pagesApi.get(pageId)
        set((s) => ({
            currentPage: page,
            openTabs: upsertOpenTab(s.openTabs, page, s.currentPageRole),
        }))
    },

    duplicateBlock: async (blockId, pageId) => {
        const role = get().currentPageRole
        if (!['owner', 'editor'].includes(role)) return
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
        set((s) => ({
            currentPage: page,
            openTabs: upsertOpenTab(s.openTabs, page, s.currentPageRole),
        }))
    },

    reorderBlocks: async (pageId, blockIds) => {
        const role = get().currentPageRole
        if (!['owner', 'editor'].includes(role)) return
        await blocksApi.reorder(pageId, blockIds)
        const page = await pagesApi.get(pageId)
        set((s) => ({
            currentPage: page,
            openTabs: upsertOpenTab(s.openTabs, page, s.currentPageRole),
        }))
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
    reset: () => set({ tree: [], currentPage: null, currentPageRole: null, openTabs: [], loading: false, trash: [] }),
}))

export default usePagesStore
