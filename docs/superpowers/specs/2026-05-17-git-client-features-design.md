# Git 客户端功能扩展设计文档

## 1. 概述

本设计文档描述了对标 GitKraken/Sourcetree 的 Git 桌面客户端需要新增的 13 个功能模块。

## 2. 功能清单与优先级

| 优先级 | 功能模块 | 描述 |
|--------|----------|------|
| P0 | 标签管理 | 创建、删除、列出标签，支持带注释标签 |
| P0 | Cherry-pick | 将指定提交应用到当前分支 |
| P1 | Rebase | 交互式变基，线性化提交历史 |
| P1 | Revert | 撤销指定提交的更改 |
| P1 | 高级远程操作 | 删除、重命名远程，强制推送 |
| P2 | 子模块管理 | 子模块的添加、更新、列表 |
| P2 | Git Flow | Feature/Release/Hotfix 工作流 |
| P2 | Worktree | 多工作区管理 |
| P2 | 高级搜索 | 按作者、日期、文件筛选提交 |
| P3 | 协作功能 | 分支比较 |
| P3 | 可视化增强 | 提交图缩放、分支颜色 |
| P3 | 配置管理 | 用户签名、Git 设置 |
| P3 | Hook 管理 | Git Hooks 编辑与测试 |

---

## 3. 详细设计

### 3.1 标签管理（Tag）

**后端：**
- **命令文件**: `src-tauri/src/commands/tag.rs`
- **服务文件**: `src-tauri/src/services/tag_service.rs`
- **模型文件**: `src-tauri/src/models/tag.rs`

**API 设计:**
| 命令 | 参数 | 返回值 |
|------|------|--------|
| `create_tag` | `repo_path`, `name`, `target`, `message`(可选) | `Tag` |
| `delete_tag` | `repo_path`, `name`, `force` | `()` |
| `list_tags` | `repo_path` | `Vec<Tag>` |

**模型结构:**
```rust
struct Tag {
    name: String,
    target: String,  // commit hash
    message: Option<String>,
    tagger: Option<String>,
    date: Option<chrono::DateTime<chrono::Utc>>,
}
```

**前端：**
- **组件**: `src/components/tag/TagList.vue`, `src/components/tag/TagDialog.vue`
- **Store**: `src/stores/tags.ts`

---

### 3.2 Cherry-pick

**后端：**
- **扩展文件**: `src-tauri/src/commands/commit.rs`
- **服务扩展**: `src-tauri/src/services/commit_service.rs`

**API 设计:**
| 命令 | 参数 | 返回值 |
|------|------|--------|
| `cherry_pick` | `repo_path`, `commit_id`, `allow_conflicts` | `Result<Commit, CherryPickError>` |

**前端：**
- 提交列表右键菜单添加 cherry-pick 选项
- 复用现有冲突解决组件

---

### 3.3 Rebase

**后端：**
- **扩展文件**: `src-tauri/src/commands/branch.rs`
- **服务扩展**: `src-tauri/src/services/branch_service.rs`

**API 设计:**
| 命令 | 参数 | 返回值 |
|------|------|--------|
| `rebase_branch` | `repo_path`, `upstream`, `branch`(可选) | `Result<(), RebaseError>` |

**前端：**
- 分支上下文菜单添加 rebase 选项
- Rebase 进度展示

---

### 3.4 Revert

**后端：**
- **扩展文件**: `src-tauri/src/commands/commit.rs`
- **服务扩展**: `src-tauri/src/services/commit_service.rs`

**API 设计:**
| 命令 | 参数 | 返回值 |
|------|------|--------|
| `revert_commit` | `repo_path`, `commit_id` | `Result<Commit, RevertError>` |

**前端：**
- 提交列表右键菜单添加 revert 选项

---

### 3.5 高级远程操作

**后端：**
- **扩展文件**: `src-tauri/src/commands/remote.rs`

**API 设计:**
| 命令 | 参数 | 返回值 |
|------|------|--------|
| `remove_remote` | `repo_path`, `name` | `()` |
| `rename_remote` | `repo_path`, `old_name`, `new_name` | `()` |
| `push_force` | `repo_path`, `remote`, `branch` | `PushResult` |

---

### 3.6 子模块管理（Submodule）

**后端：**
- **命令文件**: `src-tauri/src/commands/submodule.rs`
- **服务文件**: `src-tauri/src/services/submodule_service.rs`
- **模型文件**: `src-tauri/src/models/submodule.rs`

**API 设计:**
| 命令 | 参数 | 返回值 |
|------|------|--------|
| `list_submodules` | `repo_path` | `Vec<Submodule>` |
| `add_submodule` | `repo_path`, `url`, `path` | `Submodule` |
| `update_submodule` | `repo_path`, `name`, `recursive` | `()` |

**前端：**
- **组件**: `src/components/submodule/SubmoduleList.vue`, `src/components/submodule/SubmoduleDialog.vue`

---

### 3.7 Git Flow

**后端：**
- **命令文件**: `src-tauri/src/commands/git_flow.rs`
- **服务文件**: `src-tauri/src/services/git_flow_service.rs`

**API 设计:**
| 命令 | 参数 | 返回值 |
|------|------|--------|
| `init_flow` | `repo_path`, `prefixes`(可选) | `()` |
| `start_feature` | `repo_path`, `name` | `Branch` |
| `finish_feature` | `repo_path`, `name` | `()` |
| `start_release` | `repo_path`, `version` | `Branch` |
| `finish_release` | `repo_path`, `version` | `()` |
| `start_hotfix` | `repo_path`, `version` | `Branch` |
| `finish_hotfix` | `repo_path`, `version` | `()` |

**前端：**
- **组件**: `src/components/gitflow/GitFlowPanel.vue`

---

### 3.8 Worktree 管理

**后端：**
- **命令文件**: `src-tauri/src/commands/worktree.rs`
- **服务文件**: `src-tauri/src/services/worktree_service.rs`
- **模型文件**: `src-tauri/src/models/worktree.rs`

**API 设计:**
| 命令 | 参数 | 返回值 |
|------|------|--------|
| `list_worktrees` | `repo_path` | `Vec<Worktree>` |
| `create_worktree` | `repo_path`, `branch`, `path` | `Worktree` |
| `delete_worktree` | `repo_path`, `path`, `force` | `()` |

**前端：**
- **组件**: `src/components/worktree/WorktreeList.vue`, `src/components/worktree/WorktreeDialog.vue`

---

### 3.9 高级搜索

**后端：**
- **扩展文件**: `src-tauri/src/commands/commit.rs`

**API 设计:**
| 命令 | 参数 | 返回值 |
|------|------|--------|
| `search_commits` | `repo_path`, `query`, `filter`, `limit` | `Vec<Commit>` |

**Filter 结构:**
```rust
struct SearchFilter {
    author: Option<String>,
    since: Option<chrono::DateTime<chrono::Utc>>,
    until: Option<chrono::DateTime<chrono::Utc>>,
    path: Option<String>,
}
```

**前端：**
- 扩展 `useFilter.ts` 支持更多筛选条件

---

### 3.10 协作功能

**后端：**
- **扩展文件**: `src-tauri/src/commands/branch.rs`

**API 设计:**
| 命令 | 参数 | 返回值 |
|------|------|--------|
| `compare_branches` | `repo_path`, `base`, `compare` | `BranchCompareResult` |

**前端：**
- **组件**: `src/components/branch/BranchCompare.vue`

---

### 3.11 可视化增强

**前端：**
- **组件**: `src/components/graph/CommitGraph.vue`
- 支持缩放、拖拽、分支颜色区分

---

### 3.12 配置管理

**后端：**
- **扩展文件**: `src-tauri/src/commands/settings.rs`

**API 设计:**
| 命令 | 参数 | 返回值 |
|------|------|--------|
| `get_git_config` | `repo_path`(可选) | `GitConfig` |
| `set_git_config` | `repo_path`(可选), `config` | `()` |

**前端：**
- **组件**: `src/components/settings/SettingsPanel.vue`

---

### 3.13 Hook 管理

**后端：**
- **命令文件**: `src-tauri/src/commands/hook.rs`
- **服务文件**: `src-tauri/src/services/hook_service.rs`

**API 设计:**
| 命令 | 参数 | 返回值 |
|------|------|--------|
| `list_hooks` | `repo_path` | `Vec<HookInfo>` |
| `get_hook_content` | `repo_path`, `hook_name` | `String` |
| `set_hook_content` | `repo_path`, `hook_name`, `content` | `()` |
| `test_hook` | `repo_path`, `hook_name` | `HookTestResult` |

**前端：**
- **组件**: `src/components/hook/HookManager.vue`

---

## 4. 架构设计

### 4.1 后端架构

```
commands/           # IPC 入口
  ├── tag.rs
  ├── submodule.rs
  ├── git_flow.rs
  ├── worktree.rs
  ├── hook.rs
  └── (扩展) commit.rs, branch.rs, remote.rs

services/           # 业务逻辑
  ├── tag_service.rs
  ├── submodule_service.rs
  ├── git_flow_service.rs
  ├── worktree_service.rs
  ├── hook_service.rs
  └── (扩展) commit_service.rs, branch_service.rs, remote_service.rs

models/             # 数据模型
  ├── tag.rs
  ├── submodule.rs
  ├── worktree.rs
  └── hook.rs
```

### 4.2 前端架构

```
components/
  ├── tag/
  ├── submodule/
  ├── gitflow/
  ├── worktree/
  ├── hook/
  ├── branch/ (扩展)
  ├── commit/ (扩展)
  └── settings/

stores/
  ├── tags.ts
  └── (扩展) commits.ts, branches.ts, remote.ts

utils/
  └── ipc.ts (扩展)
```

---

## 5. 状态管理

| 模块 | Store | 状态 |
|------|-------|------|
| 标签 | `tags.ts` | `tags: Tag[]` |
| 子模块 | `submodule.ts` | `submodules: Submodule[]` |
| Worktree | `worktree.ts` | `worktrees: Worktree[]` |
| 搜索 | `commits.ts` | `searchFilter: SearchFilter` |

---

## 6. 错误处理

统一使用 `AppError` 枚举处理错误，前端通过 IPC 获取结构化错误信息。

---

## 7. 安全性

- 所有文件操作路径必须经过验证
- 敏感配置（如 SSH 密钥）使用系统密钥链存储
- 命令执行前进行权限检查

---

## 8. 测试策略

| 层级 | 测试方式 |
|------|----------|
| 后端单元 | `cargo test` |
| 前端单元 | `vitest` |
| 集成测试 | Tauri E2E |

---

## 9. 国际化

所有用户可见文本添加中英文支持，使用 `vue-i18n`。

---

## 10. 主题兼容

所有新组件必须同时支持 dark/light 主题，使用 CSS 变量。