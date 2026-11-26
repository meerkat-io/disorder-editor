<script setup>
defineProps({
  status: String
})
defineEmits(['select'])
</script>

<template>
    <button type="button" @click="$emit('select')">Select schema file...</button>
    <br>
    <label v-if='status=="empty"'>Select schema file (yaml)</label>
    <label v-if='status=="invalid"'>Schema file is invalid, select a valid file instead</label>
</template>
