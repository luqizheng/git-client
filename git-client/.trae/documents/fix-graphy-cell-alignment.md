# 修复 GraphyCell 对齐问题

## 问题分析

当前 GraphyCell.vue 中圆点位置计算错误：
- `index * 24 + 12` 假设每行高度为 24px
- 但 commit-list.vue 的 TableRow 高度为 `h-10` (40px)
- 导致圆点与表格行不对齐

## 修复方案

### 1. 统一行高常量
在 GraphyCell.vue 中定义 `ROW_HEIGHT = 40`，与 TableRow 保持一致

### 2. 调整圆点位置
- 圆点中心 y 坐标：`index * 40 + 20`（行高 40px，圆点在行中间）
- viewBox 需要动态计算宽度和高度
- viewBox 宽度固定 40px
- viewBox 高度：`commits.length * 40`

### 3. 调整连接线长度
- 上方连接线：从行顶 (-20) 到圆点 (-8)
- 下方连接线：从圆点 (8) 到行底 (20)

### 4. SVG 尺寸
- 宽度：40px
- 高度：`commits.length * 40` px

## 实现步骤

1. 修改 GraphyCell.vue：
   - 定义 `const ROW_HEIGHT = 40`
   - 调整 SVG viewBox 高度
   - 调整圆点和连接线的 y 坐标
   - 确保每行 40px 高度，圆点居中
