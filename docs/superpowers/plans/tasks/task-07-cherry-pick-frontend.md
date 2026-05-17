# Task 07: Cherry-pick — Integração Frontend

> **Fase:** 1 — P0 Core | **Dependências:** Task 06 (Cherry-pick command)
> **Plano original:** `docs/superpowers/plans/2026-05-17-git-client-features-implementation.md`

**Files:**
- Modify: `git-client/src/stores/commits.ts`

---

- [ ] **Step 1: Adicionar método cherryPick no useCommitsStore**

```typescript
  async function cherryPick(repoPath: string, commitId: string) {
    await invoke('cherry_pick', { repoPath, commitId })
  }
```

- [ ] **Step 2: Verificar tipos e Commit**

Run: `cd git-client && npx vue-tsc --noEmit`

```bash
git add git-client/src/stores/commits.ts
git commit -m "feat(commit): add cherryPick to commits store"
```
