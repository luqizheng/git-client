import { useAppStore } from '../stores/app'

export function useTheme() {
  const app = useAppStore()

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', app.theme)
    if (app.theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  function toggleTheme() {
    app.setTheme(app.theme === 'dark' ? 'light' : 'dark')
    applyTheme()
  }

  return { theme: app.theme, toggleTheme, applyTheme }
}
