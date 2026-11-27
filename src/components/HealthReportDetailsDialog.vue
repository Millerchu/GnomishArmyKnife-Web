<template>
  <MacDialog
    :model-value="modelValue"
    :title="dialogTitle"
    :subtitle="dialogSubtitle"
    width="1080px"
    panel-class="health-report-details-dialog"
    mobile-presentation="fullScreen"
    :dirty="isDirty"
    :close-disabled="saving"
    @update:model-value="handleVisibleChange"
  >
    <div class="details-shell">
      <div v-if="loading && !report" class="details-state">正在加载报告明细...</div>

      <div v-else-if="loadError && !report" class="details-state details-error-box">
        <p>{{ loadError }}</p>
        <button type="button" class="mini-btn" @click="loadDetails">重试加载</button>
      </div>

      <template v-else-if="report">
        <section class="details-card report-overview">
          <div class="overview-meta">
            <div>
              <strong>{{ report.reportTitle }}</strong>
              <p>{{ report.examDate }} · {{ report.hospitalName || '未填写机构' }} · 当前版本 v{{ revision }}</p>
            </div>
            <a
              v-if="report.reportUrl && !report.attachments?.length"
              class="mini-btn link-btn"
              :href="report.reportUrl"
              target="_blank"
              rel="noopener"
            >
              查看原附件：{{ report.reportFileName || '报告文件' }}
            </a>
          </div>
          <AttachmentGallery v-if="report.attachments?.length" :attachments="report.attachments" />
        </section>

        <section class="details-card link-section">
          <div class="section-head">
            <div>
              <h3>关联核心指标记录</h3>
              <p>每份报告最多关联一条核心指标记录，需手动确认选择。</p>
            </div>
          </div>

          <div v-if="linkedRecordId" class="selected-link-box">
            <div class="selected-link-info">
              <span class="link-badge">已选择关联</span>
              <strong v-if="selectedRecordDetail">{{ selectedRecordDetail.measureDate }} · {{ formatRecordBrief(selectedRecordDetail) }}</strong>
              <strong v-else>记录 ID：{{ linkedRecordId }}</strong>
              <small v-if="selectedRecordDetail?.note">备注：{{ selectedRecordDetail.note }}</small>
            </div>
            <div class="inline-actions">
              <button type="button" class="mini-btn" @click="emitOpenRecord(linkedRecordId)">查看核心指标</button>
              <button type="button" class="mini-btn danger" :disabled="saving" @click="clearLinkedRecord">解除关联</button>
            </div>
          </div>
          <p v-else class="muted-tip">当前未关联核心指标记录。</p>

          <div class="candidate-toolbar">
            <label class="inline-field">
              <span>按测量日期查询</span>
              <input v-model="candidateDate" class="input compact-input" type="date" />
            </label>
            <button type="button" class="mini-btn" :disabled="candidatesLoading" @click="searchCandidates(1)">查询候选</button>
            <button v-if="candidateDate" type="button" class="mini-btn" :disabled="candidatesLoading" @click="clearCandidateDate">查看全部日期</button>
          </div>

          <p v-if="candidatesError" class="inline-error">{{ candidatesError }}</p>
          <div v-else-if="candidatesLoading" class="muted-tip">正在加载候选核心指标...</div>
          <div v-else-if="candidates.length" class="candidate-list">
            <div
              v-for="candidate in candidates"
              :key="String(candidate.id)"
              class="candidate-row"
              :class="{ selected: String(candidate.id) === linkedRecordId }"
            >
              <div class="candidate-main">
                <strong>{{ candidate.measureDate }}</strong>
                <span>{{ formatRecordBrief(candidate) }}</span>
                <small v-if="candidate.note">备注：{{ candidate.note }}</small>
              </div>
              <div class="candidate-actions">
                <span v-if="isLinkedToOtherReport(candidate)" class="occupied-tag">已关联其他报告</span>
                <button
                  v-else-if="String(candidate.id) === linkedRecordId"
                  type="button"
                  class="mini-btn active-btn"
                  disabled
                >
                  当前已选
                </button>
                <button
                  v-else
                  type="button"
                  class="mini-btn"
                  :disabled="saving"
                  @click="selectCandidate(candidate)"
                >
                  选择关联
                </button>
              </div>
            </div>
            <div v-if="candidateTotal > CANDIDATE_PAGE_SIZE" class="candidate-pager">
              <span>共 {{ candidateTotal }} 条，第 {{ candidatePageNo }} / {{ candidateTotalPages }} 页</span>
              <div class="inline-actions">
                <button type="button" class="mini-btn" :disabled="candidatePageNo <= 1 || candidatesLoading" @click="searchCandidates(candidatePageNo - 1)">上一页</button>
                <button type="button" class="mini-btn" :disabled="candidatePageNo >= candidateTotalPages || candidatesLoading" @click="searchCandidates(candidatePageNo + 1)">下一页</button>
              </div>
            </div>
          </div>
          <p v-else class="muted-tip">该条件下暂无核心指标候选记录。</p>
        </section>

        <section class="details-card items-section">
          <div class="section-head">
            <div>
              <h3>检查结果明细（共 {{ draftItems.length }} 项）</h3>
              <p>筛选仅影响当前视图，保存时始终提交完整明细清单。</p>
            </div>
            <div class="inline-actions">
              <button type="button" class="mini-btn" :disabled="saving || draftItems.length >= 200" @click="addCustomItem">新增自定义项</button>
            </div>
          </div>

          <div class="catalog-adder">
            <select v-model="addGroup" class="input compact-input" aria-label="新增内置项分组" @change="addCatalogCode = ''">
              <option v-for="group in catalogAddGroups" :key="group.code" :value="group.code">{{ group.label }}</option>
            </select>
            <select v-model="addCatalogCode" class="input compact-input" aria-label="选择内置项目">
              <option value="">选择内置检查项...</option>
              <option v-for="item in addGroupCatalogItems" :key="item.itemCode" :value="item.itemCode">
                {{ item.name }}{{ item.defaultUnit ? ` (${item.defaultUnit})` : '' }}
              </option>
            </select>
            <button type="button" class="mini-btn" :disabled="saving || !addCatalogCode || draftItems.length >= 200" @click="addBuiltInItem">
              添加内置项
            </button>
          </div>

          <div class="filter-bar">
            <label class="inline-field">
              <span>类别筛选</span>
              <select v-model="filterGroup" class="input compact-input" aria-label="按类别筛选">
                <option value="">全部分组</option>
                <option v-for="group in REPORT_ITEM_GROUPS" :key="group.code" :value="group.code">{{ group.label }}</option>
              </select>
            </label>
            <label class="inline-field">
              <span>异常标记筛选</span>
              <select v-model="filterAbnormalFlag" class="input compact-input" aria-label="按异常标记筛选">
                <option value="">全部标记</option>
                <option v-for="flag in REPORT_ABNORMAL_FLAGS" :key="flag.code" :value="flag.code">{{ flag.label }}</option>
              </select>
            </label>
            <span v-if="filterGroup || filterAbnormalFlag" class="filter-hint">
              当前显示 {{ visibleEntries.length }} / {{ draftItems.length }} 项
            </span>
          </div>

          <div v-if="saveError" class="details-error-box">
            <p>{{ saveError }}</p>
            <button v-if="isConflictError" type="button" class="mini-btn" @click="loadDetails">重新加载最新明细</button>
          </div>

          <div v-if="visibleEntries.length" class="detail-items-list">
            <article
              v-for="entry in visibleEntries"
              :key="entry.item._uid"
              class="detail-item-row"
              :class="{ 'has-error': Boolean(rowErrors[entry.item._uid]) }"
            >
              <div class="item-row-head">
                <span class="row-index">#{{ entry.index + 1 }}</span>
                <span class="group-tag">{{ getGroupLabel(entry.item.group) }}</span>
                <span v-if="entry.item.itemCode" class="code-tag">{{ entry.item.itemCode }}</span>
                <span v-else class="code-tag custom">自定义</span>
                <div class="row-ops">
                  <button type="button" class="mini-btn" :disabled="saving || entry.index === 0" @click="moveItem(entry.index, -1)">上移</button>
                  <button type="button" class="mini-btn" :disabled="saving || entry.index === draftItems.length - 1" @click="moveItem(entry.index, 1)">下移</button>
                  <button type="button" class="mini-btn danger" :disabled="saving" @click="removeItem(entry.index)">删除</button>
                </div>
              </div>

              <div class="item-fields-grid">
                <label class="field-cell">
                  <span>分组</span>
                  <select
                    v-model="entry.item.group"
                    class="input compact-input"
                    :disabled="Boolean(entry.item.itemCode)"
                    @change="clearRowError(entry.item._uid, 'group')"
                  >
                    <option v-for="group in REPORT_ITEM_GROUPS" :key="group.code" :value="group.code">{{ group.label }}</option>
                  </select>
                </label>

                <label class="field-cell">
                  <span>项目名称 *</span>
                  <input
                    v-model="entry.item.name"
                    class="input compact-input"
                    :class="{ 'input-invalid': Boolean(rowErrors[entry.item._uid]?.name) }"
                    maxlength="80"
                    @input="clearRowError(entry.item._uid, 'name')"
                  />
                  <small v-if="rowErrors[entry.item._uid]?.name" class="field-error">{{ rowErrors[entry.item._uid].name }}</small>
                </label>

                <label class="field-cell">
                  <span>结果类型 *</span>
                  <select
                    v-model="entry.item.resultType"
                    class="input compact-input"
                    @change="clearRowError(entry.item._uid, 'resultText')"
                  >
                    <option v-for="type in REPORT_RESULT_TYPES" :key="type.code" :value="type.code">{{ type.label }}</option>
                  </select>
                </label>

                <label class="field-cell field-wide">
                  <span>原始结果 *</span>
                  <input
                    v-model="entry.item.resultText"
                    class="input compact-input"
                    :class="{ 'input-invalid': Boolean(rowErrors[entry.item._uid]?.resultText) }"
                    :maxlength="entry.item.resultType === 'TEXT' ? 1000 : 80"
                    placeholder="如 1.012、阴性、<0.05、约 6 × 4 mm"
                    @input="clearRowError(entry.item._uid, 'resultText')"
                  />
                  <small v-if="rowErrors[entry.item._uid]?.resultText" class="field-error">{{ rowErrors[entry.item._uid].resultText }}</small>
                </label>

                <label class="field-cell">
                  <span>单位</span>
                  <input
                    v-model="entry.item.unit"
                    class="input compact-input"
                    :class="{ 'input-invalid': Boolean(rowErrors[entry.item._uid]?.unit) }"
                    maxlength="24"
                    placeholder="如 μmol/L"
                    @input="clearRowError(entry.item._uid, 'unit')"
                  />
                  <small v-if="rowErrors[entry.item._uid]?.unit" class="field-error">{{ rowErrors[entry.item._uid].unit }}</small>
                </label>

                <label class="field-cell">
                  <span>参考区间</span>
                  <input
                    v-model="entry.item.referenceText"
                    class="input compact-input"
                    :class="{ 'input-invalid': Boolean(rowErrors[entry.item._uid]?.referenceText) }"
                    maxlength="160"
                    placeholder="如 1.015–1.025 或 <0.05"
                    @input="clearRowError(entry.item._uid, 'referenceText')"
                  />
                  <small v-if="rowErrors[entry.item._uid]?.referenceText" class="field-error">{{ rowErrors[entry.item._uid].referenceText }}</small>
                </label>

                <label class="field-cell">
                  <span>报告标记</span>
                  <select v-model="entry.item.abnormalFlag" class="input compact-input">
                    <option v-for="flag in REPORT_ABNORMAL_FLAGS" :key="flag.code" :value="flag.code">{{ flag.label }}</option>
                  </select>
                </label>

                <label class="field-cell">
                  <span>来源文件</span>
                  <input
                    v-model="entry.item.sourceFileLabel"
                    class="input compact-input"
                    maxlength="255"
                    placeholder="可选"
                    @input="clearRowError(entry.item._uid, 'sourceFileLabel')"
                  />
                </label>

                <label class="field-cell">
                  <span>来源页码</span>
                  <input
                    v-model="entry.item.sourcePage"
                    class="input compact-input"
                    :class="{ 'input-invalid': Boolean(rowErrors[entry.item._uid]?.sourcePage) }"
                    type="number"
                    min="1"
                    max="9999"
                    step="1"
                    placeholder="1-9999"
                    @input="clearRowError(entry.item._uid, 'sourcePage')"
                  />
                  <small v-if="rowErrors[entry.item._uid]?.sourcePage" class="field-error">{{ rowErrors[entry.item._uid].sourcePage }}</small>
                </label>
              </div>
            </article>
          </div>
          <p v-else class="muted-tip">
            {{ draftItems.length ? '当前筛选条件下没有匹配的检查项。' : '还没有录入检查结果明细，可从上方添加内置项或自定义项。' }}
          </p>
        </section>
      </template>
    </div>

    <template #footer>
      <button type="button" class="action-btn" :disabled="loading || saving || !report" @click="handleSave">
        {{ saving ? '保存中...' : '保存检查结果' }}
      </button>
    </template>
  </MacDialog>
</template>

<script setup>
import {computed, ref, watch} from 'vue'
import MacDialog from '@/components/MacDialog.vue'
import AttachmentGallery from '@/components/AttachmentGallery.vue'
import {
  getHealthRecord,
  getHealthReportDetails,
  listHealthRecords,
  saveHealthReportDetails
} from '@/api/healthRecord'
import {
  REPORT_ABNORMAL_FLAGS,
  REPORT_ITEM_GROUPS,
  REPORT_RESULT_TYPES,
  getCatalogItemsByGroup,
  getGroupLabel,
  validateReportDetailItems
} from '@/constants/healthReportCatalog'
import {hasMetricValue} from '@/utils/healthMetrics'

const CANDIDATE_PAGE_SIZE = 20

const props = defineProps({
  modelValue: Boolean,
  reportId: {type: String, default: ''}
})

const emit = defineEmits(['update:modelValue', 'saved', 'open-record'])

let uidSeed = 1
let detailsRequestSeq = 0
let candidateRequestSeq = 0

const loading = ref(false)
const saving = ref(false)
const loadError = ref('')
const saveError = ref('')
const isConflictError = ref(false)
const report = ref(null)
const revision = ref(0)
const linkedRecordId = ref('')
const selectedRecordDetail = ref(null)
const draftItems = ref([])
const initialSnapshot = ref('')
const rowErrors = ref({})

const filterGroup = ref('')
const filterAbnormalFlag = ref('')
const addGroup = ref('GENERAL')
const addCatalogCode = ref('')

const candidateDate = ref('')
const candidatePageNo = ref(1)
const candidateTotal = ref(0)
const candidates = ref([])
const candidatesLoading = ref(false)
const candidatesError = ref('')

const catalogAddGroups = REPORT_ITEM_GROUPS.filter((group) => group.code !== 'OTHER')
const addGroupCatalogItems = computed(() => getCatalogItemsByGroup(addGroup.value))
const candidateTotalPages = computed(() => Math.max(1, Math.ceil(candidateTotal.value / CANDIDATE_PAGE_SIZE)))

const dialogTitle = computed(() => report.value ? `检查结果 · ${report.value.reportTitle}` : '检查结果明细')
const dialogSubtitle = computed(() => report.value
  ? `${report.value.examDate} · ${report.value.hospitalName || '未填写机构'}`
  : '逐项录入原始检查结果、参考区间与异常标记')

const visibleEntries = computed(() => draftItems.value
  .map((item, index) => ({item, index}))
  .filter(({item}) => (!filterGroup.value || item.group === filterGroup.value)
    && (!filterAbnormalFlag.value || item.abnormalFlag === filterAbnormalFlag.value)))

function serializeDraft() {
  return JSON.stringify({
    linkedRecordId: linkedRecordId.value || null,
    items: draftItems.value.map((item) => ({
      group: item.group,
      itemCode: item.itemCode || null,
      name: item.name,
      resultType: item.resultType,
      resultText: item.resultText,
      unit: item.unit || '',
      referenceText: item.referenceText || '',
      abnormalFlag: item.abnormalFlag || 'UNSPECIFIED',
      sourceFileLabel: item.sourceFileLabel || '',
      sourcePage: item.sourcePage === '' || item.sourcePage == null ? '' : String(item.sourcePage)
    }))
  })
}

const isDirty = computed(() => Boolean(report.value) && serializeDraft() !== initialSnapshot.value)

function unwrapData(res) {
  const payload = res?.data
  if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data
  }
  return payload
}

function toDraftItem(item) {
  return {
    _uid: `item-${uidSeed++}`,
    group: item.group || 'OTHER',
    itemCode: item.itemCode || null,
    name: item.name || '',
    resultType: item.resultType || 'TEXT',
    resultText: item.resultText ?? '',
    unit: item.unit || '',
    referenceText: item.referenceText || '',
    abnormalFlag: item.abnormalFlag || 'UNSPECIFIED',
    sourceFileLabel: item.sourceFileLabel || '',
    sourcePage: item.sourcePage ?? ''
  }
}

function resetState() {
  loading.value = false
  saving.value = false
  loadError.value = ''
  saveError.value = ''
  isConflictError.value = false
  report.value = null
  revision.value = 0
  linkedRecordId.value = ''
  selectedRecordDetail.value = null
  draftItems.value = []
  initialSnapshot.value = ''
  rowErrors.value = {}
  filterGroup.value = ''
  filterAbnormalFlag.value = ''
  addCatalogCode.value = ''
  candidateDate.value = ''
  candidatePageNo.value = 1
  candidateTotal.value = 0
  candidates.value = []
  candidatesError.value = ''
}

async function loadLinkedRecordDetail(recordId, seq) {
  if (!recordId) {
    selectedRecordDetail.value = null
    return
  }
  try {
    const res = await getHealthRecord(recordId)
    if (seq !== detailsRequestSeq || linkedRecordId.value !== String(recordId)) {
      return
    }
    selectedRecordDetail.value = unwrapData(res) || null
  } catch (error) {
    if (seq === detailsRequestSeq) {
      selectedRecordDetail.value = null
    }
  }
}

async function searchCandidates(pageNo = 1) {
  const seq = ++candidateRequestSeq
  candidatesLoading.value = true
  candidatesError.value = ''
  try {
    const params = {pageNo, pageSize: CANDIDATE_PAGE_SIZE}
    if (candidateDate.value) {
      params.measureDate = candidateDate.value
    }
    const res = await listHealthRecords(params)
    if (seq !== candidateRequestSeq) {
      return
    }
    const payload = unwrapData(res) || {}
    candidates.value = payload.list || []
    candidateTotal.value = Number(payload.total || candidates.value.length)
    candidatePageNo.value = pageNo
  } catch (error) {
    if (seq !== candidateRequestSeq) {
      return
    }
    candidates.value = []
    candidateTotal.value = 0
    candidatesError.value = error?.response?.data?.message || '候选核心指标加载失败'
  } finally {
    if (seq === candidateRequestSeq) {
      candidatesLoading.value = false
    }
  }
}

function clearCandidateDate() {
  candidateDate.value = ''
  searchCandidates(1)
}

async function loadDetails() {
  if (!props.reportId) {
    return
  }
  const seq = ++detailsRequestSeq
  loading.value = true
  loadError.value = ''
  saveError.value = ''
  isConflictError.value = false
  rowErrors.value = {}
  try {
    const res = await getHealthReportDetails(props.reportId)
    if (seq !== detailsRequestSeq) {
      return
    }
    const data = unwrapData(res) || {}
    report.value = data.report || null
    revision.value = Number(data.revision ?? 0)
    linkedRecordId.value = data.linkedRecordId != null ? String(data.linkedRecordId) : ''
    draftItems.value = (data.items || []).map(toDraftItem)
    initialSnapshot.value = serializeDraft()
    candidateDate.value = report.value?.examDate || ''
    await Promise.all([
      loadLinkedRecordDetail(linkedRecordId.value, seq),
      searchCandidates(1)
    ])
  } catch (error) {
    if (seq !== detailsRequestSeq) {
      return
    }
    loadError.value = error?.response?.data?.message || '加载报告明细失败，请稍后重试'
  } finally {
    if (seq === detailsRequestSeq) {
      loading.value = false
    }
  }
}

function addBuiltInItem() {
  const item = addGroupCatalogItems.value.find((entry) => entry.itemCode === addCatalogCode.value)
  if (!item) {
    return
  }
  draftItems.value.push({
    _uid: `item-${uidSeed++}`,
    group: item.group,
    itemCode: item.itemCode,
    name: item.name,
    resultType: item.defaultResultType || 'TEXT',
    resultText: '',
    unit: item.defaultUnit || '',
    referenceText: '',
    abnormalFlag: 'UNSPECIFIED',
    sourceFileLabel: '',
    sourcePage: ''
  })
  addCatalogCode.value = ''
}

function addCustomItem() {
  draftItems.value.push({
    _uid: `item-${uidSeed++}`,
    group: filterGroup.value || 'OTHER',
    itemCode: null,
    name: '',
    resultType: 'TEXT',
    resultText: '',
    unit: '',
    referenceText: '',
    abnormalFlag: 'UNSPECIFIED',
    sourceFileLabel: '',
    sourcePage: ''
  })
}

function moveItem(index, delta) {
  const target = index + delta
  if (target < 0 || target >= draftItems.value.length) {
    return
  }
  const next = [...draftItems.value]
  const [moved] = next.splice(index, 1)
  next.splice(target, 0, moved)
  draftItems.value = next
}

function removeItem(index) {
  const removed = draftItems.value[index]
  draftItems.value.splice(index, 1)
  if (removed && rowErrors.value[removed._uid]) {
    const nextErrors = {...rowErrors.value}
    delete nextErrors[removed._uid]
    rowErrors.value = nextErrors
  }
}

function clearRowError(uid, field) {
  if (!rowErrors.value[uid]?.[field]) {
    return
  }
  const nextRow = {...rowErrors.value[uid]}
  delete nextRow[field]
  const nextErrors = {...rowErrors.value}
  if (Object.keys(nextRow).length === 0) {
    delete nextErrors[uid]
  } else {
    nextErrors[uid] = nextRow
  }
  rowErrors.value = nextErrors
}

function isLinkedToOtherReport(candidate) {
  return candidate.sourceReportId != null && String(candidate.sourceReportId) !== String(props.reportId)
}

function selectCandidate(candidate) {
  linkedRecordId.value = String(candidate.id)
  selectedRecordDetail.value = candidate
}

function clearLinkedRecord() {
  linkedRecordId.value = ''
  selectedRecordDetail.value = null
}

function formatRecordBrief(rec) {
  if (!rec) {
    return ''
  }
  const parts = []
  if (hasMetricValue(rec.weightKg)) parts.push(`体重 ${Number(rec.weightKg).toFixed(1)} kg`)
  if (hasMetricValue(rec.bmi)) parts.push(`BMI ${Number(rec.bmi).toFixed(2)}`)
  if (hasMetricValue(rec.systolicPressure) && hasMetricValue(rec.diastolicPressure)) {
    parts.push(`血压 ${rec.systolicPressure}/${rec.diastolicPressure} mmHg`)
  }
  if (hasMetricValue(rec.fastingGlucose)) parts.push(`空腹血糖 ${Number(rec.fastingGlucose).toFixed(2)} mmol/L`)
  if (hasMetricValue(rec.totalCholesterol)) parts.push(`总胆固醇 ${Number(rec.totalCholesterol).toFixed(2)} mmol/L`)
  return parts.join(' · ') || '已记录核心指标'
}

function emitOpenRecord(recordId) {
  emit('open-record', String(recordId))
}

async function handleSave() {
  if (saving.value || !report.value) {
    return
  }
  saveError.value = ''
  isConflictError.value = false
  const validation = validateReportDetailItems(draftItems.value)
  rowErrors.value = validation.rowErrors
  if (!validation.valid) {
    saveError.value = validation.message
    // 若校验失败行被当前筛选隐藏，清空筛选以便用户直接定位修改。
    filterGroup.value = ''
    filterAbnormalFlag.value = ''
    return
  }

  const payload = {
    expectedRevision: revision.value,
    linkedRecordId: linkedRecordId.value ? String(linkedRecordId.value) : null,
    items: draftItems.value.map((item) => ({
      group: item.group,
      itemCode: item.itemCode || null,
      name: String(item.name || '').trim(),
      resultType: item.resultType,
      resultText: String(item.resultText ?? '').trim(),
      unit: String(item.unit || '').trim() || null,
      referenceText: String(item.referenceText || '').trim() || null,
      abnormalFlag: item.abnormalFlag || 'UNSPECIFIED',
      sourceFileLabel: String(item.sourceFileLabel || '').trim() || null,
      sourcePage: item.sourcePage === '' || item.sourcePage == null ? null : Number(item.sourcePage)
    }))
  }

  saving.value = true
  try {
    const res = await saveHealthReportDetails(props.reportId, payload)
    const saved = unwrapData(res) || {}
    report.value = saved.report || report.value
    revision.value = Number(saved.revision ?? revision.value + 1)
    linkedRecordId.value = saved.linkedRecordId != null ? String(saved.linkedRecordId) : ''
    draftItems.value = (saved.items || []).map(toDraftItem)
    initialSnapshot.value = serializeDraft()
    rowErrors.value = {}
    emit('saved', saved)
  } catch (error) {
    const code = error?.response?.data?.code
    const message = error?.response?.data?.message || error?.message || '保存检查结果失败，草稿已保留'
    isConflictError.value = code === 'HEALTH_REPORT_DETAIL_CONFLICT'
    saveError.value = message
  } finally {
    saving.value = false
  }
}

function handleVisibleChange(visible) {
  if (!visible) {
    detailsRequestSeq += 1
    candidateRequestSeq += 1
    resetState()
  }
  emit('update:modelValue', visible)
}

watch(
  () => [props.modelValue, props.reportId],
  ([visible, id]) => {
    if (visible && id) {
      loadDetails()
    } else if (!visible) {
      detailsRequestSeq += 1
      candidateRequestSeq += 1
    }
  },
  {immediate: true}
)
</script>

<style scoped>
.details-shell {
  display: grid;
  gap: 14px;
  color: #edf4ff;
}

.details-card {
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(10, 26, 42, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.18);
  display: grid;
  gap: 12px;
}

.overview-meta,
.section-head,
.selected-link-box,
.candidate-row,
.candidate-pager,
.item-row-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.overview-meta p,
.section-head p,
.muted-tip {
  margin: 4px 0 0;
  color: #9db3c8;
  font-size: 13px;
}

.section-head h3 {
  margin: 0;
  font-size: 16px;
}

.selected-link-box {
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(56, 189, 248, 0.12);
  border: 1px solid rgba(56, 189, 248, 0.3);
}

.selected-link-info {
  display: grid;
  gap: 4px;
}

.link-badge,
.group-tag,
.code-tag,
.occupied-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  width: fit-content;
}

.link-badge {
  background: rgba(39, 213, 164, 0.22);
  color: #7bf0cc;
}

.group-tag {
  background: rgba(56, 189, 248, 0.18);
  color: #bfe8ff;
}

.code-tag {
  background: rgba(255, 255, 255, 0.08);
  color: #c7d6e5;
}

.occupied-tag {
  background: rgba(245, 158, 11, 0.18);
  color: #fcd34d;
}

.candidate-toolbar,
.catalog-adder,
.filter-bar,
.inline-actions,
.row-ops {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.inline-field {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #c9d8e8;
}

.candidate-list,
.detail-items-list {
  display: grid;
  gap: 10px;
}

.candidate-row {
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(7, 20, 34, 0.65);
  border: 1px solid rgba(148, 163, 184, 0.14);
}

.candidate-row.selected {
  border-color: rgba(39, 213, 164, 0.5);
}

.candidate-main {
  display: grid;
  gap: 2px;
  font-size: 13px;
}

.detail-item-row {
  padding: 12px;
  border-radius: 14px;
  background: rgba(7, 20, 34, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.16);
  display: grid;
  gap: 10px;
}

.detail-item-row.has-error {
  border-color: rgba(248, 113, 113, 0.7);
}

.item-fields-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.field-cell {
  display: grid;
  gap: 4px;
  font-size: 12px;
  color: #b7c9dc;
}

.field-wide {
  grid-column: span 2;
}

.input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 10px;
  padding: 7px 10px;
  background: rgba(8, 21, 35, 0.85);
  color: #edf4ff;
  font-size: 13px;
}

.compact-input {
  min-width: 110px;
}

.input-invalid {
  border-color: #f87171;
}

.field-error,
.inline-error {
  color: #fca5a5;
  font-size: 12px;
  margin: 0;
}

.details-error-box {
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(239, 68, 68, 0.14);
  border: 1px solid rgba(248, 113, 113, 0.4);
  color: #fecaca;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.details-error-box p {
  margin: 0;
}

.filter-hint {
  font-size: 12px;
  color: #9db3c8;
}

.mini-btn,
.action-btn {
  border: none;
  border-radius: 999px;
  cursor: pointer;
  font-size: 13px;
}

.mini-btn {
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.1);
  color: #e2edf8;
}

.mini-btn.danger {
  background: #fee2e2;
  color: #b42318;
}

.mini-btn.active-btn {
  background: rgba(39, 213, 164, 0.24);
  color: #7bf0cc;
}

.link-btn {
  text-decoration: none;
}

.action-btn {
  padding: 9px 18px;
  background: linear-gradient(135deg, #1996ff, #27d5a4);
  color: #fff;
}

button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .item-fields-grid {
    grid-template-columns: 1fr;
  }

  .field-wide {
    grid-column: auto;
  }
}
</style>
