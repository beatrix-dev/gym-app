import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { loadConfig } from './config'
import { useAuthStore } from './stores/auth'
import './style.css'

async function bootstrap() {
  await loadConfig()
  const app = createApp(App)
  app.use(createPinia())
  await useAuthStore().init()
  app.use(router)
  app.mount('#app')
}

bootstrap()
