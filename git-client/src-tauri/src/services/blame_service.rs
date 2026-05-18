use crate::models::blame::{BlameLine, BlameResult};
use crate::utils::error::AppError;
use git2::{BlameOptions, Repository};

fn is_binary_file(repo: &Repository, file_path: &str, commit_id: Option<&str>) -> Result<bool, AppError> {
    let content = if let Some(cid) = commit_id {
        let oid = git2::Oid::from_str(cid)?;
        let commit = repo.find_commit(oid)?;
        let tree = commit.tree()?;
        match tree.get_path(std::path::Path::new(file_path)) {
            Ok(entry) => {
                let blob = repo.find_blob(entry.id())?;
                blob.content().to_vec()
            }
            Err(_) => return Ok(false),
        }
    } else {
        match repo.workdir() {
            Some(w) => std::fs::read(w.join(file_path)).unwrap_or_default(),
            None => return Ok(false),
        }
    };
    
    Ok(content.contains(&0))
}

pub fn blame_file(
    repo: &Repository,
    file_path: &str,
    commit_id: Option<&str>,
) -> Result<BlameResult, AppError> {
    // 检查是否为二进制文件
    if is_binary_file(repo, file_path, commit_id)? {
        return Err(AppError::Generic(format!(
            "Cannot blame binary file: {}", 
            file_path
        )));
    }

    // 检查文件是否存在
    let full_path = repo.workdir()
        .map(|w| w.join(file_path))
        .filter(|p| p.exists());
    
    if full_path.is_none() && commit_id.is_none() {
        return Err(AppError::Generic(format!("File not found: {}", file_path)));
    }
    
    let mut opts = BlameOptions::new();
    
    // 如果指定了 commit，从该 commit 开始 blame
    if let Some(cid) = commit_id {
        let oid = git2::Oid::from_str(cid)?;
        opts.newest_commit(oid);
    }
    
    let blame = repo.blame_file(std::path::Path::new(file_path), Some(&mut opts))?;
    let mut lines = Vec::new();
    
    // 遍历每个 hunk，每个 hunk 包含多行
    for hunk in blame.iter() {
        let commit = repo.find_commit(hunk.final_commit_id())?;
        let author = commit.author();
        
        // 展开 hunk 中的每一行
        for line_offset in 0..hunk.lines_in_hunk() {
            lines.push(BlameLine {
                line_number: hunk.final_start_line() + line_offset,
                commit_id: hunk.final_commit_id().to_string(),
                author: author.name().unwrap_or("Unknown").to_string(),
                author_email: author.email().unwrap_or("").to_string(),
                timestamp: author.when().seconds(),
                summary: commit.summary().unwrap_or("").to_string(),
                is_boundary: hunk.is_boundary(),
            });
        }
    }
    
    // 按行号排序确保顺序正确
    lines.sort_by_key(|l| l.line_number);
    
    Ok(BlameResult {
        file_path: file_path.to_string(),
        lines,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::repo_service;
    use tempfile::TempDir;
    
    fn setup_repo_with_file() -> (TempDir, Repository) {
        let dir = TempDir::new().unwrap();
        let path = dir.path().to_string_lossy().to_string();
        repo_service::init_repo(&path, false).unwrap();
        let repo = Repository::open(&path).unwrap();
        let sig = repo.signature().unwrap();
        let workdir = repo.workdir().unwrap();
        
        // 创建测试文件
        std::fs::write(workdir.join("test.txt"), "line1\nline2\nline3").unwrap();
        let mut index = repo.index().unwrap();
        index.add_path(std::path::Path::new("test.txt")).unwrap();
        let tree_id = index.write_tree().unwrap();
        let _tree = repo.find_tree(tree_id).unwrap();
        repo.commit(Some("HEAD"), &sig, &sig, "initial commit", &_tree, &[]).unwrap();
        drop(_tree);
        
        (dir, repo)
    }
    
    #[test]
    fn test_blame_file() {
        let (dir, repo) = setup_repo_with_file();
        let result = blame_file(&repo, "test.txt", None).unwrap();
        
        assert_eq!(result.file_path, "test.txt");
        assert_eq!(result.lines.len(), 3);
        assert_eq!(result.lines[0].line_number, 1);
        assert!(!result.lines[0].commit_id.is_empty());
        
        drop(repo);
        drop(dir);
    }
    
    #[test]
    fn test_blame_file_not_found() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().to_string_lossy().to_string();
        repo_service::init_repo(&path, false).unwrap();
        let repo = Repository::open(&path).unwrap();
        
        let result = blame_file(&repo, "nonexistent.txt", None);
        assert!(result.is_err());
        
        drop(repo);
        drop(dir);
    }
}
