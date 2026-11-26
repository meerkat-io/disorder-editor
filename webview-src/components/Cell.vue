<script setup>
import { ref } from 'vue'

// Read-only, recursive view of a node built by disorder/view.js.
const props = defineProps({
  node: Object,
  expanded: { type: Boolean, default: false },
})
const open = ref(props.expanded)
</script>

<template>
  <span v-if="!node || node.t === 'empty'" class="value null">&nbsp;</span>

  <template v-else-if="node.t === 'struct'">
    <span class="collapsed">
      <span class="badge object">Struct</span>
      <span class="expand" @click="open = !open">{{ open ? '-' : '+' }}</span>
    </span>
    <table v-if="open">
      <thead><tr><th>field</th><th>value</th></tr></thead>
      <tbody>
        <tr v-for="field in node.fields" :key="field.key">
          <td class="member">{{ field.key }}</td>
          <td class="value"><Cell :node="field.node" /></td>
        </tr>
      </tbody>
    </table>
  </template>

  <template v-else-if="node.t === 'map'">
    <span class="collapsed">
      <span class="badge object">Map[{{ node.entries.length }}]</span>
      <span class="expand" @click="open = !open">{{ open ? '-' : '+' }}</span>
    </span>
    <table v-if="open">
      <thead><tr><th>key</th><th>value</th></tr></thead>
      <tbody>
        <tr v-for="entry in node.entries" :key="entry.key">
          <td class="member">{{ entry.key }}</td>
          <td class="value"><Cell :node="entry.node" /></td>
        </tr>
      </tbody>
    </table>
  </template>

  <template v-else-if="node.t === 'array'">
    <span class="collapsed">
      <span class="badge array">Array[{{ node.items.length }}]</span>
      <span class="expand" @click="open = !open">{{ open ? '-' : '+' }}</span>
    </span>
    <table v-if="open">
      <thead><tr><th></th><th>value</th></tr></thead>
      <tbody>
        <tr v-for="(item, index) in node.items" :key="index">
          <td class="member">{{ index }}</td>
          <td class="value"><Cell :node="item" /></td>
        </tr>
      </tbody>
    </table>
  </template>

  <span v-else :class="['value', node.t === 'string' || node.t === 'enum' || node.t === 'timestamp' ? 'string' : node.t === 'bool' ? 'boolean' : 'number']">{{ String(node.v) }}</span>
</template>
