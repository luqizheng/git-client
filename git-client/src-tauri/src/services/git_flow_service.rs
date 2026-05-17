use crate::models::branch::Branch;
use crate::utils::error::AppError;
use git2::{Repository, BranchType};

#[derive(Debug, Clone)]
pub struct GitFlowConfig {
    pub feature_prefix: String,
    pub release_prefix: String,
    pub hotfix_prefix: String,
    pub develop_branch: String,
    pub master_branch: String,
}

impl Default for GitFlowConfig {
    fn default() -> Self {
        GitFlowConfig {
            feature_prefix: "feature/".to_string(),
            release_prefix: "release/".to_string(),
            hotfix_prefix: "hotfix/".to_string(),
            develop_branch: "develop".to_string(),
            master_branch: "main".to_string(),
        }
    }
}

pub fn init_flow(repo: &Repository) -> Result<(), AppError> {
    let config = GitFlowConfig::default();
    repo.config()?.set_str("gitflow.prefix.feature", &config.feature_prefix)?;
    repo.config()?.set_str("gitflow.prefix.release", &config.release_prefix)?;
    repo.config()?.set_str("gitflow.prefix.hotfix", &config.hotfix_prefix)?;
    repo.config()?.set_str("gitflow.branch.develop", &config.develop_branch)?;
    repo.config()?.set_str("gitflow.branch.main", &config.master_branch)?;
    Ok(())
}

pub fn start_feature(repo: &Repository, name: &str) -> Result<Branch, AppError> {
    let develop = repo.find_branch("develop", BranchType::Local)?;
    let commit = develop.get().peel_to_commit()?;
    let branch_name = format!("feature/{}", name);
    repo.branch(&branch_name, &commit, false)?;
    Ok(Branch {
        name: branch_name,
        is_remote: false,
        is_head: true,
        target_commit_id: commit.id().to_string(),
        upstream: None,
    })
}

pub fn finish_feature(repo: &Repository, name: &str) -> Result<(), AppError> {
    let feature_name = format!("feature/{}", name);
    let mut feature = repo.find_branch(&feature_name, BranchType::Local)?;
    let commit = feature.get().peel_to_commit()?;
    feature.delete()?;
    let mut develop = repo.find_branch("develop", BranchType::Local)?;
    develop.delete()?;
    repo.branch("develop", &commit, false)?;
    Ok(())
}

pub fn start_release(repo: &Repository, version: &str) -> Result<Branch, AppError> {
    let develop = repo.find_branch("develop", BranchType::Local)?;
    let commit = develop.get().peel_to_commit()?;
    let branch_name = format!("release/{}", version);
    repo.branch(&branch_name, &commit, false)?;
    Ok(Branch {
        name: branch_name,
        is_remote: false,
        is_head: true,
        target_commit_id: commit.id().to_string(),
        upstream: None,
    })
}

pub fn finish_release(repo: &Repository, version: &str) -> Result<(), AppError> {
    let release_name = format!("release/{}", version);
    let mut release = repo.find_branch(&release_name, BranchType::Local)?;
    let commit = release.get().peel_to_commit()?;
    release.delete()?;
    let mut main = repo.find_branch("main", BranchType::Local)?;
    main.delete()?;
    repo.branch("main", &commit, false)?;
    Ok(())
}

pub fn start_hotfix(repo: &Repository, version: &str) -> Result<Branch, AppError> {
    let main = repo.find_branch("main", BranchType::Local)?;
    let commit = main.get().peel_to_commit()?;
    let branch_name = format!("hotfix/{}", version);
    repo.branch(&branch_name, &commit, false)?;
    Ok(Branch {
        name: branch_name,
        is_remote: false,
        is_head: true,
        target_commit_id: commit.id().to_string(),
        upstream: None,
    })
}

pub fn finish_hotfix(repo: &Repository, version: &str) -> Result<(), AppError> {
    let hotfix_name = format!("hotfix/{}", version);
    let mut hotfix = repo.find_branch(&hotfix_name, BranchType::Local)?;
    let commit = hotfix.get().peel_to_commit()?;
    hotfix.delete()?;
    let mut main = repo.find_branch("main", BranchType::Local)?;
    main.delete()?;
    repo.branch("main", &commit, false)?;
    let mut develop = repo.find_branch("develop", BranchType::Local)?;
    develop.delete()?;
    repo.branch("develop", &commit, false)?;
    Ok(())
}
