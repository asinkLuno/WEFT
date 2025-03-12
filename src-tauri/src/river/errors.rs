use thiserror::Error;

#[derive(Error, Debug)]
pub enum RiverError {
    #[error("Cannot find file: `{0}`")]
    FileNotFound(String),
    #[error("Unsupported file type: `{0}`, supported types are yaml and yml.")]
    UnsupportedFileType(String),
    #[error("Failed to read file content.")]
    FailedToReadFileContent(#[from] std::io::Error),
    #[error("Failed to parse YAML.")]
    FailedToParseYaml(#[from] serde_yaml::Error),

    #[error("Moai is not defined in Dao.")]
    MoaisNotDefined,
    #[error("moai `{0}` is not defined in Dao.")]
    MoaiNotDefined(String),
    #[error("Failed to serialize Moai.")]
    FailedToSerializeMoai(#[from] serde_json::Error),
    #[error("Duplicate keys in drift and moai: {0:?}")]
    DuplicateKeysInDriftAndMoai(Vec<String>),
    #[error("Entity not found in narrative: {0}")]
    EntityNotFoundInNarrative(String),

    #[error("Unit index out of range.")]
    PhaseUnitIndexOutOfRange,
    #[error("Base time name conflict.")]
    BaseTimeNameConflict,
    #[error("Sub year part must be nonnegative.")]
    SubYearPartMustBeNonnegative,
    #[error("Maximum recursion depth ({0}) exceeded.")]
    MaximumRecursionDepthExceeded(usize),

    #[error("Failed in notify.")]
    FailedInNotify(#[from] notify::Error),
    #[error("Debouncer is not initialized.")]
    DebouncerNotInitialized,
    #[error("Dao is not initialized.")]
    DaoNotInitialized,
}
