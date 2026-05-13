import { createApp } from 'vue'
import App from './App.vue'
import { createPinia } from 'pinia'
import naive from './plugins/naive'
import i18n from './i18n'
import 'virtual:uno.css'
import '@unocss/reset/tailwind.css'
import './assets/styles/variables.css'
import './assets/styles/themes/dark.css'
import './assets/styles/themes/light.css'

const app = createApp(App)
app.use(createPinia())
app.use(naive)
app.use(i18n)
app.mount('#app')
