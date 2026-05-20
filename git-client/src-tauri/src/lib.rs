pub mod commands;
pub mod models;
pub mod services;
pub mod utils;

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

pub struct AppState {
    pub repos: Arc<Mutex<RepoManager>>,
}

pub struct RepoManager {
    handles: HashMap<PathBuf, RepoHandle>,
}

pub struct RepoHandle {
    pub path: PathBuf,
}

impl RepoManager {
    pub fn new() -> Self {
        RepoManager {
            handles: HashMap::new(),
        }
    }

    pub fn open(&mut self, path: &str) -> Result<(), utils::error::AppError> {
        let path_buf = PathBuf::from(path);
        let repo = git2::Repository::open(&path_buf)?;
        let _head = repo.head()?;
        self.handles.insert(
            path_buf.clone(),
            RepoHandle { path: path_buf },
        );
        Ok(())
    }

    pub fn get_repo(&self, path: &str) -> Result<git2::Repository, utils::error::AppError> {
        let path_buf = PathBuf::from(path);
        if !self.handles.contains_key(&path_buf) {
            return Err(utils::error::AppError::NotARepo(path.to_string()));
        }
        let repo = git2::Repository::open(&path_buf)?;
        Ok(repo)
    }

    pub fn close(&mut self, path: &str) {
        self.handles.remove(&PathBuf::from(path));
    }
}

impl Default for RepoManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let state = AppState {
        repos: Arc::new(Mutex::new(RepoManager::new())),
    };
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_mcp_bridge::init())
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            commands::repo::open_repo,
            commands::repo::init_repo,
            commands::repo::clone_repo,
            commands::commit::get_log,
            commands::commit::commit,
            commands::commit::search_commits,
            commands::branch::list_branches,
            commands::branch::create_branch,
            commands::branch::switch_branch,
            commands::branch::delete_branch,
            commands::branch::rebase_branch,
            commands::branch::compare_branches,
            commands::branch::get_rebase_operations,
            commands::branch::rebase_continue,
            commands::branch::rebase_abort,
            commands::remote::list_remotes,
            commands::remote::add_remote,
            commands::remote::remove_remote,
            commands::remote::rename_remote,
            commands::remote::fetch,
            commands::remote::pull,
            commands::remote::push,
            commands::diff::get_diff,
            commands::diff::get_working_diff,
            commands::diff::get_staged_diff,
            commands::diff::diff_between_commits,
            commands::diff::get_file_content,
            commands::diff::get_file_diff_content,
            commands::diff::stage_files,
            commands::diff::unstage_files,
            commands::diff::resolve_conflict,
            commands::stash::stash_save,
            commands::stash::stash_list,
            commands::stash::stash_pop,
            commands::stash::get_credentials,
            commands::stash::set_credentials,
            commands::settings::load_settings,
            commands::settings::save_settings,
            commands::settings::get_git_config,
            commands::settings::set_git_config,
            commands::watch::start_watch,
            commands::reset::reset_commit,
            commands::tag::list_tags,
            commands::tag::create_tag,
            commands::tag::delete_tag,
            commands::merge::cherry_pick,
            commands::merge::revert_commit,
            commands::merge::get_merge_conflicts,
            commands::merge::mark_resolved,
            commands::merge::complete_merge,
            commands::submodule::list_submodules,
            commands::submodule::init_submodule,
            commands::submodule::update_submodule,
            commands::worktree::list_worktrees,
            commands::worktree::create_worktree,
            commands::worktree::delete_worktree,
            commands::hook::list_hooks,
            commands::hook::get_hook_content,
            commands::hook::set_hook_content,
            commands::blame::blame_file,
            commands::ssh_key::list_ssh_keys,
            commands::ssh_key::generate_ssh_key,
            commands::ssh_key::import_ssh_key,
            commands::ssh_key::delete_ssh_key,
            commands::ssh_key::get_ssh_public_key,
            commands::ssh_key::add_key_to_agent,
            commands::ssh_key::remove_key_from_agent,
            commands::ssh_key::is_key_in_agent,
            commands::gpg_key::list_gpg_keys,
            commands::gpg_key::export_gpg_public_key,
            commands::gpg_key::import_gpg_key,
            commands::gpg_key::delete_gpg_key,
            commands::repo_key::get_repo_key_config,
            commands::repo_key::set_repo_ssh_key,
            commands::repo_key::set_repo_gpg_key,
            commands::undo::get_reflog,
            commands::undo::undo,
            commands::undo::redo,
            commands::undo::discard_file,
            commands::undo::discard_all,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
