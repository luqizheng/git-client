import { createApp } from 'vue'
import App from './App.vue'
import { createPinia } from 'pinia'
import 'virtual:uno.css'
import '@unocss/reset/tailwind.css'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
