use serde::Serialize;
use serde_json::{json, Value};
use std::path::Path;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum WeftError {
    #[error("story file not found: {0}")]
    FileNotFound(String),
    #[error("failed to read story file: {0}")]
    Read(String),
    #[error("failed to parse story file: {0}")]
    Parse(String),
    #[error("invalid story structure: {0}")]
    Schema(String),
    #[error("reference not found: {0}")]
    Reference(String),
    #[error("plugin failed: {0}")]
    Plugin(String),
    #[error("no story loaded")]
    StoryNotLoaded,
}

#[derive(Debug, Clone, Serialize)]
pub struct ErrorPayload {
    pub code: String,
    pub stage: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<Vec<Value>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path_display: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hint: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<Value>,
}

impl WeftError {
    pub fn payload(&self, source: Option<&Path>) -> ErrorPayload {
        let (code, stage) = match self {
            Self::FileNotFound(_) => ("FILE_NOT_FOUND", "io"),
            Self::Read(_) => ("FILE_READ_FAILED", "io"),
            Self::Parse(_) => ("DOCUMENT_PARSE_FAILED", "parse"),
            Self::Schema(_) => ("SCHEMA_INVALID", "schema"),
            Self::Reference(_) => ("REFERENCE_NOT_FOUND", "reference"),
            Self::Plugin(_) => ("PLUGIN_FAILED", "plugin"),
            Self::StoryNotLoaded => ("STORY_NOT_LOADED", "state"),
        };
        ErrorPayload {
            code: code.into(),
            stage: stage.into(),
            source: source.map(|p| p.display().to_string()),
            path: None,
            path_display: None,
            hint: None,
            details: match self {
                Self::Read(msg) | Self::Parse(msg) | Self::Schema(msg) | Self::Reference(msg) => {
                    Some(json!({ "detail": msg }))
                }
                Self::Plugin(msg) => Some(json!({ "detail": msg, "runtime": "rhai" })),
                _ => None,
            },
        }
    }
}

impl From<WeftError> for ErrorPayload {
    fn from(value: WeftError) -> Self {
        value.payload(None)
    }
}
