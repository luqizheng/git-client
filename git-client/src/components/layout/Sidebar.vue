<template>
  <div class="sidebar-root">
    <div v-if="app.sidebarCollapsed" class="collapsed-bar">
      <n-button quaternary size="tiny" @click="app.toggleSidebar">
        <template #icon>
          <n-icon :size="14"><ChevronForward /></n-icon>
        </template>
      </n-button>
    </div>
    <template v-else>
      <div class="sidebar-toggle">
        <n-button quaternary size="tiny" @click="app.toggleSidebar">
          <template #icon>
            <n-icon :size="14"><ChevronBack /></n-icon>
          </template>
        </n-button>
      </div>
      <n-scrollbar class="sidebar-scroll">
        <RefPanelSection
          title="Local"
          :icon="GitBranch"
          :expanded="sectionExpanded.local"
          @toggle="sectionExpanded.local = !sectionExpanded.local"
        >
          <div
            v-for="branch in localBranches"
            :key="branch.name"
            class="ref-item"
            @contextmenu.prevent="onLocalContext($event, branch)"
            @click="onBranchClick(branch)"
          >
            <span class="ref-dot" :class="branch.is_head ? 'dot-current' : 'dot-other'" />
            <span class="ref-name" :class="{ 'ref-name-current': branch.is_head }">{{ branch.name }}</span>
            <span v-if="branch.upstream" class="ref-upstream">→ {{ branch.upstream }}</span>
          </div>
          <div v-if="localBranches.length === 0" class="ref-empty">No local branches</div>
        </RefPanelSection>

        <RefPanelSection
          title="Remote"
          :icon="Globe"
          :expanded="sectionExpanded.remote"
          @toggle="sectionExpanded.remote = !sectionExpanded.remote"
        >
          <div v-for="remote in remotes" :key="remote.name" class="remote-group">
            <div
              class="remote-group-header"
              @click="toggleRemoteExpanded(remote.name)"
            >
              <n-icon :size="10" class="remote-expand-icon">
                <component :is="remoteExpandedMap[remote.name] ? ChevronDown : ChevronForward" />
              </n-icon>
              <span class="remote-group-name">{{ remote.name }}</span>
            </div>
            <div v-if="remoteExpandedMap[remote.name]" class="remote-branches">
              <div
                v-for="rb in getRemoteBranches(remote.name)"
                :key="rb.name"
                class="ref-item"
                @contextmenu.prevent="onRemoteBranchContext($event, rb)"
              >
                <span class="ref-dot dot-remote" />
                <span class="ref-name">{{ stripRemotePrefix(rb.name, remote.name) }}</span>
              </div>
              <div v-if="getRemoteBranches(remote.name).length === 0" class="ref-empty">No branches</div>
            </div>
          </div>
          <div v-if="remotes.length === 0" class="ref-empty">No remotes</div>
        </RefPanelSection>

        <RefPanelSection
          title="Tags"
          :icon="Pricetag"
          :expanded="sectionExpanded.tags"
          @toggle="sectionExpanded.tags = !sectionExpanded.tags"
        >
          <div
            v-for="tag in tagsStore.tags"
            :key="tag.name"
            class="ref-item"
            @contextmenu.prevent="onTagContext($event, tag)"
          >
            <span class="ref-dot dot-tag" />
            <span class="ref-name">{{ tag.name }}</span>
          </div>
          <div v-if="tagsStore.tags.length === 0" class="ref-empty">No tags</div>
        </RefPanelSection>

        <RefPanelSection
          title="Stashes"
          :icon="Archive"
          :expanded="sectionExpanded.stashes"
          @toggle="sectionExpanded.stashes = !sectionExpanded.stashes"
        >
          <div
            v-for="stash in stashEntries"
            :key="stash.index"
            class="ref-item"
            @contextmenu.prevent="onStashContext($event, stash)"
          >
            <span class="ref-dot dot-stash" />
            <span class="ref-name">{{ stash.message }}</span>
          </div>
          <div v-if="stashEntries.length === 0" class="ref-empty">No stashes</div>
        </RefPanelSection>

        <RefPanelSection
          title="Submodules"
          :icon="GitMerge"
          :expanded="sectionExpanded.submodules"
          @toggle="sectionExpanded.submodules = !sectionExpanded.submodules"
        >
          <div
            v-for="sm in submoduleStore.submodules"
            :key="sm.name"
            class="ref-item"
            @contextmenu.prevent="onSubmoduleContext($event, sm)"
          >
            <span class="ref-dot dot-submodule" />
            <span class="ref-name">{{ sm.name }}</span>
          </div>
          <div v-if="submoduleStore.submodules.length === 0" class="ref-empty">No submodules</div>
        </RefPanelSection>
      </n-scrollbar>
    </template>

    <n-dropdown
      :x="contextX"
      :y="contextY"
      :show="contextShow"
      :options="contextOptions"
      placement="bottom-start"
      @select="onContextSelect"
      @clickoutside="contextShow = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick, defineComponent, h, type Component } from 'vue'
import { NButton, NIcon, NScrollbar, NDropdown, useMessage } from 'naive-ui'
import {
  ChevronBack,
  ChevronForward,
  ChevronDown,
  GitBranch,
  Globe,
  Pricetag,
  Archive,
  GitMerge,
} from '@vicons/ionicons5'
import { useAppStore } from '../../stores/app'
import { useBranchesStore } from '../../stores/branches'
import { useRemoteStore } from '../../stores/remote'
import { useTagsStore } from '../../stores/tags'
import { useSubmoduleStore } from '../../stores/submodule'
import { useRepoStore } from '../../stores/repo'
import { invoke } from '../../utils/ipc'
import type { Branch, Tag, StashEntry, Submodule } from '../../types/git'

const RefPanelSection = defineComponent({
  name: 'RefPanelSection',
  props: {
    title: { type: String, required: true },
    icon: { type: Object as () => Component, required: true },
    expanded: { type: Boolean, required: true },
  },
  emits: ['toggle'],
  setup(props, { slots, emit }) {
    return () => {
      const header = h('div', {
        class: 'section-header',
        onClick: () => emit('toggle'),
      }, [
        h('div', { class: 'section-header-left' }, [
          h(NIcon, { size: 12, class: 'section-icon' }, { default: () => h(props.icon) }),
          h('span', { class: 'section-title' }, props.title),
        ]),
        h('span', { class: 'section-indicator' }, props.expanded ? '▾' : '▸'),
      ])

      const content = props.expanded
        ? h('div', { class: 'section-content' }, slots.default?.())
        : null

      return h('div', { class: 'ref-section' }, [header, content])
    }
  },
})

const app = useAppStore()
const branchesStore = useBranchesStore()
const remoteStore = useRemoteStore()
const tagsStore = useTagsStore()
const submoduleStore = useSubmoduleStore()
const repo = useRepoStore()
const msg = useMessage()

const sectionExpanded = reactive({
  local: true,
  remote: true,
  tags: true,
  stashes: true,
  submodules: true,
})

const remoteExpandedMap = reactive<Record<string, boolean>>({})

const stashEntries = ref<StashEntry[]>([])

const localBranches = computed(() =>
  (repo.activeRepo?.branches ?? []).filter(b => !b.is_remote),
)

const remoteBranches = computed(() =>
  (repo.activeRepo?.branches ?? []).filter(b => b.is_remote),
)

const remotes = computed(() =>
  repo.activeRepoPath ? remoteStore.getRemotes(repo.activeRepoPath) : [],
)

function getRemoteBranches(remoteName: string): Branch[] {
  const prefix = `remotes/${remoteName}/`
  return remoteBranches.value.filter(b => b.name.startsWith(prefix))
}

function stripRemotePrefix(branchName: string, remoteName: string): string {
  const prefix = `remotes/${remoteName}/`
  return branchName.startsWith(prefix) ? branchName.slice(prefix.length) : branchName
}

function toggleRemoteExpanded(name: string) {
  remoteExpandedMap[name] = !remoteExpandedMap[name]
}

const contextX = ref(0)
const contextY = ref(0)
const contextShow = ref(false)
const contextOptions = ref<{ label: string; key: string }[]>([])

const localMenuOptions = [
  { label: 'Checkout', key: 'checkout' },
  { label: 'Merge', key: 'merge' },
  { label: 'Rebase', key: 'rebase' },
  { label: 'Delete', key: 'delete' },
  { label: 'Rename', key: 'rename' },
]

const remoteBranchMenuOptions = [
  { label: 'Checkout', key: 'checkout' },
  { label: 'Merge', key: 'merge' },
  { label: 'Delete', key: 'delete' },
]

const tagMenuOptions = [
  { label: 'Delete Tag', key: 'delete_tag' },
  { label: 'Push Tag', key: 'push_tag' },
]

const stashMenuOptions = [
  { label: 'Apply Stash', key: 'apply_stash' },
  { label: 'Pop Stash', key: 'pop_stash' },
  { label: 'Delete Stash', key: 'delete_stash' },
]

const submoduleMenuOptions = [
  { label: 'Update', key: 'update' },
  { label: 'Init', key: 'init' },
  { label: 'Remove', key: 'remove' },
]

function onLocalContext(e: MouseEvent, _branch: Branch) {
  contextX.value = e.clientX
  contextY.value = e.clientY
  contextOptions.value = localMenuOptions
  nextTick(() => { contextShow.value = true })
}

function onRemoteBranchContext(e: MouseEvent, _branch: Branch) {
  contextX.value = e.clientX
  contextY.value = e.clientY
  contextOptions.value = remoteBranchMenuOptions
  nextTick(() => { contextShow.value = true })
}

function onTagContext(e: MouseEvent, _tag: Tag) {
  contextX.value = e.clientX
  contextY.value = e.clientY
  contextOptions.value = tagMenuOptions
  nextTick(() => { contextShow.value = true })
}

function onStashContext(e: MouseEvent, _stash: StashEntry) {
  contextX.value = e.clientX
  contextY.value = e.clientY
  contextOptions.value = stashMenuOptions
  nextTick(() => { contextShow.value = true })
}

function onSubmoduleContext(e: MouseEvent, _sm: Submodule) {
  contextX.value = e.clientX
  contextY.value = e.clientY
  contextOptions.value = submoduleMenuOptions
  nextTick(() => { contextShow.value = true })
}

function onContextSelect(_key: string) {
  contextShow.value = false
  msg.info('功能开发中')
}

async function onBranchClick(branch: Branch) {
  if (branch.is_head) return
  if (!repo.activeRepoPath) return
  try {
    await branchesStore.switchBranch(repo.activeRepoPath, branch.name)
  } catch (e) {
    msg.error(String(e))
  }
}

async function loadStashes() {
  if (!repo.activeRepoPath) return
  try {
    stashEntries.value = await invoke<StashEntry[]>('stash_list', { repoPath: repo.activeRepoPath })
  } catch {
    stashEntries.value = []
  }
}

onMounted(async () => {
  if (repo.activeRepoPath) {
    await Promise.all([
      branchesStore.fetchBranches(repo.activeRepoPath),
      remoteStore.fetchRemotes(repo.activeRepoPath),
      tagsStore.listTags(repo.activeRepoPath),
      submoduleStore.listSubmodules(repo.activeRepoPath),
      loadStashes(),
    ])
    for (const r of remotes.value) {
      remoteExpandedMap[r.name] = true
    }
  }
})
</script>

<style>
.sidebar-root {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  overflow: hidden;
}

.sidebar-root .collapsed-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 4px;
}

.sidebar-root .sidebar-toggle {
  display: flex;
  justify-content: flex-end;
  padding: 2px 4px 0;
  flex-shrink: 0;
}

.sidebar-root .sidebar-scroll {
  flex: 1;
  overflow: hidden;
}

.sidebar-root .ref-section {
  border-bottom: 1px solid var(--border-color);
}

.sidebar-root .section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 28px;
  padding: 0 8px;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
}

.sidebar-root .section-header:hover {
  background: var(--bg-hover);
}

.sidebar-root .section-header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sidebar-root .section-icon {
  color: var(--text-muted);
}

.sidebar-root .section-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
}

.sidebar-root .section-indicator {
  font-size: 10px;
  color: var(--text-muted);
  line-height: 1;
}

.sidebar-root .section-content {
  padding: 0 0 4px;
}

.sidebar-root .ref-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px 2px 20px;
  cursor: pointer;
  transition: background 0.15s;
  min-height: 22px;
}

.sidebar-root .ref-item:hover {
  background: var(--bg-hover);
}

.sidebar-root .ref-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.sidebar-root .dot-current {
  background: var(--accent-green, #81c784);
}

.sidebar-root .dot-other {
  border: 1.5px solid var(--text-muted);
  background: transparent;
}

.sidebar-root .dot-remote {
  border: 1.5px solid var(--accent-purple, #ba68c8);
  background: transparent;
}

.sidebar-root .dot-tag {
  border: 1.5px solid var(--accent-yellow, #fff176);
  background: transparent;
}

.sidebar-root .dot-stash {
  border: 1.5px solid var(--accent-blue, #4fc3f7);
  background: transparent;
}

.sidebar-root .dot-submodule {
  border: 1.5px solid var(--accent-red, #e57373);
  background: transparent;
}

.sidebar-root .ref-name {
  font-size: 12px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-root .ref-name-current {
  color: var(--accent-green, #81c784);
  font-weight: 600;
}

.sidebar-root .ref-upstream {
  font-size: 10px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-left: auto;
}

.sidebar-root .ref-empty {
  font-size: 11px;
  color: var(--text-muted);
  padding: 4px 20px;
}

.sidebar-root .remote-group {
  margin: 0;
}

.sidebar-root .remote-group-header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px 2px 16px;
  cursor: pointer;
  min-height: 22px;
  transition: background 0.15s;
}

.sidebar-root .remote-group-header:hover {
  background: var(--bg-hover);
}

.sidebar-root .remote-expand-icon {
  color: var(--text-muted);
  flex-shrink: 0;
}

.sidebar-root .remote-group-name {
  font-size: 12px;
  color: var(--accent-purple, #ba68c8);
  font-weight: 500;
}

.sidebar-root .remote-branches {
  padding: 0;
}
</style>
