<script setup>

import { ref } from 'vue'
import { Type, Node } from '../shared'

import MapTable from './MapTable.vue'

const props = defineProps({
  node: Node
})
</script>

<template>
  <map-table :node="node" />
</template>