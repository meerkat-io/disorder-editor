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
  console.log("node in map-table:", node.value);
  console.log(node.value.type.reference)
  for (let [key, value] of node.value.value) {
    data.value.set(key, value);
  }
});
</script>

<template>
  <span class="collapsed">
    <span class="badge">Map[{{ node.value.length }}]</span>
    <span class="expand" @click="toggle">{{ expanded ? '-' : '+' }}</span>
  </span>
  <table v-if="expanded">
    <table-header :headers="headers" />
    <tbody>
      <tr v-for="(value, key) in data" :key="key">
        <th>{{ key }}</th>
        <td>
          <cell :element="value" />
        </td>
      </tr>
      <tr>
        <td :ref="bottomKey">
          <cell :node="{ type: new Type(Type.STRING) }" />
        </td>
        <td :ref="bottomValue">
          <cell :node="{ type: node.type.reference }" />
        </td>
      </tr>
    </tbody>
  </table>
</template>