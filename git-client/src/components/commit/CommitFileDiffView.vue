<script setup lang="ts">
import { ref, computed, watch, watchEffect, onMounted, onUnmounted, nextTick } from 'vue'
import { Button } from '@/components/ui/button'
import {
  X,
  ChevronUp,
  ChevronDown,
  FileText,
  GitCompare,
  FileX2,
  User,
} from 'lucide-vue-next'
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

const pendingContent = ref<import('../../types/git').FileContent | null>(null)

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

  pendingContent.value = targetContent

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

watch([() => filePath.value, () => commitSha.value], () => {
  fetchAndUpdateContent()
}, { immediate: true })

watchEffect(() => {
  const content = pendingContent.value
  console.log('[DiffView] watchEffect triggered, content:', !!content, 'oldEditor:', !!oldEditor, 'newEditor:', !!newEditor, 'oldEditorRef:', !!oldEditorRef.value, 'newEditorRef:', !!newEditorRef.value)
  if (content && oldEditorRef.value && newEditorRef.value) {
    if (!oldEditor) {
      console.log('[DiffView] Creating oldEditor in watchEffect')
      oldEditor = createEditor(oldEditorRef.value, content.old_content || '')
    }
    if (!newEditor) {
      console.log('[DiffView] Creating newEditor in watchEffect')
      newEditor = createEditor(newEditorRef.value, content.new_content || '')
    }
  }
  if (content) {
    updateEditors(content!)
  }
})

function createEditorsIfNeeded() {
  if (mode.value === 'split') {
    if (!oldEditor && oldEditorRef.value) {
      oldEditor = createEditor(oldEditorRef.value, pendingContent.value?.old_content || '')
    }
    if (!newEditor && newEditorRef.value) {
      newEditor = createEditor(newEditorRef.value, pendingContent.value?.new_content || '')
    }
    if (oldEditor && newEditor) {
      setupScrollSync()
      updateDiffDecorations(oldEditor, newEditor, pendingContent.value?.hunks || [])
    }
  } else {
    if (!unifiedEditor && unifiedEditorRef.value) {
      const unifiedDiff = generateUnifiedDiff(pendingContent.value?.hunks || [])
      unifiedEditor = createEditor(unifiedEditorRef.value, unifiedDiff)
    }
  }
}

watch(mode, () => {
  nextTick(() => {
    createEditorsIfNeeded()
  })
})

onMounted(() => {
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

<template>
  <div class="flex flex-col w-full h-full bg-background">
    <div class="flex items-center justify-between px-3 py-2 border-b border-border shrink-0 gap-3">
      <div class="flex items-center min-w-0 flex-1">
        <span class="font-mono text-sm text-foreground truncate">{{ filePath }}</span>
      </div>
      <div class="flex items-center gap-1 shrink-0">
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
        <div class="w-px h-5 bg-border mx-1" />
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
        <div class="w-px h-5 bg-border mx-1" />
        <Button
          :variant="blameStore.isVisible ? 'default' : 'outline'"
          size="sm"
          @click="toggleBlame"
          title="Toggle Blame"
        >
          <User class="w-4 h-4 mr-1" />
          Blame
        </Button>
        <div class="w-px h-5 bg-border mx-1" />
        <Button
          size="icon"
          variant="ghost"
          class="h-8 w-8"
          @click="closeDiffView"
          title="Close (Esc)"
        >
          <X class="w-4 h-4" />
        </Button>
      </div>
    </div>
    <div class="flex flex-1 overflow-hidden">
      <BlamePanel
        v-if="repo.activeRepoPath && filePath"
        :repo-path="repo.activeRepoPath"
        :file-path="filePath"
        :commit-id="commitSha"
        @commit-click="handleCommitClick"
      />
      <div class="flex-1 overflow-hidden relative">
        <div v-if="loading" class="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/80 z-10">
          <div class="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          <span class="text-sm text-muted-foreground">Loading file content...</span>
        </div>
        <template v-if="mode === 'split'">
          <div class="flex h-full">
            <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
              <div class="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50 border-b border-border shrink-0">
                <FileText class="w-4 h-4 shrink-0" />
                <span v-if="fileContent?.old_path" class="truncate">{{ fileContent.old_path }}</span>
                <span v-else class="italic opacity-80">(previous commit)</span>
              </div>
              <div ref="oldEditorRef" class="flex-1 min-h-0" />
            </div>
            <div class="w-px bg-border shrink-0" />
            <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
              <div class="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50 border-b border-border shrink-0">
                <FileText class="w-4 h-4 shrink-0" />
                <span class="truncate">{{ fileContent?.new_path }}</span>
              </div>
              <div ref="newEditorRef" class="flex-1 min-h-0" />
            </div>
          </div>
        </template>
        <template v-else>
          <div class="flex flex-col h-full">
            <div class="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50 border-b border-border shrink-0">
              <GitCompare class="w-4 h-4 shrink-0" />
              <span>Unified Diff</span>
            </div>
            <div ref="unifiedEditorRef" class="flex-1 min-h-0" />
          </div>
        </template>
        <div v-if="!loading && !filePath" class="absolute inset-0 flex flex-col items-center justify-center gap-2 p-8 bg-background">
          <FileX2 class="w-12 h-12 text-muted-foreground/50" />
          <p class="text-base font-semibold text-foreground">No File Selected</p>
          <p class="text-sm text-muted-foreground text-center max-w-xs">Select a file from the commit details to view its content</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
