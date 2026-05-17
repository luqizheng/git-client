# Git 客户端功能入口设计文档

> 日期: 2026-05-17  
> 来源: 26个任务清单入口补充需求  
> 执行方式: superpowers:subagent-driven-development + ui-ux-pro-max

---

## 目标

为 Git 客户端 13 个缺失功能模块提供统一的入口调用机制，采用 Sidebar 扩展 + Toolbar 菜单的组合方案。

---

## 架构设计

### 1. Sidebar 扩展（常用功能面板）

在现有 Sidebar 下方新增 3 个折叠面板：

```
Sidebar
├── Branches (现有)
├── Remotes (现有)
├── Stash (现有)
├── Working Files (现有)
├── Tags ← 新增
├── Submodules ← 新增
└── Worktrees ← 新增
```

| 面板 | 功能 | 状态 | 组件路径 |
|------|------|------|----------|
| **Tags** | 标签列表、新建/删除标签 | 已存在 | `components/tag/TagList.vue` |
| **Submodules** | 子模块列表、初始化/更新 | 已存在 | `components/submodule/SubmoduleList.vue` |
| **Worktrees** | 工作树列表、添加/删除 | 需新建 | `components/worktree/WorktreeList.vue` |

#### Sidebar 面板交互规范

- 每个面板可折叠/展开
- 面板标题带图标
- 列表项支持右键菜单
- 底部有操作按钮（如 + New Tag）

---

### 2. Toolbar 下拉菜单（高级功能）

在 Toolbar 右侧增加 **"更多" (More)** 下拉按钮：

```
Toolbar
├── Open / Clone
├── Fetch / Pull / Push
├── [分隔线]
├── 主题切换
└── 更多 ▼ ← 新增
    ├── Git Flow
    │   ├── 初始化 Git Flow
    │   ├── 开始功能 (feature)
    │   ├── 开始发布 (release)
    │   └── 开始热修复 (hotfix)
    ├── Revert
    ├── Rebase
    ├── Branch Compare
    ├── Advanced Search
    ├── Hook Management
    └── Config
```

| 菜单项 | 对应任务 | 说明 |
|--------|----------|------|
| Git Flow | task-18 | Git Flow 工作流管理 |
| Revert | task-08,09 | 撤销指定提交 |
| Rebase | task-10,11 | 交互式变基 |
| Branch Compare | task-23 | 分支比较 |
| Advanced Search | task-22 | 高级搜索 |
| Hook Management | task-24 | Git Hook 管理 |
| Config | task-25 | 仓库配置管理 |

---

### 3. Commit List 右键菜单增强

在现有右键菜单基础上补充：

```
右键菜单 (Commit)
├── Cherry-pick this commit (现有)
├── [分隔线]
├── Revert this commit ← 新增
├── Rebase onto this commit... ← 增强
├── Reset → Soft / Mixed / Hard (现有)
├── [分隔线]
├── Create Branch here... (现有)
├── Tag this version... (现有)
├── [分隔线]
├── Copy SHA (现有)
├── Copy commit info (现有)
├── [分隔线]
├── View diff (现有)
└── Scroll to HEAD (现有)
```

---

## 组件设计

### Sidebar 面板组件规范

```vue
<!-- Sidebar 面板统一结构 -->
<div class="panel-section">
  <div class="panel-header" @click="toggle">
    <n-icon :component="PanelIcon" />
    <span>Panel Title</span>
    <n-icon :component="isExpanded ? ChevronDown : ChevronForward" />
  </div>
  <div v-show="isExpanded" class="panel-content">
    <!-- 列表内容 -->
    <n-button size="tiny" @click="openDialog">+ New Item</n-button>
  </div>
</div>
```

### Toolbar 下拉菜单

使用 Naive UI 的 `n-dropdown` 组件：

```vue
<n-dropdown :options="moreMenuOptions" @select="handleMenuSelect">
  <n-button quaternary size="small">
    <template #icon><n-icon :component="MoreHorizontal" /></template>
    更多
  </n-button>
</n-dropdown>
```

---

## 路由/状态管理

### 新增 Store

| Store | 用途 |
|-------|------|
| `stores/tags.ts` | 标签列表状态（已存在） |
| `stores/submodule.ts` | 子模块状态（已存在） |
| `stores/worktree.ts` | 工作树状态（需新建） |

### 对话框管理

使用 `useDialog` 或独立 dialog store 管理：
- TagDialog
- WorktreeDialog
- GitFlowDialog
- RevertDialog
- RebaseDialog
- BranchCompareDialog
- SearchDialog
- HookDialog
- ConfigDialog

---

## 样式规范

### 颜色变量（沿用现有）

```css
--sidebar-bg: #1f2937;
--sidebar-border: #374151;
--panel-header-text: #9ca3af;
--panel-content-text: #d1d5db;
--accent-color: #3b82f6;
```

### 尺寸规范

- 面板标题: `text-xs uppercase tracking-wide`
- 列表项: `text-xs px-2 py-0.5`
- 图标大小: `14px`
- 按钮: `size="tiny"`

---

## 实现清单

### Phase 1: Sidebar 扩展

- [ ] 修改 `Sidebar.vue`，接入 TagList 组件
- [ ] 修改 `Sidebar.vue`，接入 SubmoduleList 组件
- [ ] 新建 `WorktreeList.vue` 组件
- [ ] 新建 `stores/worktree.ts`

### Phase 2: Toolbar 菜单

- [ ] 修改 `Toolbar.vue`，添加"更多"下拉菜单
- [ ] 创建菜单选项配置
- [ ] 实现菜单项点击处理

### Phase 3: 右键菜单增强

- [ ] 修改 `commit-list.vue`，添加 Revert 菜单项
- [ ] 修改 `commit-list.vue`，增强 Rebase 菜单项

### Phase 4: 对话框组件

- [ ] 新建 `GitFlowDialog.vue`
- [ ] 新建 `RevertDialog.vue`
- [ ] 新建 `RebaseDialog.vue`
- [ ] 新建 `BranchCompareDialog.vue`
- [ ] 新建 `SearchDialog.vue`
- [ ] 新建 `HookDialog.vue`
- [ ] 新建 `ConfigDialog.vue`

---

## 依赖关系

```
Sidebar
  ├── TagList → stores/tags (已存在)
  ├── SubmoduleList → stores/submodule (已存在)
  └── WorktreeList → stores/worktree (新建)

Toolbar
  └── 更多菜单 → 各功能 Dialog

commit-list
  └── 右键菜单 → Revert/Rebase 实现
```

---

## 验收标准

1. Sidebar 中 Tags、Submodules、Worktrees 面板正常显示
2. Toolbar "更多"菜单可展开并显示所有选项
3. Commit List 右键菜单包含 Revert 和增强的 Rebase
4. 所有入口点击后弹出对应对话框或执行对应操作
5. 样式与现有 UI 保持一致（dark/light 主题）
