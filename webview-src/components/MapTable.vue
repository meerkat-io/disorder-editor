<script setup>
import { onMounted, ref, toRef } from 'vue'
import TableHeader from './TableHeader.vue';

const props = defineProps(['node']);
const expanded = ref(false);
const headers = ref([
  { name: 'Key', resizable: true },
  { name: 'Value', resizable: true },
]);
const data = ref(new Map());
const node = toRef(props, 'node');

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
  <table>
    <table-header v-if="expanded" :headers="headers"/>
    <tbody>
      <tr v-for="(value, key) in data" class="object member" :key="key">
        <th class="object key">{{ key }}</th>
        <td class="object element"><cell :element="value" /></td>
      </tr>
    </tbody>
  </table>
</template>