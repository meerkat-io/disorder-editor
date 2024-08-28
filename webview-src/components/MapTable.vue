<script setup>
import { onMounted, ref, toRef } from 'vue'
import { Type } from '../shared'

import TableHeader from './TableHeader.vue';
import Cell from './Cell.vue';
import Value from './Value.vue';
import ContextMenu from './ContextMenu.vue';
import { ContextMenuAction } from '../shared.js';

const props = defineProps(['type', 'value']);
const expanded = ref(false);
const headers = ref([
    { name: 'Key', resizable: true },
    { name: 'Value', resizable: true },
]);
const data = ref([]);
const type = toRef(props, 'type');
const value = toRef(props, 'value');
const contextMenuVisable = ref(false)
const contextMenuLocation = ref({ x: 0, y: 0 });
const currentRow = ref(-1);

function toggle() {
    expanded.value = !expanded.value;
}

/**
 * @param {MouseEvent} event 
 * @param {number} index
 */
function showContextMenu(event, index) {
    contextMenuLocation.value = { x: event.clientX, y: event.clientY };
    contextMenuVisable.value = true;
    currentRow.value = index;
}

/**
 * @param {string} action
 */
function handleAction(action) {
    console.log('action:', action, " and current index:", currentRow.value);
    switch (action) {
        case ContextMenuAction.INSERT_ABOVE:
            data.value.splice(currentRow.value, 0, { key: '', value: '' });
            break;
        case ContextMenuAction.DELETE:
            data.value.splice(currentRow.value, 1);
            break;
        case ContextMenuAction.INSERT_BELOW:
            data.value.splice(currentRow.value + 1, 0, { key: '', value: '' });
            break;
    }
}

onMounted(() => {
    if (value.value == null) {
        value.value = {};
    }
    for (let [k, v] of Object.entries(value.value)) {
        data.value.push({ key: k, value: v });
    }
    if (data.value.length == 0) {
        // Check value type and default data
        data.value.push({ key: '', value: '' });
    }
});
</script>

<template>
    <span class="collapsed">
        <span class="badge">Map[{{ data.length }}]</span>
        <span class="expand" @click="toggle">{{ expanded ? '-' : '+' }}</span>
    </span>
    <table v-if="expanded">
        <table-header :headers="headers" />
        <tbody>
            <tr v-for="(item, index) in data" :key="item.key" @contextmenu.prevent="showContextMenu($event, index)">
                <td>
                    <value :type="new Type(Type.STRING)" :value="item.key" />
                </td>
                <td>
                    <cell :type="type.reference" :value="item.value" />
                </td>
            </tr>
        </tbody>
    </table>
    <context-menu :visible="contextMenuVisable" :location="contextMenuLocation"
        @action="(action) => handleAction(action)" />
</template>