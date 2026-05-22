<script setup lang="ts">
import { computed, onUnmounted, ref } from "vue";

const ACTION_TYPES = {
  CHERRY_PICK: "cherry-pick",
  REBASE: "rebase",
  RESET_SOFT: "reset-soft",
  RESET_MIXED: "reset-mixed",
  RESET_HARD: "reset-hard",
  REVERT: "revert",
  CREATE_BRANCH: "create-branch",
  CREATE_TAG: "create-tag",
  COPY_SHA: "copy-sha",
} as const;

const graphWidth = ref(56)
const showBranchDialog = ref(false)
const showTagDialog = ref(false)
const dialogTargetCommit = ref<string | null>(null)
let isResizing = false
let startX = 0
let startWidth = 0

function onResizeStart(e: MouseEvent) {
  isResizing = true
  startX = e.clientX
  startWidth = graphWidth.value
  document.addEventListener('mousemove', onResizeMove)
  document.addEventListener('mouseup', onResizeEnd)
  e.preventDefault()
}

function onResizeMove(e: MouseEvent) {
  if (!isResizing) return
  const delta = e.clientX - startX
  graphWidth.value = Math.max(40, Math.min(200, startWidth + delta))
}

function onResizeEnd() {
  isResizing = false
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
}

onUnmounted(() => {
  contextMenu.value.visible = false;
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
});
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCommitList } from "../../composables/useCommitList";
import GraphyCell from "../cells/GraphyCell.vue";
import BranchTagCell from "../cells/BranchTagCell.vue";
import { useRightPanelStore } from "../../../../stores/rightPanel";
import { useStagingStore } from "../../../../stores/staging";
import { useRepoStore } from "../../../../stores/repo";
import { useCommitsStore } from "../../../../stores/commits";
import { invoke } from "../../../../utils/ipc";
import { toast } from "vue-sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { GitCommit } from "@vicons/ionicons5";
import BranchDialog from "@/components/branch/BranchDialog.vue";
import TagDialog from "@/components/tag/TagDialog.vue";

const rightPanelStore = useRightPanelStore();
const stagingStore = useStagingStore();
const repoStore = useRepoStore();
const commitsStore = useCommitsStore();

const {
  filterText,
  filteredCommits,
  selectedCommitId,
  contextMenu,
  handleClick,
  hideContextMenu,
  totalHeight,
  visibleItems,
} = useCommitList();

const hasWip = computed(() => {
  if (!repoStore.activeRepoPath) return false;
  const state = stagingStore.getFileState(repoStore.activeRepoPath);
  return state.unstaged.length > 0 || state.staged.length > 0;
});

const isLoading = computed(() => {
  if (!repoStore.activeRepoPath) return false;
  return commitsStore.isLoading(repoStore.activeRepoPath);
});

const wipUnstagedCount = computed(() => {
  if (!repoStore.activeRepoPath) return 0;
  return stagingStore.getFileState(repoStore.activeRepoPath).unstaged.length;
});

const wipStagedCount = computed(() => {
  if (!repoStore.activeRepoPath) return 0;
  return stagingStore.getFileState(repoStore.activeRepoPath).staged.length;
});

function onCommitClick(commitId: string) {
  const commit = filteredCommits.value.find((c) => c.id === commitId);
  commit && handleClick(commit);
}

function onWipClick() {
  rightPanelStore.showPanel("staging");
}

function onContextMenu(e: MouseEvent, commitId: string) {
  const commit = filteredCommits.value.find((c) => c.id === commitId);
  if (commit) {
    contextMenu.value = { visible: true, x: e.clientX, y: e.clientY, commit };
  }
}

function formatSha(sha: string) {
  return sha.slice(0, 7);
}

function formatTime(timestamp: number) {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

async function onDropdownSelect(key: string) {
  const commit = contextMenu.value.commit;
  hideContextMenu();
  if (!commit || !repoStore.activeRepoPath) return;

  try {
    switch (key) {
      case ACTION_TYPES.CHERRY_PICK:
        await invoke<void>("cherry_pick", {
          repoPath: repoStore.activeRepoPath,
          commitId: commit.id,
        });
        toast.success(`Cherry-picked ${commit.id.slice(0, 7)}`);
        break;
      case ACTION_TYPES.REBASE:
        toast.info("Interactive rebase coming in Phase 2c");
        return;
      case ACTION_TYPES.RESET_SOFT:
        await invoke<void>("reset_commit", {
          repoPath: repoStore.activeRepoPath,
          commitId: commit.id,
          mode: "soft",
        });
        toast.success("Soft reset successful");
        break;
      case ACTION_TYPES.RESET_MIXED:
        await invoke<void>("reset_commit", {
          repoPath: repoStore.activeRepoPath,
          commitId: commit.id,
          mode: "mixed",
        });
        toast.success("Mixed reset successful");
        break;
      case ACTION_TYPES.RESET_HARD:
        await invoke<void>("reset_commit", {
          repoPath: repoStore.activeRepoPath,
          commitId: commit.id,
          mode: "hard",
        });
        toast.success("Hard reset successful");
        break;
      case ACTION_TYPES.REVERT:
        await invoke<void>("revert_commit", {
          repoPath: repoStore.activeRepoPath,
          commitId: commit.id,
        });
        toast.success("Revert successful");
        break;
      case ACTION_TYPES.CREATE_BRANCH:
        dialogTargetCommit.value = commit.id
        showBranchDialog.value = true
        break;
      case ACTION_TYPES.CREATE_TAG:
        dialogTargetCommit.value = commit.id
        showTagDialog.value = true
        break;
      case ACTION_TYPES.COPY_SHA:
        await navigator.clipboard.writeText(commit.id);
        toast.success("SHA copied");
        return;
      default:
        return;
    }
    await commitsStore.fetchLogs(repoStore.activeRepoPath);
  } catch (e) {
    toast.error(String(e));
  }
}
</script>

<template>
  <div class="commit-list flex flex-col h-full w-full bg-card">
    <div class="toolbar flex items-center gap-2 px-2 py-1.5 border-b border-border shrink-0">
      <div class="search-box flex items-center bg-muted rounded px-2 py-0.5 flex-1 max-w-64">
        <svg class="w-3.5 h-3.5 text-muted-foreground mr-1 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input
          v-model="filterText"
          type="text"
          placeholder="Search..."
          class="bg-transparent border-none outline-none text-xs text-foreground w-full placeholder:text-muted-foreground"
        />
        <span v-if="filterText" class="text-xs text-muted-foreground ml-1">{{ filteredCommits.length }}</span>
      </div>
    </div>

    <ScrollArea ref="scrollContainer" class="flex-1">
      <div class="flex min-w-full bg-background">
        <div
          class="shrink-0 bg-background border-r border-border/50 relative"
          :style="{ width: graphWidth + 'px' }"
        >
          <div
            class="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize z-20 hover:bg-primary/30 transition-colors"
            @mousedown.prevent="onResizeStart"
          />
          <div class="sticky top-0 z-20 h-8 flex items-center px-2 bg-background border-b border-border/50">
            <span class="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Graph</span>
          </div>
          <GraphyCell :commits="filteredCommits" />
        </div>

        <div class="flex-1 min-w-0">
          <div class="sticky top-0 z-10 h-8 bg-card border-b border-border/50 px-2 flex items-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            <span class="flex-1">Message</span>
            <span class="w-20 shrink-0">Author</span>
            <span class="w-20 text-right">Date</span>
            <span class="w-16 shrink-0 font-mono text-right">SHA</span>
          </div>

          <div
            v-if="hasWip"
            class="h-8 px-2 flex items-center gap-4 hover:bg-accent/50 cursor-pointer transition-colors border-b border-border/50"
            @click="onWipClick"
          >
            <span class="flex-1 text-[11px] font-medium text-yellow-600 truncate">WIP</span>
            <span class="w-20 shrink-0 text-[10px] text-muted-foreground truncate">{{ wipStagedCount }}s / {{ wipUnstagedCount }}u</span>
            <span class="w-20 text-right text-[10px] text-muted-foreground">now</span>
            <span class="w-16 shrink-0 font-mono text-right text-[10px] text-muted-foreground">staging</span>
          </div>

          <div class="relative" :style="{ height: totalHeight + 'px' }">
            <template v-if="isLoading">
              <div v-for="i in 8" :key="'skel-'+i" class="absolute w-full h-8 px-2 flex items-center gap-4" :style="{ transform: 'translateY(' + ((i-1)*40) + 'px)' }">
                <Skeleton class="h-3 flex-1" />
                <Skeleton class="h-3 w-16" />
                <Skeleton class="h-3 w-16" />
                <Skeleton class="h-3 w-12" />
              </div>
            </template>

            <template v-else-if="!repoStore.activeRepoPath">
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="text-center">
                  <GitCommit class="w-10 h-10 opacity-30 mx-auto mb-2" />
                  <p class="text-xs text-muted-foreground">Open a repository to view commits</p>
                </div>
              </div>
            </template>

            <template v-else-if="filteredCommits.length === 0">
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="text-center">
                  <GitCommit class="w-10 h-10 opacity-30 mx-auto mb-2" />
                  <p class="text-xs text-muted-foreground">No commits found</p>
                </div>
              </div>
            </template>

            <template v-else>
              <div
                v-for="item in visibleItems"
                :key="filteredCommits[item.index].id"
                class="absolute w-full h-8 px-2 flex items-center gap-4 hover:bg-accent/50 cursor-pointer transition-colors"
                :class="selectedCommitId === filteredCommits[item.index].id ? 'bg-accent' : ''"
                :style="{ transform: 'translateY(' + item.start + 'px)' }"
                @click="onCommitClick(filteredCommits[item.index].id)"
                @contextmenu.prevent="onContextMenu($event, filteredCommits[item.index].id)"
              >
                <div class="flex-1 flex items-center gap-2 min-w-0">
                  <BranchTagCell :refs="filteredCommits[item.index].refs" />
                  <span class="text-[11px] truncate">{{ filteredCommits[item.index].message }}</span>
                </div>
                <div class="w-20 shrink-0">
                  <span class="text-[10px] text-muted-foreground truncate block">{{ filteredCommits[item.index].author }}</span>
                </div>
                <span class="w-20 text-right text-[10px] text-muted-foreground shrink-0">{{ formatTime(filteredCommits[item.index].time) }}</span>
                <span class="w-16 shrink-0 font-mono text-right text-[10px] text-muted-foreground">{{ formatSha(filteredCommits[item.index].id) }}</span>
              </div>
            </template>
          </div>
        </div>
      </div>
    </ScrollArea>

    <DropdownMenu
      :open="contextMenu.visible"
      @update:open="contextMenu.visible = $event"
    >
      <DropdownMenuTrigger as-child>
        <div
          :style="{
            position: 'fixed',
            left: contextMenu.x + 'px',
            top: contextMenu.y + 'px',
          }"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem @click="onDropdownSelect(ACTION_TYPES.CHERRY_PICK)"
          >Cherry-pick</DropdownMenuItem
        >
        <DropdownMenuItem @click="onDropdownSelect(ACTION_TYPES.REVERT)"
          >Revert</DropdownMenuItem
        >
        <DropdownMenuSeparator />
        <DropdownMenuItem @click="onDropdownSelect(ACTION_TYPES.REBASE)"
          >Rebase</DropdownMenuItem
        >
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Reset</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem @click="onDropdownSelect(ACTION_TYPES.RESET_SOFT)"
              >Soft</DropdownMenuItem
            >
            <DropdownMenuItem
              @click="onDropdownSelect(ACTION_TYPES.RESET_MIXED)"
              >Mixed</DropdownMenuItem
            >
            <DropdownMenuItem
              @click="onDropdownSelect(ACTION_TYPES.RESET_HARD)"
              class="text-destructive"
              >Hard</DropdownMenuItem
            >
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem @click="onDropdownSelect(ACTION_TYPES.CREATE_BRANCH)"
          >Create Branch</DropdownMenuItem
        >
        <DropdownMenuItem @click="onDropdownSelect(ACTION_TYPES.CREATE_TAG)"
          >Create Tag</DropdownMenuItem
        >
        <DropdownMenuSeparator />
        <DropdownMenuItem @click="onDropdownSelect(ACTION_TYPES.COPY_SHA)"
          >Copy SHA</DropdownMenuItem
        >
      </DropdownMenuContent>
    </DropdownMenu>

    <BranchDialog v-model:show="showBranchDialog" />

    <TagDialog
      :visible="showTagDialog"
      :repo-path="repoStore.activeRepoPath || ''"
      :target-sha="dialogTargetCommit ?? undefined"
      @update:visible="showTagDialog = $event"
    />
  </div>
</template>
