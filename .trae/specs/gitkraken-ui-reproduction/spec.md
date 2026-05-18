# GitKraken UI 一比一还原 Spec

## Why
当前项目 UI 与 GitKraken 差距较大：Commit Graph 使用表格而非可视化图形、Toolbar 使用文字按钮而非图标、左侧面板分区与 GitKraken 不一致、配色方案不同。需要一比一还原 GitKraken 的界面布局、视觉风格和交互模式。

## What Changes
- 重写 Toolbar：改为图标按钮布局，新增 Undo/Redo/Branch/Stash/Pop Stash 按钮，Pull 按钮支持下拉选择拉取类型
- 重写 Left Panel：改为 GitKraken 风格 Reference Panel，分区：Local、Remote、Tags、Stashes、Submodules
- 重写 Center Area：将表格列表替换为可视化 Commit Graph（SVG 分支线 + 节点 + WIP 节点）
- 重写 Right Panel：改为 GitKraken 风格 Commit Panel（Unstaged → Staged → Commit Message 垂直布局）
- 重写 Status Bar：添加缩放选择器、Launchpad 摘要区域
- 更新配色方案：从 Catppuccin 改为 GitKraken Dark 主题色
- 移除 RepoTabs 独立组件，仓库切换整合到 Toolbar

## Impact
- Affected specs: commit-detail-visual-upgrade, commit-file-diff-integration
- Affected code:
  - `git-client/src/components/layout/Toolbar.vue` (重写)
  - `git-client/src/components/layout/Sidebar.vue` (重写)
  - `git-client/src/components/layout/AppLayout.vue` (重写)
  - `git-client/src/components/layout/RightPanel.vue` (重写)
  - `git-client/src/components/layout/StatusBar.vue` (重写)
  - `git-client/src/components/layout/RepoTabs.vue` (移除或合并)
  - `git-client/src/components/layout/CenterArea.vue` (重写)
  - `git-client/src/components/commit/components/commit-list/commit-list.vue` (重写为 Graph)
  - `git-client/src/components/graph/CommitGraph.vue` (重写)
  - `git-client/src/components/staging/StagingPanel.vue` (重写)
  - `git-client/src/components/staging/UnstagedFilesSection.vue` (重写)
  - `git-client/src/components/staging/StagedFilesSection.vue` (重写)
  - `git-client/src/components/staging/CommitEditorSection.vue` (重写)
  - `git-client/src/components/branch/BranchTree.vue` (重写)
  - `git-client/src/components/remote/RemotePanel.vue` (重写)
  - `git-client/src/assets/styles/variables.css` (更新配色)
  - `git-client/src/assets/styles/themes/dark.css` (更新配色)
  - `git-client/src/assets/styles/themes/light.css` (更新配色)
  - `git-client/src/stores/rightPanel.ts` (调整状态)

## GitKraken 界面布局

```
┌─────────────────────────────────────────────────────────────────────┐
│  [⏪] [⏩]  [⬇ Pull▾] [⬆ Push]  [⑂ Branch]  [📦 Stash] [📤 Pop]  │  ← Toolbar
│  [Repo Name ▾]                                    [⚙] [👤] [🎨]    │
├──────────┬──────────────────────────────┬──────────────────────────┤
│          │  // WIP                      │  Unstaged Files (3)      │
│  Local   │  ● feature-login            │  ├─ M  src/main.ts       │
│  ├ main  │  │  ● fix-bug               │  ├─ A  new-file.ts       │
│  ├ dev   │  │  │  ● ● main             │  └─ D  old-file.ts       │
│          │  │  │  │                     │  Staged Files (1)        │
│  Remote  │  │  │  │                     │  └─ M  app.vue           │
│  ├ origin│  │  │  │                     │                          │
│  │ ├ main│  │  │  │                     │  Commit Message          │
│          │  │  │  │                     │  ┌──────────────────┐    │
│  Tags    │  │  │  │                     │  │ summary...       │    │
│  ├ v1.0  │  │  │  │                     │  │ description...   │    │
│          │  │  │  │                     │  └──────────────────┘    │
│  Stashes │  │  │  │                     │  [✓ Commit Changes]      │
│  ├ WIP   │  │  │  │                     │                          │
├──────────┴──┴──┴──┴─────────────────────┴──────────────────────────┤
│  ● main  abc1234  2 ahead, 1 behind    [100% ▾]                   │  ← Status Bar
└─────────────────────────────────────────────────────────────────────┘
```

## ADDED Requirements

### Requirement: GitKraken Dark 配色方案
系统 SHALL 使用 GitKraken Dark 主题配色

#### Scenario: Dark 主题色彩
- **WHEN** 应用使用 dark 主题
- **THEN** 背景色使用 #1b1b1b (主背景)、#2b2b2b (面板背景)、#3c3c3c (边框)
- **AND** 文本色使用 #e6e6e6 (主要)、#8b949e (次要)、#6e7681 (弱化)
- **AND** 强调色使用 #0e639c (蓝色主操作)、#238636 (绿色成功)、#e57373 (红色危险)
- **AND** 分支颜色使用 GitKraken 标准调色板

### Requirement: Toolbar 图标按钮布局
Toolbar SHALL 使用图标按钮，与 GitKraken 布局一致

#### Scenario: Toolbar 按钮排列
- **WHEN** 仓库已打开
- **THEN** 从左到右显示：Undo、Redo、分隔线、Pull（带下拉）、Push、分隔线、Branch、Stash、Pop Stash
- **AND** 右侧显示：主题切换、齿轮设置
- **AND** 按钮默认只显示图标，无文字标签
- **AND** 鼠标悬停显示 tooltip

#### Scenario: Pull 按钮下拉
- **WHEN** 点击 Pull 按钮旁的下拉箭头
- **THEN** 显示选项：Fetch All、Pull (fast-forward if possible)、Pull (fast-forward only)、Pull (rebase)
- **AND** 可设置默认 Pull 类型

#### Scenario: Undo/Redo 状态
- **WHEN** 无可撤销操作
- **THEN** Undo 按钮灰显
- **WHEN** 有可撤销操作
- **THEN** Undo 按钮亮起（实色）

### Requirement: 左侧 Reference Panel
左侧面板 SHALL 显示 GitKraken 风格的引用面板

#### Scenario: 分区展示
- **WHEN** 仓库已打开
- **THEN** 显示以下可折叠分区：Local、Remote、Tags、Stashes、Submodules
- **AND** 每个分区有标题栏，点击可折叠/展开
- **AND** 当前分支在 Local 分区中高亮，左侧有圆形标记
- **AND** 每个分区可独立折叠，标题栏右侧有 ▾/▸ 指示器

#### Scenario: Local 分区
- **WHEN** 展开 Local 分区
- **THEN** 显示所有本地分支列表
- **AND** 当前分支有绿色圆形标记
- **AND** 右键分支显示上下文菜单：Checkout、Merge、Rebase、Delete、Rename

#### Scenario: Remote 分区
- **WHEN** 展开 Remote 分区
- **THEN** 按远程名称分组显示远程分支
- **AND** 每个远程名称可折叠/展开
- **AND** 右键远程分支显示上下文菜单

#### Scenario: Tags 分区
- **WHEN** 展开 Tags 分区
- **THEN** 显示所有标签列表
- **AND** 右键标签显示上下文菜单：Delete Tag、Push Tag

#### Scenario: Stashes 分区
- **WHEN** 展开 Stashes 分区
- **THEN** 显示所有 stash 条目
- **AND** 点击 stash 条目在 Commit Panel 中显示内容
- **AND** 右键显示：Apply Stash、Pop Stash、Delete Stash

#### Scenario: Submodules 分区
- **WHEN** 展开 Submodules 分区
- **THEN** 显示所有子模块列表
- **AND** 无子模块时显示 "No submodules"

### Requirement: 可视化 Commit Graph
中间区域 SHALL 显示可视化 Commit Graph，取代表格列表

#### Scenario: Graph 渲染
- **WHEN** 仓库有 commit 历史
- **THEN** 使用 SVG 渲染分支线和 commit 节点
- **AND** 每个分支使用不同颜色，颜色与左面板对应
- **AND** 分支线为曲线（贝塞尔曲线），非折线
- **AND** merge commit 显示为两线汇合

#### Scenario: WIP 节点
- **WHEN** 工作区有未提交的变更
- **THEN** Graph 顶部显示 "// WIP" 节点
- **AND** 点击 WIP 节点在右侧 Commit Panel 显示 staging 视图
- **AND** WIP 节点使用特殊样式（虚线边框或不同颜色）

#### Scenario: Commit 节点交互
- **WHEN** 点击 commit 节点
- **THEN** 右侧 Commit Panel 显示该 commit 的详情
- **AND** 选中 commit 高亮显示
- **WHEN** 右键 commit 节点
- **THEN** 显示上下文菜单：Cherry-pick、Rebase、Reset、Create Branch、Create Tag、Copy SHA

#### Scenario: Commit 行信息
- **WHEN** Graph 渲染 commit
- **THEN** 每个 commit 右侧显示：分支/标签名（如有关联）、commit message、作者名、相对时间
- **AND** 选中行高亮背景色
- **AND** 悬停行显示浅色高亮

#### Scenario: 虚拟滚动
- **WHEN** commit 数量超过可视区域
- **THEN** 使用虚拟滚动优化渲染性能
- **AND** 滚动流畅，无卡顿

### Requirement: 右侧 Commit Panel
右侧面板 SHALL 显示 GitKraken 风格 Commit Panel

#### Scenario: WIP/Staging 视图
- **WHEN** 选中 WIP 节点或未选中 commit
- **THEN** 面板显示 staging 视图
- **AND** 从上到下依次显示：Unstaged Files、Staged Files、Commit Message 输入区
- **AND** Unstaged Files 区域：每个文件显示状态图标（M/A/D/R）和文件名，点击文件显示 diff
- **AND** Unstaged Files 区域顶部有 "Stage All Changes" 按钮
- **AND** 点击 Unstaged 文件可 stage 该文件
- **AND** Staged Files 区域：已暂存文件列表，点击可 unstage
- **AND** Commit Message 区域：Summary 输入框 + Description 多行输入框 + Commit 按钮

#### Scenario: Commit Detail 视图
- **WHEN** 选中某个 commit
- **THEN** 面板显示 commit 详情
- **AND** 顶部显示：分支标签、commit message、作者信息
- **AND** 下方显示变更文件列表
- **AND** 点击文件显示 diff

#### Scenario: 文件状态图标
- **WHEN** 显示文件变更
- **THEN** Modified 文件显示 M 图标（黄色）
- **AND** Added 文件显示 A 图标（绿色）
- **AND** Deleted 文件显示 D 图标（红色）
- **AND** Renamed 文件显示 R 图标（蓝色）

### Requirement: Status Bar
底部状态栏 SHALL 显示关键状态信息

#### Scenario: 状态信息展示
- **WHEN** 仓库已打开
- **THEN** 左侧显示：当前分支名、commit SHA 前 7 位、ahead/behind 计数
- **AND** 右侧显示：缩放选择器（100%、110%、125%、140%、150%、175%、200%）
- **AND** 中间显示同步状态（Syncing... 时显示动画）

### Requirement: 仓库标签整合到 Toolbar
仓库切换 SHALL 整合到 Toolbar 而非独立标签栏

#### Scenario: 仓库切换
- **WHEN** 多个仓库打开
- **THEN** Toolbar 左侧显示当前仓库名称下拉
- **AND** 点击下拉可切换仓库
- **AND** 不再显示独立的 RepoTabs 栏

### Requirement: 面板可调整大小
所有面板 SHALL 支持拖拽调整大小

#### Scenario: 面板拖拽
- **WHEN** 鼠标悬停在面板分隔线上
- **THEN** 光标变为列调整图标
- **AND** 可拖拽调整左右面板宽度
- **AND** 左面板最小宽度 120px，最大宽度 400px
- **AND** 右面板最小宽度 200px

#### Scenario: 面板折叠
- **WHEN** 点击左面板折叠按钮
- **THEN** 左面板折叠为图标栏
- **AND** 再次点击展开

## MODIFIED Requirements

### Requirement: 整体三栏布局
原布局保持 Toolbar → RepoTabs → 三栏 (Sidebar | Center | RightPanel) → StatusBar 结构。
修改为：Toolbar → 三栏 (LeftRefPanel | CommitGraph | CommitPanel) → StatusBar。
移除独立的 RepoTabs 组件，仓库切换整合到 Toolbar。

### Requirement: 主题系统
原 Catppuccin 配色改为 GitKraken Dark 配色。CSS 变量名保持不变，值更新。
Light 主题同步更新为 GitKraken Light 配色。

## REMOVED Requirements

### Requirement: 表格式 Commit List
**Reason**: 替换为可视化 Commit Graph
**Migration**: commit-list.vue 中的列头和行布局逻辑移除，改为 Graph 渲染逻辑

### Requirement: 独立 RepoTabs 栏
**Reason**: 仓库切换整合到 Toolbar 下拉菜单
**Migration**: RepoTabs.vue 组件移除，功能合并到 Toolbar
