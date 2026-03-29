<template>
  <div class="work-log-page">
    <div class="page-nav">
      <button type="button" class="back-home-btn" @click="goBack">
        <span class="back-home-icon">←</span>
        <span>返回桌面</span>
      </button>
    </div>

    <div class="hero-panel">
      <div>
        <h1 class="page-title">工作日志</h1>
        <p class="page-subtitle">按周查看与维护日志，类型、地点和项目优先使用数据字典配置，周视图同步展示本周统计。</p>
      </div>
      <div class="hero-tags">
        <span class="hero-tag">当前周 {{ weekDays[0]?.date }} - {{ weekDays[6]?.date }}</span>
        <span class="hero-tag">{{ showYearList ? '已展开年度列表' : '周视图' }}</span>
        <span class="hero-tag">{{ dictionarySourceText }}</span>
      </div>
    </div>

    <section class="week-stats-panel">
      <div class="panel-head">
        <div>
          <h2 class="panel-title">本周统计</h2>
          <p class="panel-tip">汇总当前周参与项目、状态、人天和加班情况，切换周次后会自动刷新。</p>
        </div>
      </div>

      <div class="week-stats-grid">
        <article class="stats-card stats-card-wide">
          <span class="stats-label">参与项目</span>
          <div v-if="weeklyStats.projects.length" class="stats-chip-row">
            <span v-for="project in weeklyStats.projects" :key="project" class="stats-chip">{{ project }}</span>
          </div>
          <strong v-else class="stats-empty">暂无项目</strong>
        </article>

        <article class="stats-card stats-card-wide">
          <span class="stats-label">当前状态</span>
          <div v-if="weeklyStats.statuses.length" class="stats-chip-row">
            <span v-for="status in weeklyStats.statuses" :key="status" class="stats-chip status-chip">{{ status }}</span>
          </div>
          <strong v-else class="stats-empty">暂无状态</strong>
        </article>

        <article class="stats-card">
          <span class="stats-label">人天总计</span>
          <strong>{{ formatPersonDayText(weeklyStats.personDayTotal) }}</strong>
          <small>{{ weeklyStats.workDays }} 天有记录</small>
        </article>

        <article class="stats-card">
          <span class="stats-label">加班总计</span>
          <strong>{{ formatHoursText(weeklyStats.overtimeHoursTotal) }}</strong>
          <small>{{ weeklyStats.weekendLogCount }} 条周末记录</small>
        </article>

        <article class="stats-card">
          <span class="stats-label">日志条数</span>
          <strong>{{ weeklyStats.logCount }}</strong>
          <small>{{ weeklyStats.locations.length ? `${weeklyStats.locations.length} 个地点` : '暂无地点' }}</small>
        </article>
      </div>
    </section>

    <div class="top-bar">
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
          <div class="summary-chip-row">
            <span v-for="type in daySummaryMap[day.date].typeLabels" :key="`${day.date}-${type}`" class="summary-chip">{{ type }}</span>
          </div>
          <p class="summary-projects">{{ daySummaryMap[day.date].projectsText }}</p>
          <p class="summary-work">{{ daySummaryMap[day.date].workItemsText }}</p>
          <div class="summary-foot">
            <span>{{ formatPersonDayText(daySummaryMap[day.date].personDayTotal) }}</span>
            <span>{{ formatHoursText(daySummaryMap[day.date].overtimeHoursTotal) }}</span>
            <span>{{ daySummaryMap[day.date].count }} 条</span>
          </div>
        </div>

        <div v-else class="empty-text">暂无日志</div>
      </div>
    </div>

    <div v-if="showDayDetail" class="detail-panel">
      <div class="detail-panel-head">
        <h2 class="panel-title">{{ detailDate }} 日志详情</h2>
        <span class="panel-tip">双击周卡片可展开当天日志；当前按每天一条日志维护，保存后会自动定位到对应日期。</span>
      </div>

      <div v-if="detailDayLogs.length" class="detail-list">
        <article
          v-for="item in detailDayLogs"
          :key="item.id"
          class="detail-item"
          :class="{selected: selectedLog && selectedLog.id === item.id}"
          @click="selectLog(item)"
          @dblclick="openEditDialog(item)"
        >
          <div class="detail-item-head">
            <strong>{{ item.logDate }}</strong>
            <div class="detail-type-row">
              <span v-for="type in formatTypeCodeList(item.typeCodes)" :key="`${item.id}-${type}`" class="detail-type-chip">{{ type }}</span>
            </div>
          </div>

          <div class="detail-meta-row">
            <span v-if="item.location">{{ formatLocationText(item.location) }}</span>
            <span v-if="item.projectCode">{{ formatProjectText(item.projectCode) }}</span>
            <span v-if="item.zentaoNo">{{ item.zentaoNo }}</span>
          </div>

          <p class="detail-work">{{ item.workItem || '-' }}</p>

          <div class="detail-foot-row">
            <span>{{ formatPersonDayText(item.personDay) }}</span>
            <span>{{ formatHoursText(item.overtimeHours) }}</span>
            <span v-if="item.remark">{{ item.remark }}</span>
          </div>
        </article>
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

      <div v-if="yearLogs.length" class="table-wrap desktop-year-table">
        <table class="log-table">
          <thead>
          <tr>
            <th>日期</th>
            <th>状态</th>
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
            <td>{{ formatLocationText(item.location) }}</td>
            <td>{{ formatProjectText(item.projectCode) }}</td>
            <td>{{ item.workItem || '-' }}</td>
            <td>{{ item.zentaoNo || '-' }}</td>
            <td>{{ formatPersonDayText(item.personDay) }}</td>
            <td>{{ formatHoursText(item.overtimeHours) }}</td>
            <td>{{ item.remark || '-' }}</td>
          </tr>
          </tbody>
        </table>
      </div>

      <div v-if="yearLogs.length" class="mobile-year-list">
        <article
          v-for="item in yearLogs"
          :key="item.id"
          class="mobile-log-card"
          :class="{selectedMobileCard: selectedLog && selectedLog.id === item.id}"
          @click="selectLog(item)"
          @dblclick="openEditDialog(item)"
        >
          <div class="mobile-log-head">
            <strong class="mobile-log-date">{{ item.logDate }}</strong>
            <span class="mobile-log-tag">{{ formatTypeCodes(item.typeCodes) }}</span>
          </div>
          <div class="mobile-log-meta">
            <span v-if="item.location">{{ formatLocationText(item.location) }}</span>
            <span v-if="item.projectCode">{{ formatProjectText(item.projectCode) }}</span>
            <span v-if="item.zentaoNo">{{ item.zentaoNo }}</span>
          </div>
          <p class="mobile-log-work">{{ item.workItem || '-' }}</p>
          <div class="mobile-log-foot">
            <span>{{ formatPersonDayText(item.personDay) }}</span>
            <span>{{ formatHoursText(item.overtimeHours) }}</span>
            <span v-if="item.remark">{{ item.remark }}</span>
          </div>
        </article>
      </div>
      <div v-else class="empty-text">{{ yearFilter }} 年暂无日志</div>
    </div>

    <div v-if="showDialog" class="dialog-mask" @click.self="closeDialog">
      <div class="dialog">
        <h3>{{ dialogMode === 'create' ? '新增工作日志' : '修改工作日志' }}</h3>

        <form class="dialog-form" @submit.prevent="submitDialog">
          <div class="form-inline-grid">
            <label class="form-field">
              <span>日期</span>
              <input v-model="form.logDate" type="date" required />
            </label>

            <label class="form-field">
              <span>人天</span>
              <input v-model.number="form.personDay" type="number" step="0.1" min="0" required placeholder="例如：1" />
            </label>
          </div>

          <div class="form-field">
            <span>日志类型</span>
            <div class="multi-select" :class="{open: showTypeDropdown}">
              <button type="button" class="multi-select-trigger" @click="toggleTypeDropdown">
                <span>{{ selectedTypeText }}</span>
                <strong>{{ showTypeDropdown ? '收起' : '展开' }}</strong>
              </button>

              <div v-if="showTypeDropdown" class="multi-select-panel" @click.stop>
                <div class="multi-select-actions">
                  <button type="button" class="mini-link" @click="selectAllTypes">全选</button>
                  <button type="button" class="mini-link" @click="clearTypes">清空</button>
                </div>

                <div class="multi-option-grid">
                  <label
                    v-for="item in typeOptions"
                    :key="item.value"
                    class="multi-option"
                    :class="{checked: form.typeCodes.includes(item.value)}"
                  >
                    <input v-model="form.typeCodes" class="multi-option-input" type="checkbox" :value="item.value" />
                    <span class="multi-option-check" aria-hidden="true">
                      <span class="multi-option-checkmark" />
                    </span>
                    <span class="multi-option-label">{{ item.label }}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div class="selected-type-row">
            <span v-for="item in selectedTypeOptions" :key="item.value" class="selected-type-chip">{{ item.label }}</span>
            <span v-if="!selectedTypeOptions.length" class="selected-type-empty">请选择至少一个日志类型</span>
          </div>

          <div class="form-inline-grid">
            <label class="form-field">
              <span>地点</span>
              <select v-model="form.location" :disabled="!locationSelectOptions.length">
                <option value="">{{ locationSelectOptions.length ? '请选择地点' : '暂无地点字典项' }}</option>
                <option v-for="item in locationSelectOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
            </label>

            <label class="form-field">
              <span>所属项目</span>
              <select v-model="form.projectCode" :disabled="!projectSelectOptions.length">
                <option value="">{{ projectSelectOptions.length ? '请选择项目' : '暂无项目字典项' }}</option>
                <option v-for="item in projectSelectOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
            </label>
          </div>

          <label class="form-field">
            <span>工作内容</span>
            <textarea v-model.trim="form.workItem" rows="4" required placeholder="填写当天的工作内容、处理结果或跟进结论" />
          </label>

          <div class="form-inline-grid">
            <label class="form-field">
              <span>禅道编号</span>
              <input v-model.trim="form.zentaoNo" maxlength="255" placeholder="多个编号可用逗号分隔" />
            </label>

            <label class="form-field" v-if="isWeekendFormDate">
              <span>加班时长</span>
              <input v-model.number="form.manualOvertimeHours" type="number" step="0.5" min="0" placeholder="周末可手动填写" />
            </label>

            <template v-else>
              <label class="form-field">
                <span>实际下班时间</span>
                <input v-model="form.offWorkTime" type="time" step="60" />
              </label>

              <label class="form-field readonly-field">
                <span>自动统计加班</span>
                <div class="readonly-value">{{ formatHoursText(calculatedOvertimeHours) }}</div>
              </label>
            </template>
          </div>

          <label class="form-field">
            <span>备注</span>
            <textarea v-model.trim="form.remark" rows="2" maxlength="500" placeholder="补充记录边界、风险、同步事项等" />
          </label>

          <div class="dialog-actions">
            <button type="button" class="ghost-btn" @click="closeDialog">取消</button>
            <button type="submit" class="action-btn" :disabled="submitting">
              {{ submitting ? '提交中...' : (dialogMode === 'create' ? '保存' : '更新') }}
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
import {listDataDictionaryOptionsByUsage} from '@/api/dataDictionary'
import {
  createWorkLog,
  deleteWorkLog,
  getWorkLogDetail,
  getWeeklyBrief,
  listWorkLogs,
  updateWorkLog
} from '@/api/workLog'

const WEEK_TEXT = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const STANDARD_OFF_WORK_TIME = '18:00'
const WORK_LOG_APP_CODE = 'APP_WORK_LOG'
const WORK_LOG_MODULE_CODE = 'WORK_LOG'
const TYPE_FIELD_CODE = 'typeCodes'
const LOCATION_FIELD_CODE = 'location'
const PROJECT_FIELD_CODE = 'projectCode'
const DEFAULT_TYPE_OPTIONS = [
  {itemCode: 'normal', label: '正常工作', value: 'NORMAL', isDefault: true, sortNo: 1},
  {itemCode: 'leave', label: '请假', value: 'LEAVE', isDefault: false, sortNo: 2},
  {itemCode: 'business_trip', label: '出差', value: 'BUSINESS_TRIP', isDefault: false, sortNo: 3},
  {itemCode: 'sick_leave', label: '病假', value: 'SICK_LEAVE', isDefault: false, sortNo: 4},
  {itemCode: 'other', label: '其他', value: 'OTHER', isDefault: false, sortNo: 5}
]

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

function getWeekOffsetByDate(logDate) {
  if (!logDate) {
    return 0
  }
  const todayMonday = getWeekMonday(new Date())
  const targetMonday = getWeekMonday(parseDate(logDate))
  const diffTime = targetMonday.getTime() - todayMonday.getTime()
  return Math.round(diffTime / (7 * 24 * 60 * 60 * 1000))
}

function toSafeIdText(value) {
  if (value === null || value === undefined) {
    return ''
  }
  return String(value).trim()
}

function resolveLegacyRoundedUserId(userId) {
  const normalized = toSafeIdText(userId)
  if (!/^\d+$/.test(normalized)) {
    return ''
  }
  const rounded = String(Number(normalized))
  return rounded && rounded !== normalized ? rounded : ''
}

function unwrapData(res) {
  const payload = res?.data
  if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data
  }
  return payload
}

function toNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function formatDecimal(value, digits = 2) {
  return `${Number(toNumber(value, 0).toFixed(digits))}`
}

function normalizeTypeCodes(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean)
  }
  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim()).filter(Boolean)
  }
  return []
}

function normalizeTimeValue(value) {
  if (!value) {
    return ''
  }
  const text = String(value).trim()
  const matched = text.match(/(\d{1,2}):(\d{2})/)
  if (!matched) {
    return ''
  }
  const hours = matched[1].padStart(2, '0')
  const minutes = matched[2]
  return `${hours}:${minutes}`
}

function formatBackendOffWorkTime(value) {
  const normalized = normalizeTimeValue(value)
  return normalized ? `${normalized}:00` : null
}

function minutesFromTime(value) {
  const matched = normalizeTimeValue(value).match(/^(\d{2}):(\d{2})$/)
  if (!matched) {
    return null
  }
  return Number(matched[1]) * 60 + Number(matched[2])
}

function timeFromMinutes(value) {
  const safeMinutes = Math.max(0, Number(value) || 0)
  const hours = `${Math.floor(safeMinutes / 60)}`.padStart(2, '0')
  const minutes = `${safeMinutes % 60}`.padStart(2, '0')
  return `${hours}:${minutes}`
}

function isWeekendDate(logDate) {
  if (!logDate) {
    return false
  }
  const day = parseDate(logDate).getDay()
  return day === 0 || day === 6
}

function calculateWeekdayOvertimeHours(offWorkTime) {
  const offMinutes = minutesFromTime(offWorkTime)
  const standardMinutes = minutesFromTime(STANDARD_OFF_WORK_TIME)
  if (offMinutes == null || standardMinutes == null || offMinutes <= standardMinutes) {
    return 0
  }
  return Number(((offMinutes - standardMinutes) / 60).toFixed(2))
}

function deriveOffWorkTimeFromHours(overtimeHours) {
  const standardMinutes = minutesFromTime(STANDARD_OFF_WORK_TIME)
  const overtimeMinutes = Math.max(0, Math.round(toNumber(overtimeHours, 0) * 60))
  return timeFromMinutes(standardMinutes + overtimeMinutes)
}

function normalizeDictionaryOptions(payload) {
  if (!Array.isArray(payload)) {
    return []
  }
  return payload
    .map((item) => ({
      itemCode: item?.itemCode || item?.code || item?.value || '',
      label: item?.itemLabel || item?.label || item?.itemValue || item?.value || '',
      value: item?.itemValue || item?.value || item?.itemCode || item?.code || '',
      isDefault: Boolean(item?.isDefault),
      sortNo: toNumber(item?.sortNo ?? item?.sort ?? 0, 0)
    }))
    .filter((item) => item.label && item.value)
    .sort((prev, next) => prev.sortNo - next.sortNo || `${prev.label}`.localeCompare(`${next.label}`))
}

function buildFallbackOptions(values = []) {
  const uniqueValues = Array.from(new Set(values.filter(Boolean)))
  return uniqueValues.map((item, index) => ({
    itemCode: item,
    label: item,
    value: item,
    isDefault: index === 0,
    sortNo: index + 1
  }))
}

function normalizeSelectedValue(options, value, fallback = '') {
  if (!value) {
    return fallback
  }
  const matched = options.find((item) => item.value === value || item.label === value || item.itemCode === value)
  return matched?.value || fallback
}

function normalizeLog(item) {
  const logDate = item?.logDate || ''
  const overtimeHours = toNumber(item?.overtimeHours, 0)
  const offWorkTime = normalizeTimeValue(item?.offWorkTime || item?.actualOffWorkTime || item?.leaveTime || '')

  return {
    id: item?.id,
    userId: item?.userId,
    logDate,
    typeCodes: normalizeTypeCodes(item?.typeCodes),
    location: item?.location || '',
    projectCode: item?.projectCode || '',
    workItem: item?.workItem || item?.content || item?.brief || '',
    zentaoNo: item?.zentaoNo || '',
    personDay: toNumber(item?.personDay, 1),
    overtimeHours,
    offWorkTime: isWeekendDate(logDate) ? '' : (offWorkTime || deriveOffWorkTimeFromHours(overtimeHours)),
    remark: item?.remark || ''
  }
}

function shortText(text, maxLength = 44) {
  if (!text || text.length <= maxLength) {
    return text || '-'
  }
  return `${text.slice(0, maxLength)}...`
}

function joinUniqueValues(values) {
  const set = new Set(values.filter(Boolean))
  return set.size ? Array.from(set).join('、') : '-'
}

export default {
  name: 'WorkLog',
  setup() {
    const router = useRouter()
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
    const currentUserId = toSafeIdText(currentUser.id || currentUser.userId || currentUser.userid || '')
    const legacyRoundedUserId = resolveLegacyRoundedUserId(currentUserId)

    const loading = ref(false)
    const submitting = ref(false)
    const dictLoading = ref(false)
    const weekOffset = ref(0)

    const selectedDate = ref(formatDate(new Date()))
    const detailDate = ref(formatDate(new Date()))
    const selectedLogId = ref(null)

    const showDayDetail = ref(false)
    const showYearList = ref(false)
    const showDialog = ref(false)
    const dialogMode = ref('create')
    const showTypeDropdown = ref(false)

    const weeklyLogs = ref([])
    const detailDayLogs = ref([])
    const yearLogs = ref([])

    const yearFilter = ref(new Date().getFullYear())

    const typeOptions = ref([...DEFAULT_TYPE_OPTIONS])
    const projectOptions = ref([])
    const locationOptions = ref([])

    const form = reactive({
      id: null,
      logDate: formatDate(new Date()),
      typeCodes: [],
      location: '',
      projectCode: '',
      workItem: '',
      zentaoNo: '',
      personDay: 1,
      offWorkTime: STANDARD_OFF_WORK_TIME,
      manualOvertimeHours: 0,
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

    const knownLogs = computed(() => {
      const map = new Map()
      ;[...weeklyLogs.value, ...detailDayLogs.value, ...yearLogs.value].forEach((item) => {
        if (item?.id != null && !map.has(item.id)) {
          map.set(item.id, item)
        }
      })
      return Array.from(map.values())
    })

    const fallbackProjectOptions = computed(() => buildFallbackOptions(knownLogs.value.map((item) => item.projectCode)))
    const fallbackLocationOptions = computed(() => buildFallbackOptions(knownLogs.value.map((item) => item.location)))

    const projectSelectOptions = computed(() => projectOptions.value.length ? projectOptions.value : fallbackProjectOptions.value)
    const locationSelectOptions = computed(() => locationOptions.value.length ? locationOptions.value : fallbackLocationOptions.value)

    const dictionarySourceText = computed(() => {
      if (dictLoading.value) {
        return '字典加载中'
      }
      if (locationOptions.value.length || projectOptions.value.length || typeOptions.value.length) {
        return '字典选项已同步'
      }
      return '字典未就绪'
    })

    const typeLabelMap = computed(() => typeOptions.value.reduce((result, item) => {
      result[item.value] = item.label
      result[item.itemCode] = item.label
      result[item.label] = item.label
      return result
    }, {}))

    const logsGroupedByDate = computed(() => {
      return weeklyLogs.value.reduce((grouped, item) => {
        if (!grouped[item.logDate]) {
          grouped[item.logDate] = []
        }
        grouped[item.logDate].push(item)
        return grouped
      }, {})
    })

    const weeklyStats = computed(() => {
      const projects = Array.from(new Set(weeklyLogs.value.map((item) => formatProjectText(item.projectCode)).filter((item) => item && item !== '-')))
      const statuses = Array.from(new Set(weeklyLogs.value.flatMap((item) => formatTypeCodeList(item.typeCodes)).filter(Boolean)))
      const locations = Array.from(new Set(weeklyLogs.value.map((item) => formatLocationText(item.location)).filter((item) => item && item !== '-')))
      const workDays = new Set(weeklyLogs.value.map((item) => item.logDate).filter(Boolean)).size
      const personDayTotal = weeklyLogs.value.reduce((total, item) => total + toNumber(item.personDay, 0), 0)
      const overtimeHoursTotal = weeklyLogs.value.reduce((total, item) => total + toNumber(item.overtimeHours, 0), 0)

      return {
        projects,
        statuses,
        locations,
        workDays,
        personDayTotal,
        overtimeHoursTotal,
        logCount: weeklyLogs.value.length,
        weekendLogCount: weeklyLogs.value.filter((item) => isWeekendDate(item.logDate)).length
      }
    })

    const daySummaryMap = computed(() => {
      const summary = {}
      weekDays.value.forEach((day) => {
        const list = logsGroupedByDate.value[day.date] || []
        const typeLabels = Array.from(new Set(list.flatMap((item) => formatTypeCodeList(item.typeCodes)).filter(Boolean)))
        const projectsText = joinUniqueValues(list.map((item) => formatProjectText(item.projectCode)).filter((item) => item && item !== '-'))
        const workItemsText = shortText(joinUniqueValues(list.map((item) => item.workItem)))
        const personDayTotal = list.reduce((total, item) => total + toNumber(item.personDay, 0), 0)
        const overtimeHoursTotal = list.reduce((total, item) => total + toNumber(item.overtimeHours, 0), 0)

        summary[day.date] = {
          count: list.length,
          typeLabels,
          projectsText,
          workItemsText,
          personDayTotal,
          overtimeHoursTotal
        }
      })
      return summary
    })

    const selectedLog = computed(() => knownLogs.value.find((item) => item.id === selectedLogId.value) || null)

    const yearOptions = computed(() => {
      const yearSet = new Set([new Date().getFullYear()])
      knownLogs.value.forEach((item) => {
        if (item.logDate) {
          yearSet.add(Number(item.logDate.slice(0, 4)))
        }
      })
      return Array.from(yearSet).sort((a, b) => b - a)
    })

    const isWeekendFormDate = computed(() => isWeekendDate(form.logDate))
    const calculatedOvertimeHours = computed(() => {
      if (isWeekendFormDate.value) {
        return toNumber(form.manualOvertimeHours, 0)
      }
      return calculateWeekdayOvertimeHours(form.offWorkTime)
    })

    const selectedTypeOptions = computed(() => typeOptions.value.filter((item) => form.typeCodes.includes(item.value)))
    const selectedTypeText = computed(() => {
      if (!selectedTypeOptions.value.length) {
        return '请选择日志类型'
      }
      return selectedTypeOptions.value.map((item) => item.label).join('、')
    })

    function formatTypeCodeList(codes) {
      const list = normalizeTypeCodes(codes)
      return list.map((code) => typeLabelMap.value[code] || code)
    }

    function formatTypeCodes(codes) {
      const list = formatTypeCodeList(codes)
      return list.length ? list.join('、') : '-'
    }

    function getOptionLabel(options, value, fallback = '-') {
      if (!value) {
        return fallback
      }
      const matched = options.find((item) => item.value === value || item.label === value || item.itemCode === value)
      return matched?.label || value || fallback
    }

    function formatProjectText(value) {
      return getOptionLabel(projectSelectOptions.value, value, '-')
    }

    function formatLocationText(value) {
      return getOptionLabel(locationSelectOptions.value, value, '-')
    }

    function formatPersonDayText(value) {
      return `${formatDecimal(value, 1)} 人天`
    }

    function formatHoursText(value) {
      return `${formatDecimal(value, 2)} h`
    }

    function mergeLogsByDate(logGroups = []) {
      const mergedMap = new Map()
      logGroups.flat().forEach((item) => {
        if (!item?.logDate) {
          return
        }
        if (!mergedMap.has(item.logDate) || toSafeIdText(item.userId) === currentUserId) {
          mergedMap.set(item.logDate, item)
        }
      })
      return Array.from(mergedMap.values())
    }

    async function requestLogsWithCompatibleUserIds(loader) {
      const userIds = Array.from(new Set([currentUserId, legacyRoundedUserId].filter(Boolean)))
      const responses = await Promise.all(userIds.map((userId) => loader(userId)))
      return mergeLogsByDate(responses)
    }

    function getDefaultOptionValue(options) {
      return options.find((item) => item.isDefault)?.value || options[0]?.value || ''
    }

    function applyFormOptionDefaults() {
      form.typeCodes = form.typeCodes.filter((value) => typeOptions.value.some((item) => item.value === value))
      if (!form.typeCodes.length && typeOptions.value.length) {
        form.typeCodes = [getDefaultOptionValue(typeOptions.value)]
      }
      form.projectCode = normalizeSelectedValue(projectSelectOptions.value, form.projectCode, form.projectCode || '')
      form.location = normalizeSelectedValue(locationSelectOptions.value, form.location, form.location || '')
    }

    async function loadDictionaryOptions() {
      dictLoading.value = true
      try {
        const [typeResult, projectResult, locationResult] = await Promise.allSettled([
          listDataDictionaryOptionsByUsage({
            appCode: WORK_LOG_APP_CODE,
            moduleCode: WORK_LOG_MODULE_CODE,
            bizFieldCode: TYPE_FIELD_CODE
          }),
          listDataDictionaryOptionsByUsage({
            appCode: WORK_LOG_APP_CODE,
            moduleCode: WORK_LOG_MODULE_CODE,
            bizFieldCode: PROJECT_FIELD_CODE
          }),
          listDataDictionaryOptionsByUsage({
            appCode: WORK_LOG_APP_CODE,
            moduleCode: WORK_LOG_MODULE_CODE,
            bizFieldCode: LOCATION_FIELD_CODE
          })
        ])

        typeOptions.value = typeResult.status === 'fulfilled'
          ? (normalizeDictionaryOptions(unwrapData(typeResult.value)).length
              ? normalizeDictionaryOptions(unwrapData(typeResult.value))
              : [...DEFAULT_TYPE_OPTIONS])
          : [...DEFAULT_TYPE_OPTIONS]

        projectOptions.value = projectResult.status === 'fulfilled'
          ? normalizeDictionaryOptions(unwrapData(projectResult.value))
          : []

        locationOptions.value = locationResult.status === 'fulfilled'
          ? normalizeDictionaryOptions(unwrapData(locationResult.value))
          : []

        applyFormOptionDefaults()
      } finally {
        dictLoading.value = false
      }
    }

    async function fetchWeeklyLogs() {
      if (!currentUserId) {
        return
      }
      loading.value = true
      try {
        const list = await requestLogsWithCompatibleUserIds(async (userId) => {
          const res = await getWeeklyBrief({
            userId,
            refDate: weekDays.value[0].date
          })
          const data = unwrapData(res)
          const rawList = Array.isArray(data) ? data : []
          return rawList.map(normalizeLog)
        })
        weeklyLogs.value = list.sort((prev, next) => parseDate(prev.logDate) - parseDate(next.logDate))
      } catch (error) {
        console.error(error)
        alert('加载当周日志失败，请检查后端服务')
      } finally {
        loading.value = false
      }
    }

    async function fetchDayDetails(date) {
      if (!currentUserId) {
        return []
      }
      try {
        const list = await requestLogsWithCompatibleUserIds((userId) => listWorkLogs({
          userId,
          startDate: date,
          endDate: date
        }).then((res) => {
          const data = unwrapData(res)
          const rawList = Array.isArray(data) ? data : []
          return rawList.map(normalizeLog)
        }))
        detailDayLogs.value = list.sort((prev, next) => parseDate(prev.logDate) - parseDate(next.logDate))
        return detailDayLogs.value
      } catch (error) {
        console.error(error)
        alert('加载每日详情失败')
        return []
      }
    }

    async function fetchYearLogs() {
      if (!currentUserId) {
        return
      }
      try {
        const list = await requestLogsWithCompatibleUserIds((userId) => listWorkLogs({
          userId,
          startDate: `${yearFilter.value}-01-01`,
          endDate: `${yearFilter.value}-12-31`
        }).then((res) => {
          const data = unwrapData(res)
          const rawList = Array.isArray(data) ? data : []
          return rawList.map(normalizeLog)
        }))
        yearLogs.value = list
          .sort((prev, next) => parseDate(next.logDate) - parseDate(prev.logDate))
      } catch (error) {
        console.error(error)
        alert('加载年度日志失败')
      }
    }

    function resetForm() {
      form.id = null
      form.logDate = selectedDate.value
      form.typeCodes = []
      form.location = getDefaultOptionValue(locationSelectOptions.value)
      form.projectCode = getDefaultOptionValue(projectSelectOptions.value)
      form.workItem = ''
      form.zentaoNo = ''
      form.personDay = 1
      form.offWorkTime = isWeekendDate(selectedDate.value) ? '' : STANDARD_OFF_WORK_TIME
      form.manualOvertimeHours = 0
      form.remark = ''
      applyFormOptionDefaults()
    }

    function fillForm(detail) {
      form.id = detail.id
      form.logDate = detail.logDate
      form.typeCodes = [...detail.typeCodes]
      form.location = detail.location
      form.projectCode = detail.projectCode
      form.workItem = detail.workItem
      form.zentaoNo = detail.zentaoNo
      form.personDay = detail.personDay ?? 1
      form.offWorkTime = isWeekendDate(detail.logDate) ? '' : (detail.offWorkTime || STANDARD_OFF_WORK_TIME)
      form.manualOvertimeHours = detail.overtimeHours ?? 0
      form.remark = detail.remark
      applyFormOptionDefaults()
    }

    function selectDay(date) {
      selectedDate.value = date
    }

    async function openDayDetail(date) {
      detailDate.value = date
      selectedDate.value = date
      selectedLogId.value = null
      showDayDetail.value = true
      const dayLogs = await fetchDayDetails(date)
      selectedLogId.value = dayLogs[0]?.id ?? null
    }

    function selectLog(log) {
      selectedLogId.value = log.id
      selectedDate.value = log.logDate
    }

    async function focusLogDate(logDate, preferredLogId = null) {
      const targetDate = logDate || selectedDate.value
      weekOffset.value = getWeekOffsetByDate(targetDate)
      selectedDate.value = targetDate
      detailDate.value = targetDate
      showDayDetail.value = true
      await fetchWeeklyLogs()
      const dayLogs = await fetchDayDetails(targetDate)
      const matchedLog = preferredLogId != null
        ? dayLogs.find((item) => item.id === preferredLogId)
        : null
      selectedLogId.value = matchedLog?.id ?? dayLogs[0]?.id ?? null
    }

    async function changeWeek(delta) {
      weekOffset.value += delta
      showDayDetail.value = false
      selectedLogId.value = null
      selectedDate.value = weekDays.value[0].date
      await fetchWeeklyLogs()
    }

    async function toggleYearList() {
      showYearList.value = !showYearList.value
      if (showYearList.value) {
        await fetchYearLogs()
      }
    }

    function openCreateDialog() {
      dialogMode.value = 'create'
      resetForm()
      showTypeDropdown.value = false
      showDialog.value = true
    }

    async function openEditDialog(targetLog) {
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
        fillForm(detail)
        showTypeDropdown.value = false
        showDialog.value = true
      } catch (error) {
        console.error(error)
        alert('读取日志详情失败')
      }
    }

    function closeDialog() {
      showDialog.value = false
      showTypeDropdown.value = false
    }

    function toggleTypeDropdown() {
      showTypeDropdown.value = !showTypeDropdown.value
    }

    function selectAllTypes() {
      form.typeCodes = typeOptions.value.map((item) => item.value)
    }

    function clearTypes() {
      form.typeCodes = []
    }

    async function submitDialog() {
      if (!form.typeCodes.length) {
        alert('请至少选择一个日志类型')
        return
      }
      if (!form.location) {
        alert('请选择地点')
        return
      }
      if (!form.projectCode) {
        alert('请选择所属项目')
        return
      }
      if (!form.workItem) {
        alert('请填写工作内容')
        return
      }
      if (!isWeekendFormDate.value && !form.offWorkTime) {
        alert('请填写实际下班时间')
        return
      }

      const overtimeHours = toNumber(calculatedOvertimeHours.value, 0)
      const payload = {
        logDate: form.logDate,
        typeCodes: [...form.typeCodes],
        location: form.location,
        projectCode: form.projectCode,
        workItem: form.workItem,
        zentaoNo: form.zentaoNo,
        personDay: Number(form.personDay),
        overtimeHours,
        offWorkTime: isWeekendFormDate.value ? null : formatBackendOffWorkTime(form.offWorkTime || STANDARD_OFF_WORK_TIME),
        remark: form.remark
      }

      submitting.value = true
      try {
        let savedLogId = form.id
        if (dialogMode.value === 'create') {
          const res = await createWorkLog({
            userId: currentUserId,
            ...payload
          })
          const savedLog = normalizeLog(unwrapData(res) || {})
          savedLogId = savedLog.id ?? savedLogId
        } else {
          const res = await updateWorkLog(form.id, payload)
          const savedLog = normalizeLog(unwrapData(res) || {})
          savedLogId = savedLog.id ?? savedLogId
        }

        showDialog.value = false
        showTypeDropdown.value = false
        await focusLogDate(form.logDate, savedLogId)
        if (showYearList.value) {
          yearFilter.value = Number(form.logDate.slice(0, 4))
          await fetchYearLogs()
        }
      } catch (error) {
        console.error(error)
        alert(dialogMode.value === 'create' ? '新增日志失败' : '更新日志失败')
      } finally {
        submitting.value = false
      }
    }

    async function deleteSelectedLog() {
      if (!selectedLog.value) {
        alert('请先在列表中选择一条日志')
        return
      }
      if (!window.confirm('确认删除当前日志吗？')) {
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

    function goBack() {
      router.push('/home')
    }

    watch(yearFilter, async () => {
      if (showYearList.value) {
        await fetchYearLogs()
      }
    })

    watch(() => form.logDate, (nextDate, prevDate) => {
      if (!nextDate) {
        return
      }
      const previousOvertime = isWeekendDate(prevDate)
        ? toNumber(form.manualOvertimeHours, 0)
        : calculateWeekdayOvertimeHours(form.offWorkTime)

      if (isWeekendDate(nextDate)) {
        form.manualOvertimeHours = previousOvertime
        form.offWorkTime = ''
      } else if (!form.offWorkTime) {
        form.offWorkTime = deriveOffWorkTimeFromHours(previousOvertime)
      }
    })

    watch(showDialog, (visible) => {
      if (!visible) {
        showTypeDropdown.value = false
      }
    })

    onMounted(async () => {
      if (!currentUserId) {
        alert('未获取到当前登录用户，请重新登录')
        return
      }
      await loadDictionaryOptions()
      await fetchWeeklyLogs()
    })

    return {
      loading,
      submitting,
      dictLoading,
      weekDays,
      weekDaysText: WEEK_TEXT,
      weeklyStats,
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
      projectSelectOptions,
      locationSelectOptions,
      yearFilter,
      yearOptions,
      yearLogs,
      form,
      showTypeDropdown,
      selectedTypeOptions,
      selectedTypeText,
      isWeekendFormDate,
      calculatedOvertimeHours,
      dictionarySourceText,
      formatTypeCodeList,
      formatTypeCodes,
      formatProjectText,
      formatLocationText,
      formatPersonDayText,
      formatHoursText,
      shortText,
      selectDay,
      openDayDetail,
      selectLog,
      changeWeek,
      toggleYearList,
      openCreateDialog,
      openEditDialog,
      closeDialog,
      toggleTypeDropdown,
      selectAllTypes,
      clearTypes,
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
  height: 100%;
  color: #fff;
  padding: 20px;
  overflow: auto;
}

.page-nav {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 12px;
}

.back-home-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 42px;
  padding: 0 16px 0 12px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  color: #fff;
  cursor: pointer;
  background: rgba(12, 32, 52, 0.58);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(12px);
  transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;
}

.back-home-btn:hover {
  transform: translateY(-1px);
  background: rgba(16, 40, 64, 0.76);
  border-color: rgba(255, 255, 255, 0.28);
}

.back-home-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.14);
}

.hero-panel,
.week-stats-panel,
.detail-panel,
.dialog {
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: linear-gradient(135deg, rgba(7, 22, 39, 0.82), rgba(17, 49, 73, 0.72));
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(16px);
}

.hero-panel {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
  padding: 16px 18px;
}

.page-title {
  margin: 0;
  font-size: 42px;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.page-subtitle {
  margin: 8px 0 0;
  font-size: 15px;
  color: rgba(255, 255, 255, 0.78);
}

.hero-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.hero-tag,
.stats-chip,
.summary-chip,
.detail-type-chip,
.selected-type-chip {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
}

.top-bar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.action-btn,
.ghost-btn {
  min-height: 40px;
  padding: 0 16px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  transition: transform 0.18s ease, opacity 0.18s ease;
}

.action-btn {
  background: linear-gradient(135deg, #3277af, #4492d0);
}

.action-btn:hover:not(:disabled),
.ghost-btn:hover:not(:disabled),
.mini-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.action-btn.danger,
.mini-btn.danger {
  background: rgba(191, 67, 67, 0.88);
}

.ghost-btn {
  background: rgba(255, 255, 255, 0.12);
}

.action-btn:disabled,
.ghost-btn:disabled,
.mini-btn:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.week-stats-panel,
.detail-panel {
  margin-bottom: 14px;
  padding: 18px;
}

.panel-head,
.detail-panel-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
}

.panel-title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
}

.panel-tip {
  margin: 6px 0 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.72);
}

.week-stats-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.stats-card {
  padding: 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.stats-card-wide {
  grid-column: span 2;
}

.stats-label {
  font-size: 12px;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.66);
  text-transform: uppercase;
}

.stats-card strong {
  font-size: 28px;
  line-height: 1.1;
}

.stats-card small,
.stats-empty,
.selected-type-empty {
  color: rgba(255, 255, 255, 0.72);
  font-size: 13px;
}

.stats-chip-row,
.summary-chip-row,
.detail-type-row,
.selected-type-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.status-chip {
  background: rgba(96, 173, 255, 0.14);
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.day-card {
  min-height: 220px;
  padding: 14px;
  border-radius: 16px;
  background: rgba(10, 28, 45, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 12px 22px rgba(0, 0, 0, 0.16);
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
}

.day-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.2);
}

.day-card.active {
  border-color: rgba(103, 180, 255, 0.9);
  background: rgba(15, 42, 68, 0.9);
}

.day-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.76);
}

.summary-wrap {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.summary-projects {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.92);
}

.summary-work {
  margin: 0;
  font-size: 13px;
  line-height: 1.65;
  color: rgba(255, 255, 255, 0.76);
}

.summary-foot {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin-top: auto;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.68);
}

.empty-text {
  color: rgba(255, 255, 255, 0.52);
  font-size: 13px;
}

.detail-list,
.mobile-year-list {
  display: grid;
  gap: 12px;
}

.detail-item,
.mobile-log-card {
  padding: 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
}

.detail-item.selected,
.mobile-log-card.selectedMobileCard,
.log-table tbody tr.selectedRow {
  border-color: rgba(103, 180, 255, 0.78);
  background: rgba(24, 64, 100, 0.34);
}

.detail-item-head,
.mobile-log-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 10px;
}

.detail-meta-row,
.mobile-log-meta,
.detail-foot-row,
.mobile-log-foot {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  color: rgba(255, 255, 255, 0.72);
  font-size: 13px;
}

.detail-work,
.mobile-log-work {
  margin: 10px 0;
  color: rgba(255, 255, 255, 0.92);
  line-height: 1.7;
}

.year-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.year-select,
.form-field input,
.form-field textarea,
.form-field select {
  width: 100%;
  min-height: 42px;
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  outline: none;
  font-size: 14px;
}

.year-select {
  width: 148px;
}

.form-field textarea {
  min-height: 104px;
  resize: vertical;
}

.log-table {
  width: 100%;
  border-collapse: collapse;
}

.log-table th,
.log-table td {
  padding: 12px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  text-align: left;
  vertical-align: top;
}

.log-table th {
  color: rgba(255, 255, 255, 0.72);
  font-size: 13px;
  font-weight: 700;
}

.log-table tbody tr {
  cursor: pointer;
  transition: background 0.18s ease;
}

.log-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.04);
}

.dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.42);
}

.dialog {
  width: min(720px, 100%);
  padding: 22px;
}

.dialog h3 {
  margin: 0 0 16px;
  font-size: 24px;
}

.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-inline-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-field > span {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.76);
}

.readonly-field .readonly-value {
  display: flex;
  align-items: center;
  min-height: 42px;
  padding: 0 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  font-weight: 700;
}

.multi-select {
  position: relative;
}

.multi-select.open .multi-select-trigger {
  border-color: rgba(111, 187, 255, 0.64);
  box-shadow: 0 0 0 3px rgba(73, 146, 211, 0.16);
  background: rgba(18, 42, 66, 0.88);
}

.multi-select-trigger {
  width: 100%;
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(38, 58, 79, 0.92), rgba(27, 47, 68, 0.92));
  color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  font-size: 14px;
}

.multi-select-panel {
  margin-top: 8px;
  padding: 14px;
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(5, 17, 30, 0.98), rgba(9, 24, 39, 0.96));
  border: 1px solid rgba(107, 180, 255, 0.16);
  box-shadow: 0 18px 34px rgba(0, 0, 0, 0.32);
  display: grid;
  gap: 12px;
}

.multi-select-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.mini-link {
  border: none;
  background: transparent;
  color: #8eccff;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
}

.mini-link:hover {
  color: #d6ecff;
}

.multi-option-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.multi-option {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 58px;
  padding: 0 16px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: border-color 0.18s ease, background 0.18s ease, transform 0.18s ease;
}

.multi-option:hover {
  transform: translateY(-1px);
  border-color: rgba(120, 191, 255, 0.28);
  background: rgba(37, 65, 93, 0.62);
}

.multi-option.checked {
  border-color: rgba(110, 191, 255, 0.52);
  background: linear-gradient(135deg, rgba(18, 73, 130, 0.68), rgba(23, 95, 151, 0.5));
}

.multi-option-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.multi-option-check {
  position: relative;
  flex: 0 0 22px;
  width: 22px;
  height: 22px;
  border-radius: 7px;
  border: 1px solid rgba(255, 255, 255, 0.24);
  background: rgba(255, 255, 255, 0.08);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.22);
}

.multi-option-checkmark {
  position: absolute;
  inset: 4px 6px 5px 6px;
  border-right: 3px solid transparent;
  border-bottom: 3px solid transparent;
  transform: rotate(40deg) scale(0.2);
  transform-origin: center;
  transition: transform 0.16s ease, border-color 0.16s ease;
}

.multi-option.checked .multi-option-check {
  border-color: rgba(153, 223, 255, 0.88);
  background: linear-gradient(180deg, rgba(100, 189, 255, 0.96), rgba(44, 128, 236, 0.92));
}

.multi-option.checked .multi-option-checkmark {
  border-color: #fff;
  transform: rotate(40deg) scale(1);
}

.multi-option-label {
  flex: 1;
  font-size: 15px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.94);
}

.selected-type-row {
  min-height: 22px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 4px;
}

.table-wrap {
  overflow-x: auto;
}

.mini-btn {
  min-height: 34px;
  padding: 0 12px;
  border: none;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
}

.mobile-year-list {
  display: none;
}

@media (max-width: 1280px) {
  .week-stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .stats-card-wide {
    grid-column: span 1;
  }

  .calendar-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .work-log-page {
    padding: 16px;
  }

  .hero-panel,
  .panel-head,
  .detail-panel-head,
  .year-head {
    flex-direction: column;
  }

  .page-title {
    font-size: 34px;
  }

  .calendar-grid,
  .week-stats-grid,
  .form-inline-grid {
    grid-template-columns: 1fr;
  }

  .multi-option-grid {
    grid-template-columns: 1fr;
  }

  .dialog-mask {
    align-items: flex-start;
    padding: 16px;
  }

  .dialog {
    width: 100%;
  }

  .desktop-year-table {
    display: none;
  }

  .mobile-year-list {
    display: grid;
  }

  .day-card {
    min-height: 180px;
  }
}
</style>
