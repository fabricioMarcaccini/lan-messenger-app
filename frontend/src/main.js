import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import vue3GoogleLogin from 'vue3-google-login'
import './styles/main.css'
import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
    onNeedRefresh() {
        // Optionally ask user to refresh
    },
    onOfflineReady() {
        // Ready to work offline
    },
})
const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(vue3GoogleLogin, {
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '722758149135-onjg5g352a5kdvpvq7tff145bbmvvrfs.apps.googleusercontent.com'
})

app.mount('#app')
