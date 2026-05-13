# GitKraken 布局重构设计文档

**日期**: 2026-05-13
**方案**: B - 宽屏优化 + 右侧面板按需展开
**状态**: 已批准

## 1. 设计目标

仿效 GitKraken 经典三栏布局，针对宽屏场景优化：
- 左侧窄导航栏（180px）
- 中央主工作区（Commit Graph / Diff 视图切换）
- 右侧按需滑出面板（双模式：Commit Details / Staging Panel）
- 底部固定区域移入右侧 Staging Panel

## 2. 整体布局结构

```
┌─────────────────────────────────────────────────────────────────┐
│  Toolbar (40px) - 操作按钮、分支状态、远程操作                      │
├─────────┬───────────────────────────────────────┬───────────────┤
│         │                                       │               │
│ Left    │           Center Area                 │   Right Panel │
│ Sidebar │     (Graph View / Diff View)          │   (320px,     │
│ (180px) │                                       │    按需显示)   │
│         │                                       │               │
│ Explorer│  ┌─────────────────────────────────┐  │  Commit       │
│ Branches│  │                                 │  │  Details      │
│ Remotes │  │     Commit Graph / Diff          │  │  或          │
│ Stash   │  │                                 │  │  Staging      │
│ Tags    │  └─────────────────────────────────┘  │  Panel        │
│         │                                       │               │
├─────────┴───────────────────────────────────────┴───────────────┤
│  StatusBar (24px) - 分支信息、编码、文件类型                        │
└─────────────────────────────────────────────────────────────────┘
```

**默认窗口尺寸**: 1200×800 (最小 800×600)

### 2.1 各区域详细规格

| 区域 | 尺寸 | 内容 | 可调整 |
|------|------|------|--------|
| Toolbar | 高度 40px | 全局操作按钮、分支指示器、Pull/Push/Fetch | 否 |
| Left Sidebar | 宽度 180px (可折叠至 48px 图标模式) | Repo列表、分支树、远程仓库、Stash、Tags | ✓ 拖拽 |
| Center Area | 自适应剩余空间 | Commit Graph / Diff View / File Tree | 否 |
| Right Panel | 宽度 320px (范围: 240-480px) | Commit Details 或 Staging Panel | ✓ 拖拽 |
| StatusBar | 高度 24px | 当前分支、上游同步状态、编码、语言 | 否 |

## 3. 核心交互逻辑

### 3.1 状态机：右侧面板内容切换

```
                    ┌──────────────┐
                    │  默认状态     │
                    │ 面板隐藏      │
                    │ Graph 全宽    │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
     ┌────────────┐ ┌──────────┐ ┌──────────┐
     │ 点击 Commit │ │点击 Working│ │ 点击关闭 │
     │ 节点        │ │ Files图标  │ │ / Escape │
     └─────┬──────┘ └─────┬────┘ └─────┬────┘
           ▼              ▼            ▼
   ┌────────────┐  ┌──────────┐  ┌──────────┐
   │ Commit     │  │ Staging  │  │ 返回默认 │
   │ Details    │  │ Panel    │  │ 状态     │
   │ 模式       │  │ 模式     │  │          │
   └─────┬──────┘  └─────┬────┘  └──────────┘
         │               │
         ▼               ▼
   点击文件 → Diff 在中央显示
```

### 3.2 交互流程详情

#### 流程 A：查看提交历史

1. **默认状态**
   - 左侧导航显示完整内容
   - 中央区域全宽显示 Commit Graph
   - 右侧面板隐藏
   - 用户浏览 commit 列表，点击高亮选中

2. **选中 Commit 后**
   - 右侧面板从右边缘滑出（动画 200ms ease）
   - 显示 `CommitDetails` 组件
   - 中央区域自适应缩小
   - 用户可在右侧查看 commit 详情和变更文件列表

3. **点击变更文件后**
   - 中央区域切换为 DiffView（Monaco Editor 三路对比）
   - 左右面板保持不变
   - Diff 占据最大可视面积
   - 提供 "Back to Graph" 按钮 / Escape 键返回

#### 流程 B：Staging 工作流

1. **打开 Staging Panel**
   - 点击左侧导航的 "Working Files" 图标（或工具栏按钮）
   - 右侧面板滑出，显示 `StagingPanel` 组件
   - 包含完整的暂存工作流界面

2. **Stage/Unstage 操作**
   - Unstaged Files 列表：显示所有未暂存变更
   - 单击文件 → Stage 该文件
   - "Stage All Changes" 按钮 → Stage 所有文件
   - Staged Files 列表：显示已暂存文件
   - 单击已暂存文件 → Unstage 该文件

3. **编写并提交 Commit**
   - 输入 Commit summary（必填）
   - 输入 Description（可选）
   - 选择选项：Amend previous commit、AI 辅助撰写
   - 点击 "⚡ Stage Changes to Commit" 提交

## 4. 右侧面板双模式详解

### 4.1 模式 A：Commit Details

**触发条件**: 点击 Commit Graph 中的任意 commit 节点

**组件结构**:
```
RightPanel.vue
└── CommitDetails.vue
    ├── CommitHeader.vue
    │   ├── SHA (可复制)
    │   ├── Message (标题 + 描述)
    │   ├── Author 信息
    │   ├── Date 时间戳
    │   ├── Parents 父提交链接
    │   └── Co-Author(s) 协作者
    └── ChangedFilesList.vue
        ├── 文件统计头部 ("CHANGED FILES (N)")
        ├── Path/Tree 视图切换
        └── 文件列表项 (每项包含):
            ├── 复选框 (批量选择)
            ├── 状态标识 (M/A/D/R/C)
            ├── 文件路径
            └── 行数统计 (+N −M)
                └── 点击 → 在中央区域显示 Diff
```

**UI 规格**:
- Header 背景: #2d2d2d，高度自动适应
- Commit info 区背景: #252526，padding 14px
- 文件列表区使用 NaiveUI Scrollbar，支持虚拟滚动
- 文件项 hover 效果: 背景变亮 + 左侧边框高亮
- 状态颜色: Modified=#73c991, Added=#e2c08d, Deleted=#f14c4c, Renamed=#dcdcaa

### 4.2 模式 B：Staging Panel

**触发条件**: 点击 "Working Files" 导航项或工具栏按钮

**组件结构**:
```
RightPanel.vue
└── StagingPanel.vue
    ├── FileStatsHeader.vue
    │   ├── 文件统计 ("N file changes on <branch>")
    │   └── 分支标签 (彩色 badge)
    ├── Toolbar.vue
    │   ├── Path 视图按钮 (激活态)
    │   └── Tree 视图按钮
    ├── UnstagedFilesSection.vue
    │   ├── 折叠/展开控制
    │   ├── 计数 ("Unstaged Files (N)")
    │   └── "Stage All Changes" 按钮
    │       └── 文件列表项
    │           ├── 状态标识 (+/-)
    │           └── 文件路径
    └── StagedFilesSection.vue
        ├── 折叠/展开控制
        ├── 计数 ("Staged Files (N)")
        └── 文件列表项 (同上)

    └── CommitEditorSection.vue (底部固定)
        ├── ActionBar.vue
        │   ├── ⚡ Commit 按钮 (主操作)
        │   ├── ⬆ Push after commit
        │   ├── ↻ Commit and sync
        │   └── ☐ Amend previous commit
        ├── MessageInputs.vue
        │   ├── Summary input (单行, 必填)
        │   └── Description textarea (多行, 可选)
        ├── OptionsRow.vue
        │   ├── ▸ Commit options (展开高级选项)
        │   └── ✨ Compose commits with AI (AI 辅助)
        └── SubmitButton.vue
            └── ⚡ Stage Changes to Commit (底部大按钮)
```

**UI 规格** (仿 GitKraken 截图):
- 文件统计头: 背景 #2d2d2d，高度 44px
- Path/Tree 切换: 背景 #252526，高度 36px
- Unstaged/Staged 分隔线: 1px solid #3c3c3c
- 文件项: 背景 #2d2d2d, padding 6px 8px, border-radius 3px
- Commit 编辑器区域: 固定在底部，不随文件列表滚动
- Commit 按钮: 背景 #0e639c (蓝色)，白色文字，圆角 4px
- AI 按钮: 背景 #6b21a8 (紫色)，白色文字
- 底部提交按钮: 虚线边框，禁用态灰色，启用态绿色

## 5. 技术实现架构

### 5.1 Store 设计

```typescript
// stores/rightPanel.ts

interface RightPanelState {
  // 显隐与尺寸
  visible: boolean
  width: number          // default: 320, min: 240, max: 480
  isDragging: boolean    // 拖拽调整宽度中
  
  // 模式管理
  mode: 'commit' | 'staging' | null
  
  // Commit Details 数据
  selectedCommitSha: string | null
  commitDetail: CommitDetail | null
  changedFiles: ChangedFile[]
  
  // Staging 数据
  unstagedFiles: WorkingFile[]
  stagedFiles: WorkingFile[]
  commitMessage: {
    summary: string
    description: string
  }
  amendMode: boolean
}

// Actions
showPanel(mode: 'commit' | 'staging', sha?: string): void
hidePanel(): void
togglePanel(): void
setWidth(width: number): void
selectCommit(sha: string): Promise<void>
loadChangedFiles(sha: string): Promise<void>
stageFile(filePath: string): Promise<void>
unstageFile(filePath: string): Promise<void>
stageAllChanges(): Promise<void>
commit(): Promise<void>
```

### 5.2 组件层级

```
App.vue
└── AppLayout.vue
    ├── Toolbar.vue (全局工具栏)
    ├── RepoTabs.vue (仓库切换标签页)
    ├── MainContainer.vue (Flex 布局容器)
    │   ├── LeftSidebar.vue (左侧导航)
    │   │   ├── ResizeHandle (拖拽手柄)
    │   │   ├── ExplorerSection.vue (仓库列表)
    │   │   ├── BranchSection.vue (分支树)
    │   │   ├── RemoteSection.vue (远程仓库)
    │   │   └── MiscSection.vue (Stash/Tags)
    │   ├── CenterArea.vue (中央主工作区)
    │   │   ├── ModeIndicator.vue (当前视图提示)
    │   │   ├── GraphView.vue (提交图谱视图)
    │   │   │   └── CommitList.vue (commit 列表)
    │   │   └── DiffView.vue (Diff 对比视图)
    │   │       └── MonacoDiff.vue (Monaco Editor)
    │   ├── RightPanel.vue (右侧面板容器)
    │   │   ├── ResizeHandle (拖拽手柄)
    │   │   ├── PanelHeader.vue (面板头部 + 关闭按钮)
    │   │   ├── CommitDetails.vue [v-if="mode==='commit'"]
    │   │   └── StagingPanel.vue [v-if="mode==='staging'"]
    │   └── BottomStatusBar.vue (底部状态栏)
```

### 5.3 关键技术点

#### 5.3.1 可拖拽分栏实现

创建通用 `ResizeHandle.vue` 组件：

```vue
<template>
  <div 
    class="resize-handle"
    :class="{ active: isDragging }"
    @mousedown="startDrag"
  >
    <div class="handle-line"></div>
  </div>
</template>

<script setup lang="ts">
// 监听 mousedown/mousemove/mouseup
// 更新 parent store 中的 width 值
// 限制 min/max 范围
// 使用 CSS cursor: col-resize
</script>

<style scoped>
.resize-handle {
  width: 4px;
  background: transparent;
  transition: background 0.2s;
  position: relative;
  z-index: 10;
}
.resize-handle:hover,
.resize-handle.active {
  background: #0e639c;
}
.handle-line {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 1px;
  background: #3c3c3c;
}
</style>
```

**使用位置**:
- LeftSidebar 右边缘 (调整左侧宽度)
- RightPanel 左边缘 (调整右侧宽度)

#### 5.3.2 右侧面板动画

```css
/* RightPanel.vue */
.right-panel {
  transition: width 0.2s ease, opacity 0.2s ease, transform 0.2s ease;
  overflow: hidden;
}

/* 使用 v-show 而非 v-if，避免组件销毁重建 */
/* 隐藏时设置 width: 0; opacity: 0; */
/* 显示时恢复 width: store.width; opacity: 1; */
```

#### 5.3.3 中央区域视图切换

```vue
<!-- CenterArea.vue -->
<template>
  <div class="center-area">
    <component 
      :is="currentViewComponent"
      v-bind="currentViewProps"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRightPanelStore } from '../stores/rightPanel'
import GraphView from './GraphView.vue'
import DiffView from './DiffView.vue'

const rightPanel = useRightPanelStore()

const currentViewComponent = computed(() => {
  if (rightPanel.selectedFileForDiff) return DiffView
  return GraphView
})
</script>
```

#### 5.3.4 NaiveUI Scrollbar 配置

所有滚动区域统一使用 `<n-scrollbar>` 组件：

```vue
<n-scrollbar 
  :theme-overrides="scrollbarTheme"
  trigger="none"
  size="small"
>
  <!-- content -->
</n-scrollbar>

<script setup>
const scrollbarTheme = {
  colorHover: '#4a4a4a',
  colorScroll: '#5a5a5a'
}
</script>
```

**应用位置**:
- LeftSidebar 内各 section (分支树、远程列表等)
- CommitDetails 的文件列表
- StagingPanel 的 Unstaged/Staged 文件列表
- CenterArea 的 GraphView 和 DiffView

#### 5.3.5 响应式断点策略

```typescript
// 断点配置
const breakpoints = {
  small: 768,   // 笔记本竖屏
  medium: 1024, // 小桌面/平板横屏
  large: 1440   // 大屏显示器
}

// 响应式行为
// window.innerWidth < 768:
//   - 左侧导航: 仅图标模式 (48px)
//   - 右侧面板: 强制隐藏
//
// window.innerWidth < 1024:
//   - 左侧导航: 缩小版 (160px)
//   - 右侧面板: 默认隐藏，手动开启
//
// window.innerWidth >= 1024:
//   - 完整布局，所有功能可用
```

### 5.4 事件流与数据通信

```
用户操作                  Store Action            组件响应
─────────                ─────────────           ──────────
点击 commit 节点  →  selectCommit(sha)  →  加载 commit 详情
                                         →  showPanel('commit', sha)
                                         →  RightPanel 滑出
                                         →  CommitDetails 渲染数据

点击文件名       →  selectFile(path)    →  CentralArea 切换到 DiffView
                                         →  加载 diff 数据到 Monaco

点击 Working Files→ showPanel('staging')→  RightPanel 切换到 StagingPanel
                                         →  加载 unstaged/staged 文件列表

点击 Stage 按钮  →  stageFile(path)    →  调用 Tauri IPC git add
                                         →  刷新文件列表
                                         →  文件从 Unstaged 移到 Staged

输入 message + 
点击 Commit      →  commit()           →  调用 Tauri IPC git commit
                                         →  刷新 Graph + 清空 staging
                                         →  显示成功消息

拖拽分隔线       →  setWidth(w)        →  更新 panel width
                                         →  CSS transition 平滑过渡

按 Escape        →  hidePanel()        →  右侧面板收起
                                         →  如果在 DiffView，返回 GraphView
```

### 5.5 与现有代码的集成点

**需要修改的现有文件**:

1. `App.vue` - 重构 slot 结构，移除底部的 StageArea/CommitEditor
2. `AppLayout.vue` - 添加 RightPanel 容器和 ResizeHandle
3. `Sidebar.vue` - 添加 "Working Files" 导航项
4. `stores/staging.ts` - 扩展以支持新的 staging 工作流
5. `stores/repo.ts` - 可能需要添加 working files 相关状态

**新建文件清单**:

```
src/
├── components/
│   ├── layout/
│   │   ├── RightPanel.vue           # 右侧面板容器
│   │   ├── ResizeHandle.vue         # 可拖拽分隔线
│   │   ├── CenterArea.vue           # 中央区域容器
│   │   └── ModeIndicator.vue        # 视图模式指示器
│   ├── commit/
│   │   ├── CommitDetails.vue        # Commit 详情主组件
│   │   ├── CommitHeader.vue         # Commit 元信息头部
│   │   └── ChangedFilesList.vue     # 变更文件列表
│   ├── staging/
│   │   ├── StagingPanel.vue         # Staging 主面板
│   │   ├── FileStatsHeader.vue      # 文件统计头部
│   │   ├── UnstagedFilesSection.vue # 未暂存文件区
│   │   ├── StagedFilesSection.vue   # 已暂存文件区
│   │   └── CommitEditorSection.vue  # Commit 编辑器区
│   └── diff/
│       └── DiffView.vue             # Diff 视图 (重构)
├── stores/
│   └── rightPanel.ts                # 右侧面板状态管理
└── composables/
    └── useResizable.ts              # 可拖拽调整宽度的 composable
```

## 6. 性能考虑

### 6.1 虚拟滚动

- Commit Graph 列表: 当仓库有 >1000 条 commits 时启用虚拟滚动
- 文件列表: 当单次变更文件 >100 个时启用虚拟滚动
- 使用 `@tanstack/vue-virtual` 或 NaiveUI 的内置虚拟列表

### 6.2 懒加载

- DiffView/MonacoEditor: 动态 import，仅在需要时加载
- StagingPanel 子组件: 使用 `<Suspense>` 包裹异步加载
- CommitDetails: 可以预加载最近一次 commit 的详情

### 6.3 内存管理

- 切换模式时保留组件实例（使用 `v-show` 而非 `v-if`）
- Diff 数据在使用后及时释放（watch effect cleanup）
- 大型仓库的 commit 图数据采用分页/窗口化加载

## 7. 可访问性与键盘快捷键

### 7.1 键盘导航

| 快捷键 | 功能 |
|--------|------|
| `Escape` | 关闭右侧面板 / 从 DiffView 返回 Graph |
| `Ctrl+Enter` | 在 Staging Panel 中提交 commit |
| `Ctrl+S` | Stage 选中的文件 |
| `Ctrl+U` | Unstage 选中的文件 |
| `Ctrl+A` | Stage All Changes |
| `Left/Right` | 在 Commit Graph 中导航 |
| `Enter` | 打开选中项 (commit 详情 / 文件 diff) |

### 7.2 无障碍支持

- 所有交互元素添加 `aria-label`
- 面板显隐状态通过 `aria-expanded` 标注
- 焦点管理: 打开面板时焦点移入面板，关闭时回到触发元素
- 支持屏幕阅读器的实时区域更新 (aria-live)

## 8. 主题适配

### 8.1 Dark Theme (默认)

- 背景: #1e1e1e (主), #252526 (次级), #2d2d2d (三级)
- 文字: #d4d4d4 (主要), #888 (次要)
- 强调色: #0e639c (蓝色按钮), #4ec9b0 (成功/新增), #f14c4c (删除)
- 边框: #3c3c3c

### 8.2 Light Theme

- 背景: #ffffff (主), #f5f5f5 (次级), #ececec (三级)
- 文字: #333333 (主要), #666666 (次要)
- 强调色: #0066b8 (蓝色按钮), #22863a (成功/新增), #cb2431 (删除)
- 边框: #e1e4e8

**CSS 变量映射**: 使用项目现有的 `variables.css` 和主题系统，确保新组件同时支持 dark/light 双主题。

## 9. 测试策略

### 9.1 单元测试 (Vitest)

- `rightPanel` store: 状态转换逻辑、边界条件
- `useResizable` composable: 拖拽计算、min/max 限制
- 组件渲染: 正确的条件渲染 (v-show/v-if)

### 9.2 集成测试

- 点击 commit → 面板滑出 → 显示正确数据
- 点击文件 → 中央切换到 DiffView
- Stage/Unstage 操作 → 文件在两个列表间移动
- Commit 提交 → 成功后刷新相关视图

### 9.3 E2E 测试 (可选)

- 完整的 staging workflow: 修改文件 → stage → commit → push
- 大量文件的性能表现 (>1000 commits, >100 changed files)

## 10. 实施优先级

### Phase 1: 基础骨架 (必须)
1. 创建 `ResizeHandle.vue` 组件
2. 创建 `stores/rightPanel.ts`
3. 重构 `AppLayout.vue` 添加左右分栏结构
4. 实现 `RightPanel.vue` 容器 + 滑出动画

### Phase 2: Commit Details 模式 (核心)
5. 实现 `CommitDetails.vue` 及子组件
6. 集成 Commit Graph 点击事件
7. 实现文件列表 → DiffView 切换

### Phase 3: Staging Panel 模式 (完整)
8. 实现 `StagingPanel.vue` 及子组件
9. 集成 stage/unstage IPC 调用
10. 实现 Commit Editor + 提交功能

### Phase 4: 优化与完善 (增强)
11. 添加键盘快捷键支持
12. 响应式断点适配
13. 性能优化 (虚拟滚动、懒加载)
14. 主题适配验证
15. 可访问性审计

## 11. 风险与缓解措施

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 大仓库性能问题 | 卡顿/内存溢出 | 虚拟滚动 + 分页加载 + 数据缓存 |
| Tauri IPC 延迟 | UI 响应慢 | 异步加载 + loading 状态 + optimistic UI |
| Monaco Editor 加载慢 | 首次打开 Diff 时延迟 | 预加载 + skeleton 屏 + 进度提示 |
| 复杂状态管理 | Bug 难以排查 | 清晰的状态机 + 详尽的类型定义 + 单元测试覆盖 |

## 12. 成功标准

- [ ] 三栏布局可正常显示，符合 GitKraken 视觉规范
- [ ] 左右分栏可通过拖拽调整宽度 (范围限制正常)
- [ ] 右侧面板滑出/收起动画流畅 (≤200ms)
- [ ] Commit Details 模式数据展示准确完整
- [ ] Staging Panel 模式的 stage/unstage/commit 流程可用
- [ ] 点击文件能在中央区域正确显示 Diff
- [ ] 支持 dark/light 双主题无缝切换
- [ ] 窗口缩小时响应式布局正常降级
- [ ] 主要操作均有键盘快捷键支持
- [ ] 无明显性能问题 (60fps 滚动, <100ms 交互响应)

---

**文档版本**: 1.0
**最后更新**: 2026-05-13
**批准人**: User
