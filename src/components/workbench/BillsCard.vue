<template>
  <CardState :loading="loading" :error="error" :empty="empty" empty-title="本月还没有账单" empty-text="记一笔后，这里会显示本月收支与预算执行。"
    action-label="＋ 记一笔" type-code="PERSONAL_BILL" route="/personal-bills" app-name="个人账单" @retry="load" @create="$emit('create', $event)">
    <div class="wb-stats wb-money"><div v-for="[key, label, tone] in amounts" :key="key" class="wb-stat" :class="tone"><b>{{ money(data[key]) }}</b><span>{{ label }}</span></div></div>
    <div class="wb-section-label">年度预算执行 <b v-if="Number(data.annualBudgetAmount) > 0">{{ money(data.annualBudgetUsed) }} / {{ money(data.annualBudgetAmount) }} · {{ percent(data.annualBudgetUsageRate) }}</b><span v-else>尚未设置年度预算</span></div>
    <div v-if="Number(data.annualBudgetAmount) > 0" class="wb-bar" role="meter" aria-label="年度预算执行率" :aria-valuenow="Number(data.annualBudgetUsageRate || 0) * 100" aria-valuemin="0" :aria-valuemax="Math.max(100, Number(data.annualBudgetUsageRate || 0) * 100)"><i :style="{width: `${Math.min(100, Math.max(0, Number(data.annualBudgetUsageRate || 0) * 100))}%`}"></i></div>
    <div v-for="item in categories" :key="item.categoryName" class="wb-category"><span class="wb-truncate">{{ item.categoryName }}</span><div class="wb-bar"><i :style="{width: `${Math.min(100, Math.max(0, Number(item.ratio || 0) * 100))}%`}"></i></div><small>{{ money(item.amount) }}</small></div>
  </CardState>
</template>
<script setup>
import {computed} from 'vue'
import {getPersonalBillSummary} from '@/api/personalBills'
import {useWorkbenchResource, workbenchPayload} from '@/composables/useWorkbenchResource'
import {localDate, money, percent} from '@/utils/workbenchData'
import CardState from './CardState.vue'
const props = defineProps({refreshKey: Number})
const emit = defineEmits(['create', 'state'])
const {loading, error, data, load} = useWorkbenchResource(() => workbenchPayload(getPersonalBillSummary({month: localDate().slice(0, 7)})), emit, () => props.refreshKey)
// recentBills 是跨月最近记录，不能用它判断本月是否有账单。
const empty = computed(() => data.value && !Number(data.value.currentMonthExpense) && !Number(data.value.currentMonthIncome)
  && !data.value.categoryDistribution?.length)
const categories = computed(() => [...(data.value?.categoryDistribution || [])].sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 3))
const amounts = [['currentMonthExpense', '本月支出', 'wb-expense'], ['currentMonthIncome', '本月收入', 'wb-income'], ['currentMonthBalance', '本月结余', '']]
</script>
