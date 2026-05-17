# Task 06: Cherry-pick — Comando Backend

> **Fase:** 1 — P0 Core | **Dependências:** nenhuma (merge_service já existe)
> **Plano original:** `docs/superpowers/plans/2026-05-17-git-client-features-implementation.md`

> **Nota:** `merge_service.rs` já contém a função `cherry_pick`, apenas adicionar comando IPC.

**Files:**
- Modify: `git-client/src-tauri/src/commands/mod.rs`
- Create: `git-client/src-tauri/src/commands/merge.rs`
- Modify: `git-client/src-tauri/src/lib.rs`

---

- [ ] **Step 1: Criar commands/merge.rs**

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

- [ ] **Step 2: Atualizar commands/mod.rs, adicionar no final**

```rust
pub mod merge;
```

- [ ] **Step 3: Atualizar lib.rs `generate_handler!`, adicionar**

```rust
            commands::merge::cherry_pick,
```

- [ ] **Step 4: Verificar compilação**

Run: `cd git-client/src-tauri && cargo build`
Expected: SUCCESS

- [ ] **Step 5: Commit**

```bash
git add git-client/src-tauri/src/commands/merge.rs git-client/src-tauri/src/commands/mod.rs git-client/src-tauri/src/lib.rs
git commit -m "feat(merge): add cherry-pick command"
```
