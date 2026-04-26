import { ref } from 'vue'

type Theme = 'dark' | 'light'

const theme = ref<Theme>('dark')

export function useTheme() {
  function applyTheme(t: Theme) {
    theme.value = t
    document.documentElement.dataset.theme = t === 'light' ? 'light' : ''
    localStorage.setItem('theme', t)
  }

  function toggle() {
    applyTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  function init() {
    const saved = (localStorage.getItem('theme') as Theme) ?? 'dark'
    applyTheme(saved)
  }

  return { theme, toggle, init }
}
