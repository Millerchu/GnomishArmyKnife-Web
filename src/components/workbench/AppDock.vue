<template>
  <section class="wb-glass wb-dock" aria-label="全部应用">
    <header class="wb-dock-head"><h2>全部应用</h2><span class="wb-status" :class="source === 'admin-fallback' ? 'is-warning' : 'is-success'">已授权 {{ tools.length }} 个应用</span><span class="wb-source" :class="{'is-warning': source === 'admin-fallback'}">{{ source === 'admin-fallback' ? '管理员兜底' : '后端授权' }}</span><span class="wb-dock-hint">拖拽图标可调整顺序 · Ctrl/⌘ K 搜索</span><button type="button" :aria-expanded="!collapsed" @click="toggle">{{ collapsed ? '展开 ▾' : '收起 ▴' }}</button></header>
    <div v-if="!collapsed" class="grid">
          <button
            v-for="tool in tools"
            :key="tool.key"
            class="tool-item"
            :class="{
              dragging: draggingToolKey === tool.key,
              'drag-over': dragOverToolKey === tool.key && draggingToolKey !== tool.key
            }"
            type="button"
            :draggable="!isMobileViewport"
            @dragstart="handleToolDragStart(tool, $event)"
            @dragenter.prevent="handleToolDragEnter(tool)"
            @dragover.prevent
            @drop.prevent="handleToolDrop(tool)"
            @dragend="handleToolDragEnd"
            @click="openTool(tool)"
          >
            <div class="tool-layout">
              <div class="icon-box" :style="tool.iconStyle">
                <AuthenticatedImage
                  v-if="tool.iconType === 'UPLOAD' && tool.iconAttachmentId"
                  :attachment-id="tool.iconAttachmentId"
                  :alt="tool.name"
                />
                <AppIconImage
                  v-else-if="usesImageIcon(tool.iconType) && tool.iconUrl"
                  :img-class="'icon-image'"
                  :src="tool.iconUrl"
                  :alt="tool.name"
                  :chroma-key="tool.iconChromaKey"
                />
                <span v-else-if="tool.iconType === 'PRESET'" class="icon-svg" v-html="getPresetIconSvg(tool.iconPreset)"></span>
                <span v-else class="icon-text">{{ tool.iconText }}</span>
              </div>

              <div class="tool-content">
                <p class="tool-name">{{ tool.name }}</p>
                <p class="tool-desc">{{ tool.description || '应用简介待补充' }}</p>
              </div>
            </div>
          </button>

    </div>
  </section>
</template>
<script setup>
import {ref} from 'vue'
import {useRouter} from 'vue-router'
import AppIconImage from '@/components/AppIconImage.vue'
import AuthenticatedImage from '@/components/AuthenticatedImage.vue'
import {getPresetIconSvg} from '@/constants/appIconLibrary'
import {usesImageIcon} from '@/utils/workbenchApps'
import {useWorkbenchPreference} from '@/composables/useWorkbenchPreference'
const props = defineProps({tools: {type: Array, default: () => []}, source: String, isMobileViewport: Boolean})
const emit = defineEmits(['order', 'notice'])
const router = useRouter()
const storageKey = 'gak_workbench_dock_collapsed_v1'
const {value: collapsed, save: saveCollapsed} = useWorkbenchPreference(storageKey, raw => raw === 'true', String)
function toggle() {
  saveCollapsed(!collapsed.value)
}
const draggingToolKey = ref('')
const dragOverToolKey = ref('')
let suppressNextToolOpen = false
function handleToolDragStart(tool, event) {
  if (props.isMobileViewport) { event.preventDefault(); return }
  draggingToolKey.value = tool.key
  if (event.dataTransfer) { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', tool.key) }
}
function handleToolDragEnter(tool) { if (!props.isMobileViewport) dragOverToolKey.value = tool.key }
function handleToolDragEnd() { draggingToolKey.value = ''; dragOverToolKey.value = '' }
function handleToolDrop(tool) {
  if (props.isMobileViewport) { handleToolDragEnd(); return }
  const order = props.tools.map(item => item.key)
  const from = order.indexOf(draggingToolKey.value)
  const to = order.indexOf(tool.key)
  if (from >= 0 && to >= 0 && from !== to) {
    order.splice(to, 0, order.splice(from, 1)[0])
    emit('order', order)
    suppressNextToolOpen = true
  }
  handleToolDragEnd()
}
function openTool(tool) {
  if (suppressNextToolOpen) { suppressNextToolOpen = false; return }
  if (tool.route) router.push(tool.route)
  else emit('notice', 'info', '应用暂未开放', `应用【${tool.name}】已登记，暂未配置入口。`)
}
</script>
