<script setup>
import { ref } from 'vue'
const props = defineProps({
  messages: {
    type: Array
  }
})
const emit = defineEmits(['select'])
const message = ref('')
const container = ref('')
const buttonDisabled = ref(false)

function onSelect() {
    if (message.value === '' || container.value === '') {
        return
    }
    console.log('root message:', message.value)
    buttonDisabled.value = true
    emit('select', { message: message.value, container: container.value })
}
</script>

<template>
    <select v-model="message">
        <option disabled value="">Select root message type</option>
        <option v-for="message in messages">{{ message }}</option>
    </select>
    <select v-model="container">
        <option disabled value="">Select container type</option>
        <option value="none">none</option>
        <option value="array">array</option>
        <option value="map">map</option>
    </select>
    <button :disabled="buttonDisabled" @click="onSelect">Select</button>
</template>