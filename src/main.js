import './assets/main.css'
import { createApp } from 'vue'
import App from './App.vue'

// Initialize Firebase first
import { db } from './firebase'

// Create Vue app
const app = createApp(App)

// Mount the app
app.mount('#app')
