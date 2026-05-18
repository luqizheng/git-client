# SSH/GPG 密钥管理功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Git 客户端添加 SSH 和 GPG 密钥管理功能，支持密钥的生成、导入、查看、删除以及与仓库的关联配置。

**Architecture:** 采用前后端分离架构，Rust 后端通过 Tauri IPC 提供命令，前端 Vue 组件调用。SSH/GPG 操作通过调用系统命令实现，元数据存储在 app_data_dir。

**Tech Stack:** Rust (ssh-key crate, keyring), Vue 3, Tauri 2, Naive UI

---

## 文件结构

### Rust 后端

```
src-tauri/src/
├── commands/
│   └── ssh_key.rs          # 新增：SSH 密钥相关命令
│   └── gpg_key.rs          # 新增：GPG 密钥相关命令
│   └── repo_key.rs         # 新增：仓库密钥配置命令
├── models/
│   └── key.rs              # 新增：SshKey, GpgKey, RepoKeyConfig 模型
├── services/
│   └── ssh_key_service.rs  # 新增：SSH 密钥业务逻辑
│   └── gpg_key_service.rs  # 新增：GPG 密钥业务逻辑
├── utils/
│   └── ssh_agent.rs        # 新增：ssh-agent 操作工具
│   └── mod.rs              # 导出新模块
└── lib.rs                  # 注册新命令
```

### Vue 前端

```
src/components/settings/
├── SettingsPanel.vue        # 修改：添加密钥管理标签页
├── SshKeyManager.vue       # 新增：SSH 密钥管理主组件
├── SshKeyList.vue          # 新增：SSH 密钥列表
├── SshKeyItem.vue          # 新增：单个密钥项
├── SshKeyGenerator.vue      # 新增：密钥生成对话框
├── SshKeyImport.vue         # 新增：密钥导入对话框
├── GpgKeyManager.vue       # 新增：GPG 密钥管理主组件
├── GpgKeyList.vue          # 新增：GPG 密钥列表
├── GpgKeyItem.vue          # 新增：单个 GPG 密钥项
└── RepoKeyConfig.vue       # 新增：仓库密钥配置

src/stores/
└── keys.ts                 # 新增：密钥状态管理

src/types/
└── key.d.ts                # 新增：密钥类型定义

src/composables/
└── useSshAgent.ts          # 新增：ssh-agent 状态组合式函数

src/i18n/locales/
├── en.json                 # 修改：添加 SSH/GPG 相关翻译
└── zh.json                 # 修改：添加 SSH/GPG 相关翻译
```

### 存储文件

```
app_data_dir/
├── ssh_keys.json           # SSH 密钥元数据
└── repo_key_configs.json   # 仓库密钥配置
```

---

## 任务列表

### Phase 1: SSH 密钥核心功能

#### Task 1: 创建密钥数据模型

**Files:**
- Create: `src-tauri/src/models/key.rs`
- Modify: `src-tauri/src/models/mod.rs`
- Create: `src/types/key.d.ts`

- [ ] **Step 1: 创建 Rust 模型文件**

```rust
// src-tauri/src/models/key.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SshAlgorithm {
    Rsa,
    Ed25519,
    Ecdsa,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SshKey {
    pub id: String,
    pub name: String,
    pub private_key_path: String,
    pub public_key_path: String,
    pub fingerprint: String,
    pub algorithm: SshAlgorithm,
    pub created_at: String,
    pub comment: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpgSubkey {
    pub id: String,
    pub fingerprint: String,
    pub algorithm: String,
    pub length: u32,
    pub expires_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpgKey {
    pub id: String,
    pub fingerprint: String,
    pub user_ids: Vec<String>,
    pub created_at: String,
    pub expires_at: Option<String>,
    pub algorithm: String,
    pub length: u32,
    pub subkeys: Vec<GpgSubkey>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RepoKeyConfig {
    pub repo_id: String,
    pub repo_path: String,
    pub ssh_key_id: Option<String>,
    pub gpg_key_id: Option<String>,
    pub use_ssh_agent: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SshKeyMetadata {
    pub version: u32,
    pub keys: Vec<SshKey>,
    pub default_key_id: Option<String>,
}
```

- [ ] **Step 2: 更新 models/mod.rs 导出**

```rust
// src-tauri/src/models/mod.rs
pub mod key;

pub use key::*;
```

- [ ] **Step 3: 创建 TypeScript 类型定义**

```typescript
// src/types/key.d.ts
export enum SshAlgorithm {
  Rsa = 'Rsa',
  Ed25519 = 'Ed25519',
  Ecdsa = 'Ecdsa',
}

export interface SshKey {
  id: string;
  name: string;
  private_key_path: string;
  public_key_path: string;
  fingerprint: string;
  algorithm: SshAlgorithm;
  created_at: string;
  comment?: string;
  is_in_agent?: boolean;
}

export interface GpgSubkey {
  id: string;
  fingerprint: string;
  algorithm: string;
  length: number;
  expires_at?: string;
}

export interface GpgKey {
  id: string;
  fingerprint: string;
  user_ids: string[];
  created_at: string;
  expires_at?: string;
  algorithm: string;
  length: number;
  subkeys: GpgSubkey[];
}

export interface RepoKeyConfig {
  repo_id: string;
  repo_path: string;
  ssh_key_id?: string;
  gpg_key_id?: string;
  use_ssh_agent: boolean;
}

export interface SshKeyMetadata {
  version: number;
  keys: SshKey[];
  default_key_id?: string;
}
```

- [ ] **Step 4: 提交**

```bash
git add src-tauri/src/models/key.rs src-tauri/src/models/mod.rs src/types/key.d.ts
git commit -m "feat(keys): add SSH/GPG key data models"
```

---

#### Task 2: 创建 SSH 密钥服务

**Files:**
- Create: `src-tauri/src/services/ssh_key_service.rs`
- Modify: `src-tauri/src/services/mod.rs`

- [ ] **Step 1: 创建 SSH 密钥服务**

```rust
// src-tauri/src/services/ssh_key_service.rs
use crate::models::key::{SshAlgorithm, SshKey, SshKeyMetadata};
use crate::utils::error::AppError;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use tauri::AppHandle;
use uuid::Uuid;

pub struct SshKeyService;

impl SshKeyService {
    pub fn get_ssh_dir() -> Result<PathBuf, AppError> {
        if cfg!(windows) {
            Ok(dirs::home_dir()
                .ok_or_else(|| AppError::Credential("Cannot find home directory".into()))?
                .join(".ssh"))
        } else {
            Ok(dirs::home_dir()
                .ok_or_else(|| AppError::Credential("Cannot find home directory".into()))?
                .join(".ssh"))
        }
    }

    pub fn get_metadata_path(app: &AppHandle) -> Result<PathBuf, AppError> {
        let dir = app.path().app_data_dir()
            .map_err(|e| AppError::Credential(e.to_string()))?;
        fs::create_dir_all(&dir)?;
        Ok(dir.join("ssh_keys.json"))
    }

    pub fn load_metadata(app: &AppHandle) -> Result<SshKeyMetadata, AppError> {
        let path = Self::get_metadata_path(app)?;
        if !path.exists() {
            return Ok(SshKeyMetadata {
                version: 1,
                keys: Vec::new(),
                default_key_id: None,
            });
        }
        let data = fs::read_to_string(&path)?;
        serde_json::from_str(&data)
            .map_err(|e| AppError::Credential(e.to_string()))
    }

    pub fn save_metadata(app: &AppHandle, metadata: &SshKeyMetadata) -> Result<(), AppError> {
        let path = Self::get_metadata_path(app)?;
        let data = serde_json::to_string_pretty(metadata)
            .map_err(|e| AppError::Credential(e.to_string()))?;
        fs::write(&path, data)
    }

    pub fn list_keys(app: &AppHandle) -> Result<Vec<SshKey>, AppError> {
        let metadata = Self::load_metadata(app)?;
        Ok(metadata.keys)
    }

    pub fn generate_key(
        app: &AppHandle,
        name: String,
        algorithm: SshAlgorithm,
        comment: Option<String>,
    ) -> Result<SshKey, AppError> {
        let ssh_dir = Self::get_ssh_dir()?;
        fs::create_dir_all(&ssh_dir)?;

        let timestamp = chrono::Utc::now().format("%Y%m%d%H%M%S");
        let algo_str = match algorithm {
            SshAlgorithm::Rsa => "rsa",
            SshAlgorithm::Ed25519 => "ed25519",
            SshAlgorithm::Ecdsa => "ecdsa",
        };
        let filename = format!("id_{}_{}", algo_str, timestamp);
        let private_key_path = ssh_dir.join(&filename);
        let public_key_path = ssh_dir.join(format!("{}.pub", filename));

        let mut cmd = Command::new("ssh-keygen");
        cmd.arg("-t").arg(algo_str);
        if matches!(algorithm, SshAlgorithm::Rsa) {
            cmd.arg("-b").arg("4096");
        }
        cmd.arg("-f").arg(&private_key_path);
        cmd.arg("-N").arg("");  // 空密码，由用户记忆
        if let Some(ref c) = comment {
            cmd.arg("-C").arg(c);
        }

        let output = cmd.output()
            .map_err(|e| AppError::Credential(format!("Failed to run ssh-keygen: {}", e)))?;

        if !output.status.success() {
            return Err(AppError::Credential(
                String::from_utf8_lossy(&output.stderr).to_string()
            ));
        }

        let fingerprint = Self::get_key_fingerprint(&public_key_path)?;
        let id = Uuid::new_v4().to_string();
        let created_at = chrono::Utc::now().to_rfc3339();

        let key = SshKey {
            id,
            name,
            private_key_path: private_key_path.to_string_lossy().to_string(),
            public_key_path: public_key_path.to_string_lossy().to_string(),
            fingerprint,
            algorithm,
            created_at,
            comment,
        };

        let mut metadata = Self::load_metadata(app)?;
        metadata.keys.push(key.clone());
        if metadata.default_key_id.is_none() {
            metadata.default_key_id = Some(key.id.clone());
        }
        Self::save_metadata(app, &metadata)?;

        Ok(key)
    }

    fn get_key_fingerprint(path: &PathBuf) -> Result<String, AppError> {
        let output = Command::new("ssh-keygen")
            .arg("-l")
            .arg("-f")
            .arg(path)
            .output()
            .map_err(|e| AppError::Credential(format!("Failed to run ssh-keygen: {}", e)))?;

        if !output.status.success() {
            return Err(AppError::Credential(
                String::from_utf8_lossy(&output.stderr).to_string()
            ));
        }

        let output_str = String::from_utf8_lossy(&output.stdout);
        let parts: Vec<&str> = output_str.split_whitespace().collect();
        if parts.len() >= 2 {
            Ok(parts[1].to_string())
        } else {
            Ok(output_str.trim().to_string())
        }
    }

    pub fn import_key(
        app: &AppHandle,
        source_path: String,
        name: String,
    ) -> Result<SshKey, AppError> {
        let ssh_dir = Self::get_ssh_dir()?;
        fs::create_dir_all(&ssh_dir)?;

        let source = PathBuf::from(&source_path);
        if !source.exists() {
            return Err(AppError::Credential("Source key file does not exist".into()));
        }

        let filename = source.file_name()
            .ok_or_else(|| AppError::Credential("Invalid key file name".into()))?;
        let filename_str = filename.to_string_lossy();

        let dest_private = ssh_dir.join(&*filename_str);
        fs::copy(&source, &dest_private)?;

        let public_key_path = source.with_extension("");
        let fingerprint = if public_key_path.exists() {
            Self::get_key_fingerprint(&public_key_path)?
        } else {
            // 尝试从私钥获取指纹
            Self::get_key_fingerprint(&dest_private)?
        };

        let algorithm = if filename_str.contains("ed25519") {
            SshAlgorithm::Ed25519
        } else if filename_str.contains("rsa") || filename_str.contains("id_rsa") {
            SshAlgorithm::Rsa
        } else {
            SshAlgorithm::Ecdsa
        };

        let id = Uuid::new_v4().to_string();
        let created_at = chrono::Utc::now().to_rfc3339();

        let key = SshKey {
            id,
            name,
            private_key_path: dest_private.to_string_lossy().to_string(),
            public_key_path: public_key_path.to_string_lossy().to_string(),
            fingerprint,
            algorithm,
            created_at,
            comment: None,
        };

        let mut metadata = Self::load_metadata(app)?;
        metadata.keys.push(key.clone());
        Self::save_metadata(app, &metadata)?;

        Ok(key)
    }

    pub fn delete_key(app: &AppHandle, key_id: String) -> Result<(), AppError> {
        let mut metadata = Self::load_metadata(app)?;
        let key = metadata.keys.iter()
            .find(|k| k.id == key_id)
            .ok_or_else(|| AppError::Credential("Key not found".into()))?;

        let private_path = PathBuf::from(&key.private_key_path);
        let public_path = PathBuf::from(&key.public_key_path);

        if private_path.exists() {
            fs::remove_file(&private_path)?;
        }
        if public_path.exists() {
            fs::remove_file(&public_path)?;
        }

        metadata.keys.retain(|k| k.id != key_id);
        if metadata.default_key_id.as_ref() == Some(&key_id) {
            metadata.default_key_id = metadata.keys.first().map(|k| k.id.clone());
        }
        Self::save_metadata(app, &metadata)?;

        Ok(())
    }

    pub fn get_public_key(key_id: String) -> Result<String, AppError> {
        let public_path = PathBuf::from(&key_id);
        if !public_path.exists() {
            return Err(AppError::Credential("Public key file not found".into()));
        }
        fs::read_to_string(&public_path)
            .map_err(|e| AppError::Credential(e.to_string()))
    }
}
```

- [ ] **Step 2: 添加 Cargo.toml 依赖**

```toml
# src-tauri/Cargo.toml
[dependencies]
# 新增
uuid = { version = "1", features = ["v4"] }
chrono = { version = "0.4", features = ["serde"] }
dirs = "5"
```

- [ ] **Step 3: 更新 services/mod.rs**

```rust
// src-tauri/src/services/mod.rs
pub mod ssh_key_service;
pub mod gpg_key_service;

pub use ssh_key_service::SshKeyService;
pub use gpg_key_service::GpgKeyService;
```

- [ ] **Step 4: 提交**

```bash
git add src-tauri/Cargo.toml src-tauri/src/services/ssh_key_service.rs src-tauri/src/services/mod.rs
git commit -m "feat(keys): add SSH key service for CRUD operations"
```

---

#### Task 3: 创建 SSH 密钥 Tauri 命令

**Files:**
- Create: `src-tauri/src/commands/ssh_key.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/src/commands/mod.rs`

- [ ] **Step 1: 创建 SSH 密钥命令**

```rust
// src-tauri/src/commands/ssh_key.rs
use crate::models::key::{SshAlgorithm, SshKey};
use crate::services::ssh_key_service::SshKeyService;
use crate::utils::error::AppError;
use tauri::AppHandle;

#[tauri::command]
pub async fn list_ssh_keys(app: AppHandle) -> Result<Vec<SshKey>, AppError> {
    SshKeyService::list_keys(&app)
}

#[tauri::command]
pub async fn generate_ssh_key(
    app: AppHandle,
    name: String,
    algorithm: SshAlgorithm,
    comment: Option<String>,
) -> Result<SshKey, AppError> {
    SshKeyService::generate_key(&app, name, algorithm, comment)
}

#[tauri::command]
pub async fn import_ssh_key(
    app: AppHandle,
    source_path: String,
    name: String,
) -> Result<SshKey, AppError> {
    SshKeyService::import_key(&app, source_path, name)
}

#[tauri::command]
pub async fn delete_ssh_key(
    app: AppHandle,
    key_id: String,
) -> Result<(), AppError> {
    SshKeyService::delete_key(&app, key_id)
}

#[tauri::command]
pub async fn get_ssh_public_key(
    public_key_path: String,
) -> Result<String, AppError> {
    SshKeyService::get_public_key(public_key_path)
}
```

- [ ] **Step 2: 更新 commands/mod.rs**

```rust
// src-tauri/src/commands/mod.rs
pub mod ssh_key;
pub mod gpg_key;
pub mod repo_key;

pub use ssh_key::*;
pub use gpg_key::*;
pub use repo_key::*;
```

- [ ] **Step 3: 更新 lib.rs 注册命令**

```rust
// src-tauri/src/lib.rs
mod commands;
mod models;
mod services;
mod utils;

pub use commands::{ssh_key, gpg_key, repo_key};
pub use models::*;
pub use services::*;
pub use utils::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            // 现有命令...
            // SSH 密钥命令
            commands::list_ssh_keys,
            commands::generate_ssh_key,
            commands::import_ssh_key,
            commands::delete_ssh_key,
            commands::get_ssh_public_key,
            // GPG 密钥命令
            commands::list_gpg_keys,
            commands::generate_gpg_key,
            commands::import_gpg_key,
            commands::export_gpg_public_key,
            commands::delete_gpg_key,
            // 仓库密钥配置命令
            commands::get_repo_key_config,
            commands::set_repo_ssh_key,
            commands::set_repo_gpg_key,
            // ssh-agent 命令
            commands::add_key_to_agent,
            commands::remove_key_from_agent,
            commands::is_key_in_agent,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 4: 提交**

```bash
git add src-tauri/src/commands/ssh_key.rs src-tauri/src/commands/mod.rs src-tauri/src/lib.rs
git commit -m "feat(keys): add SSH key Tauri commands"
```

---

#### Task 4: 创建 ssh-agent 工具和命令

**Files:**
- Create: `src-tauri/src/utils/ssh_agent.rs`
- Modify: `src-tauri/src/utils/mod.rs`
- Modify: `src-tauri/src/commands/ssh_key.rs`

- [ ] **Step 1: 创建 ssh-agent 工具**

```rust
// src-tauri/src/utils/ssh_agent.rs
use crate::utils::error::AppError;
use std::process::Command;

pub struct SshAgent;

impl SshAgent {
    pub fn is_agent_running() -> bool {
        std::env::var("SSH_AUTH_SOCK").is_ok()
    }

    pub fn add_key(path: &str) -> Result<(), AppError> {
        let output = Command::new("ssh-add")
            .arg(path)
            .output()
            .map_err(|e| AppError::Credential(format!("Failed to run ssh-add: {}", e)))?;

        if !output.status.success() {
            return Err(AppError::Credential(
                String::from_utf8_lossy(&output.stderr).to_string()
            ));
        }
        Ok(())
    }

    pub fn remove_key(path: &str) -> Result<(), AppError> {
        let output = Command::new("ssh-add")
            .arg("-d")
            .arg(path)
            .output()
            .map_err(|e| AppError::Credential(format!("Failed to run ssh-add: {}", e)))?;

        if !output.status.success() {
            return Err(AppError::Credential(
                String::from_utf8_lossy(&output.stderr).to_string()
            ));
        }
        Ok(())
    }

    pub fn list_loaded_keys() -> Result<Vec<String>, AppError> {
        let output = Command::new("ssh-add")
            .arg("-l")
            .output()
            .map_err(|e| AppError::Credential(format!("Failed to run ssh-add: {}", e)))?;

        if !output.status.success() && !output.status.code().map(|c| c == 1).unwrap_or(false) {
            return Err(AppError::Credential(
                String::from_utf8_lossy(&output.stderr).to_string()
            ));
        }

        let output_str = String::from_utf8_lossy(&output.stdout);
        let keys: Vec<String> = output_str
            .lines()
            .map(|l| l.to_string())
            .collect();
        Ok(keys)
    }

    pub fn is_key_loaded(fingerprint: &str) -> Result<bool, AppError> {
        let loaded_keys = Self::list_loaded_keys()?;
        Ok(loaded_keys.iter().any(|k| k.contains(fingerprint)))
    }
}
```

- [ ] **Step 2: 更新 utils/mod.rs**

```rust
// src-tauri/src/utils/mod.rs
pub mod credential;
pub mod error;
pub mod ssh_agent;

pub use credential::*;
pub use error::*;
pub use ssh_agent::*;
```

- [ ] **Step 3: 更新 ssh_key.rs 添加 agent 命令**

```rust
// 在 src-tauri/src/commands/ssh_key.rs 添加

#[tauri::command]
pub async fn add_key_to_agent(
    private_key_path: String,
) -> Result<(), AppError> {
    SshAgent::add_key(&private_key_path)
}

#[tauri::command]
pub async fn remove_key_from_agent(
    public_key_path: String,
) -> Result<(), AppError> {
    SshAgent::remove_key(&public_key_path)
}

#[tauri::command]
pub async fn is_key_in_agent(
    fingerprint: String,
) -> Result<bool, AppError> {
    SshAgent::is_key_loaded(&fingerprint)
}
```

- [ ] **Step 4: 提交**

```bash
git add src-tauri/src/utils/ssh_agent.rs src-tauri/src/utils/mod.rs src-tauri/src/commands/ssh_key.rs
git commit -m "feat(keys): add ssh-agent integration commands"
```

---

#### Task 5: 创建 GPG 密钥服务和命令

**Files:**
- Create: `src-tauri/src/services/gpg_key_service.rs`
- Modify: `src-tauri/src/services/mod.rs`
- Create: `src-tauri/src/commands/gpg_key.rs`

- [ ] **Step 1: 创建 GPG 密钥服务**

```rust
// src-tauri/src/services/gpg_key_service.rs
use crate::models::key::{GpgKey, GpgSubkey};
use crate::utils::error::AppError;
use std::process::Command;

pub struct GpgKeyService;

impl GpgKeyService {
    pub fn is_gpg_available() -> bool {
        Command::new("gpg")
            .arg("--version")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }

    pub fn list_keys() -> Result<Vec<GpgKey>, AppError> {
        let output = Command::new("gpg")
            .arg("--list-secret-keys")
            .arg("--with-colons")
            .output()
            .map_err(|e| AppError::Credential(format!("Failed to run gpg: {}", e)))?;

        if !output.status.success() {
            return Err(AppError::Credential(
                String::from_utf8_lossy(&output.stderr).to_string()
            ));
        }

        let output_str = String::from_utf8_lossy(&output.stdout);
        Self::parse_gpg_output(&output_str)
    }

    fn parse_gpg_output(output: &str) -> Result<Vec<GpgKey>, AppError> {
        let mut keys: Vec<GpgKey> = Vec::new();
        let mut current_key: Option<GpgKey> = None;
        let mut current_subkeys: Vec<GpgSubkey> = Vec::new();
        let mut current_user_ids: Vec<String> = Vec::new();

        for line in output.lines() {
            let parts: Vec<&str> = line.split(':').collect();
            if parts.len() < 2 {
                continue;
            }

            match parts[0] {
                "sec" | "ssb" => {
                    if let Some(ref key) = current_key {
                        let mut key_clone = key.clone();
                        key_clone.subkeys = current_subkeys.clone();
                        keys.push(key_clone);
                    }
                    current_subkeys.clear();
                    current_user_ids.clear();

                    if parts[0] == "sec" {
                        let key_id = parts[4].to_string();
                        let fingerprint = parts[9].to_string();
                        let algorithm = Self::parse_algorithm(parts[1]);
                        let length: u32 = parts[2].parse().unwrap_or(0);
                        let created_at = Self::parse_date(parts[5]);
                        let expires_at = if parts[6].is_empty() { None } else { Some(Self::parse_date(parts[6])) };

                        current_key = Some(GpgKey {
                            id: key_id,
                            fingerprint,
                            user_ids: Vec::new(),
                            created_at,
                            expires_at,
                            algorithm,
                            length,
                            subkeys: Vec::new(),
                        });
                    }
                }
                "uid" => {
                    if let Some(ref mut key) = current_key {
                        if parts.len() > 9 {
                            key.user_ids.push(parts[9].to_string());
                        }
                    }
                }
                "sub" | "ssb" => {
                    if parts.len() >= 10 {
                        current_subkeys.push(GpgSubkey {
                            id: parts[4].to_string(),
                            fingerprint: parts[9].to_string(),
                            algorithm: Self::parse_algorithm(parts[1]),
                            length: parts[2].parse().unwrap_or(0),
                            expires_at: if parts[6].is_empty() { None } else { Some(Self::parse_date(parts[6])) },
                        });
                    }
                }
                _ => {}
            }
        }

        if let Some(key) = current_key {
            let mut key_clone = key;
            key_clone.subkeys = current_subkeys;
            keys.push(key_clone);
        }

        Ok(keys)
    }

    fn parse_algorithm(algo_code: &str) -> String {
        match algo_code {
            "1" => "RSA".to_string(),
            "17" => "DSA".to_string(),
            "16" => "ElGamal".to_string(),
            "19" => "ECDSA".to_string(),
            "22" => "EdDSA".to_string(),
            _ => algo_code.to_string(),
        }
    }

    fn parse_date(date_str: &str) -> String {
        if let Ok(timestamp) = date_str.parse::<i64>() {
            chrono::DateTime::from_timestamp(timestamp, 0)
                .map(|dt| dt.to_rfc3339())
                .unwrap_or_else(|| date_str.to_string())
        } else {
            date_str.to_string()
        }
    }

    pub fn export_public_key(key_id: &str) -> Result<String, AppError> {
        let output = Command::new("gpg")
            .arg("--armor")
            .arg("--export")
            .arg(key_id)
            .output()
            .map_err(|e| AppError::Credential(format!("Failed to run gpg: {}", e)))?;

        if !output.status.success() {
            return Err(AppError::Credential(
                String::from_utf8_lossy(&output.stderr).to_string()
            ));
        }

        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    }

    pub fn import_key(key_data: &str) -> Result<(), AppError> {
        use std::io::Write;
        let mut child = Command::new("gpg")
            .arg("--import")
            .stdin(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| AppError::Credential(format!("Failed to spawn gpg: {}", e)))?;

        if let Some(ref mut stdin) = child.stdin {
            stdin.write_all(key_data.as_bytes())
                .map_err(|e| AppError::Credential(format!("Failed to write to gpg: {}", e)))?;
        }

        let output = child.wait_with_output()
            .map_err(|e| AppError::Credential(format!("Failed to wait for gpg: {}", e)))?;

        if !output.status.success() {
            return Err(AppError::Credential(
                String::from_utf8_lossy(&output.stderr).to_string()
            ));
        }

        Ok(())
    }

    pub fn delete_key(key_id: &str) -> Result<(), AppError> {
        // 删除私钥
        let output = Command::new("gpg")
            .arg("--delete-secret-keys")
            .arg(key_id)
            .output()
            .map_err(|e| AppError::Credential(format!("Failed to run gpg: {}", e)))?;

        if !output.status.success() {
            return Err(AppError::Credential(
                String::from_utf8_lossy(&output.stderr).to_string()
            ));
        }

        // 删除公钥
        let output = Command::new("gpg")
            .arg("--delete-keys")
            .arg(key_id)
            .output()
            .map_err(|e| AppError::Credential(format!("Failed to run gpg: {}", e)))?;

        if !output.status.success() {
            return Err(AppError::Credential(
                String::from_utf8_lossy(&output.stderr).to_string()
            ));
        }

        Ok(())
    }
}
```

- [ ] **Step 2: 创建 GPG 密钥命令**

```rust
// src-tauri/src/commands/gpg_key.rs
use crate::models::key::GpgKey;
use crate::services::gpg_key_service::GpgKeyService;
use crate::utils::error::AppError;

#[tauri::command]
pub async fn list_gpg_keys() -> Result<Vec<GpgKey>, AppError> {
    if !GpgKeyService::is_gpg_available() {
        return Err(AppError::Credential("GPG is not installed".into()));
    }
    GpgKeyService::list_keys()
}

#[tauri::command]
pub async fn export_gpg_public_key(key_id: String) -> Result<String, AppError> {
    if !GpgKeyService::is_gpg_available() {
        return Err(AppError::Credential("GPG is not installed".into()));
    }
    GpgKeyService::export_public_key(&key_id)
}

#[tauri::command]
pub async fn import_gpg_key(key_data: String) -> Result<(), AppError> {
    if !GpgKeyService::is_gpg_available() {
        return Err(AppError::Credential("GPG is not installed".into()));
    }
    GpgKeyService::import_key(&key_data)
}

#[tauri::command]
pub async fn delete_gpg_key(key_id: String) -> Result<(), AppError> {
    if !GpgKeyService::is_gpg_available() {
        return Err(AppError::Credential("GPG is not installed".into()));
    }
    GpgKeyService::delete_key(&key_id)
}
```

- [ ] **Step 3: 提交**

```bash
git add src-tauri/src/services/gpg_key_service.rs src-tauri/src/commands/gpg_key.rs
git commit -m "feat(keys): add GPG key service and commands"
```

---

#### Task 6: 创建仓库密钥配置服务和命令

**Files:**
- Create: `src-tauri/src/commands/repo_key.rs`
- Modify: `src-tauri/src/commands/mod.rs`

- [ ] **Step 1: 创建仓库密钥配置命令**

```rust
// src-tauri/src/commands/repo_key.rs
use crate::models::key::RepoKeyConfig;
use crate::utils::error::AppError;
use git2::Repository;
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;

fn get_repo_key_configs_path(app: &AppHandle) -> Result<PathBuf, AppError> {
    let dir = app.path().app_data_dir()
        .map_err(|e| AppError::Credential(e.to_string()))?;
    fs::create_dir_all(&dir)?;
    Ok(dir.join("repo_key_configs.json"))
}

fn load_configs(app: &AppHandle) -> Result<Vec<RepoKeyConfig>, AppError> {
    let path = get_repo_key_configs_path(app)?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let data = fs::read_to_string(&path)?;
    serde_json::from_str(&data)
        .map_err(|e| AppError::Credential(e.to_string()))
}

fn save_configs(app: &AppHandle, configs: &[RepoKeyConfig]) -> Result<(), AppError> {
    let path = get_repo_key_configs_path(app)?;
    let data = serde_json::to_string_pretty(configs)
        .map_err(|e| AppError::Credential(e.to_string()))?;
    fs::write(&path, data)
}

fn generate_repo_id(repo_path: &str) -> Result<String, AppError> {
    let repo = Repository::open(repo_path)
        .map_err(|e| AppError::Credential(format!("Failed to open repo: {}", e)))?;

    if let Ok(remote) = repo.find_remote("origin") {
        let url = remote.url().unwrap_or("").to_string();
        let head = repo.head()
            .map(|h| h.name().unwrap_or("").to_string())
            .unwrap_or_default();
        if !url.is_empty() {
            return Ok(format!("{}#{}", url, head));
        }
    }

    // 无 remote，使用路径哈希
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    let mut hasher = DefaultHasher::new();
    repo_path.hash(&mut hasher);
    Ok(format!("local:{:x}", hasher.finish()))
}

#[tauri::command]
pub async fn get_repo_key_config(
    app: AppHandle,
    repo_path: String,
) -> Result<RepoKeyConfig, AppError> {
    let repo_id = generate_repo_id(&repo_path)?;
    let configs = load_configs(&app)?;

    Ok(configs.into_iter()
        .find(|c| c.repo_id == repo_id)
        .unwrap_or_else(|| RepoKeyConfig {
            repo_id,
            repo_path,
            ssh_key_id: None,
            gpg_key_id: None,
            use_ssh_agent: false,
        }))
}

#[tauri::command]
pub async fn set_repo_ssh_key(
    app: AppHandle,
    repo_path: String,
    key_id: Option<String>,
) -> Result<(), AppError> {
    let repo_id = generate_repo_id(&repo_path)?;
    let mut configs = load_configs(&app)?;

    if let Some(config) = configs.iter_mut().find(|c| c.repo_id == repo_id) {
        config.ssh_key_id = key_id;
    } else {
        configs.push(RepoKeyConfig {
            repo_id,
            repo_path,
            ssh_key_id: key_id,
            gpg_key_id: None,
            use_ssh_agent: false,
        });
    }

    save_configs(&app, &configs)
}

#[tauri::command]
pub async fn set_repo_gpg_key(
    app: AppHandle,
    repo_path: String,
    key_id: Option<String>,
) -> Result<(), AppError> {
    let repo_id = generate_repo_id(&repo_path)?;
    let mut configs = load_configs(&app)?;

    if let Some(config) = configs.iter_mut().find(|c| c.repo_id == repo_id) {
        config.gpg_key_id = key_id;
    } else {
        configs.push(RepoKeyConfig {
            repo_id,
            repo_path,
            ssh_key_id: None,
            gpg_key_id: key_id,
            use_ssh_agent: false,
        });
    }

    save_configs(&app, &configs)
}
```

- [ ] **Step 2: 提交**

```bash
git add src-tauri/src/commands/repo_key.rs
git commit -m "feat(keys): add repo key config commands"
```

---

### Phase 2: 前端组件开发

#### Task 7: 创建前端 IPC 封装

**Files:**
- Create: `src/utils/keys.ts`

- [ ] **Step 1: 创建 IPC 封装**

```typescript
// src/utils/keys.ts
import { invoke } from '@tauri-apps/api/core';
import type { SshKey, GpgKey, RepoKeyConfig, SshAlgorithm } from '../types/key';

export const sshKeyApi = {
  list: () => invoke<SshKey[]>('list_ssh_keys'),

  generate: (name: string, algorithm: SshAlgorithm, comment?: string) =>
    invoke<SshKey>('generate_ssh_key', { name, algorithm, comment }),

  import: (sourcePath: string, name: string) =>
    invoke<SshKey>('import_ssh_key', { sourcePath, name }),

  delete: (keyId: string) =>
    invoke<void>('delete_ssh_key', { keyId }),

  getPublicKey: (publicKeyPath: string) =>
    invoke<string>('get_ssh_public_key', { publicKeyPath }),

  addToAgent: (privateKeyPath: string) =>
    invoke<void>('add_key_to_agent', { privateKeyPath }),

  removeFromAgent: (publicKeyPath: string) =>
    invoke<void>('remove_key_from_agent', { publicKeyPath }),

  isInAgent: (fingerprint: string) =>
    invoke<boolean>('is_key_in_agent', { fingerprint }),
};

export const gpgKeyApi = {
  list: () => invoke<GpgKey[]>('list_gpg_keys'),

  exportPublicKey: (keyId: string) =>
    invoke<string>('export_gpg_public_key', { keyId }),

  import: (keyData: string) =>
    invoke<void>('import_gpg_key', { keyData }),

  delete: (keyId: string) =>
    invoke<void>('delete_gpg_key', { keyId }),
};

export const repoKeyApi = {
  getConfig: (repoPath: string) =>
    invoke<RepoKeyConfig>('get_repo_key_config', { repoPath }),

  setSshKey: (repoPath: string, keyId?: string) =>
    invoke<void>('set_repo_ssh_key', { repoPath, keyId }),

  setGpgKey: (repoPath: string, keyId?: string) =>
    invoke<void>('set_repo_gpg_key', { repoPath, keyId }),
};
```

- [ ] **Step 2: 提交**

```bash
git add src/utils/keys.ts
git commit -m "feat(keys): add IPC API wrappers for key management"
```

---

#### Task 8: 创建 SSH 密钥列表组件

**Files:**
- Create: `src/components/settings/SshKeyList.vue`
- Create: `src/components/settings/SshKeyItem.vue`

- [ ] **Step 1: 创建 SshKeyItem.vue**

```vue
<template>
  <div class="flex items-center justify-between p-3 border-b border-gray-700 hover:bg-gray-800/50">
    <div class="flex items-center gap-3">
      <n-icon :component="KeyIcon" size="20" />
      <div>
        <div class="font-medium">{{ key.name }}</div>
        <div class="text-xs text-gray-400">
          {{ algorithmLabel }} • {{ key.fingerprint.substring(0, 16) }}...
          <n-tag v-if="isInAgent" size="tiny" type="success">Agent</n-tag>
        </div>
        <div class="text-xs text-gray-500">创建于 {{ formatDate(key.created_at) }}</div>
      </div>
    </div>
    <div class="flex gap-2">
      <n-button size="small" @click="$emit('view', key)">查看公钥</n-button>
      <n-button size="small" @click="$emit('copy', key)">复制</n-button>
      <n-button
        v-if="!isInAgent"
        size="small"
        type="primary"
        ghost
        @click="$emit('addToAgent', key)"
      >
        添加到 Agent
      </n-button>
      <n-button
        v-else
        size="small"
        type="warning"
        ghost
        @click="$emit('removeFromAgent', key)"
      >
        移除
      </n-button>
      <n-popconfirm @positive-click="$emit('delete', key)">
        <template #trigger>
          <n-button size="small" type="error" ghost>删除</n-button>
        </template>
        确定要删除密钥 "{{ key.name }}" 吗？此操作不可撤销。
      </n-popconfirm>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NIcon, NButton, NTag, NPopconfirm } from 'naive-ui';
import { KeyRound as KeyIcon } from 'lucide-vue-next';
import type { SshKey } from '../../types/key';
import { SshAlgorithm } from '../../types/key';

const props = defineProps<{
  key: SshKey;
  isInAgent: boolean;
}>();

defineEmits<{
  view: [key: SshKey];
  copy: [key: SshKey];
  delete: [key: SshKey];
  addToAgent: [key: SshKey];
  removeFromAgent: [key: SshKey];
}>();

const algorithmLabel = computed(() => {
  switch (props.key.algorithm) {
    case SshAlgorithm.Ed25519: return 'Ed25519';
    case SshAlgorithm.Rsa: return 'RSA';
    case SshAlgorithm.Ecdsa: return 'ECDSA';
    default: return props.key.algorithm;
  }
});

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString();
}
</script>
```

- [ ] **Step 2: 创建 SshKeyList.vue**

```vue
<template>
  <div class="space-y-2">
    <div v-if="keys.length === 0" class="text-center py-8 text-gray-400">
      暂无 SSH 密钥
    </div>
    <ssh-key-item
      v-for="key in keys"
      :key="key.id"
      :ssh-key="key"
      :is-in-agent="loadedAgentKeys.includes(key.fingerprint)"
      @view="handleView"
      @copy="handleCopy"
      @delete="handleDelete"
      @add-to-agent="handleAddToAgent"
      @remove-from-agent="handleRemoveFromAgent"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useMessage } from 'naive-ui';
import SshKeyItem from './SshKeyItem.vue';
import type { SshKey } from '../../types/key';
import { sshKeyApi } from '../../utils/keys';

const props = defineProps<{
  keys: SshKey[];
}>();

const emit = defineEmits<{
  refresh: [];
}>();

const message = useMessage();
const loadedAgentKeys = ref<string[]>([]);

async function loadAgentKeys() {
  try {
    const keys = await sshKeyApi.list();
    const fingerprints = await Promise.all(
      keys.map(async (k) => {
        const inAgent = await sshKeyApi.isInAgent(k.fingerprint);
        return inAgent ? k.fingerprint : null;
      })
    );
    loadedAgentKeys.value = fingerprints.filter(Boolean) as string[];
  } catch {
    // ignore
  }
}

async function handleView(key: SshKey) {
  // TODO: 打开查看公钥对话框
}

async function handleCopy(key: SshKey) {
  try {
    const content = await sshKeyApi.getPublicKey(key.public_key_path);
    await navigator.clipboard.writeText(content);
    message.success('公钥已复制到剪贴板');
  } catch (e) {
    message.error(`复制失败: ${e}`);
  }
}

async function handleDelete(key: SshKey) {
  try {
    await sshKeyApi.delete(key.id);
    message.success('密钥已删除');
    emit('refresh');
  } catch (e) {
    message.error(`删除失败: ${e}`);
  }
}

async function handleAddToAgent(key: SshKey) {
  try {
    await sshKeyApi.addToAgent(key.private_key_path);
    message.success('密钥已添加到 ssh-agent');
    await loadAgentKeys();
  } catch (e) {
    message.error(`添加失败: ${e}`);
  }
}

async function handleRemoveFromAgent(key: SshKey) {
  try {
    await sshKeyApi.removeFromAgent(key.public_key_path);
    message.success('密钥已从 ssh-agent 移除');
    await loadAgentKeys();
  } catch (e) {
    message.error(`移除失败: ${e}`);
  }
}

onMounted(() => {
  loadAgentKeys();
});
</script>
```

- [ ] **Step 3: 提交**

```bash
git add src/components/settings/SshKeyList.vue src/components/settings/SshKeyItem.vue
git commit -m "feat(keys): add SSH key list components"
```

---

#### Task 9: 创建 SSH 密钥生成和导入对话框

**Files:**
- Create: `src/components/settings/SshKeyGenerator.vue`
- Create: `src/components/settings/SshKeyImport.vue`

- [ ] **Step 1: 创建 SshKeyGenerator.vue**

```vue
<template>
  <n-modal v-model:show="showModal" preset="card" title="生成新 SSH 密钥" style="width: 500px">
    <n-form label-placement="left" label-width="100">
      <n-form-item label="密钥名称">
        <n-input v-model:value="form.name" placeholder="例如: work-key" />
      </n-form-item>
      <n-form-item label="算法">
        <n-select
          v-model:value="form.algorithm"
          :options="algorithmOptions"
        />
      </n-form-item>
      <n-form-item label="注释 (可选)">
        <n-input v-model:value="form.comment" placeholder="例如: user@example.com" />
      </n-form-item>
    </n-form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <n-button @click="showModal = false">取消</n-button>
        <n-button type="primary" :loading="loading" @click="handleGenerate">生成</n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { NModal, NForm, NFormItem, NInput, NSelect, NButton, useMessage } from 'naive-ui';
import { sshKeyApi } from '../../utils/keys';
import { SshAlgorithm } from '../../types/key';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  success: [];
}>();

const message = useMessage();
const loading = ref(false);
const form = ref({
  name: '',
  algorithm: SshAlgorithm.Ed25519,
  comment: '',
});

const showModal = ref(false);
const algorithmOptions = [
  { label: 'Ed25519 (推荐)', value: SshAlgorithm.Ed25519 },
  { label: 'RSA 4096', value: SshAlgorithm.Rsa },
  { label: 'ECDSA', value: SshAlgorithm.Ecdsa },
];

watch(() => props.modelValue, (val) => {
  showModal.value = val;
});

watch(showModal, (val) => {
  emit('update:modelValue', val);
});

async function handleGenerate() {
  if (!form.value.name.trim()) {
    message.warning('请输入密钥名称');
    return;
  }

  loading.value = true;
  try {
    await sshKeyApi.generate(
      form.value.name,
      form.value.algorithm,
      form.value.comment || undefined
    );
    message.success('密钥生成成功！请记得备份私钥。');
    showModal.value = false;
    form.value = { name: '', algorithm: SshAlgorithm.Ed25519, comment: '' };
    emit('success');
  } catch (e) {
    message.error(`生成失败: ${e}`);
  } finally {
    loading.value = false;
  }
}
</script>
```

- [ ] **Step 2: 创建 SshKeyImport.vue**

```vue
<template>
  <n-modal v-model:show="showModal" preset="card" title="导入 SSH 密钥" style="width: 500px">
    <n-form label-placement="left" label-width="100">
      <n-form-item label="密钥名称">
        <n-input v-model:value="form.name" placeholder="例如: imported-key" />
      </n-form-item>
      <n-form-item label="私钥文件">
        <n-input
          v-model:value="form.sourcePath"
          placeholder="/path/to/private/key"
          readonly
        />
        <n-button class="mt-2" @click="selectFile">选择文件</n-button>
      </n-form-item>
    </n-form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <n-button @click="showModal = false">取消</n-button>
        <n-button type="primary" :loading="loading" @click="handleImport">导入</n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { NModal, NForm, NFormItem, NInput, NButton, useMessage } from 'naive-ui';
import { open } from '@tauri-apps/plugin-dialog';
import { sshKeyApi } from '../../utils/keys';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  success: [];
}>();

const message = useMessage();
const loading = ref(false);
const form = ref({
  name: '',
  sourcePath: '',
});

const showModal = ref(false);

watch(() => props.modelValue, (val) => {
  showModal.value = val;
});

watch(showModal, (val) => {
  emit('update:modelValue', val);
});

async function selectFile() {
  try {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'Private Key', extensions: ['pem', 'key', 'ppk', ''] }],
    });
    if (selected) {
      form.value.sourcePath = selected as string;
      if (!form.value.name) {
        const filename = (selected as string).split(/[/\\]/).pop() || '';
        form.value.name = filename.replace(/\.[^.]+$/, '');
      }
    }
  } catch {
    // ignore
  }
}

async function handleImport() {
  if (!form.value.name.trim()) {
    message.warning('请输入密钥名称');
    return;
  }
  if (!form.value.sourcePath) {
    message.warning('请选择私钥文件');
    return;
  }

  loading.value = true;
  try {
    await sshKeyApi.import(form.value.sourcePath, form.value.name);
    message.success('密钥导入成功！');
    showModal.value = false;
    form.value = { name: '', sourcePath: '' };
    emit('success');
  } catch (e) {
    message.error(`导入失败: ${e}`);
  } finally {
    loading.value = false;
  }
}
</script>
```

- [ ] **Step 3: 提交**

```bash
git add src/components/settings/SshKeyGenerator.vue src/components/settings/SshKeyImport.vue
git commit -m "feat(keys): add SSH key generator and import dialogs"
```

---

#### Task 10: 创建 SSH 密钥管理主组件

**Files:**
- Create: `src/components/settings/SshKeyManager.vue`

- [ ] **Step 1: 创建 SshKeyManager.vue**

```vue
<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <h3 class="text-lg font-medium">SSH 密钥</h3>
      <div class="flex gap-2">
        <n-button type="primary" @click="showGenerator = true">
          <template #icon>
            <PlusIcon />
          </template>
          生成新密钥
        </n-button>
        <n-button @click="showImporter = true">
          <template #icon>
            <UploadIcon />
          </template>
          导入密钥
        </n-button>
      </div>
    </div>

    <ssh-key-list
      :keys="keys"
      @refresh="loadKeys"
    />

    <ssh-key-generator v-model="showGenerator" @success="loadKeys" />
    <ssh-key-import v-model="showImporter" @success="loadKeys" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { NButton, useMessage } from 'naive-ui';
import { Plus as PlusIcon, Upload as UploadIcon } from 'lucide-vue-next';
import SshKeyList from './SshKeyList.vue';
import SshKeyGenerator from './SshKeyGenerator.vue';
import SshKeyImport from './SshKeyImport.vue';
import type { SshKey } from '../../types/key';
import { sshKeyApi } from '../../utils/keys';

const message = useMessage();
const keys = ref<SshKey[]>([]);
const showGenerator = ref(false);
const showImporter = ref(false);

async function loadKeys() {
  try {
    keys.value = await sshKeyApi.list();
  } catch (e) {
    message.error(`加载密钥失败: ${e}`);
  }
}

onMounted(() => {
  loadKeys();
});
</script>
```

- [ ] **Step 2: 提交**

```bash
git add src/components/settings/SshKeyManager.vue
git commit -m "feat(keys): add SSH key manager main component"
```

---

#### Task 11: 创建 GPG 密钥管理组件

**Files:**
- Create: `src/components/settings/GpgKeyManager.vue`
- Create: `src/components/settings/GpgKeyList.vue`
- Create: `src/components/settings/GpgKeyItem.vue`

- [ ] **Step 1: 创建 GpgKeyItem.vue**

```vue
<template>
  <div class="flex items-center justify-between p-3 border-b border-gray-700 hover:bg-gray-800/50">
    <div class="flex items-center gap-3">
      <n-icon :component="ShieldIcon" size="20" />
      <div>
        <div class="font-medium">{{ key.user_ids[0] || key.id }}</div>
        <div class="text-xs text-gray-400">
          {{ key.algorithm }} {{ key.length }}位
          • {{ key.fingerprint.substring(0, 16) }}...
        </div>
        <div v-if="key.expires_at" class="text-xs text-gray-500">
          过期: {{ formatDate(key.expires_at) }}
        </div>
      </div>
    </div>
    <div class="flex gap-2">
      <n-button size="small" @click="$emit('export', key)">导出公钥</n-button>
      <n-popconfirm @positive-click="$emit('delete', key)">
        <template #trigger>
          <n-button size="small" type="error" ghost>删除</n-button>
        </template>
        确定要删除此 GPG 密钥吗？
      </n-popconfirm>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NIcon, NButton, NPopconfirm } from 'naive-ui';
import { ShieldCheck as ShieldIcon } from 'lucide-vue-next';
import type { GpgKey } from '../../types/key';

defineProps<{
  key: GpgKey;
}>();

defineEmits<{
  export: [key: GpgKey];
  delete: [key: GpgKey];
}>();

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString();
}
</script>
```

- [ ] **Step 2: 创建 GpgKeyList.vue**

```vue
<template>
  <div class="space-y-2">
    <div v-if="keys.length === 0" class="text-center py-8 text-gray-400">
      暂无 GPG 密钥
    </div>
    <gpg-key-item
      v-for="key in keys"
      :key="key.id"
      :gpg-key="key"
      @export="handleExport"
      @delete="handleDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { useMessage } from 'naive-ui';
import GpgKeyItem from './GpgKeyItem.vue';
import type { GpgKey } from '../../types/key';
import { gpgKeyApi } from '../../utils/keys';

defineProps<{
  keys: GpgKey[];
}>();

const emit = defineEmits<{
  refresh: [];
}>();

const message = useMessage();

async function handleExport(key: GpgKey) {
  try {
    const content = await gpgKeyApi.exportPublicKey(key.id);
    await navigator.clipboard.writeText(content);
    message.success('公钥已复制到剪贴板');
  } catch (e) {
    message.error(`导出失败: ${e}`);
  }
}

async function handleDelete(key: GpgKey) {
  try {
    await gpgKeyApi.delete(key.id);
    message.success('密钥已删除');
    emit('refresh');
  } catch (e) {
    message.error(`删除失败: ${e}`);
  }
}
</script>
```

- [ ] **Step 3: 创建 GpgKeyManager.vue**

```vue
<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <h3 class="text-lg font-medium">GPG 密钥</h3>
      <n-alert v-if="!isGpgAvailable" type="warning">
        GPG 未安装，请先安装 GPG 工具
      </n-alert>
    </div>

    <gpg-key-list :keys="keys" @refresh="loadKeys" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { NAlert, useMessage } from 'naive-ui';
import GpgKeyList from './GpgKeyList.vue';
import type { GpgKey } from '../../types/key';
import { gpgKeyApi } from '../../utils/keys';

const message = useMessage();
const keys = ref<GpgKey[]>([]);
const isGpgAvailable = ref(true);

async function loadKeys() {
  try {
    keys.value = await gpgKeyApi.list();
    isGpgAvailable.value = true;
  } catch (e) {
    isGpgAvailable.value = false;
    message.warning('无法加载 GPG 密钥，可能未安装 GPG');
  }
}

onMounted(() => {
  loadKeys();
});
</script>
```

- [ ] **Step 4: 提交**

```bash
git add src/components/settings/GpgKeyManager.vue src/components/settings/GpgKeyList.vue src/components/settings/GpgKeyItem.vue
git commit -m "feat(keys): add GPG key management components"
```

---

#### Task 12: 创建设置面板和集成

**Files:**
- Create: `src/components/settings/SettingsPanel.vue`
- Modify: `src/components/layout/AppLayout.vue` (添加设置入口)

- [ ] **Step 1: 创建 SettingsPanel.vue**

```vue
<template>
  <n-drawer v-model:show="showDrawer" :width="600" placement="right">
    <n-drawer-content title="设置">
      <n-tabs type="line" placement="left" tab-style="min-width: 120px">
        <n-tab-pane name="general" tab="通用">
          通用设置...
        </n-tab-pane>
        <n-tab-pane name="ssh-keys" tab="SSH 密钥">
          <ssh-key-manager />
        </n-tab-pane>
        <n-tab-pane name="gpg-keys" tab="GPG 密钥">
          <gpg-key-manager />
        </n-tab-pane>
      </n-tabs>
    </n-drawer-content>
  </n-drawer>
</template>

<script setup lang="ts">
import { NDrawer, NDrawerContent, NTabs, NTabPane } from 'naive-ui';
import SshKeyManager from './SshKeyManager.vue';
import GpgKeyManager from './GpgKeyManager.vue';

defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const showDrawer = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

import { computed } from 'vue';
import type { ComputedRef } from 'vue';

const props = defineProps<{
  modelValue: boolean;
}>();
</script>
```

- [ ] **Step 2: 提交**

```bash
git add src/components/settings/SettingsPanel.vue
git commit -m "feat(keys): add settings panel with key management tabs"
```

---

### Phase 3: 国际化

#### Task 13: 添加翻译

**Files:**
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/zh.json`

- [ ] **Step 1: 更新翻译文件**

```json
// zh.json 添加
{
  "settings": {
    "title": "设置",
    "tabs": {
      "general": "通用",
      "sshKeys": "SSH 密钥",
      "gpgKeys": "GPG 密钥"
    }
  },
  "sshKeys": {
    "title": "SSH 密钥管理",
    "generate": "生成新密钥",
    "import": "导入密钥",
    "noKeys": "暂无 SSH 密钥",
    "algorithm": {
      "ed25519": "Ed25519 (推荐)",
      "rsa": "RSA 4096",
      "ecdsa": "ECDSA"
    },
    "actions": {
      "viewPublic": "查看公钥",
      "copy": "复制",
      "addToAgent": "添加到 Agent",
      "removeFromAgent": "从 Agent 移除",
      "delete": "删除"
    },
    "messages": {
      "generateSuccess": "密钥生成成功！请记得备份私钥。",
      "importSuccess": "密钥导入成功！",
      "deleteConfirm": "确定要删除密钥 \"{name}\" 吗？此操作不可撤销。",
      "addToAgentSuccess": "密钥已添加到 ssh-agent",
      "removeFromAgentSuccess": "密钥已从 ssh-agent 移除",
      "copied": "公钥已复制到剪贴板"
    }
  },
  "gpgKeys": {
    "title": "GPG 密钥管理",
    "noKeys": "暂无 GPG 密钥",
    "notInstalled": "GPG 未安装，请先安装 GPG 工具",
    "actions": {
      "exportPublic": "导出公钥",
      "delete": "删除"
    },
    "messages": {
      "exportSuccess": "公钥已复制到剪贴板",
      "deleteConfirm": "确定要删除此 GPG 密钥吗？"
    }
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add src/i18n/locales/zh.json src/i18n/locales/en.json
git commit -m "feat(keys): add i18n translations for key management"
```

---

## 验收标准

- [ ] 可以生成 Ed25519/RSA 类型的 SSH 密钥
- [ ] 可以导入已有的 SSH 私钥
- [ ] 可以查看和复制 SSH 公钥
- [ ] 可以将密钥添加到 ssh-agent
- [ ] 可以列出系统中的 GPG 密钥
- [ ] 可以导出 GPG 公钥
- [ ] 密钥删除时有确认提示
- [ ] 所有操作都有适当的错误提示
