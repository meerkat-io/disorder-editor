<script setup>
import { ref, onMounted } from 'vue'
import TableHeader from './TableHeader.vue';
import Cell from './Cell.vue';
import ContextMenu from './ContextMenu.vue';
import { Type, Edit, Operation, OperationType, ContextMenuAction, getDefaultValue } from '../shared.js';

const props = defineProps(['type', 'path']);
const value = defineModel();
const emit = defineEmits(['edit']);

const expanded = ref(false);
const headers = ref([]);

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
    event.stopPropagation();
    contextMenuLocation.value = { x: event.clientX, y: event.clientY, header: index === -1 };
    contextMenuVisable.value = true;
    currentRow.value = index;
}

/**
 * @param {string} action
 */
function handleAction(action) {
    switch (action) {
        case ContextMenuAction.INSERT_ABOVE:
            const aboveRowValue = { value: generateDefaultValue() };
            value.value.splice(currentRow.value, 0, aboveRowValue);
            sendEdit(action, null, aboveRowValue, currentRow.value);
            break;

        case ContextMenuAction.DELETE:
            const currentRowValue = value.value[currentRow.value];
            value.value.splice(currentRow.value, 1);
            sendEdit(action, currentRowValue, null, currentRow.value);
            break;

        case ContextMenuAction.INSERT_BELOW:
            const belowRowValue = { value: generateDefaultValue() };
            value.value.splice(currentRow.value + 1, 0, belowRowValue);
            sendEdit(action, null, belowRowValue, currentRow.value + 1);
            break;
    }
}

function generateDefaultValue() {
    if (props.type.reference.type === Type.STRUCT) {
        const values = [];
        for (const key of Object.keys(props.type.reference.fields)) {
            values.push({ key: key, value: getDefaultValue(props.type.reference.fields[key].type) });
        }
        return values;
    } else {
        return getDefaultValue(props.type.reference.type);
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
    const undoOperationType = action === ContextMenuAction.DELETE ? OperationType.INSERT : OperationType.DELETE;
    const redoOperationType = action === ContextMenuAction.DELETE ? OperationType.DELETE : OperationType.INSERT;
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
    headers.value.push({ name: '', resizable: false });
    if (props.type.reference.type === Type.STRUCT) {
        for (const key of Object.keys(props.type.reference.fields)) {
            headers.value.push({ name: key, resizable: true });
        }
        if (value.value.length > 0) {
            for (const item of value.value) {
                const fields = [];
                for (const key of Object.keys(props.type.reference.fields)) {
                    let found = false;
                    for (const subItem of item.value) {
                        if (subItem.key === key) {
                            fields.push(subItem);
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        fields.push({ key: key, value: getDefaultValue(props.type.reference.fields[key].type) });
                    }
                }
                item.value.splice(0, item.value.length);
                item.value.push(...fields);
            }
        }
    } else {
        headers.value.push({ name: 'value', resizable: true });
    }
});
</script>

<template>
    <span class="collapsed">
        <span class="badge">Array[{{ value.length }}]</span>
        <span class="expand" @click="toggle">{{ expanded ? '-' : '+' }}</span>
    </span>
    <table v-if="expanded">
        <table-header :headers="headers" @contextmenu.prevent="showContextMenu($event, -1)" />
        <tbody v-if="props.type.reference.type === Type.STRUCT">
            <tr v-for="(item, index) in value" :key="index" @contextmenu.prevent="showContextMenu($event, index)">
                <td>
                    {{ index }}
                </td>
                <td v-for="(subItem, subIndex) in item.value" :key="index + '.' + subIndex">
                    <cell :type="props.type.reference.fields[subItem.key]" v-model="subItem.value"
                        :path="props.path + index + '.value.' + subIndex + '.value'" @edit="handleEdit" />
                </td>
            </tr>
        </tbody>
        <tbody v-if="props.type.reference.type !== Type.STRUCT">
            <tr v-for="(item, index) in value" :key="index" @contextmenu.prevent="showContextMenu($event, index)">
                <td>
                    {{ index }}
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