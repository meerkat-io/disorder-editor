import { createApp } from 'vue'
import App from './App.vue'
import SchemaSelector from './components/SchemaSelector.vue'
import MessageSelector from './components/MessageSelector.vue'

const app = createApp(App)
app.component( 'SchemaSelector', SchemaSelector )
app.component( 'MessageSelector', MessageSelector )
app.mount('#app')