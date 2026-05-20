# 1.0 Preview 版本测试策略

## 目标

为 1.0 Preview 发布补充测试覆盖，确保核心功能（日常工作流 + Git 操作）稳定可靠。

## 测试范围

### 1. Store 测试

| Store | 测试用例 |
|-------|---------|
| staging | 暂存/取消暂存、文件状态、commit 准备状态 |
| branches | 分支列表、当前分支、创建/删除/切换分支 |
| commits | 提交历史、加载状态、分页、过滤器 |
| app | 全局状态、主题、语言设置 |
| tags | 标签列表、创建/删除标签 |

### 2. Composables 测试

| Composable | 测试用例 |
|------------|---------|
| useGit | IPC 调用 mock、错误处理 |
| useTheme | 主题切换、localStorage 持久化 |
| useKeyboard | 快捷键绑定、触发回调 |
| useToast | 通知显示/隐藏/队列管理 |

### 3. 组件测试

| 组件 | 测试用例 |
|------|---------|
| StageArea | 文件勾选、暂存操作 |
| CommitEditor | 消息输入、提交按钮状态 |
| ChangedFilesList | 文件列表渲染、diff 跳转 |

## 测试文件结构

```
src/
├── stores/__tests__/
│   ├── staging.test.ts      # 新增
│   ├── branches.test.ts     # 新增
│   ├── commits.test.ts      # 补充
│   ├── app.test.ts          # 新增
│   └── tags.test.ts         # 新增
├── composables/__tests__/
│   ├── useGit.test.ts       # 新增
│   ├── useTheme.test.ts     # 补充
│   ├── useKeyboard.test.ts  # 补充
│   └── useToast.test.ts     # 新增
└── components/commit/
    ├── StageArea.test.ts    # 补充
    ├── CommitEditor.test.ts # 补充
    └── ChangedFilesList.test.ts # 补充
```

## Mock 策略

- IPC 调用 → 使用 `vi.mock()` mock `@tauri-apps/api`
- localStorage → 使用 happy-dom 模拟
- Pinia stores → 使用 `createPinia()` + `setActivePinia()`

## 技术栈

- 框架: Vitest
- 环境: happy-dom
- 测试库: @vue/test-utils
