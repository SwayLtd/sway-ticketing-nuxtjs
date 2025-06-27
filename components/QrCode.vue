<template>
  <canvas ref="canvas" :width="size" :height="size" />
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import QRCode from 'qrcode'

const props = defineProps({
  value: { type: String, required: true },
  size: { type: Number, default: 160 }
})

const canvas = ref(null)

const renderQr = () => {
  if (canvas.value && props.value) {
    QRCode.toCanvas(canvas.value, props.value, {
      width: props.size,
      margin: 1
    })
  }
}

watch(() => props.value, renderQr)
onMounted(renderQr)
</script>
