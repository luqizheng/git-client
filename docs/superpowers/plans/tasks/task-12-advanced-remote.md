# Task 12: Operações Remotas Avançadas

> **Fase:** 2 — P1 Importante | **Dependências:** nenhuma
> **Plano original:** `docs/superpowers/plans/2026-05-17-git-client-features-implementation.md`

**Files:**
- Modify: `git-client/src-tauri/src/services/remote_service.rs`
- Modify: `git-client/src-tauri/src/commands/remote.rs`
- Modify: `git-client/src-tauri/src/lib.rs`

---

- [ ] **Step 1: Adicionar três funções em remote_service.rs**

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

- [ ] **Step 2: Adicionar dois comandos em commands/remote.rs**

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

- [ ] **Step 3: Atualizar lib.rs `generate_handler!`, adicionar**

```rust
            commands::remote::remove_remote,
            commands::remote::rename_remote,
```

- [ ] **Step 4: Verificar compilação e Commit**

```bash
cd git-client/src-tauri && cargo build
git add git-client/src-tauri/src/services/remote_service.rs git-client/src-tauri/src/commands/remote.rs git-client/src-tauri/src/lib.rs
git commit -m "feat(remote): add advanced remote operations"
```
