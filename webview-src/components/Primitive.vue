<script setup>
import { ref, computed, inject, nextTick } from 'vue'

// One editable value. The extension validates the text against the schema type and
// answers with the accepted node (shown via the `node` prop) or an error message.
let groups = 0
const props = defineProps({
  node: Object,
  path: { type: Array, default: () => [] },
})
const editNode = inject('editNode')

const node_text = node => node.t === 'string' ? node.v.replace(/\r?\n/g, '\u21b5') : String(node.v)
const group = 'bool-' + (groups++)
const editing = ref(false)
const draft = ref('')
const error = ref('')
const input = ref(null)
let busy = false

const hints = {
  int: 'whole number',
  long: 'whole number',
  float: 'number',
  double: 'number',
  timestamp: '2024-01-02T03:04:05.678Z',
  bytes: 'base64',
}

async function commit(text) {
  if (busy) return false
  busy = true
  const result = await editNode(props.path, text)
  busy = false
  error.value = result.error || ''
  if (!result.error) editing.value = false
  return !result.error
}

// The native picker has no timezone, so it edits the UTC date and time (what is stored).
// Newlines would collapse in the single-line cell; show them as a symbol.
const shown = computed(() => node_text(props.node))
const isTime = () => props.node.t === 'timestamp'
const toPicker = iso => iso.replace(/Z$/, '')
const fromPicker = value => value + 'Z'
const pad = (n, width = 2) => String(n).padStart(width, '0')

function now() {
  const d = new Date()
  draft.value = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}.${pad(d.getUTCMilliseconds(), 3)}`
  error.value = ''
  input.value?.focus()
}

function start() {
  draft.value = isTime() ? toPicker(String(props.node.v)) : String(props.node.v)
  error.value = ''
  editing.value = true
  nextTick(() => {
    input.value?.focus()
    input.value?.select()
  })
}

function cancel() {
  editing.value = false
  error.value = ''
}

function submit() {
  return commit(isTime() ? fromPicker(draft.value) : draft.value)
}

function blur() {
  if (!editing.value) return
  // Leaving a field that is still invalid (nothing typed since the error) discards the edit.
  if (error.value) cancel()
  else submit()
}

async function pick(event) {
  const select = event.target
  if (!(await commit(select.value))) select.value = props.node.v
}
</script>

<template>
  <span v-if="node.t === 'bool'" class="radios" :class="{ invalid: error, unset: node.unset }">
    <label><input type="radio" :name="group" :checked="node.v === true" @change="commit('true')" /> true</label>
    <label><input type="radio" :name="group" :checked="node.v === false" @change="commit('false')" /> false</label>
  </span>

  <span v-else-if="node.t === 'enum'" class="editor">
    <select class="enum-select" :class="{ unset: node.unset }" :value="node.v" @change="pick">
      <option v-for="option in node.options" :key="option" :value="option">{{ option }}</option>
    </select>
    <span v-if="error" class="edit-error">{{ error }}</span>
  </span>

  <span v-else-if="editing && node.t === 'timestamp'" class="editor">
    <span class="time-edit">
      <input ref="input" v-model="draft" type="datetime-local" step="0.001" class="edit-input time-input"
        :class="{ invalid: error }" @keydown.enter.prevent="submit" @keydown.esc.prevent="cancel" @input="error = ''"
        @blur="blur" />
      <span class="tz">UTC</span>
      <button class="icon-btn" type="button" title="Set to the current time" @mousedown.prevent @click="now">now</button>
    </span>
    <span v-if="error" class="edit-error">{{ error }}</span>
  </span>

  <span v-else-if="editing && node.t === 'string'" class="editor">
    <!-- Enter inserts a newline; Ctrl/Cmd+Enter or leaving the field commits -->
    <textarea ref="input" v-model="draft" class="edit-input text-area" :class="{ invalid: error }" spellcheck="false"
      :rows="Math.min(12, Math.max(1, draft.split('\n').length))" title="Ctrl/Cmd+Enter to save, Esc to cancel"
      @keydown.enter.ctrl.prevent="submit" @keydown.enter.meta.prevent="submit" @keydown.esc.prevent="cancel"
      @input="error = ''" @blur="blur"></textarea>
    <span v-if="error" class="edit-error">{{ error }}</span>
  </span>

  <span v-else-if="editing" class="editor">
    <input ref="input" v-model="draft" class="edit-input" :class="{ invalid: error }" spellcheck="false"
      :placeholder="hints[node.t]" :inputmode="['int', 'long', 'float', 'double'].includes(node.t) ? 'decimal' : 'text'"
      @keydown.enter.prevent="commit(draft)" @keydown.esc.prevent="cancel" @input="error = ''" @blur="blur" />
    <span v-if="error" class="edit-error">{{ error }}</span>
  </span>

  <span v-else :class="['editable', 'v-' + node.t, { unset: node.unset }]" :title="node.v === '' ? '' : String(node.v)" @click="start">{{
    shown }}</span>
</template>
