<script setup>
import { ref, onMounted } from 'vue'

const vscode = acquireVsCodeApi();

const schemaView = 0
const messageView = 1
const datagridView = 2
const currentView = ref(0)

const schemaStatus = ref('empty')
const schemaMessages = ref([])

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