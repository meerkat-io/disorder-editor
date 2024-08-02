<script setup>

import { ref } from 'vue'
import { Type } from '../shared'

const props = defineProps(['node']);
</script>

<template>
    <input v-if="node.type.type == Type.BOOL" type="checkbox" />
    <input v-else-if="node.type.type == Type.INT || node.type.type == Type.LONG" type="number" />
    <input v-else-if="node.type.type == Type.FLOAT || node.type.type == Type.DOUBLE" type="number" />
    <input v-else-if="node.type.type == Type.BYTES" type="file" /><!-- add label of length -->
    <input v-else-if="node.type.type == Type.STRING" type="text" />
    <input v-else-if="node.type.type == Type.TIMESTAMP" type="datetime-local" step="0.001">
    <!-- add enum support-->
</template>