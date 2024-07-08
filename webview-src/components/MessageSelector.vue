<script setup>
import { ref } from 'vue'
const props = defineProps({
  messages: {
    type: Array
  }
})
const emit = defineEmits(['select'])
const selected = ref('')

function onSelect() {
    if (selected.value === '') {
        return
    }
    console.log('root message:', selected.value)
    emit('select', selected.value)
}
</script>

<template>
    <select v-model="selected">
        <option disabled value="">Select root message type</option>
        <option v-for="message in messages">{{ message }}</option>
    </select>
    <button @click="onSelect">Select</button>
</template>