# Git客户端设计文档 — 测试与工程化

## 测试策略

| 层 | 测试类型 | 工具 |
|----|---------|------|
| Rust models | 单元测试 | #[test] + assert |
| Rust services | 单元测试（mock git2） | mockall |
| Rust commands | 集成测试 | tauri::test |
| Vue组件 | 单元测试 | Vitest + Vue Test Utils |
| Pinia Store | 单元测试 | Vitest + pinia testing |
| 全流程 | E2E测试 | Playwright + Tauri WebDriver |
| 提交图 | 快照测试 | Canvas截图对比 |

CI流程：Rust cargo test → Vue vitest → Playwright E2E → 构建发布包

## 工程审查修复

### E1: git2异步适配

git2是同步库，所有调用在Tauri command中会阻塞主线程。解决方案：

```rust
#[tauri::command]
async fn get_log(state: State<'_, AppState>, limit: u32, after: Option<String>) -> Result<Vec<Commit>, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let repo = repos.get_repo()?;
        commit_service::log(&repo, limit, after.as_deref())
    }).await?
}
```

所有git2调用统一通过`spawn_blocking`在专用线程池执行。

### E2: Repository生命周期管理

git2::Repository不是Send，不能跨线程共享。设计AppState：

```rust
struct AppState {
    repos: Arc<Mutex<RepoManager>>,
}

struct RepoManager {
    handles: HashMap<PathBuf, RepoHandle>,
}

struct RepoHandle {
    path: PathBuf,
}
```

每次操作重新open repository（git2::Repository::open），开销约1-5ms可接受。避免Mutex锁竞争问题。

### E3: 游标分页

get_log改为游标分页：

| 命令 | 输入 | 输出 |
|------|------|------|
| get_log | limit: u32, after: Option\<String\> | Vec\<Commit\> |

Rust侧实现：
```rust
fn log(repo: &Repository, limit: u32, after: Option<&str>) -> Result<Vec<Commit>> {
    let mut revwalk = repo.revwalk()?;
    revwalk.push_head()?;
    if let Some(id) = after {
        revwalk.hide(Oid::from_str(id)?)?;
    }
    // ...
}
```

### E4: SSH方案

移除ssh2 crate依赖。git2自带libssh2支持，通过RemoteCallbacks配置SSH认证：

```rust
let mut callbacks = RemoteCallbacks::new();
callbacks.credentials(|url, username, _| {
    // 从keyring获取或提示用户输入
    Cred::ssh_key_from_agent(username.unwrap_or("git"))
});
```

### E5: AppState注入Tauri

```rust
fn main() {
    let state = AppState {
        repos: Arc::new(Mutex::new(RepoManager::new())),
    };
    tauri::Builder::default()
        .manage(state)
        .invoke_handler(tauri::generate_handler![...])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### E6: 统一IPC返回类型

已在"错误处理"章节合并定义。所有命令统一返回`Result<T, AppError>`，AppError使用thiserror + Serialize实现。

### E7: 事件细分

`repo-changed`拆分为：

| 事件 | 触发条件 | 前端响应 |
|------|---------|---------|
| ref-updated | .git/refs/变更 | 刷新分支列表、提交图 |
| index-changed | .git/index变更 | 刷新暂存区状态 |
| workdir-changed | 工作区文件变更 | 刷新工作区diff |
| head-changed | .git/HEAD变更 | 更新当前分支显示 |

### E8: commit支持amend

commit命令增加amend参数：

| 命令 | 输入 | 输出 |
|------|------|------|
| commit | message: string, files: Vec\<string\>, amend: bool | Commit |

### E9: init_repo命令

新增IPC命令：

| 命令 | 输入 | 输出 |
|------|------|------|
| init_repo | path: string, bare: bool | RepoState |

### E10: Diff查看器改为Monaco

首版直接使用Monaco Editor的diff模式，支持：
- side-by-side diff
- unified diff
- 行内编辑（冲突解决需要）
- diff导航（上一个/下一个变更块）

移除diff2html依赖。

### E11: 文件监听精确化

notify仅监听以下路径：
- `.git/refs/` — 分支/标签变更
- `.git/HEAD` — 当前分支切换
- `.git/index` — 暂存区变更

忽略`.git/objects/`、`.git/logs/`等高频写入目录。

### E12: 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| Ctrl+P | 切换仓库 |
| Ctrl+S | 提交 |
| Ctrl+Shift+S | 提交并推送 |
| Ctrl+L | 拉取 |
| Ctrl+Shift+P | 推送 |
| Ctrl+B | 创建分支 |
| Ctrl+Shift+B | 切换分支 |
| Ctrl+D | 查看Diff |
| Ctrl+G | 跳转到提交 |
| Ctrl+Z | 撤销（工作区文件恢复） |
| F5 | 刷新仓库状态 |

## 配置持久化

用户偏好配置通过Tauri的`app_data_dir`存储：

| 配置项 | 存储方式 | 文件 |
|--------|---------|------|
| 主题/语言/面板布局 | JSON文件 | `~/.config/git-client/settings.json` |
| 仓库列表/最近打开 | JSON文件 | `~/.config/git-client/repos.json` |
| Git用户配置 | 读写仓库.git/config | 由git2操作 |
| HTTPS凭证 | 操作系统凭证管理器 | keyring crate |
| SSH密钥路径 | 操作系统凭证管理器 | keyring crate |

Rust侧通过`tauri::api::path::app_data_dir`获取平台特定配置目录。前端通过IPC命令读写配置。

## 窗口管理

单窗口多标签页策略：

- 每个打开的仓库对应一个标签页
- 标签页栏位于工具栏下方
- 支持拖拽排序标签页
- 关闭最后一个标签页显示欢迎页
- 窗口大小/位置记忆到配置文件

## 日志方案

| 层 | 日志方案 |
|----|---------|
| Rust | `tracing` crate，输出到文件 `app_data_dir/logs/` |
| Vue | `console.log` + 自定义logger，开发环境输出到DevTools |
| 生产环境 | Rust日志rotate（按大小5MB，保留5个），Vue日志不上报 |

```rust
tracing_subscriber::fmt()
    .with_max_level(tracing::Level::INFO)
    .with_rolling_file(app_data_dir, Rolling::Hourly)
    .init();
```

## 开发体验

### DX1: IPC类型安全

使用Tauri的TypeScript类型生成，从Rust命令签名自动生成前端类型：

```toml
# Cargo.toml
[build-dependencies]
tauri-build = { version = "2", features = ["codegen"] }
```

`cargo tauri dev`构建时自动生成`src/types/ipc.d.ts`，前端直接import使用，无需手动维护。

同时封装IPC调用层，统一处理loading和error：

```typescript
// composables/useGit.ts
export function useGit() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
    loading.value = true
    error.value = null
    try {
      return await window.__TAURI_INTERNALS__.invoke(cmd, args)
    } catch (e) {
      error.value = String(e)
      throw e
    } finally {
      loading.value = false
    }
  }

  return { invoke, loading, error }
}
```

### DX2: 开发环境热重载

dev工作流：

- **前端**：Vite HMR，修改Vue/CSS即时生效
- **Rust**：`cargo tauri dev`自动重编译，约10-30秒
- **加速策略**：`#[cfg(debug_assertions)]`条件下跳过重量级初始化（文件监听、日志rotate）
- **Mock模式**：前端通过环境变量`VITE_MOCK=true`启用纯前端mock，不依赖Rust后端

```typescript
// utils/ipc.ts
const isMock = import.meta.env.VITE_MOCK === 'true'

export async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (isMock) return mockData[cmd] as T
  return window.__TAURI_INTERNALS__.invoke(cmd, args)
}
```

### DX3: Monaco Editor集成

使用vite-plugin-monaco-editor插件集成：

```typescript
// vite.config.ts
import monacoEditorPlugin from 'vite-plugin-monaco-editor'

export default defineConfig({
  plugins: [
    vue(),
    monacoEditorPlugin({
      languageWorkers: ['editorWorkerService', 'diff']
    })
  ]
})
```

仅加载diff worker，避免加载全部语言包。Monaco diff editor使用方式：

```typescript
monaco.editor.createDiffEditor(container, {
  theme: 'vs-dark',
  renderSideBySide: true,
  readOnly: false,
})
```

### DX4: 事件监听自动清理

封装composable，利用Vue生命周期自动管理：

```typescript
// composables/useGitEvent.ts
export function useGitEvent(event: string, handler: (payload: any) => void) {
  const unlisten = ref<(() => void) | null>(null)

  onMounted(async () => {
    unlisten.value = await listen(event, (e) => handler(e.payload))
  })

  onUnmounted(() => {
    unlisten.value?.()
  })
}
```

### DX5: git2操作重试机制

封装带重试的操作执行器：

```rust
// utils/retry.rs
pub fn with_retry<F, T>(op: F, max_retries: u32) -> Result<T, AppError>
where F: Fn() -> Result<T, AppError> {
    let mut attempts = 0;
    loop {
        match op() {
            Ok(v) => return Ok(v),
            Err(e) if attempts < max_retries => {
                attempts += 1;
                std::thread::sleep(Duration::from_millis(100 * 2u64.pow(attempts)));
            }
            Err(e) => return Err(e),
        }
    }
}
```

对stage_files、commit、switch_branch等易因文件锁失败的操作使用重试。

### DX6: 工作区文件监听debounce

工作区文件变更通过Chokidar（Vite内置）+ 自定义300ms debounce监听：

```typescript
// composables/useWorkdirWatcher.ts
export function useWorkdirWatcher(repoPath: Ref<string>) {
  const { invoke } = useGit()
  let timer: number | null = null

  useGitEvent('workdir-changed', () => {
    if (timer) clearTimeout(timer)
    timer = window.setTimeout(() => {
      invoke('get_working_diff')
    }, 300)
  })
}
```

### DX7: commit消息模板

CommitEditor组件支持Conventional Commits模板选择：

| 模板 | 前缀 |
|------|------|
| feat | feat: |
| fix | fix: |
| docs | docs: |
| refactor | refactor: |
| chore | chore: |

下拉选择模板 + 输入框自动填充前缀。模板列表可自定义扩展。

### DX8: 拖拽操作

分支图支持拖拽交互：

- 拖拽分支节点到目标分支 → 弹出merge/rebase选择
- 拖拽commit节点 → 弹出cherry-pick选项
- 侧边栏分支项拖拽 → 同上

使用HTML5 Drag & Drop API实现，Canvas节点通过mousedown/mousemove/mouseup模拟拖拽。
