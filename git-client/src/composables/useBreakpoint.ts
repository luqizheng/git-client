import { ref, computed, onMounted, onUnmounted } from 'vue'

export interface Breakpoints {
  small: number
  medium: number
  large: number
}

const DEFAULT_BREAKPOINTS: Breakpoints = { small: 768, medium: 1024, large: 1440 }

export function useBreakpoints(custom?: Partial<Breakpoints>) {
  const bp = { ...DEFAULT_BREAKPOINTS, ...custom }
  const width = ref(window.innerWidth)
  const isSmall = computed(() => width.value < bp.small)
  const isMedium = computed(() => width.value >= bp.small && width.value < bp.large)
  const isLarge = computed(() => width.value >= bp.large)

  function onResize() { width.value = window.innerWidth }

  onMounted(() => window.addEventListener('resize', onResize))
  onUnmounted(() => window.removeEventListener('resize', onResize))

  return { width, isSmall, isMedium, isLarge }
}
