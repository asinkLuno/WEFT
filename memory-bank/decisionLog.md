
---
### Decision
[2025-05-07 16:36:14] - 页面布局架构调整

**Rationale:**
1. 确保Footer始终固定在底部且不遮挡内容
2. 实现Home和RiverTabs高度自适应
3. 优化导航栏与内容区域布局关系

**Implementation Details:**
1. 修改Home.tsx使用min-h-[calc(100vh-28px)]替代min-h-screen
2. 保持App.tsx作为flex-col根容器
3. RiverTabs.tsx已实现flex-1和overflow-auto
4. Footer.tsx保持fixed底部定位
---
### Decision
[2025-05-07 16:43:30] - Flow组件架构优化方案

**Rationale:**
1. 消除MoaiFlow/NarrativeFlow/DriftFlow之间的重复代码
2. 提高代码可维护性和一致性
3. 简化未来新Flow组件的开发

**Implementation Details:**
1. 创建BaseFlow组件处理公共逻辑：
   - 状态管理(loading/error/empty)
   - 布局结构(flex-1 overflow-auto)
   - 卡片数据准备和排序
2. 提取useFlowListener自定义hook
3. 创建FlowStatus组件统一处理状态显示
4. 各具体Flow组件继承BaseFlow并实现特有逻辑
---
### Decision
[2025-05-08 09:47:27] - Refactor `WeftError` enum in [`src-tauri/src/weft/errors.rs`](src-tauri/src/weft/errors.rs)

**Rationale:**
- Improve clarity and organization of error types by grouping them into logical categories.
- Enhance maintainability of the error handling logic within the `weft` module.
- Align with Rust best practices for defining and managing error enums.

**Implications/Details:**
- The `WeftError` enum in [`src-tauri/src/weft/errors.rs`](src-tauri/src/weft/errors.rs) has been restructured with comments delineating categories such as FileSystem &amp; IO, Data Handling, Core Logic, Scripting Engine, Concurrency, External Services, and General errors.
- Specific error variants were renamed for better clarity and context (e.g., `FailedToSerializeMoai` to `FailedToSerializeJson`, `MoaisNotDefined` to `MoaiDefinitionsNotFound`, `RhaiError` to `RhaiScriptError`, `FunctionNotFound` to `RhaiFunctionNotFound`, `FailedInNotify` to `FileNotificationError`).
- This refactoring provides a more structured approach to error management. Code that matches or handles specific `WeftError` variants might need to be updated to reflect the new names or structure if they were relying on the old variant names.
---
### Decision (Code)
[2025-05-08 09:52:49] - Corrected `WeftError` enum variant usage across multiple files.

**Rationale:**
The `cargo build` process failed due to incorrect `WeftError` enum variants being used after a refactoring of the [`src-tauri/src/weft/errors.rs`](src-tauri/src/weft/errors.rs:1) file. This update aimed to align the usage with the new definitions.

**Details:**
- Updated `WeftError::RhaiError` to `WeftError::RhaiScriptError` in [`src-tauri/src/weft/aqueduct.rs`](src-tauri/src/weft/aqueduct.rs:1).
- Updated `WeftError::FunctionNotFound` to `WeftError::RhaiFunctionNotFound` in [`src-tauri/src/weft/aqueduct.rs`](src-tauri/src/weft/aqueduct.rs:1).
- Updated `WeftError::MoaisNotDefined` to `WeftError::MoaiDefinitionsNotFound` in [`src-tauri/src/weft/dao.rs`](src-tauri/src/weft/dao.rs:1).
- Updated `WeftError::FailedToSerializeMoai` to `WeftError::FailedToSerializeJson` in [`src-tauri/src/weft/dao.rs`](src-tauri/src/weft/dao.rs:1).
- Updated `WeftError::FailedInNotify` to `WeftError::FileNotificationError` in [`src-tauri/src/weft/kappa.rs`](src-tauri/src/weft/kappa.rs:1).