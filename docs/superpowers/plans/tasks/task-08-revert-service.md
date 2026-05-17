# Task 08: Revert — Serviço Backend

> **Fase:** 2 — P1 Importante | **Dependências:** Task 06 (merge.rs command file criado)
> **Plano original:** `docs/superpowers/plans/2026-05-17-git-client-features-implementation.md`

**Files:**
- Modify: `git-client/src-tauri/src/services/merge_service.rs`

---

- [ ] **Step 1: Adicionar função revert**

```rust
pub fn revert(repo: &mut git2::Repository, commit_id: &str) -> Result<(), AppError> {
    let oid = git2::Oid::from_str(commit_id)?;
    let commit = repo.find_commit(oid)?;

    let mut opts = git2::RevertOptions::new();
    opts.mainline(0);

    repo.revert(&commit, Some(&mut opts))?;

    let index = repo.index()?;
    let had_conflicts = index.has_conflicts();
    if had_conflicts {
        return Err(AppError::Conflict(Vec::new()));
    }
    Ok(())
}
```

- [ ] **Step 2: Adicionar testes**

```rust
#[cfg(test)]
mod revert_tests {
    use super::*;
    use crate::services::repo_service;
    use tempfile::TempDir;

    fn setup_repo_with_two_commits() -> (TempDir, git2::Repository) {
        let dir = TempDir::new().unwrap();
        let path = dir.path().to_string_lossy().to_string();
        repo_service::init_repo(&path, false).unwrap();
        let repo = git2::Repository::open(&path).unwrap();
        let sig = repo.signature().unwrap();
        let workdir = repo.workdir().unwrap();

        std::fs::write(workdir.join("a.txt"), "line1").unwrap();
        let mut index = repo.index().unwrap();
        index.add_path(std::path::Path::new("a.txt")).unwrap();
        let tree_id = index.write_tree().unwrap();
        let tree = repo.find_tree(tree_id).unwrap();
        repo.commit(Some("HEAD"), &sig, &sig, "first", &tree, &[]).unwrap();

        std::fs::write(workdir.join("b.txt"), "line2").unwrap();
        index.add_path(std::path::Path::new("b.txt")).unwrap();
        let tree_id = index.write_tree().unwrap();
        let tree = repo.find_tree(tree_id).unwrap();
        repo.commit(Some("HEAD"), &sig, &sig, "second", &tree, &[&repo.head().unwrap().peel_to_commit().unwrap()]).unwrap();

        (dir, repo)
    }

    #[test]
    fn test_revert_without_conflicts() {
        let (dir, mut repo) = setup_repo_with_two_commits();
        let head = repo.head().unwrap().peel_to_commit().unwrap();
        let head_id = head.id().to_string();
        let result = revert(&mut repo, &head_id);
        assert!(result.is_ok());
        drop(repo);
        drop(dir);
    }
}
```

- [ ] **Step 3: Executar testes**

Run: `cd git-client/src-tauri && cargo test revert_tests`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add git-client/src-tauri/src/services/merge_service.rs
git commit -m "feat(merge): add revert service with test"
```
