<template>
  <div class="health-page standard-app-page">
    <AppPageHeader title="健康" @back="goBack">
      <span>最近测量 {{ summary.latestMeasureDate || '暂无' }}</span>
      <span>最近就诊 {{ summary.lastVisitDate || '暂无' }}</span>
      <span>最近报告 {{ summary.lastExamDate || '暂无' }}</span>
    </AppPageHeader>

    <section class="summary-grid">
      <article class="app-card summary-card">
        <span>指标记录</span>
        <strong>{{ summary.recordCount || 0 }}</strong>
      </article>
      <article class="app-card summary-card">
        <span>医院就诊</span>
        <strong>{{ summary.visitCount || 0 }}</strong>
      </article>
      <article class="app-card summary-card">
        <span>报告单</span>
        <strong>{{ summary.reportCount || 0 }}</strong>
      </article>
      <article class="app-card summary-card">
        <span>最新体重</span>
        <strong>{{ latestMetricText('weightKg', latestRecord?.weightKg) }}</strong>
      </article>
    </section>

    <section class="app-card panel-section">
      <div class="panel-head">
        <div>
          <h2 class="panel-title">指标概览</h2>
          <p class="panel-tip">展示最近一次记录的核心指标，并支持切换趋势指标查看最近变化。</p>
        </div>
        <div class="toolbar-left">
          <button class="action-btn" :disabled="loading || submitting" @click="openCreateRecordDialog">新增指标记录</button>
        </div>
      </div>

      <div v-if="loading && !records.length" class="empty-state">加载中...</div>

      <template v-else>
        <div class="metric-grid">
          <article v-for="item in metricCards" :key="item.key" class="app-card metric-card">
            <span class="metric-label">{{ item.label }}</span>
            <strong class="metric-value">{{ item.value }}</strong>
            <small class="metric-date">{{ latestRecord?.measureDate || '暂无记录' }}</small>
          </article>
        </div>

        <div class="trend-panel">
          <div class="trend-head">
            <div class="trend-switch">
              <button
                v-for="item in metricOptions"
                :key="item.key"
                class="trend-chip"
                :class="{ active: trendMetricKey === item.key }"
                type="button"
                @click="selectTrendMetric(item.key)"
              >
                {{ item.label }}
              </button>
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

          <div v-if="trendLoading" class="empty-state compact">趋势数据加载中...</div>
          <div v-else-if="trendError" class="empty-state compact trend-error-state">
            <span>{{ trendError }}</span>
            <button type="button" class="mini-btn" @click="loadTrend">重试</button>
          </div>
          <div v-else-if="trendPoints.length" class="trend-list">
            <article
              v-for="(item, idx) in trendPoints"
              :key="item.recordId != null ? String(item.recordId) : `${item.measureDate}-${idx}`"
              class="trend-item"
            >
              <span>{{ item.measureDate }}</span>
              <strong>{{ latestMetricText(trendMetricKey, item.value) }}</strong>
            </article>
          </div>
          <div v-else class="empty-state compact">当前指标还没有足够的趋势数据</div>
        </div>
      </template>
    </section>

    <section class="app-card panel-section">
      <div class="panel-head">
        <div>
          <h2 class="panel-title">指标历史</h2>
          <p class="panel-tip">保留每次测量的原始指标值，方便回看体重、血脂、血糖和肝功能变化。</p>
        </div>
      </div>

      <div v-if="records.length" class="record-list">
        <article v-for="item in records" :key="String(item.id)" class="app-card record-card">
          <div class="record-head">
            <div>
              <strong>{{ item.measureDate }}</strong>
              <p>{{ buildRecordSummary(item) }}</p>
            </div>
            <div class="mobile-card-actions">
              <span v-if="item.sourceReportId != null" class="visit-count-chip linked-chip">已关联报告</span>
              <button
                v-if="item.sourceReportId != null"
                type="button"
                class="mini-btn"
                @click="openReportDetailsById(item.sourceReportId)"
              >
                查看来源报告
              </button>
              <button class="mini-btn" @click="openEditRecordDialog(item)">编辑</button>
              <button class="mini-btn danger" @click="removeRecord(item)">删除</button>
            </div>
          </div>
        </article>
      </div>
      <div v-else class="empty-state">暂无健康指标记录</div>
    </section>

    <DentalCleaningPanel />

    <div class="split-layout">
      <section class="app-card panel-section">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">医院就诊</h2>
            <p class="panel-tip">按每次医院就诊维护病历摘要、医生建议和病历附件。</p>
          </div>
          <div class="toolbar-left">
            <button class="action-btn" :disabled="submitting" @click="openCreateVisitDialog">新增就诊</button>
          </div>
        </div>

        <div v-if="visits.length" class="visit-list">
          <article v-for="item in visits" :key="item.id" class="app-card visit-card">
            <div class="visit-card-head">
              <div>
                <strong>{{ item.visitDate }} · {{ item.hospitalName }}</strong>
                <p>{{ [item.departmentName, item.doctorName, item.visitType].filter(Boolean).join(' · ') || '未补充科室与医生' }}</p>
              </div>
              <span class="visit-count-chip">{{ item.reportCount || 0 }} 份报告</span>
            </div>
            <p class="visit-amount">实际自付：{{ item.amount == null ? '未记录金额' : '¥' + formatNumber(item.amount, 2) }}</p>
            <div class="visit-body">
              <p><span>主诉</span><strong>{{ item.chiefComplaint || '-' }}</strong></p>
              <p><span>诊断</span><strong>{{ item.diagnosisSummary || '-' }}</strong></p>
              <p><span>处置</span><strong>{{ item.treatmentPlan || '-' }}</strong></p>
              <p><span>建议</span><strong>{{ item.doctorAdvice || '-' }}</strong></p>
            </div>
            <AttachmentGallery v-if="item.attachments?.length" :attachments="item.attachments" />
            <div class="mobile-card-actions">
              <span class="visit-count-chip">{{ item.attachments?.length || 0 }} 个附件</span>
              <button class="mini-btn" @click="openEditVisitDialog(item)">编辑</button>
              <button class="mini-btn danger" @click="removeVisit(item)">删除</button>
            </div>
          </article>
        </div>
        <div v-else class="empty-state">暂无医院就诊记录</div>
      </section>

      <section class="app-card panel-section">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">报告单</h2>
            <p class="panel-tip">保存年度体检、化验单和影像报告，并可挂到某次就诊记录下。</p>
          </div>
          <div class="toolbar-left">
            <button class="action-btn" :disabled="submitting" @click="openCreateReportDialog">新增报告</button>
          </div>
        </div>

        <div v-if="recentlyCreatedReport" class="created-report-banner">
          <span>报告「{{ recentlyCreatedReport.reportTitle }}」已保存，可继续补录逐项检查结果。</span>
          <div class="mobile-card-actions">
            <button type="button" class="action-btn compact-action-btn" @click="openReportDetailsById(recentlyCreatedReport.id)">
              录入检查结果
            </button>
            <button type="button" class="mini-btn" @click="recentlyCreatedReport = null">稍后再说</button>
          </div>
        </div>

        <div v-if="reports.length" class="report-list">
          <article v-for="item in reports" :key="String(item.id)" class="app-card report-card">
            <div class="visit-card-head">
              <div>
                <strong>{{ item.reportTitle }}</strong>
                <p>{{ item.examDate }} · {{ item.hospitalName || '未填写机构' }}</p>
              </div>
              <div class="report-badges">
                <span class="visit-count-chip">{{ resolveVisitName(item.visitId) }}</span>
                <span v-if="item.linkedRecordId != null" class="visit-count-chip linked-chip">已关联指标</span>
              </div>
            </div>
            <div class="visit-body">
              <p><span>摘要</span><strong>{{ item.summary || '-' }}</strong></p>
              <p><span>医生建议</span><strong>{{ item.doctorAdvice || '-' }}</strong></p>
              <p>
                <span>文件</span>
                <strong v-if="item.attachments?.length">已上传 {{ item.attachments.length }} 个附件</strong>
                <strong v-else-if="item.reportFileName || item.reportUrl">
                  <a v-if="item.reportUrl" class="legacy-file-link" :href="item.reportUrl" target="_blank" rel="noopener">
                    {{ item.reportFileName || '查看报告附件' }}
                  </a>
                  <template v-else>{{ item.reportFileName }}</template>
                </strong>
                <strong v-else>未上传文件</strong>
              </p>
            </div>
            <AttachmentGallery v-if="item.attachments?.length" :attachments="item.attachments" />
            <div class="mobile-card-actions">
              <span class="visit-count-chip">
                {{ hasReportAttachment(item) ? `${item.attachments?.length || 1} 个附件` : '0 个附件' }}
              </span>
              <button type="button" class="mini-btn" @click="openReportDetailsById(item.id)">检查结果</button>
              <button
                v-if="item.linkedRecordId != null"
                type="button"
                class="mini-btn"
                @click="openMetricRecordById(item.linkedRecordId)"
              >
                查看关联指标
              </button>
              <button class="mini-btn" @click="openEditReportDialog(item)">编辑</button>
              <button class="mini-btn danger" @click="removeReport(item)">删除</button>
            </div>
          </article>
        </div>
        <div v-else class="empty-state">暂无报告单记录</div>
      </section>
    </div>

    <MacDialog
      v-model="showRecordDialog"
      :form-state="recordForm"
      :title="recordDialogMode === 'create' ? '新增健康指标记录' : '编辑健康指标记录'"
      width="960px"
      panel-class="health-record-dialog"
      :close-disabled="submitting"
      @close="closeRecordDialog"
    >
        <form id="health-record-dialog-form" class="dialog-form dialog-density-grid dialog-grid-cols-4" @submit.prevent="submitRecordDialog">
          <div v-if="recordDialogMode === 'edit' && (editingRecordBmi !== null || editingRecordSourceReportId)" class="record-meta-bar dialog-span-all">
            <span>计算 BMI：<strong>{{ latestMetricText('bmi', editingRecordBmi) }}</strong></span>
            <button
              v-if="editingRecordSourceReportId"
              type="button"
              class="mini-btn"
              @click="jumpFromRecordToReport(editingRecordSourceReportId)"
            >
              查看来源报告
            </button>
          </div>
          <div class="form-inline-grid dialog-grid-group">
            <label class="form-field">
              <span>记录日期</span>
              <input v-model="recordForm.measureDate" class="input" type="date" required />
            </label>
            <label class="form-field">
              <span>身高(cm)</span>
              <input v-model="recordForm.heightCm" class="input" type="number" min="0" step="0.1" />
            </label>
            <label class="form-field">
              <span>体重(kg)</span>
              <input v-model="recordForm.weightKg" class="input" type="number" min="0" step="0.1" />
            </label>
          </div>

          <div class="form-inline-grid dialog-grid-group">
            <label class="form-field">
              <span>体脂率(%)</span>
              <input v-model="recordForm.bodyFatRate" class="input" type="number" min="0" step="0.1" />
            </label>
            <label class="form-field">
              <span>收缩压(mmHg)</span>
              <input v-model="recordForm.systolicPressure" class="input" type="number" min="0" step="1" />
            </label>
            <label class="form-field">
              <span>舒张压(mmHg)</span>
              <input v-model="recordForm.diastolicPressure" class="input" type="number" min="0" step="1" />
            </label>
          </div>

          <div class="form-inline-grid dialog-grid-group">
            <label class="form-field">
              <span>总胆固醇(mmol/L)</span>
              <input v-model="recordForm.totalCholesterol" class="input" type="number" min="0" step="0.01" />
            </label>
            <label class="form-field">
              <span>甘油三酯(mmol/L)</span>
              <input v-model="recordForm.triglycerides" class="input" type="number" min="0" step="0.01" />
            </label>
            <label class="form-field">
              <span>高密度脂蛋白(mmol/L)</span>
              <input v-model="recordForm.hdlCholesterol" class="input" type="number" min="0" step="0.01" />
            </label>
          </div>

          <div class="form-inline-grid dialog-grid-group">
            <label class="form-field">
              <span>低密度脂蛋白(mmol/L)</span>
              <input v-model="recordForm.ldlCholesterol" class="input" type="number" min="0" step="0.01" />
            </label>
            <label class="form-field">
              <span>空腹血糖(mmol/L)</span>
              <input v-model="recordForm.fastingGlucose" class="input" type="number" min="0" step="0.01" />
            </label>
            <label class="form-field">
              <span>静息心率(次/分)</span>
              <input v-model="recordForm.heartRate" class="input" type="number" min="0" step="1" />
            </label>
          </div>

          <div class="form-inline-grid dialog-grid-group">
            <label class="form-field">
              <span>尿酸(μmol/L)</span>
              <input v-model="recordForm.uricAcid" class="input" type="number" min="0" step="1" />
            </label>
            <label class="form-field">
              <span>谷丙转氨酶(U/L)</span>
              <input v-model="recordForm.alanineAminotransferase" class="input" type="number" min="0" step="1" />
            </label>
            <label class="form-field">
              <span>谷草转氨酶(U/L)</span>
              <input v-model="recordForm.aspartateAminotransferase" class="input" type="number" min="0" step="1" />
            </label>
          </div>

          <div class="form-inline-grid dialog-grid-group">
            <label class="form-field">
              <span>γ-谷氨酰转移酶(U/L)</span>
              <input v-model="recordForm.gammaGlutamylTransferase" class="input" type="number" min="0" step="1" />
            </label>
          </div>

          <label class="form-field dialog-span-all">
            <span>备注</span>
            <textarea v-model.trim="recordForm.note" class="input textarea" rows="3" maxlength="255" placeholder="例如：晨起空腹、体检前一周作息规律" />
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
import MacDialog from '@/components/MacDialog.vue'
import {confirmDialog} from '@/components/systemDialog'
import AttachmentManager from '@/components/AttachmentManager.vue'
import AttachmentGallery from '@/components/AttachmentGallery.vue'
import {
  buildCoreMetricPayload,
  hasMetricValue,
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
  components: {AppPageHeader, MacDialog, AttachmentManager, AttachmentGallery, DentalCleaningPanel, HealthReportDetailsDialog},
  setup() {
    const router = useRouter()
    const route = useRoute()

    const loading = ref(false)
    const submitting = ref(false)
    const records = ref([])
    const reports = ref([])
    const visits = ref([])
    const trendMetricKey = ref(METRIC_OPTIONS[0].key)
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

    const recordForm = reactive({
      measureDate: '',
      heightCm: '',
      weightKg: '',
      bodyFatRate: '',
      systolicPressure: '',
      diastolicPressure: '',
      totalCholesterol: '',
      triglycerides: '',
      hdlCholesterol: '',
      ldlCholesterol: '',
      fastingGlucose: '',
      heartRate: '',
      uricAcid: '',
      alanineAminotransferase: '',
      aspartateAminotransferase: '',
      gammaGlutamylTransferase: '',
      note: ''
    })

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

    const metricCards = computed(() => {
      const source = latestRecord.value || {}
      return [
        { key: 'weightKg', label: '体重', value: latestMetricText('weightKg', source.weightKg) },
        { key: 'bmi', label: 'BMI', value: latestMetricText('bmi', source.bmi) },
        { key: 'bodyFatRate', label: '体脂率', value: latestMetricText('bodyFatRate', source.bodyFatRate) },
        {
          key: 'bloodPressure',
          label: '血压',
          value: hasMetricValue(source.systolicPressure) && hasMetricValue(source.diastolicPressure)
            ? `${source.systolicPressure}/${source.diastolicPressure} mmHg`
            : '暂无'
        },
        { key: 'totalCholesterol', label: '总胆固醇', value: latestMetricText('totalCholesterol', source.totalCholesterol) },
        { key: 'fastingGlucose', label: '空腹血糖', value: latestMetricText('fastingGlucose', source.fastingGlucose) },
        { key: 'uricAcid', label: '尿酸', value: latestMetricText('uricAcid', source.uricAcid) }
      ]
    })

    const metricOptions = METRIC_OPTIONS
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
      Object.assign(recordForm, {
        measureDate: '',
        heightCm: '',
        weightKg: '',
        bodyFatRate: '',
        systolicPressure: '',
        diastolicPressure: '',
        totalCholesterol: '',
        triglycerides: '',
        hdlCholesterol: '',
        ldlCholesterol: '',
        fastingGlucose: '',
        heartRate: '',
        uricAcid: '',
        alanineAminotransferase: '',
        aspartateAminotransferase: '',
        gammaGlutamylTransferase: '',
        note: ''
      })
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
      Object.assign(recordForm, {
        measureDate: item.measureDate || '',
        heightCm: item.heightCm ?? '',
        weightKg: item.weightKg ?? '',
        bodyFatRate: item.bodyFatRate ?? '',
        systolicPressure: item.systolicPressure ?? '',
        diastolicPressure: item.diastolicPressure ?? '',
        totalCholesterol: item.totalCholesterol ?? '',
        triglycerides: item.triglycerides ?? '',
        hdlCholesterol: item.hdlCholesterol ?? '',
        ldlCholesterol: item.ldlCholesterol ?? '',
        fastingGlucose: item.fastingGlucose ?? '',
        heartRate: item.heartRate ?? '',
        uricAcid: item.uricAcid ?? '',
        alanineAminotransferase: item.alanineAminotransferase ?? '',
        aspartateAminotransferase: item.aspartateAminotransferase ?? '',
        gammaGlutamylTransferase: item.gammaGlutamylTransferase ?? '',
        note: item.note || ''
      })
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
      const hasAnyFieldInput = [
        'heightCm', 'weightKg', 'bodyFatRate', 'systolicPressure', 'diastolicPressure',
        'totalCholesterol', 'triglycerides', 'hdlCholesterol', 'ldlCholesterol',
        'fastingGlucose', 'heartRate', 'uricAcid', 'alanineAminotransferase',
        'aspartateAminotransferase', 'gammaGlutamylTransferase'
      ].some((key) => hasMetricValue(recordForm[key]))
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

    const openReportUploadPicker = () => {
      reportUploadInputRef.value?.click()
    }

    const openVisitUploadPicker = () => {
      visitUploadInputRef.value?.click()
    }

    const handleReportFileSelected = async (event) => {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (!file) {
        return
      }
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
      if (!file) {
        return
      }
      try {
        const result = await uploadSingleFile(file)
        visitForm.caseRecordFileName = result.fileName || ''
        visitForm.caseRecordUrl = result.fileUrl || ''
      } catch (error) {
        console.error(error)
        alert('病历附件上传失败')
      }
    }

    const clearReportFile = () => {
      reportForm.reportFileName = ''
      reportForm.reportUrl = ''
    }

    const clearVisitFile = () => {
      visitForm.caseRecordFileName = ''
      visitForm.caseRecordUrl = ''
    }

    const latestMetricText = (metricKey, value) => {
      const config = METRIC_OPTIONS.find((item) => item.key === metricKey)
      if (!config) {
        return value || '暂无'
      }
      const numberText = formatNumber(value, config.decimals)
      return numberText === '暂无' ? numberText : `${numberText} ${config.unit}`.trim()
    }

    const buildRecordSummary = (item) => {
      return [
        hasMetricValue(item.weightKg) ? `体重 ${latestMetricText('weightKg', item.weightKg)}` : null,
        hasMetricValue(item.bmi) ? `BMI ${latestMetricText('bmi', item.bmi)}` : null,
        hasMetricValue(item.bodyFatRate) ? `体脂率 ${latestMetricText('bodyFatRate', item.bodyFatRate)}` : null,
        hasMetricValue(item.systolicPressure) && hasMetricValue(item.diastolicPressure)
          ? `血压 ${item.systolicPressure}/${item.diastolicPressure} mmHg`
          : null,
        hasMetricValue(item.totalCholesterol) ? `总胆固醇 ${latestMetricText('totalCholesterol', item.totalCholesterol)}` : null,
        hasMetricValue(item.fastingGlucose) ? `血糖 ${latestMetricText('fastingGlucose', item.fastingGlucose)}` : null
      ].filter(Boolean).join(' · ') || '本次记录未形成可展示摘要'
    }

    const hasReportAttachment = (item) => Boolean(item?.attachments?.length || item?.reportFileName || item?.reportUrl)

    const resolveVisitName = (visitId) => {
      if (!visitId) {
        return '独立报告'
      }
      const matched = visits.value.find((item) => String(item.id) === String(visitId))
      return matched ? `${matched.visitDate} 就诊` : '关联就诊'
    }

    const openReportDetailsById = (reportId) => {
      if (reportId === null || reportId === undefined || reportId === '') {
        return
      }
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
      if (recordId === null || recordId === undefined || recordId === '') {
        return
      }
      const idStr = String(recordId)
      if (typeof router.replace === 'function' && String(route.query?.metricRecordId || '') !== idStr) {
        router.replace({ path: '/health', query: { metricRecordId: idStr } })
      }
      const seq = ++metricRecordRequestSeq
      try {
        const res = await getHealthRecord(idStr)
        if (seq !== metricRecordRequestSeq) {
          return
        }
        const record = unwrapData(res)
        if (record) {
          openEditRecordDialog(record)
        }
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

    const openFile = (url) => {
      if (!url) {
        return
      }
      window.open(url, '_blank', 'noopener')
    }

    const goBack = () => {
      router.push('/home')
    }

    // 从账单直接查询单次就诊，避免历史记录不在当前分页。
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

    // 按 ID 直达核心指标记录。
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

    // 按 ID 直达体检报告明细。
    watch(() => route.query.reportId, (reportId) => {
      if (!reportId) return
      activeDetailsReportId.value = String(reportId)
      showReportDetailsDialog.value = true
    }, {immediate: true})

    onMounted(() => {
      loadPage()
    })

    return {
      loading,
      formatNumber,
      submitting,
      summary,
      records,
      reports,
      visits,
      latestRecord,
      metricCards,
      metricOptions,
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
  padding: 14px 18px 20px;
  color: #edf4ff;
}

.page-nav {
  margin-bottom: 12px;
}

.back-home-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  padding: 10px 16px;
  color: #f8fbff;
  background: rgba(12, 32, 52, 0.58);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(12px);
  cursor: pointer;
}

.back-home-icon {
  font-size: 18px;
}

.hero-panel,
.panel-section {
  background: linear-gradient(135deg, rgba(7, 22, 39, 0.82), rgba(17, 49, 73, 0.72));
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 24px;
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(16px);
}

.hero-panel {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  margin-bottom: 14px;
}

.page-title {
  margin: 0;
  font-size: 30px;
}

.page-subtitle,
.panel-tip {
  margin: 8px 0 0;
  color: #9db3c8;
  line-height: 1.6;
}

.hero-tags,
.toolbar-left,
.trend-switch,
.mobile-card-actions,
.upload-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.hero-tag,
.visit-count-chip,
.trend-chip,
.mini-btn,
.ghost-btn,
.action-btn {
  border-radius: 999px;
  border: none;
}

.hero-tag,
.visit-count-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 14px;
  background: rgba(56, 189, 248, 0.16);
  color: #bfe8ff;
  font-size: 13px;
}

.summary-grid,
.metric-grid,
.split-layout,
.form-inline-grid {
  display: grid;
  gap: 16px;
}

.summary-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-bottom: 14px;
}

.summary-card,
.metric-card,
.trend-item,
.record-card,
.visit-card,
.report-card {
  background: rgba(10, 26, 42, 0.74);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 20px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.summary-card {
  padding: 14px 16px;
}

.summary-card span,
.metric-label,
.visit-body span,
.record-head p,
.visit-card-head p,
.empty-state {
  color: #8ea6bf;
}

.summary-card strong {
  display: block;
  margin-top: 8px;
  font-size: 24px;
}

.panel-section {
  padding: 18px;
  margin-bottom: 14px;
}

.panel-head,
.visit-card-head,
.record-head,
.trend-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.panel-head {
  align-items: flex-start;
  margin-bottom: 14px;
}

.panel-title {
  margin: 0;
  font-size: 20px;
}

.metric-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-bottom: 14px;
}

.metric-card {
  padding: 14px 16px;
}

.metric-value {
  display: block;
  margin-top: 8px;
  font-size: 22px;
}

.metric-date {
  display: block;
  margin-top: 8px;
  color: #89a1ba;
}

.trend-panel {
  border-radius: 20px;
  padding: 14px;
  background: linear-gradient(180deg, rgba(9, 23, 38, 0.72), rgba(14, 35, 55, 0.82));
}

.trend-chip {
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.08);
  color: #c7d6e5;
  cursor: pointer;
}

.trend-chip.active {
  background: linear-gradient(135deg, #1996ff, #27d5a4);
  color: #fff;
}

.trend-range-switch,
.report-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.trend-error-state {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #fca5a5;
}

.linked-chip {
  background: rgba(39, 213, 164, 0.2);
  color: #7bf0cc;
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
  border-radius: 14px;
  background: rgba(56, 189, 248, 0.14);
  border: 1px solid rgba(56, 189, 248, 0.32);
  font-size: 13px;
}

.compact-action-btn {
  padding: 6px 12px;
  font-size: 13px;
}

.legacy-file-link {
  color: #7dd3fc;
  text-decoration: underline;
}

.trend-list {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.trend-item {
  padding: 12px 14px;
}

.trend-item strong {
  display: block;
  margin-top: 6px;
  font-size: 16px;
}

.record-list,
.visit-list,
.report-list {
  display: grid;
  gap: 14px;
}

.record-card,
.visit-card,
.report-card {
  padding: 14px 16px;
}

.record-head strong,
.visit-card-head strong {
  font-size: 16px;
}

.visit-body {
  display: grid;
  gap: 8px;
  margin: 10px 0;
}

.visit-body p {
  margin: 0;
}

.visit-body strong {
  display: block;
  margin-top: 4px;
  color: #f3f8ff;
  line-height: 1.6;
}

.split-layout {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.empty-state {
  padding: 18px 0;
}

.empty-state.compact {
  padding-bottom: 0;
}

.dialog-form {
  display: grid;
  gap: 12px;
}

.form-inline-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.form-field {
  display: grid;
  gap: 8px;
  font-size: 14px;
  color: #c9d8e8;
}

.input {
  width: 100%;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 14px;
  padding: 10px 12px;
  background: rgba(8, 21, 35, 0.82);
  color: #edf4ff;
}

.textarea {
  resize: vertical;
  min-height: 92px;
}

.hidden-input {
  display: none;
}

.upload-display {
  flex: 1;
}

.upload-btn {
  white-space: nowrap;
}

.ghost-btn,
.action-btn,
.mini-btn {
  padding: 9px 14px;
  cursor: pointer;
}

.ghost-btn {
  background: rgba(255, 255, 255, 0.08);
  color: #dbe8f5;
}

.action-btn {
  background: linear-gradient(135deg, #1996ff, #27d5a4);
  color: #fff;
}

.mini-btn {
  padding: 7px 12px;
  background: rgba(255, 255, 255, 0.08);
  color: #dbe8f5;
}

.mini-btn.danger {
  background: #fee2e2;
  color: #b42318;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 1100px) {
  .summary-grid,
  .metric-grid,
  .split-layout,
  .trend-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .form-inline-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .health-page {
    padding: 14px 12px 20px;
  }

  .hero-panel,
  .panel-head,
  .visit-card-head,
  .record-head {
    flex-direction: column;
  }

  .summary-grid,
  .metric-grid,
  .split-layout,
  .trend-list,
  .form-inline-grid {
    grid-template-columns: 1fr;
  }
}
</style>
