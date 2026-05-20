<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import DiffViewer from './DiffViewer.vue';
import DiffStatsBar from './DiffStatsBar.vue';
import InlineDiffView from './InlineDiffView.vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps<{
  repoPath: string;
  oldCommitId?: string;
  newCommitId?: string;
  files: DiffFile[];
  viewMode?: 'monaco' | 'inline';
}>();

const selectedFile = ref<DiffFile | null>(null);
const fileContent = ref<{ oldContent: string; newContent: string } | null>(null);
const loading = ref(false);
const currentViewMode = ref<'monaco' | 'inline'>(props.viewMode || 'monaco');

interface DiffFile {
  path: string;
  old_path: string | null;
  status: 'Added' | 'Modified' | 'Deleted' | 'Renamed' | 'Copied';
  hunks: Hunk[];
}

interface Hunk {
  old_start: number;
  old_lines: number;
  new_start: number;
  new_lines: number;
  lines: DiffLine[];
}

type DiffLine = { Context: string } | { Addition: string } | { Deletion: string };

const stats = computed(() => {
  if (!fileContent.value) return { additions: 0, deletions: 0 };

  const oldLines = fileContent.value.oldContent.split('\n').length;
  const newLines = fileContent.value.newContent.split('\n').length;

  return {
    additions: Math.max(0, newLines - oldLines),
    deletions: Math.max(0, oldLines - newLines),
  };
});

async function selectFile(file: DiffFile) {
  selectedFile.value = file;
  loading.value = true;

  try {
    if (props.oldCommitId && props.newCommitId) {
      const result = await invoke<{
        old_content: string | null;
        new_content: string | null;
      }>('get_file_diff_content', {
        repoPath: props.repoPath,
        oldCommitId: props.oldCommitId,
        newCommitId: props.newCommitId,
        filePath: file.path,
      });
      fileContent.value = {
        oldContent: result.old_content || '',
        newContent: result.new_content || '',
      };
    } else {
      fileContent.value = {
        oldContent: '',
        newContent: '',
      };
    }
  } catch (e) {
    console.error('Failed to load file diff:', e);
    fileContent.value = { oldContent: '', newContent: '' };
  } finally {
    loading.value = false;
  }
}

function getFileIcon(status: DiffFile['status']) {
  switch (status) {
    case 'Added': return '+';
    case 'Deleted': return '-';
    case 'Modified': return 'M';
    case 'Renamed': return 'R';
    case 'Copied': return 'C';
    default: return '?';
  }
}

function getFileIconClass(status: DiffFile['status']) {
  switch (status) {
    case 'Added': return 'text-accent-green';
    case 'Deleted': return 'text-destructive';
    case 'Modified': return 'text-primary';
    case 'Renamed': return 'text-accent-purple';
    case 'Copied': return 'text-accent-yellow';
    default: return 'text-muted-foreground';
  }
}

watch(() => props.files, (files) => {
  if (files.length > 0 && !selectedFile.value) {
    selectFile(files[0]);
  }
}, { immediate: true });
</script>

<template>
  <div class="flex h-full">
    <div class="w-64 border-r border-border flex flex-col bg-sidebar">
      <div class="p-2 border-b border-border">
        <h3 class="text-sm font-medium text-sidebar-foreground">{{ t('commit.files') || 'Files' }}</h3>
        <p class="text-xs text-muted-foreground mt-1">{{ files.length }} {{ t('commit.files_changed') || 'files changed' }}</p>
      </div>
      <div class="flex-1 overflow-y-auto">
        <div
          v-for="file in files"
          :key="file.path"
          @click="selectFile(file)"
          class="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-sidebar-accent transition-colors"
          :class="{ 'bg-accent/20': selectedFile?.path === file.path }"
        >
          <span :class="['text-xs font-mono w-4', getFileIconClass(file.status)]">
            {{ getFileIcon(file.status) }}
          </span>
          <span class="text-sm text-sidebar-foreground truncate flex-1">
            {{ file.path }}
          </span>
        </div>
      </div>
    </div>

    <div class="flex-1 flex flex-col min-w-0">
      <div v-if="selectedFile" class="border-b border-border px-3 py-2 bg-muted/50">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium truncate">{{ selectedFile.path }}</span>
          <DiffStatsBar :additions="stats.additions" :deletions="stats.deletions" />
        </div>
      </div>

      <div class="flex-1 min-h-0 relative">
        <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-background/80">
          <div class="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>

        <template v-if="fileContent && !loading">
          <DiffViewer
            v-if="currentViewMode === 'monaco'"
            :original-content="fileContent.oldContent"
            :modified-content="fileContent.newContent"
          />
          <InlineDiffView
            v-else
            :old-content="fileContent.oldContent"
            :new-content="fileContent.newContent"
            :hunks="selectedFile?.hunks || []"
          />
        </template>

        <div v-if="!selectedFile && !loading" class="flex items-center justify-center h-full text-muted-foreground">
          <p>Select a file to view diff</p>
        </div>
      </div>
    </div>
  </div>
</template>
