import type { Commit, OpenRepo, Branch } from '../types/git'
import { useRepoStore } from '../stores/repo'

function sha(i: number): string {
  return 'a'.repeat(40 - i.toString(16).length) + i.toString(16)
}

const AUTHORS = [
  { name: 'Alice Chen', email: 'alice@example.com' },
  { name: 'Bob Wang', email: 'bob@example.com' },
  { name: 'Carol Lin', email: 'carol@example.com' },
  { name: 'David Zhang', email: 'david@example.com' },
]

const MAIN_MESSAGES = [
  'feat: add user authentication system',
  'fix: resolve memory leak in event handler',
  'docs: update API documentation',
  'refactor: extract shared utilities to utils module',
  'test: add unit tests for commit service',
  'chore: upgrade dependencies to latest versions',
  'perf: optimize database query with index',
  'style: format code with prettier',
  'feat: implement file upload component',
  'fix: handle edge case in date parsing',
  'docs: add contributing guidelines',
  'refactor: simplify state management flow',
  'test: increase coverage for diff module',
  'chore: configure CI/CD pipeline',
  'feat: add dark mode support',
  'fix: correct timezone offset calculation',
  'perf: lazy load heavy components',
  'style: consistent naming conventions',
  'feat: integrate Monaco editor for code view',
  'fix: prevent duplicate key in virtual list',
  'docs: write architecture decision record',
  'refactor: migrate from Options API to Composition API',
  'test: add e2e tests for staging workflow',
  'chore: clean up unused imports',
  'feat: support multiple repo tabs',
  'fix: race condition in async fetch',
  'perf: debounce search input',
  'style: align toolbar buttons',
  'feat: add branch visualization graph',
  'fix: scroll position reset on re-render',
  'docs: explain composable patterns',
  'refactor: split monolithic store into domains',
  'feat: implement drag-and-drop staging',
  'fix: clipboard API permission error handling',
  'chore: add .editorconfig',
  'feat: add cherry-pick context menu action',
  'fix: tag display overflow on long names',
  'perf: use IntersectionObserver for infinite scroll',
  'style: improve contrast ratio for accessibility',
]

const FEATURE_MESSAGES = [
  'feat(auth): add OAuth2 provider support',
  'feat(ui): redesign commit list layout',
  'feat(api): implement pagination endpoint',
  'feat(search): add fuzzy search algorithm',
  'feat(diff): support syntax highlighting',
  'fix(auth): refresh token before expiry',
  'fix(ui): close dropdown on escape key',
  'fix(api): handle empty response gracefully',
  'fix(search): debounce rapid queries',
  'fix(diff): render binary files correctly',
  'refactor(auth): extract token service',
  'refactor(ui): move modal to shared components',
  'refactor(api): use typed responses',
  'refactor(search): unify filter logic',
  'refactor(diff): abstract hunk parser',
]

const HOTFIX_MESSAGES = [
  'hotfix: patch critical security vulnerability',
  'hotfix: fix production crash on null pointer',
  'hotfix: revert breaking change from v2.1',
  'hotfix: correct database connection pool limit',
  'hotfix: fix corrupted index after force push',
]

export function generateMockCommits(count = 80): Commit[] {
  const rawCommits: Array<{
    idNum: number
    message: string
    authorIdx: number
    time: number
    lane: 'main' | 'featureA' | 'featureB' | 'hotfix'
    refs?: Array<{ name: string; type: 'local' | 'remote' | 'tag'; isHead?: boolean }>
    isMerge?: boolean
    mergeLane?: string
  }> = []
  const now = Date.now() / 1000
  let idCounter = count * 3

  for (let i = 0; i < count; i++) {
    const t = now - i * (3600 * 3 + Math.random() * 3600)
    const authorIdx = i % 4
    const refs: Array<{ name: string; type: 'local' | 'remote' | 'tag'; isHead?: boolean }> = []

    if (i === 0) {
      refs.push({ name: 'main', type: 'local', isHead: true })
      refs.push({ name: 'origin/main', type: 'remote' })
      refs.push({ name: 'v2.3.0', type: 'tag' })
    }
    if (i === 8) refs.push({ name: 'v2.2.0', type: 'tag' })
    if (i === 18) refs.push({ name: 'v2.1.0', type: 'tag' })

    rawCommits.push({
      idNum: idCounter--,
      message: MAIN_MESSAGES[i % MAIN_MESSAGES.length],
      authorIdx,
      time: t,
      lane: 'main',
      refs,
    })

    if (i < 6) {
      const hfRefs: Array<{ name: string; type: 'local' | 'remote' | 'tag'; isHead?: boolean }> = []
      if (i === 2) {
        hfRefs.push({ name: 'hotfix/v2.3.1', type: 'local' })
        hfRefs.push({ name: 'origin/hotfix/v2.3.1', type: 'remote' })
      }
      rawCommits.push({
        idNum: idCounter--,
        message: HOTFIX_MESSAGES[i % HOTFIX_MESSAGES.length],
        authorIdx: (authorIdx + 1) % 4,
        time: t - 60 * (5 - i),
        lane: 'hotfix',
        refs: hfRefs,
      })
    }

    if (i < 12) {
      const faRefs: Array<{ name: string; type: 'local' | 'remote' | 'tag'; isHead?: boolean }> = []
      if (i === 3) {
        faRefs.push({ name: 'feature/oauth2-provider', type: 'local' })
        faRefs.push({ name: 'origin/feature/oauth2-provider', type: 'remote' })
      }
      rawCommits.push({
        idNum: idCounter--,
        message: FEATURE_MESSAGES[i % FEATURE_MESSAGES.length],
        authorIdx: (authorIdx + 2) % 4,
        time: t - 180 * (11 - i),
        lane: 'featureA',
        refs: faRefs,
      })
    }

    if (i < 8) {
      const fbRefs: Array<{ name: string; type: 'local' | 'remote' | 'tag'; isHead?: boolean }> = []
      if (i === 3) {
        fbRefs.push({ name: 'feature/redesign-commit-list', type: 'local' })
      }
      rawCommits.push({
        idNum: idCounter--,
        message: FEATURE_MESSAGES[(i + 5) % FEATURE_MESSAGES.length],
        authorIdx: (authorIdx + 3) % 4,
        time: t - 420 * (7 - i),
        lane: 'featureB',
        refs: fbRefs,
      })
    }

    if (i === 4) {
      rawCommits.push({
        idNum: idCounter--,
        message: 'Merge hotfix/v2.3.1 into main',
        authorIdx: 0,
        time: t - 120,
        lane: 'main',
        isMerge: true,
        mergeLane: 'hotfix',
      })
    }
    if (i === 8) {
      rawCommits.push({
        idNum: idCounter--,
        message: 'Merge pull request #142 from feature/oauth2-provider',
        authorIdx: 1,
        time: t - 300,
        lane: 'main',
        isMerge: true,
        mergeLane: 'featureA',
      })
    }
    if (i === 5) {
      rawCommits.push({
        idNum: idCounter--,
        message: 'Merge pull request #128 from feature/redesign-commit-list',
        authorIdx: 2,
        time: t - 500,
        lane: 'main',
        isMerge: true,
        mergeLane: 'featureB',
      })
    }
  }

  rawCommits.sort((a, b) => b.time - a.time)

  const commits: Commit[] = rawCommits.map(rc => ({
    id: sha(rc.idNum),
    message: rc.message,
    author: AUTHORS[rc.authorIdx % AUTHORS.length].name,
    author_email: AUTHORS[rc.authorIdx % AUTHORS.length].email,
    time: Math.floor(rc.time),
    parent_ids: [] as string[],
    refs: (rc.refs ?? []).map(r => ({
      name: r.name,
      ref_type: r.type,
      is_head: r.isHead ?? false,
    })),
  }))

  for (let i = 0; i < commits.length; i++) {
    const rc = rawCommits[i]
    if (rc.isMerge && rc.mergeLane) {
      const mainParentIdx = rawCommits.findIndex((r, j) =>
        j > i && r.lane === 'main' && !r.isMerge
      )
      const branchParentIdx = rawCommits.findIndex((r, j) =>
        j > i && r.lane === rc.mergeLane
      )
      if (mainParentIdx >= 0) commits[i].parent_ids.push(commits[mainParentIdx].id)
      if (branchParentIdx >= 0) commits[i].parent_ids.push(commits[branchParentIdx].id)
      if (commits[i].parent_ids.length === 0 && i + 1 < commits.length) {
        commits[i].parent_ids.push(commits[i + 1].id)
      }
    } else {
      if (i + 1 < commits.length) {
        const nextInLane = rawCommits.findIndex((r, j) => j > i && r.lane === rc.lane)
        commits[i].parent_ids.push(nextInLane >= 0 ? commits[nextInLane].id : commits[i + 1].id)
      }
    }
  }

  return commits
}

export function generateMockBranches(): Branch[] {
  return [
    { name: 'main', is_remote: false, is_head: true, target_commit_id: sha(150), upstream: 'origin/main' },
    { name: 'feature/oauth2-provider', is_remote: false, is_head: false, target_commit_id: sha(140), upstream: 'origin/feature/oauth2-provider' },
    { name: 'feature/redesign-commit-list', is_remote: false, is_head: false, target_commit_id: sha(130), upstream: null },
    { name: 'hotfix/v2.3.1', is_remote: false, is_head: false, target_commit_id: sha(145), upstream: 'origin/hotfix/v2.3.1' },
    { name: 'origin/main', is_remote: true, is_head: false, target_commit_id: sha(150), upstream: null },
    { name: 'origin/feature/oauth2-provider', is_remote: true, is_head: false, target_commit_id: sha(140), upstream: null },
    { name: 'origin/hotfix/v2.3.1', is_remote: true, is_head: false, target_commit_id: sha(145), upstream: null },
  ]
}

export function createMockOpenRepo(): OpenRepo {
  return {
    state: {
      path: 'D:/projects/mock-git-repo',
      head_branch: 'main',
      head_commit_id: sha(150),
      is_bare: false,
      is_empty: false,
    },
    commits: generateMockCommits(),
    branches: generateMockBranches(),
    selectedCommit: null,
    hasMore: false,
    loading: false,
  }
}

export function injectMockData(repoPath = 'D:/projects/mock-git-repo') {
  const repo = useRepoStore()
  repo.openRepos.set(repoPath, createMockOpenRepo())
  ;(repo as any).activeRepoPath = repoPath
}
