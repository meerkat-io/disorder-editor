<script setup>
import { ref, onMounted } from 'vue'
import { SchemaStatus, Node, SchemaData } from './shared'

import Schema from './components/Schema.vue'
import Cell from './components/Cell.vue'

// @ts-ignore
const vscode = acquireVsCodeApi();

const schema = ref(new SchemaData)
const view = ref(0)
const root = ref()

const View = {
  NONE: 0,
  SCHEMA: 1,
  DATA: 2,
}

onMounted(() => { 
  // @ts-ignore
  window.addEventListener('message', (event) => receiveMessage(event.data)) 
})

function receiveMessage(message) {
  console.log('receiveMessage', message)
  switch (message.command) {
    case 'select_schema':
      view.value = View.SCHEMA;
      schema.value.status = message.body
      break

    case 'select_message':
      view.value = View.SCHEMA;
      schema.value.messages = message.body
      break

    case 'show_datagrid':
      view.value = View.DATA;
      const node = new Node(undefined, message.body.type, message.body.value)
      root.value = node
      break
  }
}

vscode.postMessage({ command: 'ready' })

</script>

<template>
  <schema v-if="view == View.SCHEMA"
    @selectSchema="(schemaPath) => vscode.postMessage({ command: 'schema', body: schemaPath })"
    @selectMessage="(message) => vscode.postMessage({ command: 'message', message})" :schema="schema" />
  <cell v-else-if="view == View.DATA" :node="schemaMessages" />
</template>