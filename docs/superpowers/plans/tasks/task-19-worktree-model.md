# Task 19: Worktree — Backend Model

> **Phase:** 3 — P2 Useful | **Dependencies:** none
> **Plan origin:** `docs/superpowers/plans/2026-05-17-git-client-features-implementation.md`

**Files:**
- Create: `git-client/src-tauri/src/models/worktree.rs`
- Modify: `git-client/src-tauri/src/models/mod.rs`

---

- [ ] **Step 1: Create Worktree model**

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Worktree {
    pub id: String,
    pub path: String,
    pub branch: String,
    pub commit: String,
    pub is_prunable: bool,
}
```

- [ ] **Step 2: Update models/mod.rs**

```rust
pub mod worktree;
```

- [ ] **Step 3: Verify compilation**

```bash
cd git-client/src-tauri && cargo build
```

- [ ] **Step 4: Commit**

```bash
git add git-client/src-tauri/src/models/worktree.rs git-client/src-tauri/src/models/mod.rs
git commit -m "feat(worktree): add Worktree model"
```
