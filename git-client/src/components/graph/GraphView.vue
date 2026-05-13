<template>
  <div class="flex-1 flex flex-col overflow-hidden" v-if="repo.activeRepo">
    <div
      ref="scrollContainer"
      class="flex-1 overflow-y-auto"
      @scroll="onScroll"
    >
      <CommitCanvas
        :commits="repo.activeRepo.commits"
        :scroll-top="scrollTop"
        :viewport-height="viewportHeight"
        :selected-id="repo.activeRepo.selectedCommit?.id ?? null"
        @select="(c: Commit) => commits.selectCommit(repo.activeRepoPath!, c)"
      />
      <div v-if="repo.activeRepo.loading" class="text-center text-gray-500 py-4">Loading...</div>
      <div v-if="repo.activeRepo.hasMore && !repo.activeRepo.loading" ref="loadMoreRef" class="h-1" />
    </div>
  </div>
  <div v-else class="flex-1 flex items-center justify-center text-gray-500">
    Open a repository to get started
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import CommitCanvas from './CommitCanvas.vue'
import { useRepoStore } from '../../stores/repo'
import { useCommitsStore } from '../../stores/commits'
import { useWorkdirWatcher } from '../../composables/useWorkdirWatcher'
import { invoke } from '../../utils/ipc'
import type { Commit } from '../../types/git'

const repo = useRepoStore()
const commits = useCommitsStore()
useWorkdirWatcher()

const scrollContainer = ref<HTMLElement | null>(null)
const loadMoreRef = ref<HTMLElement | null>(null)
const scrollTop = ref(0)
const viewportHeight = ref(600)

function onScroll() {
  if (!scrollContainer.value) return
  scrollTop.value = scrollContainer.value.scrollTop
  viewportHeight.value = scrollContainer.value.clientHeight
}

let observer: IntersectionObserver | null = null

onMounted(async () => {
  if (repo.activeRepoPath) {
    await commits.fetchLogs(repo.activeRepoPath)
    invoke('start_watch', { repoPath: repo.activeRepoPath })
  }

  observer = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting && repo.activeRepo?.hasMore && !repo.activeRepo?.loading) {
      const lastCommit = repo.activeRepo.commits[repo.activeRepo.commits.length - 1]
      if (lastCommit && repo.activeRepoPath) {
        commits.fetchLogs(repo.activeRepoPath, 50, lastCommit.id)
      }
    }
  })
  if (loadMoreRef.value) {
    observer.observe(loadMoreRef.value)
  }
})

onUnmounted(() => {
  observer?.disconnect()
})
</script>
