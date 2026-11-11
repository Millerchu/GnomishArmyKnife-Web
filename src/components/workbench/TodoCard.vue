<template>
  <CardState :loading="loading" :error="error" :empty="!tasks.length && !upcoming.length" empty-title="今天没有待办"
    empty-text="截止今天或加入「我的一天」的未完成任务会显示在这里。" action-label="＋ 新增待办" type-code="TODO_ITEM" route="/todo-list" app-name="待办列表" @retry="load" @create="$emit('create', $event)">
    <div class="wb-stats">
      <div v-for="[key, label] in counters" :key="key" class="wb-stat"><b>{{ data.summary?.[key] ?? '—' }}</b><span>{{ label }}</span></div>
    </div>
    <p v-if="mutationError" class="wb-inline-error" role="alert">{{ mutationError }}</p>
    <ul class="wb-list">
      <li v-for="task in tasks" :key="task.id" :class="{done: task.status === 'COMPLETED' || completedOverrides.has(task.id)}">
        <input type="checkbox" :checked="task.status === 'COMPLETED' || completedOverrides.has(task.id)" :disabled="pendingIds.size > 0" :aria-label="`完成待办：${task.title}`" @change="complete(task)" />
        <span class="wb-truncate" :title="task.title">{{ task.title }}</span><span v-if="task.important" class="wb-star" aria-label="重要">★</span>
        <small>{{ task.listCode === 'MY_DAY' ? '我的一天' : formatTodoDueDate(task.dueDate) }}</small>
      </li>
    </ul>
    <template v-if="upcoming.length"><div class="wb-section-label">即将到期 <small>最多 5 条</small></div>
      <ul class="wb-list"><li v-for="task in upcoming" :key="task.id"><span aria-hidden="true">◷</span><span class="wb-truncate">{{ task.title }}</span><small>{{ task.listCode === 'MY_DAY' ? '我的一天' : formatTodoDueDate(task.dueDate) }}</small></li></ul>
    </template>
  </CardState>
</template>
<script setup>
import {computed, ref, watch} from 'vue'
import {listTodoTasks, updateTodoTaskStatus} from '@/api/todoList'
import {useWorkbenchResource, workbenchPayload} from '@/composables/useWorkbenchResource'
import {formatTodoDueDate, localDate} from '@/utils/workbenchData'
import CardState from './CardState.vue'
const props = defineProps({refreshKey: Number})
const emit = defineEmits(['create', 'state'])
const {loading, error, data, load, isAlive} = useWorkbenchResource(async () => {
  const result = await workbenchPayload(listTodoTasks({viewCode: 'TODAY', pageNo: 1, pageSize: 6}))
  return {...result, today: localDate(), list: (result.list || []).filter(task => task.status !== 'COMPLETED')}
}, emit, () => props.refreshKey)
const tasks = computed(() => data.value?.list || [])
const upcoming = computed(() => {
  const todayIds = new Set(tasks.value.map(task => task.id))
  return (data.value?.upcoming || []).filter(task => task.dueDate > data.value.today && !todayIds.has(task.id)).slice(0, 5)
})
const counters = [['today', '今日未完成'], ['important', '重要'], ['completed', '已完成'], ['total', '全部任务']]
const mutationError = ref('')
const pendingIds = ref(new Set())
const completedOverrides = ref(new Set())
watch(data, () => completedOverrides.value.clear())
async function complete(task) {
  if (pendingIds.value.size) return
  completedOverrides.value.add(task.id)
  pendingIds.value.add(task.id)
  mutationError.value = ''
  try {
    const response = await updateTodoTaskStatus(task.id, {status: 'COMPLETED'})
    if (response?.data?.code != null && !['0', '200'].includes(String(response.data.code))) throw new Error('保存失败')
    if (isAlive()) await load()
  } catch {
    if (isAlive()) { completedOverrides.value.delete(task.id); mutationError.value = '待办未能完成，已恢复原状态，请重试。' }
  } finally { if (isAlive()) pendingIds.value.delete(task.id) }
}
</script>
