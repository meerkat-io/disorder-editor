<script setup>

import { Type } from '../shared'

import MapTable from './MapTable.vue'
import Value from './Value.vue';

const props = defineProps(['type', 'value']);
</script>

<template>
    <map-table v-if="type.type == Type.MAP" :type="type" :value="value" />
    <value v-else :type="type" :value="value" />
</template>