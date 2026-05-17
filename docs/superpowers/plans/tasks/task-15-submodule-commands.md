# Task 15: Submodule — Comandos Backend

> **Fase:** 3 — P2 Útil | **Dependências:** Task 14 (Submodule service)
> **Plano original:** `docs/superpowers/plans/2026-05-17-git-client-features-implementation.md`

**Files:**
- Create: `git-client/src-tauri/src/commands/submodule.rs`
- Modify: `git-client/src-tauri/src/commands/mod.rs`
- Modify: `git-client/src-tauri/src/lib.rs`

---

- [ ] **Step 1: Criar commands/submodule.rs**

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

- [ ] **Step 2: Atualizar mod.rs e lib.rs**

commands/mod.rs — adicionar: `pub mod submodule;`

lib.rs `generate_handler!` — adicionar:
```rust
            commands::submodule::list_submodules,
            commands::submodule::init_submodule,
            commands::submodule::update_submodule,
```

- [ ] **Step 3: Verificar compilação e Commit**

```bash
cd git-client/src-tauri && cargo build
git add git-client/src-tauri/src/commands/submodule.rs git-client/src-tauri/src/commands/mod.rs git-client/src-tauri/src/lib.rs
git commit -m "feat(submodule): add submodule commands"
```
