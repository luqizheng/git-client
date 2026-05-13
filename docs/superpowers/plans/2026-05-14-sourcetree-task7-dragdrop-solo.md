# Task 7: 拖放 + Solo/Hide 分支筛选

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** 实现拖放分支到目标 commit 触发 merge/rebase 操作，以及 Solo/Hide 分支筛选功能

**Architecture:** BranchTagCell 发出 dragstart，CommitRow 接收 dragover/drop，useDragDrop 管理状态。Solo/Hide 通过 commits store 的 filterByBranch/clearBranchFilter 实现

**Tech Stack:** Vue 3, HTML5 Drag and Drop API, Pinia

**Depends:** Task 3, Task 6

---

**Files:**
- Modify: `src/components/commit/SourceTreeCommitList.vue`
- Modify: `src/components/commit/components/BranchTagCell.vue`
- Modify: `src/components/commit/components/CommitRow.vue`
- Modify: `src/stores/commits.ts`

- [ ] **Step 1: 更新 BranchTagCell 的 dragstart 事件**

修改 `BranchTagCell.vue` 的 `handleDragStart`：

```typescript
function handleDragStart(e: DragEvent, ref: CommitRef) {
  e.dataTransfer!.setData('application/x-branch', JSON.stringify({
    branchName: ref.name,
    branchType: ref.ref_type,
  }))
  e.dataTransfer!.effectAllowed = 'move'
}
```

- [ ] **Step 2: 更新 CommitRow 支持 drop 事件**

修改 `CommitRow.vue` 的 emits 和事件处理：

添加 emits：
```typescript
defineEmits<{
  click: []
  contextmenu: [event: MouseEvent]
  dragover: []
  dragleave: []
  drop: [data: { branchName: string; branchType: string }]
  solo: [branchName: string]
  hide: [branchName: string]
}>()
```

添加 drop 处理到 template：
```vue
@drop.prevent="handleDrop($event)"
```

添加 handleDrop 函数：
```typescript
function handleDrop(e: DragEvent) {
  const data = e.dataTransfer?.getData('application/x-branch')
  if (data) {
    try {
      emit('drop', JSON.parse(data))
    } catch {}
  }
}
```

- [ ] **Step 3: 更新 SourceTreeCommitList 处理拖放和 Solo/Hide**

在 `SourceTreeCommitList.vue` 中：

1. 在 CommitRow 的 `@drop` 事件中处理拖放结果：
```vue
@drop="handleRowDrop($event, item.commit)"
@solo="onSoloBranch"
@hide="onHideBranch"
```

2. 添加处理函数：
```typescript
function handleRowDrop(data: { branchName: string; branchType: string }, commit: Commit) {
  // 弹出确认对话框：Merge or Rebase
  // 暂时只 emit rebase 事件
  emit('rebase', data.branchName, commit.id)
}

function onSoloBranch(branchName: string) {
  if (repo.activeRepoPath) {
    commits.filterByBranch(repo.activeRepoPath, branchName)
    emit('solo-branch', branchName)
  }
}

function onHideBranch(branchName: string) {
  if (repo.activeRepoPath) {
    // 隐藏特定分支的 commits
    emit('hide-branch', branchName)
  }
}
```

- [ ] **Step 4: 更新 commits store 的 filterByBranch**

修改 `src/stores/commits.ts` 中的 `filterByBranch`，使用正规字段而非 `as any`：

```typescript
function filterByBranch(repoPath: string, branchName: string) {
  const repo = useRepoStore()
  const openRepo = repo.openRepos.get(repoPath)
  if (!openRepo) return

  if (!(openRepo as any)._originalCommits) {
    (openRepo as any)._originalCommits = [...openRepo.commits]
  }

  openRepo.commits = openRepo.commits.filter(commit =>
    commit.refs.some(ref => ref.name.includes(branchName))
  )
}
```

- [ ] **Step 5: 验证构建**

Run: `cd d:\projects\req2task-2\git-client; npx vite build`

Expected: 成功

- [ ] **Step 6: Commit**

```bash
git add src/components/commit/ src/stores/commits.ts
git commit -m "feat: implement drag-drop branch and solo/hide branch filtering"
```
