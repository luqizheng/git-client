import type { DiffStatus } from '../types/git'

export function statusIcon(status: DiffStatus): string {
  const map: Record<DiffStatus, string> = { Added: 'A', Modified: 'M', Deleted: 'D', Renamed: 'R', Copied: 'C' }
  return map[status] ?? '?'
}

export function statusColor(status: DiffStatus): string {
  const map: Record<DiffStatus, string> = {
    Added: 'text-blue-400',
    Modified: 'text-green-400',
    Deleted: 'text-red-400',
    Renamed: 'text-yellow-400',
    Copied: 'text-yellow-400',
  }
  return map[status] ?? ''
}
