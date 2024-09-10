<script setup>
import { ref } from 'vue';
import { Type, Edit, Operation, OperationType } from '../shared'

const props = defineProps(['type', 'path']);
const emit = defineEmits(['edit']);
const value = defineModel({
    set(newValue) {
        if (props.type.type === Type.INT) {
            newValue = Math.floor(parseInt(newValue));
        } else if (props.type.type === Type.LONG) {
            newValue = BigInt(newValue);
        }

        sendEdit(value.value, newValue);
        return newValue;
    }
});
const upload = ref();

//TODO fix time, bytes encoding

/**
 * @param {any} oldValue 
 * @param {any} newValue 
 */
function sendEdit(oldValue, newValue) {
    const undo = new Operation(OperationType.UPDATE, props.path, oldValue, -1);
    const redo = new Operation(OperationType.UPDATE, props.path, newValue, -1);
    emit('edit', new Edit(undo, redo));
}

function load(event) {
    const file = event.target.files[0];
    if (file === null) {
        return;
    }
    var reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = onload;
}

function onload(event) {
    var array = new Int8Array(event.target.result);
    value.value = array;
}
</script>

<template>
    <input v-if="props.type.type === Type.BOOL" type="checkbox" v-model="value" />
    <input v-if="props.type.type === Type.INT || props.type.type === Type.LONG" pattern="^-?\d+$" type="text"
        v-model="value" />
    <input v-if="props.type.type === Type.FLOAT || props.type.type === Type.DOUBLE" type="number" v-model="value" />
    <div v-if="props.type.type === Type.BYTES">
        <input type='file' ref="upload" style="display:none" @change="load">
        <button @click="upload.click()">load bytes</button>
        <label v-if="value === null">[0]</label>
        <label v-else>[{{ value.length }}]</label>
    </div>
    <input v-if="props.type.type === Type.STRING" type="text" v-model="value" />
    <input v-if="props.type.type === Type.TIMESTAMP" type="datetime-local" step="0.001" v-model="value" />
    <select v-if="props.type.type === Type.ENUM" v-model="value">
        <option v-for="item in props.type.enums">{{ item }}</option>
    </select>
</template>