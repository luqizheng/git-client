<template>
  <div class="flex-1 flex flex-col overflow-hidden" v-if="repo.currentRepo">
    <div
      ref="scrollContainer"
      class="flex-1 overflow-y-auto"
      @scroll="onScroll"
    >
      <CommitCanvas
        :commits="commits.commits"
        :scroll-top="scrollTop"
        :viewport-height="viewportHeight"
        :selected-id="commits.selectedCommit?.id ?? null"
        @select="commits.selectCommit"
      />
      <div v-if="commits.loading" class="text-center text-gray-500 py-4">Loading...</div>
      <div v-if="commits.hasMore && !commits.loading" ref="loadMoreRef" class="h-1" />
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
  if (repo.repoPath) {
    await commits.fetchLogs(repo.repoPath)
    invoke('start_watch', { repoPath: repo.repoPath })
  }

  observer = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting && commits.hasMore && !commits.loading) {
      const lastCommit = commits.commits[commits.commits.length - 1]
      if (lastCommit && repo.repoPath) {
        commits.fetchLogs(repo.repoPath, 50, lastCommit.id)
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
