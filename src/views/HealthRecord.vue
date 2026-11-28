<template>
  <div class="health-page standard-app-page">
    <AppPageHeader title="健康" @back="goBack">
      <span>测量 {{ summary.recordCount || 0 }}</span>
      <span>报告 {{ summary.reportCount || 0 }}</span>
      <span>就诊 {{ summary.visitCount || 0 }}</span>
      <template #actions>
        <button type="button" class="action-btn" :disabled="loading || submitting" @click="openCreateRecordDialog">+ 新增指标</button>
        <button type="button" class="ghost-btn" :disabled="submitting" @click="openCreateReportDialog">+ 新增报告</button>
        <button type="button" class="ghost-btn" :disabled="submitting" @click="openCreateVisitDialog">+ 新增就诊</button>
      </template>
    </AppPageHeader>

    <section class="app-card panel-section">
      <div class="panel-head compact-head">
        <div class="panel-title-group">
          <h2 class="panel-title">指标概览</h2>
          <span v-if="summary.latestMeasureDate" class="meta-date">最近更新 {{ summary.latestMeasureDate }}</span>
        </div>
        <div class="trend-range-switch" role="group" aria-label="趋势条数范围">
          <button
            v-for="limitOption in trendLimitOptions"
            :key="limitOption"
            class="trend-chip range-chip"
            :class="{ active: trendLimit === limitOption }"
            type="button"
            @click="selectTrendLimit(limitOption)"
          >
            最近 {{ limitOption }} 条
          </button>
        </div>
      </div>

      <div v-if="loading && !records.length" class="empty-state">加载中...</div>

      <template v-else>
        <!-- 4×2 整齐核心 KPI 卡片（含身高、体重、BMI、体脂、血压、静息心率、步数、睡眠），点击直接联动下方图表 -->
        <div class="metric-grid">
          <button
            v-for="item in primaryKpiCards"
            :key="item.key"
            type="button"
            class="app-card metric-card"
            :class="{ active: trendMetricKey === item.key }"
            @click="selectTrendMetric(item.key)"
          >
            <div class="metric-card-top">
              <span class="metric-label">{{ item.label }}</span>
              <span v-if="item.badge" class="metric-badge">{{ item.badge }}</span>
            </div>
            <strong class="metric-value">{{ item.value }}</strong>
          </button>
        </div>

        <!-- 其余化验与日常生理指标（全部采用 中文(英文缩写) 形式，带最新值，点击联动图表） -->
        <div class="secondary-metrics-panel">
          <div v-for="group in secondaryMetricGroups" :key="group.title" class="secondary-group-row">
            <span class="secondary-group-title">{{ group.title }}</span>
            <div class="secondary-group-chips">
              <button
                v-for="item in group.items"
                :key="item.key"
                type="button"
                class="trend-chip metric-value-chip"
                :class="{ active: trendMetricKey === item.key }"
                @click="selectTrendMetric(item.key)"
              >
                <span>{{ item.label }}</span>
                <b v-if="item.latestRaw !== '暂无'">{{ item.latestRaw }}</b>
              </button>
            </div>
          </div>
        </div>

        <div class="trend-panel">
          <div v-if="trendLoading" class="empty-state compact">趋势数据加载中...</div>
          <div v-else-if="trendError" class="empty-state compact trend-error-state">
            <span>{{ trendError }}</span>
            <button type="button" class="mini-btn accent" @click="loadTrend">重试</button>
          </div>
          <HealthTrendChart
            v-else-if="trendPoints.length"
            :metric-key="trendMetricKey"
            :metric-label="activeTrendMetric.label"
            :unit="activeTrendMetric.unit"
            :decimals="activeTrendMetric.decimals"
            :is-dual="Boolean(activeTrendMetric.isDual)"
            :ref-range="activeTrendMetric.ref || null"
            :points="trendPoints"
          />
          <div v-else class="empty-state compact">当前指标还没有足够的趋势数据</div>
        </div>
      </template>
    </section>

    <!-- 底部 4-Tab 档案中心：消除超长页面与左右空洞 -->
    <section class="app-card panel-section archive-section">
      <div class="archive-head">
        <div class="archive-tabs" role="tablist" aria-label="健康档案分类">
          <button
            type="button"
            role="tab"
            class="archive-tab-btn"
            :class="{ active: activeArchiveTab === 'reports' }"
            data-testid="tab-reports"
            @click="activeArchiveTab = 'reports'"
          >
            体检报告 ({{ reports.length }})
          </button>
          <button
            type="button"
            role="tab"
            class="archive-tab-btn"
            :class="{ active: activeArchiveTab === 'records' }"
            data-testid="tab-records"
            @click="activeArchiveTab = 'records'"
          >
            指标历史 ({{ records.length }})
          </button>
          <button
            type="button"
            role="tab"
            class="archive-tab-btn"
            :class="{ active: activeArchiveTab === 'visits' }"
            data-testid="tab-visits"
            @click="activeArchiveTab = 'visits'"
          >
            医院就诊 ({{ visits.length }})
          </button>
          <button
            type="button"
            role="tab"
            class="archive-tab-btn"
            :class="{ active: activeArchiveTab === 'dental' }"
            data-testid="tab-dental"
            @click="activeArchiveTab = 'dental'"
          >
            洁牙记录
          </button>
        </div>
        <div class="toolbar-left">
          <button v-if="activeArchiveTab === 'reports'" type="button" class="action-btn compact-action-btn" :disabled="submitting" @click="openCreateReportDialog">+ 新增报告</button>
          <button v-else-if="activeArchiveTab === 'records'" type="button" class="action-btn compact-action-btn" :disabled="loading || submitting" @click="openCreateRecordDialog">+ 新增指标</button>
          <button v-else-if="activeArchiveTab === 'visits'" type="button" class="action-btn compact-action-btn" :disabled="submitting" @click="openCreateVisitDialog">+ 新增就诊</button>
        </div>
      </div>

      <!-- Tab 1: 体检报告 -->
      <div v-if="activeArchiveTab === 'reports'">
        <div v-if="recentlyCreatedReport" class="created-report-banner">
          <span>报告「{{ recentlyCreatedReport.reportTitle }}」已保存，可继续录入逐项检查结果。</span>
          <div class="mobile-card-actions">
            <button type="button" class="action-btn compact-action-btn" @click="openReportDetailsById(recentlyCreatedReport.id)">
              录入检查结果
            </button>
            <button type="button" class="mini-btn" @click="recentlyCreatedReport = null">稍后再说</button>
          </div>
        </div>

        <div v-if="reports.length" class="report-grid">
          <article v-for="item in visibleReports" :key="String(item.id)" class="app-card report-card">
            <div class="visit-card-head">
              <div class="record-info">
                <strong>{{ item.reportTitle }}</strong>
                <p>{{ item.examDate }} · {{ item.hospitalName || '未填写机构' }}</p>
              </div>
              <div class="report-badges">
                <span class="visit-count-chip">{{ resolveVisitName(item.visitId) }}</span>
                <span v-if="item.linkedRecordId != null" class="visit-count-chip linked-chip">已关联指标</span>
              </div>
            </div>
            <div class="visit-body">
              <p v-if="item.summary"><span>摘要</span><strong>{{ item.summary }}</strong></p>
              <p v-if="item.doctorAdvice"><span>医生建议</span><strong>{{ item.doctorAdvice }}</strong></p>
              <p v-if="!item.attachments?.length && (item.reportFileName || item.reportUrl)">
                <span>文件</span>
                <strong>
                  <a v-if="item.reportUrl" class="legacy-file-link" :href="item.reportUrl" target="_blank" rel="noopener">
                    {{ item.reportFileName || '查看报告附件' }}
                  </a>
                  <template v-else>{{ item.reportFileName }}</template>
                </strong>
              </p>
            </div>
            <AttachmentGallery v-if="item.attachments?.length" :attachments="item.attachments" />
            <div class="report-card-foot">
              <span class="visit-count-chip">
                {{ hasReportAttachment(item) ? `${item.attachments?.length || 1} 个附件` : '0 个附件' }}
              </span>
              <div class="mobile-card-actions">
                <button type="button" class="mini-btn accent" @click="openReportDetailsById(item.id)">检查结果</button>
                <button
                  v-if="item.linkedRecordId != null"
                  type="button"
                  class="mini-btn accent"
                  @click="openMetricRecordById(item.linkedRecordId)"
                >
                  查看关联指标
                </button>
                <button type="button" class="mini-btn" @click="openEditReportDialog(item)">编辑</button>
                <button type="button" class="mini-btn danger" @click="removeReport(item)">删除</button>
              </div>
            </div>
          </article>
        </div>
        <div v-else class="empty-state">暂无报告单记录</div>
        <div v-if="reports.length > DEFAULT_VISIBLE_COUNT" class="list-expand-row">
          <button
            type="button"
            class="expand-toggle-btn"
            data-testid="toggle-reports-expand"
            @click="showAllReports = !showAllReports"
          >
            {{ showAllReports ? `收起（仅显示最近 ${DEFAULT_VISIBLE_COUNT} 份）` : `展开更多（还有 ${reports.length - DEFAULT_VISIBLE_COUNT} 份）` }}
          </button>
        </div>
      </div>

      <!-- Tab 2: 指标历史 -->
      <div v-else-if="activeArchiveTab === 'records'">
        <div v-if="records.length" class="record-list">
          <article v-for="item in visibleRecords" :key="String(item.id)" class="app-card record-card">
            <div class="record-head">
              <div class="record-info">
                <div class="record-title-line">
                  <strong>{{ item.measureDate }}</strong>
                  <span v-if="item.sourceType" class="source-tag">{{ resolveSourceLabel(item.sourceType) }}</span>
                </div>
                <p>{{ buildRecordSummary(item) }}</p>
              </div>
              <div class="mobile-card-actions">
                <span v-if="item.sourceReportId != null" class="visit-count-chip linked-chip">已关联报告</span>
                <button
                  v-if="item.sourceReportId != null"
                  type="button"
                  class="mini-btn accent"
                  @click="openReportDetailsById(item.sourceReportId)"
                >
                  查看来源报告
                </button>
                <button type="button" class="mini-btn" @click="openEditRecordDialog(item)">编辑</button>
                <button type="button" class="mini-btn danger" @click="removeRecord(item)">删除</button>
              </div>
            </div>
          </article>
          <div v-if="records.length > DEFAULT_VISIBLE_COUNT" class="list-expand-row">
            <button
              type="button"
              class="expand-toggle-btn"
              data-testid="toggle-records-expand"
              @click="showAllRecords = !showAllRecords"
            >
              {{ showAllRecords ? `收起（仅显示最近 ${DEFAULT_VISIBLE_COUNT} 条）` : `展开更多（还有 ${records.length - DEFAULT_VISIBLE_COUNT} 条）` }}
            </button>
          </div>
        </div>
        <div v-else class="empty-state">暂无健康指标记录</div>
      </div>

      <!-- Tab 3: 医院就诊 -->
      <div v-else-if="activeArchiveTab === 'visits'">
        <div v-if="visits.length" class="visit-list">
          <article v-for="item in visits" :key="String(item.id)" class="app-card visit-card">
            <div class="visit-card-head">
              <div class="record-info">
                <strong>{{ item.visitDate }} · {{ item.hospitalName }}</strong>
                <p>{{ [item.departmentName, item.doctorName, item.visitType].filter(Boolean).join(' · ') || '未补充科室与医生' }}</p>
              </div>
              <span class="visit-count-chip">{{ item.reportCount || 0 }} 份报告</span>
            </div>
            <p class="visit-amount">实际自付：{{ item.amount == null ? '未记录金额' : '¥' + formatNumber(item.amount, 2) }}</p>
            <div class="visit-body">
              <p v-if="item.chiefComplaint"><span>主诉</span><strong>{{ item.chiefComplaint }}</strong></p>
              <p v-if="item.diagnosisSummary"><span>诊断</span><strong>{{ item.diagnosisSummary }}</strong></p>
              <p v-if="item.treatmentPlan"><span>处置</span><strong>{{ item.treatmentPlan }}</strong></p>
              <p v-if="item.doctorAdvice"><span>建议</span><strong>{{ item.doctorAdvice }}</strong></p>
            </div>
            <AttachmentGallery v-if="item.attachments?.length" :attachments="item.attachments" />
            <div class="report-card-foot">
              <span class="visit-count-chip">{{ item.attachments?.length || 0 }} 个附件</span>
              <div class="mobile-card-actions">
                <button type="button" class="mini-btn" @click="openEditVisitDialog(item)">编辑</button>
                <button type="button" class="mini-btn danger" @click="removeVisit(item)">删除</button>
              </div>
            </div>
          </article>
        </div>
        <div v-else class="empty-state">暂无医院就诊记录</div>
      </div>

      <!-- Tab 4: 洁牙记录 -->
      <div v-else class="dental-tab-wrap">
        <DentalCleaningPanel />
      </div>
    </section>

    <MacDialog
      v-model="showRecordDialog"
      :form-state="recordForm"
      :title="recordDialogMode === 'create' ? '新增健康指标记录' : '编辑健康指标记录'"
      width="980px"
      panel-class="health-record-dialog"
      :close-disabled="submitting"
      @close="closeRecordDialog"
    >
      <form id="health-record-dialog-form" class="dialog-form dialog-density-grid" @submit.prevent="submitRecordDialog">
        <div v-if="recordDialogMode === 'edit' && (editingRecordBmi !== null || editingRecordSourceReportId)" class="record-meta-bar dialog-span-all">
          <span>体质指数(BMI)：<strong>{{ latestMetricText('bmi', editingRecordBmi) }}</strong></span>
          <button
            v-if="editingRecordSourceReportId"
            type="button"
            class="mini-btn accent"
            @click="jumpFromRecordToReport(editingRecordSourceReportId)"
          >
            查看来源报告
          </button>
        </div>

        <div class="form-metrics-grid dialog-span-all">
          <label class="form-field">
            <span>记录日期</span>
            <input v-model="recordForm.measureDate" class="input" type="date" required />
          </label>
          <label v-for="field in coreMetricFields" :key="field.key" class="form-field">
            <span>{{ field.label }}</span>
            <input
              v-model="recordForm[field.key]"
              class="input"
              type="number"
              min="0"
              :max="field.max"
              :step="field.step"
            />
          </label>
        </div>

        <label class="form-field dialog-span-all">
          <span>备注</span>
          <textarea v-model.trim="recordForm.note" class="input textarea" rows="2" maxlength="255" placeholder="例如：晨起空腹、体检前一周作息规律" />
        </label>
      </form>
      <template #footer>
        <button type="submit" form="health-record-dialog-form" class="action-btn" :disabled="submitting">{{ submitting ? '提交中...' : '保存记录' }}</button>
      </template>
    </MacDialog>

    <MacDialog
      v-model="showVisitDialog"
      :form-state="{...visitForm, attachments: visitForm.attachments.map(item => item.id)}"
      :title="visitDialogMode === 'create' ? '新增医院就诊' : '编辑医院就诊'"
      width="960px"
      panel-class="health-visit-dialog"
      :close-disabled="submitting"
      @close="closeVisitDialog"
    >
      <form id="health-visit-dialog-form" class="dialog-form dialog-density-grid" @submit.prevent="submitVisitDialog">
        <div class="form-inline-grid dialog-grid-group">
          <label class="form-field">
            <span>就诊日期</span>
            <input v-model="visitForm.visitDate" class="input" type="date" required />
          </label>
          <label class="form-field">
            <span>医院</span>
            <input v-model.trim="visitForm.hospitalName" class="input" maxlength="64" required />
          </label>
          <label class="form-field">
            <span>科室</span>
            <input v-model.trim="visitForm.departmentName" class="input" maxlength="64" />
          </label>
        </div>

        <div class="form-inline-grid dialog-grid-group">
          <label class="form-field">
            <span>医生</span>
            <input v-model.trim="visitForm.doctorName" class="input" maxlength="64" />
          </label>
          <label class="form-field">
            <span>就诊类型</span>
            <select v-model="visitForm.visitType" class="input">
              <option value="">请选择</option>
              <option v-for="item in visitTypeOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
          </label>
        </div>

        <label class="form-field dialog-span-all">
          <span>实际自付金额（元）</span>
          <input v-model="visitForm.amount" class="input" type="number" inputmode="decimal" min="0" max="9999999999.99" step="0.01" placeholder="可不填" />
          <small>大于 0 时自动同步至个人账单；清空或填 0 会移除对应支出。</small>
        </label>

        <label class="form-field dialog-span-all">
          <span>主诉</span>
          <textarea v-model.trim="visitForm.chiefComplaint" class="input textarea" rows="2" maxlength="240" />
        </label>

        <label class="form-field dialog-span-all">
          <span>诊断摘要</span>
          <textarea v-model.trim="visitForm.diagnosisSummary" class="input textarea" rows="3" maxlength="500" />
        </label>

        <label class="form-field dialog-span-all">
          <span>处置方案</span>
          <textarea v-model.trim="visitForm.treatmentPlan" class="input textarea" rows="3" maxlength="500" />
        </label>

        <label class="form-field dialog-span-all">
          <span>医生建议</span>
          <textarea v-model.trim="visitForm.doctorAdvice" class="input textarea" rows="3" maxlength="500" />
        </label>

        <AttachmentManager
          v-model="visitForm.attachments"
          usage-type="ATTACHMENT"
          :max-count="10"
          accept="image/*,.pdf,.docx,.xlsx,.pptx,.txt,.csv,.zip"
          title="病历附件"
          hint="最多 10 个文件，单文件不超过 50MB。"
        />

        <label class="form-field dialog-span-all">
          <span>备注</span>
          <textarea v-model.trim="visitForm.note" class="input textarea" rows="2" maxlength="255" />
        </label>
      </form>
      <template #footer>
        <button type="submit" form="health-visit-dialog-form" class="action-btn" :disabled="submitting">{{ submitting ? '提交中...' : '保存就诊' }}</button>
      </template>
    </MacDialog>

    <MacDialog
      v-model="showReportDialog"
      :form-state="{...reportForm, attachments: reportForm.attachments.map(item => item.id)}"
      :title="reportDialogMode === 'create' ? '新增报告单' : '编辑报告单'"
      width="760px"
      panel-class="health-report-dialog"
      :close-disabled="submitting"
      @close="closeReportDialog"
    >
      <form id="health-report-dialog-form" class="dialog-form dialog-density-grid" @submit.prevent="submitReportDialog">
        <div class="form-inline-grid dialog-grid-group">
          <label class="form-field">
            <span>报告日期</span>
            <input v-model="reportForm.examDate" class="input" type="date" required />
          </label>
          <label class="form-field">
            <span>机构</span>
            <input v-model.trim="reportForm.hospitalName" class="input" maxlength="64" />
          </label>
        </div>

        <label class="form-field dialog-span-2">
          <span>关联就诊</span>
          <select v-model="reportForm.visitId" class="input">
            <option value="">不关联</option>
            <option v-for="item in visits" :key="item.id" :value="String(item.id)">{{ item.visitDate }} · {{ item.hospitalName }}</option>
          </select>
        </label>

        <label class="form-field">
          <span>报告标题</span>
          <input v-model.trim="reportForm.reportTitle" class="input" maxlength="64" required />
        </label>

        <AttachmentManager
          v-model="reportForm.attachments"
          usage-type="ATTACHMENT"
          :max-count="10"
          accept="image/*,.pdf,.docx,.xlsx,.pptx,.txt,.csv,.zip"
          title="报告附件"
          hint="最多 10 个文件，支持报告、表格和影像资料。"
        />

        <label class="form-field dialog-span-all">
          <span>报告摘要</span>
          <textarea v-model.trim="reportForm.summary" class="input textarea" rows="3" maxlength="240" />
        </label>

        <label class="form-field dialog-span-all">
          <span>医生建议</span>
          <textarea v-model.trim="reportForm.doctorAdvice" class="input textarea" rows="3" maxlength="240" />
        </label>
      </form>
      <template #footer>
        <button type="submit" form="health-report-dialog-form" class="action-btn" :disabled="submitting">{{ submitting ? '提交中...' : '保存报告' }}</button>
      </template>
    </MacDialog>

    <HealthReportDetailsDialog
      v-model="showReportDetailsDialog"
      :report-id="activeDetailsReportId"
      @saved="handleReportDetailsSaved"
      @open-record="jumpFromReportToRecord"
    />
  </div>
</template>

<script>
import AppPageHeader from '@/components/AppPageHeader.vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import DentalCleaningPanel from '@/components/DentalCleaningPanel.vue'
import HealthReportDetailsDialog from '@/components/HealthReportDetailsDialog.vue'
import HealthTrendChart from '@/components/HealthTrendChart.vue'
import MacDialog from '@/components/MacDialog.vue'
import {confirmDialog} from '@/components/systemDialog'
import AttachmentManager from '@/components/AttachmentManager.vue'
import AttachmentGallery from '@/components/AttachmentGallery.vue'
import {
  buildCoreMetricPayload,
  CORE_METRIC_FIELDS,
  createEmptyCoreMetricForm,
  hasMetricValue,
  PRIMARY_KPI_KEYS,
  SECONDARY_METRIC_GROUPS,
  SOURCE_TYPE_LABELS,
  TREND_LIMIT_OPTIONS,
  TREND_METRIC_OPTIONS,
  validateCoreMetricForm
} from '@/utils/healthMetrics'
import {
  createHealthRecord,
  createHealthReport,
  createHealthVisit,
  getHealthRecord,
  getHealthVisit,
  deleteHealthRecord,
  deleteHealthReport,
  deleteHealthVisit,
  getHealthSummary,
  getHealthTrends,
  listHealthRecords,
  listHealthReports,
  listHealthVisits,
  updateHealthRecord,
  updateHealthReport,
  updateHealthVisit,
  uploadHealthReportFile
} from '@/api/healthRecord'

const METRIC_OPTIONS = TREND_METRIC_OPTIONS
const DEFAULT_VISIBLE_COUNT = 5

const VISIT_TYPE_OPTIONS = [
  { value: 'OUTPATIENT', label: '门诊' },
  { value: 'EMERGENCY', label: '急诊' },
  { value: 'INPATIENT', label: '住院' },
  { value: 'FOLLOW_UP', label: '复诊' }
]

function unwrapData(res) {
  const payload = res?.data
  if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data
  }
  return payload
}

function formatNumber(value, decimals = 0) {
  if (value === null || value === undefined || value === '') {
    return '暂无'
  }
  const number = Number(value)
  if (!Number.isFinite(number)) {
    return '暂无'
  }
  return number.toFixed(decimals)
}

function normalizeListPayload(payload) {
  if (Array.isArray(payload)) {
    return payload
  }
  return payload?.list || payload?.records || payload?.rows || payload?.items || []
}

function normalizeId(value) {
  if (value === '' || value === null || value === undefined) {
    return null
  }
  const text = String(value).trim()
  return text || null
}

export default {
  name: 'HealthRecord',
  components: {AppPageHeader, MacDialog, AttachmentManager, AttachmentGallery, DentalCleaningPanel, HealthReportDetailsDialog, HealthTrendChart},
  setup() {
    const router = useRouter()
    const route = useRoute()

    const loading = ref(false)
    const submitting = ref(false)
    const records = ref([])
    const reports = ref([])
    const visits = ref([])
    const activeArchiveTab = ref('reports')
    const showAllRecords = ref(false)
    const showAllReports = ref(false)
    const trendMetricKey = ref('weightKg')
    const trendLimit = ref(12)
    const trendPoints = ref([])
    const trendLoading = ref(false)
    const trendError = ref('')
    let trendRequestSeq = 0
    const summary = ref({
      latestMeasureDate: '',
      lastExamDate: '',
      lastVisitDate: '',
      recordCount: 0,
      reportCount: 0,
      visitCount: 0
    })

    const showRecordDialog = ref(false)
    const showVisitDialog = ref(false)
    const showReportDialog = ref(false)
    const showReportDetailsDialog = ref(false)
    const activeDetailsReportId = ref('')
    const recentlyCreatedReport = ref(null)
    const recordDialogMode = ref('create')
    const visitDialogMode = ref('create')
    const reportDialogMode = ref('create')
    const editingRecordId = ref(null)
    const editingRecordBmi = ref(null)
    const editingRecordSourceReportId = ref(null)
    const editingVisitId = ref(null)
    const editingReportId = ref(null)
    const reportUploadInputRef = ref(null)
    const visitUploadInputRef = ref(null)

    const recordForm = reactive(createEmptyCoreMetricForm(''))

    const visitForm = reactive({
      visitDate: '',
      amount: '',
      hospitalName: '',
      departmentName: '',
      doctorName: '',
      visitType: '',
      chiefComplaint: '',
      diagnosisSummary: '',
      treatmentPlan: '',
      doctorAdvice: '',
      caseRecordFileName: '',
      caseRecordUrl: '',
      attachments: [],
      note: ''
    })

    const reportForm = reactive({
      visitId: '',
      examDate: '',
      hospitalName: '',
      reportTitle: '',
      summary: '',
      doctorAdvice: '',
      reportFileName: '',
      reportUrl: '',
      attachments: []
    })

    const latestRecord = computed(() => records.value[0] || null)
    const visibleRecords = computed(() => showAllRecords.value ? records.value : records.value.slice(0, DEFAULT_VISIBLE_COUNT))
    const visibleReports = computed(() => showAllReports.value ? reports.value : reports.value.slice(0, DEFAULT_VISIBLE_COUNT))
    const activeTrendMetric = computed(() => METRIC_OPTIONS.find((item) => item.key === trendMetricKey.value) || METRIC_OPTIONS[1])

    const latestMetricText = (metricKey, value) => {
      const config = METRIC_OPTIONS.find((item) => item.key === metricKey)
      if (!config) {
        return hasMetricValue(value) ? String(value) : '暂无'
      }
      const numberText = formatNumber(value, config.decimals)
      return numberText === '暂无' ? numberText : `${numberText} ${config.unit}`.trim()
    }

    // 跨历史取每个指标最近一次有效值，避免高频日常记录掩盖体检化验或身高
    const findLatestMetricValue = (metricKey) => {
      for (const rec of records.value) {
        if (metricKey === 'bloodPressure') {
          if (hasMetricValue(rec.systolicPressure) && hasMetricValue(rec.diastolicPressure)) {
            return {systolic: rec.systolicPressure, diastolic: rec.diastolicPressure}
          }
          continue
        }
        if (hasMetricValue(rec[metricKey])) {
          return rec[metricKey]
        }
      }
      return null
    }

    const primaryKpiCards = computed(() => PRIMARY_KPI_KEYS.map((key) => {
      const config = METRIC_OPTIONS.find((item) => item.key === key)
      const latestVal = findLatestMetricValue(key)
      let displayValue = '暂无'
      if (key === 'bloodPressure') {
        displayValue = latestVal ? `${latestVal.systolic}/${latestVal.diastolic} mmHg` : '暂无'
      } else {
        displayValue = latestMetricText(key, latestVal)
      }
      return {
        key,
        label: config?.label || key,
        value: displayValue,
        badge: key === 'bloodPressure' ? '双曲线' : ''
      }
    }))

    const secondaryMetricGroups = computed(() => SECONDARY_METRIC_GROUPS.map((group) => ({
      title: group.title,
      items: group.keys.map((key) => {
        const config = METRIC_OPTIONS.find((item) => item.key === key)
        const latestVal = findLatestMetricValue(key)
        const latestRaw = config ? formatNumber(latestVal, config.decimals) : '暂无'
        return {
          key,
          label: config?.label || key,
          latestRaw
        }
      })
    })))

    const metricOptions = METRIC_OPTIONS
    const coreMetricFields = CORE_METRIC_FIELDS
    const trendLimitOptions = TREND_LIMIT_OPTIONS
    const visitTypeOptions = VISIT_TYPE_OPTIONS

    const loadSummary = async () => {
      const res = await getHealthSummary()
      summary.value = unwrapData(res) || summary.value
    }

    const loadRecords = async () => {
      const res = await listHealthRecords({ pageNo: 1, pageSize: 200 })
      records.value = normalizeListPayload(unwrapData(res))
    }

    const loadReports = async () => {
      const res = await listHealthReports({ pageNo: 1, pageSize: 100 })
      reports.value = normalizeListPayload(unwrapData(res))
    }

    const loadVisits = async () => {
      const res = await listHealthVisits({ pageNo: 1, pageSize: 100 })
      visits.value = normalizeListPayload(unwrapData(res))
    }

    const loadTrend = async () => {
      const seq = ++trendRequestSeq
      trendLoading.value = true
      trendError.value = ''
      try {
        const res = await getHealthTrends({
          metricKey: trendMetricKey.value,
          limit: trendLimit.value
        })
        if (seq !== trendRequestSeq) {
          return
        }
        const payload = unwrapData(res) || {}
        trendPoints.value = payload.points || []
      } catch (error) {
        if (seq !== trendRequestSeq) {
          return
        }
        console.error(error)
        trendPoints.value = []
        trendError.value = error?.response?.data?.message || '趋势数据加载失败，请重试'
      } finally {
        if (seq === trendRequestSeq) {
          trendLoading.value = false
        }
      }
    }

    const loadPage = async () => {
      loading.value = true
      try {
        await Promise.all([loadSummary(), loadRecords(), loadReports(), loadVisits(), loadTrend()])
      } catch (error) {
        console.error(error)
        alert('健康数据加载失败，请稍后重试')
      } finally {
        loading.value = false
      }
    }

    const selectTrendMetric = async (metricKey) => {
      if (trendMetricKey.value === metricKey && !trendError.value) {
        return
      }
      trendMetricKey.value = metricKey
      trendPoints.value = []
      await loadTrend()
    }

    const selectTrendLimit = async (limit) => {
      if (trendLimit.value === limit && !trendError.value) {
        return
      }
      trendLimit.value = limit
      await loadTrend()
    }

    const resetRecordForm = () => {
      Object.assign(recordForm, createEmptyCoreMetricForm(''))
    }

    const resetVisitForm = () => {
      Object.assign(visitForm, {
        visitDate: '',
        amount: '',
        hospitalName: '',
        departmentName: '',
        doctorName: '',
        visitType: '',
        chiefComplaint: '',
        diagnosisSummary: '',
        treatmentPlan: '',
        doctorAdvice: '',
        caseRecordFileName: '',
        caseRecordUrl: '',
        attachments: [],
        note: ''
      })
    }

    const resetReportForm = () => {
      Object.assign(reportForm, {
        visitId: '',
        examDate: '',
        hospitalName: '',
        reportTitle: '',
        summary: '',
        doctorAdvice: '',
        reportFileName: '',
        reportUrl: '',
        attachments: []
      })
    }

    const openCreateRecordDialog = () => {
      recordDialogMode.value = 'create'
      editingRecordId.value = null
      editingRecordBmi.value = null
      editingRecordSourceReportId.value = null
      resetRecordForm()
      showRecordDialog.value = true
    }

    const openEditRecordDialog = (item) => {
      recordDialogMode.value = 'edit'
      editingRecordId.value = item.id != null ? String(item.id) : null
      editingRecordBmi.value = item.bmi ?? null
      editingRecordSourceReportId.value = item.sourceReportId != null ? String(item.sourceReportId) : null
      const nextForm = createEmptyCoreMetricForm(item.measureDate || '')
      for (const field of CORE_METRIC_FIELDS) {
        nextForm[field.key] = item[field.key] ?? ''
      }
      nextForm.note = item.note || ''
      Object.assign(recordForm, nextForm)
      showRecordDialog.value = true
    }

    const completeRecordDialog = () => {
      showRecordDialog.value = false
      editingRecordBmi.value = null
      editingRecordSourceReportId.value = null
      resetRecordForm()
    }

    const closeRecordDialog = () => {
      if (submitting.value) {
        return
      }
      completeRecordDialog()
    }

    const submitRecordDialog = async () => {
      if (submitting.value) {
        return
      }
      const hasAnyFieldInput = CORE_METRIC_FIELDS.some((field) => hasMetricValue(recordForm[field.key]))
      if (hasAnyFieldInput) {
        const validationError = validateCoreMetricForm(recordForm)
        if (validationError) {
          alert(validationError)
          return
        }
      }
      const payload = buildCoreMetricPayload(recordForm)
      submitting.value = true
      try {
        if (recordDialogMode.value === 'create') {
          await createHealthRecord(payload)
        } else {
          await updateHealthRecord(editingRecordId.value, payload)
        }
        completeRecordDialog()
        await loadPage()
      } catch (error) {
        console.error(error)
        alert(error?.response?.data?.message || '保存健康指标记录失败')
      } finally {
        submitting.value = false
      }
    }

    const removeRecord = async (item) => {
      if (!await confirmDialog(`${item.measureDate} 的健康指标记录将被永久删除。`, {
        title: '删除健康指标？',
        confirmText: '删除记录'
      })) {
        return
      }
      try {
        await deleteHealthRecord(item.id)
        await loadPage()
      } catch (error) {
        console.error(error)
        alert(error?.response?.data?.message || '删除健康指标记录失败')
      }
    }

    const openCreateVisitDialog = () => {
      visitDialogMode.value = 'create'
      editingVisitId.value = null
      resetVisitForm()
      showVisitDialog.value = true
    }

    const openEditVisitDialog = (item) => {
      visitDialogMode.value = 'edit'
      editingVisitId.value = item.id
      Object.assign(visitForm, {
        visitDate: item.visitDate || '',
        amount: item.amount ?? '',
        hospitalName: item.hospitalName || '',
        departmentName: item.departmentName || '',
        doctorName: item.doctorName || '',
        visitType: item.visitType || '',
        chiefComplaint: item.chiefComplaint || '',
        diagnosisSummary: item.diagnosisSummary || '',
        treatmentPlan: item.treatmentPlan || '',
        doctorAdvice: item.doctorAdvice || '',
        caseRecordFileName: item.caseRecordFileName || '',
        caseRecordUrl: item.caseRecordUrl || '',
        attachments: [...(item.attachments || [])],
        note: item.note || ''
      })
      showVisitDialog.value = true
    }

    const completeVisitDialog = () => {
      showVisitDialog.value = false
      resetVisitForm()
    }

    const closeVisitDialog = () => {
      if (submitting.value) {
        return
      }
      completeVisitDialog()
    }

    const submitVisitDialog = async () => {
      if (submitting.value) {
        return
      }
      const amount = visitForm.amount === '' || visitForm.amount == null ? null : Number(visitForm.amount)
      if (amount !== null && (!Number.isFinite(amount) || amount < 0 || amount > 9999999999.99
        || !/^\d+(?:\.\d{1,2})?$/.test(String(visitForm.amount)))) {
        alert('实际自付金额须在 0 至 9999999999.99 元之间，最多两位小数')
        return
      }
      const payload = {
        amount,
        visitDate: visitForm.visitDate,
        hospitalName: visitForm.hospitalName,
        departmentName: visitForm.departmentName || null,
        doctorName: visitForm.doctorName || null,
        visitType: visitForm.visitType || null,
        chiefComplaint: visitForm.chiefComplaint || null,
        diagnosisSummary: visitForm.diagnosisSummary || null,
        treatmentPlan: visitForm.treatmentPlan || null,
        doctorAdvice: visitForm.doctorAdvice || null,
        caseRecordFileName: visitForm.caseRecordFileName || null,
        caseRecordUrl: visitForm.caseRecordUrl || null,
        note: visitForm.note || null,
        attachmentIds: visitForm.attachments.map((item) => item.id)
      }
      submitting.value = true
      try {
        if (visitDialogMode.value === 'create') {
          await createHealthVisit(payload)
        } else {
          await updateHealthVisit(editingVisitId.value, payload)
        }
        completeVisitDialog()
        await loadPage()
      } catch (error) {
        console.error(error)
        alert('保存医院就诊记录失败')
      } finally {
        submitting.value = false
      }
    }

    const removeVisit = async (item) => {
      if (!await confirmDialog(`${item.visitDate} 的医院就诊记录将被永久删除，对应的个人账单支出也会同步删除。`, {
        title: '删除就诊记录？',
        confirmText: '删除记录'
      })) {
        return
      }
      try {
        await deleteHealthVisit(item.id)
        await loadPage()
      } catch (error) {
        console.error(error)
        alert('删除医院就诊记录失败')
      }
    }

    const openCreateReportDialog = () => {
      reportDialogMode.value = 'create'
      editingReportId.value = null
      resetReportForm()
      showReportDialog.value = true
    }

    const openEditReportDialog = (item) => {
      reportDialogMode.value = 'edit'
      editingReportId.value = item.id
      Object.assign(reportForm, {
        visitId: item.visitId ? String(item.visitId) : '',
        examDate: item.examDate || '',
        hospitalName: item.hospitalName || '',
        reportTitle: item.reportTitle || '',
        summary: item.summary || '',
        doctorAdvice: item.doctorAdvice || '',
        reportFileName: item.reportFileName || '',
        reportUrl: item.reportUrl || '',
        attachments: [...(item.attachments || [])]
      })
      showReportDialog.value = true
    }

    const completeReportDialog = () => {
      showReportDialog.value = false
      resetReportForm()
    }

    const closeReportDialog = () => {
      if (submitting.value) {
        return
      }
      completeReportDialog()
    }

    const submitReportDialog = async () => {
      if (submitting.value) {
        return
      }
      const payload = {
        visitId: normalizeId(reportForm.visitId),
        examDate: reportForm.examDate,
        hospitalName: reportForm.hospitalName || null,
        reportTitle: reportForm.reportTitle,
        summary: reportForm.summary || null,
        doctorAdvice: reportForm.doctorAdvice || null,
        reportFileName: reportForm.reportFileName || null,
        reportUrl: reportForm.reportUrl || null,
        attachmentIds: reportForm.attachments.map((item) => item.id)
      }
      submitting.value = true
      try {
        if (reportDialogMode.value === 'create') {
          const res = await createHealthReport(payload)
          const created = unwrapData(res)
          if (created?.id != null) {
            recentlyCreatedReport.value = {
              id: String(created.id),
              reportTitle: created.reportTitle || payload.reportTitle
            }
            activeArchiveTab.value = 'reports'
          }
        } else {
          await updateHealthReport(editingReportId.value, payload)
        }
        completeReportDialog()
        await loadPage()
      } catch (error) {
        console.error(error)
        alert(error?.response?.data?.message || '保存健康报告失败')
      } finally {
        submitting.value = false
      }
    }

    const removeReport = async (item) => {
      if (!await confirmDialog(`健康报告【${item.reportTitle}】将被永久删除。`, {
        title: '删除健康报告？',
        confirmText: '删除报告'
      })) {
        return
      }
      try {
        await deleteHealthReport(item.id)
        await loadPage()
      } catch (error) {
        console.error(error)
        alert('删除健康报告失败')
      }
    }

    const uploadSingleFile = async (file) => {
      const res = await uploadHealthReportFile(file)
      return unwrapData(res) || {}
    }

    const openReportUploadPicker = () => { reportUploadInputRef.value?.click() }
    const openVisitUploadPicker = () => { visitUploadInputRef.value?.click() }

    const handleReportFileSelected = async (event) => {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (!file) return
      try {
        const result = await uploadSingleFile(file)
        reportForm.reportFileName = result.fileName || ''
        reportForm.reportUrl = result.fileUrl || ''
      } catch (error) {
        console.error(error)
        alert('报告附件上传失败')
      }
    }

    const handleVisitFileSelected = async (event) => {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (!file) return
      try {
        const result = await uploadSingleFile(file)
        visitForm.caseRecordFileName = result.fileName || ''
        visitForm.caseRecordUrl = result.fileUrl || ''
      } catch (error) {
        console.error(error)
        alert('病历附件上传失败')
      }
    }

    const clearReportFile = () => { reportForm.reportFileName = ''; reportForm.reportUrl = '' }
    const clearVisitFile = () => { visitForm.caseRecordFileName = ''; visitForm.caseRecordUrl = '' }

    const buildRecordSummary = (item) => {
      return [
        hasMetricValue(item.heightCm) ? `身高 ${latestMetricText('heightCm', item.heightCm)}` : null,
        hasMetricValue(item.weightKg) ? `体重 ${latestMetricText('weightKg', item.weightKg)}` : null,
        hasMetricValue(item.bmi) ? `体质指数(BMI) ${latestMetricText('bmi', item.bmi)}` : null,
        hasMetricValue(item.bodyFatRate) ? `体脂率 ${latestMetricText('bodyFatRate', item.bodyFatRate)}` : null,
        hasMetricValue(item.systolicPressure) && hasMetricValue(item.diastolicPressure)
          ? `血压 ${item.systolicPressure}/${item.diastolicPressure} mmHg`
          : null,
        hasMetricValue(item.heartRate) ? `静息心率 ${item.heartRate} 次/分` : null,
        hasMetricValue(item.steps) ? `步数 ${item.steps} 步` : null,
        hasMetricValue(item.sleepHours) ? `睡眠 ${latestMetricText('sleepHours', item.sleepHours)}` : null,
        hasMetricValue(item.totalCholesterol) ? `总胆固醇 ${latestMetricText('totalCholesterol', item.totalCholesterol)}` : null,
        hasMetricValue(item.fastingGlucose) ? `血糖 ${latestMetricText('fastingGlucose', item.fastingGlucose)}` : null
      ].filter(Boolean).join(' · ') || '本次记录未形成可展示摘要'
    }

    const hasReportAttachment = (item) => Boolean(item?.attachments?.length || item?.reportFileName || item?.reportUrl)
    const resolveSourceLabel = (sourceType) => SOURCE_TYPE_LABELS[sourceType] || sourceType

    const resolveVisitName = (visitId) => {
      if (!visitId) return '独立报告'
      const matched = visits.value.find((item) => String(item.id) === String(visitId))
      return matched ? `${matched.visitDate} 就诊` : '关联就诊'
    }

    const openReportDetailsById = (reportId) => {
      if (reportId === null || reportId === undefined || reportId === '') return
      const idStr = String(reportId)
      recentlyCreatedReport.value = null
      activeDetailsReportId.value = idStr
      showReportDetailsDialog.value = true
      if (typeof router.replace === 'function' && String(route.query?.reportId || '') !== idStr) {
        router.replace({ path: '/health', query: { reportId: idStr } })
      }
    }

    let metricRecordRequestSeq = 0
    const openMetricRecordById = async (recordId) => {
      if (recordId === null || recordId === undefined || recordId === '') return
      const idStr = String(recordId)
      if (typeof router.replace === 'function' && String(route.query?.metricRecordId || '') !== idStr) {
        router.replace({ path: '/health', query: { metricRecordId: idStr } })
      }
      const seq = ++metricRecordRequestSeq
      try {
        const res = await getHealthRecord(idStr)
        if (seq !== metricRecordRequestSeq) return
        const record = unwrapData(res)
        if (record) openEditRecordDialog(record)
      } catch (error) {
        if (seq === metricRecordRequestSeq) {
          alert(error?.response?.data?.message || '打开核心指标记录失败')
        }
      }
    }

    const jumpFromReportToRecord = (recordId) => {
      showReportDetailsDialog.value = false
      openMetricRecordById(recordId)
    }

    const jumpFromRecordToReport = (reportId) => {
      showRecordDialog.value = false
      openReportDetailsById(reportId)
    }

    const handleReportDetailsSaved = async () => {
      await Promise.all([loadReports(), loadRecords()])
    }

    const openFile = (url) => { if (url) window.open(url, '_blank', 'noopener') }
    const goBack = () => { router.push('/home') }

    watch(() => route.query.recordId, async (recordId, previousId, onCleanup) => {
      if (!recordId) return
      let active = true
      onCleanup(() => { active = false })
      try {
        const response = await getHealthVisit(String(recordId))
        if (active) openEditVisitDialog(unwrapData(response))
      } catch (error) {
        if (active) alert(error?.response?.data?.message || '打开就诊记录失败')
      }
    }, {immediate: true})

    watch(() => route.query.metricRecordId, async (metricRecordId, previousId, onCleanup) => {
      if (!metricRecordId) return
      let active = true
      onCleanup(() => { active = false })
      try {
        const response = await getHealthRecord(String(metricRecordId))
        if (active) {
          const record = unwrapData(response)
          if (record) openEditRecordDialog(record)
        }
      } catch (error) {
        if (active) alert(error?.response?.data?.message || '打开核心指标记录失败')
      }
    }, {immediate: true})

    watch(() => route.query.reportId, (reportId) => {
      if (!reportId) return
      activeDetailsReportId.value = String(reportId)
      showReportDetailsDialog.value = true
    }, {immediate: true})

    onMounted(() => {
      loadPage()
    })

    return {
      DEFAULT_VISIBLE_COUNT,
      loading,
      formatNumber,
      submitting,
      summary,
      records,
      reports,
      visits,
      activeArchiveTab,
      showAllRecords,
      showAllReports,
      visibleRecords,
      visibleReports,
      activeTrendMetric,
      latestRecord,
      primaryKpiCards,
      secondaryMetricGroups,
      metricOptions,
      coreMetricFields,
      trendLimitOptions,
      visitTypeOptions,
      trendMetricKey,
      trendLimit,
      trendPoints,
      trendLoading,
      trendError,
      showRecordDialog,
      showVisitDialog,
      showReportDialog,
      showReportDetailsDialog,
      activeDetailsReportId,
      recentlyCreatedReport,
      recordDialogMode,
      visitDialogMode,
      reportDialogMode,
      editingRecordBmi,
      editingRecordSourceReportId,
      recordForm,
      visitForm,
      reportForm,
      reportUploadInputRef,
      visitUploadInputRef,
      goBack,
      loadTrend,
      selectTrendMetric,
      selectTrendLimit,
      openCreateRecordDialog,
      openEditRecordDialog,
      closeRecordDialog,
      submitRecordDialog,
      removeRecord,
      openCreateVisitDialog,
      openEditVisitDialog,
      closeVisitDialog,
      submitVisitDialog,
      removeVisit,
      openCreateReportDialog,
      openEditReportDialog,
      closeReportDialog,
      submitReportDialog,
      removeReport,
      openReportDetailsById,
      openMetricRecordById,
      jumpFromReportToRecord,
      jumpFromRecordToReport,
      handleReportDetailsSaved,
      openReportUploadPicker,
      openVisitUploadPicker,
      handleReportFileSelected,
      handleVisitFileSelected,
      clearReportFile,
      clearVisitFile,
      latestMetricText,
      buildRecordSummary,
      hasReportAttachment,
      resolveSourceLabel,
      resolveVisitName,
      openFile
    }
  }
}
</script>

<style scoped>
.health-page {
  min-height: 100vh;
  height: 100%;
  overflow: auto;
  box-sizing: border-box;
  padding: 14px 18px 24px;
  color: #edf4ff;
}

.panel-section {
  background: linear-gradient(135deg, rgba(7, 22, 39, 0.82), rgba(17, 49, 73, 0.72));
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 22px;
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(16px);
  padding: 16px 18px;
  margin-bottom: 14px;
}

.panel-head,
.archive-head,
.visit-card-head,
.record-head,
.report-card-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.compact-head {
  margin-bottom: 14px;
}

.panel-title-group {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.panel-title {
  margin: 0;
  font-size: 18px;
}

.meta-date {
  font-size: 12px;
  color: #8ea6bf;
  font-variant-numeric: tabular-nums;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.metric-card {
  text-align: left;
  padding: 12px 14px;
  background: rgba(10, 26, 42, 0.76);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 16px;
  color: inherit;
  cursor: pointer;
  transition: border-color 0.16s ease, background 0.16s ease, transform 0.14s ease, box-shadow 0.16s ease;
}

.metric-card:hover {
  border-color: rgba(56, 189, 248, 0.42);
  transform: translateY(-1px);
}

.metric-card.active {
  border-color: #38bdf8;
  background: rgba(14, 42, 68, 0.88);
  box-shadow: 0 0 0 1px rgba(56, 189, 248, 0.36);
}

.metric-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.metric-label {
  font-size: 12.5px;
  color: #93abc4;
}

.metric-badge {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(56, 189, 248, 0.14);
  color: #7dd3fc;
}

.metric-value {
  display: block;
  margin-top: 6px;
  font-size: 20px;
  font-variant-numeric: tabular-nums;
  color: #f3f8ff;
}

.secondary-metrics-panel {
  display: grid;
  gap: 8px;
  padding: 10px 0 12px;
  border-top: 1px solid rgba(148, 163, 184, 0.14);
}

.secondary-group-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.secondary-group-title {
  width: 60px;
  flex-shrink: 0;
  font-size: 12px;
  color: #8ea6bf;
}

.secondary-group-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1;
}

.trend-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(255, 255, 255, 0.05);
  color: #c7d6e5;
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease;
}

.trend-chip b {
  color: #f1f5f9;
  font-weight: 600;
}

.trend-chip:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(125, 211, 252, 0.36);
  color: #f8fbff;
}

.trend-chip.active {
  border-color: transparent;
  background: linear-gradient(135deg, #1996ff, #27d5a4);
  color: #fff;
  box-shadow: 0 4px 12px rgba(25, 150, 255, 0.28);
}

.trend-chip.active b {
  color: #fff;
}

.trend-range-switch {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  gap: 4px;
  padding: 3px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.range-chip {
  height: 24px;
  padding: 0 9px;
  border-radius: 7px;
  border-color: transparent;
  background: transparent;
}

.trend-panel {
  border-radius: 16px;
  padding: 12px 14px;
  background: linear-gradient(180deg, rgba(9, 23, 38, 0.72), rgba(14, 35, 55, 0.82));
}

.trend-error-state {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #fca5a5;
}

.archive-head {
  padding-bottom: 12px;
  margin-bottom: 14px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);
}

.archive-tabs {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 3px;
  border-radius: 11px;
  background: rgba(8, 21, 35, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.archive-tab-btn {
  height: 30px;
  padding: 0 13px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #9db3c8;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.16s ease, color 0.16s ease;
}

.archive-tab-btn:hover {
  color: #edf4ff;
}

.archive-tab-btn.active {
  background: linear-gradient(135deg, #1996ff, #27d5a4);
  color: #fff;
}

.report-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.record-list,
.visit-list {
  display: grid;
  gap: 10px;
}

.record-card,
.visit-card,
.report-card {
  padding: 14px 16px;
  background: rgba(10, 26, 42, 0.74);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 16px;
}

.report-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 10px;
}

.record-info {
  min-width: 0;
  flex: 1;
}

.record-title-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.record-info p,
.visit-card-head p {
  margin: 5px 0 0;
  color: #8ea6bf;
  font-size: 13px;
  line-height: 1.5;
}

.source-tag {
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
}

.visit-body {
  display: grid;
  gap: 6px;
}

.visit-body p {
  margin: 0;
  font-size: 13px;
}

.visit-body span {
  color: #8ea6bf;
  margin-right: 6px;
}

.visit-body strong {
  color: #f3f8ff;
  font-weight: 500;
  line-height: 1.55;
}

.visit-amount {
  margin: 8px 0;
  font-size: 13px;
  color: #cbd5e1;
}

.report-card-foot {
  padding-top: 10px;
  border-top: 1px solid rgba(148, 163, 184, 0.12);
}

.report-badges,
.toolbar-left,
.mobile-card-actions {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.visit-count-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 26px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid rgba(56, 189, 248, 0.24);
  background: rgba(56, 189, 248, 0.12);
  color: #bae6fd;
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
}

.linked-chip {
  border-color: rgba(39, 213, 164, 0.34);
  background: rgba(39, 213, 164, 0.14);
  color: #7bf0cc;
}

.linked-chip::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #34d399;
}

.list-expand-row {
  display: flex;
  justify-content: center;
  padding-top: 12px;
}

.expand-toggle-btn {
  height: 32px;
  padding: 0 16px;
  border-radius: 9px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(255, 255, 255, 0.05);
  color: #cbd5e1;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
}

.expand-toggle-btn:hover {
  background: rgba(56, 189, 248, 0.12);
  border-color: rgba(56, 189, 248, 0.38);
  color: #f0f9ff;
}

.created-report-banner,
.record-meta-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 10px 14px;
  margin-bottom: 12px;
  border-radius: 12px;
  background: rgba(56, 189, 248, 0.14);
  border: 1px solid rgba(56, 189, 248, 0.32);
  font-size: 13px;
}

.legacy-file-link {
  color: #7dd3fc;
  text-decoration: underline;
}

.empty-state {
  padding: 24px 0;
  text-align: center;
  color: #8ea6bf;
  font-size: 13px;
}

.empty-state.compact {
  padding: 16px 0;
}

.dialog-form {
  display: grid;
  gap: 12px;
}

.form-inline-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.form-metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px 12px;
}

.form-field {
  display: grid;
  gap: 6px;
  font-size: 13px;
  color: #c9d8e8;
}

.input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 10px;
  padding: 8px 10px;
  background: rgba(8, 21, 35, 0.85);
  color: #edf4ff;
  font-size: 13px;
}

.textarea {
  resize: vertical;
  min-height: 76px;
}

.ghost-btn,
.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  padding: 0 14px;
  border-radius: 9px;
  border: 1px solid transparent;
  font-size: 12.5px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.16s ease, border-color 0.16s ease, transform 0.14s ease;
}

.ghost-btn {
  border-color: rgba(148, 163, 184, 0.24);
  background: rgba(255, 255, 255, 0.07);
  color: #dbe8f5;
}

.ghost-btn:hover {
  background: rgba(255, 255, 255, 0.14);
}

.action-btn {
  background: linear-gradient(135deg, #1996ff, #27d5a4);
  color: #fff;
  box-shadow: 0 4px 12px rgba(25, 150, 255, 0.24);
}

.action-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.compact-action-btn {
  height: 30px;
  padding: 0 12px;
}

.mini-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  padding: 0 11px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(255, 255, 255, 0.07);
  color: #e2edf8;
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease, transform 0.14s ease;
}

.mini-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(148, 163, 184, 0.42);
  color: #ffffff;
  transform: translateY(-1px);
}

.mini-btn.accent {
  border-color: rgba(56, 189, 248, 0.32);
  background: rgba(56, 189, 248, 0.13);
  color: #bae6fd;
}

.mini-btn.accent:hover:not(:disabled) {
  background: rgba(56, 189, 248, 0.24);
  border-color: rgba(125, 211, 252, 0.56);
  color: #f0f9ff;
}

.mini-btn.danger {
  border-color: rgba(248, 113, 113, 0.32);
  background: rgba(239, 68, 68, 0.13);
  color: #fca5a5;
}

.mini-btn.danger:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.24);
  border-color: rgba(248, 113, 113, 0.56);
  color: #fee2e2;
}

button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.dental-tab-wrap :deep(.panel-section) {
  margin-bottom: 0;
  border: none;
  background: transparent;
  box-shadow: none;
  padding: 0;
}

@media (max-width: 1100px) {
  .metric-grid,
  .form-metrics-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .report-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .health-page {
    padding: 12px 10px 20px;
  }

  .panel-head,
  .archive-head,
  .visit-card-head,
  .record-head,
  .report-card-foot {
    flex-direction: column;
    align-items: flex-start;
  }

  .form-inline-grid,
  .form-metrics-grid {
    grid-template-columns: 1fr;
  }
}
</style>
