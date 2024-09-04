//TODO set struct to null
<script setup>
import { onMounted, ref } from 'vue'

import Cell from './Cell.vue';
import { Edit, getDefaultValue } from '../shared.js';

const props = defineProps(['type', 'path']);
const value = defineModel();
const emit = defineEmits(['edit']);

const expanded = ref(false);
const initialized = ref(false);

function toggle() {
    expanded.value = !expanded.value;
}

function initialize() {
    value.value.splice(0, value.value.length);
    for (const key of Object.keys(props.type.fields)) {
        value.value.push({ key: key, value: getDefaultValue(props.type.fields[key].type) });
    }
    expanded.value = true;
    initialized.value = true;
}

function destroy() {
    value.value.splice(0, value.value.length);
    expanded.value = false;
    initialized.value = false;
}

/**
 * @param {Edit} edit
 */
function handleEdit(edit) {
    emit('edit', edit);
}

onMounted(() => {
    if (value.value.length > 0) {
        initialized.value = true;
        const fields = [];
        for (const key of Object.keys(props.type.fields)) {
            let found = false;
            for (const item of value.value) {
                if (item.key == key) {
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
    }
});
</script>

<template>
    <span class="collapsed">
        <span class="badge">Struct</span>
        <span v-if="initialized" class="expand" @click="toggle">{{ expanded ? '-' : '+' }}</span>
        <span v-if="initialized" class="text-button" @click="destroy">Destroy</span>
        <span v-else class="text-button" @click="initialize">Initialize</span>
    </span>
    <table v-if="expanded && initialized">
        <tr v-for="(item, index) in value" :key="index">
            <td>
                {{ item.key }}
            </td>
            <td>
                <cell :type="props.type.fields[item.key]" v-model="item.value" :path="props.path + index + '.value'"
                    @edit="handleEdit" />
            </td>
        </tr>
    </table>
</template>