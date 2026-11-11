<template>
  <CardState :loading="loading" :error="error" :empty="!hasRecords" empty-title="还没有健康记录" empty-text="记录测量、就诊或报告后，这里只显示最近日期和条数。"
    action-label="＋ 记一条" type-code="HEALTH_RECORD" route="/health" app-name="健康" @retry="load" @create="$emit('create', $event)">
    <div class="wb-health"><div v-for="item in categories" :key="item.date"><span>{{ item.label }}</span><b>{{ data[item.date] || '暂无记录' }}</b><small>共 {{ data[item.count] ?? '—' }} {{ item.unit }}</small></div></div>
    <p class="wb-fine">仅显示日期与条数。</p>
  </CardState>
</template>
<script setup>
import {computed} from 'vue'
import {getHealthSummary} from '@/api/healthRecord'
import {useWorkbenchResource, workbenchPayload} from '@/composables/useWorkbenchResource'
import CardState from './CardState.vue'
const props = defineProps({refreshKey: Number})
const emit = defineEmits(['create', 'state'])
const {loading, error, data, load} = useWorkbenchResource(() => workbenchPayload(getHealthSummary()), emit, () => props.refreshKey)
const categories = [
  {label: '最近测量', date: 'latestMeasureDate', count: 'recordCount', unit: '次'},
  {label: '最近就诊', date: 'lastVisitDate', count: 'visitCount', unit: '次'},
  {label: '最近报告', date: 'lastExamDate', count: 'reportCount', unit: '份'}
]
const hasRecords = computed(() => categories.some(item => data.value?.[item.date] || Number(data.value?.[item.count]) > 0))
</script>
