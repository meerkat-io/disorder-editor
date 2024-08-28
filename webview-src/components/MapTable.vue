<script setup>
import { onMounted, ref } from 'vue'
import { Type } from '../shared'

import TableHeader from './TableHeader.vue';
import Cell from './Cell.vue';
import Value from './Value.vue';
import ContextMenu from './ContextMenu.vue';
import { ContextMenuAction, getDefaultValue } from '../shared.js';

const props = defineProps(['type']);
const value = defineModel();

const expanded = ref(false);
const headers = ref([
    { name: 'Key', resizable: true },
    { name: 'Value', resizable: true },
]);

const data = ref([]);

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
    switch (action) {
        case ContextMenuAction.INSERT_ABOVE:
            if (currentRow.value == -1) {
                currentRow.value = 0;
            }
            data.value.splice(currentRow.value, 0, { key: '', value: getDefaultValue(props.type.reference.type) });
            break;

        case ContextMenuAction.DELETE:
            if (currentRow.value == -1) {
                return;
            }
            data.value.splice(currentRow.value, 1);
            break;

        case ContextMenuAction.INSERT_BELOW:
            data.value.splice(currentRow.value + 1, 0, { key: '', value: getDefaultValue(props.type.reference.type) });
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
        data.value.push({ key: '', value: getDefaultValue(props.type.type) });
    }
    console.log(data.value);
    console.log(props.type);
    console.log(props.type.type);
});
</script>

<template>
    <span class="collapsed">
        <span class="badge">Map[{{ data.length }}]</span>
        <span class="expand" @click="toggle">{{ expanded ? '-' : '+' }}</span>
    </span>
    <table v-if="expanded">
        <table-header :headers="headers" @contextmenu.prevent="showContextMenu($event, -1)" />
        <tbody>
            <tr v-for="(item, index) in data" :key="index" @contextmenu.prevent="showContextMenu($event, index)">
                <td>
                    <value :type="new Type(Type.STRING)" v-model="item.key" />
                </td>
                <td>
                    <cell :type="props.type.reference" v-model="item.value" />
                </td>
            </tr>
        </tbody>
    </table>
    <context-menu v-model="contextMenuVisable" :location="contextMenuLocation" @action="handleAction" />
</template>