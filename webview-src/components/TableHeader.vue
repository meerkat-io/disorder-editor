<script setup>
import { ref } from 'vue'

const props = defineProps(['headers']);
const collumns = ref({});
const collumnsWidth = ref({});

/**
 * @param {string} name
 * @param {MouseEvent} event 
 */
function resize(name, event) {
  const startX = event.pageX
  const width = parseInt(window.getComputedStyle(collumns.value[name]).width, 10)

  /**
   * @param {MouseEvent} e 
   */
  function setSize(e) {
    const movedX = e.pageX - startX
    collumnsWidth.value[name] = width + movedX + 'px'
  }

  document.addEventListener('mousemove', setSize)

  function cleanup() {
    document.removeEventListener('mousemove', setSize)
    document.removeEventListener('mouseup', cleanup)
  }

  document.addEventListener('mouseup', cleanup)
}

/**
 * @param {string} name
 */
function reset(name) {
  collumnsWidth.value[name] = null
}

</script>

<template>
  <thead>
    <tr>
      <th v-for="{ name, resize } in headers" :key="name" :ref="name">
        {{ name }}
        <div v-if="resize === true" class="resizer" @mousedown="resize(name, $event)"
          @dblclick="reset(name)"></div>
      </th>
    </tr>
  </thead>
</template>

<style scoped>
.resizer {
  position: absolute;
  top: 0;
  right: 0;
  margin-right: -3px;
  width: 6px;
  cursor: col-resize;
  user-select: none;
  z-index: 999;
}

th {
  position: relative;
}
</style>