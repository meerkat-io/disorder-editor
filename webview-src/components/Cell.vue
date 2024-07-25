<script setup>

import { ref } from 'vue'

import MapTable from './MapTable.vue'

const props = defineProps(['node']);
</script>

<template>
  <map-table :node="node" />
</template>