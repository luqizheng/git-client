# Task 10: Rebase — Serviço Backend

> **Fase:** 2 — P1 Importante | **Dependências:** nenhuma (branch_service já existe)
> **Plano original:** `docs/superpowers/plans/2026-05-17-git-client-features-implementation.md`

**Files:**
- Modify: `git-client/src-tauri/src/services/branch_service.rs`

---

- [ ] **Step 1: Adicionar função rebase**

```rust
use crate::utils::error::AppError as OurError;

pub fn rebase(repo: &mut git2::Repository, upstream: &str, branch: Option<&str>) -> Result<(), OurError> {
    let target_branch = match branch {
        Some(name) => {
            let b = repo.find_branch(name, git2::BranchType::Local)?;
            b.get().peel_to_commit()?
        }
        None => repo.head()?.peel_to_commit()?,
    };

    let upstream_annotated = repo.revparse_single(upstream)?;

    let mut rebase = repo.rebase(
        Some(&target_branch),
        Some(&upstream_annotated),
        None,
        None,
    )?;

    while let Some(operation) = rebase.next() {
        let _op = operation?;
        if let Err(e) = rebase.commit(None, &repo.signature()?, None) {
            rebase.abort()?;
            return Err(OurError::Git(e));
        }
    }

    rebase.finish(None)?;
    Ok(())
}
```

- [ ] **Step 2: Adicionar teste**

```rust
    #[test]
    fn test_rebase_simple() {
        let (dir, repo) = setup_repo_with_commit();
        let sig = repo.signature().unwrap();
        let workdir = repo.workdir().unwrap();

        create_branch(&repo, "feature", false).unwrap();

        std::fs::write(workdir.join("main_change.txt"), "main").unwrap();
        let mut index = repo.index().unwrap();
        index.add_path(std::path::Path::new("main_change.txt")).unwrap();
        let tree_id = index.write_tree().unwrap();
        let tree = repo.find_tree(tree_id).unwrap();
        let head = repo.head().unwrap().peel_to_commit().unwrap();
        repo.commit(Some("HEAD"), &sig, &sig, "main commit", &tree, &[&head]).unwrap();

        switch_branch(&repo, "feature").unwrap();
        std::fs::write(workdir.join("feature_change.txt"), "feature").unwrap();
        index.add_path(std::path::Path::new("feature_change.txt")).unwrap();
        let tree_id = index.write_tree().unwrap();
        let tree = repo.find_tree(tree_id).unwrap();
        let feat_head = repo.head().unwrap().peel_to_commit().unwrap();
        repo.commit(Some("HEAD"), &sig, &sig, "feature commit", &tree, &[&feat_head]).unwrap();

        drop(tree);
        let mut repo_mut = git2::Repository::open(&dir.path().to_string_lossy().to_string()).unwrap();
        rebase(&mut repo_mut, "main", Some("feature")).unwrap();
        drop(repo_mut);
        drop(repo);
        drop(dir);
    }
```

- [ ] **Step 3: Executar testes**

Run: `cd git-client/src-tauri && cargo test test_rebase_simple`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add git-client/src-tauri/src/services/branch_service.rs
git commit -m "feat(branch): add rebase service with test"
```
