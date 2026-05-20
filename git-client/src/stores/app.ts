import { defineStore } from 'pinia'
import { ref } from 'vue'
import { invoke } from '../utils/ipc'

interface AppSettings {
  theme: string
  locale: string
  recent_repos: string[]
  sidebar_width: number
  sidebar_collapsed: boolean
  startup_action: string
  auto_fetch_interval: number
  confirm_force_push: boolean
  confirm_discard: boolean
  confirm_reset: boolean
}

export const useAppStore = defineStore('app', () => {
  const theme = ref<'dark' | 'light' | 'system'>('dark')
  const locale = ref<'zh' | 'en'>('zh')
  const sidebarWidth = ref(180)
  const sidebarCollapsed = ref(false)
  
  const settings = ref<AppSettings>({
    theme: 'dark',
    locale: 'zh',
    recent_repos: [],
    sidebar_width: 180,
    sidebar_collapsed: false,
    startup_action: 'welcome',
    auto_fetch_interval: 60,
    confirm_force_push: true,
    confirm_discard: true,
    confirm_reset: true,
  })

  function setTheme(t: 'dark' | 'light' | 'system') {
    theme.value = t
    const resolvedTheme = t === 'system' 
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : t
    document.documentElement.setAttribute('data-theme', resolvedTheme)
    settings.value.theme = t
    saveSettings()
  }

  function setLocale(l: 'zh' | 'en') {
    locale.value = l
    settings.value.locale = l
    saveSettings()
  }

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
    settings.value.sidebar_collapsed = sidebarCollapsed.value
    saveSettings()
  }

  async function loadSettings() {
    try {
      const loaded = await invoke<AppSettings>('load_settings')
      theme.value = (loaded.theme || 'dark') as 'dark' | 'light' | 'system'
      locale.value = (loaded.locale || 'zh') as 'zh' | 'en'
      sidebarWidth.value = loaded.sidebar_width || 180
      sidebarCollapsed.value = loaded.sidebar_collapsed || false
      
      settings.value = {
        ...settings.value,
        ...loaded,
        theme: theme.value,
        locale: locale.value,
        sidebar_width: sidebarWidth.value,
        sidebar_collapsed: sidebarCollapsed.value,
      }
      
      const resolvedTheme = theme.value === 'system' 
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : theme.value
      document.documentElement.setAttribute('data-theme', resolvedTheme)
    } catch (e) {
      console.error('loadSettings error:', e)
    }
  }

  async function saveSettings() {
    try {
      const { useRepoStore } = await import('./repo')
      const repo = useRepoStore()
      await invoke('save_settings', {
        settings: {
          theme: settings.value.theme,
          locale: settings.value.locale,
          recent_repos: repo.recentRepos,
          sidebar_width: settings.value.sidebar_width,
          sidebar_collapsed: settings.value.sidebar_collapsed,
          startup_action: settings.value.startup_action,
          auto_fetch_interval: settings.value.auto_fetch_interval,
          confirm_force_push: settings.value.confirm_force_push,
          confirm_discard: settings.value.confirm_discard,
          confirm_reset: settings.value.confirm_reset,
        },
      })
    } catch (e) {
      console.error('saveSettings error:', e)
    }
  }

  return { 
    theme, 
    locale, 
    sidebarWidth, 
    sidebarCollapsed,
    settings,
    setTheme, 
    setLocale, 
    toggleSidebar, 
    loadSettings, 
    saveSettings 
  }
})
