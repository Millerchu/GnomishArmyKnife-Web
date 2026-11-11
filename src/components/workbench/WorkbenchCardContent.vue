<template>
  <div ref="content" class="wb-card-content" :class="{'can-scroll-down': canScrollDown, 'can-scroll-up': canScrollUp}" :tabindex="canScrollDown || canScrollUp ? 0 : undefined" @scroll.passive="measure">
    <slot />
  </div>
</template>
<script setup>
import {onBeforeUnmount, onMounted, ref} from 'vue'

const content = ref(null)
const canScrollDown = ref(false)
const canScrollUp = ref(false)
let resizeObserver
let mutationObserver
function measure() {
  const el = content.value
  if (!el) return
  canScrollUp.value = el.scrollTop > 1
  canScrollDown.value = el.scrollHeight - el.clientHeight - el.scrollTop > 1
}
onMounted(() => {
  measure()
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(content.value)
    if (content.value.firstElementChild) resizeObserver.observe(content.value.firstElementChild)
  }
  // 异步摘要由骨架切换为正文时也要刷新溢出提示。
  mutationObserver = new MutationObserver(measure)
  mutationObserver.observe(content.value, {childList: true, subtree: true, characterData: true})
})
onBeforeUnmount(() => { resizeObserver?.disconnect(); mutationObserver?.disconnect() })
</script>
