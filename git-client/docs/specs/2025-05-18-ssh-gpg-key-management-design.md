# SSH/GPG 密钥管理功能设计文档

## 概述

为 Git 客户端添加完整的 SSH 和 GPG 密钥管理能力，支持密钥的生成、导入、查看、删除以及与仓库的关联配置。

## 目标

1. **SSH 密钥管理**：生成、导入、查看、删除 SSH 密钥对
2. **GPG 密钥管理**：生成、导入、查看、删除 GPG 密钥
3. **仓库关联**：为不同仓库配置特定的密钥
4. **用户体验**：提供直观的图形界面管理密钥

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Vue 3 Frontend                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              SSHKeyManager.vue                         │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐   │  │
│  │  │  SSHKeyList │  │  GPGKeyList │  │ KeyGenerator │   │  │
│  │  └─────────────┘  └─────────────┘  └──────────────┘   │  │
│  └───────────────────────────────────────────────────────┘  │
│                         │                                    │
│                    Tauri IPC                                │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────────────┐
│                         ▼                                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                 Rust Backend                           │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐   │  │
│  │  │ssh_commands │  │gpg_commands │  │key_service   │   │  │
│  │  └─────────────┘  └─────────────┘  └──────────────┘   │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐   │  │
│  │  │ssh_utils    │  │gpg_utils    │  │ssh_agent     │   │  │
│  │  └─────────────┘  └─────────────┘  └──────────────┘   │  │
│  └───────────────────────────────────────────────────────┘  │
│                         │                                    │
│         ┌───────────────┼───────────────┐                    │
│         ▼               ▼               ▼                    │
│    ┌─────────┐    ┌─────────┐    ┌──────────┐               │
│    │~/.ssh/  │    │gpg-agent│    │app_data  │               │
│    │         │    │         │    │          │               │
│    └─────────┘    └─────────┘    └──────────┘               │
│         ▲                                                    │
│    ┌─────────┐                                               │
│    │ssh-agent│                                               │
│    │         │                                               │
│    └─────────┘                                               │
└─────────────────────────────────────────────────────────────┘
```

### 数据模型

#### SSH 密钥

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SshKey {
    pub id: String,                    // 唯一标识 (UUID)
    pub name: String,                  // 用户自定义名称
    pub private_key_path: String,      // 私钥文件路径
    pub public_key_path: String,       // 公钥文件路径
    pub fingerprint: String,           // 密钥指纹
    pub algorithm: SshAlgorithm,       // 算法类型
    pub created_at: String,            // 创建时间
    pub comment: Option<String>,       // 密钥注释
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SshAlgorithm {
    Rsa,
    Ed25519,
    Ecdsa,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SshKeyMetadata {
    pub keys: Vec<SshKey>,
    pub default_key_id: Option<String>,
}
```

#### GPG 密钥

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpgKey {
    pub id: String,                    // GPG Key ID
    pub fingerprint: String,           // 完整指纹
    pub user_ids: Vec<String>,         // 关联的用户ID/邮箱
    pub created_at: String,            // 创建时间
    pub expires_at: Option<String>,    // 过期时间
    pub algorithm: String,             // 算法
    pub length: u32,                   // 密钥长度
    pub subkeys: Vec<GpgSubkey>,       // 子密钥列表
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpgSubkey {
    pub id: String,
    pub fingerprint: String,
    pub algorithm: String,
    pub length: u32,
    pub expires_at: Option<String>,
}
```

#### 仓库密钥关联

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RepoKeyConfig {
    pub repo_id: String,               // 仓库唯一标识：remote_url + worktree_name
    pub repo_path: String,             // 仓库路径（用于显示和验证）
    pub ssh_key_id: Option<String>,    // 指定的 SSH 密钥
    pub gpg_key_id: Option<String>,    // 用于签名的 GPG 密钥
    pub use_ssh_agent: bool,           // 是否使用 SSH agent
}
```

**仓库唯一标识生成规则：**
- 格式：`{remote_origin_url}#{worktree_name}`
- 如果无 remote：使用 `local:{repo_path_hash}`
- 示例：`git@github.com:user/repo.git#main`

## 功能详细设计

### SSH 密钥管理

#### 1. 密钥列表

- 扫描 `~/.ssh/` 目录识别密钥文件
- 解析公钥文件获取指纹和算法信息
- 显示密钥名称、算法、指纹、创建时间

#### 2. 密钥生成

- 支持算法：Ed25519（推荐）、RSA（4096位）、ECDSA
- 调用系统 `ssh-keygen` 命令生成
- 自动生成文件名：`id_{algorithm}_{timestamp}`
- 可选：设置密码短语（passphrase）
- **密码短语处理**：由用户自行记忆，应用不存储。生成时提示用户备份私钥
- **文件名冲突处理**：如果目标文件已存在，自动追加数字后缀（如 `_1`, `_2`）

#### 3. 密钥导入

- 从文件系统选择私钥文件
- 自动查找同目录下的 `.pub` 公钥文件
- 复制到 `~/.ssh/` 目录并设置正确权限
- **密钥对验证**：导入后验证私钥和公钥是否匹配（通过指纹比对）
- **重复检测**：检查是否已存在相同指纹的密钥，提示用户

#### 4. 密钥删除

- 删除私钥和对应的公钥文件
- 清理元数据中的记录
- 检查是否有关联仓库，提示用户

#### 5. 公钥查看

- 读取 `.pub` 文件内容
- 支持复制到剪贴板
- 显示为 Git 服务（GitHub/GitLab）添加密钥的格式

#### 6. ssh-agent 集成

- **检测 agent 状态**：检查 `SSH_AUTH_SOCK` 环境变量
- **添加密钥到 agent**：`ssh-add {private_key_path}`
  - 如果密钥有密码短语，会弹出对话框要求输入
  - 密码短语仅用于本次添加到 agent，应用不存储
- **从 agent 移除密钥**：`ssh-add -d {public_key_path}`
- **列出已加载密钥**：`ssh-add -l`
- **密钥状态显示**：在 UI 中显示密钥是否已加载到 agent

### GPG 密钥管理

#### 1. 密钥列表

- 调用 `gpg --list-secret-keys --with-colons` 获取密钥列表
- 解析输出提取关键信息
- 显示密钥ID、用户ID、指纹、过期时间
- **GPG 可用性检测**：启动时检测 `gpg` 命令是否存在，不存在时引导用户安装
  - Windows：提示安装 Gpg4win 或 Git for Windows
  - macOS：提示安装 GPG Suite 或 `brew install gnupg`
  - Linux：提示安装 `gnupg` 包

#### 2. 密钥生成

- **使用批处理模式生成**（非交互式）：
  ```bash
  gpg --batch --gen-key <<EOF
  Key-Type: EDDSA
  Key-Curve: ed25519
  Key-Usage: sign
  Subkey-Type: ECDH
  Subkey-Curve: cv25519
  Subkey-Usage: encrypt
  Name-Real: {user_name}
  Name-Email: {user_email}
  Expire-Date: 2y
  Passphrase: {passphrase}
  %commit
  EOF
  ```
- 支持算法：Ed25519（推荐）、RSA（4096位）
- 默认过期时间：2年
- **密码短语处理**：由用户自行记忆，应用不存储

#### 3. 密钥导入/导出

- 导入：`gpg --import <file>`
- 导出公钥：`gpg --armor --export <key_id>`
- 导出私钥：`gpg --armor --export-secret-keys <key_id>`（需确认）

#### 4. 密钥删除

- 删除私钥：`gpg --delete-secret-keys <key_id>`
- 删除公钥：`gpg --delete-keys <key_id>`

### 仓库关联

#### 1. 配置 SSH 密钥

- **方式一：使用 SSH config 文件（推荐）**
  - 在 `~/.ssh/config` 中添加 Host 配置：
    ```
    Host github.com-work
        HostName github.com
        User git
        IdentityFile ~/.ssh/id_ed25519_work
        IdentitiesOnly yes
    ```
  - 修改 remote URL 使用别名：`git@github.com-work:user/repo.git`
  
- **方式二：使用 core.sshCommand**
  - 设置 `git config core.sshCommand "ssh -i ~/.ssh/id_ed25519"`
  - 保留用户的 SSH config（不使用 `-F /dev/null`）
  - 提供选项让用户选择是否保留默认 SSH 配置

#### 2. 配置 GPG 签名

- 设置签名密钥：`git config user.signingkey <key_id>`
- 启用自动签名：`git config commit.gpgsign true`

#### 3. 远程仓库密钥配置

- 为特定远程（origin/upstream）配置不同密钥
- 支持 URL 重写规则

## API 设计

### SSH 相关命令

```rust
// 获取所有 SSH 密钥
#[tauri::command]
pub async fn list_ssh_keys() -> Result<Vec<SshKey>, AppError>

// 生成新密钥
#[tauri::command]
pub async fn generate_ssh_key(
    name: String,
    algorithm: SshAlgorithm,
    passphrase: Option<String>,  // 应用不存储，仅传递给 ssh-keygen
    comment: Option<String>,
) -> Result<SshKey, AppError>

// 导入密钥
#[tauri::command]
pub async fn import_ssh_key(
    source_path: String,
    name: String,
) -> Result<SshKey, AppError>

// 删除密钥
#[tauri::command]
pub async fn delete_ssh_key(key_id: String) -> Result<(), AppError>

// 获取公钥内容
#[tauri::command]
pub async fn get_ssh_public_key(key_id: String) -> Result<String, AppError>

// 添加密钥到 ssh-agent
#[tauri::command]
pub async fn add_key_to_agent(
    key_id: String,
    passphrase: Option<String>,  // 临时输入，不存储
) -> Result<(), AppError>

// 从 ssh-agent 移除密钥
#[tauri::command]
pub async fn remove_key_from_agent(key_id: String) -> Result<(), AppError>

// 检查密钥是否在 agent 中
#[tauri::command]
pub async fn is_key_in_agent(key_id: String) -> Result<bool, AppError>
```

### GPG 相关命令

```rust
// 获取所有 GPG 密钥
#[tauri::command]
pub async fn list_gpg_keys() -> Result<Vec<GpgKey>, AppError>

// 生成新密钥
#[tauri::command]
pub async fn generate_gpg_key(
    user_name: String,
    user_email: String,
    passphrase: Option<String>,
) -> Result<GpgKey, AppError>

// 导入密钥
#[tauri::command]
pub async fn import_gpg_key(key_data: String) -> Result<GpgKey, AppError>

// 导出公钥
#[tauri::command]
pub async fn export_gpg_public_key(key_id: String) -> Result<String, AppError>

// 删除密钥
#[tauri::command]
pub async fn delete_gpg_key(key_id: String) -> Result<(), AppError>
```

### 仓库配置命令

```rust
// 获取仓库密钥配置
#[tauri::command]
pub async fn get_repo_key_config(repo_path: String) -> Result<RepoKeyConfig, AppError>

// 设置仓库 SSH 密钥
#[tauri::command]
pub async fn set_repo_ssh_key(
    repo_path: String,
    key_id: Option<String>,
) -> Result<(), AppError>

// 设置仓库 GPG 密钥
#[tauri::command]
pub async fn set_repo_gpg_key(
    repo_path: String,
    key_id: Option<String>,
) -> Result<(), AppError>
```

## UI 设计

### 设置页面布局

```
┌─────────────────────────────────────────────────────────────┐
│  设置                                                         │
├────────────┬────────────────────────────────────────────────┤
│            │                                                │
│  通用      │   SSH 密钥管理                                  │
│  外观      │  ┌──────────────────────────────────────────┐  │
│  编辑器    │  │  [生成新密钥]  [导入密钥]                  │  │
│  Git       │  └──────────────────────────────────────────┘  │
│  密钥管理 ◄─┤                                                │
│   ├── SSH │  ┌──────────────────────────────────────────┐  │
│   └── GPG │  │  🔑 work-key                              │  │
│            │  │     Ed25519 • SHA256:abc123...            │  │
│            │  │     创建于 2025-01-15                     │  │
│            │  │     [查看公钥] [复制] [删除]              │  │
│            │  ├──────────────────────────────────────────┤  │
│            │  │  🔑 personal-key                          │  │
│            │  │     RSA 4096 • SHA256:xyz789...           │  │
│            │  │     创建于 2024-12-01                     │  │
│            │  │     [查看公钥] [复制] [删除]              │  │
│            │  └──────────────────────────────────────────┘  │
│            │                                                │
└────────────┴────────────────────────────────────────────────┘
```

### 组件结构

```
src/components/settings/
├── SettingsPanel.vue           # 设置面板容器
├── SshKeyManager.vue           # SSH 密钥管理主组件
├── SshKeyList.vue              # SSH 密钥列表
├── SshKeyItem.vue              # 单个密钥项
├── SshKeyGenerator.vue         # 密钥生成对话框
├── SshKeyImport.vue            # 密钥导入对话框
├── GpgKeyManager.vue           # GPG 密钥管理主组件
├── GpgKeyList.vue              # GPG 密钥列表
├── GpgKeyItem.vue              # 单个 GPG 密钥项
└── RepoKeyConfig.vue           # 仓库密钥配置
```

## 存储设计

### 元数据存储

文件位置：`app_data_dir/ssh_keys.json`

```json
{
  "version": 1,
  "keys": [
    {
      "id": "uuid-1",
      "name": "work-key",
      "private_key_path": "C:\\Users\\xxx\\.ssh\\id_ed25519_work",
      "public_key_path": "C:\\Users\\xxx\\.ssh\\id_ed25519_work.pub",
      "fingerprint": "SHA256:abc123...",
      "algorithm": "Ed25519",
      "created_at": "2025-01-15T10:30:00Z",
      "comment": "work@company.com"
    }
  ],
  "default_key_id": "uuid-1"
}
```

### 仓库关联存储

文件位置：`app_data_dir/repo_key_configs.json`

```json
{
  "repos": [
    {
      "repo_path": "D:/projects/my-project",
      "ssh_key_id": "uuid-1",
      "gpg_key_id": "ABC123DEF",
      "use_ssh_agent": false
    }
  ]
}
```

## 安全考虑

1. **文件权限**：SSH 私钥文件权限设置为 600（仅所有者可读写）
2. **密码短语**：
   - 应用**不存储**任何密钥的密码短语
   - SSH 密钥密码仅在添加到 ssh-agent 时临时输入
   - GPG 密钥密码由 GPG agent 管理
3. **敏感信息**：不在日志中记录私钥内容或密码
4. **删除确认**：删除密钥前要求用户确认，防止误删
5. **备份提醒**：生成新密钥时提醒用户备份私钥

## 错误处理

| 错误场景 | 处理方式 |
|---------|---------|
| ssh-keygen/gpg 命令不存在 | 提示用户安装 Git for Windows / GPG tools |
| 密钥文件权限错误 | 尝试修复权限，失败则提示用户 |
| 导入的密钥格式错误 | 返回具体错误信息，提示检查文件 |
| 密钥被占用（ssh-agent） | 提示用户先移除 agent 中的密钥 |
| GPG 操作需要密码 | 弹出密码输入对话框（密码不存储） |
| GPG 未安装 | 引导用户安装 Gpg4win/GPG Suite/gnupg |

## 跨平台适配

| 功能 | Windows | macOS | Linux |
|-----|---------|-------|-------|
| SSH 密钥路径 | `%USERPROFILE%\.ssh\` | `~/.ssh/` | `~/.ssh/` |
| ssh-keygen | Git for Windows 自带 | 系统自带 | 系统自带 |
| GPG | Gpg4win / Git 自带 | GPG Suite / Homebrew | 系统自带 |
| 文件权限 | ACL 模拟 | Unix 权限 | Unix 权限 |

## 依赖项

### Rust 后端

```toml
[dependencies]
# 已有依赖
keyring = "3"

# 新增依赖（可选，如需更高级的 SSH 操作）
ssh-key = "0.6"  # 解析 SSH 公钥格式
```

### 前端

无需新增依赖，使用现有 Naive UI 组件。

## 实现优先级

1. **P0 - 核心功能**
   - SSH 密钥列表展示
   - SSH 密钥生成
   - SSH 密钥导入
   - 仓库 SSH 密钥关联

2. **P1 - 增强功能**
   - GPG 密钥列表
   - GPG 密钥生成
   - GPG 密钥导入
   - 仓库 GPG 签名配置

3. **P2 - 优化功能**
   - 密钥搜索/过滤
   - 批量操作
   - 密钥使用统计
   - 过期提醒

## 验收标准

- [ ] 可以生成 Ed25519/RSA 类型的 SSH 密钥
- [ ] 可以导入已有的 SSH 私钥
- [ ] 可以查看和复制 SSH 公钥
- [ ] 可以为仓库配置特定的 SSH 密钥
- [ ] 可以列出系统中的 GPG 密钥
- [ ] 可以为仓库配置 GPG 签名密钥
- [ ] 密钥删除时有确认提示
- [ ] 所有操作都有适当的错误提示
