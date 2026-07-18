import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import {initializeTheme} from './utils/themePreference'
import './style.css'
import './styles/macos-ui.css'

initializeTheme()

const app = createApp(App)

app.use(router)
app.mount('#app')
