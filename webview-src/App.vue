<script setup>
import { ref, onMounted } from 'vue'

// @ts-ignore
const vscode = acquireVsCodeApi();

const schemaView = 1
const messageView = 2
const datagridView = 3
const currentView = ref(0)

const schemaStatus = ref('empty')
const schemaMessages = ref([])

// @ts-ignore
onMounted(window.addEventListener('message', (event) => receiveMessage(event.data)))

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
      break
  }
}

vscode.postMessage({ command: 'ready' })

</script>

<template>
  <schema-selector v-if="currentView == schemaView"
    @select="(path) => vscode.postMessage({ command: 'schema', body: path })" :status="schemaStatus" />
  <message-selector v-else-if="currentView == messageView"
    @select="(message) => vscode.postMessage({ command: 'message', body: message })" :messages="schemaMessages" />
</template>