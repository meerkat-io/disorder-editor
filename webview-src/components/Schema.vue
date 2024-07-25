<script setup>
import { SchemaStatus } from '../shared';

const props = defineProps(['status']);
const emit = defineEmits(['select']);

function onSelect(event) {
    const file = event.target.files[0];
    if (file == null) {
        return;
    }
    emit('select', file.path);
}
</script>

<template>
    <input ref="upload" :disabled="status == SchemaStatus.VALID" type ="file" name="upload" accept=".yaml, .yml" @change="onSelect" />
    <br>
    <label v-if="status == SchemaStatus.LOAD">Select schema file (yaml)</label>
    <label v-else-if="status == SchemaStatus.INVALID">Schema file is invalid or corrupt, select a valid file instead</label>
</template>