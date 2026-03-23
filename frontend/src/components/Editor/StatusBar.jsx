import { useMemo } from 'react'

function countWords(text) {
    return text.trim() ? text.trim().split(/\s+/).length : 0
}

function formatDate(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        + ' at ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function pageToMarkdown(page) {
    const lines = [`# ${page.emoji} ${page.title || 'Untitled'}`, '']
    for (const block of page.blocks || []) {
        switch (block.type) {
            case 'h1': lines.push(`# ${block.content}`, ''); break
            case 'h2': lines.push(`## ${block.content}`, ''); break
            case 'h3': lines.push(`### ${block.content}`, ''); break
            case 'bullet': lines.push(`- ${block.content}`); break
            case 'numbered': lines.push(`1. ${block.content}`); break
            case 'todo': lines.push(`- [${block.checked ? 'x' : ' '}] ${block.content}`); break
            case 'divider': lines.push('---', ''); break
            case 'quote': lines.push(`> ${block.content}`, ''); break
            case 'code': lines.push('```', block.content, '```', ''); break
            case 'callout': {
                const [emoji, ...rest] = block.content.split('|')
                lines.push(`> 💡 **${emoji}** ${rest.join('|')}`, '')
                break
            }
            case 'image': lines.push(`![image](${block.content})`, ''); break
            case 'toggle': lines.push(`- ▶ ${block.content}`); break
            default: if (block.content) lines.push(block.content, ''); break
        }
    }
    return lines.join('\n')
}

export default function StatusBar({ page }) {
    const { wordCount, blockCount } = useMemo(() => {
        const blocks = page?.blocks || []
        const text = blocks.map(b => {
            if (b.type === 'callout') return b.content.split('|').slice(1).join(' ')
            return b.type !== 'divider' && b.type !== 'image' ? b.content : ''
        }).join(' ')
        return {
            wordCount: countWords(text),
            blockCount: blocks.length,
        }
    }, [page?.blocks])

    const handleExport = () => {
        if (!page) return
        const md = pageToMarkdown(page)
        const blob = new Blob([md], { type: 'text/markdown' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${page.title || 'Untitled'}.md`
        a.click()
        URL.revokeObjectURL(url)
    }

    if (!page) return null

    return (
        <div className="status-bar">
            <span className="status-item">{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
            <span className="status-sep">·</span>
            <span className="status-item">{blockCount} {blockCount === 1 ? 'block' : 'blocks'}</span>
            <span className="status-sep">·</span>
            <span className="status-item">Edited {formatDate(page.updated_at)}</span>
            <div className="status-spacer" />
            <button className="status-export-btn" onClick={handleExport} title="Export as Markdown">
                ↓ Export .md
            </button>
        </div>
    )
}
