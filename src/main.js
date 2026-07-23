import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import {initializeTheme} from './utils/themePreference'
import {installNativeAlertBridge} from './components/systemDialog'
import './style.css'
import './styles/macos-ui.css'

initializeTheme()
installNativeAlertBridge()

const app = createApp(App)

app.use(router)
app.mount('#app')
