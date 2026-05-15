<template>
  <div class="commit-toolbar">
    <div class="search-area">
      <div class="search-input-wrapper">
        <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input
          ref="searchInputRef"
          v-model="searchText"
          class="search-input"
          :placeholder="searchPlaceholder"
          @input="onSearchInput"
          @keydown.escape="clearSearch"
        />
        <button
          v-if="searchText"
          class="clear-btn"
          @click="clearSearch"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <select
        v-model="filterTypeModel"
        class="filter-select"
      >
        <option value="all">All</option>
        <option value="message">Message</option>
        <option value="author">Author</option>
        <option value="hash">Hash</option>
      </select>
      <span v-if="matchCount !== null" class="match-count">
        {{ matchCount }} match{{ matchCount !== 1 ? 'es' : '' }}
      </span>
    </div>

    <div class="toolbar-actions">
      <button
        class="toolbar-btn"
        :class="{ active: groupingEnabled }"
        @click="$emit('toggle-grouping')"
        title="Toggle time grouping"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7"/>
        </svg>
      </button>
      <button
        class="toolbar-btn"
        @click="$emit('show-all')"
        title="Show all branches"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
        </svg>
        Show All
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

type CommitFilterType = 'all' | 'message' | 'author' | 'hash'

const props = defineProps<{
  filterType: CommitFilterType
  matchCount?: number | null
  groupingEnabled?: boolean
}>()

const emit = defineEmits<{
  'update:filterType': [value: CommitFilterType]
  search: [query: string]
  'toggle-grouping': []
  'show-all': []
}>()

const searchText = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)

const filterTypeModel = computed({
  get: () => props.filterType,
  set: (val: CommitFilterType) => emit('update:filterType', val),
})

const searchPlaceholder = computed(() => {
  switch (props.filterType) {
    case 'message': return 'Search messages...'
    case 'author': return 'Search authors...'
    case 'hash': return 'Search hashes...'
    default: return 'Search commits...'
  }
})

function onSearchInput() {
  emit('search', searchText.value)
}

function clearSearch() {
  searchText.value = ''
  emit('search', '')
  searchInputRef.value?.focus()
}
</script>

<style scoped>
.commit-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  gap: 8px;
  border-bottom: 1px solid var(--border-color, #3c3c3c);
  background: var(--bg-secondary, #252526);
}
.search-area {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}
.search-input-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  background: var(--bg-primary, #1a1a1a);
  border: 1px solid var(--border-color, #3c3c3c);
  border-radius: 3px;
  flex: 1;
  min-width: 0;
  max-width: 300px;
}
.search-input-wrapper:focus-within {
  border-color: var(--accent-color, #0078d4);
}
.search-icon {
  width: 14px;
  height: 14px;
  color: var(--text-tertiary, #6a6a6a);
  flex-shrink: 0;
}
.search-input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  color: var(--text-primary, #e0e0e0);
  font-size: 12px;
  outline: none;
}
.search-input::placeholder {
  color: var(--text-tertiary, #6a6a6a);
}
.clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text-tertiary, #6a6a6a);
  cursor: pointer;
  flex-shrink: 0;
}
.clear-btn:hover {
  color: var(--text-primary, #e0e0e0);
}
.filter-select {
  padding: 2px 4px;
  font-size: 11px;
  color: var(--text-secondary, #969696);
  background: var(--bg-primary, #1a1a1a);
  border: 1px solid var(--border-color, #3c3c3c);
  border-radius: 3px;
  outline: none;
  cursor: pointer;
}
.match-count {
  font-size: 10px;
  color: var(--text-tertiary, #6a6a6a);
  white-space: nowrap;
  flex-shrink: 0;
}
.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.toolbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  font-size: 11px;
  color: var(--text-secondary, #969696);
  background: transparent;
  border: 1px solid var(--border-color, #3c3c3c);
  border-radius: 3px;
  cursor: pointer;
  white-space: nowrap;
}
.toolbar-btn:hover {
  color: var(--text-primary, #e0e0e0);
  background: var(--hover-bg, rgba(255, 255, 255, 0.05));
}
.toolbar-btn.active {
  color: var(--accent-color, #0078d4);
  border-color: var(--accent-color, #0078d4);
}
</style>
