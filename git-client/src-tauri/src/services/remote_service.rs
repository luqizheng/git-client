use crate::models::remote::RemoteInfo;
use crate::utils::error::AppError;

pub fn list_remotes(repo: &git2::Repository) -> Result<Vec<RemoteInfo>, AppError> {
    let mut remotes = Vec::new();
    let remote_names = repo.remotes()?;
    for name_opt in &remote_names {
        let name = name_opt.ok_or(AppError::RemoteNotFound("unknown".to_string()))?;
        let remote = repo.find_remote(name)?;
        let url = remote.url().unwrap_or("").to_string();
        let push_url = remote.pushurl().map(String::from);
        remotes.push(RemoteInfo {
            name: name.to_string(),
            url,
            push_url,
        });
    }
    Ok(remotes)
}

pub fn add_remote(repo: &git2::Repository, name: &str, url: &str) -> Result<(), AppError> {
    repo.remote(name, url)?;
    Ok(())
}

pub fn fetch(repo: &git2::Repository, remote_name: &str) -> Result<FetchResult, AppError> {
    let mut remote = repo.find_remote(remote_name)?;
    let mut refspecs: Vec<&str> = Vec::new();
    let strarray = remote.fetch_refspecs()?;
    for i in 0..strarray.len() {
        if let Some(spec_str) = strarray.get(i) {
            refspecs.push(spec_str);
        }
    }
    if !refspecs.is_empty() {
        remote.fetch(&refspecs, None, None)?;
    }
    Ok(FetchResult {
        remote: remote_name.to_string(),
        updated: true,
    })
}

pub fn pull(repo: &mut git2::Repository, remote_name: &str, branch: &str) -> Result<PullResult, AppError> {
    fetch(repo, remote_name)?;
    let remote_branch = format!("remotes/{}/{}", remote_name, branch);
    let remote_ref = repo.find_reference(&remote_branch)?;
    let annotated = repo.reference_to_annotated_commit(&remote_ref)?;
    let analysis = repo.merge_analysis(&[&annotated])?;
    if analysis.0.is_up_to_date() {
        return Ok(PullResult {
            remote: remote_name.to_string(),
            branch: branch.to_string(),
            had_conflicts: false,
        });
    }
    repo.merge(&[&annotated], None, None)?;
    Ok(PullResult {
        remote: remote_name.to_string(),
        branch: branch.to_string(),
        had_conflicts: false,
    })
}

pub fn push(repo: &git2::Repository, remote_name: &str, branch: &str) -> Result<PushResult, AppError> {
    let mut remote = repo.find_remote(remote_name)?;
    let refspec = format!("refs/heads/{}:refs/heads/{}", branch, branch);
    remote.push(&[&refspec], None)?;
    Ok(PushResult {
        remote: remote_name.to_string(),
        branch: branch.to_string(),
    })
}

#[derive(Debug, serde::Serialize)]
pub struct FetchResult {
    pub remote: String,
    pub updated: bool,
}

#[derive(Debug, serde::Serialize)]
pub struct PullResult {
    pub remote: String,
    pub branch: String,
    pub had_conflicts: bool,
}

#[derive(Debug, serde::Serialize)]
pub struct PushResult {
    pub remote: String,
    pub branch: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::repo_service;
    use tempfile::TempDir;

    #[test]
    fn test_list_remotes_empty() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().to_string_lossy().to_string();
        repo_service::init_repo(&path, false).unwrap();
        let repo = git2::Repository::open(&path).unwrap();
        let remotes = list_remotes(&repo).unwrap();
        assert!(remotes.is_empty());
    }

    #[test]
    fn test_add_remote() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().to_string_lossy().to_string();
        repo_service::init_repo(&path, false).unwrap();
        let repo = git2::Repository::open(&path).unwrap();
        add_remote(&repo, "origin", "https://github.com/user/repo.git").unwrap();
        let remotes = list_remotes(&repo).unwrap();
        assert_eq!(remotes.len(), 1);
        assert_eq!(remotes[0].name, "origin");
    }
}
