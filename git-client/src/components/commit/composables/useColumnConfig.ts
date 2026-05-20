import { ref, computed, watch } from 'vue'
import { useRepoStore } from '../../../stores/repo'

export interface ColumnConfig {
  id: string
  label: string
  visible: boolean
  width: number
  minWidth: number
  hideable: boolean
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'graphy', label: 'Graph', visible: true, width: 60, minWidth: 40, hideable: true },
  { id: 'refs', label: 'Tag/Branch', visible: true, width: 100, minWidth: 60, hideable: true },
  { id: 'message', label: 'Commit Message', visible: true, width: 300, minWidth: 200, hideable: false },
  { id: 'author', label: 'Author', visible: true, width: 100, minWidth: 60, hideable: true },
  { id: 'sha', label: 'SHA', visible: true, width: 80, minWidth: 60, hideable: true },
]

const STORAGE_KEY = 'commit-list-columns-v2'

export function useColumnConfig() {
  const repoStore = useRepoStore()
  const columns = ref<ColumnConfig[]>([...DEFAULT_COLUMNS])

  const loadConfig = () => {
    if (!repoStore.activeRepoPath) {
      columns.value = [...DEFAULT_COLUMNS]
      return
    }
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const configs: Record<string, ColumnConfig[]> = JSON.parse(stored)
        const repoConfig = configs[repoStore.activeRepoPath]
        if (repoConfig) {
          columns.value = repoConfig.map(col => {
            const defaultCol = DEFAULT_COLUMNS.find(d => d.id === col.id)
            return defaultCol
              ? { ...defaultCol, visible: col.visible, width: col.width }
              : col
          })
          return
        }
      } catch (e) {
        console.warn('Failed to parse column config', e)
      }
    }
    columns.value = [...DEFAULT_COLUMNS]
  }

  const saveConfig = () => {
    if (!repoStore.activeRepoPath) return
    const stored = localStorage.getItem(STORAGE_KEY)
    const configs: Record<string, ColumnConfig[]> = stored ? JSON.parse(stored) : {}
    configs[repoStore.activeRepoPath] = columns.value
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configs))
  }

  const setColumnWidth = (id: string, width: number) => {
    const col = columns.value.find(c => c.id === id)
    if (col && width >= col.minWidth) {
      col.width = width
      saveConfig()
    }
  }

  const toggleColumnVisibility = (id: string) => {
    const col = columns.value.find(c => c.id === id)
    if (col && col.hideable && col.visible) {
      const visibleCount = columns.value.filter(c => c.visible).length
      if (visibleCount > 1) {
        col.visible = false
        saveConfig()
      }
    }
  }

  const resetToDefault = () => {
    columns.value = [...DEFAULT_COLUMNS]
    saveConfig()
  }

  const visibleColumns = computed(() => columns.value.filter(c => c.visible))

  const columnStyles = computed(() => {
    const styles: Record<string, string> = {}
    for (const col of columns.value) {
      if (col.id === 'graphy')
        styles[col.id] = `min-width: ${col.minWidth}px; flex-shrink: 0;  width: auto;`
      else
        styles[col.id] = `width: ${col.width}px; min-width: ${col.minWidth}px; flex-shrink: 0;`
    }
    return styles
  })

  const visibleColumnIds = computed(() => visibleColumns.value.map(c => c.id))

  watch(() => repoStore.activeRepoPath, loadConfig, { immediate: true })

  return {
    columns,
    visibleColumns,
    columnStyles,
    visibleColumnIds,
    setColumnWidth,
    toggleColumnVisibility,
    resetToDefault,
    loadConfig,
  }
}
