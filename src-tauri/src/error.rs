use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("HTTP error: {0}")]
    Http(#[from] ureq::Error),

    #[error("Tauri error: {0}")]
    Tauri(#[from] tauri::Error),

    #[error("Other error: {0}")]
    Other(String),
}

pub type AppResult<T> = Result<T, AppError>;

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IpcResult<T> {
    pub ok: bool,
    pub value: Option<T>,
    pub error: Option<String>,
}

impl<T> IpcResult<T> {
    pub fn ok(value: T) -> Self {
        Self {
            ok: true,
            value: Some(value),
            error: None,
        }
    }

    pub fn err(error: String) -> Self {
        Self {
            ok: false,
            value: None,
            error: Some(error),
        }
    }
}

impl<T> From<AppResult<T>> for IpcResult<T> {
    fn from(result: AppResult<T>) -> Self {
        match result {
            Ok(value) => Self::ok(value),
            Err(e) => Self::err(e.to_string()),
        }
    }
}