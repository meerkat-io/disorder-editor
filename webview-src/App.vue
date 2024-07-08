<script setup>
import {ref, onMounted, onUnmounted} from 'vue'

const vscode = acquireVsCodeApi();

const selectSchema = ref(false)
const showDataGrid = ref(false)

onMounted(window.addEventListener('message', event => {
  const message = event.data
  receiveMessage(message)
}))

function receiveMessage(message) {
  console.log('receiveMessage', message)
  switch (message.command) {
    case 'select_schema':
      selectSchema.value = true
      break

    case 'showDataGrid':
      showDataGrid.value = true
      break
  }
}

vscode.postMessage({command: 'ready'})

</script>

<template>
  <schema-selector v-if="selectSchema"/>
</template>

<style scoped>
button {
  font-weight: bold;
}
</style>