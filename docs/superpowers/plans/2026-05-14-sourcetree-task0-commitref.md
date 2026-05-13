# Task 0: CommitRef 类型扩展（前后端）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** 将 `Commit.refs: Vec<String>` 扩展为 `Vec<CommitRef>`，支持 local/remote/tag 类型和 is_head 标记

**Architecture:** 后端 Rust models + service 修改，前端 git.d.ts 类型同步更新

**Tech Stack:** Rust, serde, TypeScript

---

**Files:**
- Modify: `src-tauri/src/models/commit.rs`
- Modify: `src-tauri/src/services/commit_service.rs`
- Modify: `src/types/git.d.ts`
- Modify: `src/components/commit/CommitList.vue`
- Modify: `src/components/commit/CommitHeader.vue`
- Modify: `src/components/commit/CommitDetailPanel.vue`
- Modify: `src/components/commit/ChangedFilesList.vue`
- Modify: `src/stores/commits.ts`
- Modify: `src/components/graph/GraphColumn.vue`
- Modify: `src/utils/graphLayout.ts`

- [ ] **Step 1: 后端 - 添加 CommitRef 和 RefType 到 models/commit.rs**

在 `src-tauri/src/models/commit.rs` 中，在 `Commit` struct 之前添加：

```rust
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CommitRef {
    pub name: String,
    pub ref_type: RefType,
    pub is_head: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum RefType {
    Local,
    Remote,
    Tag,
}
```

将 `Commit` 的 `refs` 字段从 `Vec<String>` 改为 `Vec<CommitRef>`：

```rust
pub struct Commit {
    pub id: String,
    pub message: String,
    pub author: String,
    pub author_email: String,
    pub time: i64,
    pub parent_ids: Vec<String>,
    pub refs: Vec<CommitRef>,
}
```

更新测试中的 refs 字段：

```rust
refs: vec![
    CommitRef { name: "main".to_string(), ref_type: RefType::Local, is_head: true },
    CommitRef { name: "v1.0".to_string(), ref_type: RefType::Tag, is_head: false },
],
```

```rust
refs: vec![],
```

- [ ] **Step 2: 后端 - 重写 build_ref_map**

替换 `src-tauri/src/services/commit_service.rs` 中的 `build_ref_map` 函数：

```rust
use crate::models::commit::{Commit, CommitRef, RefType, SearchFilter};

fn build_ref_map(repo: &git2::Repository) -> Result<HashMap<String, Vec<CommitRef>>, AppError> {
    let mut map: HashMap<String, Vec<CommitRef>> = HashMap::new();
    let head_shorthand = repo.head()
        .ok()
        .and_then(|h| h.shorthand().map(String::from));

    let refs = repo.references()?;
    for reference in refs {
        let reference = reference?;
        let full_name = reference.name().unwrap_or("");
        let (ref_type, short_name) = if let Some(s) = full_name.strip_prefix("refs/heads/") {
            (RefType::Local, s)
        } else if let Some(s) = full_name.strip_prefix("refs/remotes/") {
            (RefType::Remote, s)
        } else if let Some(s) = full_name.strip_prefix("refs/tags/") {
            (RefType::Tag, s)
        } else {
            continue;
        };

        let is_head = head_shorthand.as_deref() == Some(short_name);

        if let Some(oid) = reference.target() {
            map.entry(oid.to_string()).or_default().push(CommitRef {
                name: short_name.to_string(),
                ref_type,
                is_head,
            });
        }
    }
    Ok(map)
}
```

同时更新 `commit_from_git` 签名：

```rust
fn commit_from_git(c: &git2::Commit, refs: Vec<CommitRef>) -> Commit {
    Commit {
        id: c.id().to_string(),
        message: c.message().unwrap_or("").to_string(),
        author: c.author().name().unwrap_or("").to_string(),
        author_email: c.author().email().unwrap_or("").to_string(),
        time: c.time().seconds(),
        parent_ids: c.parent_ids().map(|p| p.to_string()).collect(),
        refs,
    }
}
```

- [ ] **Step 3: 后端 - 运行 cargo test**

Run: `cd d:\projects\req2task-2\git-client\src-tauri; cargo test`

Expected: PASS

- [ ] **Step 4: 前端 - 更新 git.d.ts**

替换 `src/types/git.d.ts` 中的 `Commit` 接口：

```typescript
export interface CommitRef {
  name: string
  ref_type: 'local' | 'remote' | 'tag'
  is_head: boolean
}

export interface Commit {
  id: string
  message: string
  author: string
  author_email: string
  time: number
  parent_ids: string[]
  refs: CommitRef[]
}
```

- [ ] **Step 5: 前端 - 更新所有使用 commit.refs 的代码**

搜索所有 `commit.refs` 引用，将 `ref` (string) 改为 `ref.name` (CommitRef.name)。

关键文件：
- `src/components/commit/CommitList.vue`: `commit.refs` → `commit.refs.map(r => r.name)` 或直接用 `r.name`
- `src/components/commit/CommitHeader.vue`: `commit.refs` → 同上
- `src/components/commit/CommitDetailPanel.vue`: `commit.refs` → 同上
- `src/components/commit/ChangedFilesList.vue`: 检查是否使用 refs
- `src/stores/commits.ts`: `ref.includes(branchName)` → `ref.name.includes(branchName)`
- `src/components/graph/GraphColumn.vue`: `getBranchRefs` 中 `ref.startsWith('tag:')` → `ref.ref_type !== 'tag'`

具体修改 `src/stores/commits.ts` 中的 filterByBranch：

```typescript
openRepo.commits = openRepo.commits.filter(commit =>
  commit.refs.some(ref => ref.name.includes(branchName))
)
```

- [ ] **Step 6: 前端 - 更新 graphLayout.ts**

`src/utils/graphLayout.ts` 中如果使用 `commit.refs`，更新为 `commit.refs.map(r => r.name)` 或直接用 `CommitRef` 类型。

检查 `computeGraphLayout` 函数中是否有 refs 引用。当前版本无直接 refs 使用，无需修改。

- [ ] **Step 7: 验证构建**

Run: `cd d:\projects\req2task-2\git-client; npx vite build`

Expected: 成功

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: extend Commit.refs to CommitRef with ref_type and is_head"
```
