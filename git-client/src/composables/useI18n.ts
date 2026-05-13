import { useI18n as useVueI18n } from 'vue-i18n'

export function useI18nHelper() {
  const { t, locale } = useVueI18n()

  function setLocale(l: 'zh' | 'en') {
    locale.value = l
  }

  return { t, locale, setLocale }
}
