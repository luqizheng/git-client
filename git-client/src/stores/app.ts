import { defineStore } from 'pinia'
import { ref } from 'vue'
import { invoke } from '../utils/ipc'

interface AppSettings {
  theme: string
  locale: string
  recent_repos: string[]
  sidebar_width: number
  sidebar_collapsed: boolean
}

export const useAppStore = defineStore('app', () => {
  const theme = ref<'dark' | 'light'>('dark')
  const locale = ref<'zh' | 'en'>('zh')
  const sidebarWidth = ref(240)
  const sidebarCollapsed = ref(false)
  const recentRepos = ref<string[]>([])

  function setTheme(t: 'dark' | 'light') {
    theme.value = t
    document.documentElement.setAttribute('data-theme', t)
    saveSettings()
  }

  function setLocale(l: 'zh' | 'en') {
    locale.value = l
    saveSettings()
  }

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
    saveSettings()
  }

  async function loadSettings() {
    try {
      const settings = await invoke<AppSettings>('load_settings')
      theme.value = settings.theme as 'dark' | 'light'
      locale.value = settings.locale as 'zh' | 'en'
      sidebarWidth.value = settings.sidebar_width
      sidebarCollapsed.value = settings.sidebar_collapsed
      recentRepos.value = settings.recent_repos
      document.documentElement.setAttribute('data-theme', theme.value)
    } catch (e) {
      console.error('loadSettings error:', e)
    }
  }

  async function saveSettings() {
    try {
      await invoke('save_settings', {
        settings: {
          theme: theme.value,
          locale: locale.value,
          recent_repos: recentRepos.value,
          sidebar_width: sidebarWidth.value,
          sidebar_collapsed: sidebarCollapsed.value,
        },
      })
    } catch (e) {
      console.error('saveSettings error:', e)
    }
  }

  return { theme, locale, sidebarWidth, sidebarCollapsed, recentRepos, setTheme, setLocale, toggleSidebar, loadSettings, saveSettings }
})
