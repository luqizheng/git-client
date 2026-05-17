# Task 04: Tag — Store Frontend e Tipos

> **Fase:** 1 — P0 Core | **Dependências:** Task 03 (Tag commands)
> **Plano original:** `docs/superpowers/plans/2026-05-17-git-client-features-implementation.md`

**Files:**
- Create: `git-client/src/stores/tags.ts`
- Modify: `git-client/src/types/git.d.ts`

---

- [ ] **Step 1: Atualizar git.d.ts — adicionar tipo Tag**

```typescript
export interface Tag {
  name: string
  target: string
  message?: string
  tagger?: string
  date?: string
}
```

- [ ] **Step 2: Criar stores/tags.ts**

```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Tag } from '../types/git'
import { invoke } from '../utils/ipc'

export const useTagsStore = defineStore('tags', () => {
  const tags = ref<Tag[]>([])

  async function listTags(repoPath: string) {
    tags.value = await invoke<Tag[]>('list_tags', { repoPath })
    return tags.value
  }

  async function createTag(repoPath: string, name: string, target: string, message?: string) {
    const tag = await invoke<Tag>('create_tag', { repoPath, name, target, message })
    await listTags(repoPath)
    return tag
  }

  async function deleteTag(repoPath: string, name: string) {
    await invoke<null>('delete_tag', { repoPath, name })
    await listTags(repoPath)
  }

  return { tags, listTags, createTag, deleteTag }
})
```

- [ ] **Step 3: Verificar tipos**

Run: `cd git-client && npx vue-tsc --noEmit`
Expected: SUCCESS

- [ ] **Step 4: Commit**

```bash
git add git-client/src/stores/tags.ts git-client/src/types/git.d.ts
git commit -m "feat(tag): add tags store and Tag type"
```
