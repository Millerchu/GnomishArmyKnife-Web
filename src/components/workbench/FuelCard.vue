<template>
  <CardState :loading="loading" :error="error" :empty="empty" empty-title="还没有加油记录" empty-text="记录加油后，可在这里查看费用和油耗。"
    action-label="＋ 新增加油记录" type-code="FUEL_RECORD" route="/fuel-stats" app-name="油耗统计" @retry="load" @create="$emit('create', $event)">
    <div class="wb-stats wb-money">
      <div class="wb-stat"><b>{{ money(data.currentMonthAmount) }}</b><span>本月实付</span></div>
      <div class="wb-stat"><b>{{ consumption(data.averageConsumption) }}</b><span>平均油耗</span></div>
    </div>
    <p v-if="data.vehicleStats.length > 1" class="wb-fine wb-vehicle-summary">{{ vehicleSummary }}</p>
    <div class="wb-section-label">最近加油</div>
    <ul class="wb-list wb-fuel-list">
      <li v-for="(record, index) in data.recentRecords" :key="index">
        <div class="wb-record-main"><time>{{ record.fuelDate }}</time><span class="wb-truncate" :title="record.vehicleName">{{ record.vehicleName }}</span></div>
        <div class="wb-record-amount"><b>{{ money(record.discountedAmount) }}</b><small v-if="record.fuelConsumption != null">{{ consumption(record.fuelConsumption) }}</small></div>
      </li>
    </ul>
  </CardState>
</template>
<script setup>
import {computed} from 'vue'
import {getFuelSummary} from '@/api/fuelStats'
import {useWorkbenchResource, workbenchPayload} from '@/composables/useWorkbenchResource'
import {consumption, money, workbenchFuelSummary} from '@/utils/workbenchData'
import CardState from './CardState.vue'
const props = defineProps({refreshKey: Number})
const emit = defineEmits(['create', 'state'])
const {loading, error, data, load} = useWorkbenchResource(async () => workbenchFuelSummary(await workbenchPayload(getFuelSummary())), emit, () => props.refreshKey)
const empty = computed(() => data.value && !data.value.hasRecords)
const vehicleSummary = computed(() => data.value?.vehicleStats.map(item => `${item.vehicleName} ${consumption(item.averageConsumption)}`).join(' · '))
</script>
