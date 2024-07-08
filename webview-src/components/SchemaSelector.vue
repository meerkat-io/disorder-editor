<script setup>
const props = defineProps({
  status: String
})
const emit = defineEmits(['select'])

function onSelect(event) {
    const file = event.target.files[0]
    if (file == null) {
        return
    }
    console.log('select schema:', file.path)
    emit('select', file.path)
}
</script>

<template>
    <input ref="upload" type="file" name="upload" accept=".yaml, .yml" @change="onSelect">
    <p v-if='status=="empty"'>Select schema file (yaml)</p>
    <p v-if='status=="invalid"'>Schema file is invalid, select a valid file instead</p>
</template>

<style scoped>
button {
    font-weight: bold;
}
</style>