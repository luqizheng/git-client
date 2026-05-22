# Commit-List P0+P1 Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance commit-list.vue to match GitKraken core UX: virtual scrolling, branch/tag creation from context menu, proper refs display, keyboard navigation, and hover preview.

**Architecture:** All changes are frontend-only in `git-client/src/components/commit/`. The composable `useCommitList.ts` already has virtualizer code — we wire it into the template. `BranchDialog.vue` exists and just needs state binding. `TagDialog.vue` needs Naive UI → shadcn migration first. New composable `useCommitKeyboard.ts` handles keyboard shortcuts.

**Tech Stack:** Vue 3 Composition API, @tanstack/vue-virtual, shadcn-vue Dialog/Input/Button/Checkbox/Tooltip, useKeyboard composable

**Total Estimated Time:** ~90 minutes (6 Tasks, ~15 min each average)

---

## Safety Protocol

> ⚠️ Before each Task, run: `git stash push -m "backup before <task-name>"`

> 🔄 If a step fails or breaks the build:
> ```bash
> git stash pop && git checkout -- .
> ```

---

## Execution Order Constraint

```
⚠️ Tasks must be executed in this exact order due to dependencies:

  Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6

Reasoning:
- Task 1 changes the commit row template (BranchTagCell), required by Task 2's new template
- Task 2 rewrites the entire scroll body template, required by Task 5 and 6
- Task 5 and 6 reference virtual item structure (item.index) from Task 2
- Task 3 and 4 (dialog integration) can run in parallel with each other but AFTER Task 2
```

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `commit-list.vue` | Modify | Virtual scroll template, import dialogs, add keyboard/hover |
| `GraphyCell.vue` | **No change** | Graph renders cheaply, no virtual scroll needed |
| `composables/useCommitList.ts` | Minor tweak | WIP offset in totalHeight |
| `composables/useCommitKeyboard.ts` | Create | Keyboard navigation + multi-select logic |
| `TagDialog.vue` | Rewrite | Migrate n-modal to shadcn Dialog |

---

### Task 1: Fix Refs Display — Use BranchTagCell Component

> **Time Estimate:** 5 min | **Risk:** Low

**Files:**
- Modify: `src/components/commit/components/commit-list/commit-list.vue:307-316`

- [ ] **Step 1: Import BranchTagCell**

Add import alongside existing imports (after line 59):

```ts
import BranchTagCell from "../cells/BranchTagCell.vue";
```

- [ ] **Step 2: Replace inline refs template with BranchTagCell**

Replace lines 307–316:

```vue
<!-- BEFORE -->
<div class="flex-1 flex items-center gap-2 min-w-0">
  <span
    v-for="ref in commit.refs.slice(0, 1)"
    :key="ref.name"
    :class="clsx('px-1 py-0 rounded text-[9px] font-medium shrink-0', ref.ref_type === 'tag' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400')"
  >
    {{ ref.name }}
  </span>
  <span class="text-[11px] truncate">{{ commit.message }}</span>
</div>

<!-- AFTER -->
<div class="flex-1 flex items-center gap-2 min-w-0">
  <BranchTagCell :refs="commit.refs" />
  <span class="text-[11px] truncate">{{ commit.message }}</span>
</div>
```

- [ ] **Step 3: Verify visually**

Run: `npm run dev:git-client`
Expected: Commits with multiple branches/tags show up to 3 pills + "+N" overflow indicator

- [ ] **Step 4: Commit**

```
git add git-client/src/components/commit/components/commit-list/commit-list.vue
git commit -m "feat(commit-list): use BranchTagCell for full refs display"
```

---

### Task 2: Enable Virtual Scrolling

> **Time Estimate:** 25 min | **Risk:** Medium | **Most complex task**

**Files:**
- Modify: `src/components/commit/components/commit-list/commit-list.vue`
- Modify: `src/components/commit/composables/useCommitList.ts`

> **GraphyCell Strategy:** Graph column does NOT use virtual scroll. The SVG graph is lightweight — rendering all rows is fast even with 10,000 commits. We virtualize only the data columns (Message/Author/Date/SHA). This avoids the complex coordinate system synchronization issues that would arise from virtualizing a canvas-based graph layout.

- [ ] **Step 1: Modify useCommitList.ts to account for WIP row height**

Open `useCommitList.ts` and find the `rowVirtualizer` config. The WIP row takes 40px before the virtual list starts, so we need to add it to `totalHeight`.

Replace the `rowVirtualizer` setup block (around lines 43–51):

```ts
const rowVirtualizer = useVirtualizer({
  get count() { return filteredCommits.value.length },
  getScrollElement: () => scrollContainer.value,
  estimateSize: () => 40,
  overscan: 10,
})

const WIP_HEIGHT = 40

const totalHeight = computed(() => {
  const commitsHeight = rowVirtualizer.value.getTotalSize()
  return commitsHeight + WIP_HEIGHT
})
```

- [ ] **Step 2: Add ScrollArea ref binding in commit-list.vue**

Replace `<ScrollArea class="flex-1">` (line 224) with:

```vue
<ScrollArea ref="scrollContainer" class="flex-1">
```

Add `scrollContainer`, `onScroll`, `totalHeight`, `visibleItems` to the destructured composable (replace lines 75–82):

```ts
const {
  filterText,
  filteredCommits,
  selectedCommitId,
  contextMenu,
  handleClick,
  hideContextMenu,
  scrollContainer,
  onScroll,
  totalHeight,
  visibleItems,
} = useCommitList();
```

- [ ] **Step 3a: Rewrite Graph Column (simplified, no virtual scroll)**

Replace the Graph column div section in `<ScrollArea>` (inside lines 225–250) with:

```vue
<!-- Graph Column — NO virtual scroll, renders all rows cheaply -->
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
```

- [ ] **Step 3b: Rewrite Data Columns with Virtual Scrolling**

Replace the remaining content after the Graph column (after the Graph column closing `</div>`) with the Data Columns section:

```vue
<!-- Data Columns — WITH virtual scroll -->
<div class="flex-1 min-w-0">
  <div class="sticky top-0 z-10 h-8 bg-card border-b border-border/50 px-2 flex items-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
    <span class="flex-1">Message</span>
    <span class="w-20 shrink-0">Author</span>
    <span class="w-20 text-right">Date</span>
    <span class="w-16 shrink-0 font-mono text-right">SHA</span>
  </div>

  <!-- WIP row: outside virtual list, fixed at top -->
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

  <!-- Virtual list container: virtualizes commits only -->
  <div class="relative" :style="{ height: totalHeight + 'px' }">
    <!-- Loading skeleton -->
    <template v-if="isLoading">
      <div v-for="i in 8" :key="'skel-'+i" class="absolute w-full h-8 px-2 flex items-center gap-4" :style="{ transform: `translateY(${(i-1)*40}px)` }">
        <Skeleton class="h-3 flex-1" />
        <Skeleton class="h-3 w-16" />
        <Skeleton class="h-3 w-16" />
        <Skeleton class="h-3 w-12" />
      </div>
    </template>

    <!-- No repo -->
    <template v-else-if="!repoStore.activeRepoPath">
      <div class="absolute inset-0 flex items-center justify-center">
        <div class="text-center">
          <GitCommit class="w-10 h-10 opacity-30 mx-auto mb-2" />
          <p class="text-xs text-muted-foreground">Open a repository to view commits</p>
        </div>
      </div>
    </template>

    <!-- No results -->
    <template v-else-if="filteredCommits.length === 0">
      <div class="absolute inset-0 flex items-center justify-center">
        <div class="text-center">
          <GitCommit class="w-10 h-10 opacity-30 mx-auto mb-2" />
          <p class="text-xs text-muted-foreground">No commits found</p>
        </div>
      </div>
    </template>

    <!-- Virtual rows -->
    <template v-else>
      <div
        v-for="item in visibleItems"
        :key="filteredCommits[item.index].id"
        class="absolute w-full h-8 px-2 flex items-center gap-4 hover:bg-accent/50 cursor-pointer transition-colors"
        :class="selectedCommitId === filteredCommits[item.index].id ? 'bg-accent' : ''"
        :style="{ transform: `translateY(${item.start}px)` }"
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
```

> **Note:** The outer `<div class="flex min-w-full bg-background">` wraps both columns. Ensure it closes properly.

- [ ] **Step 4: Fix ScrollArea ref for @tanstack/vue-virtual**

The shadcn `ScrollArea` wraps `ScrollAreaViewport` which uses `overflow: hidden`. The scroll event comes from the root div. We need to make the virtualizer read from the right element.

Open `git-client/src/components/ui/scroll-area/ScrollArea.vue` and add ref forwarding to the viewport:

Replace the template section:

```vue
<template>
  <ScrollAreaRoot v-bind="delegatedProps" :class="cn('relative overflow-hidden', props.class)">
    <ScrollAreaViewport ref="viewportRef" class="h-full w-full rounded-[inherit]">
      <slot />
    </ScrollAreaViewport>
    <ScrollBar />
    <ScrollAreaCorner />
  </ScrollAreaRoot>
</template>

<script setup lang="ts">
import type { ScrollAreaRootProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import {
  ScrollAreaCorner,
  ScrollAreaRoot,
  ScrollAreaViewport,
} from "reka-ui"
import { cn } from "@/lib/utils"
import ScrollBar from "./ScrollBar.vue"

const props = defineProps<ScrollAreaRootProps & { class?: HTMLAttributes["class"] }>()
const delegatedProps = reactiveOmit(props, "class")

const viewportRef = ref<HTMLElement | null>(null)
defineExpose({ viewportRef })
</script>
```

Then update `useCommitList.ts` to use the viewport ref:

```ts
getScrollElement: () => {
  const scrollArea = scrollContainer.value
  return scrollArea?.viewportRef ?? null
},
```

- [ ] **Step 5: Test with large repo**

Run: `npm run dev:git-client`
Open a repo with 500+ commits. Verify:
- Only ~25 rows rendered in DOM at any time
- Smooth scrolling without jank
- Graph column stays visually aligned with data columns
- WIP row stays fixed at top when scrolling

- [ ] **Step 6: Commit**

```
git add git-client/src/components/commit/components/commit-list/commit-list.vue \
        git-client/src/components/ui/scroll-area/ScrollArea.vue \
        git-client/src/components/commit/composables/useCommitList.ts
git commit -m "perf(commit-list): enable virtual scrolling for commit list"
```

---

### Task 3: Integrate Create Branch Dialog

> **Time Estimate:** 8 min | **Risk:** Low

**Files:**
- Modify: `src/components/commit/components/commit-list/commit-list.vue`

- [ ] **Step 1: Import BranchDialog component**

Add after line 68:

```ts
import BranchDialog from "@/components/branch/BranchDialog.vue";
```

- [ ] **Step 2: Add dialog state**

Add after `graphWidth` ref (line 16):

```ts
const showBranchDialog = ref(false)
const dialogTargetCommit = ref<string | null>(null)
```

- [ ] **Step 3: Update onDropdownSelect handler**

Replace the CREATE_BRANCH case (lines 187–189):

```ts
case ACTION_TYPES.CREATE_BRANCH:
  dialogTargetCommit.value = commit.id
  showBranchDialog.value = true
  break
```

- [ ] **Step 4: Add BranchDialog to template**

Add before closing `</div>` of `.commit-list` (before line 383):

```vue
<BranchDialog v-model:show="showBranchDialog" />
```

- [ ] **Step 5: Verify flow**

Run: `npm run dev:git-client`
Right-click a commit → "Create Branch" → Dialog opens → Enter name → Create → Toast success → Branch appears on commit

- [ ] **Step 6: Commit**

```
git add git-client/src/components/commit/components/commit-list/commit-list.vue
git commit -m "feat(commit-list): integrate Create Branch dialog from context menu"
```

---

### Task 4: Migrate TagDialog to shadcn + Integrate

> **Time Estimate:** 20 min | **Risk:** Medium

**Files:**
- Rewrite: `src/components/tag/TagDialog.vue`
- Modify: `src/components/commit/components/commit-list/commit-list.vue`

- [ ] **Step 1: Rewrite TagDialog.vue with shadcn components**

Full replacement of `src/components/tag/TagDialog.vue`:

```vue
<template>
  <Dialog :open="visible" @update:open="$emit('update:visible', $event)">
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Create Tag</DialogTitle>
        <DialogDescription>Create a new tag at the specified commit</DialogDescription>
      </DialogHeader>
      <div class="grid gap-4 py-4">
        <div class="grid grid-cols-4 items-center gap-4">
          <Label class="text-right" for="tag-name">Name</Label>
          <Input id="tag-name" v-model="form.name" placeholder="v1.0.0" class="col-span-3" />
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <Label class="text-right" for="tag-target">Target</Label>
          <Input id="tag-target" v-model="form.target" class="col-span-3 font-mono text-xs" />
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <Label class="text-right" for="tag-message">Message</Label>
          <Textarea id="tag-message" v-model="form.message" placeholder="Optional annotated tag message" class="col-span-3" rows="3" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="$emit('update:visible', false)">Cancel</Button>
        <Button :disabled="!form.name.trim()" @click="handleCreate">Create Tag</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'vue-sonner'
import { useTagsStore } from '../../stores/tags'

const props = defineProps<{
  visible: boolean
  repoPath: string
  targetSha?: string
}>()
const emit = defineEmits<{ 'update:visible': [boolean]; created: [] }>()

const tagsStore = useTagsStore()

const form = reactive({
  name: '',
  target: '',
  message: '',
})

watch(() => props.visible, (val) => {
  if (val) {
    form.name = ''
    form.target = props.targetSha || 'HEAD'
    form.message = ''
  }
})

watch(() => props.targetSha, (sha) => {
  if (sha) form.target = sha
})

async function handleCreate() {
  if (!props.repoPath || !form.name.trim()) return
  try {
    await tagsStore.createTag(props.repoPath, form.name.trim(), form.target, form.message || undefined)
    toast.success(`Tag ${form.name.trim()} created`)
    form.name = ''
    form.message = ''
    emit('update:visible', false)
    emit('created')
  } catch (e: any) {
    toast.error(String(e))
  }
}
</script>
```

- [ ] **Step 2: Check Textarea component exists**

Run: `ls git-client/src/components/ui/textarea*`
If missing, generate:

```bash
cd git-client
npx shadcn-vue@latest add textarea
```

- [ ] **Step 3: Import and integrate TagDialog in commit-list.vue**

Add import after BranchDialog import:

```ts
import TagDialog from "@/components/tag/TagDialog.vue";
```

Add state after `showBranchDialog`:

```ts
const showTagDialog = ref(false)
```

Update CREATE_TAG case in onDropdownSelect:

```ts
case ACTION_TYPES.CREATE_TAG:
  dialogTargetCommit.value = commit.id
  showTagDialog.value = true
  break
```

Add to template after BranchDialog:

```vue
<TagDialog
  :visible="showTagDialog"
  :repo-path="repoStore.activeRepoPath!"
  :target-sha="dialogTargetCommit ?? undefined"
  @update:visible="showTagDialog = $event"
/>
```

- [ ] **Step 4: Verify both dialogs work**

Run: `npm run dev:git-client`
Test: Right-click commit → Create Tag → Dialog opens with SHA pre-filled → Create → Success toast

- [ ] **Step 5: Commit**

```
git add git-client/src/components/tag/TagDialog.vue \
        git-client/src/components/commit/components/commit-list/commit-list.vue
git commit -m "feat(commit-list): migrate TagDialog to shadcn + integrate context menu"
```

---

### Task 5: Keyboard Navigation Composable

> **Time Estimate:** 15 min | **Risk:** Low

**Files:**
- Create: `src/components/commit/composables/useCommitKeyboard.ts`
- Modify: `src/components/commit/components/commit-list/commit-list.vue`

- [ ] **Step 1: Create useCommitKeyboard.ts**

```ts
import { ref, computed } from 'vue'
import { useKeyboard } from '../../../composables/useKeyboard'
import type { Commit } from '../../../types/git'

export function useCommitKeyboard(commits: () => Commit[], options: {
  onSelect: (commit: Commit) => void
  onCopySha: (sha: string) => void
  onOpenDetail: (commit: Commit) => void
}) {
  const selectedIndex = ref(-1)
  const selectedIds = ref<Set<string>>(new Set())
  const isMultiSelectMode = ref(false)

  const selectedCommit = computed(() => {
    if (selectedIndex.value >= 0 && selectedIndex.value < commits().length) {
      return commits()[selectedIndex.value]
    }
    return null
  })

  function moveUp() {
    if (selectedIndex.value > 0) {
      selectedIndex.value--
      options.onSelect(commits()[selectedIndex.value])
    }
  }

  function moveDown() {
    if (selectedIndex.value < commits().length - 1) {
      selectedIndex.value++
      options.onSelect(commits()[selectedIndex.value])
    }
  }

  function toggleMultiSelect(id: string) {
    isMultiSelectMode.value = true
    if (selectedIds.value.has(id)) {
      selectedIds.value.delete(id)
    } else {
      selectedIds.value.add(id)
    }
    selectedIds.value = new Set(selectedIds.value)
  }

  function clearSelection() {
    selectedIds.value.clear()
    isMultiSelectMode.value = false
  }

  const shortcuts = [
    { key: 'ArrowUp', handler: moveUp },
    { key: 'ArrowDown', handler: moveDown },
    {
      key: 'Enter',
      handler: () => {
        if (selectedCommit.value) options.onOpenDetail(selectedCommit.value)
      }
    },
    {
      key: ' ',
      ctrl: false,
      shift: false,
      alt: false,
      handler: (e: Event) => {
        e.preventDefault()
        if (selectedCommit.value) toggleMultiSelect(selectedCommit.value.id)
      }
    },
    {
      key: 'c',
      ctrl: true,
      handler: () => {
        if (selectedCommit.value) options.onCopySha(selectedCommit.value.id)
      }
    },
    {
      key: 'Escape',
      handler: clearSelection
    },
  ]

  useKeyboard(shortcuts)

  return {
    selectedIndex,
    selectedIds,
    isMultiSelectMode,
    selectedCommit,
    moveUp,
    moveDown,
    toggleMultiSelect,
    clearSelection,
  }
}
```

- [ ] **Step 2: Wire into commit-list.vue**

Add import:

```ts
import { useCommitKeyboard } from "./composables/useCommitKeyboard";
```

After the existing `useCommitList()` call (line 82), add:

```ts
const {
  selectedIndex,
  selectedIds,
  isMultiSelectMode,
  clearSelection,
} = useCommitKeyboard(() => filteredCommits.value, {
  onSelect: (commit) => handleClick(commit),
  onCopySha: async (sha) => {
    await navigator.clipboard.writeText(sha)
    toast.success("SHA copied")
  },
  onOpenDetail: (commit) => handleClick(commit),
})
```

Update hideContextMenu to also clear selection:

```ts
function hideContextMenu() {
  contextMenu.value = { visible: false, x: 0, y: 0, commit: null }
  clearSelection()
}
```

Update the virtual row class binding. In the virtual rows template, the row div class becomes:

```ts
:class="clsx(
  'absolute w-full h-8 px-2 flex items-center gap-4 hover:bg-accent/50 cursor-pointer transition-colors',
  selectedCommitId === filteredCommits[item.index].id ? 'bg-accent' : '',
  selectedIds.has(filteredCommits[item.index].id) ? 'ring-1 ring-primary' : ''
)"
```

And in the computed/composable, the selected row highlight uses `item.index`:

```ts
// selectedCommitId === filteredCommits[item.index].id — existing click-based selection
// selectedIndex === item.index — keyboard-based selection (add to class binding)
```

- [ ] **Step 3: Test all shortcuts**

Run: `npm run dev:git-client`
Verify each shortcut:
- ↑↓ moves selection
- Enter opens detail panel
- Space toggles multi-select
- Ctrl+C copies SHA
- Escape clears multi-select

- [ ] **Step 4: Commit**

```
git add git-client/src/components/commit/composables/useCommitKeyboard.ts \
        git-client/src/components/commit/components/commit-list/commit-list.vue
git commit -m "feat(commit-list): add keyboard navigation and multi-select"
```

---

### Task 6: Hover Preview & Context Menu Enhancements

> **Time Estimate:** 10 min | **Risk:** Low

**Files:**
- Modify: `src/components/commit/components/commit-list/commit-list.vue`

- [ ] **Step 1: Add Tooltip import**

```ts
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
```

- [ ] **Step 2: Add hovered commit state**

```ts
const hoveredCommit = ref<Commit | null>(null)
```

- [ ] **Step 3: Wrap each virtual row with Tooltip**

In the virtual rows template section, wrap the row div with Tooltip. The row div becomes:

```vue
<Tooltip :open="hoveredCommit?.id === filteredCommits[item.index].id">
  <TooltipTrigger as-child>
    <div
      class="absolute w-full h-8 px-2 flex items-center gap-4 hover:bg-accent/50 cursor-pointer transition-colors"
      :class="clsx(
        selectedCommitId === filteredCommits[item.index].id ? 'bg-accent' : '',
        selectedIds.has(filteredCommits[item.index].id) ? 'ring-1 ring-primary' : ''
      )"
      :style="{ transform: `translateY(${item.start}px)` }"
      @click="onCommitClick(filteredCommits[item.index].id)"
      @contextmenu.prevent="onContextMenu($event, filteredCommits[item.index].id)"
      @mouseenter="hoveredCommit = filteredCommits[item.index]"
      @mouseleave="hoveredCommit = null"
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
  </TooltipTrigger>
  <TooltipContent side="right" :side-offset="10" class="max-w-xs">
    <div class="space-y-1.5">
      <p class="text-xs font-medium">{{ filteredCommits[item.index].message }}</p>
      <div class="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span>{{ filteredCommits[item.index].author }}</span>
        <span>{{ formatTime(filteredCommits[item.index].time) }}</span>
      </div>
      <p class="font-mono text-[10px] text-muted-foreground">{{ filteredCommits[item.index].id }}</p>
    </div>
  </TooltipContent>
</Tooltip>
```

- [ ] **Step 4: Add Copy Message to context menu**

Add to ACTION_TYPES constant:

```ts
COPY_MESSAGE: "copy-message",
```

Add case in onDropdownSelect:

```ts
case ACTION_TYPES.COPY_MESSAGE:
  await navigator.clipboard.writeText(commit.message)
  toast.success("Message copied")
  return
```

Add menu item before Copy SHA (before line 378):

```vue
<DropdownMenuItem @click="onDropdownSelect(ACTION_TYPES.COPY_MESSAGE)"
  >Copy Message</DropdownMenuItem
>
```

- [ ] **Step 5: Verify hover and new menu items**

Run: `npm run dev:git-client`
- Hover over a commit → tooltip shows full info
- Right-click → "Copy Message" available → copies to clipboard

- [ ] **Step 6: Final commit**

```
git add git-client/src/components/commit/components/commit-list/commit-list.vue
git commit -m "feat(commit-list): add hover preview tooltip and copy message action"
```

---

## Self-Review Checklist

| Requirement | Task # | Status |
|-------------|--------|--------|
| Fix refs display (show all, not just 1) | 1 | ✅ |
| Enable virtual scrolling (data cols only) | 2 | ✅ |
| GraphyCell stays unchanged (cheap to render) | 2 | ✅ |
| WIP row fixed at top, no overlap with virtual list | 2 | ✅ |
| ScrollArea viewport ref exposed for virtualizer | 2 | ✅ |
| Create Branch from context menu | 3 | ✅ |
| Create Tag from context menu | 4 | ✅ |
| TagDialog shadcn migration | 4 | ✅ |
| Keyboard ↑↓ navigation | 5 | ✅ |
| Space multi-select | 5 | ✅ |
| Ctrl+C copy SHA | 5 | ✅ |
| Hover preview tooltip | 6 | ✅ |
| TooltipContent uses correct component name | 6 | ✅ |
| Copy Message action | 6 | ✅ |

All 4 CEO Review issues addressed:
1. ✅ Task 2 — Graph column excluded from virtual scroll
2. ✅ Task 6 — TooltipContent uses `<TooltipContent>` not alias
3. ✅ WIP row placed outside virtual list container
4. ✅ Execution order constraint added to plan header
