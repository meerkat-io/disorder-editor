<script setup>
import { ref, onMounted } from 'vue'
import Cell from './components/Cell.vue'
import { MessageType, SchemaStatus, Container, Edit, Operation, OperationType } from './shared'
import { Binary } from './binary'

// @ts-ignore
const vscode = acquireVsCodeApi();

const schemaStatus = ref('');
const uploadSchema = ref();

const messages = ref([]);
const messageType = ref('');
const containerType = ref('');
const setMessageDisabled = ref(false);

const binary = new Binary();
const type = ref();
const value = ref([]);

const view = ref(0);

const edits = [];
const savedEdits = [];
const redoEdits = [];
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

/**
 * @param {Object} message 
 */
function receiveMessage(message) {
    switch (message.command) {
        case MessageType.SCHEMA:
            view.value = View.SCHEMA;
            schemaStatus.value = message.body;
            break;

        case MessageType.MESSAGE:
            view.value = View.MESSAGE;
            messages.value = message.body;
            break;

        case MessageType.DATAGRID:
            view.value = View.DATA;
            type.value = message.body.type;
            value.value = binary.read(new Uint8Array(message.body.content));
            break;

        case MessageType.UNDO:
            const undo = edits.pop();
            redoEdits.push(undo);
            executeOperation(undo.undo);
            break;

        case MessageType.REDO:
            const redo = redoEdits.pop();
            edits.push(redo);
            executeOperation(redo.redo);
            break;

        case MessageType.SAVE:
            dirty = false;
            savedEdits.splice(0, savedEdits.length);
            savedEdits.push(...edits);
            for (let pair of binary.headers) {
                if (pair.key === 'schema') {
                    pair.value = message.body.schema;
                    break;
                }
            }
            const content = binary.write(value.value, type.value);
            vscode.postMessage({ command: MessageType.SAVE, body: { content: content, id: message.body.id, file: message.body.file } });
            break;

        case MessageType.REVERT:
            dirty = false;
            edits.splice(0, edits.length);
            edits.push(...savedEdits);
            value.value = binary.read(new Uint8Array(message.body.content));
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

/**
 * @param {Object} event 
 */
function onSelectSchema(event) {
    const file = event.target.files[0];
    if (file === null) {
        return;
    }
    vscode.postMessage({ command: MessageType.SCHEMA, body: file.path })
}

function onSelectMessage() {
    if (messageType.value === '' || containerType.value === '') {
        return;
    }
    setMessageDisabled.value = true;
    vscode.postMessage({ command: MessageType.MESSAGE, body: { message: messageType.value, container: containerType.value } })
}

//TODO: fix insert above issue
//TODO: handle invalid content (e.g. invalid map key, invalid input value)
//TODO: check & fix undo/redo

vscode.postMessage({ command: MessageType.READY });
</script>

<template>
    <div v-if="view === View.SCHEMA">
        <input type='file' ref="uploadSchema" style="display:none" accept=".yaml, .yml" @change="onSelectSchema" />
        <button @click="uploadSchema.click()" :disabled="schemaStatus === SchemaStatus.VALID">load schema</button>
        <br>
        <br>
        <label v-if="schemaStatus === SchemaStatus.INVALID">Schema file is invalid or corrupt, select another
            one.</label>
    </div>
    <div v-if="view === View.MESSAGE">
        <select v-model="messageType" :style="{ width: '155px' }">
            <option disabled value="">select message type</option>
            <option v-for="message in messages">{{ message }}</option>
        </select>
        <select v-model="containerType" :style="{ width: '155px', marginLeft: '10px' }">
            <option disabled value="">select container type</option>
            <option v-for=" value in Container" :value="value">{{ value }}</option>
        </select>
        <button :disabled="setMessageDisabled" :style="{ width: '60px', marginLeft: '10px' }"
            @click="onSelectMessage">select</button>
    </div>
    <cell v-else-if="view === View.DATA" :type="type" v-model="value" :path="''" @edit="handleEdit" />
</template>