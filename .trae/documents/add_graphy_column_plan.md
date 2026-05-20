# 添加 Commit Graphy 列实现计划

## 需求分析

用户要求在 commit 列表中添加一个 "graphy" 列，用于可视化展示 commit 之间的分支关系和历史图。

## 代码库研究

### 现有结构
1. **列配置**：`src/components/commit/composables/useColumnConfig.ts` - 定义列配置，当前包含：
   - refs: Tag/Branch 列
   - message: Commit Message 列
   - author: Author 列
   - sha: SHA 列

2. **Commit 列表组件**：`src/components/commit/components/commit-list/commit-list.vue` - 渲染 commit 表格

3. **单元格组件**：`src/components/commit/components/cells/` - 包含各列的单元格组件

4. **Git 图渲染工具**：`src/utils/gitgraphAdapter.ts` - 已存在的 commit 图渲染逻辑

## 实现方案

### 修改文件

| 文件路径 | 修改类型 | 说明 |
|---------|---------|------|
| `src/components/commit/composables/useColumnConfig.ts` | 修改 | 添加 graphy 列配置 |
| `src/components/commit/components/cells/GraphyCell.vue` | 新建 | 创建 graphy 单元格组件 |
| `src/components/commit/components/commit-list/commit-list.vue` | 修改 | 渲染 graphy 列 |
| `src/components/commit/composables/useColumnConfig.test.ts` | 修改 | 更新测试用例 |

### 实现步骤

1. **添加 graphy 列配置**：
   - 在 `DEFAULT_COLUMNS` 数组中添加 graphy 列定义
   - 设置宽度为 60px，最小宽度 40px，可隐藏

2. **创建 GraphyCell 组件**：
   - 接收 commit 对象作为 props
   - 根据 commit 的 parent_ids 和 refs 渲染简化的分支图形
   - 使用 SVG 绘制简单的图形表示

3. **更新 CommitList 组件**：
   - 添加对 graphy 列的渲染支持
   - 更新 WIP 行和数据行的渲染逻辑

4. **更新测试**：
   - 更新测试用例以包含新的 graphy 列

### 技术要点

- GraphyCell 组件采用简化的 SVG 图形展示分支关系
- 利用 commit 的 parent_ids 判断分支结构
- 使用 Vue 的动态组件渲染机制

## 风险评估

- **低风险**：添加新列不影响现有功能
- 需要注意：确保 graphy 列在所有状态下（loading、empty、WIP）正确显示

## 依赖检查

- 无需新增第三方依赖
- 使用项目现有的 shadcn-vue 组件库和 UnoCSS 样式