<template>
  <div class="quota-readings">
    <article v-for="(window, index) in snapshot.windows" :key="index" class="quota-window">
      <div class="quota-window-head">
        <h3>{{ window.label }}</h3>
        <strong v-if="window.percent != null">{{ window.reading === 'USED' ? '已用' : '剩余' }} {{ window.percent }}%</strong>
      </div>
      <meter v-if="window.percent != null" min="0" max="100" :value="window.percent"
        :aria-label="`${window.label}${window.reading === 'USED' ? '已用' : '剩余'}百分比`" />
      <p v-if="window.remaining != null">剩余 {{ formatQuantity(window.remaining) }} {{ window.unit }}</p>
      <p v-if="window.periodLabel">统计期间：{{ window.periodLabel }}</p>
      <p v-if="window.resetAt">自动重置：{{ quotaDateLabel(window.resetAt) }}</p>
      <p v-if="window.resetHint">采集时显示：{{ window.resetHint }}</p>
      <div v-for="group in groups" v-show="window.breakdown?.some(row => row.group === group.code)" :key="group.code" class="breakdown">
        <h4>{{ group.label }} · 占每周限额</h4>
        <ul>
          <li v-for="(row, rowIndex) in window.breakdown?.filter(row => row.group === group.code)" :key="rowIndex">
            <span>{{ row.label }}</span><strong>{{ row.percent }}%</strong>
          </li>
        </ul>
      </div>
    </article>
    <article v-if="snapshot.resets?.length" class="quota-window">
      <div class="quota-window-head">
        <h3>手动重置机会</h3><strong>采集时可用 {{ snapshot.resets.reduce((total, item) => total + item.count, 0) }} 次</strong>
      </div>
      <ul class="reset-list">
        <li v-for="(reset, index) in snapshot.resets" :key="index">
          <strong>{{ reset.label }} · {{ reset.count }} 次</strong>
          <span>{{ reset.expiresAt ? quotaDateLabel(reset.expiresAt) + ' 到期' : '到期时间未记录' }}</span>
        </li>
      </ul>
    </article>
  </div>
</template>
<script setup>
import {quotaDateLabel} from '@/utils/aiQuotaSnapshots'
defineProps({snapshot: {type: Object, required: true}})
const groups = [{code:'SOURCE', label:'按来源'}, {code:'BOT', label:'按 Bot'}]
const formatQuantity = value => new Intl.NumberFormat('zh-CN').format(BigInt(value))
</script>
<style scoped>
.quota-readings{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr));gap:12px}
.quota-window{min-width:0;padding:16px;border:1px solid var(--theme-border);border-radius:14px;background:var(--theme-surface-muted);overflow-wrap:anywhere}
.quota-window-head{display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;align-items:baseline}
.quota-window h3,.quota-window h4{font-size:14px;margin:0}
.quota-window p,.quota-window li{font-size:13px;color:var(--theme-text-muted);margin:7px 0}
.quota-window meter{width:100%;height:10px;margin:10px 0 4px}
.quota-window meter::-webkit-meter-bar{background:var(--theme-control-surface);border:none}
.quota-window meter::-webkit-meter-optimum-value,.quota-window meter::-webkit-meter-suboptimum-value,.quota-window meter::-webkit-meter-even-less-good-value{background:var(--theme-accent)}
.breakdown{margin-top:14px}
.breakdown ul,.reset-list{margin:8px 0 0;padding:0;list-style:none}
.breakdown li,.reset-list li{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;border-top:1px solid var(--theme-divider);padding-top:7px}
.quota-window strong{color:var(--theme-text);font-variant-numeric:tabular-nums}
</style>
