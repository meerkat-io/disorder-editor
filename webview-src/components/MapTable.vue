<script setup>
import { onMounted, ref } from 'vue'
import { Type } from '../shared'

import TableHeader from './TableHeader.vue';
import Cell from './Cell.vue';
import Value from './Value.vue';
import Key from './Key.vue';
import ContextMenu from './ContextMenu.vue';
import { Edit, Operation, OperationType, ContextMenuAction, getDefaultValue } from '../shared.js';

const props = defineProps(['type', 'path']);
const value = defineModel();
const emit = defineEmits(['edit']);

const expanded = ref(false);
const headers = ref([
    { name: 'Key', resizable: true },
    { name: 'Value', resizable: true },
]);

const contextMenuVisable = ref(false)
const contextMenuLocation = ref({ x: 0, y: 0, header: false });
const currentRow = ref(-1);

function toggle() {
    expanded.value = !expanded.value;
}

/**
 * @param {MouseEvent} event 
 * @param {number} index
 */
function showContextMenu(event, index) {
    contextMenuLocation.value = { x: event.clientX, y: event.clientY, header: index == -1 };
    contextMenuVisable.value = true;
    currentRow.value = index;
}

/**
 * @param {string} action
 */
function handleAction(action) {
    switch (action) {
        case ContextMenuAction.INSERT_ABOVE:
            const aboveRowValue = { key: '', value: getDefaultValue(props.type.reference.type) };
            value.value.splice(value.value, 0, aboveRowValue);
            sendEdit(action, null, aboveRowValue, currentRow.value);
            break;

        case ContextMenuAction.DELETE:
            const currentRowValue = value.value[currentRow.value];
            value.value.splice(currentRow.value, 1);
            sendEdit(action, currentRowValue, null, currentRow.value);
            break;

        case ContextMenuAction.INSERT_BELOW:
            const belowRowValue = { key: '', value: getDefaultValue(props.type.reference.type) };
            value.value.splice(currentRow.value + 1, 0, belowRowValue);
            sendEdit(action, null, belowRowValue, currentRow.value + 1);
            break;
    }
}

/**
 * 
 * @param {string} action 
 * @param {any} oldValue 
 * @param {any} newValue 
 * @param {number} index 
 */
function sendEdit(action, oldValue, newValue, index) {
    const undoOperationType = action == ContextMenuAction.DELETE ? OperationType.INSERT : OperationType.DELETE;
    const redoOperationType = action == ContextMenuAction.DELETE ? OperationType.DELETE : OperationType.INSERT;
    const undo = new Operation(undoOperationType, props.path, oldValue, index);
    const redo = new Operation(redoOperationType, props.path, newValue, index);
    handleEdit(new Edit(undo, redo));
}

/**
 * @param {Edit} edit
 */
function handleEdit(edit) {
    emit('edit', edit);
}

onMounted(() => {
    if (value.value == null) {
        value.value = [];
    }
});
</script>

<template>
    <span class="collapsed">
        <span class="badge">Map[{{ value.length }}]</span>
        <span class="expand" @click="toggle">{{ expanded ? '-' : '+' }}</span>
    </span>
    <table v-if="expanded">
        <table-header :headers="headers" @contextmenu.prevent="showContextMenu($event, -1)" />
        <tbody>
            <tr v-for="(item, index) in value" :key="index" @contextmenu.prevent="showContextMenu($event, index)">
                <td>
                    <key v-model="item.key" :path="props.path + index + '.key'"
                        @edit="handleEdit" />
                </td>
                <td>
                    <cell :type="props.type.reference" v-model="item.value" :path="props.path + index + '.value'"
                        @edit="handleEdit" />
                </td>
            </tr>
        </tbody>
    </table>
    <context-menu v-model="contextMenuVisable" :location="contextMenuLocation" @action="handleAction" />
</template>