## ADDED Requirements

### Requirement: Temporal Topological Sort
系统 SHALL 使用 pvigier 的 Temporal Topological Sort 确定提交行的顺序，保证所有父子关系边始终向上绘制。

#### Scenario: Basic linear history
- **GIVEN** 一个线性历史的仓库（A → B → C，A 最旧，C 最新）
- **WHEN** computeGraphLayout 执行
- **THEN** 输出 rowIndex 为 A=2, B=1, C=0（0=顶部/最新）

#### Scenario: Rebased history
- **GIVEN** 经过 rebase 的仓库，committer_time 顺序与 author_time 顺序不一致
- **WHEN** computeGraphLayout 执行
- **THEN** 父子关系的边始终向上绘制（parent.rowIndex > child.rowIndex）

#### Scenario: Multiple roots (orphan commits)
- **GIVEN** 仓库有多个无父提交的孤立提交
- **WHEN** computeGraphLayout 执行
- **THEN** 所有孤立提交按 committer_time 降序排列

#### Scenario: Self-loop protection
- **GIVEN** 提交的 parent_ids 中包含自身（环形引用，虽不应发生）
- **WHEN** computeGraphLayout 执行
- **THEN** 不陷入无限循环，DFS visited 检查跳过已访问节点

### Requirement: Straight Branches column assignment
系统 SHALL 使用 Straight Branches 算法分配提交所属列，确保同分支提交同列、分叉提交新列。

#### Scenario: Branch continues same column
- **GIVEN** 线性分支链（A → B → C，B.parents[0]==A, C.parents[0]==B）
- **WHEN** 列分配执行
- **THEN** A, B, C 在同一列

#### Scenario: New branch gets new column
- **GIVEN** 从 master 分叉出 feature 分支
- **WHEN** 列分配执行
- **THEN** master 和 feature 在不同列，分叉提交在新列

#### Scenario: Merge commit keeps main branch column
- **GIVEN** merge 提交 M，parents[0]=mainline, parents[1]=feature
- **WHEN** 列分配执行
- **THEN** M 与 mainline 同列（继承 parents[0] 的列）

#### Scenario: Merged branch terminates
- **GIVEN** feature 分支被 merge 进 master
- **WHEN** 列分配执行
- **THEN** merge 后 feature 分支从 active branches 中移除

### Requirement: Fixed 8-color palette
系统 SHALL 使用固定 8 色调色板替代 HSL 随机生成。

#### Scenario: Color by column index
- **GIVEN** 某提交被分配到列 n
- **WHEN** getColor(n) 执行
- **THEN** 返回 PALETTE[n % 8]，与列编号一一对应

#### Scenario: Color recycling
- **GIVEN** 列 8 个已用完，新分支分配到列 8
- **WHEN** getColor(8) 执行
- **THEN** 返回 PALETTE[0]（复用第 0 色）

#### Scenario: Same branch, same color
- **GIVEN** 同一分支的所有提交位于同一列
- **WHEN** 查询任意两个提交的颜色
- **THEN** 颜色相同

### Requirement: committer_time data field
Rust 后端 SHALL 新增 committer_time 字段，前端 TypeScript 类型 SHALL 同步。

#### Scenario: Backend returns committer_time
- **GIVEN** commit_service::log 被调用
- **WHEN** 返回 Commit 列表
- **THEN** 每条 Commit 包含 committer_time 字段

#### Scenario: Frontend receives committer_time
- **GIVEN** 前端通过 IPC 接收 Commit 数据
- **WHEN** 访问 commit.committer_time
- **THEN** 值为 committer date 的 Unix 时间戳（秒）

#### Scenario: Existing time field unchanged
- **GIVEN** 前端访问 commit.time
- **WHEN** 格式化显示
- **THEN** 值仍为 author date，不受改动影响

### Requirement: Segment generation for multi-parent commits
合并提交 SHALL 为每个父提交生成一条入线。

#### Scenario: Two-parent merge
- **GIVEN** 合并提交 M，父提交 P1（同列）和 P2（不同列）
- **WHEN** 线段生成执行
- **THEN** 从 P1 到 M 画垂直连线（同列）或直角连线（不同列），从 P2 到 M 画直角连线