<template>
  <details v-if="series.length" class="quota-trend">
    <summary>额度变化</summary>
    <label>观察窗口
      <select v-model="seriesIndex">
        <option v-for="(item, index) in series" :value="index" :key="index">{{ item.label }} · {{ item.reading === 'USED' ? '已用' : '剩余' }}</option>
      </select>
    </label>
    <ul>
      <li v-for="point in points" :key="point.observedAt">
        <time>{{ quotaDateLabel(point.observedAt) }}</time>
        <span class="quota-bar" aria-hidden="true"><i :style="{width: point.percent + '%'}" /></span>
        <strong>{{ point.percent }}%</strong>
      </li>
    </ul>
    <p>按采集时间展示同一窗口的原始比例，重置前后的读数均保留。</p>
  </details>
</template>
<script setup>
import {computed, ref} from 'vue'
import {quotaDateLabel} from '@/utils/aiQuotaSnapshots'
const props = defineProps({snapshots: {type: Array, required: true}})
const seriesIndex = ref(0)
const series = computed(() => {
  const grouped = new Map()
  for (const snapshot of props.snapshots) {
    for (const window of snapshot.windows) {
      if (window.percent == null) continue
      const key = JSON.stringify([window.label, window.reading])
      if (!grouped.has(key)) grouped.set(key, {label:window.label, reading:window.reading, points:[]})
      grouped.get(key).points.push({observedAt:snapshot.observedAt, percent:window.percent})
    }
  }
  return [...grouped.values()].filter(item => item.points.length > 1)
})
const points = computed(() => (series.value[seriesIndex.value]?.points ?? []).slice(0, 12).reverse())
</script>
<style scoped>
.quota-trend{border:1px solid var(--theme-border);border-radius:12px;padding:14px;background:var(--theme-surface-muted)}
.quota-trend summary{font-weight:600;cursor:pointer}
.quota-trend label{margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.quota-trend select{padding:8px;min-width:0;max-width:100%}
.quota-trend ul{padding:0;list-style:none}
.quota-trend li{display:grid;grid-template-columns:auto minmax(0,1fr) 4.5em;gap:8px;align-items:center;margin:8px 0;font-size:13px}
.quota-trend p{margin:0;color:var(--theme-text-muted);font-size:13px}
.quota-bar{height:7px;background:var(--theme-divider);border-radius:6px;overflow:hidden}
.quota-bar i{height:100%;display:block;background:var(--theme-accent)}
</style>
