<template>
  <main class="system-log-page" :inert="selectedId !== null">
    <nav><RouterLink to="/home">← 返回桌面</RouterLink></nav>
    <header class="system-log-heading">
      <div><h1>系统日志</h1><p>仅显示已接入异常边界的记录，部分后台任务内部处理的异常不在此处。</p></div>
      <button v-if="!forbidden" type="button" :disabled="loading" @click="loadLogs">手动刷新</button>
    </header>
    <MacEmptyState v-if="forbidden" title="无权限查看系统日志" description="请联系管理员确认账号状态与应用授权。"/>
    <template v-else>
      <form class="system-log-filters" @submit.prevent="search">
        <fieldset :disabled="loading">
          <legend>筛选日志</legend>
          <label>开始时间（北京时间）<input v-model="filters.occurredFrom" name="occurredFrom" type="datetime-local" step="1" :aria-invalid="!!timeError" :aria-describedby="timeError ? 'system-log-time-error' : undefined"></label>
          <label>结束时间（北京时间）<input v-model="filters.occurredTo" name="occurredTo" type="datetime-local" step="1" :aria-invalid="!!timeError" :aria-describedby="timeError ? 'system-log-time-error' : undefined"></label>
          <label>异常类型<input v-model="filters.exceptionType" name="exceptionType" maxlength="255" placeholder="异常类名，精确匹配"></label>
          <label>追踪编号<input v-model="filters.traceId" name="traceId" maxlength="64" placeholder="精确匹配"></label>
          <label class="system-log-keyword">摘要关键词<input v-model="filters.keyword" name="keyword" maxlength="80" placeholder="搜索已保存的脱敏摘要"></label>
          <div class="system-log-actions"><button type="submit" class="primary">查询</button><button type="button" @click="reset">重置</button></div>
        </fieldset>
        <p v-if="timeError" id="system-log-time-error" class="system-log-error" role="alert">{{ timeError }}</p>
      </form>
      <section :aria-busy="loading" aria-label="系统日志列表">
        <MacTable label="系统日志列表" title="异常记录" subtitle="发生时间倒序 · 北京时间">
          <thead><tr><th>发生时间（北京时间）</th><th>来源</th><th>异常类型</th><th>脱敏摘要</th><th>请求方法</th><th>路径</th><th>追踪编号</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-if="loading"><td colspan="8" class="system-log-loading" role="status">正在加载系统日志…</td></tr>
            <tr v-else-if="listError"><td colspan="8"><MacEmptyState title="日志加载失败，请重试" :description="listError"><button type="button" @click="loadLogs">重试</button></MacEmptyState></td></tr>
            <tr v-else-if="!logs.length"><td colspan="8"><MacEmptyState :title="hasAppliedFilters ? '没有符合条件的日志' : '暂无系统日志'" :description="hasAppliedFilters ? '可调整查询条件或重置筛选。' : '可稍后手动刷新。'"><button v-if="hasAppliedFilters" type="button" @click="reset">重置筛选</button></MacEmptyState></td></tr>
            <tr v-for="log in logs" v-else :key="log.id">
              <td class="system-log-time">{{ formatSystemLogTime(log.occurredAt) }}</td><td>{{ systemLogSourceLabel(log.source) }}</td>
              <td><span class="system-log-ellipsis" :title="log.exceptionType">{{ log.exceptionType || '—' }}</span></td>
              <td><span class="system-log-ellipsis" :title="log.summary">{{ log.summary || '—' }}</span></td><td>{{ log.httpMethod || '—' }}</td>
              <td><span class="system-log-ellipsis" :title="log.requestPath">{{ log.requestPath || '—' }}</span></td><td class="system-log-trace">{{ log.traceId || '—' }}</td>
              <td><button type="button" :aria-label="`查看 ${formatSystemLogTime(log.occurredAt)} 的日志详情`" @click="openDetail(log.id, $event)">详情</button></td>
            </tr>
          </tbody>
        </MacTable>
        <footer v-if="!listError" class="system-log-pagination">
          <span>共 {{ total }} 条 · 第 {{ pageNo }} / {{ pageCount }} 页</span>
          <label>每页条数<GlassSelect v-model="pageSize" :options="pageSizeOptions" :disabled="loading" @change="changePageSize"/></label>
          <button type="button" :disabled="loading || pageNo <= 1" @click="changePage(-1)">上一页</button>
          <button type="button" :disabled="loading || pageNo >= pageCount" @click="changePage(1)">下一页</button>
        </footer>
      </section>
    </template>
  </main>
  <SystemLogDetail v-if="selectedId !== null" :id="selectedId" :return-focus="detailTrigger" @close="closeDetail" @refresh="closeAndRefresh" @forbidden="denyAccess"/>
</template>

<script setup>
import {computed, onBeforeUnmount, onMounted, reactive, ref, shallowRef} from 'vue'
import MacTable from '@/components/MacTable.vue'
import MacEmptyState from '@/components/MacEmptyState.vue'
import GlassSelect from '@/components/GlassSelect.vue'
import SystemLogDetail from '@/components/SystemLogDetail.vue'
import {listSystemLogs} from '@/api/systemLog'
import {readAuthState} from '@/utils/authStorage'
import {buildSystemLogQuery, emptySystemLogFilters, formatSystemLogTime, readSystemLogResponse, systemLogErrorCode, systemLogSourceLabel, validateSystemLogTimeRange} from '@/utils/systemLog'

const filters = reactive(emptySystemLogFilters())
const appliedFilters = ref(emptySystemLogFilters())
const user = readAuthState().user
const forbidden = ref(String(user?.roleCode || '').toUpperCase() !== 'ADMIN')
const loading = ref(!forbidden.value)
const listError = ref('')
const logs = ref([])
const total = ref(0)
const pageNo = ref(1)
const pageSize = ref(20)
const pageSizeOptions = [20, 50, 100].map(value => ({value, label: `${value} 条`}))
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
const hasAppliedFilters = computed(() => Object.values(appliedFilters.value).some(value => String(value).trim()))
const timeError = computed(() => validateSystemLogTimeRange(filters))
const selectedId = ref(null)
const detailTrigger = shallowRef(null)
let listSequence = 0

function denyAccess() {
  listSequence++
  selectedId.value = null
  logs.value = []
  total.value = 0
  forbidden.value = true
  loading.value = false
}

async function loadLogs() {
  if (forbidden.value) return
  const sequence = ++listSequence
  loading.value = true
  listError.value = ''
  // 失败不保留旧数据，避免把上次结果误作本次结果。
  logs.value = []
  total.value = 0
  try {
    const data = readSystemLogResponse(await listSystemLogs(buildSystemLogQuery(appliedFilters.value, pageNo.value, pageSize.value)))
    if (sequence !== listSequence) return
    logs.value = data.list
    total.value = data.total
  } catch (error) {
    if (sequence !== listSequence) return
    const code = systemLogErrorCode(error)
    if (code === '403') denyAccess()
    else listError.value = ['400', 'SYSTEM_LOG_QUERY_INVALID'].includes(code)
      ? '查询条件不合法，请调整筛选条件后重试'
      : '请检查网络连接后重试。'
  } finally {
    if (sequence === listSequence) loading.value = false
  }
}

function search() {
  if (loading.value || timeError.value) return
  appliedFilters.value = {...filters}
  pageNo.value = 1
  loadLogs()
}
function reset() {
  if (loading.value) return
  Object.assign(filters, emptySystemLogFilters())
  search()
}
function changePage(direction) {
  if (loading.value) return
  const next = pageNo.value + direction
  if (next < 1 || next > pageCount.value) return
  pageNo.value = next
  loadLogs()
}
function changePageSize() {
  pageNo.value = 1
  loadLogs()
}
function openDetail(id, event) {
  detailTrigger.value = event.currentTarget
  selectedId.value = String(id)
}
function closeDetail() { selectedId.value = null }
function closeAndRefresh() { closeDetail(); loadLogs() }

onMounted(() => { if (!forbidden.value) loadLogs() })
onBeforeUnmount(() => { listSequence++ })
</script>

<style scoped>
.system-log-page { max-width: 1600px; margin: auto; padding: 28px; color: var(--theme-text); }
nav a { color: var(--theme-text-muted); text-decoration: none; }
.system-log-heading { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin: 24px 0; }
h1 { margin: 0 0 10px; font-size: 28px; }
.system-log-heading p { margin: 0; color: var(--theme-text-muted); line-height: 1.6; }
.system-log-filters { padding: 20px; margin-bottom: 20px; border: 1px solid var(--theme-border); border-radius: 16px; background: var(--theme-surface-raised); }
fieldset { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; border: 0; margin: 0; padding: 0; min-width: 0; }
legend { padding: 0 0 16px; font-weight: 650; }
label { display: grid; gap: 8px; font-size: 13px; min-width: 0; }
input { box-sizing: border-box; width: 100%; min-width: 0; padding: 10px 12px; border: 1px solid var(--theme-border-strong); border-radius: 10px; color: var(--theme-text); background: var(--theme-field-surface); font: inherit; }
button { min-height: 40px; padding: 8px 14px; border: 1px solid var(--theme-border-strong); border-radius: 12px; color: var(--theme-text); background: var(--theme-surface-raised); font: inherit; cursor: pointer; white-space: nowrap; }
button.primary { color: var(--theme-accent); background: var(--theme-accent-soft); }
button:disabled { opacity: .5; cursor: not-allowed; }
button:focus-visible, input:focus-visible, nav a:focus-visible { outline: 3px solid var(--theme-focus-ring); outline-offset: 3px; }
.system-log-actions { display: flex; gap: 10px; align-items: end; }
.system-log-error { color: var(--theme-danger, var(--theme-text)); margin-bottom: 0; }
.system-log-ellipsis { display: block; max-width: 210px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.system-log-trace { min-width: 170px; max-width: 230px; overflow-wrap: anywhere; user-select: text; }
.system-log-time { white-space: nowrap; }
.system-log-loading { height: 180px; text-align: center !important; color: var(--theme-text-muted); }
.system-log-pagination { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 12px; padding: 18px 0; font-size: 13px; }
.system-log-pagination label { display: flex; align-items: center; }
@media (min-width: 1200px) { fieldset { grid-template-columns: repeat(4, minmax(0, 1fr)); } .system-log-keyword { grid-column: span 2; } }
@media (max-width: 720px) { .system-log-page { padding: 18px 12px; } .system-log-heading { align-items: flex-start; flex-direction: column; } fieldset { grid-template-columns: 1fr; } .system-log-pagination { justify-content: flex-start; } }
</style>
