<script setup>
import { ref, onMounted } from 'vue'

const vscode = acquireVsCodeApi();

const schemaView = 0
const messageView = 1
const datagridView = 2
const errorView = 3
const currentView = ref(0)

const schemaStatus = ref('empty')
const schemaMessages = ref([])
const grid = ref(null)
const error = ref('')

onMounted(() => window.addEventListener('message', (event) => receiveMessage(event.data)))

function receiveMessage(message) {
  console.log('receiveMessage', message)
  switch (message.command) {
    case 'select_schema':
      currentView.value = schemaView
      schemaStatus.value = message.body
      break

    case 'select_message':
      currentView.value = messageView
      schemaMessages.value = message.body
      break

    case 'show_datagrid':
      currentView.value = datagridView
      grid.value = message.body
      break

    case 'show_error':
      currentView.value = errorView
      error.value = message.body
      break
  }
}

vscode.postMessage({ command: 'ready' })

</script>

<template>
  <schema-selector v-if="currentView == schemaView"
    @select="() => vscode.postMessage({ command: 'pick_schema' })" :status="schemaStatus" />
  <message-selector v-else-if="currentView == messageView"
    @select="(message) => vscode.postMessage({ command: 'message', body: message })" :messages="schemaMessages" />
  <div v-else-if="currentView == datagridView" class="grid-page">
    <div class="header">
      <span class="title">{{ grid.message }}</span>
      <span class="badge" :class="grid.container === 'array' ? 'array' : 'object'">{{ grid.container }}</span>
      <span class="schema" :title="grid.schemaPath">{{ grid.schemaPath }}</span>
    </div>
    <div class="grid-body">
      <cell :node="grid.root" :expanded="true" />
    </div>
  </div>
  <div v-else-if="currentView == errorView" class="wizard">
    <h2>Cannot open file</h2>
    <p class="hint error">{{ error }}</p>
  </div>
</template>