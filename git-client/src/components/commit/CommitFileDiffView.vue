<template>
  <div class="commit-file-diff-view">
    <div class="diff-header">
      <div class="header-left">
        <span class="file-path">{{ filePath }}</span>
      </div>
      <div class="view-controls">
        <n-button-group size="small">
          <n-button
            :type="mode === 'split' ? 'primary' : 'default'"
            @click="mode = 'split'"
            title="Split View"
          >
            Split
          </n-button>
          <n-button
            :type="mode === 'unified' ? 'primary' : 'default'"
            @click="mode = 'unified'"
            title="Unified View"
          >
            Unified
          </n-button>
        </n-button-group>
        <div class="separator" />
        <n-button-group size="small">
          <n-button
            quaternary
            @click="goPrev"
            title="Previous Change (Alt+Up)"
          >
            <template #icon>
              <n-icon><ChevronUp /></n-icon>
            </template>
          </n-button>
          <n-button
            quaternary
            @click="goNext"
            title="Next Change (Alt+Down)"
          >
            <template #icon>
              <n-icon><ChevronDown /></n-icon>
            </template>
          </n-button>
        </n-button-group>
        <div class="separator" />
        <n-button
          quaternary
          circle
          size="small"
          @click="closeDiffView"
          title="Close (Esc)"
        >
          <template #icon>
            <n-icon><CloseOutline /></n-icon>
          </template>
        </n-button>
      </div>
    </div>
    <div class="diff-content">
      <div v-if="loading" class="loading-state">
        <n-spin size="medium" />
        <span class="loading-text">Loading file content...</span>
      </div>
      <div v-else-if="fileContent" class="split-container">
        <template v-if="mode === 'split'">
          <div class="panel old-panel">
            <div class="panel-header">
              <n-icon size="14" class="header-icon"><DocumentText /></n-icon>
              <span v-if="fileContent.old_path" class="header-text">{{ fileContent.old_path }}</span>
              <span v-else class="header-text muted">(previous commit)</span>
            </div>
            <div ref="oldEditorRef" class="editor-container"></div>
          </div>
          <div class="panel-divider" />
          <div class="panel new-panel">
            <div class="panel-header">
              <n-icon size="14" class="header-icon"><DocumentText /></n-icon>
              <span class="header-text">{{ fileContent.new_path }}</span>
            </div>
            <div ref="newEditorRef" class="editor-container"></div>
          </div>
        </template>
        <template v-else>
          <div class="unified-container">
            <div class="panel-header">
              <n-icon size="14" class="header-icon"><GitCompare /></n-icon>
              <span class="header-text">Unified Diff</span>
            </div>
            <div ref="unifiedEditorRef" class="editor-container"></div>
          </div>
        </template>
      </div>
      <div v-else class="empty-state">
        <n-icon size="48" class="empty-icon"><FileTrayOutline /></n-icon>
        <p class="empty-title">No File Selected</p>
        <p class="empty-description">Select a file from the commit details to view its content</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { NButton, NButtonGroup, NIcon, NSpin, useMessage } from 'naive-ui'
import { CloseOutline, ChevronUp, ChevronDown, DocumentText, GitCompare, FileTrayOutline } from '@vicons/ionicons5'
import * as monaco from 'monaco-editor'
import { useDiffStore } from '../../stores/diff'
import { useRepoStore } from '../../stores/repo'
import { useRightPanelStore } from '../../stores/rightPanel'

const diffStore = useDiffStore()
const repo = useRepoStore()
const rightPanel = useRightPanelStore()
const msg = useMessage()
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
    csharp: 'csharp',
    java: 'java',
    ps1: 'powershell',
    psm1: 'powershell',
  }
  return langMap[ext || ''] || 'plaintext'
})

function createEditor(container: HTMLElement, content: string) {
  return monaco.editor.create(container, {
    value: content || '',
    language: language.value,
    theme: 'vs-dark',
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

function computeDiffLines(oldContent: string, newContent: string): { removedLines: number[]; addedLines: number[] } {
  const oldLines = oldContent.split('\n')
  const newLines = newContent.split('\n')
  
  const matrix: number[][] = Array(oldLines.length + 1).fill(null).map(() => Array(newLines.length + 1).fill(0))
  
  for (let i = 1; i <= oldLines.length; i++) {
    for (let j = 1; j <= newLines.length; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1] + 1
      } else {
        matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1])
      }
    }
  }
  
  const removedLines: number[] = []
  const addedLines: number[] = []
  
  let i = oldLines.length
  let j = newLines.length
  
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      i--
      j--
    } else if (j > 0 && (i === 0 || matrix[i][j - 1] >= matrix[i - 1][j])) {
      addedLines.push(j - 1)
      j--
    } else if (i > 0) {
      removedLines.push(i - 1)
      i--
    }
  }
  
  return { removedLines, addedLines }
}

function updateDiffDecorations(
  oldEditor: monaco.editor.IStandaloneCodeEditor | null,
  newEditor: monaco.editor.IStandaloneCodeEditor | null,
  oldContent: string,
  newContent: string
) {
  const { removedLines, addedLines } = computeDiffLines(oldContent, newContent)
  
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

function generateUnifiedDiff(oldContent: string, newContent: string): string {
  const oldLines = oldContent.split('\n')
  const newLines = newContent.split('\n')
  
  const result: string[] = []
  const matrix: number[][] = Array(oldLines.length + 1).fill(null).map(() => Array(newLines.length + 1).fill(0))
  
  for (let i = 1; i <= oldLines.length; i++) {
    for (let j = 1; j <= newLines.length; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1] + 1
      } else {
        matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1])
      }
    }
  }
  
  const diffResult: { type: 'add' | 'remove' | 'equal'; line: string }[] = []
  let i = oldLines.length
  let j = newLines.length
  
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      diffResult.unshift({ type: 'equal', line: oldLines[i - 1] })
      i--
      j--
    } else if (j > 0 && (i === 0 || matrix[i][j - 1] >= matrix[i - 1][j])) {
      diffResult.unshift({ type: 'add', line: newLines[j - 1] })
      j--
    } else if (i > 0) {
      diffResult.unshift({ type: 'remove', line: oldLines[i - 1] })
      i--
    }
  }
  
  for (const item of diffResult) {
    switch (item.type) {
      case 'add':
        result.push(`+${item.line}`)
        break
      case 'remove':
        result.push(`-${item.line}`)
        break
      case 'equal':
        result.push(` ${item.line}`)
        break
    }
  }
  
  return result.join('\n')
}

function updateEditors(content?: { old_content: string | null; new_content: string | null }) {
  const targetContent = content ?? fileContent.value
  if (!targetContent) return

  if (oldEditor) {
    oldEditor.setValue(targetContent.old_content || '')
  }
  if (newEditor) {
    newEditor.setValue(targetContent.new_content || '')
  }
  if (unifiedEditor) {
    const unifiedDiff = generateUnifiedDiff(
      targetContent.old_content || '',
      targetContent.new_content || ''
    )
    unifiedEditor.setValue(unifiedDiff)
  }
  
  updateDiffDecorations(
    oldEditor,
    newEditor,
    targetContent.old_content || '',
    targetContent.new_content || ''
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
    msg.error('Failed to load file content')
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
    } else {
      if (!unifiedEditor && unifiedEditorRef.value) {
        const unifiedDiff = generateUnifiedDiff(
          fileContent.value?.old_content || '',
          fileContent.value?.new_content || ''
        )
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
  rightPanel.showFileDiff = false
  if (repo.activeRepoPath) {
    diffStore.clearSelectedFile(repo.activeRepoPath)
  }
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
