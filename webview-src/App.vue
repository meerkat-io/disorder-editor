<script setup>
import {ref, onMounted, onUnmounted} from 'vue'

const vscode = acquireVsCodeApi();

const count = ref(0)

const showSchema = ref(false)
const showDataGrid = ref(false)

onMounted(window.addEventListener('message', event => {
  const message = event.data
  receiveMessage(message)
}))

function receiveMessage(message) {
  console.log('receiveMessage', message)
}

vscode.postMessage({command: 'ready'})

</script>

<template>
  <h1>Hello Vue 3</h1>
  <button @click="count++">Count is: {{ count }}</button>
</template>

<style scoped>
button {
  font-weight: bold;
}
</style>