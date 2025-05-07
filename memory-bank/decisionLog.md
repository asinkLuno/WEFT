
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