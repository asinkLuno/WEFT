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
