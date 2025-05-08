use thiserror::Error;
// use serde_yaml; // Assuming this is used for FailedToParseYaml - Handled by #[from]
// use serde_json; // Assuming this is used for FailedToSerializeJson - Handled by #[from]
// use std::io;    // Assuming this is used for FailedToReadFileContent - Handled by #[from]
// use rhai;       // Assuming this is used for RhaiScriptError - Handled by #[from]
// use notify;     // Assuming this is used for FileNotificationError - Handled by #[from]

#[derive(Error, Debug)]
pub enum WeftError {

    // ==== 1. 文件系统与 I/O 错误 (FileSystem & IO Errors) ====
    #[error("Cannot find file: `{0}`")]
    FileNotFound(String), // Was: FileNotFound(String)

    #[error("Unsupported file type: `{0}`, supported types are yaml and yml.")]
    UnsupportedFileType(String), // Was: UnsupportedFileType(String)

    #[error(transparent)] // "Failed to read file content" (implied by std::io::Error)
    FailedToReadFileContent(#[from] std::io::Error), // Was: FailedToReadFileContent(#[from] std::io::Error)


    // ==== 2. 数据处理错误 (Data Handling Errors) ====
    #[error(transparent)] // "Failed to parse YAML" (implied by serde_yaml::Error)
    FailedToParseYaml(#[from] serde_yaml::Error), // Was: FailedToParseYaml(#[from] serde_yaml::Error)

    #[error(transparent)] // "Failed to serialize to JSON" (implied by serde_json::Error)
    FailedToSerializeJson(#[from] serde_json::Error), // Was: FailedToSerializeMoai(#[from] serde_json::Error) - Renamed for generality

    #[error("Duplicate key in extra props: `{0}`")]
    DuplicateKeyInExtraProps(String), // Was: DuplicateKeyInExtraProps(String)


    // ==== 3. 核心逻辑与数据模型错误 (Core Logic & Data Model Errors) ====

    // --- 3.1 Aqueduct 相关 ---
    #[error("Aqueduct is not initialized.")]
    AqueductNotInitialized, // Was: AqueductNotInitialized

    // --- 3.2 Moai & Drift 相关 ---
    #[error("Moai definitions are not found in Dao.")]
    MoaiDefinitionsNotFound, // Was: MoaisNotDefined - Renamed for clarity

    #[error("Moai `{0}` is not defined in Dao.")]
    MoaiNotDefined(String), // Was: MoaiNotDefined(String)

    #[error("Duplicate keys found between Drift and Moai: {0:?}")]
    DuplicateKeysInDriftAndMoai(Vec<String>), // Was: DuplicateKeysInDriftAndMoai(Vec<String>)

    // --- 3.3 Narrative 相关 ---
    #[error("Entity `{0}` not found in narrative.")]
    EntityNotFoundInNarrative(String), // Was: EntityNotFoundInNarrative(String)

    // --- 3.4 Phase & Time 相关 ---
    #[error("Invalid date mode: `{0}`")]
    InvalidDateMode(String), // Was: InvalidDateMode(String)

    #[error("Phase unit index out of range.")]
    PhaseUnitIndexOutOfRange, // Was: PhaseUnitIndexOutOfRange

    #[error("Base time name conflict.")]
    BaseTimeNameConflict, // Was: BaseTimeNameConflict

    #[error("Sub-year part must be non-negative.")]
    SubYearPartMustBeNonnegative, // Was: SubYearPartMustBeNonnegative


    // ==== 4. 脚本引擎错误 (Scripting Engine Errors - Rhai) ====
    #[error(transparent)] // "Rhai script evaluation error" (implied by rhai::EvalAltResult)
    RhaiScriptError(#[from] Box<rhai::EvalAltResult>), // Was: RhaiError(#[from] Box<rhai::EvalAltResult>) - Renamed for clarity

    #[error("Rhai function not found: `{0}`")]
    RhaiFunctionNotFound(String), // Was: FunctionNotFound(String) - Renamed for context


    // ==== 5. 并发与同步错误 (Concurrency & Synchronization Errors) ====
    #[error("Failed to acquire mutex lock.")]
    MutexLockFailed, // Was: MutexLockFailed


    // ==== 6. 外部服务与集成错误 (External Services & Integration Errors) ====
    #[error("File system notification error.")]
    FileNotificationError(#[from] notify::Error), // Was: FailedInNotify(#[from] notify::Error) - Renamed for clarity

    #[error("File watcher debouncer is not initialized.")]
    DebouncerNotInitialized, // Was: DebouncerNotInitialized


    // ==== 7. 通用与配置错误 (General & Configuration Errors) ====
    #[error("Maximum recursion depth ({0}) exceeded.")]
    MaximumRecursionDepthExceeded(usize), // Was: MaximumRecursionDepthExceeded(usize)

    #[error("Signature mismatch: {0}")]
    SignatureMismatch(String), // Was: SignatureMismatch(String)
}
