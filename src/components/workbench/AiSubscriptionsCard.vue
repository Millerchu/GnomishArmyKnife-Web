<template>
  <CardState :loading="loading" :error="error" :empty="empty" empty-title="尚无套餐额度记录"
    empty-text="到智订的「套餐额度」记录一次用量，首页就会显示图表。"
    route="/ai-subscriptions?view=quota" app-name="套餐额度" @retry="load">
    <ul class="quota-accounts">
      <li v-for="account in data" :key="account.accountId" class="quota-account">
        <header>
          <strong>{{ accountName(account) }}</strong>
          <time :datetime="account.observedAt">记录于 {{ quotaDateLabel(account.observedAt) }}</time>
        </header>
        <ul class="quota-windows">
          <li v-for="window in account.windows" :key="window.label" class="quota-window">
            <div class="quota-row">
              <span>{{ window.label }}</span>
              <b v-if="window.percent != null">{{ window.reading === 'REMAINING' ? '剩余' : '已用' }} {{ window.percent }}%</b>
              <small v-else-if="window.remaining == null">{{ window.resetHint || '暂无比例' }}</small>
            </div>
            <meter v-if="window.percent != null" :class="{remaining: window.reading === 'REMAINING'}" min="0" max="100"
              :value="window.percent" :aria-label="`${window.label} · ${window.reading === 'REMAINING' ? '剩余' : '已用'}`" />
            <small v-if="window.remaining != null" class="quota-quantity">剩余 {{ quantity(window.remaining) }} {{ window.unit }}</small>
          </li>
        </ul>
      </li>
    </ul>
  </CardState>
</template>

<script setup>
import {computed} from 'vue'
import {listLatestAiQuotas} from '@/api/aiSubscriptions'
import {useWorkbenchResource, workbenchPayload} from '@/composables/useWorkbenchResource'
import {quotaDateLabel} from '@/utils/aiQuotaSnapshots'
import CardState from './CardState.vue'

const props = defineProps({refreshKey: Number})
const emit = defineEmits(['state'])
const {loading, error, data, load} = useWorkbenchResource(async () => {
  const accounts = await workbenchPayload(listLatestAiQuotas())
  if (!Array.isArray(accounts)) throw new Error('额度列表格式不正确')
  return accounts
}, emit, () => props.refreshKey)
const empty = computed(() => data.value?.length === 0)
const toolNames = {CHATGPT: 'ChatGPT', GROK: 'Grok', GEMINI: 'Gemini', MUSE: 'Muse', QODERCN: 'QoderCN', WORKBUDDY: 'Workbuddy'}
const numberFormat = new Intl.NumberFormat('zh-CN')
function accountName({toolCode, alias}) {
  const name = toolNames[toolCode] || toolCode
  return alias === name ? name : `${name} · ${alias}`
}
function quantity(value) { return numberFormat.format(BigInt(value)) }
</script>

<style scoped>
.quota-accounts,.quota-windows{padding:0;list-style:none;margin:0}
.quota-accounts{display:grid;gap:8px}
.quota-account{border:1px solid var(--theme-border);border-radius:12px;background:var(--theme-surface-muted);padding:8px 12px}
.quota-account header,.quota-row{display:flex;justify-content:space-between;align-items:baseline;gap:4px 12px;flex-wrap:wrap}
.quota-account header{margin-bottom:5px;overflow-wrap:anywhere}
.quota-account header strong{font-size:13px}
.quota-account time,.quota-window small{font-size:11px;color:var(--theme-text-muted)}
.quota-windows{display:grid;gap:6px}
.quota-row{font-size:12px;color:var(--theme-text-soft)}
.quota-row b{font-variant-numeric:tabular-nums;color:var(--theme-text)}
.quota-window meter{display:block;width:100%;height:6px;margin:4px 0 1px;--quota-fill:var(--theme-accent)}
.quota-window meter.remaining{--quota-fill:var(--theme-success)}
.quota-window meter::-webkit-meter-bar{background:var(--theme-control-surface);border:0;border-radius:6px}
.quota-window meter::-webkit-meter-optimum-value{background:var(--quota-fill);border-radius:6px}
.quota-window meter::-moz-meter-bar{background:var(--quota-fill);border-radius:6px}
.quota-quantity{display:block;margin-top:4px}
</style>
