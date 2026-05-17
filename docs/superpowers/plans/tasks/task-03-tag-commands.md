# Task 03: Tag — Comandos e Registro

> **Fase:** 1 — P0 Core | **Dependências:** Task 02 (Tag service)
> **Plano original:** `docs/superpowers/plans/2026-05-17-git-client-features-implementation.md`

**Files:**
- Create: `git-client/src-tauri/src/commands/tag.rs`
- Modify: `git-client/src-tauri/src/commands/mod.rs`
- Modify: `git-client/src-tauri/src/lib.rs`

---

- [ ] **Step 1: Criar commands/tag.rs**

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

- [ ] **Step 2: Atualizar commands/mod.rs, adicionar no final**

```rust
pub mod tag;
```

- [ ] **Step 3: Atualizar lib.rs `generate_handler!`, adicionar após `commands::reset::reset_commit,`**

```rust
            commands::tag::list_tags,
            commands::tag::create_tag,
            commands::tag::delete_tag,
```

- [ ] **Step 4: Verificar compilação**

Run: `cd git-client/src-tauri && cargo build`
Expected: SUCCESS

- [ ] **Step 5: Commit**

```bash
git add git-client/src-tauri/src/commands/tag.rs git-client/src-tauri/src/commands/mod.rs git-client/src-tauri/src/lib.rs
git commit -m "feat(tag): add tag commands and handler registration"
```
