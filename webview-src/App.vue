<script setup>
import { ref, onMounted } from 'vue'

import Schema from './components/Schema.vue'
import Message from './components/Message.vue'
import Cell from './components/Cell.vue'
import { OutMessageType, InMessageType, Edit, OperationType } from './shared'

// @ts-ignore
const vscode = acquireVsCodeApi();

const schema = ref('');
const messages = ref([]);
const datagrid = ref();
const view = ref(0);

/**
 * @type {Edit[]}
 */
const edits = [];
/**
 * @type {Edit[]}
 */
const savedEdits = [];
/**
 * @type {Edit[]}
 */
const redoEdits = [];

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
        case InMessageType.SELECT_SCHEMA:
            view.value = View.SCHEMA;
            schema.value = message.body;
            break;

        case InMessageType.SELECT_MESSAGE:
            view.value = View.MESSAGE;
            messages.value = message.body;
            break;

        case InMessageType.SHOW_DATAGRID:
            console.log('show datagrid');
            console.log(message.body);
            view.value = View.DATA;
            datagrid.value = message.body;
            break;

        case InMessageType.UNDO:
            console.log('undo');
            const undo = edits.pop();
            redoEdits.push(undo);
            setValue(undo.undo.path, undo.undo.value);
            break;

        case InMessageType.REDO:
            console.log('redo');
            const redo = redoEdits.pop();
            edits.push(redo);
            setValue(redo.redo.path, redo.redo.value);
            break;
    }
}

/**
 * @param {string} path
 * @param {any} value
 */
function setValue(path, value) {
    let obj = datagrid.value.value;
    const parts = path.split('.');
    const lastPart = parts[parts.length - 1];
    for (let i = 0; i < parts.length - 1; i++) {
        obj = obj[parts[i]];
    }
    obj[lastPart] = value;
}

/**
 * @param {Edit} edit
 */
function handleEdit(edit) {
    let merged = false;
    if (edits.length > 0) {
        const lastEdit = edits[edits.length - 1];
        if (lastEdit.undo.path == edit.undo.path
            && lastEdit.undo.type == OperationType.UPDATE
            && edit.undo.type == OperationType.UPDATE) {
            lastEdit.redo.value = edit.redo.value;
            merged = true;
        }
    }
    if (redoEdits.length > 0) {
        redoEdits.splice(0, redoEdits.length);
    }
    if (!merged) {
        edits.push(edit);
        vscode.postMessage({ command: OutMessageType.EDIT });
    }
}

vscode.postMessage({ command: OutMessageType.READY });


/**
 * 
    load() {
    	
    }

    save(cancellation) {
        this.saveAs(this.uri, cancellation);
        this.savedEdits = Array.from(this.edits);
    }

    saveAs(targetResource, cancellation) {
        //TODO: debug
        return;
        this.uri = targetResource;
        if (cancellation.isCancellationRequested) {
            return;
        }
        this.file.filePath = this.uri.path;
        this.file.write(this.file.value);
    }

    revert(_cancellation) {
        this.load();
        this.edits = this.savedEdits;

        this.onDidChangeDocument.fire({
            content: fs.readFileSync(this.uri.fsPath),
            edits: this.edits,
        });
    }
 */
</script>

<template>
    <schema v-if="view == View.SCHEMA"
        @select="(schemaPath) => vscode.postMessage({ command: OutMessageType.SCHEMA, body: schemaPath })"
        :status="schema" />
    <message v-if="view == View.MESSAGE"
        @select="(message) => vscode.postMessage({ command: OutMessageType.MESSAGE, body: message })"
        :messages="messages" />
    <cell v-else-if="view == View.DATA" :type="datagrid.type" v-model="datagrid.value" :path="''" @edit="handleEdit" />
</template>