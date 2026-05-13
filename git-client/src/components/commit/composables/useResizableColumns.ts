import { ref } from 'vue'

export interface ColumnConfig {
  key: string
  label: string
  width: number
  minWidth: number
  maxWidth: number
  visible: boolean
  fixed?: 'left' | 'right'
}

const STORAGE_KEY = 'sourcetree-commit-list-columns'

function getDefaultColumns(): ColumnConfig[] {
  return [
    { key: 'branch', label: 'BRANCH / TAG', width: 140, minWidth: 80, maxWidth: 250, visible: true, fixed: 'left' },
    { key: 'graph', label: 'GRAPH', width: 120, minWidth: 80, maxWidth: 200, visible: true },
    { key: 'message', label: 'COMMIT MESSAGE', width: 300, minWidth: 200, maxWidth: 600, visible: true },
    { key: 'author', label: 'AUTHOR', width: 100, minWidth: 60, maxWidth: 150, visible: true, fixed: 'right' },
    { key: 'date', label: 'DATE / TIME', width: 150, minWidth: 120, maxWidth: 200, visible: true, fixed: 'right' },
  ]
}

function loadFromStorage(): ColumnConfig[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return getDefaultColumns()
}

function saveToStorage(columns: ColumnConfig[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(columns))
  } catch {}
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function useResizableColumns() {
  const columns = ref<ColumnConfig[]>(loadFromStorage())

  function resizeColumn(key: string, delta: number) {
    const col = columns.value.find(c => c.key === key)
    if (!col) return
    col.width = clamp(col.width + delta, col.minWidth, col.maxWidth)
    saveToStorage(columns.value)
  }

  function resetColumns() {
    columns.value = getDefaultColumns()
    saveToStorage(columns.value)
  }

  function getColumnWidth(key: string): number {
    return columns.value.find(c => c.key === key)?.width ?? 100
  }

  function getTotalWidth(): number {
    return columns.value.filter(c => c.visible).reduce((sum, c) => sum + c.width, 0)
  }

  return { columns, resizeColumn, resetColumns, getColumnWidth, getTotalWidth }
}
