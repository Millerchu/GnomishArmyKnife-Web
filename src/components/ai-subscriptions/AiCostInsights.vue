<template>
  <details class="cost-insights" @toggle="toggle">
    <summary>费用趋势与工具排行</summary>
    <p v-if="loading" role="status">正在读取费用明细…</p>
    <p v-else-if="error" role="alert">{{ error }} <button type="button" @click="load">重试</button></p>
    <template v-else-if="report">
      <p v-if="!currencies.length">所选期间尚无可展示的确认成本。</p>
      <template v-for="currency in currencies" :key="currency">
        <h3>{{ currency }} · 近六个月确认成本</h3>
        <ul class="trend">
          <li v-for="point in series(currency)" :key="point.month">
            <time>{{ point.month }}</time>
            <span class="track" aria-hidden="true"><i :style="{width: point.width + '%'}" /></span>
            <span>{{ aiMoney(point.cost) }}{{ point.complete ? '' : ' *' }}</span>
          </li>
        </ul>
        <h3>{{ month }} · {{ currency }} 工具排行</h3>
        <ol v-if="ranking(currency).length"><li v-for="item in ranking(currency)" :key="item.toolCode">{{ toolName(item.toolCode) }} · {{ aiMoney(item.cost) }}</li></ol>
        <p v-else>该月尚无确认成本。</p>
      </template>
      <p v-if="report.trend.some(item => !item.complete)">* 该月汇总有未核对、未归属或缺汇率项目，详情见该月总览。</p>
    </template>
  </details>
</template>
<script setup>
import {computed, onBeforeUnmount, ref, watch} from 'vue'
import {aiPayload, getAiInsights} from '@/api/aiSubscriptions'
import {aiMoney} from '@/utils/aiSubscriptions'

const props = defineProps({month: String, tools: Array})
const report = ref(null), loading = ref(false), error = ref('')
const currencies = computed(() => [...new Set((report.value?.trend || []).flatMap(item =>
  item.currencies.filter(group => group.confirmedCost != null).map(group => group.currency)))].sort())
let open = false
let generation = 0

function toolName(code) { return props.tools?.find(tool => tool.code === code)?.name || code }
function cost(groups, currency) { return groups.find(item => item.currency === currency)?.confirmedCost }
function series(currency) {
  const points = report.value.trend.map(point => ({...point, cost: cost(point.currencies, currency)}))
  const max = Math.max(0, ...points.map(point => Math.abs(Number(point.cost) || 0)))
  return points.map(point => ({...point, width: max ? Math.abs(Number(point.cost) || 0) / max * 100 : 0}))
}
function ranking(currency) {
  return report.value.tools.map(item => ({toolCode: item.toolCode, cost: cost(item.currencies, currency)}))
    .filter(item => item.cost != null).sort((left, right) => Number(right.cost) - Number(left.cost))
}
function toggle(event) { open = event.target.open; if (open) load() }
async function load() {
  const current = ++generation
  if (!open || !props.month) return
  report.value = null; error.value = ''; loading.value = true
  try { const result = aiPayload(await getAiInsights(props.month)); if (current === generation) report.value = result }
  catch (failure) { if (current === generation) error.value = failure.response?.data?.message || '暂时无法读取费用明细。' }
  finally { if (current === generation) loading.value = false }
}
watch(() => props.month, load)
onBeforeUnmount(() => { generation++ })
</script>
<style scoped>
.cost-insights{margin-top:16px;padding:16px;border:1px solid var(--theme-border);border-radius:12px;background:var(--theme-surface-muted)}.cost-insights summary{cursor:pointer;font-weight:600}.cost-insights h3{margin-top:18px}.cost-insights li,.cost-insights p{font-size:14px;line-height:1.65}.trend{padding:0;list-style:none}.trend li{display:grid;grid-template-columns:5.5rem minmax(0,1fr) minmax(5rem,auto);align-items:center;gap:10px}.track{height:7px;border-radius:6px;background:var(--theme-divider);overflow:hidden}.track i{display:block;height:100%;border-radius:6px;background:var(--theme-accent)}
</style>
