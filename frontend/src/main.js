import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
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

app.mount('#app')
