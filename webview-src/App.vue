<script setup>
import { ref, onMounted } from 'vue'

const vscode = acquireVsCodeApi();

const schema = 0
const message = 1
const datagrid = 2
const current = ref(0)

const schemaStatus = ref('empty')

onMounted(window.addEventListener('message', (event) => receiveMessage(event.data)))

function receiveMessage(message) {
  console.log('receiveMessage', message)
  switch (message.command) {
    case 'select_schema':
      current.value = schema
      schemaStatus.value = message.body
      break

    case 'select_message':
      current.value = message
      break
  }
}

vscode.postMessage({ command: 'ready' })

</script>

<template>
  <schema-selector v-if="current == schema" @select="(path) => vscode.postMessage({ command: 'schema', body: path })" :status="schemaStatus"/>
</template>