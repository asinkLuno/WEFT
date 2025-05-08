# src-tauri 后端开发指南

## 1. 概述

`src-tauri` 目录包含了 WEFT 应用的 Rust 后端逻辑。它基于 Tauri 框架，负责处理核心业务逻辑、与操作系统交互以及提供前端所需的 API 接口。

## 2. 项目结构

```
src-tauri/
├── .gitignore             # Git 忽略文件配置
├── Cargo.lock             # 精确的依赖版本锁定
├── Cargo.toml             # 项目元数据和依赖管理
├── build.rs               # Rust 构建脚本
├── capabilities/          # Tauri 能力配置文件目录 (例如 default.json)
├── gen/                   # Tauri 生成的 schema 文件目录 (通常在 .gitignore 中)
├── icons/                 # 应用图标资源
├── src/                   # Rust 源代码
│   ├── lib.rs             # 库入口点 (如果项目是一个库)
│   ├── main.rs            # 应用主入口点
│   └── river/             # (推测) 项目核心业务逻辑，如 river/dao.rs
├── target/                # 编译输出目录 (通常在 .gitignore 中)
└── tauri.conf.json        # Tauri 应用的核心配置文件
```

## 3. 核心文件说明

### 3.1. [`Cargo.toml`](src-tauri/Cargo.toml:1)

这是 Rust 项目的清单文件，定义了项目的元数据（如名称、版本、作者）以及依赖项。

关键部分：
-   `[package]`: 定义了包名 (`weft`)、版本 (`0.0.7`) 等。
-   `[lib]`: 如果项目编译为库，这里定义库的名称和类型。例如 `crate-type = ["staticlib", "cdylib", "rlib"]`。
-   `[build-dependencies]`: 构建时依赖，例如 [`tauri-build`](src-tauri/Cargo.toml:18)。
-   `[dependencies]`: 运行时依赖，列出了项目所需的各种 Rust crates，如 [`tauri`](src-tauri/Cargo.toml:21)、[`serde`](src-tauri/Cargo.toml:23)、[`tokio`](src-tauri/Cargo.toml:4670) 等。
-   `[profile.dev]`: 开发环境下的编译配置，例如启用增量编译 (`incremental = true`)。

### 3.2. [`build.rs`](src-tauri/build.rs:1)

这是一个 Rust 构建脚本，在编译项目之前运行。在这个项目中，它调用了 `tauri_build::build()`，用于处理 Tauri 特定的构建任务。

### 3.3. [`tauri.conf.json`](src-tauri/tauri.conf.json:1)

Tauri 应用的核心配置文件，使用 JSON 格式。它定义了应用的各种行为和特性。

关键字段：
-   `productName`: 应用的产品名称 ("WEFT")。
-   `version`: 应用版本 ("0.0.7")。
-   `identifier`: 应用的唯一标识符 ("com.asinkluno.river")。
-   `build`: 构建相关的配置，如开发服务器 URL (`devUrl`) 和前端文件路径 (`frontendDist`)。
    -   `beforeDevCommand`: "yarn dev"
    -   `beforeBuildCommand`: "yarn build"
-   `app`: 应用窗口和安全相关的配置。
    -   `windows`: 定义了主窗口的标题、尺寸等。
    -   `security`: 内容安全策略 (CSP) 等。
-   `bundle`: 应用打包相关的配置，如激活状态、目标平台和图标。

### 3.4. `src/` 目录

此目录包含项目的所有 Rust 源代码。
-   `main.rs`: (通常) Rust 应用的入口文件，包含 `main` 函数。
-   `lib.rs`: (通常) 如果项目也作为库使用，这是库的入口文件。
-   `river/`: 根据 [`src-tauri/src/river/dao.rs`](src-tauri/src/river/dao.rs:1) 的存在，推测此目录包含项目核心的 "river" 相关业务逻辑，例如数据访问对象 (DAO)。

### 3.5. [`capabilities/default.json`](src-tauri/capabilities/default.json)
Tauri 的能力配置文件，用于定义应用可以访问的系统 API 和权限。

### 3.6. [`.gitignore`](src-tauri/.gitignore:1)
定义了 Git 版本控制系统应忽略的文件和目录。
主要忽略：
-   `/target/`: Rust 的编译输出目录。
-   `/gen/schemas`: Tauri 生成的 schema 文件。

## 4. 构建与运行

-   **开发模式**: 通常通过在项目根目录运行 `yarn tauri dev` (结合 [`tauri.conf.json`](src-tauri/tauri.conf.json:8) 中的 `beforeDevCommand`) 来启动。
-   **构建模式**: 通常通过在项目根目录运行 `yarn tauri build` (结合 [`tauri.conf.json`](src-tauri/tauri.conf.json:9) 中的 `beforeBuildCommand`) 来构建生产版本。

## 5. 依赖管理

项目的 Rust 依赖在 [`Cargo.toml`](src-tauri/Cargo.toml:1) 文件中声明。
-   添加新依赖：可以直接编辑 [`Cargo.toml`](src-tauri/Cargo.toml:1) 文件，或者使用 `cargo add <crate_name>` 命令。
-   更新依赖：使用 `cargo update` 命令。
-   [`Cargo.lock`](src-tauri/Cargo.lock:1) 文件会自动生成并记录每个依赖的确切版本，确保构建的可复现性。**不应手动编辑此文件。**

## 6. 注意事项

-   **编译产物和生成文件**：`target/` 和 `gen/` 目录中的内容是自动生成的，并且已被添加到 [`.gitignore`](src-tauri/.gitignore:1) 中，不应提交到版本控制。
-   **Tauri 配置**：对应用行为的修改（如窗口大小、URL、权限等）主要通过修改 [`tauri.conf.json`](src-tauri/tauri.conf.json:1) 来实现。
-   **Rust 版本**：确保本地 Rust 工具链版本与项目兼容。
## 7. `river` 模块详解

`src/river/` 目录包含了 WEFT 应用的核心数据结构和逻辑。

### 7.1. [`src/river/dao.rs`](src-tauri/src/river/dao.rs:1) - 数据访问对象与核心结构

此文件定义了应用的核心数据结构，以及用于加载、解析和处理这些数据的 `Dao` 结构体。

**核心数据结构:**

-   **[`Moai`](src-tauri/src/river/dao.rs:20)**: 代表故事中的核心实体（人物、地点、事件等）。
    -   `full_name`: 实体的全名。
    -   `base_time`: 实体的基准时间点 ([`Phase`](src-tauri/src/river/phase.rs:214) 类型)。
    -   `description`: 描述信息。
    -   `material`: (内部使用) 用于存储通过 Aqueduct 插件计算的额外属性。
    -   `is`: 定义实体所属的类别或概念 (链接到其他 Moai)。
    -   `tags`: 实体的标签。
    -   `extra_props`: 用于存储从 YAML 文件读取或通过 `material` 计算得到的其他任意属性。
    -   **方法**: 提供了访问器方法（如 [`tags()`](src-tauri/src/river/dao.rs:38), [`is()`](src-tauri/src/river/dao.rs:42), [`full_name()`](src-tauri/src/river/dao.rs:50)）和修改 `extra_props` 的方法 ([`insert_extra_props()`](src-tauri/src/river/dao.rs:58))。

-   **[`MoaiLink`](src-tauri/src/river/dao.rs:74)**: 定义 Moai 之间的关系。
    -   `moais`: 包含两个 Moai ID 的元组，表示关系的双方。
    -   `relations`: 描述关系的字符串。
    -   `bidirectional`: 关系是否是双向的。
    -   **方法**: 提供了访问器方法 ([`moais()`](src-tauri/src/river/dao.rs:82), [`relations()`](src-tauri/src/river/dao.rs:87), [`bidirectional()`](src-tauri/src/river/dao.rs:92))。

-   **[`Story`](src-tauri/src/river/dao.rs:98)**: 代表整个故事的元数据。
    -   `title`: 故事标题。
    -   `summary`: 故事摘要。
    -   `description`: 故事的详细描述。
    -   `main_moais`: 故事的主要实体 ID 列表。
    -   `date_mode`: 使用的日期模式（如 "Gregorian", "中国农历"）。
    -   **方法**: [`date_mode()`](src-tauri/src/river/dao.rs:113)。

-   **[`Drift`](src-tauri/src/river/dao.rs:119)**: 代表故事中的一个时间段或事件。
    -   `title`: 事件标题。
    -   `start_time`: 开始时间 ([`Phase`](src-tauri/src/river/phase.rs:214) 类型)。
    -   `end_time`: 结束时间 ([`Phase`](src-tauri/src/river/phase.rs:214) 类型，可选)。
    -   `description`: 事件描述。
    -   `moais`: 参与此事件的 Moai ID 列表。
    -   **方法**: 提供了访问器方法 ([`moais()`](src-tauri/src/river/dao.rs:128), [`title()`](src-tauri/src/river/dao.rs:131), [`start_time()`](src-tauri/src/river/dao.rs:137) 等)。

-   **[`Narrative`](src-tauri/src/river/dao.rs:147)**: 定义叙事视角。
    -   `subject`: 叙事的主体 (可以是 Moai 或 Drift 的 ID)。
    -   `observer`: 观察者 (Moai ID)。
    -   **方法**: [`subject()`](src-tauri/src/river/dao.rs:153), [`observer()`](src-tauri/src/river/dao.rs:156)。

**[`Dao`](src-tauri/src/river/dao.rs:162) 结构体:**

这是核心的数据访问对象，负责：
-   从 YAML 文件加载和反序列化所有数据结构 ([`new()`](src-tauri/src/river/dao.rs:177))。
-   验证数据的完整性和一致性 ([`resolve()`](src-tauri/src/river/dao.rs:205) 及其调用的 `resolve_*` 方法)。这包括：
    -   检查日期模式是否有效且有对应的 Aqueduct 插件 ([`resolve_story()`](src-tauri/src/river/dao.rs:218))。
    -   解析 Moai 的 `is` 关系，构建 `was_moais` 反向查找表 ([`resolve_moai()`](src-tauri/src/river/dao.rs:231))。
    -   解析 Moai 的 `tags`，构建 `tagged_moais` 查找表 ([`resolve_moai()`](src-tauri/src/river/dao.rs:231))。
    -   调用 Aqueduct 插件处理 Moai 的 `material` 字段 ([`resolve_moai()`](src-tauri/src/river/dao.rs:231))。
    -   验证 `MoaiLink` 和 `Drift` 中引用的 Moai ID 是否存在 ([`resolve_moai_links()`](src-tauri/src/river/dao.rs:287), [`resolve_drifts()`](src-tauri/src/river/dao.rs:301))。
    -   验证 `Narrative` 中引用的实体 ID 是否存在，并检查 Drift 和 Moai 之间是否有重复的 ID ([`resolve_narratives()`](src-tauri/src/river/dao.rs:317))。
-   提供访问各种数据的方法，如 [`story()`](src-tauri/src/river/dao.rs:363), [`get_moai()`](src-tauri/src/river/dao.rs:367), [`get_all_moais()`](src-tauri/src/river/dao.rs:378), [`get_all_moai_links()`](src-tauri/src/river/dao.rs:397)。
-   将数据转换为前端需要的 JSON 格式，用于不同的视图（Drift Flow, Moai Flow, Narrative Flow）。这些方法 ([`drift_flow()`](src-tauri/src/river/dao.rs:532), [`moai_flow()`](src-tauri/src/river/dao.rs:566), [`narrative_flow()`](src-tauri/src/river/dao.rs:609)) 会进行时间计算（使用 [`sub_phase()`](src-tauri/src/river/phase.rs:450)）并将结果格式化。

### 7.2. [`src/river/phase.rs`](src-tauri/src/river/phase.rs:1) - 时间相位处理

此文件定义了用于表示和计算时间的 [`Phase`](src-tauri/src/river/phase.rs:214) 结构及其相关逻辑。`Phase` 允许以递归和相对的方式定义时间点。

**核心概念:**

-   **时间向量**: 一个固定长度（`Phase::MAX_LENGTH = 6`）的 `i32` 数组，通常表示 [年, 月, 日, 时, 分, 秒]。
-   **[`BaseTime`](src-tauri/src/river/phase.rs:205)**: `Phase` 的基础，可以是：
    -   `Vec`: 一个直接的时间向量。
    -   `Phase`: 另一个嵌套的 `Phase` 结构。
-   **[`Phase`](src-tauri/src/river/phase.rs:214)**:
    -   `base_time`: 基础时间 ([`BaseTime`](src-tauri/src/river/phase.rs:205) 类型)。
    -   `ref_time`: 相对于 `base_time` 的偏移量（时间向量，可选）。
    -   `base_time_name`: 基准时间的名称（可选，用于引用其他 `Phase`）。
-   **[`PhaseNoRecusive`](src-tauri/src/river/phase.rs:145)**: `Phase` 的非递归表示，通过 [`de_recursive()`](src-tauri/src/river/phase.rs:285) 方法从 `Phase` 计算得到。它包含一个绝对的 `base_time` 向量和一个可选的 `ref_time` 向量。

**主要功能:**

-   **反序列化 (`Deserialize`)**: [`Phase`](src-tauri/src/river/phase.rs:214) 实现了 `Deserialize` trait，可以从 YAML 的序列中解析时间表示。序列的最后一个元素通常是 `BaseTime`（可以是嵌套序列或字符串名称），前面的数字元素构成 `ref_time`（从秒开始）。
-   **递归解析 ([`de_recursive()`](src-tauri/src/river/phase.rs:285))**: 将递归的 `Phase` 结构解析为非递归的 [`PhaseNoRecusive`](src-tauri/src/river/phase.rs:145) 结构，计算出最终的 `base_time` 和 `ref_time`。
-   **绝对时间计算 ([`absolute_time()`](src-tauri/src/river/phase.rs:153))**: 计算 [`PhaseNoRecusive`](src-tauri/src/river/phase.rs:145) 的绝对时间向量（`base_time + ref_time`）。
-   **时间向量运算**:
    -   [`operate_vectors()`](src-tauri/src/river/phase.rs:11): 对两个时间向量进行元素级操作。
    -   [`add_time_vec()`](src-tauri/src/river/phase.rs:26): 核心的时间进位/借位逻辑。它处理不同时间单位之间的转换（如秒到分，天到月），支持不同的日期模式（通过 [`Aqueduct`](src-tauri/src/river/aqueduct.rs) 插件）。这是实现时间加减法的基础。
-   **时间差计算 ([`sub_phase()`](src-tauri/src/river/phase.rs:450))**: 计算两个 `Phase` 之间的时间差，返回一个表示持续时间的时间向量。它会先将两个 `Phase` 解析为 [`PhaseNoRecusive`](src-tauri/src/river/phase.rs:145)，然后根据情况计算相对偏移或绝对时间差，最后使用 [`add_time_vec()`](src-tauri/src/river/phase.rs:26) 进行计算。
-   **格式化 ([`phase2iso8601()`](src-tauri/src/river/phase.rs:291))**: 将 `Phase` 转换为 ISO 8601 格式的字符串（YYYY-MM-DDTHH:MM:SS）。它首先计算绝对时间，然后使用公历（Gregorian）规则进行规范化。
-   **序列化 (`Serialize`)**: [`Phase`](src-tauri/src/river/phase.rs:214) 实现了 `Serialize` trait，将其序列化为包含 `base_time_name`（如果存在）和规范化后的 `absolute_time` 的 JSON 对象。

**关键约束与错误处理:**

-   时间向量中，除年份外的部分必须是非负数 ([`check_vec()`](src-tauri/src/river/phase.rs:223))。
-   递归解析时不允许出现基准时间名称冲突 ([`_de_recusive()`](src-tauri/src/river/phase.rs:250))。
-   时间计算（如 [`add_time_vec()`](src-tauri/src/river/phase.rs:26)）有最大递归深度限制，防止无限循环。
-   当使用非公历日期模式时，需要 [`Aqueduct`](src-tauri/src/river/aqueduct.rs) 提供相应的 [`PhasePlugin`](src-tauri/src/river/aqueduct.rs)。