<script setup>
import { onMounted, ref, toRef } from 'vue'
import { Type } from '../shared'

import TableHeader from './TableHeader.vue';
import Cell from './Cell.vue';
import Value from './Value.vue';

const props = defineProps(['node']);
const expanded = ref(false);
const headers = ref([
  { name: 'Key', resizable: true },
  { name: 'Value', resizable: true },
]);
const data = ref(new Map());
const node = toRef(props, 'node');
const bottomKey = ref(null)
const bottomValue = ref(null)

function toggle() {
  expanded.value = !expanded.value;
}

onMounted(() => {
  for (let [key, value] of node.value) {
    data.value.set(key, value);
  }
  if (data.value.size == 0) {
    data.value.set('123', '123');
  }
});
</script>

<template>
  <span class="collapsed">
    <span class="badge">Map[{{ node.value.length}}]</span>
    <span class="expand" @click="toggle">{{ expanded ? '-' : '+' }}</span>
  </span>
  <table v-if="expanded">
    <table-header :headers="headers"/>
    <tbody>
      <tr v-for="(value, key) in data" :key="key">
        <th>{{ key }}</th>
        <td><cell :element="value" /></td>
      </tr>
      <tr>
        <td :ref="bottomKey"><value :type="Type.STRING"/></td>
        <td :ref="bottomValue"><cell :type="node.type.reference"/></td>
      </tr>
    </tbody>
  </table>
</template>