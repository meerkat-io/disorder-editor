<script setup>
import { ref } from 'vue';
import { SchemaStatus } from '../shared';

const props = defineProps(['status']);
const emit = defineEmits(['select']);
const upload = ref();

function onSelect(event) {
    const file = event.target.files[0];
    if (file === null) {
        return;
    }
    emit('select', file.path);
}
</script>

<template>
    <input type='file' ref="upload" style="display:none" :disabled="props.status === SchemaStatus.VALID" accept=".yaml, .yml"
    @change="onSelect" />
    <button @click="upload.click()">load schema</button>
    <br>
    <br>
    <label v-if="props.status === SchemaStatus.INVALID">Schema file is invalid or corrupt, select another one.</label>
</template>