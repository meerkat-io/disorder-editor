<script setup>
import { ref } from 'vue'
import TableHeader from './TableHeader.vue';

const props = defineProps(['node']);
const expanded = ref(false);
const headers = ref([
  { name: 'Key', resizable: true },
  { name: 'Value', resizable: true },
]);

function toggle() {
  expanded.value = !expanded.value;
}
</script>

<template>
  <span class="collapsed">
    <span class="badge">Map[{{ node.value.length}}]</span>
    <span class="expand" @click="toggle">{{ expanded ? '-' : '+' }}</span>
  </span>
  <table>
    <table-header v-if="expanded" :headers="headers">
    </table-header>
    <tbody>
    </tbody>
  </table>
</template>