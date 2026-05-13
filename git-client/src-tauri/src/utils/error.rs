use crate::models::remote::ConflictFile;
use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Git error: {0}")]
    Git(#[from] git2::Error),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Credential error: {0}")]
    Credential(String),
    #[error("Merge conflict")]
    Conflict(Vec<ConflictFile>),
    #[error("Not a repository: {0}")]
    NotARepo(String),
    #[error("Branch not found: {0}")]
    BranchNotFound(String),
    #[error("Remote not found: {0}")]
    RemoteNotFound(String),
}

impl AppError {
    pub fn conflict_files(&self) -> Option<&[ConflictFile]> {
        match self {
            AppError::Conflict(files) => Some(files),
            _ => None,
        }
    }
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_str())
    }
}

impl From<tokio::task::JoinError> for AppError {
    fn from(e: tokio::task::JoinError) -> Self {
        AppError::Io(std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_app_error_git() {
        let err = AppError::NotARepo("/tmp/empty".to_string());
        assert_eq!(err.to_string(), "Not a repository: /tmp/empty");
    }

    #[test]
    fn test_app_error_conflict() {
        let files = vec![ConflictFile {
            path: "main.rs".to_string(),
            ours_modified: true,
            theirs_modified: false,
        }];
        let err = AppError::Conflict(files);
        assert!(err.to_string().contains("Merge conflict"));
        assert_eq!(err.conflict_files().unwrap().len(), 1);
    }

    #[test]
    fn test_app_error_serialize() {
        let err = AppError::Credential("bad token".to_string());
        let json = serde_json::to_string(&err).unwrap();
        assert!(json.contains("Credential error: bad token"));
    }
}
