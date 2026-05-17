# P0 核心功能：标签管理 + Cherry-pick

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 P0 优先级功能：标签管理与 Cherry-pick。

**Architecture:** 遵循现有分层：Rust commands → services → git2；前端 Vue 3 → Pinia stores。通过 Tauri IPC 通信。

**Tech Stack:** Rust, Vue 3, TypeScript, Pinia, Tauri, git2, Naive UI

**关键代码模式：**
- ipc.ts 导出 `invoke(cmd, args?)` 函数
- Store 中调用 `invoke<Type>('cmd_name', { arg1, arg2 })`
- Rust 命令使用 `state.repos.clone()` + `tokio::task::spawn_blocking` 模式
- lib.rs 用 `generate_handler!` 显式注册命令

**依赖：** Task 1→2→3（后端模型→服务→命令），Task 4→5（前端 store→组件），Task 1-5 与 6-7 可并行

---

### Task 1: 标签管理 - 后端模型

**Files:**
- Create: `git-client/src-tauri/src/models/tag.rs`
- Modify: `git-client/src-tauri/src/models/mod.rs`

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
- Create: `git-client/src-tauri/src/services/tag_service.rs`
- Modify: `git-client/src-tauri/src/services/mod.rs`

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
- Create: `git-client/src-tauri/src/commands/tag.rs`
- Modify: `git-client/src-tauri/src/commands/mod.rs`
- Modify: `git-client/src-tauri/src/lib.rs`

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
- Create: `git-client/src/stores/tags.ts`
- Modify: `git-client/src/types/git.d.ts`

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
- Create: `git-client/src/components/tag/TagDialog.vue`
- Create: `git-client/src/components/tag/TagList.vue`

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

- [ ] **Step 3: 类型检查与 Commit**

Run: `cd git-client && npx vue-tsc --noEmit`
Expected: SUCCESS

```bash
git add git-client/src/components/tag/TagList.vue git-client/src/components/tag/TagDialog.vue
git commit -m "feat(tag): add TagList and TagDialog components"
```

---

### Task 6: Cherry-pick - 后端命令

> **注意：** `merge_service.rs` 已包含 `cherry_pick` 函数，只需添加 IPC 命令。

**Files:**
- Create: `git-client/src-tauri/src/commands/merge.rs`
- Modify: `git-client/src-tauri/src/commands/mod.rs`
- Modify: `git-client/src-tauri/src/lib.rs`

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

- [ ] **Step 4: 编译验证与 Commit**

Run: `cd git-client/src-tauri && cargo build`
Expected: SUCCESS

```bash
git add git-client/src-tauri/src/commands/merge.rs git-client/src-tauri/src/commands/mod.rs git-client/src-tauri/src/lib.rs
git commit -m "feat(merge): add cherry-pick command"
```

---

### Task 7: Cherry-pick - 前端集成

**Files:**
- Modify: `git-client/src/stores/commits.ts`

- [ ] **Step 1: 在 useCommitsStore 追加 cherryPick 方法**

```typescript
  async function cherryPick(repoPath: string, commitId: string) {
    await invoke('cherry_pick', { repoPath, commitId })
  }
```

- [ ] **Step 2: 类型检查与 Commit**

Run: `cd git-client && npx vue-tsc --noEmit`

```bash
git add git-client/src/stores/commits.ts
git commit -m "feat(commit): add cherryPick to commits store"
```
