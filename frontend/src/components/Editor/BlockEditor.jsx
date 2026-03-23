import { useRef, useCallback } from 'react'
import usePagesStore from '../../store/usePagesStore'
import Block from './Block'

export default function BlockEditor({ page }) {
    const { createBlock } = usePagesStore()
    const blockRefs = useRef({})          // blockId → DOM element

    const focusBlock = useCallback((idOrOffset) => {
        if (typeof idOrOffset === 'string') {
            const el = blockRefs.current[idOrOffset]
            el?.querySelector('textarea')?.focus()
        }
    }, [])

    const getFocusByIdx = useCallback((idx) => {
        const blocks = [...(page?.blocks || [])].sort((a, b) => a.order - b.order)
        const target = blocks[idx]
        if (target) {
            const el = blockRefs.current[target.id]
            el?.querySelector('textarea')?.focus()
        }
    }, [page?.blocks])

    const handleEmptyAreaClick = async (e) => {
        if (e.target === e.currentTarget) {
            const lastBlock = [...(page?.blocks || [])].sort((a, b) => a.order - b.order).at(-1)
            if (!lastBlock || lastBlock.content.trim()) {
                await createBlock(page.id, lastBlock?.order ?? 0)
            } else {
                const el = blockRefs.current[lastBlock.id]
                el?.querySelector('textarea')?.focus()
            }
        }
    }

    const sortedBlocks = [...(page?.blocks || [])].sort((a, b) => a.order - b.order)

    // Track numbered list index (resets when type changes away from 'numbered')
    let numberedIdx = -1

    return (
        <div className="block-editor" onClick={handleEmptyAreaClick}>
            {sortedBlocks.map((block, i) => {
                if (block.type === 'numbered') {
                    numberedIdx++
                } else {
                    numberedIdx = -1
                }

                return (
                    <div key={block.id} ref={el => { blockRefs.current[block.id] = el }}>
                        <Block
                            block={block}
                            pageId={page.id}
                            idx={i}
                            numberedIdx={numberedIdx}
                            focusNext={(id) => id ? focusBlock(id) : getFocusByIdx(i + 1)}
                            focusPrev={() => getFocusByIdx(i - 1)}
                        />
                    </div>
                )
            })}
            {/* Click-to-add empty space at bottom */}
            <div style={{ minHeight: 120 }} onClick={handleEmptyAreaClick} />
        </div>
    )
}
