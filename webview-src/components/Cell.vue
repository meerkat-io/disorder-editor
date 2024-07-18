<script setup>
import { ref, onMounted } from 'vue'
import { Type, Node } from '../node'

const props = defineProps({
  node: {
    type: Node
  }
})

onMounted(()=> {
    console.log('show datagrid in cell');
    console.log(props.node);
})
</script>