# WEFT frontend

WEFT 的桌面前端，技术栈为 Tauri + React + TypeScript + Vite + Shadcn。

## 开发

从仓库根目录启动完整的 Tauri 应用：

```bash
cargo tauri dev
```

只启动前端开发服务器：

```bash
yarn dev
```

Vite 默认监听 `http://localhost:1420`。

## 构建

```bash
yarn build
```

静态资源输出到 `dist/`，Tauri 会直接将该目录打进 standalone 应用。

## 本地测试

```bash
yarn test
yarn test:coverage
yarn playwright install chromium
yarn test:e2e
```

仓库根目录的 pre-commit 配置会在 `pre-push` 阶段统一执行后端覆盖率、
前端 Vitest 覆盖率和 Playwright 测试。首次启用时运行：

```bash
uv run pre-commit install --install-hooks
```
