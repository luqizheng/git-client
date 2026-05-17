# Task 02: Tag — Serviço Backend

> **Fase:** 1 — P0 Core | **Dependências:** Task 01 (Tag model)
> **Plano original:** `docs/superpowers/plans/2026-05-17-git-client-features-implementation.md`

**Files:**
- Create: `git-client/src-tauri/src/services/tag_service.rs`
- Modify: `git-client/src-tauri/src/services/mod.rs`

---

- [ ] **Step 1: Criar tag_service.rs**

```rust
use crate::models::tag::Tag;
use crate::utils::error::AppError;
use git2::Repository;

pub fn list_tags(repo: &Repository) -> Result<Vec<Tag>, AppError> {
    let names = repo.tag_names(None)?;
    let mut tags = Vec::new();
    for name in names.iter() {
        if let Some(name) = name {
            let target = repo.revparse_single(name)?.id().to_string();
            let message = repo.find_tag(target.as_str()).ok().and_then(|t| t.message().map(|s| s.to_string()));
            let tagger = repo.find_tag(target.as_str()).ok().and_then(|t| {
                t.tagger().map(|tg| format!("{} <{}>", tg.name().unwrap_or(""), tg.email().unwrap_or("")))
            });
            tags.push(Tag {
                name: name.to_string(),
                target,
                message,
                tagger,
                date: None,
            });
        }
    }
    Ok(tags)
}

pub fn create_tag(
    repo: &Repository,
    name: &str,
    target: &str,
    message: Option<&str>,
) -> Result<Tag, AppError> {
    let obj = repo.revparse_single(target)?;
    let sig = repo.signature()?;

    let oid = if let Some(msg) = message {
        repo.tag(name, &obj, &sig, msg, false)?
    } else {
        repo.tag_lightweight(name, &obj, false)?
    };

    Ok(Tag {
        name: name.to_string(),
        target: oid.to_string(),
        message: message.map(|s| s.to_string()),
        tagger: Some(format!("{} <{}>", sig.name().unwrap_or(""), sig.email().unwrap_or(""))),
        date: None,
    })
}

pub fn delete_tag(repo: &Repository, name: &str) -> Result<(), AppError> {
    repo.tag_delete(name)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::repo_service;
    use tempfile::TempDir;

    fn setup_repo() -> (TempDir, git2::Repository) {
        let dir = TempDir::new().unwrap();
        let path = dir.path().to_string_lossy().to_string();
        repo_service::init_repo(&path, false).unwrap();
        let repo = git2::Repository::open(&path).unwrap();

        let sig = repo.signature().unwrap();
        let mut index = repo.index().unwrap();
        std::fs::write(repo.workdir().unwrap().join("README.md"), "# test").unwrap();
        index.add_path(std::path::Path::new("README.md")).unwrap();
        let tree_id = index.write_tree().unwrap();
        let tree = repo.find_tree(tree_id).unwrap();
        repo.commit(Some("HEAD"), &sig, &sig, "init", &tree, &[]).unwrap();

        (dir, repo)
    }

    #[test]
    fn test_create_and_list_tags() {
        let (dir, repo) = setup_repo();
        create_tag(&repo, "v1.0", "HEAD", None).unwrap();
        create_tag(&repo, "v2.0", "HEAD", Some("release v2.0")).unwrap();
        let tags = list_tags(&repo).unwrap();
        assert_eq!(tags.len(), 2);
        let v1 = tags.iter().find(|t| t.name == "v1.0").unwrap();
        assert!(v1.message.is_none());
        let v2 = tags.iter().find(|t| t.name == "v2.0").unwrap();
        assert_eq!(v2.message.as_deref(), Some("release v2.0"));
        drop(repo);
        drop(dir);
    }

    #[test]
    fn test_delete_tag() {
        let (dir, repo) = setup_repo();
        create_tag(&repo, "v1.0", "HEAD", None).unwrap();
        assert_eq!(list_tags(&repo).unwrap().len(), 1);
        delete_tag(&repo, "v1.0").unwrap();
        assert_eq!(list_tags(&repo).unwrap().len(), 0);
        drop(repo);
        drop(dir);
    }
}
```

- [ ] **Step 2: Atualizar services/mod.rs, adicionar no final**

```rust
pub mod tag_service;
```

- [ ] **Step 3: Executar testes**

Run: `cd git-client/src-tauri && cargo test tag_service`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add git-client/src-tauri/src/services/tag_service.rs git-client/src-tauri/src/services/mod.rs
git commit -m "feat(tag): add tag service with tests"
```
