<template>
  <div v-if="points.length" class="growth-chart">
    <svg viewBox="0 0 680 250" role="img" :aria-label="`${metric.label}趋势，${points.length}次测量`">
      <g v-for="tick in ticks" :key="tick.value">
        <line x1="58" x2="650" :y1="tick.y" :y2="tick.y" class="grid-line" />
        <text x="5" :y="tick.y + 4">{{ tick.value }}</text>
      </g>
      <text x="5" y="15">{{ metric.unit }}</text>
      <path v-if="points.length > 1" :d="path" class="trend-line" />
      <g v-for="point in points" :key="point.id" class="point" tabindex="0" role="button"
         :aria-label="`${point.measureDate} ${point.value} ${metric.unit}`"
         @click="selected = point" @keydown.enter.prevent="selected = point" @keydown.space.prevent="selected = point">
        <circle :cx="point.x" :cy="point.y" r="13" fill="transparent" />
        <circle :cx="point.x" :cy="point.y" r="4" class="point-mark" />
        <title>{{ point.measureDate }} · {{ point.value }} {{ metric.unit }}</title>
      </g>
      <text v-for="label in dateLabels" :key="label.date" :x="label.x" y="236" :text-anchor="label.anchor">{{ label.date }}</text>
    </svg>
    <p class="chart-caption"><span>● {{ metric.label }} · {{ metric.unit }}</span><span>{{ selectedText }}</span></p>
  </div>
  <div v-else class="chart-empty">暂无{{ metric.label }}测量记录，添加一次测量后查看趋势。</div>
</template>

<script setup>
import {computed, ref, watch} from 'vue'
import {chronologicalMeasurements, dateStamp, hasMetric} from '@/utils/growthRecords'
const props = defineProps({records: {type: Array, default: () => []}, metric: {type: Object, required: true}})
const selected = ref(null)
watch(() => [props.records, props.metric.key], () => { selected.value = null })
const valid = computed(() => chronologicalMeasurements(props.records).filter(record => hasMetric(record[props.metric.key])))
const range = computed(() => {
  const values = valid.value.map(record => Number(record[props.metric.key]))
  const low = Math.min(...values), high = Math.max(...values), padding = Math.max((high - low) * .15, 1)
  return {low: Math.max(0, Math.floor(low - padding)), high: Math.ceil(high + padding)}
})
const points = computed(() => {
  if (!valid.value.length) return []
  const first = dateStamp(valid.value[0].measureDate), last = dateStamp(valid.value.at(-1).measureDate)
  return valid.value.map(record => ({...record, value: Number(record[props.metric.key]),
    x: last === first ? 354 : 58 + (dateStamp(record.measureDate) - first) / (last - first) * 592,
    y: 198 - (Number(record[props.metric.key]) - range.value.low) / (range.value.high - range.value.low) * 170}))
})
const path = computed(() => points.value.map((point, index) => `${index ? 'L' : 'M'} ${point.x},${point.y}`).join(' '))
const ticks = computed(() => Array.from({length: 4}, (_, index) => ({y: 198 - index / 3 * 170,
  value: (range.value.low + (range.value.high - range.value.low) * index / 3).toFixed(1)})))
const dateLabels = computed(() => {
  if (!points.value.length) return []
  const first = points.value[0], last = points.value.at(-1)
  return first.measureDate === last.measureDate ? [{date: first.measureDate, x:354, anchor:'middle'}]
    : [{date: first.measureDate, x:58, anchor:'start'}, {date: last.measureDate, x:650, anchor:'end'}]
})
const selectedText = computed(() => selected.value
  ? `${selected.value.measureDate} · ${selected.value.value} ${props.metric.unit}` : '点击测量点查看数值')
</script>

<style scoped>
svg{width:100%;height:230px;display:block}text{fill:var(--theme-chart-axis);font-size:12px;font-family:inherit}.grid-line{stroke:var(--theme-chart-grid)}.trend-line{fill:none;stroke:var(--theme-accent);stroke-width:2.5}.point{cursor:pointer}.point-mark{fill:var(--theme-accent);stroke:var(--theme-chart-point-stroke);stroke-width:2}.chart-caption{display:flex;justify-content:space-between;gap:12px;color:var(--theme-text-muted);font-size:12px;margin:4px 0 0}.chart-caption span:first-child{color:var(--theme-link)}.chart-empty{padding:50px 12px;text-align:center;color:var(--theme-text-muted)}@media(max-width:720px){svg{height:155px}text{font-size:16px}.chart-caption{font-size:11px;flex-wrap:wrap}}
</style>
