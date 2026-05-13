use crate::utils::error::AppError;
use std::thread;
use std::time::Duration;

pub fn with_retry<F, T>(op: F, max_retries: u32) -> Result<T, AppError>
where
    F: Fn() -> Result<T, AppError>,
{
    let mut attempts = 0;
    loop {
        match op() {
            Ok(v) => return Ok(v),
            Err(e) if attempts < max_retries => {
                attempts += 1;
                thread::sleep(Duration::from_millis(100 * 2u64.pow(attempts)));
            }
            Err(e) => return Err(e),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU32, Ordering};
    use std::sync::Arc;

    #[test]
    fn test_retry_success_first_try() {
        let result = with_retry(|| Ok(42), 3);
        assert_eq!(result.unwrap(), 42);
    }

    #[test]
    fn test_retry_succeeds_after_failures() {
        let attempts = Arc::new(AtomicU32::new(0));
        let attempts_clone = attempts.clone();
        let result = with_retry(
            move || {
                let n = attempts_clone.fetch_add(1, Ordering::SeqCst);
                if n < 2 {
                    Err(AppError::Credential("retry".to_string()))
                } else {
                    Ok(99)
                }
            },
            3,
        );
        assert_eq!(result.unwrap(), 99);
        assert_eq!(attempts.load(Ordering::SeqCst), 3);
    }

    #[test]
    fn test_retry_exhausted() {
        let result: Result<i32, AppError> = with_retry(
            || Err(AppError::Credential("fail".to_string())),
            2,
        );
        assert!(result.is_err());
    }
}
