<template>
  <p :class="{'has-trace-id': traceId}">
    <span>{{ appendErrorTraceId(message, error) }}</span>
    <template v-if="traceId">
      <button type="button" :disabled="copying" @click="copyTraceId">复制追踪编号</button>
      <span v-if="copyMessage" role="status">{{ copyMessage }}</span>
    </template>
  </p>
</template>

<script setup>
import {computed, ref, watch} from 'vue'
import {appendErrorTraceId, getErrorTraceId} from '@/utils/errorMessage'

const props = defineProps({
  message: {type: String, required: true},
  error: {type: Object, default: null}
})
const traceId = computed(() => getErrorTraceId(props.error))
const copying = ref(false)
const copyMessage = ref('')

watch(traceId, () => { copyMessage.value = '' })

function copyWithTextarea(value) {
  const activeElement = document.activeElement
  const inputSelection = typeof activeElement?.selectionStart === 'number'
    ? [activeElement.selectionStart, activeElement.selectionEnd, activeElement.selectionDirection]
    : null
  const selection = document.getSelection()
  const ranges = selection
    ? Array.from({length: selection.rangeCount}, (_, index) => selection.getRangeAt(index).cloneRange())
    : []
  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.readOnly = true
  textarea.tabIndex = -1
  textarea.style.cssText = 'position: fixed; left: -9999px; top: 0; font-size: 16px;'
  try {
    document.body.appendChild(textarea)
    textarea.focus({preventScroll: true})
    textarea.select()
    textarea.setSelectionRange(0, value.length)
    return document.execCommand('copy') === true
  } finally {
    textarea.remove()
    // 回退复制借用焦点与选区；恢复失败不应覆盖已经完成的复制结果。
    try {
      activeElement?.focus({preventScroll: true})
      if (inputSelection) activeElement.setSelectionRange(...inputSelection)
      selection?.removeAllRanges()
      ranges.forEach(range => selection.addRange(range))
    } catch { /* 原元素或选区可能已随错误提示更新而失效。 */ }
  }
}

async function copyText(value) {
  try {
    if (typeof navigator.clipboard?.writeText === 'function') {
      await navigator.clipboard.writeText(value)
      return true
    }
  } catch { /* HTTP NAS 或剪贴板权限限制时使用兼容复制。 */ }
  return copyWithTextarea(value)
}

async function copyTraceId() {
  if (!traceId.value || copying.value) return
  const currentTraceId = traceId.value
  copying.value = true
  copyMessage.value = ''
  try {
    const copied = await copyText(currentTraceId)
    if (traceId.value === currentTraceId) {
      copyMessage.value = copied ? '已复制' : '复制失败，请选中编号手动复制'
    }
  } catch {
    if (traceId.value === currentTraceId) copyMessage.value = '复制失败，请选中编号手动复制'
  } finally {
    copying.value = false
  }
}
</script>

<style scoped>
.has-trace-id {
  white-space: pre-line;
  overflow-wrap: anywhere;
  -webkit-user-select: text;
  user-select: text;
}

button {
  margin-inline: 8px;
  min-height: 36px;
  padding: 4px 8px;
  border: 1px solid currentColor;
  border-radius: 8px;
  color: inherit;
  background: transparent;
  font: inherit;
  cursor: pointer;
}

button:focus-visible {
  outline: 2px solid var(--theme-focus-ring);
  outline-offset: 2px;
}
</style>
