<script setup>

import { ref } from 'vue'
import { Type } from '../shared'

const props = defineProps(['type']);
</script>

<template>
    <input v-if="type == Type.BOOL" type="checkbox" />
    <input v-else-if="type == Type.INT || type == Type.LONG || type == Type.FLOAT || type == Type.DOUBLE"
        type="number" />
    <input v-else-if="type == Type.BYTES" type="file" /><!-- add label of length -->
    <input v-else-if="type == Type.STRING" type="text" />
    <input v-else-if="type == Type.TIMESTAMP" type="datetime-local" step="0.001">
    <!-- add enum support-->
</template>