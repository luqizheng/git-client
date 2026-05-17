# Task 22: Advanced Search — Backend Extension

> **Phase:** 3 — P2 Useful | **Dependencies:** none (existing search)
> **Plan origin:** `docs/superpowers/plans/2026-05-17-git-client-features-implementation.md`

**Files:**
- Modify: `git-client/src-tauri/src/models/commit.rs`
- Modify: `git-client/src-tauri/src/services/commit_service.rs`

---

- [ ] **Step 1: Update SearchFilter in models/commit.rs**

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SearchFilter {
    All,
    Message,
    Author,
    Hash,
    File,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdvancedSearchFilter {
    pub author: Option<String>,
    pub since: Option<i64>,
    pub until: Option<i64>,
    pub path: Option<String>,
}
```

- [ ] **Step 2: Update commit_service.rs to add advanced search**

Add this function after the existing `search` function:

```rust
pub fn search_advanced(
    repo: &git2::Repository,
    query: &str,
    filter: &AdvancedSearchFilter,
    limit: u32,
) -> Result<Vec<Commit>, AppError> {
    let query_lower = query.to_lowercase();
    let ref_map = build_ref_map(repo)?;
    let mut revwalk = repo.revwalk()?;
    revwalk.push_head()?;
    let mut results = Vec::new();

    for oid_result in revwalk {
        if results.len() >= limit as usize {
            break;
        }
        let oid = oid_result?;
        let git_commit = repo.find_commit(oid)?;
        let id_str = oid.to_string();

        if let Some(ref author) = filter.author {
            let author_str = git_commit.author().name().unwrap_or("");
            let email_str = git_commit.author().email().unwrap_or("");
            if !author_str.to_lowercase().contains(&author.to_lowercase())
                && !email_str.to_lowercase().contains(&author.to_lowercase())
            {
                continue;
            }
        }

        if let Some(since) = filter.since {
            if git_commit.time().seconds() < since {
                continue;
            }
        }

        if let Some(until) = filter.until {
            if git_commit.time().seconds() > until {
                continue;
            }
        }

        let message_match = git_commit
            .message()
            .unwrap_or("")
            .to_lowercase()
            .contains(&query_lower);

        let hash_match = id_str.starts_with(&query_lower);

        let author_match = {
            let author = git_commit.author();
            author.name().unwrap_or("").to_lowercase().contains(&query_lower)
                || author.email().unwrap_or("").to_lowercase().contains(&query_lower)
        };

        let path_match = filter.path.as_ref().map_or(false, |p| {
            tree_contains_path(repo, &git_commit.tree().unwrap(), p)
        });

        if !query.is_empty() && !message_match && !hash_match && !author_match && !path_match {
            continue;
        }

        let refs = ref_map.get(&id_str).cloned().unwrap_or_default();
        results.push(commit_from_git(&git_commit, refs));
    }

    Ok(results)
}
```

- [ ] **Step 3: Verify compilation**

```bash
cd git-client/src-tauri && cargo build
```

- [ ] **Step 4: Commit**

```bash
git add git-client/src-tauri/src/models/commit.rs git-client/src-tauri/src/services/commit_service.rs
git commit -m "feat(commit): add advanced search with author/date/path filters"
```
