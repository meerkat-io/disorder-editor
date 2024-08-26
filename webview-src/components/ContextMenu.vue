<script setup>

import { toRef } from 'vue'
import { ContextMenuAction } from '../shared.js';

const props = defineProps(['visible', 'location']);

const visible = toRef(props, 'visible');

function close() {
    visible.value = false;
}

/**
 * @param {string} action
 */
function action(action) {
    console.log('action:', action);
    close();
}
</script>

<template>
    <div class="context-menu" v-show="visible" tabindex="-1" v-click-outside="close" @contextmenu.capture.prevent>
        <ul>
            <li @click="action(ContextMenuAction.INSERT_ABOVE)">Insert row above</li>
            <li @click="action(ContextMenuAction.DELETE)">Delete row</li>
            <li @click="action(ContextMenuAction.INSERT_BELOW)">Insert row below</li>
        </ul>
    </div>
</template>


<style scoped>
.context-menu {
    position: absolute;
    position: fixed;
    z-index: 999;
    overflow: hidden;
    background: var(--vscode-editor-background);
    border-color: var(--vscode-editor-foreground);
    border-radius: 4px;
    border-style: solid;
    border-width: thin;

    &:focus {
        outline: none;
    }

    ul {
        padding: 0px;
        margin: 0px;
    }

    li {
        display: block;
        position: relative;
        padding: 2px 2px;
        background: var(--vscode-editor-background);
        border-radius: 0;
        text-decoration: none;
        width: 100%;
        text-align: left;
        cursor: pointer;
    }

    li:hover,
    li:focus {
        background: var(--vscode-editor-foreground);
        color: var(--vscode-editor-background);
        outline: none;
    }
}
</style>