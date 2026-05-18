<template>
  <div class="commit-file-diff-view">
    <div class="diff-header">
      <div class="header-left">
        <span class="file-path">{{ filePath }}</span>
      </div>
      <div class="view-controls">
        <div class="flex gap-1">
          <Button
            size="sm"
            :variant="mode === 'split' ? 'default' : 'outline'"
            @click="mode = 'split'"
            title="Split View"
          >
            Split
          </Button>
          <Button
            size="sm"
            :variant="mode === 'unified' ? 'default' : 'outline'"
            @click="mode = 'unified'"
            title="Unified View"
          >
            Unified
          </Button>
        </div>
        <div class="separator" />
        <div class="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            class="h-8 w-8"
            @click="goPrev"
            title="Previous Change (Alt+Up)"
          >
            <ChevronUp class="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            class="h-8 w-8"
            @click="goNext"
            title="Next Change (Alt+Down)"
          >
            <ChevronDown class="w-4 h-4" />
          </Button>
        </div>
        <div class="separator" />
        <Button
          :variant="blameStore.isVisible ? 'default' : 'outline'"
          size="sm"
          @click="toggleBlame"
          title="Toggle Blame"
        >
          <PersonOutline class="w-4 h-4 mr-1" />
          Blame
        </Button>
        <div class="separator" />
        <Button
          size="icon"
          variant="ghost"
          class="h-8 w-8"
          @click="closeDiffView"
          title="Close (Esc)"
        >
          <CloseOutline class="w-4 h-4" />
        </Button>
      </div>
    </div>
    <div class="diff-body">
      <BlamePanel
        v-if="repo.activeRepoPath && filePath"
        :repo-path="repo.activeRepoPath"
        :file-path="filePath"
        :commit-id="commitSha"
        @commit-click="handleCommitClick"
      />
      <div class="diff-content">
      <div v-if="loading" class="loading-state">
        <div class="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
        <span class="loading-text">Loading file content...</span>
      </div>
      <div v-else-if="fileContent" class="split-container">
        <template v-if="mode === 'split'">
          <div class="panel old-panel">
            <div class="panel-header">
              <DocumentText class="w-4 h-4 header-icon" />
              <span v-if="fileContent.old_path" class="header-text">{{ fileContent.old_path }}</span>
              <span v-else class="header-text muted">(previous commit)</span>
            </div>
            <div ref="oldEditorRef" class="editor-container"></div>
          </div>
          <div class="panel-divider" />
          <div class="panel new-panel">
            <div class="panel-header">
              <DocumentText class="w-4 h-4 header-icon" />
              <span class="header-text">{{ fileContent.new_path }}</span>
            </div>
            <div ref="newEditorRef" class="editor-container"></div>
          </div>
        </template>
        <template v-else>
          <div class="unified-container">
            <div class="panel-header">
              <GitCompare class="w-4 h-4 header-icon" />
              <span class="header-text">Unified Diff</span>
            </div>
            <div ref="unifiedEditorRef" class="editor-container"></div>
          </div>
        </template>
      </div>
      <div v-else class="empty-state">
        <FileTrayOutline class="w-12 h-12 empty-icon" />
        <p class="empty-title">No File Selected</p>
        <p class="empty-description">Select a file from the commit details to view its content</p>
      </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Button } from '@/components/ui/button'
import { CloseOutline, ChevronUp, ChevronDown, DocumentText, GitCompare, FileTrayOutline, PersonOutline } from '@vicons/ionicons5'
import * as monaco from 'monaco-editor'
import { useDiffStore } from '../../stores/diff'
import { useRepoStore } from '../../stores/repo'
import { useRightPanelStore } from '../../stores/rightPanel'
import { useTheme } from '../../composables/useTheme'
import { useBlameStore } from '../../stores/blame'
import { toast } from 'vue-sonner'
import BlamePanel from '../blame/BlamePanel.vue'

const diffStore = useDiffStore()
const repo = useRepoStore()
const rightPanel = useRightPanelStore()
const blameStore = useBlameStore()
const { theme } = useTheme()
const mode = ref<'split' | 'unified'>('split')
const loading = ref(false)

const oldEditorRef = ref<HTMLElement | null>(null)
const newEditorRef = ref<HTMLElement | null>(null)
const unifiedEditorRef = ref<HTMLElement | null>(null)

let oldEditor: monaco.editor.IStandaloneCodeEditor | null = null
let newEditor: monaco.editor.IStandaloneCodeEditor | null = null
let unifiedEditor: monaco.editor.IStandaloneCodeEditor | null = null

const filePath = computed(() => {
  const selected = repo.activeRepoPath ? diffStore.getSelectedFile(repo.activeRepoPath) : null
  return selected ?? ''
})

const commitSha = computed(() => {
  return rightPanel.selectedCommitSha ?? ''
})

const fileContent = computed(() => {
  if (!repo.activeRepoPath) return null
  return diffStore.getFileContent(repo.activeRepoPath)
})

const language = computed(() => {
  const ext = filePath.value.split('.').pop()?.toLowerCase()
  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    vue: 'vue',
    rust: 'rust',
    rs: 'rust',
    json: 'json',
    md: 'markdown',
    html: 'html',
    css: 'css',
    py: 'python',
    go: 'go',
    java: 'java',
    cpp: 'cpp',
    h: 'cpp',
    c: 'c',
    sh: 'shell',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'toml',
    lock: 'ini',
    cs: 'csharp',
    ps1: 'powershell',
    psm1: 'powershell',
  }
  return langMap[ext || ''] || 'plaintext'
})

function getMonacoTheme() {
  return theme === 'dark' ? 'vs-dark' : 'vs'
}

function createEditor(container: HTMLElement, content: string) {
  return monaco.editor.create(container, {
    value: content || '',
    language: language.value,
    theme: getMonacoTheme(),
    readOnly: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    lineNumbers: 'on',
    padding: { top: 16, bottom: 16 },
    fontSize: 13,
    fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
    lineHeight: 20,
    renderLineHighlight: 'none',
    cursorBlinking: 'smooth',
    smoothScrolling: true,
    overviewRulerBorder: false,
    overviewRulerLanes: 0,
    scrollbar: {
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10,
    },
    folding: false,
    bracketPairColorization: { enabled: true },
  })
}

let oldEditorDecorations: string[] = []
let newEditorDecorations: string[] = []

function getChangedLinesFromHunks(hunks: import('../../types/git').Hunk[]) {
  const removedLines: number[] = []
  const addedLines: number[] = []

  for (const hunk of hunks) {
    let oldLineNum = hunk.old_start
    let newLineNum = hunk.new_start

    for (const line of hunk.lines) {
      if ('Deletion' in line) {
        removedLines.push(oldLineNum - 1)
        oldLineNum++
      } else if ('Addition' in line) {
        addedLines.push(newLineNum - 1)
        newLineNum++
      } else {
        oldLineNum++
        newLineNum++
      }
    }
  }

  return { removedLines, addedLines }
}

function updateDiffDecorations(
  oldEditor: monaco.editor.IStandaloneCodeEditor | null,
  newEditor: monaco.editor.IStandaloneCodeEditor | null,
  hunks: import('../../types/git').Hunk[]
) {
  const { removedLines, addedLines } = getChangedLinesFromHunks(hunks)

  if (oldEditor) {
    const decorations: monaco.editor.IModelDeltaDecoration[] = removedLines.map(line => ({
      range: new monaco.Range(line + 1, 1, line + 1, 1),
      options: {
        isWholeLine: true,
        className: 'diff-line-removed',
        linesDecorationsClassName: 'diff-line-removed-decoration',
      },
    }))
    oldEditorDecorations = oldEditor.deltaDecorations(oldEditorDecorations, decorations)
  }

  if (newEditor) {
    const decorations: monaco.editor.IModelDeltaDecoration[] = addedLines.map(line => ({
      range: new monaco.Range(line + 1, 1, line + 1, 1),
      options: {
        isWholeLine: true,
        className: 'diff-line-added',
        linesDecorationsClassName: 'diff-line-added-decoration',
      },
    }))
    newEditorDecorations = newEditor.deltaDecorations(newEditorDecorations, decorations)
  }
}

function generateUnifiedDiff(hunks: import('../../types/git').Hunk[]): string {
  const result: string[] = []

  for (const hunk of hunks) {
    result.push(`@@ -${hunk.old_start},${hunk.old_lines} +${hunk.new_start},${hunk.new_lines} @@`)

    for (const line of hunk.lines) {
      if ('Context' in line) {
        result.push(` ${line.Context}`)
      } else if ('Addition' in line) {
        result.push(`+${line.Addition}`)
      } else if ('Deletion' in line) {
        result.push(`-${line.Deletion}`)
      }
    }
  }

  return result.join('\n')
}

function updateEditors(content?: import('../../types/git').FileContent) {
  const targetContent = content ?? fileContent.value
  if (!targetContent) return

  if (oldEditor) {
    oldEditor.setValue(targetContent.old_content || '')
  }
  if (newEditor) {
    newEditor.setValue(targetContent.new_content || '')
  }
  if (unifiedEditor) {
    const unifiedDiff = generateUnifiedDiff(targetContent.hunks || [])
    unifiedEditor.setValue(unifiedDiff)
  }

  updateDiffDecorations(
    oldEditor,
    newEditor,
    targetContent.hunks || []
  )
}

function setupScrollSync() {
  if (!oldEditor || !newEditor) return

  const editor1 = oldEditor
  const editor2 = newEditor

  editor1.onDidScrollChange((e) => {
    if (e.scrollTopChanged) {
      editor2.setScrollTop(editor1.getScrollTop())
    }
    if (e.scrollLeftChanged) {
      editor2.setScrollLeft(editor1.getScrollLeft())
    }
  })

  editor2.onDidScrollChange((e) => {
    if (e.scrollTopChanged) {
      editor1.setScrollTop(editor2.getScrollTop())
    }
    if (e.scrollLeftChanged) {
      editor1.setScrollLeft(editor2.getScrollLeft())
    }
  })
}

async function fetchAndUpdateContent() {
  if (!filePath.value || !commitSha.value || !repo.activeRepoPath) return
  
  loading.value = true
  try {
    const content = await diffStore.fetchFileContent(repo.activeRepoPath, commitSha.value, filePath.value)
    if (content) {
      updateEditors(content)
    }
  } catch (e) {
    toast.error('Failed to load file content')
    console.error('fetchFileContent error:', e)
  } finally {
    loading.value = false
  }
}

watch([filePath, commitSha], () => {
  fetchAndUpdateContent()
}, { immediate: true })

watch(fileContent, (content) => {
  if (content) {
    updateEditors(content)
  }
})

watch(mode, (newMode) => {
  setTimeout(() => {
    if (newMode === 'split') {
      if (!oldEditor && oldEditorRef.value) {
        oldEditor = createEditor(oldEditorRef.value, fileContent.value?.old_content || '')
      }
      if (!newEditor && newEditorRef.value) {
        newEditor = createEditor(newEditorRef.value, fileContent.value?.new_content || '')
      }
      setupScrollSync()
      updateDiffDecorations(oldEditor, newEditor, fileContent.value?.hunks || [])
    } else {
      if (!unifiedEditor && unifiedEditorRef.value) {
        const unifiedDiff = generateUnifiedDiff(fileContent.value?.hunks || [])
        unifiedEditor = createEditor(unifiedEditorRef.value, unifiedDiff)
      }
    }
  }, 100)
})

onMounted(() => {
  if (mode.value === 'split') {
    if (oldEditorRef.value) {
      oldEditor = createEditor(oldEditorRef.value, '')
    }
    if (newEditorRef.value) {
      newEditor = createEditor(newEditorRef.value, '')
    }
    setupScrollSync()
  } else {
    if (unifiedEditorRef.value) {
      unifiedEditor = createEditor(unifiedEditorRef.value, '')
    }
  }
  fetchAndUpdateContent()
})

onUnmounted(() => {
  oldEditor?.dispose()
  newEditor?.dispose()
  unifiedEditor?.dispose()
})

function goPrev() {
  const editor = mode.value === 'split' ? oldEditor : unifiedEditor
  editor?.setScrollTop((editor.getScrollTop() || 0) - 200)
}

function goNext() {
  const editor = mode.value === 'split' ? oldEditor : unifiedEditor
  editor?.setScrollTop((editor.getScrollTop() || 0) + 200)
}

function closeDiffView() {
  if (repo.activeRepoPath) {
    diffStore.selectFile(repo.activeRepoPath, null)
  }
}

function toggleBlame() {
  blameStore.toggleVisibility()
  if (blameStore.isVisible && repo.activeRepoPath && filePath.value) {
    blameStore.fetchBlame(repo.activeRepoPath, filePath.value, commitSha.value)
  }
}

function handleCommitClick(commitId: string) {
  console.log('Navigate to commit:', commitId)
}
</script>

<style scoped>
.commit-file-diff-view {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: var(--bg-primary, #1e1e1e);
}

.diff-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color, #3c3c3c);
  background: var(--bg-secondary, #252526);
  flex-shrink: 0;
  gap: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 1;
}

.file-path {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 13px;
  color: var(--text-primary, #e0e0e0);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.view-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.separator {
  width: 1px;
  height: 20px;
  background: var(--border-color, #3c3c3c);
  margin: 0 4px;
}

.diff-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.diff-content {
  flex: 1;
  overflow: hidden;
  background: var(--bg-primary, #1e1e1e);
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 16px;
}

.loading-text {
  color: var(--text-secondary, #8b949e);
  font-size: 14px;
}

.split-container {
  display: flex;
  height: 100%;
}

.panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.panel-divider {
  width: 1px;
  background: var(--border-color, #3c3c3c);
  flex-shrink: 0;
}

.old-panel {
  background: var(--bg-primary, #1e1e1e);
}

.new-panel {
  background: var(--bg-primary, #1e1e1e);
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary, #8b949e);
  background: var(--bg-secondary, #252526);
  border-bottom: 1px solid var(--border-color, #3c3c3c);
  flex-shrink: 0;
}

.header-icon {
  color: var(--text-muted, #6e7681);
  flex-shrink: 0;
}

.header-text {
  color: var(--text-secondary, #8b949e);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-text.muted {
  font-style: italic;
  opacity: 0.8;
}

.unified-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.editor-container {
  flex: 1;
  min-height: 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 8px;
  padding: 32px;
}

.empty-icon {
  color: var(--text-muted, #6e7681);
  opacity: 0.5;
  margin-bottom: 8px;
}

.empty-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #e0e0e0);
  margin: 0;
}

.empty-description {
  font-size: 13px;
  color: var(--text-secondary, #8b949e);
  margin: 0;
  text-align: center;
  max-width: 280px;
}

:deep(.diff-line-removed) {
  background-color: rgba(248, 81, 73, 0.15) !important;
}

:deep(.diff-line-removed-decoration) {
  background-color: rgba(248, 81, 73, 0.5) !important;
  width: 4px !important;
  left: 0 !important;
}

:deep(.diff-line-added) {
  background-color: rgba(46, 160, 67, 0.15) !important;
}

:deep(.diff-line-added-decoration) {
  background-color: rgba(46, 160, 67, 0.5) !important;
  width: 4px !important;
  left: 0 !important;
}

:deep(.diff-line-removed .line-numbers) {
  color: rgba(248, 81, 73, 0.8) !important;
}

:deep(.diff-line-added .line-numbers) {
  color: rgba(46, 160, 67, 0.8) !important;
}
</style>
