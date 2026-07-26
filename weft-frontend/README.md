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

仓库根目录的 prek 配置会在 `pre-push` 阶段统一执行后端覆盖率、
前端 Vitest 覆盖率和 Playwright 测试。首次启用时运行：

```bash
cargo install prek --version 0.4.11 --locked
prek install --hook-type pre-commit --hook-type pre-push
```

单元测试位于 `tests/unit/`，组件行为使用 React Testing Library 按用户可见结果
断言。所有 Tauri IPC、原生事件和外部链接调用统一经过 `lib/platform.ts`；
测试可注入 `tests/mocks/platform.ts` 中的内存 adapter，无需启动 Tauri。

Playwright 测试位于 `tests/e2e/`。每个测试获得独立浏览器 context，并在页面脚本
运行前注入隔离的 platform adapter 与固定故事数据；测试不会打开本机文件选择器，
也不会依赖用户最近打开记录。失败时产物写入 `test-results/`，HTML 报告写入
`playwright-report/`，trace 与截图只在失败时保留。
