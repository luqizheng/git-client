# RightPanel 最小化至 Icon 计划

## 目标
RightPanel 不允许隐藏，只能通过拖拽 Split 缩小到最小宽度（仅显示一个展开 icon）

## 改动文件

### 1. AppLayout.vue
- 内层 NSplit `:min` 从 `0.25` 改为 `0.04`（约 48px，足够放一个 icon）
- 移除 `v-show="rightPanelVisible"`，改为始终渲染
- 移除 `rightPanelVisible` 相关逻辑

### 2. RightPanel.vue
- 移除 ✕ 关闭按钮（第9行）
- 添加折叠状态检测：当宽度 < 阈值时仅显示展开 icon
- 新增 props 或 inject 接收当前 pane 宽度，判断是否处于"最小化"状态
- 最小化状态：垂直居中显示一个 panel icon/箭头，点击后通知外层展开

### 3. rightPanel.ts (store)
- 可选：添加 `collapsed` 状态字段
- 或直接在 RightPanel 组件内用本地 ref + 宽度计算判断

## 实现步骤

### Step 1: 修改 AppLayout.vue 内层 Split
```vue
<n-split
  direction="horizontal"
  :default-size="0.6"
  :min="0.04"
  :max="0.8"
  :pane1-style="{ 'overflow': 'hidden' }"
  :pane2-style="{ 'overflow': 'hidden', 'min-width': '40px' }"
>
```
- 移除 `v-if/v-else` 条件渲染逻辑
- 移除 `rightPanelVisible` ref 和 watch
- `<RightPanel />` 直接渲染，不加 v-show

### Step 2: 修改 RightPanel.vue
- 删除第9行 ✕ 按钮
- 添加宽度监听或 props 传入当前宽度
- 当 width <= 60px 时进入"icon mode"：
  ```vue
  <template v-if="isCollapsed">
    <div class="flex items-center justify-center h-full cursor-pointer" @click="$emit('expand')">
      <span class="text-gray-500">◂</span>
    </div>
  </template>
  <template v-else>
    <!-- 现有内容 -->
  </template>
  ```

### Step 3: 验证构建
