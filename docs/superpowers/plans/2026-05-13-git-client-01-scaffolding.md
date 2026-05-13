# Git客户端 实施计划 — 01: 项目脚手架

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 初始化Tauri 2.x + Vue3 + TypeScript项目，安装所有依赖，建立目录结构

**Architecture:** Tauri 2.x桌面框架，Vue3前端，Rust后端。前端使用Naive UI + UnoCSS + Pinia + vue-i18n + Monaco Editor。后端使用git2 + tokio + notify + keyring + thiserror + tracing。

**Tech Stack:** Tauri 2.x, Vue3, TypeScript, Naive UI, UnoCSS, Pinia, vue-i18n, Monaco Editor, Rust, git2, tokio, notify, keyring, thiserror, tracing, serde

---

### Task 1: 创建Tauri + Vue3项目

**Files:**
- Create: `package.json`
- Create: `src/main.ts`
- Create: `src/App.vue`
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/src/main.rs`
- Create: `src-tauri/src/lib.rs`
- Create: `src-tauri/tauri.conf.json`

- [ ] **Step 1: 用Tauri CLI创建项目**

Run:
```powershell
cd d:\projects\req2task-2
npm create tauri-app@latest git-client -- --template vue-ts
```

如果交互式命令不支持，手动初始化：
```powershell
cd d:\projects\req2task-2
mkdir git-client
cd git-client
npm init -y
npm install vue@latest
npm install -D vite @vitejs/plugin-vue typescript vue-tsc
npm install @tauri-apps/api@^2
npm install -D @tauri-apps/cli@^2
```

- [ ] **Step 2: 初始化Tauri后端**

Run:
```powershell
cd d:\projects\req2task-2\git-client
npx tauri init
```

如果交互式不可用，手动创建 `src-tauri/` 目录和文件。

- [ ] **Step 3: 验证项目启动**

Run:
```powershell
cd d:\projects\req2task-2\git-client
npx tauri dev
```

Expected: 窗口弹出显示默认Vue页面，无编译错误

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: initialize Tauri + Vue3 + TypeScript project"
```

---

### Task 2: 安装前端依赖

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 安装核心前端依赖**

Run:
```powershell
cd d:\projects\req2task-2\git-client
npm install naive-ui pinia vue-i18n @vueuse/core
npm install -D unocss @unocss/preset-uno @unocss/preset-attributify @unocss/reset
npm install -D vite-plugin-monaco-editor
```

- [ ] **Step 2: 安装开发依赖**

Run:
```powershell
cd d:\projects\req2task-2\git-client
npm install -D vitest @vue/test-utils happy-dom
npm install -D @types/node
```

- [ ] **Step 3: 验证依赖安装成功**

Run:
```powershell
cd d:\projects\req2task-2\git-client
npm ls naive-ui pinia vue-i18n
```

Expected: 无报错，依赖版本正常显示

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install frontend dependencies (naive-ui, pinia, vue-i18n, unocss, monaco, vitest)"
```

---

### Task 3: 安装Rust依赖

**Files:**
- Modify: `src-tauri/Cargo.toml`

- [ ] **Step 1: 添加Rust依赖到Cargo.toml**

编辑 `src-tauri/Cargo.toml`，在 `[dependencies]` 下添加：

```toml
[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-shell = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
git2 = "0.19"
tokio = { version = "1", features = ["full"] }
notify = "7"
keyring = "3"
thiserror = "2"
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter", "json"] }
tracing-appender = "0.2"

[build-dependencies]
tauri-build = { version = "2", features = [] }
```

- [ ] **Step 2: 验证Rust编译**

Run:
```powershell
cd d:\projects\req2task-2\git-client\src-tauri
cargo check
```

Expected: 编译成功，无错误（可能有warning）

- [ ] **Step 3: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/Cargo.lock
git commit -m "chore: add Rust dependencies (git2, tokio, notify, keyring, thiserror, tracing)"
```

---

### Task 4: 配置Vite + UnoCSS + Monaco

**Files:**
- Create: `vite.config.ts`
- Create: `uno.config.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: 创建vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import monacoEditorPlugin from 'vite-plugin-monaco-editor'

export default defineConfig({
  plugins: [
    vue(),
    UnoCSS(),
    monacoEditorPlugin({
      languageWorkers: ['editorWorkerService', 'diff'],
    }),
  ],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ['VITE_', 'TAURI_'],
})
```

- [ ] **Step 2: 创建uno.config.ts**

```typescript
import { defineConfig, presetUno, presetAttributify } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify(),
  ],
})
```

- [ ] **Step 3: 修改src/main.ts引入UnoCSS**

```typescript
import { createApp } from 'vue'
import App from './App.vue'
import { createPinia } from 'pinia'
import 'virtual:uno.css'
import '@unocss/reset/tailwind.css'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
```

- [ ] **Step 4: 验证构建**

Run:
```powershell
cd d:\projects\req2task-2\git-client
npx vite build
```

Expected: 构建成功

- [ ] **Step 5: Commit**

```bash
git add vite.config.ts uno.config.ts src/main.ts
git commit -m "chore: configure Vite + UnoCSS + Monaco Editor"
```

---

### Task 5: 建立前端目录结构

**Files:**
- Create: `src/components/layout/AppLayout.vue`
- Create: `src/components/layout/Sidebar.vue`
- Create: `src/components/layout/Toolbar.vue`
- Create: `src/components/layout/StatusBar.vue`
- Create: `src/components/repo/RepoPanel.vue`
- Create: `src/components/repo/RepoList.vue`
- Create: `src/components/repo/CloneDialog.vue`
- Create: `src/components/graph/GraphView.vue`
- Create: `src/components/graph/CommitCanvas.vue`
- Create: `src/components/graph/CommitDetail.vue`
- Create: `src/components/diff/DiffView.vue`
- Create: `src/components/diff/FileTree.vue`
- Create: `src/components/diff/MonacoDiff.vue`
- Create: `src/components/commit/CommitPanel.vue`
- Create: `src/components/commit/CommitEditor.vue`
- Create: `src/components/commit/StageArea.vue`
- Create: `src/components/branch/BranchTree.vue`
- Create: `src/components/branch/BranchDialog.vue`
- Create: `src/components/remote/RemotePanel.vue`
- Create: `src/components/remote/SshConfig.vue`
- Create: `src/components/conflict/ConflictResolver.vue`
- Create: `src/components/conflict/ThreeWayDiff.vue`
- Create: `src/stores/app.ts`
- Create: `src/types/git.d.ts`
- Create: `src/types/ipc.d.ts`
- Create: `src/utils/ipc.ts`
- Create: `src/utils/event.ts`

- [ ] **Step 1: 创建所有目录**

Run:
```powershell
cd d:\projects\req2task-2\git-client
$dirs = @(
  "src/components/layout",
  "src/components/repo",
  "src/components/graph",
  "src/components/diff",
  "src/components/commit",
  "src/components/branch",
  "src/components/remote",
  "src/components/conflict",
  "src/stores",
  "src/composables",
  "src/i18n/locales",
  "src/types",
  "src/utils",
  "src/assets/styles/themes",
  "src/assets/icons"
)
foreach ($d in $dirs) { New-Item -ItemType Directory -Force -Path $d | Out-Null }
```

- [ ] **Step 2: 创建占位Vue组件**

每个组件写入最小模板，以 `src/components/layout/AppLayout.vue` 为例：

```vue
<template>
  <div class="app-layout">
    <slot />
  </div>
</template>

<script setup lang="ts">
</script>
```

其余组件同样写入此模板（组件名对应替换）。

Run:
```powershell
cd d:\projects\req2task-2\git-client
$components = @(
  "src/components/layout/AppLayout",
  "src/components/layout/Sidebar",
  "src/components/layout/Toolbar",
  "src/components/layout/StatusBar",
  "src/components/repo/RepoPanel",
  "src/components/repo/RepoList",
  "src/components/repo/CloneDialog",
  "src/components/graph/GraphView",
  "src/components/graph/CommitCanvas",
  "src/components/graph/CommitDetail",
  "src/components/diff/DiffView",
  "src/components/diff/FileTree",
  "src/components/diff/MonacoDiff",
  "src/components/commit/CommitPanel",
  "src/components/commit/CommitEditor",
  "src/components/commit/StageArea",
  "src/components/branch/BranchTree",
  "src/components/branch/BranchDialog",
  "src/components/remote/RemotePanel",
  "src/components/remote/SshConfig",
  "src/components/conflict/ConflictResolver",
  "src/components/conflict/ThreeWayDiff"
)
foreach ($c in $components) {
  $name = Split-Path $c -Leaf
  $content = "<template>`n  <div class=""$name"" />`n</template>`n`n<script setup lang=""ts"">`n</script>"
  Set-Content -Path "$c.vue" -Value $content -Encoding UTF8
}
```

- [ ] **Step 3: 创建占位TypeScript文件**

`src/stores/app.ts`:
```typescript
import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', {
  state: () => ({
    theme: 'dark' as 'dark' | 'light',
    locale: 'zh' as 'zh' | 'en',
  }),
})
```

`src/types/git.d.ts`:
```typescript
export interface Commit {
  id: string
  message: string
  author: string
  author_email: string
  time: number
  parent_ids: string[]
}
```

`src/types/ipc.d.ts`:
```typescript
export interface RepoState {
  path: string
  head_branch: string | null
  head_commit_id: string | null
  is_bare: boolean
  is_empty: boolean
}
```

`src/utils/ipc.ts`:
```typescript
const isMock = import.meta.env.VITE_MOCK === 'true'

export async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (isMock) return {} as T
  return window.__TAURI_INTERNALS__.invoke(cmd, args)
}
```

`src/utils/event.ts`:
```typescript
import { listen } from '@tauri-apps/api/event'

export async function onEvent(event: string, handler: (payload: unknown) => void) {
  return listen(event, (e) => handler(e.payload))
}
```

- [ ] **Step 4: 验证编译**

Run:
```powershell
cd d:\projects\req2task-2\git-client
npx vue-tsc --noEmit
```

Expected: 无类型错误

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold frontend directory structure with placeholder files"
```

---

### Task 6: 建立Rust后端目录结构

**Files:**
- Create: `src-tauri/src/commands/mod.rs`
- Create: `src-tauri/src/commands/repo.rs`
- Create: `src-tauri/src/commands/commit.rs`
- Create: `src-tauri/src/commands/branch.rs`
- Create: `src-tauri/src/commands/remote.rs`
- Create: `src-tauri/src/commands/diff.rs`
- Create: `src-tauri/src/commands/stash.rs`
- Create: `src-tauri/src/services/mod.rs`
- Create: `src-tauri/src/services/repo_service.rs`
- Create: `src-tauri/src/services/commit_service.rs`
- Create: `src-tauri/src/services/branch_service.rs`
- Create: `src-tauri/src/services/remote_service.rs`
- Create: `src-tauri/src/services/diff_service.rs`
- Create: `src-tauri/src/services/merge_service.rs`
- Create: `src-tauri/src/services/stash_service.rs`
- Create: `src-tauri/src/models/mod.rs`
- Create: `src-tauri/src/models/commit.rs`
- Create: `src-tauri/src/models/branch.rs`
- Create: `src-tauri/src/models/diff.rs`
- Create: `src-tauri/src/models/remote.rs`
- Create: `src-tauri/src/models/repo.rs`
- Create: `src-tauri/src/models/stash.rs`
- Create: `src-tauri/src/utils/mod.rs`
- Create: `src-tauri/src/utils/credential.rs`
- Create: `src-tauri/src/utils/error.rs`
- Create: `src-tauri/src/utils/retry.rs`

- [ ] **Step 1: 创建Rust目录**

Run:
```powershell
cd d:\projects\req2task-2\git-client\src-tauri\src
$dirs = @("commands", "services", "models", "utils")
foreach ($d in $dirs) { New-Item -ItemType Directory -Force -Path $d | Out-Null }
```

- [ ] **Step 2: 创建mod.rs文件**

`src-tauri/src/commands/mod.rs`:
```rust
pub mod repo;
pub mod commit;
pub mod branch;
pub mod remote;
pub mod diff;
pub mod stash;
```

`src-tauri/src/services/mod.rs`:
```rust
pub mod repo_service;
pub mod commit_service;
pub mod branch_service;
pub mod remote_service;
pub mod diff_service;
pub mod merge_service;
pub mod stash_service;
```

`src-tauri/src/models/mod.rs`:
```rust
pub mod commit;
pub mod branch;
pub mod diff;
pub mod remote;
pub mod repo;
pub mod stash;
```

`src-tauri/src/utils/mod.rs`:
```rust
pub mod credential;
pub mod error;
pub mod retry;
```

- [ ] **Step 3: 创建占位模块文件**

每个模块文件写入最小内容，如 `src-tauri/src/commands/repo.rs`:
```rust
// repo commands - to be implemented
```

对以下文件同样写入：
- `src-tauri/src/commands/commit.rs`
- `src-tauri/src/commands/branch.rs`
- `src-tauri/src/commands/remote.rs`
- `src-tauri/src/commands/diff.rs`
- `src-tauri/src/commands/stash.rs`
- `src-tauri/src/services/repo_service.rs`
- `src-tauri/src/services/commit_service.rs`
- `src-tauri/src/services/branch_service.rs`
- `src-tauri/src/services/remote_service.rs`
- `src-tauri/src/services/diff_service.rs`
- `src-tauri/src/services/merge_service.rs`
- `src-tauri/src/services/stash_service.rs`
- `src-tauri/src/models/commit.rs`
- `src-tauri/src/models/branch.rs`
- `src-tauri/src/models/diff.rs`
- `src-tauri/src/models/remote.rs`
- `src-tauri/src/models/repo.rs`
- `src-tauri/src/models/stash.rs`
- `src-tauri/src/utils/credential.rs`
- `src-tauri/src/utils/retry.rs`

`src-tauri/src/utils/error.rs`:
```rust
// error types - to be implemented
```

- [ ] **Step 4: 修改lib.rs注册模块**

`src-tauri/src/lib.rs`:
```rust
pub mod commands;
pub mod services;
pub mod models;
pub mod utils;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

`src-tauri/src/main.rs`:
```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    git_client_lib::run()
}
```

- [ ] **Step 5: 验证Rust编译**

Run:
```powershell
cd d:\projects\req2task-2\git-client\src-tauri
cargo check
```

Expected: 编译成功

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Rust backend directory structure with module stubs"
```
