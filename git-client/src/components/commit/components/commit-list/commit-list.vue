<script setup lang="ts">
import { h, computed } from 'vue'
import { NDropdown } from 'naive-ui'
import type { DropdownOption } from 'naive-ui'

import { useCommitList } from '../../composables/useCommitList'
import type { Commit } from '../../../../types/git'
import HashCell from '../cells/HashCell.vue'
import BranchTagCell from '../cells/BranchTagCell.vue'
import MessageCell from '../cells/MessageCell.vue'
import AuthorCell from '../cells/AuthorCell.vue'
import DateCell from '../cells/DateCell.vue'

const {
  scrollContainer,
  filterText,
  filteredCommits,
  totalHeight,
  visibleItems,
  selectedCommitId,
  hoveredId,
  contextMenu,
  handleClick,
  setHovered,
  hideContextMenu,
  onScroll,
} = useCommitList()

void scrollContainer

function onContextMenu(e: MouseEvent, commit: Commit) {
  e.preventDefault()
  contextMenu.value = { visible: true, x: e.clientX, y: e.clientY, commit }
}

function onDropdownSelect(_key: string) {
  hideContextMenu()
}

const menuOptions = computed<DropdownOption[]>(() => {
  if (!contextMenu.value.commit) return []
  return [
    { key: 'cherry-pick', label: 'Cherry-pick this commit', icon: renderIcon('cherry') },
    { key: 'divider-1', type: 'divider' },
    { key: 'rebase', label: 'Rebase onto this commit...', icon: renderIcon('rebase') },
    {
      key: 'reset',
      label: 'Reset',
      children: [
        { key: 'reset-soft', label: 'Soft' },
        { key: 'reset-mixed', label: 'Mixed' },
        { key: 'reset-hard', label: 'Hard', props: { style: 'color: var(--danger-color, #ef4444)' } },
      ],
    },
    { key: 'divider-2', type: 'divider' },
    { key: 'create-branch', label: 'Create Branch here...', icon: renderIcon('branch') },
    { key: 'create-tag', label: 'Tag this version...', icon: renderIcon('tag') },
    { key: 'divider-3', type: 'divider' },
    { key: 'copy-sha', label: 'Copy SHA', icon: renderIcon('copy') },
    { key: 'copy-info', label: 'Copy commit info' },
    { key: 'divider-4', type: 'divider' },
    { key: 'view-diff', label: 'View diff', icon: renderIcon('diff') },
    { key: 'scroll-to-head', label: 'Scroll to HEAD', icon: renderIcon('head') },
  ]
})

const SVG_PATHS: Record<string, string> = {
  cherry: 'M12 2a7 7 0 00-7 7c0 2.38 1.19 4.47 3 5.74V17a2 2 0 002 2h4a2 2 0 002-2v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 00-7-7zM9 21h6',
  rebase: 'M4 12h16m-4-4l4 4-4 4',
  branch: 'M6 3v12m0 0a3 3 0 100 6 3 3 0 000-6zm12-6a3 3 0 100 6 3 3 0 000-6zM6 9h12',
  tag: 'M20.59 13.41l-7.17-7.17a2 2 0 00-1.41-.59H5a2 2 0 00-2 2v6.83a2 2 0 00.59 1.41l7.17 7.17a2 2 0 002.83 0l7-7a2 2 0 000-2.83zM8 11a1 1 0 110-2 1 1 0 010 2z',
  copy: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z',
  diff: 'M9 5l7 7-7 7',
  head: 'M5 12h14M12 5l7 7-7 7',
}

function renderIcon(name: string) {
  return () => h('svg', {
    class: 'w-4 h-4',
    fill: 'none',
    stroke: 'currentColor',
    viewBox: '0 0 24 24',
    innerHTML: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${SVG_PATHS[name] ?? ''}"/>`,
  })
}
</script>

<template>
  <div class="commit-list flex flex-col h-full w-full bg-[var(--commit-bg,transparent)]">
    <div class="toolbar flex items-center gap-2 px-3 py-2 border-b border-[var(--commit-border,#3c3c3c)] shrink-0">
      <div class="search-box flex items-center bg-[var(--commit-bg-hover,rgba(255,255,255,0.05))] rounded px-2 py-1 flex-1 max-w-80">
        <svg class="w-4 h-4 text-[var(--commit-text-secondary)] mr-1 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="filterText"
          type="text"
          placeholder="Search commits..."
          class="bg-transparent border-none outline-none text-sm text-[var(--commit-text)] w-full placeholder:text-[var(--commit-text-secondary)]"
        />
        <span v-if="filterText" class="text-xs text-[var(--commit-text-secondary)] ml-1">{{ filteredCommits.length }}</span>
      </div>
    </div>

    <div class="column-header flex items-center h-7 px-3 text-xs text-[var(--commit-text-secondary)] border-b border-[var(--commit-border,#3c3c3c)] shrink-0">
      <span class="w-36 shrink-0">Branch / Tag</span>
      <span class="w-20 shrink-0">Hash</span>
      <span class="flex-1 min-w-0">Message</span>
      <span class="w-28 shrink-0">Author</span>
      <span class="w-20 shrink-0 text-right">Date</span>
    </div>

    <div
      ref="scrollContainer"
      class="scroll-container flex-1 overflow-y-auto"
      @scroll="onScroll"
    >
      <div :style="{ height: totalHeight + 'px', position: 'relative' }">
        <div
          v-for="item in visibleItems"
          :key="item.index"
          :style="{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            transform: `translateY(${item.start}px)`,
          }"
          :data-index="item.index"
        >
          <div
            v-if="item.commit"
            class="commit-row flex items-center h-10 px-3 border-b border-[var(--commit-border,#3c3c3c)] cursor-pointer transition-colors"
            :class="{
              'bg-[var(--commit-bg-selected,rgba(59,130,246,0.3))]': item.commit.id === selectedCommitId,
              'bg-[var(--commit-bg-hover,rgba(255,255,255,0.05))]': item.commit.id === hoveredId && item.commit.id !== selectedCommitId,
            }"
            @click="handleClick(item.commit)"
            @contextmenu="onContextMenu($event, item.commit)"
            @mouseenter="setHovered(item.commit.id)"
            @mouseleave="setHovered(null)"
          >
            <div class="w-36 shrink-0 overflow-hidden">
              <BranchTagCell :refs="item.commit.refs" />
            </div>
            <div class="w-20 shrink-0">
              <HashCell :hash="item.commit.id" />
            </div>
            <div class="flex-1 min-w-0 mr-2">
              <MessageCell
                :message="item.commit.message"
                :query="filterText"
              />
            </div>
            <div class="w-28 shrink-0 overflow-hidden">
              <AuthorCell :author="item.commit.author" />
            </div>
            <div class="w-20 shrink-0 text-right">
              <DateCell :timestamp="item.commit.time" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <NDropdown
      :show="contextMenu.visible"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :options="menuOptions"
      trigger="manual"
      to="body"
      animated
      @select="onDropdownSelect"
      @clickoutside="hideContextMenu"
    />
  </div>
</template>
