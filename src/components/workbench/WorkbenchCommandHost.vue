<template>
  <MacDialog v-if="loggedIn" v-model="visible" title="搜索应用或快速新增" width="620px" panel-class="workbench-command-dialog" mobile-presentation="fullScreen" :confirm-on-dirty="false">
    <div class="wb-command-input"><span aria-hidden="true">⌕</span><input ref="input" v-model="query" type="search" placeholder="搜索应用或快速新增" aria-label="搜索应用或快速新增" role="combobox" aria-controls="workbench-command-results" :aria-expanded="visible" :aria-activedescendant="results[selected] ? `wb-command-${selected}` : undefined" @keydown="handleInputKey" /><button type="button" @click="visible = false"><span class="wb-command-escape">Esc</span><span class="wb-command-cancel">取消</span></button></div>
    <div id="workbench-command-results" class="wb-command-results" role="listbox" aria-label="搜索结果">
      <p v-if="loading" role="status">正在读取应用权限…</p>
      <p v-else-if="source === 'unavailable'" role="alert">权限不可用，请稍后重试。</p>
      <template v-for="(item, index) in results" :key="item.key">
        <p v-if="index === 0 || results[index - 1].kind !== item.kind" class="wb-command-group">{{ item.kind === 'app' ? '打开应用' : '快速新增' }}</p>
        <div :id="`wb-command-${index}`" class="wb-command-result" :class="{selected: index === selected}" role="option" :aria-selected="index === selected" @pointermove="selected = index" @click="execute(item)">
          <AuthenticatedImage v-if="item.app?.iconType === 'UPLOAD' && item.app?.iconAttachmentId" :attachment-id="item.app.iconAttachmentId" alt="" />
          <AppIconImage v-else-if="item.app?.iconUrl" :src="item.app.iconUrl" :chroma-key="item.app.iconChromaKey" alt="" /><span v-else class="wb-command-symbol">{{ item.kind === 'create' ? '＋' : '◇' }}</span>
          <span class="wb-command-label"><span><template v-for="(part, n) in highlightCommand(item.label, query)" :key="n"><mark v-if="part.hit">{{ part.text }}</mark><template v-else>{{ part.text }}</template></template></span><small>{{ item.description }}</small></span><small class="wb-command-route">{{ item.kind === 'app' ? item.route : '打开快速新增' }}</small>
        </div>
      </template>
      <div v-if="!loading && source !== 'unavailable' && !results.length" class="wb-command-empty"><strong>没有匹配的应用或操作</strong><p>换个关键词试试，只搜索已授权应用。</p></div>
    </div>
    <footer class="wb-command-footer">↑ ↓ 选择　↵ 执行　Esc 关闭 <span>只显示已授权应用</span></footer>
  </MacDialog>
  <QuickCreateDialog v-if="loggedIn" v-model="quickVisible" :initial-type-code="initialTypeCode" :types="quickCreateTypes" :apps="tools" :current-user="auth.user || {}" @success="created" />
  <div v-if="notice" class="wb-global-notice" role="status">{{ notice }}<button type="button" aria-label="关闭提示" @click="notice = ''">×</button></div>
</template>
<script setup>
import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import MacDialog from '@/components/MacDialog.vue'
import QuickCreateDialog from '@/components/QuickCreateDialog.vue'
import AppIconImage from '@/components/AppIconImage.vue'
import AuthenticatedImage from '@/components/AuthenticatedImage.vue'
import {useWorkbenchAccess} from '@/composables/useWorkbenchAccess'
import {readAuthState} from '@/utils/authStorage'
import {highlightCommand, isEditableTarget, workbenchCommands} from '@/utils/workbenchCommands'
const route = useRoute()
const router = useRouter()
const {loading, source, tools, quickCreateTypes} = useWorkbenchAccess()
const auth = ref(readAuthState())
const loggedIn = computed(() => Boolean(auth.value.token && auth.value.user && !['/login', '/register'].includes(route.path)))
const visible = ref(false)
const quickVisible = ref(false)
const initialTypeCode = ref('')
const input = ref(null)
const query = ref('')
const selected = ref(0)
const notice = ref('')
let noticeTimer
const results = computed(() => loading.value || source.value === 'unavailable' ? [] : workbenchCommands(tools.value, quickCreateTypes.value, query.value))
function syncAuth() {
  const next = readAuthState()
  if (next.token !== auth.value.token || next.user?.id !== auth.value.user?.id) {
    visible.value = false
    quickVisible.value = false
  }
  auth.value = next
}
function open() { if (loggedIn.value && !quickVisible.value) visible.value = true }
function openQuick(event) {
  if (!loggedIn.value || loading.value || !quickCreateTypes.value.length || quickVisible.value) return
  const typeCode = event?.detail?.typeCode || ''
  if (typeCode && !quickCreateTypes.value.some(type => type.typeCode === typeCode)) return
  visible.value = false
  initialTypeCode.value = typeCode
  quickVisible.value = true
}
async function execute(item) {
  if (!item) return
  visible.value = false
  await nextTick()
  if (item.kind === 'app') router.push(item.route)
  else openQuick({detail: {typeCode: item.typeCode}})
}
function handleInputKey(event) {
  if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
    event.preventDefault(); event.stopPropagation()
    selected.value = results.value.length ? (selected.value + (event.key === 'ArrowDown' ? 1 : -1) + results.value.length) % results.value.length : 0
    nextTick(() => document.getElementById(`wb-command-${selected.value}`)?.scrollIntoView?.({block: 'nearest'}))
  } else if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); execute(results.value[selected.value]) }
}
function shortcut(event) {
  if (!loggedIn.value || !(event.ctrlKey || event.metaKey) || event.altKey || event.isComposing || event.key.toLowerCase() !== 'k') return
  const searchFocused = visible.value && document.activeElement === input.value
  // 捕获阶段必须先放行编辑区，包括事件被重定向到宿主的 Shadow DOM 输入。
  if (!searchFocused && [document.activeElement, event.target, ...(event.composedPath?.() || [])].some(isEditableTarget)) return
  event.preventDefault(); event.stopImmediatePropagation()
  if (searchFocused) input.value.select()
  else if (!quickVisible.value) visible.value = !visible.value
}
function created(message) {
  window.dispatchEvent(new CustomEvent('gak:quick-created', {detail: {message}}))
  if (route.path !== '/home') {
    notice.value = message
    clearTimeout(noticeTimer)
    noticeTimer = setTimeout(() => { notice.value = '' }, 4000)
  }
}
watch(query, () => { selected.value = 0 })
watch(results, () => { selected.value = 0 })
watch(visible, async value => { if (value) { query.value = ''; selected.value = 0; await nextTick(); input.value?.focus() } })
watch(() => route.path, () => { visible.value = false })
watch(loggedIn, value => { if (!value) { visible.value = false; quickVisible.value = false; notice.value = '' } })
onMounted(() => {
  document.addEventListener('keydown', shortcut, true)
  window.addEventListener('gak:open-command', open)
  window.addEventListener('gak:open-quick-create', openQuick)
  window.addEventListener('gak:auth-changed', syncAuth)
})
onBeforeUnmount(() => {
  clearTimeout(noticeTimer)
  document.removeEventListener('keydown', shortcut, true)
  window.removeEventListener('gak:open-command', open)
  window.removeEventListener('gak:open-quick-create', openQuick)
  window.removeEventListener('gak:auth-changed', syncAuth)
})
</script>
<style src="./commandPalette.css"></style>
