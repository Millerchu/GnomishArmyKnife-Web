<template>
  <div v-if="mobile" class="wb-cards wb-mobile-cards">
    <div v-for="card in cards" :key="card.id" class="wb-grid-cell"><slot :card="card" /></div>
  </div>
  <GridLayout v-else :layout="grid" class="wb-cards wb-desktop-grid" :col-num="12" :row-height="rowHeight" :margin="[0, 14]" :max-rows="48" :is-draggable="editing" :is-resizable="editing" :vertical-compact="false" :responsive="false" @pointerdown.capture="startGesture" @pointerup.capture="clearSelection" @pointercancel.capture="clearSelection">
    <GridItem v-for="item in grid" :key="item.i" v-bind="item" :style="gridInsets(item)" :min-w="4" :max-w="8" :min-h="2" :max-h="4" drag-allow-from=".wb-drag-handle" drag-ignore-from="input, button, a" @moved="moved" @resized="resized">
      <slot :card="cards.find(card => card.id === item.i)" />
    </GridItem>
  </GridLayout>
</template>
<script setup>
import {nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import {GridItem, GridLayout} from 'grid-layout-plus'
import {readingGridCards, settleGridCards, snapGridSize} from '@/utils/workbenchGrid'
const props = defineProps({cards: {type: Array, required: true}, mobile: Boolean, editing: Boolean})
const emit = defineEmits(['change'])
const grid = ref([])
const rowHeight = ref(114)
function gridInsets({x, w}) {
  // 库的横向 gutter 同时留在外边缘；改用格内留白，列步长仍为容器宽度 / 12。
  // 按列位置分摊 14px，使同档卡等宽、相邻间隔恒定，首尾卡与问候卡齐边。
  return {'--wb-grid-inset-left': `${x * 14 / 12}px`, '--wb-grid-inset-right': `${(12 - x - w) * 14 / 12}px`}
}
function rebuild() {
  const cards = props.editing ? props.cards : readingGridCards(props.cards)
  grid.value = cards.map(card => ({i: card.id, x: card.x, y: card.y, w: card.w, h: card.h}))
}
watch(() => props.cards, rebuild, {deep: true, immediate: true})
watch(() => [props.editing, props.mobile], rebuild)
function measure() { rowHeight.value = window.innerWidth <= 1180 ? 116 : 114 }
let gesturing = false
function startGesture(event) {
  if (!props.editing || !event.target.closest('.wb-drag-handle, .vgl-item__resizer')) return
  gesturing = true
  window.getSelection()?.removeAllRanges()
}
function clearSelection() {
  if (!gesturing) return
  window.getSelection()?.removeAllRanges()
  gesturing = false
}
onMounted(() => {
  measure()
  window.addEventListener('resize', measure)
  window.addEventListener('pointerup', clearSelection)
  window.addEventListener('pointercancel', clearSelection)
})
onBeforeUnmount(() => {
  clearSelection()
  window.removeEventListener('resize', measure)
  window.removeEventListener('pointerup', clearSelection)
  window.removeEventListener('pointercancel', clearSelection)
})
async function settle(id, change) {
  if (!props.editing || props.mobile) return
  window.getSelection()?.removeAllRanges()
  // 库的临时碰撞只用于拖动反馈；最终避让从草稿重新搜索最上方空位。
  await nextTick()
  if (!props.editing || props.mobile) return
  const cards = props.cards.map(card => ({...card, ...(card.id === id ? change : {})}))
  emit('change', settleGridCards(cards, id), id)
  await nextTick()
  rebuild()
}
function moved(id, x, y) { settle(id, {x, y}) }
function resized(id, h, w) { settle(id, {size: snapGridSize(w, h)}) }
</script>
