import { createApp } from 'vue'
import App from './App.vue'
import SchemaSelector from './components/SchemaSelector.vue'

const app = createApp(App)
app.component( 'SchemaSelector', SchemaSelector )
app.mount('#app')