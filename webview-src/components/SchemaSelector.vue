<script setup>
function onUploadSchema(event) {
    const file = event.target.files[0]
    if (file == null) {
        return
    }
    console.log('onUploadSchema', file.path)
}

</script>

<template>
    <input ref="upload" type="file" name="upload" accept=".yaml, .yml" @change="onUploadSchema">
    <p>Select schema file (yaml) and root message type</p>
</template>

<style scoped>
button {
    font-weight: bold;
}
</style>