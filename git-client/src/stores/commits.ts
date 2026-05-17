import { defineStore } from 'pinia'
import type { Commit } from '../types/git'
import { invoke } from '../utils/ipc'
import { useRepoStore } from './repo'

export const useCommitsStore = defineStore('commits', () => {
  async function fetchLogs(repoPath: string, limit = 50, after?: string) {
    const repo = useRepoStore()
    const openRepo = repo.openRepos.get(repoPath)
    if (!openRepo) return
    openRepo.loading = true
    try {
      const result = await invoke<Commit[]>('get_log', { repoPath, limit, after })
      if (after) {
        openRepo.commits.push(...result)
      } else {
        openRepo.commits = result
      }
      openRepo.hasMore = result.length >= limit
    } catch (e) {
      console.error('fetchLogs error:', e)
    } finally {
      openRepo.loading = false
    }
  }

  function selectCommit(repoPath: string, commit: Commit | null) {
    const repo = useRepoStore()
    const openRepo = repo.openRepos.get(repoPath)
    if (openRepo) {
      openRepo.selectedCommit = commit
    }
  }

  function clearCommits(repoPath: string) {
    const repo = useRepoStore()
    const openRepo = repo.openRepos.get(repoPath)
    if (openRepo) {
      openRepo.commits = []
      openRepo.selectedCommit = null
      openRepo.hasMore = true
    }
  }

  function filterByBranch(repoPath: string, branchName: string) {
    const repo = useRepoStore()
    const openRepo = repo.openRepos.get(repoPath)
    if (!openRepo) return

    if (!(openRepo as any)._originalCommits) {
      (openRepo as any)._originalCommits = [...openRepo.commits]
    }

    openRepo.commits = openRepo.commits.filter(commit =>
    commit.refs.some(ref => ref.name.includes(branchName))
  )
  }

  function clearBranchFilter(repoPath: string) {
    const repo = useRepoStore()
    const openRepo = repo.openRepos.get(repoPath)
    if (!openRepo) return

    const original = (openRepo as any)._originalCommits
    if (original) {
      openRepo.commits = [...original]
      delete (openRepo as any)._originalCommits
    }
  }

  async function cherryPick(repoPath: string, commitId: string) {
    await invoke('cherry_pick', { repo_path: repoPath, commit_id: commitId })
  }

  return { fetchLogs, selectCommit, clearCommits, filterByBranch, clearBranchFilter, cherryPick }
})
