import type { Commit } from '../../../types/git'

export function formatRelativeTime(timestamp: number): string {
  const diff = Math.floor(Date.now() / 1000) - timestamp
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`
  return new Date(timestamp * 1000).toLocaleDateString()
}

export function getFirstLine(message: string): string {
  return message.split('\n')[0]
}

export function matchesFilter(
  commit: Commit,
  text: string,
  type: 'all' | 'message' | 'author' | 'hash',
): boolean {
  const q = text.toLowerCase()
  if (type === 'message' || type === 'all') {
    if (commit.message.toLowerCase().includes(q)) return true
  }
  if (type === 'author' || type === 'all') {
    if (commit.author.toLowerCase().includes(q)) return true
    if (commit.author_email.toLowerCase().includes(q)) return true
  }
  if (type === 'hash' || type === 'all') {
    if (commit.id.toLowerCase().startsWith(q)) return true
  }
  return false
}

export function truncateText(text: string, maxLen: number): string {
  return text.length <= maxLen ? text : text.slice(0, maxLen - 1) + '\u2026'
}

export function formatCommitInfo(commit: Commit): string {
  const shortHash = commit.id.slice(0, 7)
  const date = new Date(commit.time * 1000).toLocaleDateString()
  return `${shortHash} | ${commit.author} | ${date} | ${getFirstLine(commit.message)}`
}

export function highlightText(text: string, query: string): { text: string; isHighlight: boolean }[] {
  if (!query) return [{ text, isHighlight: false }]
  const lower = text.toLowerCase()
  const q = query.toLowerCase()
  const parts: { text: string; isHighlight: boolean }[] = []
  let lastIdx = 0
  let searchFrom = 0
  while (searchFrom < lower.length) {
    const idx = lower.indexOf(q, searchFrom)
    if (idx === -1) break
    if (idx > lastIdx) parts.push({ text: text.slice(lastIdx, idx), isHighlight: false })
    parts.push({ text: text.slice(idx, idx + q.length), isHighlight: true })
    lastIdx = idx + q.length
    searchFrom = lastIdx
  }
  if (lastIdx < text.length) parts.push({ text: text.slice(lastIdx), isHighlight: false })
  return parts.length > 0 ? parts : [{ text, isHighlight: false }]
}
