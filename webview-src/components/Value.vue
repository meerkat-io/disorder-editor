<script setup>
import { Type, Edit, Operation, OperationType } from '../shared'

const props = defineProps(['type', 'path']);
const emit = defineEmits(['edit']);
const value = defineModel({
    set(newValue) {
        console.log('update value ==============');
        console.log('old value:', value.value);
        console.log('new value:', newValue);
        console.log('type in define:', props.type.type);
        console.log('type of instance', typeof newValue);
        if (props.type.type == Type.INT || props.type.type == Type.LONG) {
            newValue = Math.floor(newValue);
        }

        sendEdit(value.value, newValue);
        return newValue;
    }
});

/**
 * @param {any} oldValue 
 * @param {any} newValue 
 */
function sendEdit(oldValue, newValue) {
    const undo = new Operation(OperationType.UPDATE, props.path, oldValue);
    const redo = new Operation(OperationType.UPDATE, props.path, newValue);
    emit('edit', new Edit(undo, redo));
}   
</script>

<template>
    <input v-if="props.type.type == Type.BOOL" type="checkbox" v-model="value" />
    <input v-else-if="props.type.type == Type.INT || props.type.type == Type.LONG" type="number" v-model="value" />
    <input v-else-if="props.type.type == Type.FLOAT || props.type.type == Type.DOUBLE" type="number" v-model="value" />
    <input v-else-if="props.type.type == Type.BYTES" type="file" /><!-- TODO, add label of length -->
    <input v-else-if="props.type.type == Type.STRING" type="text" v-model="value" />
    <input v-else-if="props.type.type == Type.TIMESTAMP" type="datetime-local" step="0.001" v-model="value" />
    <!-- add enum support-->
</template>