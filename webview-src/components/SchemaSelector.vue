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
    <input ref="upload" type="file" name="upload" accept=".yaml, .yml" @change="onSelect"/>
    <br>
    <label v-if='status=="empty"'>Select schema file (yaml)</label>
    <label v-if='status=="invalid"'>Schema file is invalid, select a valid file instead</label>
</template>