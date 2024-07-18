<script setup>
import { ref, onMounted } from 'vue'
import { Type, Node } from './node'

import SchemaSelector from './components/SchemaSelector.vue'
import MessageSelector from './components/MessageSelector.vue'
import Cell from './components/Cell.vue'

// @ts-ignore
const vscode = acquireVsCodeApi();

const schemaView = 1
const messageView = 2
const datagridView = 3
const currentView = ref(0)

const schemaStatus = ref('empty')
const schemaMessages = ref([])
const nodeData = ref({})

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
      const node = new Node(message.body.name, message.body.type, message.body.value)
      console.log('show datagrid in app')
      console.log(node)
      nodeData.value = node
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
  <cell v-else-if="currentView == datagridView" :node="nodeData" />
</template>