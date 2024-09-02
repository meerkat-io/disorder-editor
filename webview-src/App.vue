<script setup>
import { ref, onMounted } from 'vue'

import Schema from './components/Schema.vue'
import Message from './components/Message.vue'
import Cell from './components/Cell.vue'
import { OutMessageType, InMessageType, Edit } from './shared'

// @ts-ignore
const vscode = acquireVsCodeApi();

const schema = ref('');
const messages = ref([]);
const datagrid = ref();
const view = ref(0);

/**
 * @property {Edit[]} edits
 * @property {Edit[]} savedEdits
 */

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
            view.value = View.DATA;
            datagrid.value = message.body;
            break;

        case InMessageType.UNDO:
            break;

        case InMessageType.REDO:
            break;
    }
}

/**
 * @param {Edit} edit
 */
function handleEdit(edit) {
    console.log('send edit in App ==============');
    console.log(edit);
    vscode.postMessage({ command: OutMessageType.EDIT, body: edit });
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
        @select="(schemaPath) => vscode.postMessage({ command: OutMessageType.SCHEMA, body: schemaPath })" :status="schema" />
    <message v-if="view == View.MESSAGE"
        @select="(message) => vscode.postMessage({ command: OutMessageType.MESSAGE, body: message })" :messages="messages" />
    <cell v-else-if="view == View.DATA" :type="datagrid.type" v-model="datagrid.value" :path="''" @edit="handleEdit" />
</template>