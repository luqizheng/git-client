use crate::models::submodule::Submodule;
use crate::utils::error::AppError;
use git2::Repository;

pub fn list_submodules(repo: &Repository) -> Result<Vec<Submodule>, AppError> {
    let mut submodules = Vec::new();
    let names = repo.submodules()?;
    for i in 0..names.len() {
        if let Some(sm) = names.get(i) {
            let path = sm.path().to_string_lossy().to_string();
            let url = sm.url().unwrap_or("");
            submodules.push(Submodule {
                name: sm.name().unwrap_or("").to_string(),
                path,
                url: url.to_string(),
                branch: None,
                sha: sm.head_id().map(|id: git2::Oid| id.to_string()).unwrap_or_default(),
                is_initialized: false,
            });
        }
    }
    Ok(submodules)
}

pub fn init_submodule(repo: &Repository, name: &str) -> Result<(), AppError> {
    let mut sm = repo.find_submodule(name)?;
    sm.init(false)?;
    Ok(())
}

pub fn update_submodule(repo: &Repository, name: &str, recursive: bool) -> Result<(), AppError> {
    let mut sm = repo.find_submodule(name)?;
    sm.update(recursive, None)?;
    Ok(())
}
