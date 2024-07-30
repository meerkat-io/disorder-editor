<script setup>

import { ref } from 'vue'
import { Type } from '../shared'

const props = defineProps(['type']);
</script>

<template>
    <input v-if="type == Type.STRING" type="text" />
</template>