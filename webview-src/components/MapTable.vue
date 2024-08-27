<script setup>
import { onMounted, ref, toRef } from 'vue'
import { Type } from '../shared'

import TableHeader from './TableHeader.vue';
import Cell from './Cell.vue';
import Value from './Value.vue';
import ContextMenu from './ContextMenu.vue';

const props = defineProps(['node']);
const expanded = ref(false);
const headers = ref([
    { name: 'Key', resizable: true },
    { name: 'Value', resizable: true },
]);
const data = ref([]);
const node = toRef(props, 'node');
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

onMounted(() => {
    console.log('node in map-table:', node.value);
    if (node.value.value == null) {
        node.value.value = {};
    }
    for (let [key, value] of Object.entries(node.value.value)) {
        data.value.push({ key, value });
    }
    if (data.value.length == 0) {
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
                    <value :node="{ type: new Type(Type.STRING), value: item.key }" />
                </td>
                <td>
                    <cell :node="{ type: node.type.reference, value: item.value }" />
                </td>
            </tr>
        </tbody>
    </table>
    <context-menu :visible="contextMenuVisable" :location="contextMenuLocation" />
</template>