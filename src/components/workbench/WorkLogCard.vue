<template>
  <CardState :loading="loading" :error="error" :empty="!data?.unfinished.length && !data?.briefs.length"
    empty-title="今日还没写日志" empty-text="本周也还没有记录，写一条就能看到本周人天。" action-label="✎ 写今日日志" type-code="WORK_LOG" route="/work-log" app-name="工作日志" @retry="load" @create="$emit('create', $event)">
    <div><span class="wb-status" :class="data.todayWritten ? 'is-success' : 'is-warning'">{{ data.todayWritten ? '今日已写' : '今日未写' }}</span></div>
    <div class="wb-section-label">本周 <b>合计 {{ decimal(week.total) }} 人天</b></div>
    <div class="wb-week"><div v-for="(day, index) in week.days" :key="day.date" :class="{today: day.date === data.today}"><span>{{ weekdays[index] }}</span><b>{{ decimal(day.personDay) }}</b></div></div>
    <div class="wb-section-label">最近一条 <small>{{ latest?.logDate || '本周暂无日志' }}</small></div>
    <div v-if="latest" class="wb-latest"><span class="wb-truncate" :title="latest.brief">{{ latest.brief || '工作日志' }}</span><small>{{ decimal(getLogPersonDay(latest)) }} 人天</small></div>
    <div class="wb-section-label">未完成事项 <small>{{ data.unfinished.length }} 项</small></div>
    <ul v-if="data.unfinished.length" class="wb-list"><li v-for="item in data.unfinished.slice(0, 4)" :key="item.id"><span class="wb-star">◐</span><span class="wb-truncate" :title="item.workItem">{{ item.workItem }}</span><small>{{ WORK_LOG_STATUS_LABELS[item.status] || '未完成' }}</small></li></ul>
    <p v-else class="wb-fine">暂无未完成事项</p>
  </CardState>
</template>
<script setup>
import {computed} from 'vue'
import {getWeeklyBrief, listUnfinishedWorkItems} from '@/api/workLog'
import {getLogPersonDay} from '@/utils/workLogCalendar'
import {useWorkbenchResource, workbenchPayload} from '@/composables/useWorkbenchResource'
import {decimal, localDate, summarizeWeek, weekDates} from '@/utils/workbenchData'
import {WORK_LOG_STATUS_LABELS} from '@/constants/workLogStatus'
import CardState from './CardState.vue'
const props = defineProps({refreshKey: Number})
const emit = defineEmits(['create', 'state'])
const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const {loading, error, data, load} = useWorkbenchResource(async () => {
  const now = new Date()
  const today = localDate(now)
  const dates = weekDates(now)
  const [unfinished, briefs] = await Promise.all([
    workbenchPayload(listUnfinishedWorkItems({limit: 20})),
    workbenchPayload(getWeeklyBrief({refDate: today}))
  ])
  return {today, dates, unfinished, briefs, todayWritten: briefs.some(log => log.logDate === today)}
}, emit, () => props.refreshKey)
const week = computed(() => summarizeWeek(data.value?.briefs || [], data.value?.dates || []))
const latest = computed(() => [...(data.value?.briefs || [])].sort((a, b) => b.logDate.localeCompare(a.logDate))[0])
</script>
