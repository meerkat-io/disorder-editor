<script setup>

import { watch, toRef } from 'vue'
import { Type } from '../shared'

const props = defineProps(['type', 'value']);
const data = toRef(props, 'value');
//const emit = defineEmits(['onChange']);

watch(
    data,
    (value) => {
        console.log(`new value is: ${value}`)
    }
)

</script>

<template>
    <input v-if="type.type == Type.BOOL" type="checkbox" v-model="data" />
    <input v-else-if="type.type == Type.INT || type.type == Type.LONG" type="number" v-model="data" />
    <input v-else-if="type.type == Type.FLOAT || type.type == Type.DOUBLE" type="number" v-model="data" />
    <input v-else-if="type.type == Type.BYTES" type="file" /><!-- add label of length -->
    <input v-else-if="type.type == Type.STRING" type="text" v-model="data" />
    <input v-else-if="type.type == Type.TIMESTAMP" type="datetime-local" step="0.001" />
    <!-- add enum support-->
</template>