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
