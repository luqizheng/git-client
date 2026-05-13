import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const theme = ref<'dark' | 'light'>('dark')
  const locale = ref<'zh' | 'en'>('zh')
  const sidebarWidth = ref(240)
  const sidebarCollapsed = ref(false)

  function setTheme(t: 'dark' | 'light') {
    theme.value = t
  }

  function setLocale(l: 'zh' | 'en') {
    locale.value = l
  }

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  return { theme, locale, sidebarWidth, sidebarCollapsed, setTheme, setLocale, toggleSidebar }
})
