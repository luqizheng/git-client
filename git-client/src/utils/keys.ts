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
