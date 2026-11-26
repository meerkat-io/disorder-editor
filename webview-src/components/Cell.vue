<script setup>
import { ref, inject, nextTick } from 'vue'
import Primitive from './Primitive.vue'

// Recursive view of a node built by disorder/view.js. `path` addresses the node from the root.
const props = defineProps({
  node: Object,
  path: { type: Array, default: () => [] },
  expanded: { type: Boolean, default: false },
})
const mutate = inject('mutate')
const open = ref(props.expanded)
const error = ref('')
const adding = ref(false)
const newKey = ref('')
const keyInput = ref(null)

// Maps ask for the new entry's key first; arrays append; structs set a named field.
function startAdd() {
  error.value = ''
  open.value = true
  if (props.node.t === 'map') {
    newKey.value = ''
    adding.value = true
    nextTick(() => keyInput.value?.focus())
  } else {
    add()
  }
}

async function add(key) {
  const result = await mutate('add', { path: props.path, key })
  error.value = result.error || ''
  if (!result.error) {
    adding.value = false
    open.value = true
  }
}

async function remove(key) {
  const result = await mutate('remove', { path: [...props.path, key] })
  error.value = result.error || ''
}

function cancelAdd() {
  adding.value = false
  error.value = ''
}
</script>

<template>
  <span v-if="!node || node.t === 'empty'" class="v-empty">&mdash;</span>

  <template v-else-if="node.t === 'struct' || node.t === 'map' || node.t === 'array'">
    <span class="collapsed" :class="{ unset: node.unset }">
      <span v-if="node.t === 'struct'" class="badge object">Struct</span>
      <span v-else-if="node.t === 'map'" class="badge object">Map[{{ node.entries.length }}]</span>
      <span v-else class="badge array">Array[{{ node.items.length }}]</span>
      <span class="expand" @click="open = !open">{{ open ? '-' : '+' }}</span>
      <button v-if="node.t !== 'struct'" class="icon-btn add" type="button"
        :title="node.t === 'map' ? 'Add entry' : 'Add item'" @click="startAdd">+ add</button>
    </span>
    <span v-if="adding" class="editor">
      <input ref="keyInput" v-model="newKey" class="edit-input" :class="{ invalid: error }" placeholder="new key"
        spellcheck="false" @keydown.enter.prevent="add(newKey)" @keydown.esc.prevent="cancelAdd" @input="error = ''"
        @blur="cancelAdd" />
    </span>
    <span v-if="error" class="edit-error">{{ error }}</span>

    <table v-if="open && node.t === 'struct'">
      <thead><tr><th>field</th><th>value</th></tr></thead>
      <tbody>
        <tr v-for="field in node.fields" :key="field.key">
          <td class="key">
            {{ field.key }}
            <button v-if="field.node && !field.node.unset" class="icon-btn del" type="button" title="Unset field" @click="remove(field.key)">&times;</button>
          </td>
          <td class="val">
            <Cell v-if="field.node" :node="field.node" :path="[...path, field.key]" />
            <!-- only a struct that contains itself: it has no default to show -->
            <template v-else>
              <span class="v-empty">&mdash;</span>
              <button class="icon-btn add" type="button" title="Set field" @click="add(field.key)">set</button>
            </template>
          </td>
        </tr>
      </tbody>
    </table>

    <table v-if="open && node.t === 'map'">
      <thead><tr><th>key</th><th>value</th></tr></thead>
      <tbody>
        <tr v-for="entry in node.entries" :key="entry.key">
          <td class="key">
            {{ entry.key }}
            <button class="icon-btn del" type="button" title="Remove entry" @click="remove(entry.key)">&times;</button>
          </td>
          <td class="val"><Cell :node="entry.node" :path="[...path, entry.key]" /></td>
        </tr>
      </tbody>
    </table>

    <table v-if="open && node.t === 'array'">
      <thead><tr><th></th><th>value</th></tr></thead>
      <tbody>
        <tr v-for="(item, index) in node.items" :key="index">
          <td class="key">
            {{ index }}
            <button class="icon-btn del" type="button" title="Remove item" @click="remove(index)">&times;</button>
          </td>
          <td class="val"><Cell :node="item" :path="[...path, index]" /></td>
        </tr>
      </tbody>
    </table>
  </template>

  <Primitive v-else :node="node" :path="path" />
</template>
