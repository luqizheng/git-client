import { useGitEvent } from './useGitEvent'
import { useStagingStore } from '../stores/staging'
import { useDiffStore } from '../stores/diff'
import { useBranchesStore } from '../stores/branches'
import { useCommitsStore } from '../stores/commits'
import { useRepoStore } from '../stores/repo'

export function useWorkdirWatcher() {
  const staging = useStagingStore()
  const diff = useDiffStore()
  const branches = useBranchesStore()
  const commits = useCommitsStore()
  const repo = useRepoStore()

  let timer: number | null = null

  function debounce(fn: () => void, ms: number) {
    if (timer) clearTimeout(timer)
    timer = window.setTimeout(fn, ms)
  }

  useGitEvent('workdir-changed', () => {
    if (!repo.repoPath) return
    debounce(() => {
      staging.refresh(repo.repoPath)
      diff.fetchWorkingDiff(repo.repoPath)
    }, 300)
  })

  useGitEvent('index-changed', () => {
    if (!repo.repoPath) return
    debounce(() => {
      staging.refresh(repo.repoPath)
      diff.fetchStagedDiff(repo.repoPath)
    }, 300)
  })

  useGitEvent('ref-updated', () => {
    if (!repo.repoPath) return
    debounce(() => {
      branches.fetchBranches(repo.repoPath)
      commits.fetchLogs(repo.repoPath)
    }, 300)
  })

  useGitEvent('head-changed', () => {
    if (!repo.repoPath) return
    debounce(() => {
      branches.fetchBranches(repo.repoPath)
      commits.fetchLogs(repo.repoPath)
    }, 300)
  })
}
