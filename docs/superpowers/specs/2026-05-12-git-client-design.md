# Git客户端设计文档

> 媲美GitKraken的桌面Git客户端

面向个人开发者的桌面Git客户端，基于Tauri + Vue3 + libgit2构建。

## 文档索引

| 文档 | 内容 |
|------|------|
| [01-概述与架构](./2026-05-12-git-client-design-01-overview-architecture.md) | 概述、技术栈、平台支持、三层架构 |
| [02-前后端模块](./2026-05-12-git-client-design-02-frontend-backend.md) | 前端模块划分、目录结构、后端模块、数据模型、错误处理 |
| [03-数据流与IPC](./2026-05-12-git-client-design-03-data-flow-ipc.md) | 请求-响应流、事件推送流、文件监听流、Pinia Store、IPC命令清单 |
| [04-功能模块](./2026-05-12-git-client-design-04-features.md) | 提交图算法、国际化、主题、Diff查看器、冲突解决、凭证安全 |
| [05-测试与工程化](./2026-05-12-git-client-design-05-testing-engineering.md) | 测试策略、工程审查修复(E1-E12)、配置持久化、窗口管理、日志方案、开发体验(DX1-DX8) |
