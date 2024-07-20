<script setup>
import { ref, toRef } from 'vue';
import { SchemaData, SchemaStatus } from '../shared';

const props = defineProps({
    schema: SchemaData
})
const schema = toRef(props)
const emit = defineEmits(['selectSchema', 'selectMessage'])
const message = ref('')
const container = ref('')
const submitDisabled = ref('false')

function onSelectSchema(event) {
    const file = event.target.files[0]
    if (file == null) {
        return
    }
    console.log('select schema:', file.path)
    emit('selectSchema', file.path)
}

function onSelectMessage() {
    if (schema.value.message === '' || schema.value.container === '') {
        return
    }
    submitDisabled.value = true
    emit('selectMessage', { message: message.value, container: container.value })
}
</script>

<template>
    <div>
        <input ref="upload" :disabled='schema.value.status == SchemaStatus.VALID' type ="file" name="upload" accept=".yaml, .yml" @change="onSelectSchema" />
        <br>
        <label v-if='schema.value.status == SchemaStatus.LOAD'>Select schema file (yaml)</label>
        <label v-else-if='schema.value.status == SchemaStatus.INVALID'>Schema file is invalid or corrupt, select a valid file instead</label>
    </div>

    <div v-if='schema.value.messages.length > 0'>
        <select v-model="message">
            <option disabled value="">Select message type</option>
            <option v-for="message in messages">{{ message }}</option>
        </select>
        <select v-model="container">
            <option disabled value="">Select container type</option>
            <option v-for="value in Container" :value="value">{{ value }}</option>
        </select>
        <button :disabled="submitDisabled" @click="onSelectMessage">Submit</button>
    </div>
</template>