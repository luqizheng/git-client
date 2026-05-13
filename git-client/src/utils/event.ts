import { listen } from '@tauri-apps/api/event'

export async function onEvent(event: string, handler: (payload: unknown) => void) {
  return listen(event, (e) => handler(e.payload))
}

export type EventHandler = (payload: unknown) => void

export const GitEvents = {
  REPO_OPENED: 'git:repo-opened',
  REPO_CLOSED: 'git:repo-closed',
  REPO_STATUS_CHANGED: 'git:repo-status-changed',
  COMMIT_CREATED: 'git:commit-created',
  COMMIT_AMENDED: 'git:commit-amended',
  BRANCH_CREATED: 'git:branch-created',
  BRANCH_DELETED: 'git:branch-deleted',
  BRANCH_CHECKED_OUT: 'git:branch-checked-out',
  FETCH_STARTED: 'git:fetch-started',
  FETCH_PROGRESS: 'git:fetch-progress',
  FETCH_COMPLETED: 'git:fetch-completed',
  PUSH_STARTED: 'git:push-started',
  PUSH_PROGRESS: 'git:push-progress',
  PUSH_COMPLETED: 'git:push-completed',
  PULL_STARTED: 'git:pull-started',
  PULL_PROGRESS: 'git:pull-progress',
  PULL_COMPLETED: 'git:pull-completed',
  MERGE_STARTED: 'git:merge-started',
  MERGE_COMPLETED: 'git:merge-completed',
  REBASE_STARTED: 'git:rebase-started',
  REBASE_COMPLETED: 'git:rebase-completed',
} as const
