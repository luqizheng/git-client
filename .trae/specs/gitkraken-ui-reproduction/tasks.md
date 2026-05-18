# Tasks

- [x] Task 1: 更新配色方案为 GitKraken Dark/Light 主题
  - [x] SubTask 1.1: 更新 variables.css 中 CSS 变量值为 GitKraken 配色
  - [x] SubTask 1.2: 更新 dark.css 为 GitKraken Dark 色值
  - [x] SubTask 1.3: 更新 light.css 为 GitKraken Light 色值
  - [x] SubTask 1.4: 定义 GitKraken 分支颜色调色板 CSS 变量

- [x] Task 2: 重写 Toolbar 为 GitKraken 风格图标按钮
  - [x] SubTask 2.1: 移除文字按钮，改为图标按钮（Undo、Redo、Pull、Push、Branch、Stash、Pop Stash）
  - [x] SubTask 2.2: 实现 Pull 按钮下拉菜单（Fetch All、Pull ff、Pull ff-only、Pull rebase）
  - [x] SubTask 2.3: 添加仓库切换下拉菜单（替换 RepoTabs）
  - [x] SubTask 2.4: 实现 Undo/Redo 按钮状态（灰显/亮起）
  - [x] SubTask 2.5: 右侧放置主题切换和设置图标按钮

- [x] Task 3: 重写左侧 Reference Panel
  - [x] SubTask 3.1: 创建 RefPanelSection 通用可折叠分区组件
  - [x] SubTask 3.2: 重写 Local 分区（本地分支列表，当前分支绿色圆点标记）
  - [x] SubTask 3.3: 重写 Remote 分区（按远程名分组，可折叠）
  - [x] SubTask 3.4: 添加 Tags 分区
  - [x] SubTask 3.5: 添加 Stashes 分区（显示 stash 条目）
  - [x] SubTask 3.6: 添加 Submodules 分区
  - [x] SubTask 3.7: 每个分区支持右键上下文菜单

- [x] Task 4: 重写中心区域为可视化 Commit Graph
  - [x] SubTask 4.1: 重写 graphRenderer.ts 实现贝塞尔曲线分支线渲染
  - [x] SubTask 4.2: 实现 WIP 节点（工作区变更时显示在 Graph 顶部）
  - [x] SubTask 4.3: 实现 commit 行布局（分支/标签名、message、作者、时间）
  - [x] SubTask 4.4: 实现 commit 节点点击选中高亮
  - [x] SubTask 4.5: 实现虚拟滚动优化
  - [x] SubTask 4.6: 实现 commit 右键上下文菜单
  - [x] SubTask 4.7: 替换 commit-list.vue 为新的 Graph 组件

- [x] Task 5: 重写右侧 Commit Panel 为 GitKraken 风格
  - [x] SubTask 5.1: 重写 Staging 视图（Unstaged → Staged → Commit Message 垂直布局）
  - [x] SubTask 5.2: 重写 UnstagedFilesSection：文件状态图标（M/A/D/R）+ Stage All 按钮
  - [x] SubTask 5.3: 重写 StagedFilesSection：文件状态图标 + Unstage 操作
  - [x] SubTask 5.4: 重写 CommitEditorSection：Summary + Description + Commit 按钮
  - [x] SubTask 5.5: 重写 Commit Detail 视图（分支标签、message、作者、文件列表）
  - [x] SubTask 5.6: 点击文件显示 diff（复用 CommitFileDiffView）

- [x] Task 6: 重写 Status Bar
  - [x] SubTask 6.1: 左侧显示当前分支、SHA、ahead/behind
  - [x] SubTask 6.2: 右侧添加缩放选择器（100%-200%）
  - [x] SubTask 6.3: 中间同步状态动画

- [x] Task 7: 重写 AppLayout 整合新组件
  - [x] SubTask 7.1: 移除 RepoTabs 独立组件引用
  - [x] SubTask 7.2: 调整三栏布局比例（左 ~15%、中 ~45%、右 ~40%）
  - [x] SubTask 7.3: 面板分隔线拖拽调整大小
  - [x] SubTask 7.4: 左面板折叠/展开

- [x] Task 8: 验证与收尾
  - [x] SubTask 8.1: vue-tsc 类型检查通过
  - [x] SubTask 8.2: cargo clippy 检查通过
  - [x] SubTask 8.3: 功能回归测试

# Task Dependencies
- Task 1 无依赖，优先执行
- Task 2 依赖 Task 1（配色）
- Task 3 依赖 Task 1（配色）
- Task 4 依赖 Task 1（配色、分支颜色）
- Task 5 依赖 Task 1（配色）和 Task 4（WIP 节点交互）
- Task 6 依赖 Task 1（配色）
- Task 7 依赖 Task 2、3、4、5、6（所有新组件就绪）
- Task 8 依赖 Task 7
- Task 2、3、4、5、6 可在 Task 1 完成后并行执行
