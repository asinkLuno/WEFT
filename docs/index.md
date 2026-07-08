# Weft

**WEFT** — World-building, Era, and Fantasy Timeline。

一个用于构建虚构世界时间线的工具。用 YAML 定义人物、关系和事件，
后端解析为结构化数据，前端以时间线 + 关系图的形式呈现。

## 快速开始

```bash
# 安装依赖
uv sync

# 启动（后端 + 前端）
uv run weft serve tests/guojing.yml

# 检查时间线
uv run python -m weft_backend.check tests/guojing.yml
```

## 项目结构

```
weft/
├── weft_backend/     # FastAPI 后端
│   ├── app.py        # 应用入口、API 路由
│   ├── dao.py        # 数据模型与 YAML 解析
│   ├── aqueduct.py   # 时间运算引擎
│   ├── material.py   # 派生属性计算（如星座）
│   └── check.py      # 时间线检查工具
├── weft-frontend/    # Next.js 前端
│   ├── app/          # 页面
│   └── components/   # 组件
└── tests/            # 测试数据与端到端测试
```
