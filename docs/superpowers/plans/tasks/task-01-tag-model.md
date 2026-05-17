# Task 01: Tag — Modelo Backend

> **Fase:** 1 — P0 Core | **Dependências:** nenhuma
> **Plano original:** `docs/superpowers/plans/2026-05-17-git-client-features-implementation.md`

**Files:**
- Create: `git-client/src-tauri/src/models/tag.rs`
- Modify: `git-client/src-tauri/src/models/mod.rs`

---

- [ ] **Step 1: Criar modelo Tag**

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

- [ ] **Step 2: Atualizar models/mod.rs, adicionar no final**

```rust
pub mod tag;
```

- [ ] **Step 3: Verificar compilação**

Run: `cd git-client/src-tauri && cargo build`
Expected: SUCCESS

- [ ] **Step 4: Commit**

```bash
git add git-client/src-tauri/src/models/tag.rs git-client/src-tauri/src/models/mod.rs
git commit -m "feat(tag): add Tag model"
```
