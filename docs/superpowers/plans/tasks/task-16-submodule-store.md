# Task 16: Submodule — Store Frontend

> **Fase:** 3 — P2 Útil | **Dependências:** Task 15 (Submodule commands)
> **Plano original:** `docs/superpowers/plans/2026-05-17-git-client-features-implementation.md`

**Files:**
- Create: `git-client/src/stores/submodule.ts`
- Modify: `git-client/src/types/git.d.ts`

---

- [ ] **Step 1: Atualizar git.d.ts**

```typescript
export interface Submodule {
  name: string
  path: string
  url: string
  branch?: string
  sha: string
  is_initialized: boolean
}
```

- [ ] **Step 2: Criar stores/submodule.ts**

```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Submodule } from '../types/git'
import { invoke } from '../utils/ipc'

export const useSubmoduleStore = defineStore('submodule', () => {
  const submodules = ref<Submodule[]>([])

  async function listSubmodules(repoPath: string) {
    submodules.value = await invoke<Submodule[]>('list_submodules', { repoPath })
    return submodules.value
  }

  async function initSubmodule(repoPath: string, name: string) {
    await invoke<null>('init_submodule', { repoPath, name })
    await listSubmodules(repoPath)
  }

  async function updateSubmodule(repoPath: string, name: string, recursive = false) {
    await invoke<null>('update_submodule', { repoPath, name, recursive })
    await listSubmodules(repoPath)
  }

  return { submodules, listSubmodules, initSubmodule, updateSubmodule }
})
```

- [ ] **Step 3: Verificar tipos e Commit**

```bash
cd git-client && npx vue-tsc --noEmit
git add git-client/src/stores/submodule.ts git-client/src/types/git.d.ts
git commit -m "feat(submodule): add submodule store"
```
