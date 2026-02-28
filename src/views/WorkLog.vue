<template>
  <div class="work-log-page">
    <div class="top-bar">
      <button class="ghost-btn" @click="goBack">返回桌面</button>
      <div class="actions">
        <button class="action-btn" :disabled="loading" @click="changeWeek(-1)">上一周</button>
        <button class="action-btn" :disabled="loading" @click="changeWeek(1)">下一周</button>
        <button class="action-btn" :disabled="loading" @click="openCreateDialog">新增</button>
        <button class="action-btn" :disabled="!selectedLog || loading" @click="openEditDialog()">修改</button>
        <button class="action-btn danger" :disabled="!selectedLog || loading" @click="deleteSelectedLog">删除</button>
        <button class="action-btn" :disabled="loading" @click="toggleYearList">
          {{ showYearList ? '收起更多' : '更多' }}
        </button>
      </div>
    </div>

    <h1 class="page-title">工作日志</h1>

    <div class="week-title">
      当前周：{{ weekDays[0].date }} 至 {{ weekDays[6].date }}（周一为每周第一天）
    </div>

    <div class="calendar-grid">
      <div
        v-for="day in weekDays"
        :key="day.date"
        class="day-card"
        :class="{active: selectedDate === day.date}"
        @click="selectDay(day.date)"
        @dblclick="openDayDetail(day.date)"
      >
        <div class="day-head">
          <span>{{ day.weekLabel }}</span>
          <span>{{ day.date }}</span>
        </div>

        <div v-if="daySummaryMap[day.date]?.count" class="summary-wrap">
          <p class="summary-line">类型：{{ daySummaryMap[day.date].typesText }}</p>
          <p class="summary-line">项目：{{ daySummaryMap[day.date].projectsText }}</p>
          <p class="summary-line">禅道：{{ daySummaryMap[day.date].zentaoText }}</p>
          <p class="summary-line">内容：{{ daySummaryMap[day.date].workItemsText }}</p>
          <p class="summary-line">人天：{{ daySummaryMap[day.date].personDayTotal }}</p>
          <p v-if="daySummaryMap[day.date].count > 1" class="summary-extra">
            共 {{ daySummaryMap[day.date].count }} 条
          </p>
        </div>

        <div v-else class="empty-text">暂无日志</div>
      </div>
    </div>

    <div v-if="showDayDetail" class="detail-panel">
      <h2 class="panel-title">每日日志详情（{{ detailDate }}，双击卡片触发）</h2>
      <div v-if="detailDayLogs.length" class="detail-list">
        <div
          v-for="item in detailDayLogs"
          :key="item.id"
          class="detail-item"
          :class="{selected: selectedLog && selectedLog.id === item.id}"
          @click="selectLog(item)"
          @dblclick="openEditDialog(item)"
        >
          <p>日期：{{ item.logDate }}</p>
          <p>类型：{{ formatTypeCodes(item.typeCodes) }}</p>
          <p>地点：{{ item.location }}</p>
          <p>项目：{{ item.projectCode }}</p>
          <p>工作内容：{{ item.workItem }}</p>
          <p>禅道编号：{{ item.zentaoNo }}</p>
          <p>人天：{{ item.personDay }}</p>
          <p>加班时长：{{ item.overtimeHours }}</p>
          <p>备注：{{ item.remark || '-' }}</p>
        </div>
      </div>
      <div v-else class="empty-text">当前日期无明细</div>
    </div>

    <div v-if="showYearList" class="detail-panel">
      <div class="year-head">
        <h2 class="panel-title">日志列表（默认当年）</h2>
        <select v-model.number="yearFilter" class="year-select">
          <option v-for="year in yearOptions" :key="year" :value="year">{{ year }} 年</option>
        </select>
      </div>

      <div v-if="yearLogs.length" class="table-wrap">
        <table class="log-table">
          <thead>
          <tr>
            <th>日期</th>
            <th>类型</th>
            <th>地点</th>
            <th>项目</th>
            <th>工作内容</th>
            <th>禅道编号</th>
            <th>人天</th>
            <th>加班</th>
            <th>备注</th>
          </tr>
          </thead>
          <tbody>
          <tr
            v-for="item in yearLogs"
            :key="item.id"
            :class="{selectedRow: selectedLog && selectedLog.id === item.id}"
            @click="selectLog(item)"
          >
            <td>{{ item.logDate }}</td>
            <td>{{ formatTypeCodes(item.typeCodes) }}</td>
            <td>{{ item.location || '-' }}</td>
            <td>{{ item.projectCode || '-' }}</td>
            <td>{{ item.workItem || '-' }}</td>
            <td>{{ item.zentaoNo || '-' }}</td>
            <td>{{ item.personDay ?? '-' }}</td>
            <td>{{ item.overtimeHours ?? 0 }}</td>
            <td>{{ item.remark || '-' }}</td>
          </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="empty-text">{{ yearFilter }} 年暂无日志</div>
    </div>

    <div v-if="showDialog" class="dialog-mask" @click.self="closeDialog">
      <div class="dialog">
        <h3>{{ dialogMode === 'create' ? '新增工作日志' : '修改工作日志' }}</h3>
        <form class="dialog-form" @submit.prevent="submitDialog">
          <input v-model="form.logDate" type="date" required placeholder="日期（logDate）"/>

          <div class="type-group">
            <span class="type-title">日志类型（typeCodes）</span>
            <label v-for="item in typeOptions" :key="item.value" class="type-item">
              <input v-model="form.typeCodes" type="checkbox" :value="item.value"/>
              <span>{{ item.label }}</span>
            </label>
          </div>

          <input v-model="form.location" required placeholder="地点（location）"/>
          <input v-model="form.projectCode" required placeholder="所属项目（projectCode）"/>
          <textarea v-model="form.workItem" rows="3" required placeholder="工作内容（workItem）"/>
          <input v-model="form.zentaoNo" placeholder="禅道编号（zentaoNo）"/>
          <input v-model.number="form.personDay" type="number" step="0.1" min="0" required placeholder="人天（personDay）"/>
          <input v-model.number="form.overtimeHours" type="number" step="0.5" min="0" placeholder="加班时长（overtimeHours）"/>
          <textarea v-model="form.remark" rows="2" placeholder="备注（remark）"/>

          <div class="dialog-actions">
            <button type="button" class="ghost-btn" @click="closeDialog">取消</button>
            <button type="submit" class="action-btn" :disabled="submitting">
              {{ dialogMode === 'create' ? '保存' : '更新' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import {computed, onMounted, reactive, ref, watch} from 'vue'
import {useRouter} from 'vue-router'
import {
  createWorkLog,
  deleteWorkLog,
  getWorkLogDetail,
  listWorkLogs,
  updateWorkLog
} from '@/api/workLog'

const WEEK_TEXT = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function formatDate(date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDate(text) {
  return new Date(`${text}T00:00:00`)
}

function getWeekMonday(date) {
  const current = new Date(date)
  const day = current.getDay()
  const diff = day === 0 ? -6 : 1 - day
  current.setDate(current.getDate() + diff)
  current.setHours(0, 0, 0, 0)
  return current
}

function unwrapData(res) {
  const payload = res?.data
  if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data
  }
  return payload
}

function normalizeLog(item) {
  return {
    id: item?.id,
    userId: item?.userId,
    logDate: item?.logDate,
    typeCodes: Array.isArray(item?.typeCodes) ? item.typeCodes : [],
    location: item?.location || '',
    projectCode: item?.projectCode || '',
    workItem: item?.workItem || '',
    zentaoNo: item?.zentaoNo || '',
    personDay: item?.personDay,
    overtimeHours: item?.overtimeHours ?? 0,
    remark: item?.remark || ''
  }
}

function joinUniqueValues(values) {
  const set = new Set(values.filter(Boolean))
  return set.size ? Array.from(set).join('、') : '-'
}

function joinUniqueZentao(values) {
  const result = []
  values.forEach((value) => {
    if (!value) {
      return
    }
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => result.push(item))
  })
  return joinUniqueValues(result)
}

function shortText(text, maxLength = 40) {
  if (!text || text.length <= maxLength) {
    return text || '-'
  }
  return `${text.slice(0, maxLength)}...`
}

export default {
  name: 'WorkLog',
  setup() {
    const router = useRouter()
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
    const currentUserId = currentUser.id || currentUser.userId || currentUser.userid || ''

    const loading = ref(false)
    const submitting = ref(false)
    const weekOffset = ref(0)

    const selectedDate = ref(formatDate(new Date()))
    const detailDate = ref(formatDate(new Date()))
    const selectedLogId = ref(null)

    const showDayDetail = ref(false)
    const showYearList = ref(false)
    const showDialog = ref(false)
    const dialogMode = ref('create')

    const weeklyLogs = ref([])
    const detailDayLogs = ref([])
    const yearLogs = ref([])

    const yearFilter = ref(new Date().getFullYear())

    const typeOptions = [
      {value: 'NORMAL', label: '正常工作'},
      {value: 'LEAVE', label: '请假'},
      {value: 'BUSINESS_TRIP', label: '出差'},
      {value: 'SICK_LEAVE', label: '病假'},
      {value: 'OTHER', label: '其他'}
    ]

    const typeLabelMap = typeOptions.reduce((result, item) => {
      result[item.value] = item.label
      return result
    }, {})

    const form = reactive({
      id: null,
      logDate: formatDate(new Date()),
      typeCodes: [],
      location: '',
      projectCode: '',
      workItem: '',
      zentaoNo: '',
      personDay: 1,
      overtimeHours: 0,
      remark: ''
    })

    const weekDays = computed(() => {
      const today = new Date()
      today.setDate(today.getDate() + weekOffset.value * 7)
      const monday = getWeekMonday(today)
      const list = []
      for (let index = 0; index < 7; index += 1) {
        const current = new Date(monday)
        current.setDate(monday.getDate() + index)
        list.push({
          date: formatDate(current),
          weekLabel: WEEK_TEXT[current.getDay()]
        })
      }
      return list
    })

    const logsGroupedByDate = computed(() => {
      return weeklyLogs.value.reduce((grouped, item) => {
        if (!grouped[item.logDate]) {
          grouped[item.logDate] = []
        }
        grouped[item.logDate].push(item)
        return grouped
      }, {})
    })

    const daySummaryMap = computed(() => {
      const summary = {}
      weekDays.value.forEach((day) => {
        const list = logsGroupedByDate.value[day.date] || []
        const typeCodes = list.flatMap((item) => item.typeCodes || [])
        const projects = list.map((item) => item.projectCode)
        const workItems = list.map((item) => item.workItem)
        const zentaoNos = list.map((item) => item.zentaoNo)
        const personDayTotal = list
          .reduce((total, item) => total + (Number(item.personDay) || 0), 0)
          .toFixed(1)

        summary[day.date] = {
          count: list.length,
          typesText: formatTypeCodes(Array.from(new Set(typeCodes))),
          projectsText: joinUniqueValues(projects),
          zentaoText: joinUniqueZentao(zentaoNos),
          workItemsText: shortText(joinUniqueValues(workItems), 44),
          personDayTotal
        }
      })
      return summary
    })

    const selectedLog = computed(() => {
      return yearLogs.value.concat(detailDayLogs.value, weeklyLogs.value).find((item) => item.id === selectedLogId.value) || null
    })

    const yearOptions = computed(() => {
      const yearSet = new Set([new Date().getFullYear()])
      yearLogs.value.forEach((item) => yearSet.add(Number(item.logDate?.slice(0, 4))))
      return Array.from(yearSet).sort((a, b) => b - a)
    })

    const formatTypeCodes = (codes) => {
      if (!codes || !codes.length) {
        return '-'
      }
      return codes.map((code) => typeLabelMap[code] || code).join('、')
    }

    const fetchWeeklyLogs = async () => {
      if (!currentUserId) {
        return
      }
      loading.value = true
      try {
        const res = await listWorkLogs({
          userId: currentUserId,
          startDate: weekDays.value[0].date,
          endDate: weekDays.value[6].date
        })
        const data = unwrapData(res)
        const list = Array.isArray(data) ? data : []
        weeklyLogs.value = list.map(normalizeLog)
      } catch (error) {
        console.error(error)
        alert('加载当周日志失败，请检查后端服务')
      } finally {
        loading.value = false
      }
    }

    const fetchDayDetails = async (date) => {
      if (!currentUserId) {
        return
      }
      try {
        const res = await listWorkLogs({
          userId: currentUserId,
          startDate: date,
          endDate: date
        })
        const data = unwrapData(res)
        const list = Array.isArray(data) ? data : []
        detailDayLogs.value = list.map(normalizeLog)
      } catch (error) {
        console.error(error)
        alert('加载每日详情失败')
      }
    }

    const fetchYearLogs = async () => {
      if (!currentUserId) {
        return
      }
      try {
        const startDate = `${yearFilter.value}-01-01`
        const endDate = `${yearFilter.value}-12-31`
        const res = await listWorkLogs({
          userId: currentUserId,
          startDate,
          endDate
        })
        const data = unwrapData(res)
        const list = Array.isArray(data) ? data : []
        yearLogs.value = list
          .map(normalizeLog)
          .sort((a, b) => parseDate(b.logDate) - parseDate(a.logDate))
      } catch (error) {
        console.error(error)
        alert('加载年度日志失败')
      }
    }

    const resetForm = () => {
      form.id = null
      form.logDate = selectedDate.value
      form.typeCodes = []
      form.location = ''
      form.projectCode = ''
      form.workItem = ''
      form.zentaoNo = ''
      form.personDay = 1
      form.overtimeHours = 0
      form.remark = ''
    }

    const selectDay = (date) => {
      selectedDate.value = date
    }

    const openDayDetail = async (date) => {
      detailDate.value = date
      selectedDate.value = date
      selectedLogId.value = null
      showDayDetail.value = true
      await fetchDayDetails(date)
    }

    const selectLog = (log) => {
      selectedLogId.value = log.id
      selectedDate.value = log.logDate
    }

    const changeWeek = async (delta) => {
      weekOffset.value += delta
      showDayDetail.value = false
      selectedLogId.value = null
      selectedDate.value = weekDays.value[0].date
      await fetchWeeklyLogs()
    }

    const toggleYearList = async () => {
      showYearList.value = !showYearList.value
      if (showYearList.value) {
        await fetchYearLogs()
      }
    }

    const openCreateDialog = () => {
      dialogMode.value = 'create'
      resetForm()
      showDialog.value = true
    }

    const openEditDialog = async (targetLog) => {
      const pickedLog = targetLog || selectedLog.value
      if (!pickedLog) {
        alert('请先在列表中选择一条日志')
        return
      }
      selectedLogId.value = pickedLog.id

      try {
        const res = await getWorkLogDetail(pickedLog.id)
        const detail = normalizeLog(unwrapData(res) || {})
        dialogMode.value = 'edit'
        form.id = detail.id
        form.logDate = detail.logDate
        form.typeCodes = [...detail.typeCodes]
        form.location = detail.location
        form.projectCode = detail.projectCode
        form.workItem = detail.workItem
        form.zentaoNo = detail.zentaoNo
        form.personDay = detail.personDay ?? 1
        form.overtimeHours = detail.overtimeHours ?? 0
        form.remark = detail.remark
        showDialog.value = true
      } catch (error) {
        console.error(error)
        alert('读取日志详情失败')
      }
    }

    const closeDialog = () => {
      showDialog.value = false
    }

    const submitDialog = async () => {
      if (!form.typeCodes.length) {
        alert('请至少选择一个日志类型')
        return
      }

      const payload = {
        logDate: form.logDate,
        typeCodes: [...form.typeCodes],
        location: form.location,
        projectCode: form.projectCode,
        workItem: form.workItem,
        zentaoNo: form.zentaoNo,
        personDay: Number(form.personDay),
        overtimeHours: Number(form.overtimeHours),
        remark: form.remark
      }

      submitting.value = true
      try {
        if (dialogMode.value === 'create') {
          await createWorkLog({
            userId: Number(currentUserId),
            ...payload
          })
        } else {
          await updateWorkLog(form.id, payload)
        }

        showDialog.value = false
        await fetchWeeklyLogs()
        if (showDayDetail.value) {
          await fetchDayDetails(detailDate.value)
        }
        if (showYearList.value) {
          await fetchYearLogs()
        }
      } catch (error) {
        console.error(error)
        alert(dialogMode.value === 'create' ? '新增日志失败' : '更新日志失败')
      } finally {
        submitting.value = false
      }
    }

    const deleteSelectedLog = async () => {
      if (!selectedLog.value) {
        alert('请先在列表中选择一条日志')
        return
      }
      const confirmed = window.confirm('确认删除当前日志吗？')
      if (!confirmed) {
        return
      }

      try {
        await deleteWorkLog(selectedLog.value.id)
        selectedLogId.value = null
        await fetchWeeklyLogs()
        if (showDayDetail.value) {
          await fetchDayDetails(detailDate.value)
        }
        if (showYearList.value) {
          await fetchYearLogs()
        }
      } catch (error) {
        console.error(error)
        alert('删除日志失败')
      }
    }

    const goBack = () => {
      router.push('/home')
    }

    watch(yearFilter, async () => {
      if (showYearList.value) {
        await fetchYearLogs()
      }
    })

    onMounted(async () => {
      if (!currentUserId) {
        alert('未获取到当前登录用户，请重新登录')
        return
      }
      await fetchWeeklyLogs()
    })

    return {
      loading,
      submitting,
      weekDays,
      daySummaryMap,
      selectedDate,
      detailDate,
      detailDayLogs,
      selectedLog,
      showDayDetail,
      showYearList,
      showDialog,
      dialogMode,
      typeOptions,
      yearFilter,
      yearOptions,
      yearLogs,
      form,
      formatTypeCodes,
      selectDay,
      openDayDetail,
      selectLog,
      changeWeek,
      toggleYearList,
      openCreateDialog,
      openEditDialog,
      closeDialog,
      submitDialog,
      deleteSelectedLog,
      goBack
    }
  }
}
</script>

<style scoped>
.work-log-page {
  min-height: 100vh;
  color: #fff;
  padding: 20px;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.page-title {
  margin: 20px 0 10px;
  font-size: 26px;
}

.week-title {
  margin-bottom: 14px;
  color: #c7ecea;
  font-size: 14px;
}

.action-btn,
.ghost-btn {
  border: none;
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
}

.action-btn {
  background: #20b2aa;
  color: #fff;
}

.action-btn:disabled {
  background: #678;
  cursor: not-allowed;
}

.ghost-btn {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.danger {
  background: #c62828;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(150px, 1fr));
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 10px;
}

.day-card {
  min-height: 206px;
  border-radius: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
}

.day-card.active {
  border-color: #20b2aa;
  box-shadow: 0 0 0 1px #20b2aa inset;
}

.day-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
}

.summary-wrap {
  font-size: 13px;
}

.summary-line {
  margin: 6px 0;
  line-height: 1.4;
}

.summary-extra {
  margin-top: 10px;
  color: #b2dfdb;
}

.empty-text {
  opacity: 0.75;
  font-size: 13px;
  margin-top: 6px;
}

.detail-panel {
  margin-top: 18px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 14px;
}

.panel-title {
  margin: 0;
  font-size: 18px;
}

.year-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.year-select {
  border: none;
  border-radius: 8px;
  padding: 8px;
}

.detail-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 10px;
}

.detail-item {
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.25);
  padding: 10px;
  cursor: pointer;
}

.detail-item p {
  margin: 4px 0;
  font-size: 13px;
}

.detail-item.selected {
  outline: 1px solid #20b2aa;
}

.table-wrap {
  overflow-x: auto;
}

.log-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 900px;
}

.log-table th,
.log-table td {
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding: 8px;
  text-align: left;
  font-size: 13px;
}

.log-table tbody tr {
  cursor: pointer;
}

.selectedRow {
  background: rgba(32, 178, 170, 0.25);
}

.dialog-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.dialog {
  width: 100%;
  max-width: 560px;
  border-radius: 12px;
  background: #0b1720;
  padding: 16px;
}

.dialog h3 {
  margin: 0 0 12px;
}

.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dialog-form input,
.dialog-form textarea {
  border: none;
  border-radius: 8px;
  padding: 10px;
  font-size: 14px;
}

.type-group {
  border-radius: 8px;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.1);
}

.type-title {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
}

.type-item {
  margin-right: 12px;
  font-size: 13px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 2px;
}

@media (max-width: 768px) {
  .calendar-grid {
    grid-template-columns: repeat(2, minmax(140px, 1fr));
  }

  .actions {
    width: 100%;
  }
}
</style>
