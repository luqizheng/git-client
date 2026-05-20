# Commit List 可配置列头设计

## 概述

为 Commit List 添加可配置的列头，支持调整列宽、显示/隐藏列，配置持久化到 localStorage。

## 布局设计

```
┌──────────────────────────────────────────────────────────────────┐
│ Branch/Tag ▼ │ Message                    │ Author    │ Date    │ ← 可配置列头
├──────────────────────────────────────────────────────────────────┤
│ ● main       │ fix: resolve merge conflict │ zhang     │ 2h ago  │
│              │ feat: add column header      │ li        │ 5h ago  │
└──────────────────────────────────────────────────────────────────┘
```

## 列定义

| 列 ID | 默认宽度 | 最小宽度 | 可隐藏 |
|--------|---------|---------|--------|
| refs | 120px | 80px | ✅ |
| message | 300px | 200px | ❌ |
| author | 100px | 60px | ✅ |
| date | 80px | 60px | ✅ |

## 交互设计

### 列宽调整
- 鼠标悬停列分隔线显示拖拽光标
- 拖拽调整列宽
- 实时预览，松开保存

### 显示/隐藏列
- 右键列头弹出菜单
- 勾选控制显示状态
- Message 列始终显示（不可隐藏）

### 配置持久化
- Key: `commit-list-columns`
- Value: 按仓库路径独立存储

```ts
interface ColumnConfig {
  id: string
  visible: boolean
  width: number
}

type ColumnConfigs = Record<string, ColumnConfig[]>
```

## 组件结构

```
commit/components/
├── CommitListHeader.vue      # 新增：可配置列头组件
├── composables/
│   └── useColumnConfig.ts    # 新增：列配置 composable
└── components/commit-list/
    └── commit-list.vue       # 修改：集成列头
```

## CommitGraph.vue 改造

- 接收 `columnWidths` prop
- 行信息区域改用 CSS Grid/Flexbox 布局
- 监听滚动时考虑隐藏列的偏移

## 实现步骤

1. 创建 `useColumnConfig.ts` composable
2. 创建 `CommitListHeader.vue` 组件
3. 修改 `CommitGraph.vue` 支持动态列宽
4. 修改 `commit-list.vue` 集成新组件
5. 联调测试

## 验收标准

- [ ] 列头固定显示，点击有交互反馈
- [ ] 拖拽分隔线可调整列宽
- [ ] 右键菜单可显示/隐藏列
- [ ] 刷新页面后配置保留
- [ ] 不同仓库配置独立保存
