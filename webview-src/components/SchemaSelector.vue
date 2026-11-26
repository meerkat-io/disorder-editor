<script setup>
defineProps({
  status: String
})
defineEmits(['select'])
</script>

<template>
    <div class="wizard">
        <h2>New Disorder file</h2>
        <p class="hint">Step 1 of 2: choose the schema that describes the data.</p>
        <button type="button" class="primary" @click="$emit('select')">Select schema file...</button>
        <p v-if="status == 'empty'" class="hint">Pick a schema file (.yaml / .yml).</p>
        <p v-if="status == 'invalid'" class="hint error">Schema file is invalid, select a valid file instead.</p>
    </div>
</template>
