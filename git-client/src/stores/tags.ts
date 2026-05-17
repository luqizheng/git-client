import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Tag } from '../types/git'
import { invoke } from '../utils/ipc'

export const useTagsStore = defineStore('tags', () => {
  const tags = ref<Tag[]>([])

  async function listTags(repoPath: string) {
    tags.value = await invoke<Tag[]>('list_tags', { repo_path: repoPath })
    return tags.value
  }

  async function createTag(repoPath: string, name: string, target: string, message?: string) {
    const tag = await invoke<Tag>('create_tag', { repo_path: repoPath, name, target, message })
    await listTags(repoPath)
    return tag
  }

  async function deleteTag(repoPath: string, name: string) {
    await invoke<null>('delete_tag', { repo_path: repoPath, name })
    await listTags(repoPath)
  }

  return { tags, listTags, createTag, deleteTag }
})
