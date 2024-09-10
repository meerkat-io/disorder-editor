<script setup>
import { ref, onMounted } from 'vue'

import Schema from './components/Schema.vue'
import Message from './components/Message.vue'
import Cell from './components/Cell.vue'
import { MessageType, Edit, Operation, OperationType } from './shared'
import { Binary } from './binary'

// @ts-ignore
const vscode = acquireVsCodeApi();

const schema = ref('');
const messages = ref([]);
const type = ref();
const value = ref([]);
const binary = new Binary();

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
/**
 * @type {boolean}
 */
let dirty = false;

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
        case MessageType.SCHEMA:
            view.value = View.SCHEMA;
            schema.value = message.body;
            break;

        case MessageType.MESSAGE:
            view.value = View.MESSAGE;
            messages.value = message.body;
            break;

        case MessageType.DATAGRID:
            view.value = View.DATA;
            type.value = message.body.type;
            value.value = binary.read(new Uint8Array(message.body.content.data));
            console.log("headers:", binary.headers);
            console.log("value:", value.value);
            break;

        case MessageType.UNDO:
            console.log('undo');
            const undo = edits.pop();
            redoEdits.push(undo);
            executeOperation(undo.undo);
            break;

        case MessageType.REDO:
            console.log('redo');
            const redo = redoEdits.pop();
            edits.push(redo);
            executeOperation(redo.redo);
            break;

        case MessageType.SAVE:
            console.log('save');
            dirty = false;
            savedEdits.splice(0, savedEdits.length);
            savedEdits.push(...edits);
            const content = binary.write(value.value, type.value);
            vscode.postMessage({ command: MessageType.SAVE, body: content });
            break;

        //SaveAs? not save edits //revert, backup
    }
}

/**
 * @param {Operation} operation
 */
function executeOperation(operation) {
    switch (operation.type) {
        case OperationType.UPDATE:
            setValue(operation.path, operation.value);
            break;

        case OperationType.INSERT:
            getArray(operation.path).splice(operation.index, 0, operation.value);
            break;

        case OperationType.DELETE:
            getArray(operation.path).splice(operation.index, 1);
            break;

        case OperationType.RESET:
            const array = getArray(operation.path);
            array.splice(0, array.length);
            break;

        case OperationType.COPY:
            getArray(operation.path).push(...operation.value);
            break;
    }
}

/**
 * @param {string} path
 * @param {any} v
 */
function setValue(path, v) {
    let obj = value.value;
    const parts = path.split('.');
    const lastPart = parts[parts.length - 1];
    for (let i = 0; i < parts.length - 1; i++) {
        obj = obj[parts[i]];
    }
    obj[lastPart] = v;
}

/**
 * @param {string} path
 */
function getArray(path) {
    let obj = value.value;
    if (path !== '') {
        const parts = path.split('.');
        for (let i = 0; i < parts.length; i++) {
            obj = obj[parts[i]];
        }
    }
    return obj;
}

/**
 * @param {Edit} edit
 */
function handleEdit(edit) {
    let merged = false;
    if (edits.length > 0 && dirty) {
        const lastEdit = edits[edits.length - 1];
        if (lastEdit.undo.path === edit.undo.path
            && lastEdit.undo.type === OperationType.UPDATE
            && edit.undo.type === OperationType.UPDATE) {
            lastEdit.redo.value = edit.redo.value;
            merged = true;
        }
    }
    if (redoEdits.length > 0) {
        redoEdits.splice(0, redoEdits.length);
    }
    if (!merged) {
        dirty = true;
        edits.push(edit);
        vscode.postMessage({ command: MessageType.EDIT });
    }
}

vscode.postMessage({ command: MessageType.READY });
/**
 * 
    load() {
    	
    }

    save(cancellation) {
        this.saveAs(this.uri, cancellation);
        this.savedEdits = Array.from(this.edits);
    }

    saveAs(targetResource, cancellation) {
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
            content: fs.readFileSync(this.uri.path),
            edits: this.edits,
        });
    }
 */
</script>

<template>
    <schema v-if="view === View.SCHEMA"
        @select="(schemaPath) => vscode.postMessage({ command: MessageType.SCHEMA, body: schemaPath })"
        :status="schema" />
    <message v-if="view === View.MESSAGE"
        @select="(message) => vscode.postMessage({ command: MessageType.MESSAGE, body: message })"
        :messages="messages" />
    <cell v-else-if="view === View.DATA" :type="type" v-model="value" :path="''" @edit="handleEdit" />
</template>