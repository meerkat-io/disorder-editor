<script setup>
import { ref } from 'vue'
defineProps({
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
    buttonDisabled.value = true
    emit('select', { message: message.value, container: container.value })
}
</script>

<template>
    <div class="wizard">
        <h2>New Disorder file</h2>
        <p class="hint">Step 2 of 2: choose the root message and how it is stored.</p>
        <label>Root message
            <select v-model="message">
                <option disabled value="">Select root message type</option>
                <option v-for="m in messages" :key="m">{{ m }}</option>
            </select>
        </label>
        <label>Container
            <select v-model="container">
                <option disabled value="">Select container type</option>
                <option value="none">none</option>
                <option value="array">array</option>
                <option value="map">map</option>
            </select>
        </label>
        <button type="button" class="primary" :disabled="buttonDisabled || message === '' || container === ''"
            @click="onSelect">Create</button>
    </div>
</template>
