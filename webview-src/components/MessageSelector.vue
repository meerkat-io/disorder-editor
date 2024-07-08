<script setup>
const props = defineProps({
  messages: {
    type: Array
  }
})
const emit = defineEmits(['select'])

function onSelect(event) {
    /*
    const file = event.target.files[0]
    if (file == null) {
        return
    }
    console.log('select schema:', file.path)
    emit('select', file.path)*/
}
</script>

<template>
    <label>{{ messages.length }}</label>
</template>