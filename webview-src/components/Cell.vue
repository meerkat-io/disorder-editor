<script setup>

import { ref } from 'vue'
import { Type } from '../shared'

import MapTable from './MapTable.vue'
import Value from './Value.vue';

const props = defineProps(['node']);
</script>

<template>
  <map-table v-if="node.type.type == Type.MAP" :node="node" />
  <value v-else :node="node" />
</template>