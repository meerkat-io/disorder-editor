<script setup>
import { Type } from '../shared'

const props = defineProps(['type']);
const emit = defineEmits(['edit']);
const value = defineModel({
    set(newValue) {
        console.log('update value ==============');
        console.log('value:', newValue);
        console.log('type in define:', props.type.type);
        console.log('type of instance', typeof newValue);
        if (props.type.type == Type.INT || props.type.type == Type.LONG) {
            newValue = Math.floor(newValue);
        }
        emit('edit', {
            'ops': 'update',
            'path': 'path',
            'value': newValue
        });
        return newValue;
    }
});
</script>

<template>
    <input v-if="props.type.type == Type.BOOL" type="checkbox" v-model="value" />
    <input v-else-if="props.type.type == Type.INT || props.type.type == Type.LONG" type="number" v-model="value" />
    <input v-else-if="props.type.type == Type.FLOAT || props.type.type == Type.DOUBLE" type="number" v-model="value" />
    <input v-else-if="props.type.type == Type.BYTES" type="file" /><!-- add label of length -->
    <input v-else-if="props.type.type == Type.STRING" type="text" v-model="value" />
    <input v-else-if="props.type.type == Type.TIMESTAMP" type="datetime-local" step="0.001" />
    <!-- add enum support-->
</template>