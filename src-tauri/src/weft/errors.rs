use serde::Serialize;
use serde_json::{json, Value};
use std::path::Path;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum WeftError {
    #[error("故事文件不存在: {0}")]
    FileNotFound(String),
    #[error("读取故事文件失败: {0}")]
    Read(String),
    #[error("解析故事文件失败: {0}")]
    Parse(String),
    #[error("故事结构无效: {0}")]
    Schema(String),
    #[error("引用不存在: {0}")]
    Reference(String),
    #[error("插件失败: {0}")]
    Plugin(String),
    #[error("尚未加载故事")]
    StoryNotLoaded,
}

#[derive(Debug, Clone, Serialize)]
pub struct ErrorPayload {
    pub code: String,
    pub stage: String,
    pub message: String,
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
            message: self.to_string(),
            source: source.map(|p| p.display().to_string()),
            path: None,
            path_display: None,
            hint: matches!(self, Self::StoryNotLoaded)
                .then(|| "先在桌面应用中打开一个 WEFT 故事文件".into()),
            details: matches!(self, Self::Plugin(_)).then(|| json!({ "runtime": "rhai" })),
        }
    }
}

impl From<WeftError> for ErrorPayload {
    fn from(value: WeftError) -> Self {
        value.payload(None)
    }
}
