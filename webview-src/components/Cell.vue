<script setup>

import { Type } from '../shared'

import MapTable from './MapTable.vue'
import Value from './Value.vue';

const props = defineProps(['type', 'value']);
const value = defineModel();
const emit = defineEmits(['edit']);

/**
 * @param {Object} edit
 */
function handleEdit(edit) {
    emit('edit', edit);
}
</script>

<template>
    <map-table v-if="props.type.type == Type.MAP" :type="props.type" v-model="value" @edit="handleEdit" />
    <value v-else :type="props.type" v-model="value" @edit="handleEdit" />
</template>