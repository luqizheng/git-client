use std::collections::HashMap;

use crate::models::commit::{AdvancedSearchFilter, Commit, CommitRef, RefType, SearchFilter};
use crate::utils::error::AppError;

fn build_ref_map(repo: &git2::Repository) -> Result<HashMap<String, Vec<CommitRef>>, AppError> {
    let mut map: HashMap<String, Vec<CommitRef>> = HashMap::new();
    let head_shorthand = repo.head()
        .ok()
        .and_then(|h| h.shorthand().map(String::from));

    let refs = repo.references()?;
    for reference in refs {
        let reference = reference?;
        let full_name = reference.name().unwrap_or("");
        let (ref_type, short_name) = if let Some(s) = full_name.strip_prefix("refs/heads/") {
            (RefType::Local, s)
        } else if let Some(s) = full_name.strip_prefix("refs/remotes/") {
            (RefType::Remote, s)
        } else if let Some(s) = full_name.strip_prefix("refs/tags/") {
            (RefType::Tag, s)
        } else {
            continue;
        };

        let is_head = head_shorthand.as_deref() == Some(short_name);

        if let Some(oid) = reference.target() {
            map.entry(oid.to_string()).or_default().push(CommitRef {
                name: short_name.to_string(),
                ref_type,
                is_head,
            });
        }
    }
    Ok(map)
}

pub fn log(repo: &git2::Repository, limit: u32, after: Option<&str>) -> Result<Vec<Commit>, AppError> {
    let ref_map = build_ref_map(repo)?;
    let mut revwalk = repo.revwalk()?;
    revwalk.push_head()?;
    if let Some(id) = after {
        let oid = git2::Oid::from_str(id)?;
        revwalk.hide(oid)?;
    }
    let mut commits = Vec::new();
    for oid_result in revwalk.take(limit as usize) {
        let oid = oid_result?;
        let git_commit = repo.find_commit(oid)?;
        let refs = ref_map.get(&oid.to_string()).cloned().unwrap_or_default();
        commits.push(commit_from_git(&git_commit, refs));
    }
    Ok(commits)
}

pub fn create_commit(
    repo: &git2::Repository,
    message: &str,
    amend: bool,
) -> Result<Commit, AppError> {
    let mut index = repo.index()?;
    index.write()?;

    let tree_id = index.write_tree()?;
    let tree = repo.find_tree(tree_id)?;
    let sig = repo.signature()?;

    let parents: Vec<git2::Commit> = if amend {
        let head = repo.head()?;
        vec![head.peel_to_commit()?]
    } else if repo.is_empty()? {
        vec![]
    } else {
        let head = repo.head()?;
        vec![head.peel_to_commit()?]
    };

    let parent_refs: Vec<&git2::Commit> = parents.iter().collect();
    let oid = repo.commit(Some("HEAD"), &sig, &sig, message, &tree, &parent_refs)?;
    let new_commit = repo.find_commit(oid)?;
    let ref_map = build_ref_map(repo)?;
    let refs = ref_map.get(&oid.to_string()).cloned().unwrap_or_default();
    Ok(commit_from_git(&new_commit, refs))
}

fn commit_from_git(c: &git2::Commit, refs: Vec<CommitRef>) -> Commit {
    Commit {
        id: c.id().to_string(),
        message: c.message().unwrap_or("").to_string(),
        author: c.author().name().unwrap_or("").to_string(),
        author_email: c.author().email().unwrap_or("").to_string(),
        time: c.time().seconds(),
        parent_ids: c.parent_ids().map(|p| p.to_string()).collect(),
        refs,
    }
}

pub fn search(
    repo: &git2::Repository,
    query: &str,
    filter: &SearchFilter,
    limit: u32,
) -> Result<Vec<Commit>, AppError> {
    let query_lower = query.to_lowercase();
    let mut revwalk = repo.revwalk()?;
    revwalk.push_head()?;
    let ref_map = build_ref_map(repo)?;
    let mut results = Vec::new();

    for oid_result in revwalk {
        if results.len() >= limit as usize {
            break;
        }
        let oid = oid_result?;
        let git_commit = repo.find_commit(oid)?;
        let id_str = oid.to_string();
        let matched = match filter {
            SearchFilter::Hash => id_str.starts_with(query),
            SearchFilter::Message => git_commit
                .message()
                .unwrap_or("")
                .to_lowercase()
                .contains(&query_lower),
            SearchFilter::Author => {
                let author = git_commit.author();
                let name_match = author.name().unwrap_or("").to_lowercase().contains(&query_lower);
                let email_match = author.email().unwrap_or("").to_lowercase().contains(&query_lower);
                name_match || email_match
            }
            SearchFilter::File => {
                git_commit.tree().ok().map_or(false, |t| tree_contains_path(repo, &t, &query_lower))
            }
            SearchFilter::All => {
                id_str.starts_with(query)
                    || git_commit.message().unwrap_or("").to_lowercase().contains(&query_lower)
                    || {
                        let author = git_commit.author();
                        author.name().unwrap_or("").to_lowercase().contains(&query_lower)
                            || author.email().unwrap_or("").to_lowercase().contains(&query_lower)
                    }
                    || git_commit.tree().ok().map_or(false, |t| tree_contains_path(repo, &t, &query_lower))
            }
        };

        if matched {
            let refs = ref_map.get(&id_str).cloned().unwrap_or_default();
            results.push(commit_from_git(&git_commit, refs));
        }
    }
    Ok(results)
}

fn tree_contains_path(repo: &git2::Repository, tree: &git2::Tree, query_lower: &str) -> bool {
    for entry in tree.iter() {
        let name = entry.name().unwrap_or("").to_lowercase();
        if name.contains(query_lower) {
            return true;
        }
        if let Ok(obj) = entry.to_object(repo) {
            if let Some(sub_tree) = obj.as_tree() {
                if tree_contains_path(repo, sub_tree, query_lower) {
                    return true;
                }
            }
        }
    }
    false
}

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
            let author_struct = git_commit.author();
            let author_str = author_struct.name().unwrap_or("").to_string();
            let email_str = author_struct.email().unwrap_or("").to_string();
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
            if let Ok(tree) = git_commit.tree() {
                tree_contains_path(repo, &tree, p)
            } else {
                false
            }
        });

        if !query.is_empty() && !message_match && !hash_match && !author_match && !path_match {
            continue;
        }

        let refs = ref_map.get(&id_str).cloned().unwrap_or_default();
        results.push(commit_from_git(&git_commit, refs));
    }

    Ok(results)
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
        (dir, repo)
    }

    fn create_initial_commit(repo: &git2::Repository) -> git2::Oid {
        let sig = repo.signature().unwrap();
        let mut index = repo.index().unwrap();
        std::fs::write(repo.workdir().unwrap().join("README.md"), "# test").unwrap();
        index.add_path(std::path::Path::new("README.md")).unwrap();
        let tree_id = index.write_tree().unwrap();
        let tree = repo.find_tree(tree_id).unwrap();
        repo.commit(Some("HEAD"), &sig, &sig, "initial commit", &tree, &[])
            .unwrap()
    }

    #[test]
    fn test_log_empty_repo() {
        let (dir, repo) = setup_repo();
        let result = log(&repo, 10, None);
        assert!(result.is_err() || result.unwrap().is_empty());
        drop(repo);
        drop(dir);
    }

    #[test]
    fn test_log_with_commits() {
        let (dir, repo) = setup_repo();
        create_initial_commit(&repo);
        let commits = log(&repo, 10, None).unwrap();
        assert_eq!(commits.len(), 1);
        assert_eq!(commits[0].message, "initial commit");
        drop(repo);
        drop(dir);
    }

    #[test]
    fn test_create_commit_on_empty_repo() {
        let (dir, repo) = setup_repo();
        std::fs::write(repo.workdir().unwrap().join("hello.txt"), "hello world").unwrap();
        let mut index = repo.index().unwrap();
        index.add_path(std::path::Path::new("hello.txt")).unwrap();
        index.write().unwrap();
        let result = create_commit(&repo, "first commit", false);
        assert!(result.is_ok(), "create_commit should work on empty repo");
        let commit = result.unwrap();
        assert_eq!(commit.message, "first commit");
        assert!(commit.parent_ids.is_empty());
        drop(repo);
        drop(dir);
    }

    #[test]
    fn test_create_commit_on_non_empty_repo() {
        let (dir, repo) = setup_repo();
        create_initial_commit(&repo);
        std::fs::write(repo.workdir().unwrap().join("second.txt"), "second file").unwrap();
        let mut index = repo.index().unwrap();
        index.add_path(std::path::Path::new("second.txt")).unwrap();
        index.write().unwrap();
        let result = create_commit(&repo, "add second file", false);
        assert!(result.is_ok());
        let commit = result.unwrap();
        assert_eq!(commit.message, "add second file");
        assert_eq!(commit.parent_ids.len(), 1);
        drop(repo);
        drop(dir);
    }

    #[test]
    fn test_full_workflow_init_add_commit_log() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().to_string_lossy().to_string();

        let repo_state = repo_service::init_repo(&path, false).unwrap();
        assert!(repo_state.is_empty);
        assert!(repo_state.head_branch.is_none());

        let repo = git2::Repository::open(&path).unwrap();

        let workdir = repo.workdir().unwrap();
        std::fs::write(workdir.join("hello.txt"), "hello world").unwrap();

        crate::services::diff_service::stage_files(&repo, &["hello.txt".to_string()]).unwrap();

        let commit = create_commit(&repo, "first commit", false).unwrap();
        assert_eq!(commit.message, "first commit");
        assert!(commit.parent_ids.is_empty());

        let commits = log(&repo, 10, None).unwrap();
        assert_eq!(commits.len(), 1);
        assert_eq!(commits[0].id, commit.id);

        drop(repo);
        drop(dir);
    }
}
