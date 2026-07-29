<template>
  <section
    class="notice-board"
    @mouseenter="cancelPanelHide"
    @mouseleave="schedulePanelHide"
    @focusin="cancelPanelHide"
    @focusout="schedulePanelHide"
  >
    <button
      type="button"
      class="board-trigger"
      aria-controls="requirement-board-panel"
      :aria-expanded="panelOpen"
      @click.stop="togglePanel"
    >
      <span class="board-trigger-icon" aria-hidden="true">▤</span>
      <span>需求看板</span>
      <small v-if="allStatusCount">{{ allStatusCount }}</small>
    </button>

    <Transition name="board-popover">
      <div
        v-if="panelOpen"
        id="requirement-board-panel"
        class="board-popover"
        role="dialog"
        aria-labelledby="requirement-board-title"
      >
    <header class="notice-board-header">
      <div class="notice-board-heading">
        <span class="notice-board-kicker" aria-hidden="true">需求</span>
        <div>
          <h2 id="requirement-board-title">需求看板</h2>
          <p>所有用户共享需求和处理进度。</p>
        </div>
      </div>
      <div class="notice-board-header-actions">
        <span class="notice-board-total">{{ allStatusCount }} 条</span>
        <button
          type="button"
          class="notice-primary-button"
          :disabled="!applicationOptions.length"
          @click="openCreateDialog"
        >
          <span aria-hidden="true">＋</span>发布需求
        </button>
        <button type="button" class="board-close-button" aria-label="关闭需求看板" @click="closePanel">×</button>
      </div>
    </header>

    <div class="notice-toolbar">
      <label class="notice-search">
        <span class="sr-only">搜索需求</span>
        <span class="notice-search-icon" aria-hidden="true">⌕</span>
        <input
          v-model.trim="query.keyword"
          type="search"
          maxlength="100"
          placeholder="搜索需求"
          @keyup.enter="handleSearch"
        >
      </label>
      <label class="notice-select">
        <span class="sr-only">按应用筛选</span>
        <select v-model="query.appCode" @change="handleFilterChange">
          <option value="">全部应用</option>
          <option v-for="app in applicationOptions" :key="app.appCode" :value="app.appCode">
            {{ app.appName }}
          </option>
        </select>
      </label>
      <label class="notice-select notice-priority-filter">
        <span class="sr-only">按优先级筛选</span>
        <select v-model="query.priority" @change="handleFilterChange">
          <option value="">全部优先级</option>
          <option v-for="priority in priorityOptions" :key="priority.value" :value="priority.value">
            {{ priority.label }}
          </option>
        </select>
      </label>
      <button type="button" class="notice-icon-button" :disabled="boardLoading" title="刷新需求看板" @click="loadBoard">
        <span aria-hidden="true">↻</span><span class="sr-only">刷新</span>
      </button>
    </div>

    <nav class="notice-status-filter" aria-label="按状态筛选">
      <button
        v-for="option in statusOptions"
        :key="option.value || 'all'"
        type="button"
        :class="{active: query.status === option.value}"
        @click="switchStatusFilter(option.value)"
      >
        <span v-if="option.value" class="notice-status-dot" :class="statusClass(option.value)" aria-hidden="true"></span>
        {{ option.label }}
        <small>{{ getStatusCount(option.value) }}</small>
      </button>
    </nav>

    <div v-if="boardError" class="notice-inline-error" role="alert">
      <span>{{ boardError }}</span>
      <button type="button" @click="loadBoard">重试</button>
    </div>

    <div v-if="boardLoading && !requirements.length" class="notice-empty">正在读取需求...</div>
    <div v-else-if="requirements.length" class="notice-grid" aria-live="polite">
      <button
        v-for="item in requirements"
        :key="item.id"
        type="button"
        class="notice-card requirement-card"
        @click="openDetailDialog(item)"
      >
        <span class="notice-card-topline">
          <span class="notice-app">
            <span class="notice-app-mark" aria-hidden="true">{{ appMark(item.appName) }}</span>
            {{ item.appName || '通用' }}
          </span>
          <span class="notice-card-badges">
            <span class="notice-priority" :class="priorityClass(item.priority)">
              {{ formatPriority(item.priority) }}
            </span>
            <span class="notice-status">
              <span class="notice-status-dot" :class="statusClass(item.status)" aria-hidden="true"></span>
              {{ formatStatus(item.status) }}
            </span>
          </span>
        </span>
        <strong>{{ item.title }}</strong>
        <span class="notice-card-description">{{ item.description || '暂无详细描述' }}</span>
        <span class="notice-card-meta">
          <span>{{ item.creatorName || '未知用户' }}</span>
          <time :datetime="item.updatedAt">{{ formatDateTime(item.updatedAt) }}</time>
        </span>
      </button>
    </div>
    <div v-else class="notice-empty">
      <strong>这里还没有需求</strong>
      <span>换个筛选条件，或提交第一条需求。</span>
    </div>

    <footer v-if="boardTotal > query.pageSize" class="notice-pager">
      <span>第 {{ query.pageNo }} / {{ totalPages }} 页</span>
      <div>
        <button type="button" class="notice-plain-button" :disabled="query.pageNo <= 1 || boardLoading" @click="changePage(-1)">上一页</button>
        <button type="button" class="notice-plain-button" :disabled="query.pageNo >= totalPages || boardLoading" @click="changePage(1)">下一页</button>
      </div>
    </footer>
      </div>
    </Transition>

    <MacDialog
      v-model="showFormDialog"
      :title="formMode === 'create' ? '发布需求' : '编辑需求'"
      subtitle="选择所属应用，让这条需求更容易被找到。"
      width="640px"
      panel-class="requirement-form-dialog"
      mobile-presentation="sheet"
      :close-disabled="formSubmitting"
      @cancel="closeFormDialog"
    >
      <form id="requirement-form" class="notice-form" @submit.prevent="submitRequirementForm">
        <label>
          <span>所属应用</span>
          <select v-model="requirementForm.appCode" required>
            <option disabled value="">请选择应用</option>
            <option v-for="app in applicationOptions" :key="app.appCode" :value="app.appCode">
              {{ app.appName }}
            </option>
          </select>
        </label>
        <label>
          <span>优先级</span>
          <select v-model="requirementForm.priority" required>
            <option v-for="priority in priorityOptions" :key="priority.value" :value="priority.value">
              {{ priority.label }}
            </option>
          </select>
        </label>
        <label>
          <span>需求标题</span>
          <input v-model.trim="requirementForm.title" maxlength="100" required placeholder="一句话说清楚想要什么">
        </label>
        <label>
          <span>详细描述 <em>可选</em></span>
          <textarea v-model.trim="requirementForm.description" maxlength="2000" rows="5" placeholder="补充使用场景、当前问题或期待结果"></textarea>
        </label>
      </form>
      <template #footer>
        <button type="submit" class="notice-primary-button" form="requirement-form" :disabled="formSubmitting">
          {{ formSubmitting ? '保存中...' : (formMode === 'create' ? '发布' : '保存修改') }}
        </button>
      </template>
    </MacDialog>

    <MacDialog
      v-model="showDetailDialog"
      :title="detailRequirement?.title || '需求详情'"
      width="800px"
      panel-class="requirement-detail-dialog"
      mobile-presentation="fullScreen"
      :close-disabled="detailSubmitting"
      @cancel="closeDetailDialog"
    >
      <div v-if="detailLoading" class="notice-empty">正在读取需求详情...</div>
      <div v-else-if="detailRequirement" class="notice-detail">
        <div class="notice-detail-topline">
          <span class="notice-app">
            <span class="notice-app-mark" aria-hidden="true">{{ appMark(detailRequirement.appName) }}</span>
            {{ detailRequirement.appName || '通用' }}
          </span>
          <span class="notice-status">
            <span class="notice-status-dot" :class="statusClass(detailRequirement.status)" aria-hidden="true"></span>
            {{ formatStatus(detailRequirement.status) }}
          </span>
          <span class="notice-priority" :class="priorityClass(detailRequirement.priority)">
            {{ formatPriority(detailRequirement.priority) }}优先级
          </span>
          <span>{{ detailRequirement.creatorName || '未知用户' }} · {{ formatDateTime(detailRequirement.createdAt) }}</span>
        </div>

        <form v-if="detailEditing" id="requirement-edit-form" class="notice-form" @submit.prevent="submitContentUpdate">
          <label>
            <span>所属应用</span>
            <select v-model="requirementForm.appCode" required>
              <option v-for="app in applicationOptions" :key="app.appCode" :value="app.appCode">{{ app.appName }}</option>
            </select>
          </label>
          <label>
            <span>优先级</span>
            <select v-model="requirementForm.priority" required>
              <option v-for="priority in priorityOptions" :key="priority.value" :value="priority.value">
                {{ priority.label }}
              </option>
            </select>
          </label>
          <label>
            <span>需求标题</span>
            <input v-model.trim="requirementForm.title" maxlength="100" required>
          </label>
          <label>
            <span>详细描述 <em>可选</em></span>
            <textarea v-model.trim="requirementForm.description" maxlength="2000" rows="5"></textarea>
          </label>
        </form>
        <p v-else class="notice-detail-description">{{ detailRequirement.description || '提交者暂未补充详细描述。' }}</p>

        <section v-if="!detailEditing" class="notice-progress" aria-labelledby="requirement-progress-title">
          <div>
            <h3 id="requirement-progress-title">更新进度</h3>
            <p>每次状态变化都会保留在时间线中。</p>
          </div>
          <form id="requirement-progress-form" class="notice-progress-form" @submit.prevent="submitProgressUpdate">
            <label>
              <span>状态</span>
              <select v-model="progressForm.status">
                <option v-for="option in boardStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>
            </label>
            <label>
              <span>处理说明 <em>可选</em></span>
              <input v-model.trim="progressForm.remark" maxlength="300" placeholder="例如：已纳入下个迭代">
            </label>
          </form>
        </section>

        <section v-if="!detailEditing" class="notice-timeline" aria-labelledby="requirement-timeline-title">
          <div class="notice-timeline-heading">
            <h3 id="requirement-timeline-title">进度记录</h3>
            <span>{{ detailRequirement.progressLogs?.length || 0 }} 条</span>
          </div>
          <ol v-if="detailRequirement.progressLogs?.length">
            <li v-for="log in detailRequirement.progressLogs" :key="log.id">
              <span class="notice-timeline-marker" :class="statusClass(log.status)" aria-hidden="true"></span>
              <div>
                <strong>{{ formatStatus(log.status) }}</strong>
                <p v-if="log.remark">{{ log.remark }}</p>
                <span>{{ log.operatorName || '未知用户' }} · {{ formatDateTime(log.createdAt) }}</span>
              </div>
            </li>
          </ol>
        </section>
      </div>
      <template #footer>
        <template v-if="detailRequirement && !detailLoading">
          <button v-if="detailEditing" type="button" class="notice-plain-button" :disabled="detailSubmitting" @click="cancelContentEdit">取消</button>
          <button v-else-if="canEditDetail" type="button" class="notice-plain-button" :disabled="detailSubmitting" @click="startContentEdit">编辑</button>
          <button v-if="canDeleteDetail && !detailEditing" type="button" class="notice-danger-button" :disabled="detailSubmitting" @click="removeRequirement">删除</button>
          <button v-if="detailEditing" type="submit" class="notice-primary-button" form="requirement-edit-form" :disabled="detailSubmitting">
            {{ detailSubmitting ? '保存中...' : '保存修改' }}
          </button>
          <button
            v-else
            type="submit"
            class="notice-primary-button"
            form="requirement-progress-form"
            :disabled="detailSubmitting || progressForm.status === detailRequirement.status"
          >
            {{ detailSubmitting ? '更新中...' : '更新进度' }}
          </button>
        </template>
      </template>
    </MacDialog>
  </section>
</template>

<script>
import {computed, onBeforeUnmount, onMounted, reactive, ref} from 'vue'
import MacDialog from '@/components/MacDialog.vue'
import {confirmDialog} from '@/components/systemDialog'
import {
  createRequirementItem,
  deleteRequirementItem,
  getRequirementItemDetail,
  listRequirementApps,
  listRequirementItems,
  updateRequirementItem,
  updateRequirementItemProgress
} from '@/api/requirementBoard'

const STATUS_OPTIONS = [
  {value: '', label: '全部'},
  {value: 'PENDING_REVIEW', label: '待评估'},
  {value: 'PLANNED', label: '已规划'},
  {value: 'IN_PROGRESS', label: '进行中'},
  {value: 'COMPLETED', label: '已完成'},
  {value: 'DECLINED', label: '不采纳'}
]
const BOARD_STATUS_OPTIONS = STATUS_OPTIONS.filter((item) => item.value)
const PRIORITY_OPTIONS = [
  {value: 'HIGH', label: '高'},
  {value: 'MEDIUM', label: '中'},
  {value: 'LOW', label: '低'}
]

function unwrapData(response) {
  const payload = response?.data
  return payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')
    ? payload.data
    : payload
}

function extractErrorMessage(error, fallback) {
  const payload = error?.response?.data || {}
  return payload.message || payload.msg || fallback
}

function buildRequirementForm(appCode = '') {
  return {id: null, appCode, priority: 'MEDIUM', title: '', description: '', version: null}
}

function buildProgressForm(status = 'PENDING_REVIEW') {
  return {status, remark: ''}
}

export default {
  name: 'RequirementBoard',
  components: {MacDialog},
  props: {
    currentUser: {
      type: Object,
      default: () => ({})
    }
  },
  emits: ['notice'],
  setup(props, {emit}) {
    const requirements = ref([])
    const panelOpen = ref(false)
    const applicationOptions = ref([])
    const statusCounts = ref([])
    const boardTotal = ref(0)
    const boardLoading = ref(false)
    const boardError = ref('')
    const showFormDialog = ref(false)
    const formMode = ref('create')
    const formSubmitting = ref(false)
    const showDetailDialog = ref(false)
    const detailLoading = ref(false)
    const detailSubmitting = ref(false)
    const detailRequirement = ref(null)
    const detailEditing = ref(false)
    const requirementForm = reactive(buildRequirementForm())
    const progressForm = reactive(buildProgressForm())
    const query = reactive({pageNo: 1, pageSize: 50, keyword: '', status: '', appCode: '', priority: ''})
    let panelHideTimer = null

    const totalPages = computed(() => Math.max(1, Math.ceil(boardTotal.value / query.pageSize)))
    const allStatusCount = computed(() => statusCounts.value.reduce((total, item) => total + Number(item.count || 0), 0))
    const currentUserId = computed(() => `${props.currentUser?.id ?? props.currentUser?.userId ?? ''}`)
    const isCurrentUserAdmin = computed(() => `${props.currentUser?.roleCode || props.currentUser?.role || ''}`.toUpperCase() === 'ADMIN')
    const canEditDetail = computed(() => detailRequirement.value && `${detailRequirement.value.creatorUserId}` === currentUserId.value)
    const canDeleteDetail = computed(() => canEditDetail.value || isCurrentUserAdmin.value)

    const resetRequirementForm = (appCode = '') => Object.assign(requirementForm, buildRequirementForm(appCode))
    const resetProgressForm = (status = 'PENDING_REVIEW') => Object.assign(progressForm, buildProgressForm(status))

    const loadApps = async () => {
      try {
        const payload = unwrapData(await listRequirementApps())
        applicationOptions.value = Array.isArray(payload) ? payload : []
      } catch (error) {
        applicationOptions.value = []
        emit('notice', 'error', '应用列表加载失败', extractErrorMessage(error, '暂时无法选择需求所属应用，请稍后刷新。'))
      }
    }

    const loadBoard = async () => {
      boardLoading.value = true
      boardError.value = ''
      try {
        const payload = unwrapData(await listRequirementItems({...query})) || {}
        requirements.value = Array.isArray(payload.list) ? payload.list : []
        statusCounts.value = Array.isArray(payload.statusCounts) ? payload.statusCounts : []
        boardTotal.value = Number(payload.total || 0)
      } catch (error) {
        boardError.value = extractErrorMessage(error, '需求看板暂时无法加载，请稍后重试。')
        requirements.value = []
        statusCounts.value = []
        boardTotal.value = 0
      } finally {
        boardLoading.value = false
      }
    }

    const getStatusCount = (status) => {
      if (!status) {
        return allStatusCount.value
      }
      return Number(statusCounts.value.find((item) => item.status === status)?.count || 0)
    }

    const switchStatusFilter = (status) => {
      query.status = status
      query.pageNo = 1
      loadBoard()
    }

    const handleSearch = () => {
      query.pageNo = 1
      loadBoard()
    }

    const handleFilterChange = () => {
      query.pageNo = 1
      loadBoard()
    }

    const changePage = (offset) => {
      const targetPage = query.pageNo + offset
      if (targetPage < 1 || targetPage > totalPages.value) {
        return
      }
      query.pageNo = targetPage
      loadBoard()
    }

    const cancelPanelHide = () => {
      if (panelHideTimer !== null) {
        window.clearTimeout(panelHideTimer)
        panelHideTimer = null
      }
    }

    const closePanel = () => {
      cancelPanelHide()
      panelOpen.value = false
    }

    const schedulePanelHide = () => {
      cancelPanelHide()
      if (!panelOpen.value || showFormDialog.value || showDetailDialog.value) {
        return
      }
      panelHideTimer = window.setTimeout(() => {
        panelOpen.value = false
        panelHideTimer = null
      }, 2200)
    }

    const togglePanel = () => {
      cancelPanelHide()
      panelOpen.value = !panelOpen.value
    }

    const openCreateDialog = () => {
      formMode.value = 'create'
      resetRequirementForm(applicationOptions.value[0]?.appCode || '')
      closePanel()
      showFormDialog.value = true
    }

    const closeFormDialog = (force = false) => {
      if (formSubmitting.value && !force) {
        return
      }
      showFormDialog.value = false
      resetRequirementForm()
    }

    const submitRequirementForm = async () => {
      formSubmitting.value = true
      try {
        await createRequirementItem({
          appCode: requirementForm.appCode,
          priority: requirementForm.priority,
          title: requirementForm.title,
          description: requirementForm.description || null
        })
        emit('notice', 'success', '需求已提交', '需求已共享给所有登录用户。')
        closeFormDialog(true)
        await loadBoard()
      } catch (error) {
        emit('notice', 'error', '保存失败', extractErrorMessage(error, '保存需求失败，请稍后重试。'))
      } finally {
        formSubmitting.value = false
      }
    }

    const openDetailDialog = async (item) => {
      detailRequirement.value = null
      detailEditing.value = false
      closePanel()
      showDetailDialog.value = true
      detailLoading.value = true
      try {
        detailRequirement.value = unwrapData(await getRequirementItemDetail(item.id)) || null
        resetProgressForm(detailRequirement.value?.status)
      } catch (error) {
        emit('notice', 'error', '读取失败', extractErrorMessage(error, '读取需求详情失败，请稍后重试。'))
        showDetailDialog.value = false
      } finally {
        detailLoading.value = false
      }
    }

    const closeDetailDialog = (force = false) => {
      if (detailSubmitting.value && !force) {
        return
      }
      showDetailDialog.value = false
      detailEditing.value = false
      detailRequirement.value = null
      resetRequirementForm()
      resetProgressForm()
    }

    const startContentEdit = () => {
      if (!detailRequirement.value) {
        return
      }
      Object.assign(requirementForm, {
        id: detailRequirement.value.id,
        appCode: detailRequirement.value.appCode,
        priority: detailRequirement.value.priority || 'MEDIUM',
        title: detailRequirement.value.title,
        description: detailRequirement.value.description || '',
        version: detailRequirement.value.version
      })
      detailEditing.value = true
    }

    const cancelContentEdit = () => {
      detailEditing.value = false
      resetRequirementForm()
    }

    const submitContentUpdate = async () => {
      detailSubmitting.value = true
      try {
        detailRequirement.value = unwrapData(await updateRequirementItem(requirementForm.id, {
          appCode: requirementForm.appCode,
          priority: requirementForm.priority,
          title: requirementForm.title,
          description: requirementForm.description || null,
          version: requirementForm.version
        }))
        resetProgressForm(detailRequirement.value.status)
        detailEditing.value = false
        await loadBoard()
        emit('notice', 'success', '需求已更新', '需求内容和所属应用已保存。')
      } catch (error) {
        emit('notice', 'error', '更新失败', extractErrorMessage(error, '需求可能已被其他用户更新，请刷新后重试。'))
      } finally {
        detailSubmitting.value = false
      }
    }

    const submitProgressUpdate = async () => {
      if (!detailRequirement.value || progressForm.status === detailRequirement.value.status) {
        return
      }
      detailSubmitting.value = true
      try {
        detailRequirement.value = unwrapData(await updateRequirementItemProgress(detailRequirement.value.id, {
          status: progressForm.status,
          remark: progressForm.remark || null,
          version: detailRequirement.value.version
        }))
        resetProgressForm(detailRequirement.value.status)
        await loadBoard()
        emit('notice', 'success', '进度已同步', `需求已更新为“${formatStatus(detailRequirement.value.status)}”。`)
      } catch (error) {
        emit('notice', 'error', '更新失败', extractErrorMessage(error, '需求可能已被其他用户更新，请刷新后重试。'))
      } finally {
        detailSubmitting.value = false
      }
    }

    const removeRequirement = async () => {
      if (!detailRequirement.value) {
        return
      }
      const confirmed = await confirmDialog(`确定删除需求“${detailRequirement.value.title}”吗？相关进度记录将一并删除。`, {
        title: '删除共享需求',
        confirmText: '删除需求',
        tone: 'danger'
      })
      if (!confirmed) {
        return
      }
      detailSubmitting.value = true
      try {
        await deleteRequirementItem(detailRequirement.value.id, detailRequirement.value.version)
        closeDetailDialog(true)
        await loadBoard()
        emit('notice', 'success', '需求已删除', '需求及其进度记录已删除。')
      } catch (error) {
        emit('notice', 'error', '删除失败', extractErrorMessage(error, '需求可能已被其他用户更新，请刷新后重试。'))
      } finally {
        detailSubmitting.value = false
      }
    }

    const formatStatus = (status) => BOARD_STATUS_OPTIONS.find((item) => item.value === status)?.label || status || '-'
    const statusClass = (status) => status ? `status-${status.toLowerCase().replace(/_/g, '-')}` : ''
    const formatPriority = (priority) => PRIORITY_OPTIONS.find((item) => item.value === priority)?.label || '中'
    const priorityClass = (priority) => `priority-${(priority || 'MEDIUM').toLowerCase()}`
    const appMark = (appName) => (appName || '通').trim().slice(0, 1)
    const formatDateTime = (value) => {
      if (!value) {
        return '-'
      }
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) {
        return value
      }
      const month = `${date.getMonth() + 1}`.padStart(2, '0')
      const day = `${date.getDate()}`.padStart(2, '0')
      const hour = `${date.getHours()}`.padStart(2, '0')
      const minute = `${date.getMinutes()}`.padStart(2, '0')
      return `${month}-${day} ${hour}:${minute}`
    }

    onMounted(() => Promise.all([loadApps(), loadBoard()]))
    onBeforeUnmount(cancelPanelHide)

    return {
      requirements,
      panelOpen,
      applicationOptions,
      boardTotal,
      allStatusCount,
      boardLoading,
      boardError,
      statusOptions: STATUS_OPTIONS,
      boardStatusOptions: BOARD_STATUS_OPTIONS,
      priorityOptions: PRIORITY_OPTIONS,
      query,
      totalPages,
      showFormDialog,
      formMode,
      formSubmitting,
      showDetailDialog,
      detailLoading,
      detailSubmitting,
      detailRequirement,
      detailEditing,
      requirementForm,
      progressForm,
      canEditDetail,
      canDeleteDetail,
      getStatusCount,
      switchStatusFilter,
      handleSearch,
      handleFilterChange,
      loadBoard,
      changePage,
      cancelPanelHide,
      closePanel,
      schedulePanelHide,
      togglePanel,
      openCreateDialog,
      closeFormDialog,
      submitRequirementForm,
      openDetailDialog,
      closeDetailDialog,
      startContentEdit,
      cancelContentEdit,
      submitContentUpdate,
      submitProgressUpdate,
      removeRequirement,
      formatStatus,
      statusClass,
      formatPriority,
      priorityClass,
      appMark,
      formatDateTime
    }
  }
}
</script>

<style scoped>
.notice-board {
  position: fixed;
  z-index: 70;
  right: 28px;
  bottom: 24px;
  display: inline-flex;
  flex: 0 0 auto;
  color: var(--theme-text);
}

.board-trigger {
  min-height: 36px;
  border: 1px solid var(--theme-border);
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 11px;
  color: var(--theme-text-soft);
  background: var(--theme-control-surface);
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 90ms ease-out, border-color 150ms ease, background 150ms ease;
}

.board-trigger:hover,
.board-trigger[aria-expanded='true'] {
  border-color: color-mix(in srgb, var(--theme-accent) 42%, var(--theme-border));
  background: var(--theme-surface-hover);
}

.board-trigger:active {
  transform: scale(0.975);
}

.board-trigger-icon {
  color: var(--theme-accent);
  font-size: 15px;
  line-height: 1;
}

.board-trigger small {
  min-width: 17px;
  height: 17px;
  border-radius: 999px;
  display: inline-grid;
  place-items: center;
  padding: 0 3px;
  color: var(--theme-text-muted);
  background: var(--theme-surface-muted);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}

.board-popover {
  position: absolute;
  z-index: 80;
  bottom: calc(100% + 9px);
  right: 0;
  width: min(760px, calc(100vw - 64px));
  max-height: min(680px, calc(100vh - 150px));
  overflow-y: auto;
  box-sizing: border-box;
  padding: 16px;
  border: 1px solid color-mix(in srgb, var(--theme-border-strong) 86%, white);
  border-radius: 16px;
  background: color-mix(in srgb, var(--theme-surface) 91%, transparent);
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.2), var(--theme-shadow-sm);
  backdrop-filter: blur(24px) saturate(155%);
  transform-origin: bottom right;
  overscroll-behavior: contain;
}

.board-popover-enter-active,
.board-popover-leave-active {
  transition: opacity 150ms ease, transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
}

.board-popover-enter-from,
.board-popover-leave-to {
  opacity: 0;
  transform: translateY(5px) scale(0.985);
}

.notice-board h2,
.notice-board h3,
.notice-board p {
  margin: 0;
}

.notice-board-header,
.notice-board-heading,
.notice-board-header-actions,
.notice-toolbar,
.notice-card-topline,
.notice-card-meta,
.notice-detail-topline,
.notice-timeline-heading,
.notice-pager {
  display: flex;
  align-items: center;
}

.notice-board-header {
  justify-content: space-between;
  gap: 16px;
}

.notice-board-heading {
  gap: 12px;
}

.notice-board-kicker {
  display: grid;
  width: 38px;
  height: 38px;
  border-radius: 11px;
  place-items: center;
  color: var(--theme-accent);
  background: color-mix(in srgb, var(--theme-accent) 11%, var(--theme-control-surface));
  font-size: 10px;
  font-weight: 800;
}

.notice-board h2 {
  font-size: clamp(1.18rem, 2vw, 1.42rem);
  line-height: 1.18;
  letter-spacing: -0.025em;
}

.notice-board-header p {
  margin-top: 3px;
  color: var(--theme-text-muted);
  font-size: 12px;
  line-height: 1.45;
}

.notice-board-header-actions {
  flex: 0 0 auto;
  gap: 10px;
}

.notice-board-total {
  color: var(--theme-text-muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.notice-primary-button,
.notice-plain-button,
.notice-danger-button,
.notice-icon-button,
.board-close-button,
.notice-status-filter button,
.notice-card,
.notice-inline-error button {
  font: inherit;
  cursor: pointer;
}

.notice-primary-button,
.notice-plain-button,
.notice-danger-button,
.notice-icon-button {
  min-height: 34px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  transition: transform 90ms ease-out, background 150ms ease, border-color 150ms ease, opacity 150ms ease;
}

.board-close-button {
  width: 30px;
  min-height: 30px;
  border: 0;
  border-radius: 8px;
  padding: 0;
  color: var(--theme-text-muted);
  background: transparent;
  font-size: 19px;
  line-height: 1;
}

.board-close-button:hover {
  color: var(--theme-text);
  background: var(--theme-surface-hover);
}

.notice-primary-button {
  border: 1px solid var(--theme-accent);
  padding: 0 12px;
  color: var(--theme-on-accent);
  background: var(--theme-accent);
}

.notice-primary-button span {
  margin-right: 2px;
  font-size: 16px;
}

.notice-plain-button,
.notice-danger-button {
  border: 1px solid var(--theme-border);
  padding: 0 12px;
  color: var(--theme-text-soft);
  background: var(--theme-control-surface);
}

.notice-danger-button {
  color: var(--theme-danger);
}

.notice-icon-button {
  width: 36px;
  border: 1px solid var(--theme-border);
  padding: 0;
  color: var(--theme-text-muted);
  background: var(--theme-control-surface);
  font-size: 18px;
}

.notice-primary-button:active,
.notice-plain-button:active,
.notice-danger-button:active,
.notice-icon-button:active,
.notice-status-filter button:active,
.notice-card:active {
  transform: scale(0.975);
}

.notice-primary-button:disabled,
.notice-plain-button:disabled,
.notice-danger-button:disabled,
.notice-icon-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.notice-toolbar {
  gap: 8px;
  margin-top: 16px;
}

.notice-search {
  position: relative;
  flex: 1 1 280px;
  max-width: 420px;
}

.notice-search-icon {
  position: absolute;
  top: 50%;
  left: 11px;
  color: var(--theme-text-muted);
  transform: translateY(-52%);
  pointer-events: none;
}

.notice-search input,
.notice-select select,
.notice-form input,
.notice-form textarea,
.notice-form select,
.notice-progress-form input,
.notice-progress-form select {
  box-sizing: border-box;
  width: 100%;
  border: 1px solid var(--theme-border);
  border-radius: 10px;
  outline: none;
  color: var(--theme-text);
  font: inherit;
  background: var(--theme-control-surface);
  transition: border-color 150ms ease, box-shadow 150ms ease;
}

.notice-search input,
.notice-select select,
.notice-form input,
.notice-form select,
.notice-progress-form input,
.notice-progress-form select {
  min-height: 36px;
  padding: 0 11px;
}

.notice-search input {
  padding-left: 31px;
}

.notice-select {
  flex: 0 1 180px;
}

.notice-search input:focus,
.notice-select select:focus,
.notice-form input:focus,
.notice-form textarea:focus,
.notice-form select:focus,
.notice-progress-form input:focus,
.notice-progress-form select:focus {
  border-color: var(--theme-accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--theme-accent) 16%, transparent);
}

.notice-status-filter {
  display: flex;
  gap: 3px;
  margin: 10px 0 13px;
  overflow-x: auto;
  scrollbar-width: none;
}

.notice-status-filter::-webkit-scrollbar {
  display: none;
}

.notice-status-filter button {
  min-height: 30px;
  border: 0;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 9px;
  white-space: nowrap;
  color: var(--theme-text-muted);
  background: transparent;
  font-size: 12px;
  transition: transform 90ms ease-out, color 150ms ease, background 150ms ease;
}

.notice-status-filter button:hover,
.notice-status-filter button.active {
  color: var(--theme-text);
  background: var(--theme-surface-hover);
}

.notice-status-filter small {
  color: var(--theme-text-muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.notice-status-dot {
  width: 7px;
  height: 7px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: var(--theme-text-muted);
}

.notice-status-dot.status-pending-review,
.notice-timeline-marker.status-pending-review { background: #d97706; }
.notice-status-dot.status-planned,
.notice-timeline-marker.status-planned { background: #2563eb; }
.notice-status-dot.status-in-progress,
.notice-timeline-marker.status-in-progress { background: #7c3aed; }
.notice-status-dot.status-completed,
.notice-timeline-marker.status-completed { background: #059669; }
.notice-status-dot.status-declined,
.notice-timeline-marker.status-declined { background: #6b7280; }

.notice-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
  gap: 9px;
}

.notice-card {
  min-width: 0;
  min-height: 132px;
  border: 1px solid var(--theme-border);
  border-radius: 13px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 13px;
  color: var(--theme-text);
  text-align: left;
  background: var(--theme-control-surface);
  transition: transform 90ms ease-out, border-color 150ms ease, background 150ms ease;
}

.notice-card:hover {
  border-color: color-mix(in srgb, var(--theme-accent) 38%, var(--theme-border));
  background: var(--theme-surface-hover);
}

.notice-card-topline {
  justify-content: space-between;
  gap: 10px;
}

.notice-app,
.notice-status,
.notice-priority {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
  color: var(--theme-text-muted);
  font-size: 11px;
}

.notice-card-badges {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 7px;
}

.notice-priority {
  min-height: 19px;
  border-radius: 6px;
  padding: 0 6px;
  font-weight: 750;
}

.notice-priority.priority-high {
  color: #b42318;
  background: color-mix(in srgb, #ef4444 12%, var(--theme-control-surface));
}

.notice-priority.priority-medium {
  color: #b54708;
  background: color-mix(in srgb, #f59e0b 13%, var(--theme-control-surface));
}

.notice-priority.priority-low {
  color: #344054;
  background: color-mix(in srgb, #64748b 11%, var(--theme-control-surface));
}

.notice-app {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notice-app-mark {
  display: grid;
  width: 19px;
  height: 19px;
  flex: 0 0 auto;
  border-radius: 6px;
  place-items: center;
  color: var(--theme-accent);
  background: color-mix(in srgb, var(--theme-accent) 12%, var(--theme-surface));
  font-size: 10px;
  font-weight: 800;
}

.notice-card > strong {
  overflow: hidden;
  font-size: 14px;
  font-weight: 760;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notice-card-description {
  display: -webkit-box;
  overflow: hidden;
  color: var(--theme-text-muted);
  font-size: 12px;
  line-height: 1.5;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.notice-card-meta {
  justify-content: space-between;
  gap: 10px;
  margin-top: auto;
  color: var(--theme-text-muted);
  font-size: 11px;
}

.notice-empty {
  display: grid;
  min-height: 150px;
  place-content: center;
  gap: 5px;
  color: var(--theme-text-muted);
  text-align: center;
  font-size: 13px;
}

.notice-empty strong {
  color: var(--theme-text-soft);
  font-size: 14px;
}

.notice-inline-error {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  padding: 10px 11px;
  border: 1px solid color-mix(in srgb, var(--theme-danger) 35%, var(--theme-border));
  border-radius: 10px;
  color: var(--theme-danger);
  background: color-mix(in srgb, var(--theme-danger) 7%, var(--theme-control-surface));
  font-size: 12px;
}

.notice-inline-error button {
  border: 0;
  color: inherit;
  background: transparent;
  text-decoration: underline;
}

.notice-pager {
  justify-content: space-between;
  margin-top: 12px;
  color: var(--theme-text-muted);
  font-size: 12px;
}

.notice-pager > div {
  display: flex;
  gap: 7px;
}

.notice-form {
  display: grid;
  gap: 14px;
}

.notice-form label,
.notice-progress-form label {
  display: grid;
  gap: 6px;
  color: var(--theme-text-soft);
  font-size: 13px;
  font-weight: 700;
}

.notice-form em,
.notice-progress-form em {
  color: var(--theme-text-muted);
  font-size: 12px;
  font-style: normal;
  font-weight: 500;
}

.notice-form textarea {
  min-height: 116px;
  padding: 9px 11px;
  resize: vertical;
  line-height: 1.55;
}

.notice-detail {
  display: grid;
  gap: 18px;
}

.notice-detail-topline {
  flex-wrap: wrap;
  gap: 9px;
  color: var(--theme-text-muted);
  font-size: 12px;
}

.notice-detail-description {
  white-space: pre-wrap;
  color: var(--theme-text-soft);
  line-height: 1.7;
}

.notice-progress {
  display: grid;
  gap: 11px;
  padding: 13px;
  border: 1px solid var(--theme-border);
  border-radius: 12px;
  background: var(--theme-surface-muted);
}

.notice-progress h3,
.notice-timeline h3 {
  font-size: 14px;
  letter-spacing: -0.01em;
}

.notice-progress p {
  margin-top: 3px;
  color: var(--theme-text-muted);
  font-size: 12px;
}

.notice-progress-form {
  display: grid;
  grid-template-columns: minmax(130px, 0.4fr) minmax(0, 1fr);
  gap: 10px;
}

.notice-timeline {
  display: grid;
  gap: 11px;
}

.notice-timeline-heading {
  justify-content: space-between;
  color: var(--theme-text-muted);
  font-size: 12px;
}

.notice-timeline ol {
  display: grid;
  gap: 13px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.notice-timeline li {
  position: relative;
  display: grid;
  grid-template-columns: 12px minmax(0, 1fr);
  gap: 9px;
}

.notice-timeline li:not(:last-child)::before {
  position: absolute;
  top: 14px;
  left: 5px;
  width: 1px;
  height: calc(100% + 4px);
  content: '';
  background: var(--theme-border-strong);
}

.notice-timeline-marker {
  position: relative;
  z-index: 1;
  width: 10px;
  height: 10px;
  margin-top: 4px;
  border: 2px solid var(--theme-surface);
  border-radius: 50%;
  box-sizing: border-box;
  background: var(--theme-text-muted);
}

.notice-timeline strong {
  font-size: 13px;
}

.notice-timeline li p {
  margin: 4px 0;
  color: var(--theme-text-soft);
  font-size: 13px;
  line-height: 1.5;
}

.notice-timeline li div > span {
  color: var(--theme-text-muted);
  font-size: 11px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

@media (max-width: 720px) {
  .notice-board {
    right: 14px;
    bottom: 76px;
  }

  .board-trigger {
    width: 36px;
    padding: 0;
    justify-content: center;
  }

  .board-trigger > span:not(.board-trigger-icon),
  .board-trigger small {
    display: none;
  }

  .board-popover {
    position: fixed;
    top: 74px;
    bottom: auto;
    right: 12px;
    left: 12px;
    width: auto;
    max-height: calc(100dvh - 92px);
    padding: 14px;
    transform-origin: bottom right;
  }

  .notice-board-header {
    align-items: flex-start;
  }

  .notice-board-header p,
  .notice-board-total {
    display: none;
  }

  .notice-toolbar {
    flex-wrap: wrap;
  }

  .notice-search {
    max-width: none;
  }

  .notice-select {
    flex: 1 1 160px;
  }

  .notice-grid {
    grid-template-columns: 1fr;
  }

  .notice-progress-form {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .board-trigger,
  .board-popover,
  .notice-primary-button,
  .notice-plain-button,
  .notice-danger-button,
  .notice-icon-button,
  .notice-status-filter button,
  .notice-card {
    transition: opacity 150ms ease, background 150ms ease, border-color 150ms ease;
  }

  .board-popover-enter-from,
  .board-popover-leave-to {
    transform: none;
  }

  .board-trigger:active,
  .notice-primary-button:active,
  .notice-plain-button:active,
  .notice-danger-button:active,
  .notice-icon-button:active,
  .notice-status-filter button:active,
  .notice-card:active {
    transform: none;
  }
}

@media (prefers-reduced-transparency: reduce) {
  .board-popover {
    background: var(--theme-surface);
    backdrop-filter: none;
  }

  .notice-progress {
    background: var(--theme-surface);
  }
}

@media (prefers-contrast: more) {
  .board-popover,
  .board-trigger,
  .notice-card,
  .notice-search input,
  .notice-select select,
  .notice-progress {
    border-color: var(--theme-text);
  }
}
</style>
