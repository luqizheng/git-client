# Commit 详情面板视觉升级 Spec

## Why
当前 commit 详情面板 UI 简陋，需要升级为 GitKraken 风格的精美界面，提升用户体验。

## What Changes
- 重写 `CommitDetails.vue` 采用 GitKraken 风格布局
- 重写 `ChangedFilesList.vue` 适配新视觉风格
- 移除冗余的 `CommitDetailPanel.vue` 和 `CommitHeader.vue`（功能合并）

## Impact
- Affected specs: commit-detail
- Affected code:
  - `git-client/src/components/commit/CommitDetails.vue`
  - `git-client/src/components/commit/ChangedFilesList.vue`
  - `git-client/src/components/commit/CommitDetailPanel.vue`
  - `git-client/src/components/commit/CommitHeader.vue`

## ADDED Requirements

### Requirement: Commit 详情卡片布局
面板采用卡片式布局，显示完整的 commit 信息

#### Scenario: 显示 commit 详情
- **WHEN** 用户点击 commit graph 中的一个 commit
- **THEN** 右侧面板显示：分支标签、标题、作者信息、详细描述（可选）、文件变更列表

### Requirement: 分支标签展示
显示该 commit 关联的所有分支/标签

#### Scenario: 多个分支
- **WHEN** commit 被多个分支引用
- **THEN** 显示所有标签，main 分支使用绿色 #238636，其他使用蓝色 #1f6feb

### Requirement: 作者信息展示
显示作者头像（initials）、名称、邮箱、时间

#### Scenario: 显示作者
- **WHEN** commit 详情加载完成
- **THEN** 显示作者姓名首字母组成的圆形头像、完整邮箱、相对时间

### Requirement: 文件变更列表
显示该 commit 修改的所有文件，带状态图标和颜色

#### Scenario: 显示文件列表
- **WHEN** commit 包含多个文件变更
- **THEN** 按 A(添加)/M(修改)/D(删除)/R(重命名) 分类显示，每行高 32px，hover 有高亮效果

### Requirement: SHA 复制功能
点击 SHA 可复制完整 commit hash

#### Scenario: 复制 SHA
- **WHEN** 用户点击 SHA
- **THEN** 复制完整 40 位 hash，显示 toast 提示 "Copied: xxxxxxx"
