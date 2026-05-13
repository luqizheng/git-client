# Git客户端 实施计划 — 11: 测试与工程化收尾

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立测试基础设施、窗口管理、日志方案、CI配置、全量构建验证

**Architecture:** Rust侧单元测试(#[test])覆盖models/services。Vue侧Vitest单元测试覆盖stores/composables/utils。E2E使用Playwright。CI用GitHub Actions。窗口管理支持多标签页。

**Tech Stack:** Vitest, Vue Test Utils, Playwright, cargo test, GitHub Actions

---

### Task 1: 配置Vitest

**Files:**
- Create: `vitest.config.ts`

- [ ] **Step 1: 写vitest配置**

`vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'

export default defineConfig({
  plugins: [vue(), UnoCSS()],
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
```

- [ ] **Step 2: 添加npm scripts**

在 `package.json` 的 `scripts` 添加：
```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:ui": "vitest --ui"
}
```

- [ ] **Step 3: 运行测试验证**

Run:
```powershell
cd d:\projects\req2task-2\git-client
npm test
```

Expected: 已有的graphLayout测试通过

- [ ] **Step 4: Commit**

```bash
git add vitest.config.ts package.json
git commit -m "chore: configure Vitest for Vue component and unit testing"
```

---

### Task 2: 编写Pinia Store单元测试

**Files:**
- Create: `src/stores/__tests__/repo.test.ts`
- Create: `src/stores/__tests__/commits.test.ts`

- [ ] **Step 1: 写repo store测试**

`src/stores/__tests__/repo.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRepoStore } from '../repo'

describe('repo store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initial state is empty', () => {
    const store = useRepoStore()
    expect(store.currentRepo).toBeNull()
    expect(store.repoPath).toBe('')
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })
})
```

- [ ] **Step 2: 写commits store测试**

`src/stores/__tests__/commits.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCommitsStore } from '../commits'

describe('commits store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initial state is empty', () => {
    const store = useCommitsStore()
    expect(store.commits).toEqual([])
    expect(store.selectedCommit).toBeNull()
    expect(store.loading).toBe(false)
    expect(store.hasMore).toBe(true)
  })

  it('selectCommit updates selectedCommit', () => {
    const store = useCommitsStore()
    const commit = {
      id: 'abc123',
      message: 'test',
      author: 'user',
      author_email: 'u@e.com',
      time: 0,
      parent_ids: [],
    }
    store.selectCommit(commit)
    expect(store.selectedCommit).toEqual(commit)
  })

  it('clearCommits resets state', () => {
    const store = useCommitsStore()
    store.selectCommit({
      id: 'abc',
      message: 't',
      author: 'a',
      author_email: 'e',
      time: 0,
      parent_ids: [],
    })
    store.clearCommits()
    expect(store.commits).toEqual([])
    expect(store.selectedCommit).toBeNull()
  })
})
```

- [ ] **Step 3: 运行测试**

Run:
```powershell
cd d:\projects\req2task-2\git-client
npm test
```

Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add src/stores/__tests__/
git commit -m "test: add unit tests for repo and commits Pinia stores"
```

---

### Task 3: 编写composable单元测试

**Files:**
- Create: `src/composables/__tests__/useKeyboard.test.ts`

- [ ] **Step 1: 写useKeyboard测试**

`src/composables/__tests__/useKeyboard.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { useKeyboard } from '../useKeyboard'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

describe('useKeyboard', () => {
  it('calls handler on matching shortcut', async () => {
    const handler = vi.fn()
    const TestComponent = defineComponent({
      setup() {
        useKeyboard([{ key: 's', ctrl: true, handler }])
      },
      render() { return h('div') },
    })
    const wrapper = mount(TestComponent)
    await wrapper.trigger('keydown', { key: 's', ctrlKey: true })
    expect(handler).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('does not call handler without ctrl', async () => {
    const handler = vi.fn()
    const TestComponent = defineComponent({
      setup() {
        useKeyboard([{ key: 's', ctrl: true, handler }])
      },
      render() { return h('div') },
    })
    const wrapper = mount(TestComponent)
    await wrapper.trigger('keydown', { key: 's' })
    expect(handler).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
```

- [ ] **Step 2: 运行测试**

Run:
```powershell
cd d:\projects\req2task-2\git-client
npx vitest run src/composables/__tests__/
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/composables/__tests__/
git commit -m "test: add useKeyboard composable unit tests"
```

---

### Task 4: 窗口管理 — 多标签页

**Files:**
- Modify: `src-tauri/tauri.conf.json`

- [ ] **Step 1: 配置窗口默认值**

在 `src-tauri/tauri.conf.json` 的 `app.windows` 中设置：

```json
{
  "title": "Git Client",
  "width": 1200,
  "height": 800,
  "minWidth": 800,
  "minHeight": 600,
  "resizable": true,
  "fullscreen": false
}
```

- [ ] **Step 2: Commit**

```bash
git add src-tauri/tauri.conf.json
git commit -m "chore: configure window defaults (1200x800, min 800x600)"
```

---

### Task 5: CI配置

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: 写GitHub Actions CI**

`.github/workflows/ci.yml`:
```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  rust-test:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - run: cd src-tauri && cargo test --lib
      - run: cd src-tauri && cargo clippy -- -D warnings

  vue-test:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm test
      - run: npx vue-tsc --noEmit
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow for Rust + Vue tests"
```

---

### Task 6: 全量构建验证

**Files:** 无新增

- [ ] **Step 1: 运行Rust全部测试**

Run:
```powershell
cd d:\projects\req2task-2\git-client\src-tauri
cargo test --lib
```

Expected: ALL PASS

- [ ] **Step 2: 运行Vue全部测试**

Run:
```powershell
cd d:\projects\req2task-2\git-client
npm test
```

Expected: ALL PASS

- [ ] **Step 3: 运行Tauri完整构建**

Run:
```powershell
cd d:\projects\req2task-2\git-client
npx tauri build
```

Expected: 构建成功，生成安装包

- [ ] **Step 4: 运行cargo clippy**

Run:
```powershell
cd d:\projects\req2task-2\git-client\src-tauri
cargo clippy -- -D warnings
```

Expected: 无warnings

- [ ] **Step 5: 最终Commit**

```bash
git add -A
git commit -m "chore: final build verification, all tests passing"
```
