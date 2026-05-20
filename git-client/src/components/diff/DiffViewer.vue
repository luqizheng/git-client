<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import * as monaco from 'monaco-editor';
import loader from '@monaco-editor/loader';

const props = defineProps<{
  originalContent: string;
  modifiedContent: string;
  originalLanguage?: string;
  modifiedLanguage?: string;
  readOnly?: boolean;
}>();

const emit = defineEmits<{
  update: [content: string];
}>();

const editorContainer = ref<HTMLElement | null>(null);
const viewMode = ref<'side-by-side' | 'inline'>('side-by-side');
let editor: monaco.editor.IStandaloneDiffEditor | null = null;
let monacoLoaded = false;

const language = computed(() => props.originalLanguage || 'plaintext');

async function initEditor() {
  if (!editorContainer.value || monacoLoaded) return;

  loader.config({
    paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' }
  });

  await loader.init();
  monacoLoaded = true;

  editor = monaco.editor.createDiffEditor(editorContainer.value, {
    automaticLayout: true,
    theme: document.documentElement.classList.contains('dark') ? 'vs-dark' : 'vs',
    readOnly: props.readOnly ?? false,
    renderSideBySide: viewMode.value === 'side-by-side',
    scrollBeyondLastLine: false,
    minimap: { enabled: false },
    fontSize: 13,
    fontFamily: "'Cascadia Code', 'Fira Code', Consolas, monospace",
    lineNumbers: 'on',
    renderWhitespace: 'selection',
    wordWrap: 'on',
    folding: true,
    glyphMargin: true,
    scrollbar: {
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10,
    },
  });

  updateEditorContent();
}

function updateEditorContent() {
  if (!editor) return;

  const originalModel = monaco.editor.createModel(props.originalContent, language.value);
  const modifiedModel = monaco.editor.createModel(props.modifiedContent, language.value);

  editor.setModel({
    original: originalModel,
    modified: modifiedModel,
  });
}

function toggleViewMode() {
  viewMode.value = viewMode.value === 'side-by-side' ? 'inline' : 'side-by-side';
  if (editor) {
    editor.updateOptions({ renderSideBySide: viewMode.value === 'side-by-side' });
  }
}

watch(() => [props.originalContent, props.modifiedContent], updateEditorContent);

onMounted(() => {
  initEditor();
});

defineExpose({
  toggleViewMode,
  getEditor: () => editor,
});
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/50">
      <span class="text-sm text-muted-foreground">
        {{ viewMode === 'side-by-side' ? 'Side by Side' : 'Inline' }}
      </span>
      <button
        @click="toggleViewMode"
        class="px-2 py-1 text-xs rounded hover:bg-accent transition-colors"
      >
        Toggle View
      </button>
    </div>
    <div ref="editorContainer" class="flex-1 min-h-0" />
  </div>
</template>
