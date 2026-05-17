use crate::utils::error::AppError;
use git2::Repository;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, serde::Serialize)]
pub struct HookInfo {
    pub name: String,
    pub exists: bool,
    pub is_executable: bool,
}

pub fn list_hooks(repo: &Repository) -> Result<Vec<HookInfo>, AppError> {
    let hooks_dir = repo.path().join("hooks");
    let hook_names = [
        "pre-commit", "prepare-commit-msg", "commit-msg", "post-commit",
        "pre-push", "pre-rebase", "post-checkout", "post-merge",
        "pre-receive", "update", "post-receive", "post-update",
    ];

    let mut hooks = Vec::new();
    for name in hook_names.iter() {
        let path = hooks_dir.join(name);
        let exists = path.exists();
        let is_executable = exists && {
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                fs::metadata(&path)
                    .map(|m| m.permissions().mode() & 0o111 != 0)
                    .unwrap_or(false)
            }
            #[cfg(windows)]
            {
                false
            }
        };

        hooks.push(HookInfo {
            name: name.to_string(),
            exists,
            is_executable,
        });
    }
    Ok(hooks)
}

pub fn get_hook_content(repo: &Repository, hook_name: &str) -> Result<String, AppError> {
    let path = repo.path().join("hooks").join(hook_name);
    if !path.exists() {
        return Ok(String::new());
    }
    Ok(fs::read_to_string(path)?)
}

pub fn set_hook_content(repo: &Repository, hook_name: &str, content: &str) -> Result<(), AppError> {
    let path: PathBuf = repo.path().join("hooks").join(hook_name);
    fs::write(&path, content)?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = fs::metadata(&path)?.permissions();
        perms.set_mode(0o755);
        fs::set_permissions(&path, perms)?;
    }

    Ok(())
}