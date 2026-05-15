import type { Commit, OpenRepo, Branch } from '../types/git'
import { useRepoStore } from '../stores/repo'

const APINTO_COMMITS_RAW = [
  { hash: '1ee96ba44b8cd534f1f1574a1f56e83df39b8aca', parents: ['c924f2b95c53cff6e5f73eef30add43211a425cf'], author: 'Liujian', time: '2026-02-02 18:42:06 +0800', msg: '熔断计数问题解决', refs: [{ name: 'main', type: 'local', isHead: true }, { name: 'origin/main', type: 'remote' }] },
  { hash: 'c924f2b95c53cff6e5f73eef30add43211a425cf', parents: ['740fd1d107fe891168378b18f6f28672ff444655'], author: 'Liujian', time: '2026-01-30 11:02:16 +0800', msg: '调整流控策略redis key过期时间' },
  { hash: '740fd1d107fe891168378b18f6f28672ff444655', parents: ['619b77c7c43ab8ae8872fa0e7c61084ae8d4e0fc', '32bf5b721eaa1ee5c0e4916262f9c3b863ddd165'], author: 'Liujian', time: '2026-01-29 22:34:54 +0800', msg: "Merge remote-tracking branch 'origin/main'" },
  { hash: '619b77c7c43ab8ae8872fa0e7c61084ae8d4e0fc', parents: ['3f15557a27be92499bc2330df2d82a3f47c7715f', '35c5c2d040746ebb4d676d9eb4582f98b2a93745'], author: 'Liujian', time: '2026-01-29 22:32:40 +0800', msg: "Merge branch 'feature/k8s-discovery'" },
  { hash: '32bf5b721eaa1ee5c0e4916262f9c3b863ddd165', parents: ['3f15557a27be92499bc2330df2d82a3f47c7715f', 'b5a3659e93671c65c4c732f5bd6e079268469abd'], author: 'Dot.L', time: '2026-01-29 22:31:35 +0800', msg: "Merge pull request #235 from eolinker/feature/counter" },
  { hash: 'b5a3659e93671c65c4c732f5bd6e079268469abd', parents: ['869972271b89dd47a67d81e05a90a5a5cff2996e'], author: 'Liujian', time: '2026-01-29 22:30:59 +0800', msg: '计数器高并发调整', refs: [{ name: 'origin/feature/counter', type: 'remote' }] },
  { hash: '869972271b89dd47a67d81e05a90a5a5cff2996e', parents: ['3f15557a27be92499bc2330df2d82a3f47c7715f'], author: 'Liujian', time: '2026-01-29 21:29:17 +0800', msg: '计数器高并发调整' },
  { hash: '35c5c2d040746ebb4d676d9eb4582f98b2a93745', parents: ['f0139f82ee32998c29772a082cfc5a3f64374658'], author: 'Liujian', time: '2026-01-26 16:40:53 +0800', msg: 'redis加分布式锁' },
  { hash: 'f0139f82ee32998c29772a082cfc5a3f64374658', parents: ['81d19c55b07345ac68c5536ca16427c69f218aa'], author: 'Liujian', time: '2026-01-26 10:58:19 +0800', msg: '流控策略输出请求次数信息' },
  { hash: '81d19c55b07345ac68c5536ca16427c69f218aa', parents: ['c609064ec8e6fb68a84fe17220ff7861f0e61053'], author: 'Liujian', time: '2026-01-23 14:21:45 +0800', msg: '修复当响应为chuncked时，脱敏策略失效的问题' },
  { hash: 'c609064ec8e6fb68a84fe17220ff7861f0e61053', parents: ['46d4781312f9f9842f1f875e73d5f3f8ff057961'], author: 'Liujian', time: '2026-01-23 13:51:01 +0800', msg: '修复当响应为chuncked时，脱敏策略失效的问题' },
  { hash: '46d4781312f9f9842f1f875e73d5f3f8ff057961', parents: ['3f15557a27be92499bc2330df2d82a3f47c7715f'], author: 'Liujian', time: '2026-01-20 17:23:35 +0800', msg: 'support k8s discovery', refs: [{ name: 'origin/feature/k8s-discovery', type: 'remote' }] },
  { hash: '3f15557a27be92499bc2330df2d82a3f47c7715f', parents: ['e5a5ffda91440605584da16c07a4dcffe985f905'], author: 'Liujian', time: '2026-01-16 11:41:53 +0800', msg: '1. 修复请求带有文件参数时，使用额外参数新增body' },
  { hash: 'e5a5ffda91440605584da16c07a4dcffe985f905', parents: ['9cae36ab5e8e9f8e8b8e8e8e8e8e8e8e8e8e8e8e'], author: 'Liujian', time: '2025-12-19 15:30:22 +0800', msg: '新增响应过滤插件' },
  { hash: '9cae36ab5e8e9f8e8b8e8e8e8e8e8e8e8e8e8e8e8e8e', parents: ['be90da3e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e'], author: 'Liujian', time: '2025-12-17 20:45:10 +0800', msg: '修复当响应为分块传输时，日志变量response...' },
  { hash: 'be90da3e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e', parents: ['70a11c6e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e'], author: 'Liujian', time: '2025-12-17 18:20:33 +0800', msg: 'content-encoding兼容' },
  { hash: '70a11c6e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e', parents: ['19dea15e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e'], author: 'Liujian', time: '2025-12-10 16:35:22 +0800', msg: '1.apinto依赖redis版本改成v9', refs: [{ name: 'v0.22.19', type: 'tag' }] },
  { hash: '19dea15e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e', parents: ['3f15557e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e'], author: 'Liujian', time: '2025-11-21 09:15:44 +0800', msg: 'Lock when setting/getting labels', refs: [{ name: 'v0.22.18', type: 'tag' }] },
  { hash: '3f15557e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e', parents: ['e5a5ffe8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e'], author: 'Liujian', time: '2025-12-19 10:28:15 +0800', msg: '新增响应过滤插件', refs: [{ name: 'v0.22.17', type: 'tag' }] },
  { hash: 'e5a5ffe8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e', parents: ['c5919594e8291e4a4c38228569fa116d3fffb348'], author: 'Liujian', time: '2025-04-22 12:01:24 +0800', msg: 'Fix: Issue of AI model parameter error reporting', refs: [{ name: 'v0.22.16', type: 'tag' }] },
  { hash: 'c5919594e8291e4a4c38228569fa116d3fffb348', parents: ['889dc359aab4ee3bc31873a022c4cfd1ada8d9fd'], author: 'Liujian', time: '2025-04-22 12:00:00 +0800', msg: 'Fix: AI model config validation' },
]

const idMap = new Map<string, string>()
APINTO_COMMITS_RAW.forEach((c, i) => {
  const shortId = `ap${i.toString(16).padStart(4, '0')}` + 'a'.repeat(36)
  idMap.set(c.hash, shortId)
})

export function generateApintoCommits(): Commit[] {
  return APINTO_COMMITS_RAW.map(c => ({
    id: idMap.get(c.hash) ?? c.hash,
    message: c.msg,
    author: c.author,
    author_email: `${c.author.toLowerCase().replace(/\s+/g, '.')}@example.com`,
    time: Math.floor(new Date(c.time).getTime() / 1000),
    parent_ids: c.parents.map(p => idMap.get(p) ?? p),
    refs: (c.refs ?? []).map(r => ({
      name: r.name,
      ref_type: r.type as 'local' | 'remote' | 'tag',
      is_head: r.isHead ?? false,
    })),
  }))
}

export function generateApintoBranches(): Branch[] {
  const commits = generateApintoCommits()
  return [
    { name: 'main', is_remote: false, is_head: true, target_commit_id: commits[0].id, upstream: 'origin/main' },
    { name: 'origin/feature/counter', is_remote: true, is_head: false, target_commit_id: commits[5].id, upstream: null },
    { name: 'origin/feature/k8s-discovery', is_remote: true, is_head: false, target_commit_id: commits[11].id, upstream: null },
    { name: 'origin/main', is_remote: true, is_head: false, target_commit_id: commits[0].id, upstream: null },
  ]
}

export function createApintoMockRepo(): OpenRepo {
  return {
    state: {
      path: 'D:/projects/github/apinto',
      head_branch: 'main',
      head_commit_id: generateApintoCommits()[0].id,
      is_bare: false,
      is_empty: false,
    },
    commits: generateApintoCommits(),
    branches: generateApintoBranches(),
    selectedCommit: null,
    hasMore: false,
    loading: false,
  }
}

export function injectApintoData(repoPath = 'D:/projects/github/apinto') {
  const repo = useRepoStore()
  repo.openRepos.set(repoPath, createApintoMockRepo())
  ;(repo as any).activeRepoPath = repoPath
}
