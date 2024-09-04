<script setup>
import { onMounted, ref } from 'vue'
import Cell from './Cell.vue';
import TableHeader from './TableHeader.vue';
import { Edit, Operation, OperationType, getDefaultValue } from '../shared.js';

const props = defineProps(['type', 'path']);
const value = defineModel();
const emit = defineEmits(['edit']);

const expanded = ref(false);
const headers = ref([
    { name: 'field', resizable: false },
    { name: 'value', resizable: true },
]);

function toggle() {
    expanded.value = !expanded.value;
}

function initialize() {
    value.value.splice(0, value.value.length);
    for (const key of Object.keys(props.type.fields)) {
        value.value.push({ key: key, value: getDefaultValue(props.type.fields[key].type) });
    }
    expanded.value = true;
    const array = [...value.value];
    sendEdit(OperationType.COPY, array);
}

function destroy() {
    const array = [...value.value];
    value.value.splice(0, value.value.length);
    expanded.value = false;
    sendEdit(OperationType.RESET, array);
}

/**
 * 
 * @param {string} operationType 
 * @param {Array} array 
 */
 function sendEdit(operationType, array) {
    const undoOperationType = operationType === OperationType.RESET ? OperationType.COPY : OperationType.RESET;
    const undo = new Operation(undoOperationType, props.path, array, -1);
    const redo = new Operation(operationType, props.path, array, -1);
    handleEdit(new Edit(undo, redo));
}

/**
 * @param {Edit} edit
 */
function handleEdit(edit) {
    emit('edit', edit);
}

onMounted(() => {
    const fields = [];
    for (const key of Object.keys(props.type.fields)) {
        let found = false;
        for (const item of value.value) {
            if (item.key === key) {
                fields.push(item);
                found = true;
                break;
            }
        }
        if (!found) {
            fields.push({ key: key, value: getDefaultValue(props.type.fields[key].type) });
        }
    }
    value.value.splice(0, value.value.length);
    value.value.push(...fields);
});
</script>

<template>
    <span class="collapsed">
        <span class="badge">Struct</span>
        <span v-if="value.length > 0" class="expand" @click="toggle">{{ expanded ? '-' : '+' }}</span>
        <span v-if="value.length > 0" class="text-button" @click="destroy">destroy</span>
        <span v-else class="text-button" @click="initialize">initialize</span>
    </span>
    <table v-if="expanded && value.length > 0">
        <table-header :headers="headers" />
        <tbody>
            <tr v-for="(item, index) in value" :key="index">
                <td>
                    {{ item.key }}
                </td>
                <td>
                    <cell :type="props.type.fields[item.key]" v-model="item.value" :path="props.path + index + '.value'"
                        @edit="handleEdit" />
                </td>
            </tr>
        </tbody>
    </table>
</template>