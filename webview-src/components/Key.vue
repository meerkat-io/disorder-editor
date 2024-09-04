<script setup>
import { Edit, Operation, OperationType } from '../shared'

const props = defineProps(['path']);
const emit = defineEmits(['edit']);
const value = defineModel({
    set(newValue) {
        sendEdit(value.value, newValue);
        return newValue;
    }
});

/**
 * @param {any} oldValue 
 * @param {any} newValue 
 */
function sendEdit(oldValue, newValue) {
    const undo = new Operation(OperationType.UPDATE, props.path, oldValue, -1);
    const redo = new Operation(OperationType.UPDATE, props.path, newValue, -1);
    emit('edit', new Edit(undo, redo));
}
</script>

<template>
    <input type="text" v-model="value" pattern="\w{1,255}" required />
</template>