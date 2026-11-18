<template>
  <CardState :loading="loading" :error="error" :empty="empty" empty-title="开始整理 AI 投入" empty-text="添加账号和订阅，分别了解成本、现金支出与续费。" route="/ai-subscriptions" app-name="智订" @retry="load">
    <div class="ai-card">
      <p class="wb-fine">{{ data.month }} · 按原币统计</p>
      <div v-for="group in data.currencies" :key="group.currency" class="ai-currency">
        <strong>{{ group.currency }} {{ amount(group.confirmedCost) }}</strong><span>确认成本</span>
        <div class="ai-details"><span>现金支出 {{ amount(group.cashExpense) }}</span><span>月均承诺 {{ amount(group.monthlyCommitment) }}</span></div>
        <small v-if="Number(group.estimatedCost) > 0">另有预计成本 {{ amount(group.estimatedCost) }}</small>
      </div>
      <p v-if="!data.currencies?.length" class="wb-fine">金额未记录</p>
      <p v-if="!data.complete" class="ai-incomplete" role="status">汇总不完整：{{ data.missingReasons?.join('；') || '部分记录待核对' }}</p>
      <p class="wb-fine">套餐内用量不重复计费，API 充值仅计现金支出。</p>
    </div>
  </CardState>
</template>
<script setup>
import {computed} from 'vue'
import {getAiSummary} from '@/api/aiSubscriptions'
import {useWorkbenchResource, workbenchPayload} from '@/composables/useWorkbenchResource'
import CardState from './CardState.vue'
const props = defineProps({refreshKey: Number})
const emit = defineEmits(['state'])
const {loading, error, data, load} = useWorkbenchResource(() => workbenchPayload(getAiSummary()), emit, () => props.refreshKey)
const empty = computed(() => data.value && !data.value.hasRecords)
const amount = value => value == null ? '未记录' : Number(value).toLocaleString('zh-CN', {minimumFractionDigits: 2, maximumFractionDigits: 2})
</script>
<style scoped>
.ai-card{display:grid;gap:10px}.ai-card p{margin:0}.ai-currency{padding:12px;border-radius:12px;background:var(--theme-surface-muted);display:grid;gap:5px}.ai-currency strong{font-size:24px;font-variant-numeric:tabular-nums}.ai-currency>span,.ai-currency small{font-size:12px;color:var(--theme-text-muted)}.ai-details{display:flex;flex-wrap:wrap;gap:6px 18px;font-size:12px}.ai-incomplete{font-size:12px;line-height:1.6;color:var(--theme-warning)}
</style>
