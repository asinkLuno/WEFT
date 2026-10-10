# 项目

Tauri 应用：Rust 侧在 `src-tauri/`，前端在 `src/`。
前端是 React + TypeScript，UI 组件用 shadcn/ui（`src/components/ui`，别名见 `components.json`），样式是 Tailwind v4（`src/index.css`）。

# 基本约定

- 需要查库/框架文档时，用 Context7。
- 处于快速开发阶段，可以破坏性重构；不要写任何测试用例。
- 包管理用 yarn：永远不要手工修改 yarn.lock，增删依赖用 `yarn add` / `yarn remove`，开发依赖加 `-D`。Rust 依赖同理用 `cargo add`，别手改 Cargo.lock。

