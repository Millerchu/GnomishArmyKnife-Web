<template>
  <MacDialog ref="dialog" :model-value="true" title="布局已在其他设备更新" width="480px" :confirm-on-dirty="false" :close-disabled="saving" panel-class="wb-conflict-dialog" @update:model-value="!$event && $emit('dismiss')">
    <div aria-live="polite"><p>云端更新时间：{{ document.updatedAt || '暂无更新时间' }}</p><p>可见卡片：{{ visibleCount }} 张</p><p>使用云端会放弃本次草稿；覆盖云端会提交本次草稿和当前应用坞设置。</p></div>
    <p v-if="error" role="alert">{{ error }}</p>
    <template #footer><button ref="cloudButton" class="wb-conflict-action" type="button" :disabled="saving" @click="$emit('cloud')">使用云端</button><button class="wb-conflict-action wb-conflict-primary" type="button" :disabled="saving" @click="$emit('overwrite')">{{ saving ? '正在保存…' : '覆盖云端' }}</button></template>
  </MacDialog>
</template>
<script setup>
import {computed, nextTick, onBeforeUnmount, onMounted, ref} from 'vue'
import MacDialog from '@/components/MacDialog.vue'
import {applyWorkbenchPayload} from '@/utils/workbenchGrid'
const props = defineProps({document: {type: Object, required: true}, saving: Boolean, error: String})
defineEmits(['dismiss', 'cloud', 'overwrite'])
const visibleCount = computed(() => applyWorkbenchPayload(props.document.payload, props.document.schemaVersion).cards.filter(card => !card.hidden).length)
const dialog = ref(null)
const cloudButton = ref(null)
let returnFocus
let panel
// MacDialog 提供 Esc 和窗口风格；在此补齐业务弹层的首焦点、Tab 循环和关闭恢复。
function trapTab(event) {
  if (event.key !== 'Tab') return
  const buttons = [...panel.querySelectorAll('button:not(:disabled), [tabindex="0"]')].filter(element => !element.closest('[inert]'))
  const first = buttons[0]; const last = buttons.at(-1)
  if (!first) { event.preventDefault(); panel.focus(); return }
  if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) { event.preventDefault(); last.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
}
onMounted(async () => {
  returnFocus = document.activeElement
  await nextTick()
  panel = dialog.value?.$refs.dialogPanel
  panel?.addEventListener('keydown', trapTab)
  cloudButton.value?.focus()
})
onBeforeUnmount(() => {
  panel?.removeEventListener('keydown', trapTab)
  nextTick(() => { if (returnFocus?.isConnected) returnFocus.focus() })
})
</script>
<style>
/* MacDialog Teleport 到 body，不能依赖 .workbench 祖先的按钮样式。 */
.wb-conflict-dialog .wb-conflict-action {
  min-height: 40px;
  min-width: 104px;
  padding: 9px 18px;
  font: inherit;
  font-size: 14px;
  border: 1px solid var(--theme-border);
  border-radius: 10px;
  background: var(--theme-control-surface);
  color: var(--theme-text);
  cursor: pointer;
}
.wb-conflict-dialog .wb-conflict-primary {
  background: linear-gradient(180deg,color-mix(in srgb,var(--theme-accent) 86%,white),var(--theme-accent));
  border-color: color-mix(in srgb,var(--theme-accent) 58%,transparent);
  box-shadow: 0 6px 18px color-mix(in srgb,var(--theme-accent) 24%,transparent),inset 0 1px 0 rgba(255,255,255,.3);
  color: #fff;
  font-weight: 600;
}
.wb-conflict-dialog .wb-conflict-action:hover:not(:disabled) { filter: brightness(1.08); }
.wb-conflict-dialog .wb-conflict-action:focus-visible { outline: 2px solid var(--theme-accent); outline-offset: 3px; }
.wb-conflict-dialog .wb-conflict-action:disabled { cursor: default; opacity: .5; }
</style>
