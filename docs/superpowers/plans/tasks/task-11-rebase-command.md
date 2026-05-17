# Task 11: Rebase — Comando Backend

> **Fase:** 2 — P1 Importante | **Dependências:** Task 10 (Rebase service)
> **Plano original:** `docs/superpowers/plans/2026-05-17-git-client-features-implementation.md`

**Files:**
- Modify: `git-client/src-tauri/src/commands/branch.rs`
- Modify: `git-client/src-tauri/src/lib.rs`

---

- [ ] **Step 1: Adicionar comando rebase_branch**

```rust
#[tauri::command]
pub async fn rebase_branch(
    state: State<'_, AppState>,
    repo_path: String,
    upstream: String,
    branch: Option<String>,
) -> Result<(), AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let mut repo = manager.get_repo(&repo_path)?;
        branch_service::rebase(&mut repo, &upstream, branch.as_deref())
    })
    .await?
}
```

- [ ] **Step 2: Atualizar lib.rs `generate_handler!`, adicionar**

```rust
            commands::branch::rebase_branch,
```

- [ ] **Step 3: Verificar compilação e Commit**

```bash
cd git-client/src-tauri && cargo build
git add git-client/src-tauri/src/commands/branch.rs git-client/src-tauri/src/lib.rs
git commit -m "feat(branch): add rebase command"
```
