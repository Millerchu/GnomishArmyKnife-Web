<template>
  <div class="todo-page">
    <div class="page-nav">
      <button type="button" class="back-home-btn" @click="goBack">
        <span class="back-home-icon">←</span>
        <span>返回桌面</span>
      </button>
    </div>

    <div class="hero-panel">
      <div>
        <h1 class="page-title">待办列表</h1>
        <p class="page-subtitle">参考主流待办应用的轻量规划方式，支持智能视图、重要标记、提醒时间和子任务拆解。</p>
      </div>
      <div class="hero-tags">
        <span class="hero-tag">今日 {{ summary.today }} 项</span>
        <span class="hero-tag">重要 {{ summary.important }} 项</span>
        <span class="hero-tag">已接真实接口</span>
      </div>
    </div>

    <section class="filter-panel">
      <div class="view-switch">
        <button
          v-for="item in viewOptions"
          :key="item.value"
          type="button"
          class="view-btn"
          :class="{active: query.viewCode === item.value}"
          @click="switchView(item.value)"
        >
          {{ item.label }}
        </button>
      </div>

      <div class="filter-grid">
        <label class="field">
          <span>关键词</span>
          <input
            v-model.trim="query.keyword"
            class="input"
            maxlength="64"
            placeholder="搜索任务标题、备注、子任务"
            @keyup.enter="handleSearch"
          />
        </label>

        <label class="field">
          <span>所属清单</span>
          <select v-model="query.listCode" class="input">
            <option value="">全部清单</option>
            <option v-for="item in listOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
        </label>

        <label class="field">
          <span>状态</span>
          <select v-model="query.status" class="input">
            <option value="">全部状态</option>
            <option v-for="item in statusOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
        </label>

        <label class="field">
          <span>优先级</span>
          <select v-model="query.importance" class="input">
            <option value="">全部优先级</option>
            <option v-for="item in importanceOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
        </label>
      </div>

      <div class="filter-actions">
        <button class="action-btn" :disabled="loading" @click="handleSearch">查询</button>
        <button class="ghost-btn" :disabled="loading" @click="resetQuery">重置</button>
      </div>
    </section>

    <div class="todo-layout">
      <section class="list-panel">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">任务清单</h2>
            <p class="panel-tip">支持快速完成、重要标记、子任务拆解和到期提醒。列表风格参考 Microsoft To Do 的轻任务流。</p>
          </div>
        </div>

        <div class="toolbar">
          <div class="toolbar-left">
            <button class="action-btn" :disabled="loading || submitting" @click="openCreateDialog">新增任务</button>
            <button class="ghost-btn" :disabled="loading || submitting" @click="loadTasks">刷新列表</button>
            <button class="ghost-btn" :disabled="!summary.completed || loading || submitting" @click="clearCompleted">
              清理已完成
            </button>
          </div>
          <div class="toolbar-right">
            <span>共 {{ total }} 条</span>
          </div>
        </div>

        <div v-if="loading && !pagedTasks.length" class="empty-state">加载中...</div>
        <div v-else-if="!pagedTasks.length" class="empty-state">当前条件下暂无任务</div>
        <template v-else>
          <div class="task-list desktop-task-list">
            <article
              v-for="item in pagedTasks"
              :key="item.id"
              class="task-card"
              :class="{done: item.status === 'COMPLETED'}"
            >
              <button type="button" class="task-check-btn" :class="{checked: item.status === 'COMPLETED'}" @click="toggleTaskStatus(item)">
                {{ item.status === 'COMPLETED' ? '✓' : '' }}
              </button>

              <div class="task-main" @click="openEditDialog(item)">
                <div class="task-head">
                  <div class="task-title-wrap">
                    <h3 class="task-title">{{ item.title }}</h3>
                    <div class="task-badges">
                      <span class="list-tag">{{ formatListText(item.listCode) }}</span>
                      <span class="importance-tag" :class="importanceClassMap[item.importance]">{{ formatImportanceText(item.importance) }}</span>
                      <span class="status-tag" :class="statusClassMap[item.status]">{{ formatStatusText(item.status) }}</span>
                    </div>
                  </div>
                </div>

                <p v-if="item.note" class="task-note">{{ item.note }}</p>

                <div class="task-meta">
                  <span v-if="item.dueDate" class="meta-chip" :class="dueClassMap[getDueState(item)]">
                    截止 {{ item.dueDate }}
                  </span>
                  <span v-if="item.reminderAt" class="meta-chip">提醒 {{ formatReminderText(item.reminderAt) }}</span>
                  <span v-if="item.steps.length" class="meta-chip">子任务 {{ countDoneSteps(item.steps) }}/{{ item.steps.length }}</span>
                  <span class="meta-chip">更新于 {{ item.updatedAt || item.createdAt || '-' }}</span>
                </div>
              </div>

              <div class="task-actions">
                <button type="button" class="icon-btn" :class="{active: item.important}" @click="toggleTaskImportant(item)">
                  {{ item.important ? '★' : '☆' }}
                </button>
                <button class="mini-btn" @click="openEditDialog(item)">编辑</button>
                <button class="mini-btn danger" @click="removeTask(item)">删除</button>
              </div>
            </article>
          </div>

          <div class="mobile-task-list">
            <article
              v-for="item in pagedTasks"
              :key="item.id"
              class="mobile-task-card"
              :class="{done: item.status === 'COMPLETED'}"
            >
              <div class="mobile-task-head">
                <button type="button" class="task-check-btn" :class="{checked: item.status === 'COMPLETED'}" @click="toggleTaskStatus(item)">
                  {{ item.status === 'COMPLETED' ? '✓' : '' }}
                </button>
                <div class="mobile-task-main" @click="openEditDialog(item)">
                  <strong class="mobile-task-title">{{ item.title }}</strong>
                  <div class="task-badges">
                    <span class="list-tag">{{ formatListText(item.listCode) }}</span>
                    <span class="importance-tag" :class="importanceClassMap[item.importance]">{{ formatImportanceText(item.importance) }}</span>
                  </div>
                </div>
                <button type="button" class="icon-btn" :class="{active: item.important}" @click="toggleTaskImportant(item)">
                  {{ item.important ? '★' : '☆' }}
                </button>
              </div>

              <p v-if="item.note" class="task-note mobile-note">{{ item.note }}</p>

              <div class="mobile-task-grid">
                <p><span>状态</span><strong>{{ formatStatusText(item.status) }}</strong></p>
                <p><span>截止日期</span><strong>{{ item.dueDate || '-' }}</strong></p>
                <p><span>提醒时间</span><strong>{{ formatReminderText(item.reminderAt) || '-' }}</strong></p>
                <p><span>子任务</span><strong>{{ item.steps.length ? `${countDoneSteps(item.steps)}/${item.steps.length}` : '无' }}</strong></p>
              </div>

              <div class="mobile-card-actions">
                <button class="mini-btn" @click="openEditDialog(item)">编辑</button>
                <button class="mini-btn danger" @click="removeTask(item)">删除</button>
              </div>
            </article>
          </div>
        </template>

        <div class="pager">
          <div class="pager-left">
            <span>第 {{ query.pageNo }} / {{ totalPages }} 页</span>
            <select v-model.number="query.pageSize" class="pager-select" :disabled="loading" @change="handlePageSizeChange">
              <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }} 条/页</option>
            </select>
          </div>
          <div class="pager-right">
            <button class="ghost-btn" :disabled="query.pageNo <= 1 || loading" @click="changePage(-1)">上一页</button>
            <button class="ghost-btn" :disabled="query.pageNo >= totalPages || loading" @click="changePage(1)">下一页</button>
          </div>
        </div>
      </section>

      <aside class="insight-panel">
        <div class="panel-head aside-head">
          <div>
            <h2 class="panel-title">今日聚焦</h2>
            <p class="panel-tip">把需要优先推进的任务压缩到可执行范围，减少切换成本。</p>
          </div>
        </div>

        <div class="summary-grid">
          <article class="summary-card">
            <span>全部任务</span>
            <strong>{{ summary.total }}</strong>
          </article>
          <article class="summary-card">
            <span>今日待办</span>
            <strong>{{ summary.today }}</strong>
          </article>
          <article class="summary-card">
            <span>重要任务</span>
            <strong>{{ summary.important }}</strong>
          </article>
          <article class="summary-card">
            <span>已完成</span>
            <strong>{{ summary.completed }}</strong>
          </article>
        </div>

        <div class="insight-block">
          <div class="insight-head">
            <h3 class="insight-title">即将到期</h3>
            <span>{{ upcomingTasks.length }} 项</span>
          </div>
          <div v-if="upcomingTasks.length" class="upcoming-list">
            <article v-for="item in upcomingTasks" :key="item.id" class="upcoming-item" @click="openEditDialog(item)">
              <strong>{{ item.title }}</strong>
              <span>{{ item.dueDate || '未设置日期' }}</span>
            </article>
          </div>
          <div v-else class="subtle-empty">最近没有紧迫到期任务</div>
        </div>

        <div class="insight-block">
          <div class="insight-head">
            <h3 class="insight-title">清单分布</h3>
            <span>{{ listDistribution.length }} 组</span>
          </div>
          <div v-if="listDistribution.length" class="distribution-list">
            <div v-for="item in listDistribution" :key="item.listCode" class="distribution-row">
              <span>{{ formatListText(item.listCode) }}</span>
              <strong>{{ item.count }}</strong>
            </div>
          </div>
          <div v-else class="subtle-empty">暂无清单分布数据</div>
        </div>
      </aside>
    </div>

    <div v-if="showDialog" class="dialog-mask" @click.self="closeDialog">
      <div class="dialog">
        <h3 class="dialog-title">{{ dialogMode === 'create' ? '新增待办任务' : '编辑待办任务' }}</h3>
        <form class="dialog-form" @submit.prevent="submitDialog">
          <label class="form-field">
            <span>任务标题</span>
            <input v-model.trim="form.title" class="input" maxlength="100" placeholder="例如：整理本周工作清单" required />
          </label>

          <div class="form-inline-grid">
            <label class="form-field">
              <span>所属清单</span>
              <select v-model="form.listCode" class="input">
                <option v-for="item in listOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
            </label>

            <label class="form-field">
              <span>优先级</span>
              <select v-model="form.importance" class="input">
                <option v-for="item in importanceOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
            </label>
          </div>

          <div class="form-inline-grid">
            <label class="form-field">
              <span>状态</span>
              <select v-model="form.status" class="input">
                <option v-for="item in statusOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
            </label>

            <div class="form-field checkbox-field">
              <span>重要标记</span>
              <label class="checkbox-item">
                <input v-model="form.important" type="checkbox" />
                <strong>加入重要任务</strong>
              </label>
            </div>
          </div>

          <div class="form-inline-grid">
            <label class="form-field">
              <span>截止日期</span>
              <input v-model="form.dueDate" class="input" type="date" />
            </label>

            <label class="form-field">
              <span>提醒时间</span>
              <input v-model="form.reminderAt" class="input" type="datetime-local" />
            </label>
          </div>

          <label class="form-field">
            <span>备注</span>
            <textarea v-model.trim="form.note" class="input textarea" rows="3" maxlength="300" placeholder="补充描述、链接或执行要点" />
          </label>

          <div class="steps-panel">
            <div class="steps-head">
              <div>
                <h4 class="steps-title">子任务</h4>
                <p class="steps-subtitle">把复杂任务拆成几个可执行动作，列表页会自动显示进度。</p>
              </div>
            </div>

            <div class="steps-create">
              <input
                v-model.trim="stepDraft"
                class="input"
                maxlength="80"
                placeholder="输入一个子任务，例如：整理素材清单"
                @keyup.enter.prevent="appendStep"
              />
              <button type="button" class="action-btn" @click="appendStep">新增子任务</button>
            </div>

            <div v-if="form.steps.length" class="steps-list">
              <div v-for="(item, index) in form.steps" :key="item.id" class="step-item">
                <label class="step-main">
                  <input v-model="item.done" type="checkbox" />
                  <span>{{ item.title }}</span>
                </label>
                <button type="button" class="mini-btn danger" @click="removeStep(index)">删除</button>
              </div>
            </div>
            <div v-else class="subtle-empty">还没有子任务，可以先添加 1-3 个执行动作。</div>
          </div>

          <div class="dialog-actions">
            <button type="button" class="ghost-btn" :disabled="submitting" @click="closeDialog">取消</button>
            <button type="submit" class="action-btn" :disabled="submitting">
              {{ submitting ? '提交中...' : (dialogMode === 'create' ? '保存任务' : '更新任务') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import {computed, onMounted, reactive, ref} from 'vue'
import {useRouter} from 'vue-router'
import {
  clearCompletedTodoTasks,
  createTodoTask,
  deleteTodoTask,
  listTodoTasks,
  updateTodoTask,
  updateTodoTaskImportant,
  updateTodoTaskStatus
} from '@/api/todoList'

const PAGE_SIZE_OPTIONS = [8, 12, 20]
const LIST_OPTIONS = [
  {value: 'MY_DAY', label: '我的一天'},
  {value: 'WORK', label: '工作'},
  {value: 'PERSONAL', label: '个人'},
  {value: 'LEARNING', label: '学习'},
  {value: 'SHOPPING', label: '购物'}
]
const STATUS_OPTIONS = [
  {value: 'TODO', label: '待开始'},
  {value: 'IN_PROGRESS', label: '进行中'},
  {value: 'COMPLETED', label: '已完成'}
]
const IMPORTANCE_OPTIONS = [
  {value: 'LOW', label: '低优先级'},
  {value: 'MEDIUM', label: '中优先级'},
  {value: 'HIGH', label: '高优先级'}
]
const VIEW_OPTIONS = [
  {value: 'ALL', label: '全部'},
  {value: 'TODAY', label: '今天'},
  {value: 'IMPORTANT', label: '重要'},
  {value: 'COMPLETED', label: '已完成'}
]

// 兼容统一响应包装与直接返回数据的两种接口形态。
function unwrapData(res) {
  const payload = res?.data
  if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data
  }
  return payload
}

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback
}

function getTodayText() {
  const date = new Date()
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function buildStep(step = {}) {
  return {
    id: step.id || `step-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: step.title || step.name || '',
    done: Boolean(step.done ?? step.completed)
  }
}

function normalizeReminderText(value) {
  if (!value) {
    return ''
  }
  return `${value}`.replace('T', ' ').slice(0, 16)
}

function normalizeReminderInput(value) {
  if (!value) {
    return ''
  }
  return `${value}`.replace(' ', 'T').slice(0, 16)
}

function normalizeTask(item = {}) {
  const steps = Array.isArray(item.steps)
    ? item.steps.map((step) => buildStep(step))
    : []

  return {
    id: item.id ?? item.taskId ?? '',
    title: item.title || item.taskTitle || '',
    listCode: item.listCode || item.groupCode || 'MY_DAY',
    importance: item.importance || item.priority || 'MEDIUM',
    status: item.status || 'TODO',
    important: Boolean(item.important ?? item.starred),
    dueDate: item.dueDate || item.deadline || '',
    reminderAt: normalizeReminderText(item.reminderAt || item.remindAt || ''),
    note: item.note || item.description || '',
    steps,
    createdAt: item.createdAt || item.createTime || '',
    updatedAt: item.updatedAt || item.updateTime || item.createdAt || item.createTime || ''
  }
}

function countDoneSteps(steps = []) {
  return steps.filter((item) => item.done).length
}

function sortTasks(list) {
  return [...list].sort((prev, next) => {
    if (prev.status === 'COMPLETED' && next.status !== 'COMPLETED') {
      return 1
    }
    if (prev.status !== 'COMPLETED' && next.status === 'COMPLETED') {
      return -1
    }
    if (prev.important !== next.important) {
      return prev.important ? -1 : 1
    }
    if ((prev.dueDate || '') !== (next.dueDate || '')) {
      if (!prev.dueDate) {
        return 1
      }
      if (!next.dueDate) {
        return -1
      }
      return prev.dueDate.localeCompare(next.dueDate)
    }
    return `${next.updatedAt}`.localeCompare(`${prev.updatedAt}`)
  })
}

// 概览区、智能视图和右侧分布面板都从这里集中计算，避免各处重复遍历任务。
function buildSummary(tasks = []) {
  const today = getTodayText()
  return {
    total: tasks.length,
    today: tasks.filter((item) => item.status !== 'COMPLETED' && (item.dueDate === today || item.listCode === 'MY_DAY')).length,
    important: tasks.filter((item) => item.status !== 'COMPLETED' && item.important).length,
    completed: tasks.filter((item) => item.status === 'COMPLETED').length
  }
}

function buildUpcomingTasks(tasks = []) {
  const today = getTodayText()
  return sortTasks(tasks.filter((item) => item.status !== 'COMPLETED' && item.dueDate && item.dueDate >= today)).slice(0, 4)
}

function buildListDistribution(tasks = []) {
  const counter = tasks.reduce((result, item) => {
    result[item.listCode] = (result[item.listCode] || 0) + 1
    return result
  }, {})
  return Object.entries(counter)
    .map(([listCode, count]) => ({listCode, count}))
    .sort((prev, next) => next.count - prev.count)
}

function normalizeReminderPayload(value) {
  if (!value) {
    return null
  }
  return value.length === 16 ? `${value}:00` : value
}

export default {
  name: 'TodoList',
  setup() {
    const router = useRouter()

    const loading = ref(false)
    const submitting = ref(false)
    const total = ref(0)
    const pagedTasks = ref([])
    const summary = reactive({
      total: 0,
      today: 0,
      important: 0,
      completed: 0
    })
    const upcomingTasks = ref([])
    const listDistribution = ref([])

    const showDialog = ref(false)
    const dialogMode = ref('create')
    const editingId = ref('')
    const stepDraft = ref('')

    const query = reactive({
      keyword: '',
      listCode: '',
      status: '',
      importance: '',
      viewCode: 'ALL',
      pageNo: 1,
      pageSize: PAGE_SIZE_OPTIONS[0]
    })

    const form = reactive({
      title: '',
      listCode: 'MY_DAY',
      importance: 'MEDIUM',
      status: 'TODO',
      important: false,
      dueDate: '',
      reminderAt: '',
      note: '',
      steps: []
    })

    const pageSizeOptions = PAGE_SIZE_OPTIONS
    const listOptions = LIST_OPTIONS
    const statusOptions = STATUS_OPTIONS
    const importanceOptions = IMPORTANCE_OPTIONS
    const viewOptions = VIEW_OPTIONS

    const totalPages = computed(() => Math.max(1, Math.ceil(total.value / query.pageSize)))

    const statusClassMap = {
      TODO: 'todo',
      IN_PROGRESS: 'progress',
      COMPLETED: 'done'
    }
    const importanceClassMap = {
      LOW: 'low',
      MEDIUM: 'medium',
      HIGH: 'high'
    }
    const dueClassMap = {
      overdue: 'overdue',
      today: 'today',
      upcoming: 'upcoming',
      normal: ''
    }

    const formatListText = (code) => listOptions.find((item) => item.value === code)?.label || code || '-'
    const formatStatusText = (code) => statusOptions.find((item) => item.value === code)?.label || code || '-'
    const formatImportanceText = (code) => importanceOptions.find((item) => item.value === code)?.label || code || '-'

    const formatReminderText = (value) => normalizeReminderText(value)

    const getDueState = (item) => {
      if (!item?.dueDate || item.status === 'COMPLETED') {
        return 'normal'
      }
      const today = getTodayText()
      if (item.dueDate < today) {
        return 'overdue'
      }
      if (item.dueDate === today) {
        return 'today'
      }
      return 'upcoming'
    }

    const applySummary = (records) => {
      const nextSummary = buildSummary(records)
      summary.total = nextSummary.total
      summary.today = nextSummary.today
      summary.important = nextSummary.important
      summary.completed = nextSummary.completed
    }

    const applyPageInsights = (payload = {}, fallbackList = []) => {
      if (payload.summary) {
        summary.total = Number(payload.summary.total ?? 0)
        summary.today = Number(payload.summary.today ?? 0)
        summary.important = Number(payload.summary.important ?? 0)
        summary.completed = Number(payload.summary.completed ?? 0)
      } else {
        applySummary(fallbackList)
      }

      upcomingTasks.value = Array.isArray(payload.upcoming)
        ? payload.upcoming.map((item) => normalizeTask(item))
        : buildUpcomingTasks(fallbackList)

      listDistribution.value = Array.isArray(payload.listStats)
        ? payload.listStats.map((item) => ({
          listCode: item.listCode || item.code,
          count: Number(item.count ?? item.total ?? 0)
        }))
        : buildListDistribution(fallbackList)
    }

    const loadTasks = async () => {
      loading.value = true
      try {
        const res = await listTodoTasks({
          pageNo: query.pageNo,
          pageSize: query.pageSize,
          keyword: query.keyword || undefined,
          listCode: query.listCode || undefined,
          status: query.status || undefined,
          importance: query.importance || undefined,
          viewCode: query.viewCode === 'ALL' ? undefined : query.viewCode
        })
        const payload = unwrapData(res) || {}
        const rawList = Array.isArray(payload)
          ? payload
          : (payload.list || payload.records || payload.rows || [])
        const normalizedList = sortTasks(rawList.map((item) => normalizeTask(item)))
        pagedTasks.value = normalizedList
        total.value = Number(payload.total ?? payload.count ?? normalizedList.length ?? 0)
        applyPageInsights(payload, normalizedList)
      } catch (error) {
        pagedTasks.value = []
        total.value = 0
        applySummary([])
        upcomingTasks.value = []
        listDistribution.value = []
        alert(getErrorMessage(error, '待办任务加载失败'))
      } finally {
        loading.value = false
      }
    }

    const resetForm = () => {
      form.title = ''
      form.listCode = 'MY_DAY'
      form.importance = 'MEDIUM'
      form.status = 'TODO'
      form.important = false
      form.dueDate = ''
      form.reminderAt = ''
      form.note = ''
      form.steps = []
      stepDraft.value = ''
    }

    const fillForm = (task) => {
      form.title = task.title || ''
      form.listCode = task.listCode || 'MY_DAY'
      form.importance = task.importance || 'MEDIUM'
      form.status = task.status || 'TODO'
      form.important = Boolean(task.important)
      form.dueDate = task.dueDate || ''
      form.reminderAt = normalizeReminderInput(task.reminderAt)
      form.note = task.note || ''
      form.steps = (task.steps || []).map((item) => buildStep(item))
      stepDraft.value = ''
    }

    const openCreateDialog = () => {
      dialogMode.value = 'create'
      editingId.value = ''
      resetForm()
      showDialog.value = true
    }

    const openEditDialog = (item) => {
      dialogMode.value = 'edit'
      editingId.value = item.id
      fillForm(item)
      showDialog.value = true
    }

    const closeDialog = () => {
      if (submitting.value) {
        return
      }
      showDialog.value = false
      resetForm()
    }

    const appendStep = () => {
      if (!stepDraft.value) {
        return
      }
      form.steps.push(buildStep({title: stepDraft.value, done: false}))
      stepDraft.value = ''
    }

    const removeStep = (index) => {
      form.steps.splice(index, 1)
    }

    const buildFormPayload = () => ({
      title: form.title,
      listCode: form.listCode,
      importance: form.importance,
      status: form.status,
      important: form.important,
      dueDate: form.dueDate || null,
      reminderAt: normalizeReminderPayload(form.reminderAt),
      note: form.note,
      steps: form.steps.map((item) => ({
        id: item.id,
        title: item.title,
        done: item.done
      }))
    })

    const submitDialog = async () => {
      if (!form.title) {
        alert('请输入任务标题')
        return
      }
      if (submitting.value) {
        return
      }

      const payload = buildFormPayload()
      submitting.value = true
      try {
        if (dialogMode.value === 'create') {
          await createTodoTask(payload)
        } else {
          await updateTodoTask(editingId.value, payload)
        }
        showDialog.value = false
        resetForm()
        await loadTasks()
      } catch (error) {
        alert(getErrorMessage(error, dialogMode.value === 'create' ? '新增任务失败' : '更新任务失败'))
      } finally {
        submitting.value = false
      }
    }

    const toggleTaskStatus = async (item) => {
      const nextStatus = item.status === 'COMPLETED' ? 'TODO' : 'COMPLETED'
      try {
        await updateTodoTaskStatus(item.id, {
          status: nextStatus,
          completed: nextStatus === 'COMPLETED'
        })
        await loadTasks()
      } catch (error) {
        alert(getErrorMessage(error, '更新任务状态失败'))
      }
    }

    const toggleTaskImportant = async (item) => {
      try {
        await updateTodoTaskImportant(item.id, {
          important: !item.important
        })
        await loadTasks()
      } catch (error) {
        alert(getErrorMessage(error, '更新重要标记失败'))
      }
    }

    const removeTask = async (item) => {
      if (!window.confirm(`确认删除任务【${item.title}】吗？`)) {
        return
      }
      try {
        await deleteTodoTask(item.id)
        await loadTasks()
      } catch (error) {
        alert(getErrorMessage(error, '删除任务失败'))
      }
    }

    const clearCompleted = async () => {
      if (!window.confirm('确认清理全部已完成任务吗？')) {
        return
      }
      try {
        await clearCompletedTodoTasks()
        await loadTasks()
      } catch (error) {
        alert(getErrorMessage(error, '清理已完成任务失败'))
      }
    }

    const handleSearch = () => {
      query.pageNo = 1
      loadTasks()
    }

    const resetQuery = () => {
      query.keyword = ''
      query.listCode = ''
      query.status = ''
      query.importance = ''
      query.viewCode = 'ALL'
      query.pageNo = 1
      query.pageSize = PAGE_SIZE_OPTIONS[0]
      loadTasks()
    }

    const switchView = (viewCode) => {
      query.viewCode = viewCode
      query.pageNo = 1
      loadTasks()
    }

    const changePage = (offset) => {
      const nextPage = query.pageNo + offset
      if (nextPage < 1 || nextPage > totalPages.value) {
        return
      }
      query.pageNo = nextPage
      loadTasks()
    }

    const handlePageSizeChange = () => {
      query.pageNo = 1
      loadTasks()
    }

    const goBack = () => {
      router.push('/home')
    }

    onMounted(() => {
      loadTasks()
    })

    return {
      loading,
      submitting,
      total,
      pagedTasks,
      summary,
      upcomingTasks,
      listDistribution,
      query,
      pageSizeOptions,
      listOptions,
      statusOptions,
      importanceOptions,
      viewOptions,
      totalPages,
      showDialog,
      dialogMode,
      form,
      stepDraft,
      statusClassMap,
      importanceClassMap,
      dueClassMap,
      formatListText,
      formatStatusText,
      formatImportanceText,
      formatReminderText,
      getDueState,
      countDoneSteps,
      switchView,
      handleSearch,
      resetQuery,
      changePage,
      handlePageSizeChange,
      openCreateDialog,
      openEditDialog,
      closeDialog,
      appendStep,
      removeStep,
      submitDialog,
      toggleTaskStatus,
      toggleTaskImportant,
      removeTask,
      clearCompleted,
      loadTasks,
      goBack
    }
  }
}
</script>

<style scoped>
.todo-page {
  min-height: 100vh;
  height: 100%;
  padding: 18px 22px 26px;
  color: #fff;
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
.filter-panel,
.list-panel,
.insight-panel,
.dialog,
.steps-panel {
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: linear-gradient(135deg, rgba(7, 22, 39, 0.82), rgba(17, 49, 73, 0.72));
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(16px);
}

.hero-panel,
.filter-panel,
.list-panel,
.insight-panel {
  border-radius: 18px;
  padding: 16px 18px;
}

.hero-panel,
.toolbar,
.panel-head,
.pager,
.insight-head,
.distribution-row,
.mobile-card-actions,
.dialog-actions,
.steps-create,
.step-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hero-panel,
.toolbar,
.panel-head,
.pager,
.insight-head,
.distribution-row,
.step-item {
  justify-content: space-between;
}

.hero-panel,
.filter-panel {
  margin-bottom: 14px;
}

.todo-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(300px, 0.85fr);
  gap: 14px;
}

.page-title,
.panel-title,
.dialog-title,
.insight-title,
.steps-title {
  margin: 0;
}

.page-title {
  font-size: 28px;
}

.page-subtitle,
.panel-tip,
.steps-subtitle,
.subtle-empty {
  margin: 6px 0 0;
  color: rgba(255, 255, 255, 0.74);
}

.hero-tags,
.task-badges,
.task-meta,
.view-switch,
.toolbar-left,
.toolbar-right {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.hero-tag,
.list-tag,
.importance-tag,
.status-tag,
.meta-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
}

.hero-tag {
  background: rgba(91, 180, 255, 0.18);
  color: #d7f0ff;
}

.view-btn,
.ghost-btn,
.action-btn,
.mini-btn,
.icon-btn,
.task-check-btn,
.dialog-close {
  border: none;
  color: #fff;
  cursor: pointer;
}

.view-btn {
  min-height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
}

.view-btn.active {
  background: linear-gradient(135deg, #1996ff, #27d5a4);
}

.filter-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.field,
.form-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field span,
.form-field span,
.mobile-task-grid span,
.summary-card span {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.72);
}

.filter-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.input {
  width: 100%;
  min-height: 40px;
  padding: 9px 12px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  outline: none;
}

.input::placeholder {
  color: rgba(255, 255, 255, 0.48);
}

.textarea {
  resize: vertical;
  min-height: 92px;
}

.action-btn,
.ghost-btn {
  min-height: 38px;
  padding: 0 14px;
  border-radius: 10px;
}

.action-btn {
  background: linear-gradient(135deg, #1996ff, #27d5a4);
}

.ghost-btn {
  background: rgba(255, 255, 255, 0.12);
}

.mini-btn {
  min-height: 30px;
  padding: 0 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.16);
}

.mini-btn.danger {
  background: rgba(239, 68, 68, 0.65);
}

.icon-btn {
  min-width: 36px;
  height: 36px;
  border-radius: 999px;
  font-size: 18px;
  background: rgba(255, 255, 255, 0.12);
}

.icon-btn.active {
  background: rgba(250, 204, 21, 0.28);
  color: #ffe794;
}

.task-check-btn {
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  border-radius: 999px;
  font-size: 16px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.16);
}

.task-check-btn.checked {
  background: rgba(34, 197, 94, 0.24);
  border-color: rgba(34, 197, 94, 0.4);
  color: #bbf7d0;
}

.list-tag {
  background: rgba(125, 211, 252, 0.16);
  color: #d2f1ff;
}

.importance-tag.low {
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.86);
}

.importance-tag.medium {
  background: rgba(59, 130, 246, 0.22);
  color: #dbeafe;
}

.importance-tag.high {
  background: rgba(239, 68, 68, 0.22);
  color: #fecaca;
}

.status-tag.todo {
  background: rgba(148, 163, 184, 0.2);
  color: #e2e8f0;
}

.status-tag.progress {
  background: rgba(96, 165, 250, 0.22);
  color: #dbeafe;
}

.status-tag.done {
  background: rgba(34, 197, 94, 0.24);
  color: #bbf7d0;
}

.meta-chip {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.76);
}

.meta-chip.overdue {
  background: rgba(239, 68, 68, 0.22);
  color: #fecaca;
}

.meta-chip.today {
  background: rgba(59, 130, 246, 0.22);
  color: #dbeafe;
}

.meta-chip.upcoming {
  background: rgba(16, 185, 129, 0.2);
  color: #d1fae5;
}

.task-list,
.mobile-task-list,
.upcoming-list,
.distribution-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.desktop-task-list {
  margin-top: 14px;
}

.mobile-task-list {
  display: none;
  margin-top: 14px;
}

.task-card,
.mobile-task-card,
.summary-card,
.upcoming-item,
.distribution-row,
.steps-panel {
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.08);
}

.task-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 14px;
  padding: 14px;
  align-items: flex-start;
}

.task-card.done,
.mobile-task-card.done {
  opacity: 0.8;
}

.task-main,
.mobile-task-main,
.upcoming-item {
  cursor: pointer;
}

.task-title-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-title,
.mobile-task-title {
  margin: 0;
  font-size: 18px;
  line-height: 1.35;
  word-break: break-word;
}

.task-card.done .task-title,
.mobile-task-card.done .mobile-task-title {
  text-decoration: line-through;
  color: rgba(255, 255, 255, 0.64);
}

.task-note {
  margin: 10px 0 0;
  color: rgba(255, 255, 255, 0.82);
  line-height: 1.5;
  word-break: break-word;
}

.task-meta {
  margin-top: 10px;
}

.task-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.summary-card {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.summary-card strong {
  font-size: 28px;
  line-height: 1;
}

.insight-block {
  margin-top: 16px;
}

.insight-title {
  font-size: 16px;
}

.upcoming-item {
  padding: 12px 14px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.upcoming-item strong {
  font-size: 14px;
  line-height: 1.4;
}

.upcoming-item span,
.distribution-row span,
.distribution-row strong {
  color: rgba(255, 255, 255, 0.8);
}

.distribution-row {
  padding: 12px 14px;
}

.empty-state {
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.68);
}

.pager {
  margin-top: 16px;
  flex-wrap: wrap;
}

.pager-left,
.pager-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pager-select {
  border: none;
  outline: none;
  border-radius: 8px;
  height: 32px;
  padding: 0 8px;
  color: #fff;
  background: rgba(255, 255, 255, 0.16);
}

.pager-select option {
  color: #222;
}

.dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 40;
  padding: 18px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(1, 8, 16, 0.58);
}

.dialog {
  width: min(760px, 100%);
  max-height: calc(100vh - 36px);
  overflow: auto;
  padding: 20px;
  border-radius: 20px;
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

.checkbox-field {
  justify-content: flex-end;
}

.checkbox-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
}

.steps-panel {
  padding: 14px;
}

.steps-head {
  margin-bottom: 12px;
}

.steps-title {
  font-size: 16px;
}

.steps-subtitle {
  font-size: 13px;
}

.steps-create {
  align-items: stretch;
}

.steps-create .input {
  flex: 1 1 auto;
}

.steps-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
}

.step-item {
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
}

.step-main {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.mobile-task-card {
  padding: 14px;
}

.mobile-task-head {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 10px;
  align-items: flex-start;
}

.mobile-task-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.mobile-task-grid p {
  margin: 0;
  padding: 11px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mobile-task-grid strong {
  font-size: 14px;
  word-break: break-word;
}

.mobile-note {
  margin-top: 12px;
}

.mobile-card-actions {
  margin-top: 12px;
}

@media (max-width: 1100px) {
  .todo-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 860px) {
  .filter-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .todo-page {
    padding: 12px;
  }

  .hero-panel,
  .filter-actions,
  .toolbar,
  .pager,
  .steps-create {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar-left,
  .toolbar-right,
  .pager-left,
  .pager-right {
    width: 100%;
  }

  .filter-actions .action-btn,
  .filter-actions .ghost-btn,
  .toolbar-left .action-btn,
  .toolbar-left .ghost-btn,
  .pager-right .ghost-btn,
  .dialog-actions .action-btn,
  .dialog-actions .ghost-btn,
  .steps-create .action-btn {
    flex: 1 1 calc(50% - 6px);
  }

  .task-card {
    display: none;
  }

  .mobile-task-list {
    display: flex;
  }

  .summary-grid,
  .form-inline-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .hero-panel,
  .filter-panel,
  .list-panel,
  .insight-panel,
  .dialog {
    padding: 14px;
    border-radius: 16px;
  }

  .page-title {
    font-size: 24px;
  }

  .filter-grid,
  .mobile-task-grid {
    grid-template-columns: 1fr;
  }

  .filter-actions .action-btn,
  .filter-actions .ghost-btn,
  .toolbar-left .action-btn,
  .toolbar-left .ghost-btn,
  .pager-right .ghost-btn,
  .dialog-actions .action-btn,
  .dialog-actions .ghost-btn,
  .steps-create .action-btn,
  .mobile-card-actions .mini-btn {
    flex-basis: 100%;
  }

  .dialog-mask {
    padding: 10px;
  }
}
</style>
