# Fetch/Push/Pull 进度事件设计

## 概述

为远程操作（fetch/push/pull）添加实时进度反馈，提升用户体验。

## 进度数据模型

### Rust 侧

```rust
#[derive(Debug, Clone, serde::Serialize)]
pub struct FetchProgress {
    pub stage: String,           // connecting|authenticating|enumerating|receiving|resolving|complete
    pub phase: String,            // 阶段描述
    pub processed: u32,          // 已处理对象数
    pub total: Option<u32>,      // 总对象数
    pub bytes_processed: u64,    // 已传输字节
    pub bytes_total: Option<u64>,// 总字节数
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct PushProgress {
    pub stage: String,           // connecting|authenticating|updating|complete
    pub phase: String,
    pub processed: u32,
    pub total: u32,
    pub bytes_processed: u64,
    pub bytes_total: u64,
}
```

### TypeScript 侧

```typescript
interface FetchProgress {
  stage: 'connecting' | 'authenticating' | 'enumerating' | 'receiving' | 'resolving' | 'complete'
  phase: string
  processed: number
  total: number | null
  bytesProcessed: number
  bytesTotal: number | null
}

interface PushProgress {
  stage: 'connecting' | 'authenticating' | 'updating' | 'complete'
  phase: string
  processed: number
  total: number
  bytesProcessed: number
  bytesTotal: number
}
```

## 实现方案

### 1. Rust RemoteCallbacks

使用 `git2::RemoteCallbacks` 提取进度：

```rust
let mut callbacks = RemoteCallbacks::new();
callbacks.transfer_progress(|progress| {
    // 进度回调
    true
});
```

### 2. 事件发射

- fetch: `emit("fetch-progress", progress)`
- push: `emit("push-progress", progress)`

### 3. 前端 composable

```typescript
export function useFetchProgress(repoPath: string) {
  // 监听进度事件
  // 返回进度状态
}
```

## 文件改动

| 文件 | 改动 |
|------|------|
| `remote_service.rs` | 添加 RemoteCallbacks，进度提取，事件发射 |
| `ipc.d.ts` | 添加 FetchProgress/PushProgress 类型 |
| `useGitEvent.ts` | 扩展支持进度事件 |
| `RemotePanel.vue` | 集成进度条显示 |

## 测试

- 单元测试验证进度数据序列化
- 集成测试验证事件发射
