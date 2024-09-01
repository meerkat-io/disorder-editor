<script setup>
import { ref, onMounted, watch } from 'vue'

import Schema from './components/Schema.vue'
import Message from './components/Message.vue'
import Cell from './components/Cell.vue'

// @ts-ignore
const vscode = acquireVsCodeApi();

const schema = ref('');
const messages = ref([]);
const datagrid = ref();
const view = ref(0);

const View = {
    NONE: 0,
    SCHEMA: 1,
    MESSAGE: 2,
    DATA: 3,
}

onMounted(() => {
    window.addEventListener('message', (event) => receiveMessage(event.data));
})

function receiveMessage(message) {
    switch (message.command) {
        case 'select_schema':
            view.value = View.SCHEMA;
            schema.value = message.body;
            break;

        case 'select_message':
            view.value = View.MESSAGE;
            messages.value = message.body;
            break;

        case 'show_datagrid':
            view.value = View.DATA;
            datagrid.value = message.body;
            break
    }
}

watch(
    () => datagrid.value,
    (value) => {
        console.log('watching ==============');
        console.log('prevValue');
        console.log('newValue');
        console.log(value);

        vscode.postMessage({ command: 'edit', body: {} });
    },
    { deep: true }
)

vscode.postMessage({ command: 'ready' });
</script>

<template>
    <schema v-if="view == View.SCHEMA"
        @select="(schemaPath) => vscode.postMessage({ command: 'schema', body: schemaPath })" :status="schema" />
    <message v-if="view == View.MESSAGE" @select="(message) => vscode.postMessage({ command: 'message', body: message })"
        :messages="messages" />
    <cell v-else-if="view == View.DATA" :type="datagrid.type" v-model="datagrid.value"/>
</template>