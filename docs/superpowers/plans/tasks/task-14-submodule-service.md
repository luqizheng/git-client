# Task 14: Submodule — Serviço Backend

> **Fase:** 3 — P2 Útil | **Dependências:** Task 13 (Submodule model)
> **Plano original:** `docs/superpowers/plans/2026-05-17-git-client-features-implementation.md`

**Files:**
- Create: `git-client/src-tauri/src/services/submodule_service.rs`
- Modify: `git-client/src-tauri/src/services/mod.rs`

---

- [ ] **Step 1: Criar submodule_service.rs**

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

- [ ] **Step 2: Atualizar services/mod.rs**

```rust
pub mod submodule_service;
```

- [ ] **Step 3: Verificar compilação e Commit**

```bash
cd git-client/src-tauri && cargo build
git add git-client/src-tauri/src/services/submodule_service.rs git-client/src-tauri/src/services/mod.rs
git commit -m "feat(submodule): add submodule service"
```
