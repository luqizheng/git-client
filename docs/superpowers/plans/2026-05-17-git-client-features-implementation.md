# Git 客户端功能扩展实现计划 v2

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现对标 GitKraken/Sourcetree 的 13 个缺失功能模块。

**Architecture:** 遵循现有分层：Rust commands → services → git2；前端 Vue 3 → Pinia stores。通过 Tauri IPC 通信。

**Tech Stack:** Rust, Vue 3, TypeScript, Pinia, Tauri, git2, Naive UI

**关键代码模式：**
- ipc.ts 导出 `invoke(cmd, args?)` 函数，不是 `ipc` 对象
- Store 中调用 `invoke<Type>('cmd_name', { arg1, arg2 })`
- Rust 命令使用 `state.repos.clone()` + `tokio::task::spawn_blocking` 模式
- git2 类型在 services 中直接通过 `git2::` 引用
- lib.rs 用 `generate_handler!` 显式注册命令
- Branch 模型字段：`name, is_remote, is_head, target_commit_id, upstream`

---

## 第一阶段：P0 核心功能

### Task 1: 标签管理 - 后端模型

**Files:**
- Create: `src-tauri/src/models/tag.rs`
- Modify: `src-tauri/src/models/mod.rs`

- [ ] **Step 1: 创建 Tag 模型**

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tag {
    pub name: String,
    pub target: String,
    pub message: Option<String>,
    pub tagger: Option<String>,
    pub date: Option<String>,
}
```

- [ ] **Step 2: 更新 models/mod.rs，在末行追加**

```rust
pub mod tag;
```

- [ ] **Step 3: 编译验证**

Run: `cd git-client/src-tauri && cargo build`
Expected: SUCCESS

- [ ] **Step 4: Commit**

```bash
git add git-client/src-tauri/src/models/tag.rs git-client/src-tauri/src/models/mod.rs
git commit -m "feat(tag): add Tag model"
```

---

### Task 2: 标签管理 - 后端服务

**Files:**
- Create: `src-tauri/src/services/tag_service.rs`
- Modify: `src-tauri/src/services/mod.rs`

- [ ] **Step 1: 创建 tag_service.rs**

```rust
use crate::models::tag::Tag;
use crate::utils::error::AppError;
use git2::Repository;

pub fn list_tags(repo: &Repository) -> Result<Vec<Tag>, AppError> {
    let names = repo.tag_names(None)?;
    let mut tags = Vec::new();
    for name in names.iter() {
        if let Some(name) = name {
            let target = repo.revparse_single(name)?.id().to_string();
            let message = repo.find_tag(target.as_str()).ok().and_then(|t| t.message().map(|s| s.to_string()));
            let tagger = repo.find_tag(target.as_str()).ok().and_then(|t| {
                t.tagger().map(|tg| format!("{} <{}>", tg.name().unwrap_or(""), tg.email().unwrap_or("")))
            });
            tags.push(Tag {
                name: name.to_string(),
                target,
                message,
                tagger,
                date: None,
            });
        }
    }
    Ok(tags)
}

pub fn create_tag(
    repo: &Repository,
    name: &str,
    target: &str,
    message: Option<&str>,
) -> Result<Tag, AppError> {
    let obj = repo.revparse_single(target)?;
    let sig = repo.signature()?;

    let oid = if let Some(msg) = message {
        repo.tag(name, &obj, &sig, msg, false)?
    } else {
        repo.tag_lightweight(name, &obj, false)?
    };

    Ok(Tag {
        name: name.to_string(),
        target: oid.to_string(),
        message: message.map(|s| s.to_string()),
        tagger: Some(format!("{} <{}>", sig.name().unwrap_or(""), sig.email().unwrap_or(""))),
        date: None,
    })
}

pub fn delete_tag(repo: &Repository, name: &str) -> Result<(), AppError> {
    repo.tag_delete(name)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::repo_service;
    use tempfile::TempDir;

    fn setup_repo() -> (TempDir, git2::Repository) {
        let dir = TempDir::new().unwrap();
        let path = dir.path().to_string_lossy().to_string();
        repo_service::init_repo(&path, false).unwrap();
        let repo = git2::Repository::open(&path).unwrap();

        let sig = repo.signature().unwrap();
        let mut index = repo.index().unwrap();
        std::fs::write(repo.workdir().unwrap().join("README.md"), "# test").unwrap();
        index.add_path(std::path::Path::new("README.md")).unwrap();
        let tree_id = index.write_tree().unwrap();
        let tree = repo.find_tree(tree_id).unwrap();
        repo.commit(Some("HEAD"), &sig, &sig, "init", &tree, &[]).unwrap();

        (dir, repo)
    }

    #[test]
    fn test_create_and_list_tags() {
        let (dir, repo) = setup_repo();
        create_tag(&repo, "v1.0", "HEAD", None).unwrap();
        create_tag(&repo, "v2.0", "HEAD", Some("release v2.0")).unwrap();
        let tags = list_tags(&repo).unwrap();
        assert_eq!(tags.len(), 2);
        let v1 = tags.iter().find(|t| t.name == "v1.0").unwrap();
        assert!(v1.message.is_none());
        let v2 = tags.iter().find(|t| t.name == "v2.0").unwrap();
        assert_eq!(v2.message.as_deref(), Some("release v2.0"));
        drop(repo);
        drop(dir);
    }

    #[test]
    fn test_delete_tag() {
        let (dir, repo) = setup_repo();
        create_tag(&repo, "v1.0", "HEAD", None).unwrap();
        assert_eq!(list_tags(&repo).unwrap().len(), 1);
        delete_tag(&repo, "v1.0").unwrap();
        assert_eq!(list_tags(&repo).unwrap().len(), 0);
        drop(repo);
        drop(dir);
    }
}
```

- [ ] **Step 2: 更新 services/mod.rs，在末行追加**

```rust
pub mod tag_service;
```

- [ ] **Step 3: 运行测试**

Run: `cd git-client/src-tauri && cargo test tag_service`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add git-client/src-tauri/src/services/tag_service.rs git-client/src-tauri/src/services/mod.rs
git commit -m "feat(tag): add tag service with tests"
```

---

### Task 3: 标签管理 - 后端命令与注册

**Files:**
- Create: `src-tauri/src/commands/tag.rs`
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: 创建 commands/tag.rs**

```rust
use crate::models::tag::Tag;
use crate::services::tag_service;
use crate::utils::error::AppError;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn list_tags(
    state: State<'_, AppState>,
    repo_path: String,
) -> Result<Vec<Tag>, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        tag_service::list_tags(&repo)
    })
    .await?
}

#[tauri::command]
pub async fn create_tag(
    state: State<'_, AppState>,
    repo_path: String,
    name: String,
    target: String,
    message: Option<String>,
) -> Result<Tag, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        tag_service::create_tag(&repo, &name, &target, message.as_deref())
    })
    .await?
}

#[tauri::command]
pub async fn delete_tag(
    state: State<'_, AppState>,
    repo_path: String,
    name: String,
) -> Result<(), AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        tag_service::delete_tag(&repo, &name)
    })
    .await?
}
```

- [ ] **Step 2: 更新 commands/mod.rs，在末行追加**

```rust
pub mod tag;
```

- [ ] **Step 3: 更新 lib.rs 的 `generate_handler!`，追加三个命令**

在已有 `commands::reset::reset_commit,` 后追加：
```rust
            commands::tag::list_tags,
            commands::tag::create_tag,
            commands::tag::delete_tag,
```

- [ ] **Step 4: 编译验证**

Run: `cd git-client/src-tauri && cargo build`
Expected: SUCCESS

- [ ] **Step 5: Commit**

```bash
git add git-client/src-tauri/src/commands/tag.rs git-client/src-tauri/src/commands/mod.rs git-client/src-tauri/src/lib.rs
git commit -m "feat(tag): add tag commands and handler registration"
```

---

### Task 4: 标签管理 - 前端 Store 和类型

**Files:**
- Create: `src/stores/tags.ts`
- Modify: `src/types/git.d.ts`

- [ ] **Step 1: 更新 git.d.ts 追加 Tag 类型**

```typescript
export interface Tag {
  name: string
  target: string
  message?: string
  tagger?: string
  date?: string
}
```

- [ ] **Step 2: 创建 stores/tags.ts**

```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Tag } from '../types/git'
import { invoke } from '../utils/ipc'

export const useTagsStore = defineStore('tags', () => {
  const tags = ref<Tag[]>([])

  async function listTags(repoPath: string) {
    tags.value = await invoke<Tag[]>('list_tags', { repoPath })
    return tags.value
  }

  async function createTag(repoPath: string, name: string, target: string, message?: string) {
    const tag = await invoke<Tag>('create_tag', { repoPath, name, target, message })
    await listTags(repoPath)
    return tag
  }

  async function deleteTag(repoPath: string, name: string) {
    await invoke<null>('delete_tag', { repoPath, name })
    await listTags(repoPath)
  }

  return { tags, listTags, createTag, deleteTag }
})
```

- [ ] **Step 3: 类型检查**

Run: `cd git-client && npx vue-tsc --noEmit`
Expected: SUCCESS

- [ ] **Step 4: Commit**

```bash
git add git-client/src/stores/tags.ts git-client/src/types/git.d.ts
git commit -m "feat(tag): add tags store and Tag type"
```

---

### Task 5: 标签管理 - 前端组件

**Files:**
- Create: `src/components/tag/TagList.vue`
- Create: `src/components/tag/TagDialog.vue`

- [ ] **Step 1: 创建 TagDialog.vue**

```vue
<template>
  <n-modal v-model:show="showModal" preset="dialog" title="新建标签" @update:show="handleClose">
    <n-form :model="form" label-width="80">
      <n-form-item label="名称" path="name">
        <n-input v-model:value="form.name" placeholder="标签名称 (如 v1.0.0)" />
      </n-form-item>
      <n-form-item label="目标" path="target">
        <n-input v-model:value="form.target" placeholder="Commit Hash 或 HEAD" />
      </n-form-item>
      <n-form-item label="注释" path="message">
        <n-input v-model:value="form.message" placeholder="可选注释" />
      </n-form-item>
    </n-form>
    <template #action>
      <n-space>
        <n-button @click="handleClose">取消</n-button>
        <n-button type="primary" @click="handleCreate" :disabled="!form.name">创建</n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useTagsStore } from '../../stores/tags'
import { useMessage } from 'naive-ui'

const props = defineProps<{ visible: boolean; repoPath: string }>()
const emit = defineEmits<{ 'update:visible': [boolean]; created: [] }>()

const showModal = ref(props.visible)
watch(() => props.visible, (v) => { showModal.value = v })

const tagsStore = useTagsStore()
const message = useMessage()

const form = reactive({
  name: '',
  target: 'HEAD',
  message: '',
})

function handleClose() {
  emit('update:visible', false)
}

async function handleCreate() {
  try {
    await tagsStore.createTag(props.repoPath, form.name, form.target, form.message || undefined)
    message.success(`标签 ${form.name} 创建成功`)
    form.name = ''
    form.message = ''
    emit('created')
  } catch (e: any) {
    message.error(`创建失败: ${e}`)
  }
}
</script>
```

- [ ] **Step 2: 创建 TagList.vue**

```vue
<template>
  <div class="tag-list">
    <n-spin :show="loading">
      <n-empty v-if="!loading && tagsStore.tags.length === 0" description="暂无标签" />
      <n-list v-else>
        <n-list-item v-for="tag in tagsStore.tags" :key="tag.name">
          <template #prefix>
            <n-icon :component="TagIcon" size="18" />
          </template>
          <n-thing :title="tag.name">
            <template #description>
              <n-space size="small">
                <n-tag size="small" :bordered="false">{{ tag.target.substring(0, 7) }}</n-tag>
                <span v-if="tag.message">{{ tag.message }}</span>
              </n-space>
            </template>
          </n-thing>
          <template #suffix>
            <n-button size="tiny" type="error" @click="handleDelete(tag)">删除</n-button>
          </template>
        </n-list-item>
      </n-list>
    </n-spin>

    <div class="pt-3">
      <n-button @click="showDialog = true" type="primary" block ghost>新建标签</n-button>
    </div>

    <TagDialog v-model:visible="showDialog" :repo-path="repoPath" @created="loadTags" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useTagsStore } from '../../stores/tags'
import type { Tag } from '../../types/git'
import { Tag as TagIcon } from '@vicons/fluent'
import { useMessage } from 'naive-ui'
import TagDialog from './TagDialog.vue'

const props = defineProps<{ repoPath: string }>()

const tagsStore = useTagsStore()
const message = useMessage()
const showDialog = ref(false)
const loading = ref(false)

async function loadTags() {
  loading.value = true
  try {
    await tagsStore.listTags(props.repoPath)
  } finally {
    loading.value = false
  }
}

async function handleDelete(tag: Tag) {
  try {
    await tagsStore.deleteTag(props.repoPath, tag.name)
    message.success(`标签 ${tag.name} 已删除`)
  } catch (e: any) {
    message.error(`删除失败: ${e}`)
  }
}

onMounted(loadTags)
</script>
```

- [ ] **Step 3: 类型检查**

Run: `cd git-client && npx vue-tsc --noEmit`
Expected: SUCCESS

- [ ] **Step 4: Commit**

```bash
git add git-client/src/components/tag/TagList.vue git-client/src/components/tag/TagDialog.vue
git commit -m "feat(tag): add TagList and TagDialog components"
```

---

### Task 6: Cherry-pick - 后端命令（服务已有）

> **注意：** `merge_service.rs` 已包含 `cherry_pick` 函数，只需添加 IPC 命令。

**Files:**
- Modify: `src-tauri/src/commands/mod.rs`
- Create: `src-tauri/src/commands/merge.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: 创建 commands/merge.rs**

```rust
use crate::services::merge_service;
use crate::utils::error::AppError;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn cherry_pick(
    state: State<'_, AppState>,
    repo_path: String,
    commit_id: String,
) -> Result<merge_service::CherryPickResult, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let mut repo = manager.get_repo(&repo_path)?;
        merge_service::cherry_pick(&mut repo, &commit_id)
    })
    .await?
}
```

- [ ] **Step 2: 更新 commands/mod.rs，在末行追加**

```rust
pub mod merge;
```

- [ ] **Step 3: 更新 lib.rs `generate_handler!`，追加**

```rust
            commands::merge::cherry_pick,
```

- [ ] **Step 4: 编译验证**

Run: `cd git-client/src-tauri && cargo build`
Expected: SUCCESS

- [ ] **Step 5: Commit**

```bash
git add git-client/src-tauri/src/commands/merge.rs git-client/src-tauri/src/commands/mod.rs git-client/src-tauri/src/lib.rs
git commit -m "feat(merge): add cherry-pick command"
```

---

### Task 7: Cherry-pick - 前端集成

**Files:**
- Modify: `src/stores/commits.ts`

- [ ] **Step 1: 在 useCommitsStore 追加 cherryPick 方法**

```typescript
  async function cherryPick(repoPath: string, commitId: string) {
    await invoke('cherry_pick', { repoPath, commitId })
  }
```

- [ ] **Step 2: 类型检查和 Commit**

Run: `cd git-client && npx vue-tsc --noEmit`

```bash
git add git-client/src/stores/commits.ts
git commit -m "feat(commit): add cherryPick to commits store"
```

---

## 第二阶段：P1 重要功能

### Task 8: Revert - 后端服务

**Files:**
- Modify: `src-tauri/src/services/merge_service.rs`

- [ ] **Step 1: 追加 revert 函数**

```rust
pub fn revert(repo: &mut git2::Repository, commit_id: &str) -> Result<(), AppError> {
    let oid = git2::Oid::from_str(commit_id)?;
    let commit = repo.find_commit(oid)?;

    let mut opts = git2::RevertOptions::new();
    opts.mainline(0);

    repo.revert(&commit, Some(&mut opts))?;

    let index = repo.index()?;
    let had_conflicts = index.has_conflicts();
    if had_conflicts {
        return Err(AppError::Conflict(Vec::new()));
    }
    Ok(())
}
```

- [ ] **Step 2: 追加测试**

```rust
#[cfg(test)]
mod revert_tests {
    use super::*;
    use crate::services::repo_service;
    use tempfile::TempDir;

    fn setup_repo_with_two_commits() -> (TempDir, git2::Repository) {
        let dir = TempDir::new().unwrap();
        let path = dir.path().to_string_lossy().to_string();
        repo_service::init_repo(&path, false).unwrap();
        let repo = git2::Repository::open(&path).unwrap();
        let sig = repo.signature().unwrap();
        let workdir = repo.workdir().unwrap();

        std::fs::write(workdir.join("a.txt"), "line1").unwrap();
        let mut index = repo.index().unwrap();
        index.add_path(std::path::Path::new("a.txt")).unwrap();
        let tree_id = index.write_tree().unwrap();
        let tree = repo.find_tree(tree_id).unwrap();
        repo.commit(Some("HEAD"), &sig, &sig, "first", &tree, &[]).unwrap();

        std::fs::write(workdir.join("b.txt"), "line2").unwrap();
        index.add_path(std::path::Path::new("b.txt")).unwrap();
        let tree_id = index.write_tree().unwrap();
        let tree = repo.find_tree(tree_id).unwrap();
        repo.commit(Some("HEAD"), &sig, &sig, "second", &tree, &[&repo.head().unwrap().peel_to_commit().unwrap()]).unwrap();

        (dir, repo)
    }

    #[test]
    fn test_revert_without_conflicts() {
        let (dir, mut repo) = setup_repo_with_two_commits();
        let head = repo.head().unwrap().peel_to_commit().unwrap();
        let head_id = head.id().to_string();
        let result = revert(&mut repo, &head_id);
        assert!(result.is_ok());
        drop(repo);
        drop(dir);
    }
}
```

- [ ] **Step 3: 运行测试**

Run: `cd git-client/src-tauri && cargo test revert_tests`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add git-client/src-tauri/src/services/merge_service.rs
git commit -m "feat(merge): add revert service with test"
```

---

### Task 9: Revert - 后端命令

**Files:**
- Modify: `src-tauri/src/commands/merge.rs`

- [ ] **Step 1: 追加 revert_commit 命令**

```rust
#[tauri::command]
pub async fn revert_commit(
    state: State<'_, AppState>,
    repo_path: String,
    commit_id: String,
) -> Result<(), AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let mut repo = manager.get_repo(&repo_path)?;
        merge_service::revert(&mut repo, &commit_id)
    })
    .await?
}
```

- [ ] **Step 2: 更新 lib.rs `generate_handler!`，追加**

```rust
            commands::merge::revert_commit,
```

- [ ] **Step 3: 编译验证**

Run: `cd git-client/src-tauri && cargo build`
Expected: SUCCESS

- [ ] **Step 4: Commit**

```bash
git add git-client/src-tauri/src/commands/merge.rs git-client/src-tauri/src/lib.rs
git commit -m "feat(merge): add revert command"
```

---

### Task 10: Rebase - 后端服务

**Files:**
- Modify: `src-tauri/src/services/branch_service.rs`

- [ ] **Step 1: 追加 rebase 函数**

```rust
use crate::utils::error::AppError as OurError;

pub fn rebase(repo: &mut git2::Repository, upstream: &str, branch: Option<&str>) -> Result<(), OurError> {
    let target_branch = match branch {
        Some(name) => {
            let b = repo.find_branch(name, git2::BranchType::Local)?;
            b.get().peel_to_commit()?
        }
        None => repo.head()?.peel_to_commit()?,
    };

    let upstream_annotated = repo.revparse_single(upstream)?;

    let mut rebase = repo.rebase(
        Some(&target_branch),
        Some(&upstream_annotated),
        None,
        None,
    )?;

    while let Some(operation) = rebase.next() {
        let _op = operation?;
        if let Err(e) = rebase.commit(None, &repo.signature()?, None) {
            rebase.abort()?;
            return Err(OurError::Git(e));
        }
    }

    rebase.finish(None)?;
    Ok(())
}
```

- [ ] **Step 2: 追加测试**

```rust
    #[test]
    fn test_rebase_simple() {
        let (dir, repo) = setup_repo_with_commit();
        let sig = repo.signature().unwrap();
        let workdir = repo.workdir().unwrap();

        create_branch(&repo, "feature", false).unwrap();

        std::fs::write(workdir.join("main_change.txt"), "main").unwrap();
        let mut index = repo.index().unwrap();
        index.add_path(std::path::Path::new("main_change.txt")).unwrap();
        let tree_id = index.write_tree().unwrap();
        let tree = repo.find_tree(tree_id).unwrap();
        let head = repo.head().unwrap().peel_to_commit().unwrap();
        repo.commit(Some("HEAD"), &sig, &sig, "main commit", &tree, &[&head]).unwrap();

        switch_branch(&repo, "feature").unwrap();
        std::fs::write(workdir.join("feature_change.txt"), "feature").unwrap();
        index.add_path(std::path::Path::new("feature_change.txt")).unwrap();
        let tree_id = index.write_tree().unwrap();
        let tree = repo.find_tree(tree_id).unwrap();
        let feat_head = repo.head().unwrap().peel_to_commit().unwrap();
        repo.commit(Some("HEAD"), &sig, &sig, "feature commit", &tree, &[&feat_head]).unwrap();

        drop(tree);
        let mut repo_mut = git2::Repository::open(&dir.path().to_string_lossy().to_string()).unwrap();
        rebase(&mut repo_mut, "main", Some("feature")).unwrap();
        drop(repo_mut);
        drop(repo);
        drop(dir);
    }
```

- [ ] **Step 3: 运行测试**

Run: `cd git-client/src-tauri && cargo test test_rebase_simple`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add git-client/src-tauri/src/services/branch_service.rs
git commit -m "feat(branch): add rebase service with test"
```

---

### Task 11: Rebase - 后端命令

**Files:**
- Modify: `src-tauri/src/commands/branch.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: 追加 rebase_branch 命令**

```rust
#[tauri::command]
pub async fn rebase_branch(
    state: State<'_, AppState>,
    repo_path: String,
    upstream: String,
    branch: Option<String>,
) -> Result<(), AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let mut repo = manager.get_repo(&repo_path)?;
        branch_service::rebase(&mut repo, &upstream, branch.as_deref())
    })
    .await?
}
```

- [ ] **Step 2: 更新 lib.rs `generate_handler!`，追加**

```rust
            commands::branch::rebase_branch,
```

- [ ] **Step 3: 编译验证与 Commit**

```bash
cd git-client/src-tauri && cargo build
git add git-client/src-tauri/src/commands/branch.rs git-client/src-tauri/src/lib.rs
git commit -m "feat(branch): add rebase command"
```

---

### Task 12: 高级远程操作

**Files:**
- Modify: `src-tauri/src/services/remote_service.rs`
- Modify: `src-tauri/src/commands/remote.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: 在 remote_service.rs 追加三个函数**

```rust
pub fn remove_remote(repo: &git2::Repository, name: &str) -> Result<(), AppError> {
    repo.remote_delete(name)?;
    Ok(())
}

pub fn rename_remote(repo: &git2::Repository, old_name: &str, new_name: &str) -> Result<(), AppError> {
    repo.remote_rename(old_name, new_name)?;
    Ok(())
}

pub fn push_force(
    repo: &git2::Repository,
    remote_name: &str,
    branch: &str,
    progress_callback: Option<Arc<dyn Fn(PushProgress) + Send + Sync>>,
) -> Result<PushResult, AppError> {
    let mut remote = repo.find_remote(remote_name)?;
    let refspec = format!("refs/heads/{}:refs/heads/{}", branch, branch);

    let mut callbacks = RemoteCallbacks::new();
    if let Some(ref cb) = progress_callback {
        let cb_transfer = cb.clone();
        callbacks.push_transfer_progress(move |processed, total, bytes| {
            cb_transfer(PushProgress {
                stage: "updating".to_string(),
                phase: format!("{}/{}", processed, total),
                processed: processed as u32,
                total: total as u32,
                bytes_processed: bytes as u64,
                bytes_total: 0,
            });
        });
    }

    let mut options = git2::PushOptions::new();
    options.remote_callbacks(callbacks);

    remote.push(&[&refspec], Some(&mut options))?;

    Ok(PushResult {
        remote: remote_name.to_string(),
        branch: branch.to_string(),
    })
}
```

- [ ] **Step 2: 在 commands/remote.rs 追加三个命令**

```rust
#[tauri::command]
pub async fn remove_remote(
    state: State<'_, AppState>,
    repo_path: String,
    name: String,
) -> Result<(), AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        remote_service::remove_remote(&repo, &name)
    })
    .await?
}

#[tauri::command]
pub async fn rename_remote(
    state: State<'_, AppState>,
    repo_path: String,
    old_name: String,
    new_name: String,
) -> Result<(), AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        remote_service::rename_remote(&repo, &old_name, &new_name)
    })
    .await?
}
```

- [ ] **Step 3: 更新 lib.rs `generate_handler!`，追加**

```rust
            commands::remote::remove_remote,
            commands::remote::rename_remote,
```

- [ ] **Step 4: 编译验证与 Commit**

```bash
cd git-client/src-tauri && cargo build
git add git-client/src-tauri/src/services/remote_service.rs git-client/src-tauri/src/commands/remote.rs git-client/src-tauri/src/lib.rs
git commit -m "feat(remote): add advanced remote operations"
```

---

## 第三阶段：P2 有用功能

### Task 13: 子模块管理 - 后端模型

**Files:**
- Create: `src-tauri/src/models/submodule.rs`
- Modify: `src-tauri/src/models/mod.rs`

- [ ] **Step 1: 创建 Submodule 模型**

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Submodule {
    pub name: String,
    pub path: String,
    pub url: String,
    pub branch: Option<String>,
    pub sha: String,
    pub is_initialized: bool,
}
```

- [ ] **Step 2: 更新 models/mod.rs**

```rust
pub mod submodule;
```

- [ ] **Step 3: 编译验证与 Commit**

```bash
cd git-client/src-tauri && cargo build
git add git-client/src-tauri/src/models/submodule.rs git-client/src-tauri/src/models/mod.rs
git commit -m "feat(submodule): add Submodule model"
```

---

### Task 14: 子模块管理 - 后端服务

**Files:**
- Create: `src-tauri/src/services/submodule_service.rs`
- Modify: `src-tauri/src/services/mod.rs`

- [ ] **Step 1: 创建 submodule_service.rs**

```rust
use crate::models::submodule::Submodule;
use crate::utils::error::AppError;
use git2::{Repository, Submodule as GitSubmodule};

pub fn list_submodules(repo: &Repository) -> Result<Vec<Submodule>, AppError> {
    let mut submodules = Vec::new();
    let sms = repo.submodules()?;
    for sm in sms.iter() {
        if let Ok(sm) = sm {
            submodules.push(Submodule {
                name: sm.name().unwrap_or("").to_string(),
                path: sm.path().to_string(),
                url: sm.url().unwrap_or("").to_string(),
                branch: sm.branch().map(|s| s.to_string()),
                sha: sm.head_id().map(|id| id.to_string()).unwrap_or_default(),
                is_initialized: sm.is_initialized(),
            });
        }
    }
    Ok(submodules)
}

pub fn init_submodule(repo: &Repository, name: &str) -> Result<(), AppError> {
    let sm = repo.find_submodule(name)?;
    sm.init(false)?;
    sm.update(false, None)?;
    Ok(())
}

pub fn update_submodule(repo: &Repository, name: &str, recursive: bool) -> Result<(), AppError> {
    let sm = repo.find_submodule(name)?;
    sm.update(recursive, None)?;
    Ok(())
}
```

- [ ] **Step 2: 编译验证与 Commit**

```bash
cd git-client/src-tauri && cargo build
git add git-client/src-tauri/src/services/submodule_service.rs git-client/src-tauri/src/services/mod.rs
git commit -m "feat(submodule): add submodule service"
```

---

### Task 15: 子模块管理 - 后端命令

**Files:**
- Create: `src-tauri/src/commands/submodule.rs`
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: 创建 commands/submodule.rs**

```rust
use crate::models::submodule::Submodule;
use crate::services::submodule_service;
use crate::utils::error::AppError;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn list_submodules(
    state: State<'_, AppState>,
    repo_path: String,
) -> Result<Vec<Submodule>, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        submodule_service::list_submodules(&repo)
    })
    .await?
}

#[tauri::command]
pub async fn init_submodule(
    state: State<'_, AppState>,
    repo_path: String,
    name: String,
) -> Result<(), AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        submodule_service::init_submodule(&repo, &name)
    })
    .await?
}

#[tauri::command]
pub async fn update_submodule(
    state: State<'_, AppState>,
    repo_path: String,
    name: String,
    recursive: bool,
) -> Result<(), AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        submodule_service::update_submodule(&repo, &name, recursive)
    })
    .await?
}
```

- [ ] **Step 2: 更新 mod.rs 和 lib.rs**

commands/mod.rs 追加：`pub mod submodule;`

lib.rs `generate_handler!` 追加：
```rust
            commands::submodule::list_submodules,
            commands::submodule::init_submodule,
            commands::submodule::update_submodule,
```

- [ ] **Step 3: 编译验证与 Commit**

```bash
cd git-client/src-tauri && cargo build
git add git-client/src-tauri/src/commands/submodule.rs git-client/src-tauri/src/commands/mod.rs git-client/src-tauri/src/lib.rs
git commit -m "feat(submodule): add submodule commands"
```

---

### Task 16: 子模块管理 - 前端 Store

**Files:**
- Create: `src/stores/submodule.ts`
- Modify: `src/types/git.d.ts`

- [ ] **Step 1: 更新 git.d.ts**

```typescript
export interface Submodule {
  name: string
  path: string
  url: string
  branch?: string
  sha: string
  is_initialized: boolean
}
```

- [ ] **Step 2: 创建 stores/submodule.ts**

```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Submodule } from '../types/git'
import { invoke } from '../utils/ipc'

export const useSubmoduleStore = defineStore('submodule', () => {
  const submodules = ref<Submodule[]>([])

  async function listSubmodules(repoPath: string) {
    submodules.value = await invoke<Submodule[]>('list_submodules', { repoPath })
    return submodules.value
  }

  async function initSubmodule(repoPath: string, name: string) {
    await invoke<null>('init_submodule', { repoPath, name })
    await listSubmodules(repoPath)
  }

  async function updateSubmodule(repoPath: string, name: string, recursive = false) {
    await invoke<null>('update_submodule', { repoPath, name, recursive })
    await listSubmodules(repoPath)
  }

  return { submodules, listSubmodules, initSubmodule, updateSubmodule }
})
```

- [ ] **Step 3: 类型检查与 Commit**

```bash
cd git-client && npx vue-tsc --noEmit
git add git-client/src/stores/submodule.ts git-client/src/types/git.d.ts
git commit -m "feat(submodule): add submodule store"
```

---

### Task 17: 子模块管理 - 前端组件

**Files:**
- Create: `src/components/submodule/SubmoduleList.vue`

- [ ] **Step 1: 创建 SubmoduleList.vue**

```vue
<template>
  <div class="submodule-list">
    <n-spin :show="loading">
      <n-empty v-if="submodules.length === 0" description="无子模块" />
      <n-list v-else>
        <n-list-item v-for="sm in submodules" :key="sm.name">
          <n-thing :title="sm.name">
            <template #description>
              <n-space size="small">
                <n-tag size="small">{{ sm.sha.substring(0, 7) }}</n-tag>
                <span>{{ sm.url }}</span>
              </n-space>
            </template>
          </n-thing>
          <template #suffix>
            <n-button v-if="!sm.is_initialized" size="tiny" type="primary" @click="handleInit(sm)">初始化</n-button>
            <n-button v-else size="tiny" @click="handleUpdate(sm)">更新</n-button>
          </template>
        </n-list-item>
      </n-list>
    </n-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSubmoduleStore } from '../../stores/submodule'
import type { Submodule } from '../../types/git'
import { useMessage } from 'naive-ui'

const props = defineProps<{ repoPath: string }>()
const store = useSubmoduleStore()
const message = useMessage()
const loading = ref(false)

const submodules = ref<Submodule[]>([])

async function load() {
  loading.value = true
  try {
    submodules.value = await store.listSubmodules(props.repoPath)
  } finally {
    loading.value = false
  }
}

async function handleInit(sm: Submodule) {
  await store.initSubmodule(props.repoPath, sm.name)
  message.success(`子模块 ${sm.name} 初始化完成`)
}

async function handleUpdate(sm: Submodule) {
  await store.updateSubmodule(props.repoPath, sm.name)
  message.success(`子模块 ${sm.name} 更新完成`)
}

onMounted(load)
</script>
```

- [ ] **Step 2: 类型检查与 Commit**

```bash
cd git-client && npx vue-tsc --noEmit
git add git-client/src/components/submodule/SubmoduleList.vue
git commit -m "feat(submodule): add SubmoduleList component"
```

---

### Task 18: Git Flow - 后端服务

**Files:**
- Create: `src-tauri/src/services/git_flow_service.rs`
- Modify: `src-tauri/src/services/mod.rs`

- [ ] **Step 1: 创建 git_flow_service.rs**

```rust
use crate::models::branch::Branch;
use crate::services::branch_service;
use crate::utils::error::AppError;
use git2::{Repository, BranchType};

#[derive(Debug, Clone)]
pub struct GitFlowConfig {
    pub feature_prefix: String,
    pub release_prefix: String,
    pub hotfix_prefix: String,
    pub develop_branch: String,
    pub master_branch: String,
}

impl Default for GitFlowConfig {
    fn default() -> Self {
        GitFlowConfig {
            feature_prefix: "feature/".to_string(),
            release_prefix: "release/".to_string(),
            hotfix_prefix: "hotfix/".to_string(),
            develop_branch: "develop".to_string(),
            master_branch: "main".to_string(),
        }
    }
}

pub fn init_flow(repo: &Repository, config: Option<GitFlowConfig>) -> Result<(), AppError> {
    let cfg = config.unwrap_or_default();
    repo.config()?.set_str("gitflow.branch.master", &cfg.master_branch)?;
    repo.config()?.set_str("gitflow.branch.develop", &cfg.develop_branch)?;
    repo.config()?.set_str("gitflow.prefix.feature", &cfg.feature_prefix)?;
    repo.config()?.set_str("gitflow.prefix.release", &cfg.release_prefix)?;
    repo.config()?.set_str("gitflow.prefix.hotfix", &cfg.hotfix_prefix)?;
    Ok(())
}

fn get_config(repo: &Repository) -> Result<GitFlowConfig, AppError> {
    let config = repo.config()?;
    Ok(GitFlowConfig {
        feature_prefix: config.get_string("gitflow.prefix.feature")
            .unwrap_or_else(|_| "feature/".to_string()),
        release_prefix: config.get_string("gitflow.prefix.release")
            .unwrap_or_else(|_| "release/".to_string()),
        hotfix_prefix: config.get_string("gitflow.prefix.hotfix")
            .unwrap_or_else(|_| "hotfix/".to_string()),
        develop_branch: config.get_string("gitflow.branch.develop")
            .unwrap_or_else(|_| "develop".to_string()),
        master_branch: config.get_string("gitflow.branch.master")
            .unwrap_or_else(|_| "main".to_string()),
    })
}

pub fn start