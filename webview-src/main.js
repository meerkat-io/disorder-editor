import { createApp } from 'vue'
import './app.css'
import App from './App.vue'
import SchemaSelector from './components/SchemaSelector.vue'
import Cell from './components/Cell.vue'
import MessageSelector from './components/MessageSelector.vue'

const app = createApp(App)
app.component( 'SchemaSelector', SchemaSelector )
app.component( 'MessageSelector', MessageSelector )
app.component( 'Cell', Cell )
app.mount('#app')