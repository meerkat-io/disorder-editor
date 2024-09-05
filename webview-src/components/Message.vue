<script setup>
import { ref } from 'vue';
import { Container } from '../shared';

const props = defineProps(['messages']);
const emit = defineEmits(['select']);

const message = ref('');
const container = ref('');
const submitDisabled = ref(false);

function onSelect() {
    if (message.value === '' || container.value === '') {
        return;
    }
    submitDisabled.value = true;
    emit('select', { message: message.value, container: container.value });
}
</script>

<template>
    <select v-model="message" :style="{ width: '160px' }">
        <option disabled value="">Select message type</option>
        <option v-for="message in messages">{{ message }}</option>
    </select>
    <select v-model="container" :style="{ width: '160px', marginLeft: '20px' }">
        <option disabled value="">Select container type</option>
        <option v-for=" value in Container" :value="value">{{ value }}</option>
    </select>
    <button :disabled="submitDisabled" :style="{ width: '60px', marginLeft: '20px' }" @click="onSelect">Select</button>
</template>