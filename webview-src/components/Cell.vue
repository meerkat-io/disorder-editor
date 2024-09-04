<script setup>
import { Type } from '../shared'

import Value from './Value.vue';
import ArrayTable from './ArrayTable.vue';
import MapTable from './MapTable.vue'
import StructTable from './StructTable.vue';

const props = defineProps(['type', 'value', 'path']);
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
    <array-table v-if="props.type.type === Type.ARRAY" :type="props.type" v-model="value" :path="props.path" @edit="handleEdit" />
    <map-table v-else-if="props.type.type === Type.MAP" :type="props.type" v-model="value" :path="props.path" @edit="handleEdit" />
    <struct-table v-else-if="props.type.type === Type.STRUCT" :type="props.type" v-model="value" :path="props.path" @edit="handleEdit" />
    <value v-else :type="props.type" v-model="value" :path="props.path" @edit="handleEdit" />
</template>