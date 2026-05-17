# Task 09: Revert — Comando Backend

> **Fase:** 2 — P1 Importante | **Dependências:** Task 08 (Revert service)
> **Plano original:** `docs/superpowers/plans/2026-05-17-git-client-features-implementation.md`

**Files:**
- Modify: `git-client/src-tauri/src/commands/merge.rs`
- Modify: `git-client/src-tauri/src/lib.rs`

---

- [ ] **Step 1: Adicionar comando revert_commit**

```rust
#[tauri::command]
pub async fn revert_commit(
    state: State<'_, AppState>,
    repo_path: String,
    commit_id: String,
) -> Result<(), AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let mut repo = manager.get_repo(&repo_path)?;
        merge_service::revert(&mut repo, &commit_id)
    })
    .await?
}
```

- [ ] **Step 2: Atualizar lib.rs `generate_handler!`, adicionar**

```rust
            commands::merge::revert_commit,
```

- [ ] **Step 3: Verificar compilação**

Run: `cd git-client/src-tauri && cargo build`
Expected: SUCCESS

- [ ] **Step 4: Commit**

```bash
git add git-client/src-tauri/src/commands/merge.rs git-client/src-tauri/src/lib.rs
git commit -m "feat(merge): add revert command"
```
