<script setup>
import { ref, onMounted, provide } from 'vue'
import { replaceAt } from './tree'

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

// Edits are answered by the extension host (validated against the schema).
let nextEdit = 1
const pendingEdits = new Map()
const request = (command, body) => new Promise(resolve => {
  const id = nextEdit++
  pendingEdits.set(id, resolve)
  vscode.postMessage({ command, body: { id, ...body } })
})
provide('editNode', (path, text) => request('edit', { path, text }))
// 'add' (an array item, map entry or struct field) and 'remove' answer with an error or nothing.
provide('mutate', request)

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

    case 'edit_result': {
      const resolve = pendingEdits.get(message.body.id)
      pendingEdits.delete(message.body.id)
      if (message.body.node) replaceAt(grid.value, message.body.path, message.body.node)
      if (resolve) resolve({ error: message.body.error })
      break
    }

    case 'update_node': // undo / redo
      if (grid.value) replaceAt(grid.value, message.body.path, message.body.node)
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