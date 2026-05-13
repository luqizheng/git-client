use crate::models::remote::RemoteInfo;
use crate::utils::error::AppError;
use git2::RemoteCallbacks;
use std::sync::Arc;

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

#[derive(Debug, Clone, serde::Serialize)]
pub struct FetchProgress {
    pub stage: String,
    pub phase: String,
    pub processed: u32,
    pub total: Option<u32>,
    pub bytes_processed: u64,
    pub bytes_total: Option<u64>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct PushProgress {
    pub stage: String,
    pub phase: String,
    pub processed: u32,
    pub total: u32,
    pub bytes_processed: u64,
    pub bytes_total: u64,
}

pub fn fetch(
    repo: &git2::Repository,
    remote_name: &str,
    progress_callback: Option<Arc<dyn Fn(FetchProgress) + Send + Sync>>,
) -> Result<FetchResult, AppError> {
    let mut remote = repo.find_remote(remote_name)?;
    let mut refspecs: Vec<&str> = Vec::new();
    let strarray = remote.fetch_refspecs()?;
    for i in 0..strarray.len() {
        if let Some(spec_str) = strarray.get(i) {
            refspecs.push(spec_str);
        }
    }

    let mut callbacks = RemoteCallbacks::new();

    if let Some(ref cb) = progress_callback {
        let cb_transfer = cb.clone();
        callbacks.transfer_progress(move |progress| {
            let total = progress.total_objects();
            let received = progress.received_objects();
            let stage = if received == 0 {
                "connecting"
            } else if received < total {
                "receiving"
            } else {
                "resolving"
            };

            let fetch_progress = FetchProgress {
                stage: stage.to_string(),
                phase: format!("Receiving objects {}/{}", received, total),
                processed: received as u32,
                total: Some(total as u32),
                bytes_processed: progress.received_bytes() as u64,
                bytes_total: None,
            };
            cb_transfer(fetch_progress);
            true
        });

        let cb_sideband = cb.clone();
        callbacks.sideband_progress(move |data| {
            let msg = String::from_utf8_lossy(data);
            if !msg.is_empty() {
                let fetch_progress = FetchProgress {
                    stage: "receiving".to_string(),
                    phase: msg.trim().to_string(),
                    processed: 0,
                    total: None,
                    bytes_processed: 0,
                    bytes_total: None,
                };
                cb_sideband(fetch_progress);
            }
            true
        });
    }

    let mut options = git2::FetchOptions::default();
    options.remote_callbacks(callbacks);
    options.update_fetchhead(true);

    if !refspecs.is_empty() {
        remote.fetch(&refspecs, Some(&mut options), None)?;
    }

    if let Some(ref cb) = progress_callback {
        cb(FetchProgress {
            stage: "complete".to_string(),
            phase: "Fetch complete".to_string(),
            processed: 0,
            total: None,
            bytes_processed: 0,
            bytes_total: None,
        });
    }

    Ok(FetchResult {
        remote: remote_name.to_string(),
        updated: true,
    })
}

pub fn pull(
    repo: &mut git2::Repository,
    remote_name: &str,
    branch: &str,
    progress_callback: Option<Arc<dyn Fn(FetchProgress) + Send + Sync>>,
) -> Result<PullResult, AppError> {
    fetch(repo, remote_name, progress_callback)?;
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

pub fn push(
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
            let stage = if processed == 0 {
                "connecting"
            } else if processed < total {
                "updating"
            } else {
                "complete"
            };

            let push_progress = PushProgress {
                stage: stage.to_string(),
                phase: format!("Updating {}/{} refs", processed, total),
                processed: processed as u32,
                total: total as u32,
                bytes_processed: bytes as u64,
                bytes_total: 0,
            };
            cb_transfer(push_progress);
        });

        let cb_sideband = cb.clone();
        callbacks.sideband_progress(move |data| {
            let msg = String::from_utf8_lossy(data);
            if !msg.is_empty() {
                let push_progress = PushProgress {
                    stage: "updating".to_string(),
                    phase: msg.trim().to_string(),
                    processed: 0,
                    total: 0,
                    bytes_processed: 0,
                    bytes_total: 0,
                };
                cb_sideband(push_progress);
            }
            true
        });
    }

    let mut options = git2::PushOptions::default();
    options.remote_callbacks(callbacks);

    remote.push(&[&refspec], Some(&mut options))?;

    if let Some(ref cb) = progress_callback {
        cb(PushProgress {
            stage: "complete".to_string(),
            phase: "Push complete".to_string(),
            processed: 0,
            total: 0,
            bytes_processed: 0,
            bytes_total: 0,
        });
    }

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
