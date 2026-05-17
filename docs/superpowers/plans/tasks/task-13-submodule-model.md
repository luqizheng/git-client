# Task 13: Submodule — Modelo Backend

> **Fase:** 3 — P2 Útil | **Dependências:** nenhuma
> **Plano original:** `docs/superpowers/plans/2026-05-17-git-client-features-implementation.md`

**Files:**
- Create: `git-client/src-tauri/src/models/submodule.rs`
- Modify: `git-client/src-tauri/src/models/mod.rs`

---

- [ ] **Step 1: Criar modelo Submodule**

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

- [ ] **Step 2: Atualizar models/mod.rs**

```rust
pub mod submodule;
```

- [ ] **Step 3: Verificar compilação e Commit**

```bash
cd git-client/src-tauri && cargo build
git add git-client/src-tauri/src/models/submodule.rs git-client/src-tauri/src/models/mod.rs
git commit -m "feat(submodule): add Submodule model"
```
