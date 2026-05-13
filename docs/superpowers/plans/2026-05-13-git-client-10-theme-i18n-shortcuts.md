# Git客户端 实施计划 — 10: 主题/国际化/快捷键/配置持久化

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现深色/亮色主题系统、中英文国际化、键盘快捷键、用户配置持久化

**Architecture:** CSS变量控制主题色，Naive UI内置dark mode。vue-i18n管理多语言。useKeyboard composable注册全局快捷键。Rust侧通过Tauri app_data_dir存储JSON配置文件。

**Tech Stack:** Vue3, vue-i18n, Naive UI, UnoCSS, Rust, serde_json

---

### Task 1: 实现主题系统

**Files:**
- Create: `src/assets/styles/variables.css`
- Create: `src/assets/styles/themes/dark.css`
- Create: `src/assets/styles/themes/light.css`

- [ ] **Step 1: 写CSS变量**

`src/assets/styles/variables.css`:
```css
:root {
  --bg-primary: #1e1e2e;
  --bg-secondary: #181825;
  --bg-tertiary: #11111b;
  --border-color: #313244;
  --text-primary: #cdd6f4;
  --text-secondary: #a6adc8;
  --text-muted: #6c7086;
  --accent-blue: #4fc3f7;
  --accent-green: #81c784;
  --accent-red: #e57373;
  --accent-yellow: #fff176;
  --accent-purple: #ba68c8;
}
```

`src/assets/styles/themes/dark.css`:
```css
[data-theme="dark"] {
  --bg-primary: #1e1e2e;
  --bg-secondary: #181825;
  --border-color: #313244;
  --text-primary: #cdd6f4;
  --text-secondary: #a6adc8;
}
```

`src/assets/styles/themes/light.css`:
```css
[data-theme="light"] {
  --bg-primary: #eff1f5;
  --bg-secondary: #e6e9ef;
  --border-color: #bcc0cc;
  --text-primary: #4c4f69;
  --text-secondary: #5c5f77;
}
```

- [ ] **Step 2: 在main.ts中引入**

在 `src/main.ts` 添加：
```typescript
import './assets/styles/variables.css'
import './assets/styles/themes/dark.css'
import './assets/styles/themes/light.css'
```

- [ ] **Step 3: Commit**

```bash
git add src/assets/styles/
git commit -m "feat: add CSS variable theme system with dark/light themes"
```

---

### Task 2: 实现vue-i18n国际化

**Files:**
- Create: `src/i18n/index.ts`
- Create: `src/i18n/locales/en.json`
- Create: `src/i18n/locales/zh.json`
- Modify: `src/main.ts`

- [ ] **Step 1: 写locale文件**

`src/i18n/locales/zh.json`:
```json
{
  "app": {
    "title": "Git客户端"
  },
  "toolbar": {
    "open": "打开仓库",
    "clone": "克隆仓库",
    "fetch": "拉取",
    "pull": "拉取合并",
    "push": "推送"
  },
  "sidebar": {
    "branches": "分支",
    "remotes": "远程",
    "stash": "暂存",
    "tags": "标签"
  },
  "commit": {
    "message": "提交信息",
    "amend": "修改提交",
    "submit": "提交",
    "staged": "已暂存",
    "unstaged": "未暂存"
  },
  "branch": {
    "create": "创建分支",
    "switch": "切换分支",
    "delete": "删除分支",
    "name": "分支名称",
    "checkout": "创建后切换"
  },
  "remote": {
    "add": "添加远程",
    "name": "名称",
    "url": "URL"
  },
  "conflict": {
    "title": "冲突解决",
    "ours": "我们的",
    "theirs": "他们的",
    "base": "基础",
    "complete": "完成合并"
  },
  "status": {
    "syncing": "同步中...",
    "no_commits": "无提交"
  }
}
```

`src/i18n/locales/en.json`:
```json
{
  "app": {
    "title": "Git Client"
  },
  "toolbar": {
    "open": "Open Repo",
    "clone": "Clone Repo",
    "fetch": "Fetch",
    "pull": "Pull",
    "push": "Push"
  },
  "sidebar": {
    "branches": "Branches",
    "remotes": "Remotes",
    "stash": "Stash",
    "tags": "Tags"
  },
  "commit": {
    "message": "Commit Message",
    "amend": "Amend",
    "submit": "Commit",
    "staged": "Staged",
    "unstaged": "Unstaged"
  },
  "branch": {
    "create": "Create Branch",
    "switch": "Switch Branch",
    "delete": "Delete Branch",
    "name": "Branch Name",
    "checkout": "Checkout after creation"
  },
  "remote": {
    "add": "Add Remote",
    "name": "Name",
    "url": "URL"
  },
  "conflict": {
    "title": "Conflict Resolution",
    "ours": "Ours",
    "theirs": "Theirs",
    "base": "Base",
    "complete": "Complete Merge"
  },
  "status": {
    "syncing": "Syncing...",
    "no_commits": "No commits"
  }
}
```

- [ ] **Step 2: 写i18n配置**

`src/i18n/index.ts`:
```typescript
import { createI18n } from 'vue-i18n'
import zh from './locales/zh.json'
import en from './locales/en.json'

const i18n = createI18n({
  legacy: false,
  locale: 'zh',
  fallbackLocale: 'en',
  messages: { zh, en },
})

export default i18n
```

- [ ] **Step 3: 在main.ts中注册**

在 `src/main.ts` 添加：
```typescript
import i18n from './i18n'
```

在 `app.use(createPinia())` 后添加：
```typescript
app.use(i18n)
```

- [ ] **Step 4: 验证构建**

Run:
```powershell
cd d:\projects\req2task-2\git-client
npx vite build
```

Expected: 成功

- [ ] **Step 5: Commit**

```bash
git add src/i18n/ src/main.ts
git commit -m "feat: add vue-i18n with zh/en locales"
```

---

### Task 3: 实现键盘快捷键

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1: 在App.vue中注册全局快捷键**

在 `src/App.vue` 的 `<script setup>` 中添加：

```typescript
import { useKeyboard } from './composables/useKeyboard'
import { useRepoStore } from './stores/repo'
import { useBranchesStore } from './stores/branches'
import { useRemoteStore } from './stores/remote'
import { useCommitsStore } from './stores/commits'

const repo = useRepoStore()
const branches = useBranchesStore()
const remote = useRemoteStore()
const commits = useCommitsStore()

useKeyboard([
  { key: 's', ctrl: true, handler: () => { /* focus commit editor */ } },
  { key: 'l', ctrl: true, handler: () => {
    if (repo.repoPath && branches.currentBranch) {
      remote.pullRemote(repo.repoPath, 'origin', branches.currentBranch)
    }
  }},
  { key: 'p', ctrl: true, shift: true, handler: () => {
    if (repo.repoPath && branches.currentBranch) {
      remote.pushRemote(repo.repoPath, 'origin', branches.currentBranch)
    }
  }},
  { key: 'b', ctrl: true, handler: () => { /* show branch dialog */ } },
  { key: 'b', ctrl: true, shift: true, handler: () => { /* show branch switch */ } },
  { key: 'g', ctrl: true, handler: () => { /* focus commit search */ } },
  { key: 'F5', handler: () => {
    if (repo.repoPath) {
      commits.fetchLogs(repo.repoPath)
      branches.fetchBranches(repo.repoPath)
    }
  }},
])
```

- [ ] **Step 2: Commit**

```bash
git add src/App.vue
git commit -m "feat: register global keyboard shortcuts (Ctrl+S/L/P/B/G, F5)"
```

---

### Task 4: 实现Rust侧配置持久化

**Files:**
- Create: `src-tauri/src/commands/settings.rs`
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: 写settings命令**

`src-tauri/src/commands/settings.rs`:
```rust
use crate::utils::error::AppError;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub theme: String,
    pub locale: String,
    pub recent_repos: Vec<String>,
    pub sidebar_width: u32,
    pub sidebar_collapsed: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "dark".to_string(),
            locale: "zh".to_string(),
            recent_repos: Vec::new(),
            sidebar_width: 240,
            sidebar_collapsed: false,
        }
    }
}

fn settings_path(app: &AppHandle) -> Result<PathBuf, AppError> {
    let dir = app.path().app_data_dir()
        .map_err(|e| AppError::Credential(e.to_string()))?;
    fs::create_dir_all(&dir)?;
    Ok(dir.join("settings.json"))
}

#[tauri::command]
pub async fn load_settings(app: AppHandle) -> Result<AppSettings, AppError> {
    let path = settings_path(&app)?;
    if !path.exists() {
        return Ok(AppSettings::default());
    }
    let data = fs::read_to_string(&path)?;
    let settings: AppSettings = serde_json::from_str(&data)?;
    Ok(settings)
}

#[tauri::command]
pub async fn save_settings(app: AppHandle, settings: AppSettings) -> Result<(), AppError> {
    let path = settings_path(&app)?;
    let data = serde_json::to_string_pretty(&settings)?;
    fs::write(&path, data)?;
    Ok(())
}
```

- [ ] **Step 2: 注册settings模块**

`src-tauri/src/commands/mod.rs` 添加：
```rust
pub mod settings;
```

`src-tauri/src/lib.rs` 的 invoke_handler 添加：
```rust
commands::settings::load_settings,
commands::settings::save_settings,
```

- [ ] **Step 3: 编译验证**

Run:
```powershell
cd d:\projects\req2task-2\git-client\src-tauri
cargo check
```

Expected: 编译成功

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/commands/settings.rs src-tauri/src/commands/mod.rs src-tauri/src/lib.rs
git commit -m "feat: add settings persistence with load/save via app_data_dir"
```

---

### Task 5: 前端集成配置加载

**Files:**
- Modify: `src/stores/app.ts`

- [ ] **Step 1: 在app store中添加load/save**

`src/stores/app.ts`:
```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { invoke } from '../utils/ipc'

interface AppSettings {
  theme: string
  locale: string
  recent_repos: string[]
  sidebar_width: number
  sidebar_collapsed: boolean
}

export const useAppStore = defineStore('app', () => {
  const theme = ref<'dark' | 'light'>('dark')
  const locale = ref<'zh' | 'en'>('zh')
  const sidebarWidth = ref(240)
  const sidebarCollapsed = ref(false)
  const recentRepos = ref<string[]>([])

  function setTheme(t: 'dark' | 'light') {
    theme.value = t
    saveSettings()
  }

  function setLocale(l: 'zh' | 'en') {
    locale.value = l
    saveSettings()
  }

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
    saveSettings()
  }

  async function loadSettings() {
    try {
      const settings = await invoke<AppSettings>('load_settings')
      theme.value = settings.theme as 'dark' | 'light'
      locale.value = settings.locale as 'zh' | 'en'
      sidebarWidth.value = settings.sidebar_width
      sidebarCollapsed.value = settings.sidebar_collapsed
      recentRepos.value = settings.recent_repos
    } catch (e) {
      console.error('loadSettings error:', e)
    }
  }

  async function saveSettings() {
    try {
      await invoke('save_settings', {
        settings: {
          theme: theme.value,
          locale: locale.value,
          recent_repos: recentRepos.value,
          sidebar_width: sidebarWidth.value,
          sidebar_collapsed: sidebarCollapsed.value,
        },
      })
    } catch (e) {
      console.error('saveSettings error:', e)
    }
  }

  return { theme, locale, sidebarWidth, sidebarCollapsed, recentRepos, setTheme, setLocale, toggleSidebar, loadSettings }
})
```

- [ ] **Step 2: 在App.vue中加载配置**

在 `src/App.vue` 的 `<script setup>` 中添加：
```typescript
import { onMounted } from 'vue'
const app = useAppStore()

onMounted(() => {
  app.loadSettings()
})
```

- [ ] **Step 3: Commit**

```bash
git add src/stores/app.ts src/App.vue
git commit -m "feat: integrate settings load/save in app store, auto-load on mount"
```
