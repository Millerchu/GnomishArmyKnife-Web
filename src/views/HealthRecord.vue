<template>
  <div class="health-page">
    <div class="page-nav">
      <button type="button" class="back-home-btn" @click="goBack">
        <span class="back-home-icon">←</span>
        <span>返回桌面</span>
      </button>
    </div>

    <div class="hero-panel">
      <div>
        <h1 class="page-title">健康</h1>
        <p class="page-subtitle">参考苹果健康应用的信息结构，把全部指标、趋势变化和体检报告放在统一入口里，先看状态，再看某项指标的历史。</p>
      </div>
      <div class="hero-tags">
        <span class="hero-tag">最近测量 {{ summary.latestMeasureDate || '暂无' }}</span>
        <span class="hero-tag">上次体检 {{ summary.lastExamDate || '暂无' }}</span>
        <span class="hero-tag">{{ usingLocalData ? '本地演示数据' : '已接真实接口' }}</span>
      </div>
    </div>

    <div class="top-layout">
      <section class="overview-panel">
        <div class="panel-head overview-head">
          <div>
            <h2 class="panel-title">健康概览</h2>
            <p class="panel-tip">所有指标都以最新值展示，点击可查看历史，桌面端支持像主页应用一样直接拖动排序。</p>
          </div>
          <div class="toolbar-left">
            <button class="action-btn" :disabled="submitting" @click="openCreateRecordDialog(activeMetricKey)">新增{{ activeMetricMeta.label }}记录</button>
            <button class="ghost-btn" :disabled="submitting" @click="showMetricCustomizer = !showMetricCustomizer">
              {{ showMetricCustomizer ? '收起自定义' : '自定义展示' }}
            </button>
          </div>
        </div>

        <div v-if="showMetricCustomizer" class="metric-customizer">
          <div class="customizer-head">
            <strong>选择概览中要展示的指标，展示后的顺序可直接拖动调整</strong>
            <div class="customizer-actions">
              <button class="mini-btn" type="button" @click="selectAllMetrics">显示全部</button>
              <button class="mini-btn" type="button" @click="resetMetricSelection">恢复默认</button>
            </div>
          </div>
          <div class="customizer-grid">
            <label
              v-for="item in metricDefinitions"
              :key="item.key"
              class="customizer-chip"
              :class="{ active: selectedOverviewMetricKeys.includes(item.key) }"
            >
              <input
                class="hidden-checkbox"
                type="checkbox"
                :checked="selectedOverviewMetricKeys.includes(item.key)"
                @change="toggleOverviewMetric(item.key)"
              />
              <span>{{ item.label }}</span>
            </label>
          </div>
        </div>

        <div class="overview-grid">
          <article
            v-for="item in visibleMetricCards"
            :key="item.key"
            class="metric-card"
            :class="[item.accentClass, { active: activeMetricKey === item.key, dragging: draggingMetricKey === item.key, 'drag-over': dragOverMetricKey === item.key && draggingMetricKey !== item.key }]"
            :draggable="!isMobileViewport"
            @dragstart="handleMetricDragStart(item, $event)"
            @dragenter.prevent="handleMetricDragEnter(item)"
            @dragover.prevent
            @drop.prevent="handleMetricDrop(item)"
            @dragend="handleMetricDragEnd"
            @click="handleMetricCardClick(item.key)"
          >
            <div class="metric-card-head compact">
              <div class="metric-icon-box compact" :style="item.iconStyle">
                <span class="metric-icon-text compact">{{ item.iconText }}</span>
              </div>
              <div class="metric-copy compact">
                <span class="metric-label">{{ item.label }}</span>
                <strong class="metric-value compact">{{ item.displayValue }}</strong>
                <span class="metric-date compact">{{ item.measureDateText }}</span>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section class="trend-panel">
        <div class="panel-head trend-head">
          <div>
            <h2 class="panel-title">指标趋势</h2>
            <p class="panel-tip">缩成侧栏视图，固定比例显示，避免桌面端被横向拉得过大。</p>
          </div>
          <div class="trend-switch">
            <button
              v-for="item in trendMetricOptions"
              :key="item.key"
              class="trend-chip"
              :class="{ active: selectedTrendMetric === item.key }"
              type="button"
              @click="selectTrendMetric(item.key)"
            >
              {{ item.label }}
            </button>
          </div>
        </div>

        <div v-if="chartSeries.length" class="trend-chart-card compact">
          <div class="trend-chart-top">
            <div>
              <strong class="trend-chart-title">{{ selectedTrendMeta.label }}</strong>
              <p class="trend-chart-subtitle">最近 {{ chartSeries.length }} 次</p>
            </div>
            <div class="trend-current">
              <span>最新值</span>
              <strong>{{ formatMetricValue(selectedTrendMeta.key, chartSeries[chartSeries.length - 1]?.value) }}</strong>
            </div>
          </div>

          <div class="trend-visual compact">
            <svg class="trend-svg compact" viewBox="0 0 360 200" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
              <polyline class="trend-grid" points="34,24 34,168 336,168" />
              <polyline class="trend-path" :style="{ stroke: selectedTrendMeta.color }" :points="trendPolyline" />
              <circle
                v-for="point in trendChartPoints"
                :key="point.measureDate"
                class="trend-dot"
                :style="{ fill: selectedTrendMeta.color }"
                :cx="point.x"
                :cy="point.y"
                r="3"
              />
            </svg>

            <div class="trend-labels compact">
              <div v-for="point in trendChartPoints" :key="`${point.measureDate}-label`" class="trend-label-card compact">
                <span>{{ point.label }}</span>
                <strong>{{ formatMetricValue(selectedTrendMeta.key, point.value) }}</strong>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="subtle-empty trend-empty">当前没有足够的趋势数据</div>
      </section>
    </div>

    <div class="health-layout">
      <section class="history-panel">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">{{ activeMetricMeta.label }}历史记录</h2>
            <p class="panel-tip">仅展示指标值、记录日期和相对上次的趋势变化。</p>
          </div>
          <div class="toolbar-left">
            <button class="action-btn" :disabled="submitting" @click="openCreateRecordDialog(activeMetricKey)">新增{{ activeMetricMeta.label }}</button>
          </div>
        </div>

        <div v-if="metricHistoryItems.length" class="history-list">
          <article v-for="item in metricHistoryItems" :key="item.id" class="history-card">
            <div class="history-card-head">
              <div class="history-cell">
                <span>指标</span>
                <strong class="history-primary">{{ item.primaryText }}</strong>
              </div>
              <div class="history-cell">
                <span>记录日期</span>
                <strong>{{ item.measureDate }}</strong>
              </div>
              <div class="history-cell">
                <span>趋势</span>
                <strong class="history-trend" :class="item.trendClass">{{ item.trendText }}</strong>
              </div>
              <div class="history-actions">
                <button class="mini-btn" @click="openEditRecordDialog(item.rawRecord)">编辑</button>
                <button class="mini-btn danger" @click="removeRecord(item.rawRecord)">删除</button>
              </div>
            </div>
          </article>
        </div>
        <div v-else class="subtle-empty history-empty">当前指标还没有历史记录，可以直接新增。</div>
      </section>

      <aside class="report-panel">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">体检报告</h2>
            <p class="panel-tip">记录上次体检时间与报告文件，移动端优先保留摘要信息，不展开过多详情。</p>
          </div>
          <div class="toolbar-left">
            <button class="action-btn" :disabled="submitting" @click="openCreateReportDialog">新增报告</button>
          </div>
        </div>

        <div class="report-summary-grid">
          <article class="summary-card">
            <span>上次体检</span>
            <strong>{{ summary.lastExamDate || '暂无' }}</strong>
          </article>
          <article class="summary-card">
            <span>报告总数</span>
            <strong>{{ reports.length }}</strong>
          </article>
          <article class="summary-card">
            <span>最近测量</span>
            <strong>{{ summary.latestMeasureDate || '暂无' }}</strong>
          </article>
        </div>

        <div v-if="reports.length" class="report-list">
          <article v-for="item in displayReports" :key="item.id" class="report-card">
            <div class="report-card-head">
              <div>
                <strong>{{ item.reportTitle }}</strong>
                <p>{{ item.examDate }} · {{ item.hospitalName || '未填写机构' }}</p>
              </div>
              <span class="report-date-chip">体检</span>
            </div>

            <div class="report-body compact">
              <p>
                <span>文件</span>
                <strong>{{ item.reportFileName || '未上传文件' }}</strong>
              </p>
              <p v-if="!isMobileViewport">
                <span>摘要</span>
                <strong>{{ item.summary || '暂无摘要' }}</strong>
              </p>
              <p v-if="!isMobileViewport && item.doctorAdvice">
                <span>医生建议</span>
                <strong>{{ item.doctorAdvice }}</strong>
              </p>
            </div>

            <div class="mobile-card-actions">
              <button class="mini-btn" @click="viewReport(item)">查看文件</button>
              <button class="mini-btn" @click="openEditReportDialog(item)">编辑</button>
              <button class="mini-btn danger" @click="removeReport(item)">删除</button>
            </div>
          </article>
        </div>
        <div v-else class="subtle-empty report-empty">当前还没有体检报告记录</div>
      </aside>
    </div>

    <div v-if="showRecordDialog" class="dialog-mask" @click.self="closeRecordDialog">
      <div class="dialog">
        <h3 class="dialog-title">{{ recordDialogMode === 'create' ? '新增健康记录' : '编辑健康记录' }}</h3>
        <p class="dialog-subtitle">{{ recordDialogHintText }}</p>

        <form class="dialog-form" @submit.prevent="submitRecordDialog">
          <div class="form-inline-grid single-date-row">
            <label class="form-field">
              <span>记录日期</span>
              <input v-model="recordForm.measureDate" class="input" type="date" required />
            </label>
          </div>

          <div
            v-for="(row, rowIndex) in visibleRecordFieldRows"
            :key="`field-row-${rowIndex}`"
            class="form-inline-grid"
          >
            <label
              v-for="field in row"
              :key="field.key"
              class="form-field"
            >
              <span>{{ field.label }}</span>
              <input
                v-model="recordForm[field.key]"
                class="input"
                :type="field.type"
                :min="field.min"
                :step="field.step"
                :placeholder="field.placeholder"
              />
            </label>
          </div>

          <label class="form-field">
            <span>备注</span>
            <textarea v-model.trim="recordForm.note" class="input textarea" rows="3" maxlength="200" placeholder="例如：晨起空腹、健身后测量等" />
          </label>

          <div class="dialog-actions">
            <button type="button" class="ghost-btn" :disabled="submitting" @click="closeRecordDialog">取消</button>
            <button type="submit" class="action-btn" :disabled="submitting">
              {{ submitting ? '提交中...' : (recordDialogMode === 'create' ? '保存记录' : '更新记录') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="showReportDialog" class="dialog-mask" @click.self="closeReportDialog">
      <div class="dialog">
        <h3 class="dialog-title">{{ reportDialogMode === 'create' ? '新增体检报告' : '编辑体检报告' }}</h3>
        <form class="dialog-form" @submit.prevent="submitReportDialog">
          <div class="form-inline-grid">
            <label class="form-field">
              <span>体检日期</span>
              <input v-model="reportForm.examDate" class="input" type="date" required />
            </label>
            <label class="form-field">
              <span>体检机构</span>
              <input v-model.trim="reportForm.hospitalName" class="input" maxlength="64" placeholder="例如：市体检中心" />
            </label>
          </div>

          <label class="form-field">
            <span>报告标题</span>
            <input v-model.trim="reportForm.reportTitle" class="input" maxlength="64" placeholder="例如：2026年度体检报告" required />
          </label>

          <label class="form-field">
            <span>报告文件</span>
            <div class="upload-row">
              <input :value="reportForm.reportFileName" class="input upload-display" placeholder="未上传体检报告" readonly />
              <button type="button" class="ghost-btn upload-btn" :disabled="submitting" @click="openReportUploadPicker">选择文件</button>
              <button
                v-if="reportForm.reportFileName"
                type="button"
                class="mini-btn"
                :disabled="submitting"
                @click="clearUploadedReportFile"
              >
                清除
              </button>
            </div>
            <input ref="reportUploadInputRef" class="hidden-input" type="file" accept=".pdf,image/*,.doc,.docx" @change="handleReportFileSelected" />
            <small class="field-tip">支持 PDF、图片和 Office 文档；后端未联通时会临时保留当前会话访问地址。</small>
          </label>

          <label class="form-field">
            <span>报告摘要</span>
            <textarea v-model.trim="reportForm.summary" class="input textarea" rows="3" maxlength="240" placeholder="记录异常项、重点关注指标等" />
          </label>

          <label class="form-field">
            <span>医生建议</span>
            <textarea v-model.trim="reportForm.doctorAdvice" class="input textarea" rows="3" maxlength="240" placeholder="例如：控制体重、复查血脂等" />
          </label>

          <div class="dialog-actions">
            <button type="button" class="ghost-btn" :disabled="submitting" @click="closeReportDialog">取消</button>
            <button type="submit" class="action-btn" :disabled="submitting">
              {{ submitting ? '提交中...' : (reportDialogMode === 'create' ? '保存报告' : '更新报告') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import {computed, onBeforeUnmount, onMounted, reactive, ref} from 'vue'
import {useRouter} from 'vue-router'
import {
  createHealthRecord,
  createHealthReport,
  deleteHealthRecord,
  deleteHealthReport,
  getHealthSummary,
  getHealthTrends,
  listHealthRecords,
  listHealthReports,
  updateHealthRecord,
  updateHealthReport,
  uploadHealthReportFile
} from '@/api/healthRecord'

const HEALTH_RECORD_FETCH_SIZE = 200
const LOCAL_RECORD_KEY = 'health_record_entries'
const LOCAL_REPORT_KEY = 'health_report_entries'
const OVERVIEW_METRIC_STORAGE_KEY = 'health_overview_metric_keys'
const OVERVIEW_METRIC_VERSION_STORAGE_KEY = 'health_overview_metric_version'
const CURRENT_OVERVIEW_METRIC_VERSION = 2
const NEW_LIVER_METRIC_KEYS = ['uricAcid', 'alanineAminotransferase', 'aspartateAminotransferase', 'gammaGlutamylTransferase']
const DEFAULT_RECORDS = [
  {id: 'health-1', measureDate: '2025-11-12', heightCm: 175, weightKg: 78.6, bodyFatRate: 22.8, systolicPressure: 128, diastolicPressure: 84, totalCholesterol: 5.48, triglycerides: 1.92, hdlCholesterol: 1.08, ldlCholesterol: 3.46, fastingGlucose: 5.3, heartRate: 76, uricAcid: 468, alanineAminotransferase: 52, aspartateAminotransferase: 39, gammaGlutamylTransferase: 78, note: '年末应酬较多，状态一般'},
  {id: 'health-2', measureDate: '2025-12-18', heightCm: 175, weightKg: 77.9, bodyFatRate: 22.1, systolicPressure: 124, diastolicPressure: 82, totalCholesterol: 5.32, triglycerides: 1.76, hdlCholesterol: 1.12, ldlCholesterol: 3.31, fastingGlucose: 5.2, heartRate: 74, uricAcid: 452, alanineAminotransferase: 46, aspartateAminotransferase: 35, gammaGlutamylTransferase: 71, note: '恢复规律作息'},
  {id: 'health-3', measureDate: '2026-01-22', heightCm: 175, weightKg: 77.1, bodyFatRate: 21.4, systolicPressure: 122, diastolicPressure: 80, totalCholesterol: 5.18, triglycerides: 1.63, hdlCholesterol: 1.16, ldlCholesterol: 3.18, fastingGlucose: 5.1, heartRate: 72, uricAcid: 438, alanineAminotransferase: 38, aspartateAminotransferase: 31, gammaGlutamylTransferase: 63, note: '增加有氧训练'},
  {id: 'health-4', measureDate: '2026-02-19', heightCm: 175, weightKg: 76.3, bodyFatRate: 20.9, systolicPressure: 120, diastolicPressure: 79, totalCholesterol: 5.02, triglycerides: 1.41, hdlCholesterol: 1.19, ldlCholesterol: 3.06, fastingGlucose: 4.9, heartRate: 70, uricAcid: 421, alanineAminotransferase: 34, aspartateAminotransferase: 29, gammaGlutamylTransferase: 55, note: '体检前一周控制饮食'},
  {id: 'health-5', measureDate: '2026-03-10', heightCm: 175, weightKg: 75.8, bodyFatRate: 20.4, systolicPressure: 118, diastolicPressure: 78, totalCholesterol: 4.86, triglycerides: 1.28, hdlCholesterol: 1.23, ldlCholesterol: 2.98, fastingGlucose: 4.9, heartRate: 69, uricAcid: 398, alanineAminotransferase: 28, aspartateAminotransferase: 26, gammaGlutamylTransferase: 48, note: '晨起空腹测量'}
]
const DEFAULT_REPORTS = [
  {
    id: 'report-1',
    examDate: '2025-06-08',
    hospitalName: '市体检中心',
    reportTitle: '2025年度体检报告',
    summary: '总胆固醇略高，建议控制饮食并规律运动。',
    doctorAdvice: '每周至少 3 次中等强度运动，3 个月后复查血脂。',
    reportFileName: '2025-health-checkup.pdf',
    reportUrl: 'http://127.0.0.1:9000/health-reports/2025-health-checkup.pdf'
  },
  {
    id: 'report-2',
    examDate: '2026-02-18',
    hospitalName: '市体检中心',
    reportTitle: '2026年度体检报告',
    summary: '体重和血脂较上年改善，建议继续保持。',
    doctorAdvice: '维持目前运动频率，半年后复查血压和血脂。',
    reportFileName: '2026-health-checkup.pdf',
    reportUrl: 'http://127.0.0.1:9000/health-reports/2026-health-checkup.pdf'
  }
]
const METRIC_DEFINITIONS = [
  {key: 'heightCm', label: '身高', unit: 'cm', decimals: 0, accentClass: 'accent-pink', color: '#ff5f8f'},
  {key: 'weightKg', label: '体重', unit: 'kg', decimals: 1, accentClass: 'accent-rose', color: '#ff4778'},
  {key: 'bmi', label: 'BMI', unit: '', decimals: 1, accentClass: 'accent-orange', color: '#fb7185'},
  {key: 'bodyFatRate', label: '体脂率', unit: '%', decimals: 1, accentClass: 'accent-cyan', color: '#22d3ee'},
  {key: 'bloodPressure', label: '血压', unit: 'mmHg', decimals: 0, accentClass: 'accent-red', color: '#ef4444'},
  {key: 'totalCholesterol', label: '总胆固醇', unit: 'mmol/L', decimals: 2, accentClass: 'accent-purple', color: '#8b5cf6'},
  {key: 'triglycerides', label: '甘油三酯', unit: 'mmol/L', decimals: 2, accentClass: 'accent-gold', color: '#f59e0b'},
  {key: 'hdlCholesterol', label: '高密度脂蛋白', unit: 'mmol/L', decimals: 2, accentClass: 'accent-green', color: '#22c55e'},
  {key: 'ldlCholesterol', label: '低密度脂蛋白', unit: 'mmol/L', decimals: 2, accentClass: 'accent-blue', color: '#38bdf8'},
  {key: 'fastingGlucose', label: '空腹血糖', unit: 'mmol/L', decimals: 2, accentClass: 'accent-indigo', color: '#6366f1'},
  {key: 'heartRate', label: '静息心率', unit: 'bpm', decimals: 0, accentClass: 'accent-teal', color: '#14b8a6'},
  {key: 'uricAcid', label: '尿酸', unit: 'umol/L', decimals: 0, accentClass: 'accent-purple', color: '#a855f7'},
  {key: 'alanineAminotransferase', label: '谷丙转氨酶', unit: 'U/L', decimals: 0, accentClass: 'accent-green', color: '#84cc16'},
  {key: 'aspartateAminotransferase', label: '谷草转氨酶', unit: 'U/L', decimals: 0, accentClass: 'accent-gold', color: '#f59e0b'},
  {key: 'gammaGlutamylTransferase', label: 'γ-GT', unit: 'U/L', decimals: 0, accentClass: 'accent-teal', color: '#06b6d4'}
]
const TREND_METRIC_OPTIONS = [
  {key: 'weightKg', label: '体重', unit: 'kg', color: '#ff4778', decimals: 1},
  {key: 'bodyFatRate', label: '体脂率', unit: '%', color: '#22d3ee', decimals: 1},
  {key: 'systolicPressure', label: '收缩压', unit: 'mmHg', color: '#ef4444', decimals: 0},
  {key: 'diastolicPressure', label: '舒张压', unit: 'mmHg', color: '#fb7185', decimals: 0},
  {key: 'totalCholesterol', label: '总胆固醇', unit: 'mmol/L', color: '#8b5cf6', decimals: 2},
  {key: 'ldlCholesterol', label: '低密度脂蛋白', unit: 'mmol/L', color: '#38bdf8', decimals: 2},
  {key: 'fastingGlucose', label: '空腹血糖', unit: 'mmol/L', color: '#6366f1', decimals: 2},
  {key: 'uricAcid', label: '尿酸', unit: 'umol/L', color: '#a855f7', decimals: 0},
  {key: 'alanineAminotransferase', label: '谷丙转氨酶', unit: 'U/L', color: '#84cc16', decimals: 0},
  {key: 'aspartateAminotransferase', label: '谷草转氨酶', unit: 'U/L', color: '#f59e0b', decimals: 0},
  {key: 'gammaGlutamylTransferase', label: 'γ-GT', unit: 'U/L', color: '#06b6d4', decimals: 0}
]
const RECORD_FIELD_CONFIGS = {
  heightCm: {key: 'heightCm', label: '身高(cm)', type: 'number', min: '0', step: '0.1', placeholder: ''},
  weightKg: {key: 'weightKg', label: '体重(kg)', type: 'number', min: '0', step: '0.1', placeholder: ''},
  bodyFatRate: {key: 'bodyFatRate', label: '体脂率(%)', type: 'number', min: '0', step: '0.1', placeholder: ''},
  systolicPressure: {key: 'systolicPressure', label: '收缩压(mmHg)', type: 'number', min: '0', step: '1', placeholder: ''},
  diastolicPressure: {key: 'diastolicPressure', label: '舒张压(mmHg)', type: 'number', min: '0', step: '1', placeholder: ''},
  totalCholesterol: {key: 'totalCholesterol', label: '总胆固醇', type: 'number', min: '0', step: '0.01', placeholder: 'mmol/L'},
  triglycerides: {key: 'triglycerides', label: '甘油三酯', type: 'number', min: '0', step: '0.01', placeholder: 'mmol/L'},
  hdlCholesterol: {key: 'hdlCholesterol', label: '高密度脂蛋白', type: 'number', min: '0', step: '0.01', placeholder: 'mmol/L'},
  ldlCholesterol: {key: 'ldlCholesterol', label: '低密度脂蛋白', type: 'number', min: '0', step: '0.01', placeholder: 'mmol/L'},
  fastingGlucose: {key: 'fastingGlucose', label: '空腹血糖', type: 'number', min: '0', step: '0.01', placeholder: 'mmol/L'},
  heartRate: {key: 'heartRate', label: '静息心率', type: 'number', min: '0', step: '1', placeholder: 'bpm'},
  uricAcid: {key: 'uricAcid', label: '尿酸', type: 'number', min: '0', step: '1', placeholder: 'umol/L'},
  alanineAminotransferase: {key: 'alanineAminotransferase', label: '谷丙转氨酶', type: 'number', min: '0', step: '1', placeholder: 'U/L'},
  aspartateAminotransferase: {key: 'aspartateAminotransferase', label: '谷草转氨酶', type: 'number', min: '0', step: '1', placeholder: 'U/L'},
  gammaGlutamylTransferase: {key: 'gammaGlutamylTransferase', label: 'γ-GT', type: 'number', min: '0', step: '1', placeholder: 'U/L'}
}
const METRIC_FORM_FIELD_KEYS = {
  heightCm: ['heightCm'],
  weightKg: ['weightKg'],
  bmi: ['heightCm', 'weightKg'],
  bodyFatRate: ['bodyFatRate'],
  bloodPressure: ['systolicPressure', 'diastolicPressure'],
  totalCholesterol: ['totalCholesterol'],
  triglycerides: ['triglycerides'],
  hdlCholesterol: ['hdlCholesterol'],
  ldlCholesterol: ['ldlCholesterol'],
  fastingGlucose: ['fastingGlucose'],
  heartRate: ['heartRate'],
  uricAcid: ['uricAcid'],
  alanineAminotransferase: ['alanineAminotransferase'],
  aspartateAminotransferase: ['aspartateAminotransferase'],
  gammaGlutamylTransferase: ['gammaGlutamylTransferase']
}
const METRIC_TREND_MAP = {
  heightCm: 'weightKg',
  weightKg: 'weightKg',
  bmi: 'weightKg',
  bodyFatRate: 'bodyFatRate',
  bloodPressure: 'systolicPressure',
  totalCholesterol: 'totalCholesterol',
  triglycerides: 'totalCholesterol',
  hdlCholesterol: 'ldlCholesterol',
  ldlCholesterol: 'ldlCholesterol',
  fastingGlucose: 'fastingGlucose',
  heartRate: 'weightKg',
  uricAcid: 'uricAcid',
  alanineAminotransferase: 'alanineAminotransferase',
  aspartateAminotransferase: 'aspartateAminotransferase',
  gammaGlutamylTransferase: 'gammaGlutamylTransferase'
}
const DEFAULT_OVERVIEW_METRIC_KEYS = METRIC_DEFINITIONS.map((item) => item.key)

function unwrapData(res) {
  const payload = res?.data
  if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data
  }
  return payload
}

function toNumber(value) {
  if (value === '' || value === null || value === undefined) {
    return null
  }
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function computeBmi(heightCm, weightKg) {
  const height = toNumber(heightCm)
  const weight = toNumber(weightKg)
  if (!height || !weight) {
    return null
  }
  const meter = height / 100
  if (!meter) {
    return null
  }
  return weight / (meter * meter)
}

function formatDateLabel(date) {
  if (!date) {
    return '-'
  }
  return date.slice(5).replace('-', '/')
}

function hexToRgba(hex, alpha) {
  const value = `${hex || ''}`.replace('#', '')
  const normalized = value.length === 3
    ? value.split('').map((item) => item + item).join('')
    : value
  const red = parseInt(normalized.slice(0, 2), 16)
  const green = parseInt(normalized.slice(2, 4), 16)
  const blue = parseInt(normalized.slice(4, 6), 16)
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

function buildMetricIconText(text) {
  const normalized = `${text || ''}`.replace(/[^A-Za-z0-9\u4e00-\u9fa5]+/g, '')
  if (!normalized) {
    return '健康'
  }
  if (/^[A-Za-z0-9]+$/.test(normalized)) {
    return normalized.length <= 3 ? normalized.toUpperCase() : normalized.slice(0, 2).toUpperCase()
  }
  return Array.from(normalized).slice(0, 2).join('')
}

function buildMetricIconStyle(color) {
  return {
    background: `linear-gradient(135deg, ${hexToRgba(color, 0.96)}, ${hexToRgba(color, 0.62)})`,
    boxShadow: `0 14px 28px ${hexToRgba(color, 0.28)}`
  }
}

function getMetricDefinition(metricKey) {
  return METRIC_DEFINITIONS.find((item) => item.key === metricKey) || METRIC_DEFINITIONS[0]
}

function getMetricDisplayConfig(metricKey) {
  return METRIC_DEFINITIONS.find((item) => item.key === metricKey)
    || TREND_METRIC_OPTIONS.find((item) => item.key === metricKey)
    || {key: metricKey, unit: '', decimals: 0}
}

function buildPressureStatus(record = {}) {
  const systolic = toNumber(record.systolicPressure)
  const diastolic = toNumber(record.diastolicPressure)
  if (systolic === null || diastolic === null) {
    return {text: '暂无判定', className: ''}
  }
  if (systolic < 120 && diastolic < 80) {
    return {text: '血压正常', className: 'status-good'}
  }
  if (systolic < 140 && diastolic < 90) {
    return {text: '血压偏高', className: 'status-warning'}
  }
  return {text: '需关注血压', className: 'status-alert'}
}

function buildBmiStatus(value) {
  const bmi = toNumber(value)
  if (bmi === null) {
    return {text: '暂无判定', className: ''}
  }
  if (bmi < 18.5) {
    return {text: '偏轻', className: 'status-warning'}
  }
  if (bmi < 24) {
    return {text: '正常', className: 'status-good'}
  }
  if (bmi < 28) {
    return {text: '偏高', className: 'status-warning'}
  }
  return {text: '肥胖', className: 'status-alert'}
}

function buildCholesterolStatus(value) {
  const number = toNumber(value)
  if (number === null) {
    return {text: '暂无判定', className: ''}
  }
  if (number < 5.2) {
    return {text: '理想范围', className: 'status-good'}
  }
  if (number < 6.2) {
    return {text: '轻度偏高', className: 'status-warning'}
  }
  return {text: '需关注血脂', className: 'status-alert'}
}

function buildTriglycerideStatus(value) {
  const number = toNumber(value)
  if (number === null) {
    return {text: '暂无判定', className: ''}
  }
  if (number < 1.7) {
    return {text: '理想范围', className: 'status-good'}
  }
  if (number < 2.3) {
    return {text: '偏高', className: 'status-warning'}
  }
  return {text: '需关注甘油三酯', className: 'status-alert'}
}

function buildHdlStatus(value) {
  const number = toNumber(value)
  if (number === null) {
    return {text: '暂无判定', className: ''}
  }
  if (number >= 1.04) {
    return {text: '保护性较好', className: 'status-good'}
  }
  return {text: '偏低', className: 'status-warning'}
}

function buildLdlStatus(value) {
  const number = toNumber(value)
  if (number === null) {
    return {text: '暂无判定', className: ''}
  }
  if (number < 3.4) {
    return {text: '理想范围', className: 'status-good'}
  }
  if (number < 4.1) {
    return {text: '偏高', className: 'status-warning'}
  }
  return {text: '需关注 LDL', className: 'status-alert'}
}

function buildGlucoseStatus(value) {
  const number = toNumber(value)
  if (number === null) {
    return {text: '暂无判定', className: ''}
  }
  if (number < 6.1) {
    return {text: '空腹血糖正常', className: 'status-good'}
  }
  if (number < 7) {
    return {text: '血糖偏高', className: 'status-warning'}
  }
  return {text: '需关注血糖', className: 'status-alert'}
}

function buildHeartRateStatus(value) {
  const number = toNumber(value)
  if (number === null) {
    return {text: '暂无判定', className: ''}
  }
  if (number >= 60 && number <= 100) {
    return {text: '静息心率正常', className: 'status-good'}
  }
  if (number < 60) {
    return {text: '偏低', className: 'status-warning'}
  }
  return {text: '偏高', className: 'status-warning'}
}

function buildUricAcidStatus(value) {
  const number = toNumber(value)
  if (number === null) {
    return {text: '暂无判定', className: ''}
  }
  if (number <= 420) {
    return {text: '当前正常', className: 'status-good'}
  }
  if (number <= 540) {
    return {text: '偏高', className: 'status-warning'}
  }
  return {text: '需关注尿酸', className: 'status-alert'}
}

function buildTransaminaseStatus(value, label) {
  const number = toNumber(value)
  if (number === null) {
    return {text: '暂无判定', className: ''}
  }
  if (number <= 40) {
    return {text: '当前正常', className: 'status-good'}
  }
  if (number <= 80) {
    return {text: '轻度偏高', className: 'status-warning'}
  }
  return {text: `需关注${label}`, className: 'status-alert'}
}

function buildGgtStatus(value) {
  const number = toNumber(value)
  if (number === null) {
    return {text: '暂无判定', className: ''}
  }
  if (number <= 60) {
    return {text: '当前正常', className: 'status-good'}
  }
  if (number <= 120) {
    return {text: '轻度偏高', className: 'status-warning'}
  }
  return {text: '需关注 γ-GT', className: 'status-alert'}
}

function normalizeRecord(item = {}) {
  return {
    id: item.id ?? `health-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    measureDate: item.measureDate || item.recordDate || '',
    heightCm: toNumber(item.heightCm),
    weightKg: toNumber(item.weightKg),
    bodyFatRate: toNumber(item.bodyFatRate),
    systolicPressure: toNumber(item.systolicPressure),
    diastolicPressure: toNumber(item.diastolicPressure),
    totalCholesterol: toNumber(item.totalCholesterol),
    triglycerides: toNumber(item.triglycerides),
    hdlCholesterol: toNumber(item.hdlCholesterol),
    ldlCholesterol: toNumber(item.ldlCholesterol),
    fastingGlucose: toNumber(item.fastingGlucose),
    heartRate: toNumber(item.heartRate),
    uricAcid: toNumber(item.uricAcid),
    alanineAminotransferase: toNumber(item.alanineAminotransferase),
    aspartateAminotransferase: toNumber(item.aspartateAminotransferase),
    gammaGlutamylTransferase: toNumber(item.gammaGlutamylTransferase),
    note: item.note || ''
  }
}

function normalizeReport(item = {}) {
  return {
    id: item.id ?? `report-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    examDate: item.examDate || '',
    hospitalName: item.hospitalName || '',
    reportTitle: item.reportTitle || '',
    summary: item.summary || '',
    doctorAdvice: item.doctorAdvice || '',
    reportFileName: item.reportFileName || '',
    reportUrl: item.reportUrl || ''
  }
}

function sortRecordsDesc(list = []) {
  return [...list].sort((prev, next) => `${next.measureDate}-${next.id}`.localeCompare(`${prev.measureDate}-${prev.id}`))
}

function sortRecordsAsc(list = []) {
  return [...list].sort((prev, next) => `${prev.measureDate}-${prev.id}`.localeCompare(`${next.measureDate}-${next.id}`))
}

function sortReportsDesc(list = []) {
  return [...list].sort((prev, next) => `${next.examDate}-${next.id}`.localeCompare(`${prev.examDate}-${prev.id}`))
}

function loadOverviewMetricKeys() {
  try {
    const raw = localStorage.getItem(OVERVIEW_METRIC_STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(OVERVIEW_METRIC_VERSION_STORAGE_KEY, String(CURRENT_OVERVIEW_METRIC_VERSION))
      return [...DEFAULT_OVERVIEW_METRIC_KEYS]
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      localStorage.setItem(OVERVIEW_METRIC_VERSION_STORAGE_KEY, String(CURRENT_OVERVIEW_METRIC_VERSION))
      return [...DEFAULT_OVERVIEW_METRIC_KEYS]
    }
    let validKeys = parsed.filter((item) => DEFAULT_OVERVIEW_METRIC_KEYS.includes(item))
    const storedVersion = Number(localStorage.getItem(OVERVIEW_METRIC_VERSION_STORAGE_KEY) || 1)
    if (storedVersion < CURRENT_OVERVIEW_METRIC_VERSION) {
      NEW_LIVER_METRIC_KEYS.forEach((item) => {
        if (!validKeys.includes(item)) {
          validKeys.push(item)
        }
      })
      localStorage.setItem(OVERVIEW_METRIC_STORAGE_KEY, JSON.stringify(validKeys))
    }
    localStorage.setItem(OVERVIEW_METRIC_VERSION_STORAGE_KEY, String(CURRENT_OVERVIEW_METRIC_VERSION))
    return validKeys.length ? validKeys : [...DEFAULT_OVERVIEW_METRIC_KEYS]
  } catch (error) {
    return [...DEFAULT_OVERVIEW_METRIC_KEYS]
  }
}

function persistOverviewMetricKeys(keys) {
  localStorage.setItem(OVERVIEW_METRIC_STORAGE_KEY, JSON.stringify(keys))
  localStorage.setItem(OVERVIEW_METRIC_VERSION_STORAGE_KEY, String(CURRENT_OVERVIEW_METRIC_VERSION))
}

function loadLocalRecords() {
  try {
    const raw = localStorage.getItem(LOCAL_RECORD_KEY)
    if (!raw) {
      localStorage.setItem(LOCAL_RECORD_KEY, JSON.stringify(DEFAULT_RECORDS))
      return DEFAULT_RECORDS.map((item) => normalizeRecord(item))
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map((item) => normalizeRecord(item)) : DEFAULT_RECORDS.map((item) => normalizeRecord(item))
  } catch (error) {
    return DEFAULT_RECORDS.map((item) => normalizeRecord(item))
  }
}

function loadLocalReports() {
  try {
    const raw = localStorage.getItem(LOCAL_REPORT_KEY)
    if (!raw) {
      localStorage.setItem(LOCAL_REPORT_KEY, JSON.stringify(DEFAULT_REPORTS))
      return DEFAULT_REPORTS.map((item) => normalizeReport(item))
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return DEFAULT_REPORTS.map((item) => normalizeReport(item))
    }
    return parsed.map((item) => {
      const nextItem = normalizeReport(item)
      nextItem.reportUrl = `${nextItem.reportUrl || ''}`.startsWith('blob:') ? '' : nextItem.reportUrl
      return nextItem
    })
  } catch (error) {
    return DEFAULT_REPORTS.map((item) => normalizeReport(item))
  }
}

function persistLocalRecords(list) {
  localStorage.setItem(LOCAL_RECORD_KEY, JSON.stringify(list))
}

function persistLocalReports(list) {
  localStorage.setItem(LOCAL_REPORT_KEY, JSON.stringify(list))
}

function extractMetricValue(record, metricKey) {
  if (!record) {
    return null
  }
  if (metricKey === 'bmi') {
    return computeBmi(record.heightCm, record.weightKg)
  }
  if (metricKey === 'bloodPressure') {
    const systolic = toNumber(record.systolicPressure)
    const diastolic = toNumber(record.diastolicPressure)
    return systolic === null || diastolic === null
      ? null
      : {systolic, diastolic}
  }
  return toNumber(record[metricKey])
}

function formatMetricValue(metricKey, value) {
  if (value === null || value === undefined) {
    return '-'
  }
  if (metricKey === 'bloodPressure') {
    return value?.systolic !== undefined && value?.diastolic !== undefined
      ? `${value.systolic}/${value.diastolic} mmHg`
      : '-'
  }
  const definition = getMetricDisplayConfig(metricKey)
  const number = toNumber(value)
  if (number === null) {
    return '-'
  }
  if (!definition.unit) {
    return number.toFixed(definition.decimals)
  }
  return `${number.toFixed(definition.decimals)} ${definition.unit}`
}

function formatMetricHistoryNote(note) {
  return note || '无备注'
}

function findLatestRecordForMetric(records, metricKey) {
  return sortRecordsDesc(records).find((item) => extractMetricValue(item, metricKey) !== null) || null
}

function findPreviousRecordForMetric(records, metricKey, currentRecordId) {
  return sortRecordsDesc(records)
    .filter((item) => item.id !== currentRecordId && extractMetricValue(item, metricKey) !== null)[0] || null
}

function buildMetricStatus(metricKey, record, value) {
  switch (metricKey) {
    case 'bmi':
      return buildBmiStatus(value)
    case 'bloodPressure':
      return buildPressureStatus(record)
    case 'totalCholesterol':
      return buildCholesterolStatus(value)
    case 'triglycerides':
      return buildTriglycerideStatus(value)
    case 'hdlCholesterol':
      return buildHdlStatus(value)
    case 'ldlCholesterol':
      return buildLdlStatus(value)
    case 'fastingGlucose':
      return buildGlucoseStatus(value)
    case 'heartRate':
      return buildHeartRateStatus(value)
    case 'uricAcid':
      return buildUricAcidStatus(value)
    case 'alanineAminotransferase':
      return buildTransaminaseStatus(value, '谷丙转氨酶')
    case 'aspartateAminotransferase':
      return buildTransaminaseStatus(value, '谷草转氨酶')
    case 'gammaGlutamylTransferase':
      return buildGgtStatus(value)
    default:
      return {text: '最近一次记录', className: ''}
  }
}

function buildMetricCard(records, metricKey) {
  const definition = getMetricDefinition(metricKey)
  const iconText = buildMetricIconText(definition.label)
  const iconStyle = buildMetricIconStyle(definition.color)
  const latestRecord = findLatestRecordForMetric(records, metricKey)
  if (!latestRecord) {
    return {
      key: metricKey,
      label: definition.label,
      accentClass: definition.accentClass,
      iconText,
      iconStyle,
      displayValue: '-',
      measureDateText: '暂无记录'
    }
  }

  const value = extractMetricValue(latestRecord, metricKey)

  return {
    key: metricKey,
    label: definition.label,
    accentClass: definition.accentClass,
    iconText,
    iconStyle,
    displayValue: formatMetricValue(metricKey, value),
    measureDateText: latestRecord.measureDate
  }
}

function buildMetricTrendInfo(metricKey, currentValue, previousValue) {
  if (previousValue === null || previousValue === undefined) {
    return {text: '首条记录', className: 'trend-flat'}
  }

  if (metricKey === 'bloodPressure') {
    const currentSystolic = toNumber(currentValue?.systolic)
    const currentDiastolic = toNumber(currentValue?.diastolic)
    const previousSystolic = toNumber(previousValue?.systolic)
    const previousDiastolic = toNumber(previousValue?.diastolic)
    if (
      currentSystolic === null || currentDiastolic === null
      || previousSystolic === null || previousDiastolic === null
    ) {
      return {text: '无对比', className: 'trend-flat'}
    }
    const systolicDiff = currentSystolic - previousSystolic
    const diastolicDiff = currentDiastolic - previousDiastolic
    if (systolicDiff === 0 && diastolicDiff === 0) {
      return {text: '与上次持平', className: 'trend-flat'}
    }
    return {
      text: `${systolicDiff >= 0 ? '+' : ''}${systolicDiff}/${diastolicDiff >= 0 ? '+' : ''}${diastolicDiff} mmHg`,
      className: systolicDiff > 0 || diastolicDiff > 0 ? 'trend-up' : 'trend-down'
    }
  }

  const currentNumber = toNumber(currentValue)
  const previousNumber = toNumber(previousValue)
  if (currentNumber === null || previousNumber === null) {
    return {text: '无对比', className: 'trend-flat'}
  }
  const diff = currentNumber - previousNumber
  if (diff === 0) {
    return {text: '与上次持平', className: 'trend-flat'}
  }
  const config = getMetricDisplayConfig(metricKey)
  const suffix = config.unit ? ` ${config.unit}` : ''
  return {
    text: `${diff > 0 ? '+' : ''}${diff.toFixed(config.decimals)}${suffix}`,
    className: diff > 0 ? 'trend-up' : 'trend-down'
  }
}

function buildMetricHistoryItems(records, metricKey) {
  const filteredRecords = sortRecordsDesc(records)
    .filter((item) => extractMetricValue(item, metricKey) !== null)
  return filteredRecords.map((item, index) => {
      const value = extractMetricValue(item, metricKey)
      const previousRecord = filteredRecords[index + 1]
      const previousValue = previousRecord ? extractMetricValue(previousRecord, metricKey) : null
      const trendInfo = buildMetricTrendInfo(metricKey, value, previousValue)
      return {
        id: `${metricKey}-${item.id}`,
        measureDate: item.measureDate,
        primaryText: formatMetricValue(metricKey, value),
        trendText: trendInfo.text,
        trendClass: trendInfo.className,
        rawRecord: item
      }
    })
}

function buildLocalSummary(records = [], reports = []) {
  const sortedRecords = sortRecordsDesc(records)
  const sortedReports = sortReportsDesc(reports)
  const latestRecord = sortedRecords[0]
  const latestWeightRecord = findLatestRecordForMetric(records, 'weightKg')
  const previousWeightRecord = latestWeightRecord ? findPreviousRecordForMetric(records, 'weightKg', latestWeightRecord.id) : null
  const latestBmi = latestRecord ? computeBmi(latestRecord.heightCm, latestRecord.weightKg) : null
  const weightChange = latestWeightRecord && previousWeightRecord
    ? (toNumber(latestWeightRecord.weightKg) || 0) - (toNumber(previousWeightRecord.weightKg) || 0)
    : null

  return {
    latestMeasureDate: latestRecord?.measureDate || '',
    latestWeight: latestWeightRecord?.weightKg ?? null,
    weightChange,
    latestBmi,
    latestBodyFatRate: findLatestRecordForMetric(records, 'bodyFatRate')?.bodyFatRate ?? null,
    latestPressureText: formatMetricValue('bloodPressure', extractMetricValue(findLatestRecordForMetric(records, 'bloodPressure'), 'bloodPressure')),
    latestTotalCholesterol: findLatestRecordForMetric(records, 'totalCholesterol')?.totalCholesterol ?? null,
    lastExamDate: sortedReports[0]?.examDate || '',
    totalRecords: sortedRecords.length,
    reportCount: sortedReports.length
  }
}

function buildLocalTrendData(records = []) {
  const sortedRecords = sortRecordsAsc(records)
  return TREND_METRIC_OPTIONS.reduce((result, metric) => {
    result[metric.key] = sortedRecords
      .map((item) => ({
        label: formatDateLabel(item.measureDate),
        value: toNumber(item[metric.key]),
        measureDate: item.measureDate
      }))
      .filter((item) => item.value !== null)
    return result
  }, {})
}

function normalizeTrendData(payload = {}) {
  const metrics = payload.metrics || payload
  return TREND_METRIC_OPTIONS.reduce((result, metric) => {
    const rawList = Array.isArray(metrics?.[metric.key]) ? metrics[metric.key] : []
    result[metric.key] = rawList
      .map((item) => ({
        label: item.label || formatDateLabel(item.measureDate || ''),
        value: toNumber(item.value),
        measureDate: item.measureDate || ''
      }))
      .filter((item) => item.value !== null)
    return result
  }, {})
}

function prefillRecordFromLatest(record = {}) {
  return {
    measureDate: new Date().toISOString().slice(0, 10),
    heightCm: record.heightCm ?? '',
    weightKg: record.weightKg ?? '',
    bodyFatRate: record.bodyFatRate ?? '',
    systolicPressure: record.systolicPressure ?? '',
    diastolicPressure: record.diastolicPressure ?? '',
    totalCholesterol: record.totalCholesterol ?? '',
    triglycerides: record.triglycerides ?? '',
    hdlCholesterol: record.hdlCholesterol ?? '',
    ldlCholesterol: record.ldlCholesterol ?? '',
    fastingGlucose: record.fastingGlucose ?? '',
    heartRate: record.heartRate ?? '',
    uricAcid: record.uricAcid ?? '',
    alanineAminotransferase: record.alanineAminotransferase ?? '',
    aspartateAminotransferase: record.aspartateAminotransferase ?? '',
    gammaGlutamylTransferase: record.gammaGlutamylTransferase ?? '',
    note: ''
  }
}

export default {
  name: 'HealthRecord',
  setup() {
    const router = useRouter()

    const loading = ref(false)
    const submitting = ref(false)
    const usingLocalData = ref(false)
    const allRecords = ref([])
    const reports = ref([])
    const showRecordDialog = ref(false)
    const showReportDialog = ref(false)
    const showMetricCustomizer = ref(false)
    const recordDialogMode = ref('create')
    const reportDialogMode = ref('create')
    const editingRecordId = ref('')
    const editingReportId = ref('')
    const selectedOverviewMetricKeys = ref(loadOverviewMetricKeys())
    const selectedTrendMetric = ref(TREND_METRIC_OPTIONS[0].key)
    const activeMetricKey = ref(selectedOverviewMetricKeys.value.includes(METRIC_DEFINITIONS[1].key) ? METRIC_DEFINITIONS[1].key : selectedOverviewMetricKeys.value[0])
    const recordDialogSourceMetric = ref('')
    const isMobileViewport = ref(window.innerWidth <= 720)
    const reportUploadInputRef = ref(null)
    const draggingMetricKey = ref('')
    const dragOverMetricKey = ref('')
    const suppressNextMetricOpen = ref(false)
    const trendData = reactive({})
    const tempReportUrls = []

    TREND_METRIC_OPTIONS.forEach((item) => {
      trendData[item.key] = []
    })

    const summary = reactive({
      latestMeasureDate: '',
      latestWeight: null,
      weightChange: null,
      latestBmi: null,
      latestBodyFatRate: null,
      latestPressureText: '',
      latestTotalCholesterol: null,
      lastExamDate: '',
      totalRecords: 0,
      reportCount: 0
    })

    const recordForm = reactive(prefillRecordFromLatest())
    const reportForm = reactive({
      examDate: '',
      hospitalName: '',
      reportTitle: '',
      summary: '',
      doctorAdvice: '',
      reportFileName: '',
      reportUrl: ''
    })

    const metricDefinitions = METRIC_DEFINITIONS
    const trendMetricOptions = TREND_METRIC_OPTIONS
    const metricDefinitionMap = new Map(metricDefinitions.map((item) => [item.key, item]))
    const selectedTrendMeta = computed(() => trendMetricOptions.find((item) => item.key === selectedTrendMetric.value) || trendMetricOptions[0])
    const visibleMetricCards = computed(() => selectedOverviewMetricKeys.value
      .map((item) => metricDefinitionMap.get(item))
      .filter(Boolean)
      .map((item) => buildMetricCard(allRecords.value, item.key)))
    const activeMetricMeta = computed(() => getMetricDefinition(activeMetricKey.value))
    const recordDialogMetricKey = computed(() => {
      if (recordDialogSourceMetric.value) {
        return recordDialogSourceMetric.value
      }
      return activeMetricKey.value
    })
    const recordDialogMetricMeta = computed(() => getMetricDefinition(recordDialogMetricKey.value))
    const visibleRecordFieldRows = computed(() => {
      const fieldKeys = METRIC_FORM_FIELD_KEYS[recordDialogMetricKey.value] || ['weightKg']
      const fields = fieldKeys.map((item) => RECORD_FIELD_CONFIGS[item]).filter(Boolean)
      const rows = []
      for (let index = 0; index < fields.length; index += 2) {
        rows.push(fields.slice(index, index + 2))
      }
      return rows
    })
    const metricHistoryItems = computed(() => buildMetricHistoryItems(allRecords.value, activeMetricKey.value))
    const chartSeries = computed(() => {
      const list = trendData[selectedTrendMetric.value] || []
      return isMobileViewport.value ? list.slice(-6) : list
    })
    const displayReports = computed(() => isMobileViewport.value ? reports.value.slice(0, 3) : reports.value)
    const recordDialogHintText = computed(() => {
      if (recordDialogMode.value === 'edit') {
        return '编辑当前这次测量快照，所有指标仍使用同一组后端接口。'
      }
      if (!recordDialogSourceMetric.value) {
        return `当前将按「${recordDialogMetricMeta.value.label}」新增，只展示这一项指标对应的输入字段。`
      }
      return `当前从「${recordDialogMetricMeta.value.label}」历史进入，新增后会自动出现在该指标历史列表中。`
    })

    const trendChartPoints = computed(() => {
      const list = chartSeries.value
      if (!list.length) {
        return []
      }
      const values = list.map((item) => Number(item.value || 0))
      const minValue = Math.min(...values)
      const maxValue = Math.max(...values)
      const rawRange = maxValue - minValue
      const basePadding = selectedTrendMeta.value.decimals === 0 ? 2 : 0.2
      const padding = Math.max(rawRange * 0.2, Math.abs(maxValue) * 0.06, basePadding)
      const chartMin = Math.max(0, minValue - padding)
      const chartMax = maxValue + padding
      const range = chartMax - chartMin || 1
      const offsetX = 34
      const offsetY = 24
      const chartWidth = 302
      const chartHeight = 144

      return list.map((item, index) => {
        const x = list.length === 1
          ? offsetX + chartWidth / 2
          : offsetX + (chartWidth / (list.length - 1)) * index
        const y = offsetY + chartHeight - ((Number(item.value || 0) - chartMin) / range) * chartHeight
        return {
          ...item,
          x: Number(x.toFixed(2)),
          y: Number(y.toFixed(2))
        }
      })
    })
    const trendPolyline = computed(() => trendChartPoints.value.map((item) => `${item.x},${item.y}`).join(' '))

    const syncViewport = () => {
      isMobileViewport.value = window.innerWidth <= 720
    }

    const applySummaryData = (payload, records, reportList) => {
      const localSummary = buildLocalSummary(records, reportList)
      summary.latestMeasureDate = payload?.latestMeasureDate || localSummary.latestMeasureDate
      summary.latestWeight = toNumber(payload?.latestWeight)
      if (summary.latestWeight === null) {
        summary.latestWeight = localSummary.latestWeight
      }
      summary.weightChange = toNumber(payload?.weightChange)
      if (summary.weightChange === null) {
        summary.weightChange = localSummary.weightChange
      }
      summary.latestBmi = toNumber(payload?.latestBmi)
      if (summary.latestBmi === null) {
        summary.latestBmi = localSummary.latestBmi
      }
      summary.latestBodyFatRate = toNumber(payload?.latestBodyFatRate)
      if (summary.latestBodyFatRate === null) {
        summary.latestBodyFatRate = localSummary.latestBodyFatRate
      }
      summary.latestPressureText = payload?.latestPressureText || localSummary.latestPressureText
      summary.latestTotalCholesterol = toNumber(payload?.latestTotalCholesterol)
      if (summary.latestTotalCholesterol === null) {
        summary.latestTotalCholesterol = localSummary.latestTotalCholesterol
      }
      summary.lastExamDate = payload?.lastExamDate || localSummary.lastExamDate
      summary.totalRecords = Number(payload?.totalRecords || localSummary.totalRecords)
      summary.reportCount = Number(payload?.reportCount || localSummary.reportCount)
    }

    const applyTrendData = (payload, records) => {
      const nextTrendData = payload && Object.keys(payload).length
        ? normalizeTrendData(payload)
        : buildLocalTrendData(records)

      trendMetricOptions.forEach((item) => {
        trendData[item.key] = nextTrendData[item.key] || []
      })
    }

    const applyLocalData = (recordList = loadLocalRecords(), reportList = loadLocalReports()) => {
      const nextRecords = sortRecordsDesc(recordList.map((item) => normalizeRecord(item)))
      const nextReports = sortReportsDesc(reportList.map((item) => normalizeReport(item)))
      allRecords.value = nextRecords
      reports.value = nextReports
      applySummaryData(null, nextRecords, nextReports)
      applyTrendData(null, nextRecords)
    }

    const loadHealthData = async () => {
      loading.value = true
      try {
        const [recordRes, summaryRes, trendRes, reportRes] = await Promise.all([
          listHealthRecords({
            pageNo: 1,
            pageSize: HEALTH_RECORD_FETCH_SIZE
          }),
          getHealthSummary(),
          getHealthTrends(),
          listHealthReports({
            pageNo: 1,
            pageSize: 50
          })
        ])

        const recordPayload = unwrapData(recordRes) || {}
        const reportPayload = unwrapData(reportRes) || {}
        const rawRecordList = Array.isArray(recordPayload)
          ? recordPayload
          : (recordPayload.list || recordPayload.records || recordPayload.rows || [])
        const rawReportList = Array.isArray(reportPayload)
          ? reportPayload
          : (reportPayload.list || reportPayload.records || reportPayload.rows || [])

        allRecords.value = sortRecordsDesc(rawRecordList.map((item) => normalizeRecord(item)))
        reports.value = sortReportsDesc(rawReportList.map((item) => normalizeReport(item)))
        applySummaryData(unwrapData(summaryRes) || {}, allRecords.value, reports.value)
        applyTrendData(unwrapData(trendRes) || {}, allRecords.value)
        usingLocalData.value = false
      } catch (error) {
        usingLocalData.value = true
        applyLocalData()
      } finally {
        loading.value = false
      }
    }

    const buildRecordPayload = () => ({
      measureDate: recordForm.measureDate,
      heightCm: toNumber(recordForm.heightCm),
      weightKg: toNumber(recordForm.weightKg),
      bodyFatRate: toNumber(recordForm.bodyFatRate),
      systolicPressure: toNumber(recordForm.systolicPressure),
      diastolicPressure: toNumber(recordForm.diastolicPressure),
      totalCholesterol: toNumber(recordForm.totalCholesterol),
      triglycerides: toNumber(recordForm.triglycerides),
      hdlCholesterol: toNumber(recordForm.hdlCholesterol),
      ldlCholesterol: toNumber(recordForm.ldlCholesterol),
      fastingGlucose: toNumber(recordForm.fastingGlucose),
      heartRate: toNumber(recordForm.heartRate),
      uricAcid: toNumber(recordForm.uricAcid),
      alanineAminotransferase: toNumber(recordForm.alanineAminotransferase),
      aspartateAminotransferase: toNumber(recordForm.aspartateAminotransferase),
      gammaGlutamylTransferase: toNumber(recordForm.gammaGlutamylTransferase),
      note: recordForm.note
    })

    const buildReportPayload = () => ({
      examDate: reportForm.examDate,
      hospitalName: reportForm.hospitalName,
      reportTitle: reportForm.reportTitle,
      summary: reportForm.summary,
      doctorAdvice: reportForm.doctorAdvice,
      reportFileName: reportForm.reportFileName,
      reportUrl: reportForm.reportUrl
    })

    const resetRecordForm = () => {
      Object.assign(recordForm, prefillRecordFromLatest({}))
    }

    const fillRecordForm = (item) => {
      recordForm.measureDate = item.measureDate || ''
      recordForm.heightCm = item.heightCm ?? ''
      recordForm.weightKg = item.weightKg ?? ''
      recordForm.bodyFatRate = item.bodyFatRate ?? ''
      recordForm.systolicPressure = item.systolicPressure ?? ''
      recordForm.diastolicPressure = item.diastolicPressure ?? ''
      recordForm.totalCholesterol = item.totalCholesterol ?? ''
      recordForm.triglycerides = item.triglycerides ?? ''
      recordForm.hdlCholesterol = item.hdlCholesterol ?? ''
      recordForm.ldlCholesterol = item.ldlCholesterol ?? ''
      recordForm.fastingGlucose = item.fastingGlucose ?? ''
      recordForm.heartRate = item.heartRate ?? ''
      recordForm.uricAcid = item.uricAcid ?? ''
      recordForm.alanineAminotransferase = item.alanineAminotransferase ?? ''
      recordForm.aspartateAminotransferase = item.aspartateAminotransferase ?? ''
      recordForm.gammaGlutamylTransferase = item.gammaGlutamylTransferase ?? ''
      recordForm.note = item.note || ''
    }

    const resetReportForm = () => {
      reportForm.examDate = ''
      reportForm.hospitalName = ''
      reportForm.reportTitle = ''
      reportForm.summary = ''
      reportForm.doctorAdvice = ''
      reportForm.reportFileName = ''
      reportForm.reportUrl = ''
    }

    const fillReportForm = (item) => {
      reportForm.examDate = item.examDate || ''
      reportForm.hospitalName = item.hospitalName || ''
      reportForm.reportTitle = item.reportTitle || ''
      reportForm.summary = item.summary || ''
      reportForm.doctorAdvice = item.doctorAdvice || ''
      reportForm.reportFileName = item.reportFileName || ''
      reportForm.reportUrl = item.reportUrl || ''
    }

    const openMetricHistory = (metricKey) => {
      activeMetricKey.value = metricKey
      const mappedTrendMetric = METRIC_TREND_MAP[metricKey]
      if (mappedTrendMetric && trendMetricOptions.some((item) => item.key === mappedTrendMetric)) {
        selectedTrendMetric.value = mappedTrendMetric
      }
    }

    const selectTrendMetric = (metricKey) => {
      selectedTrendMetric.value = metricKey
    }

    const handleMetricCardClick = (metricKey) => {
      if (suppressNextMetricOpen.value) {
        suppressNextMetricOpen.value = false
        return
      }
      openMetricHistory(metricKey)
    }

    const selectAllMetrics = () => {
      selectedOverviewMetricKeys.value = [...DEFAULT_OVERVIEW_METRIC_KEYS]
      persistOverviewMetricKeys(selectedOverviewMetricKeys.value)
    }

    const resetMetricSelection = () => {
      selectedOverviewMetricKeys.value = [...DEFAULT_OVERVIEW_METRIC_KEYS]
      persistOverviewMetricKeys(selectedOverviewMetricKeys.value)
    }

    const toggleOverviewMetric = (metricKey) => {
      const exists = selectedOverviewMetricKeys.value.includes(metricKey)
      if (exists && selectedOverviewMetricKeys.value.length === 1) {
        return
      }
      selectedOverviewMetricKeys.value = exists
        ? selectedOverviewMetricKeys.value.filter((item) => item !== metricKey)
        : [...selectedOverviewMetricKeys.value, metricKey]
      persistOverviewMetricKeys(selectedOverviewMetricKeys.value)
      if (!selectedOverviewMetricKeys.value.includes(activeMetricKey.value)) {
        activeMetricKey.value = selectedOverviewMetricKeys.value[0]
      }
    }

    const handleMetricDragStart = (item, event) => {
      if (isMobileViewport.value) {
        return
      }
      draggingMetricKey.value = item.key
      dragOverMetricKey.value = item.key
      if (event?.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', item.key)
      }
    }

    const handleMetricDragEnter = (item) => {
      if (!draggingMetricKey.value || draggingMetricKey.value === item.key) {
        return
      }
      dragOverMetricKey.value = item.key
    }

    const handleMetricDrop = (item) => {
      const fromKey = draggingMetricKey.value
      const toKey = item.key
      if (!fromKey || fromKey === toKey) {
        handleMetricDragEnd()
        return
      }

      const currentOrder = [...selectedOverviewMetricKeys.value]
      const fromIndex = currentOrder.indexOf(fromKey)
      const toIndex = currentOrder.indexOf(toKey)
      if (fromIndex === -1 || toIndex === -1) {
        handleMetricDragEnd()
        return
      }

      const nextOrder = [...currentOrder]
      nextOrder.splice(fromIndex, 1)
      nextOrder.splice(toIndex, 0, fromKey)
      selectedOverviewMetricKeys.value = nextOrder
      persistOverviewMetricKeys(nextOrder)
      suppressNextMetricOpen.value = true
      handleMetricDragEnd()
    }

    const handleMetricDragEnd = () => {
      draggingMetricKey.value = ''
      dragOverMetricKey.value = ''
    }

    const openCreateRecordDialog = (metricKey = '') => {
      recordDialogMode.value = 'create'
      editingRecordId.value = ''
      recordDialogSourceMetric.value = metricKey || activeMetricKey.value
      resetRecordForm()
      showRecordDialog.value = true
    }

    const openEditRecordDialog = (item) => {
      recordDialogMode.value = 'edit'
      editingRecordId.value = item.id
      recordDialogSourceMetric.value = ''
      fillRecordForm(item)
      showRecordDialog.value = true
    }

    const closeRecordDialog = () => {
      if (submitting.value) {
        return
      }
      showRecordDialog.value = false
      recordDialogSourceMetric.value = ''
    }

    const submitRecordDialog = async () => {
      if (!recordForm.measureDate) {
        alert('请选择记录日期')
        return
      }
      const requiredFields = METRIC_FORM_FIELD_KEYS[recordDialogMetricKey.value] || []
      const missingField = requiredFields.find((fieldKey) => {
        const value = recordForm[fieldKey]
        return value === '' || value === null || value === undefined
      })
      if (missingField) {
        alert(`请填写${RECORD_FIELD_CONFIGS[missingField]?.label || '当前指标数据'}`)
        return
      }
      if (submitting.value) {
        return
      }

      const payload = buildRecordPayload()
      submitting.value = true
      try {
        if (recordDialogMode.value === 'create') {
          await createHealthRecord(payload)
        } else {
          await updateHealthRecord(editingRecordId.value, payload)
        }
        showRecordDialog.value = false
        recordDialogSourceMetric.value = ''
        await loadHealthData()
      } catch (error) {
        const currentRecords = loadLocalRecords()
        const nextRecords = recordDialogMode.value === 'create'
          ? [{id: `health-${Date.now()}`, ...payload}, ...currentRecords]
          : currentRecords.map((item) => (item.id === editingRecordId.value ? {id: item.id, ...payload} : item))
        persistLocalRecords(sortRecordsDesc(nextRecords.map((item) => normalizeRecord(item))))
        usingLocalData.value = true
        showRecordDialog.value = false
        recordDialogSourceMetric.value = ''
        applyLocalData(nextRecords, loadLocalReports())
      } finally {
        submitting.value = false
      }
    }

    const removeRecord = async (item) => {
      if (!window.confirm(`确认删除 ${item.measureDate} 的健康记录吗？`)) {
        return
      }
      try {
        await deleteHealthRecord(item.id)
        await loadHealthData()
      } catch (error) {
        const nextRecords = loadLocalRecords().filter((record) => record.id !== item.id)
        persistLocalRecords(nextRecords)
        usingLocalData.value = true
        applyLocalData(nextRecords, loadLocalReports())
      }
    }

    const openCreateReportDialog = () => {
      reportDialogMode.value = 'create'
      editingReportId.value = ''
      resetReportForm()
      reportForm.examDate = new Date().toISOString().slice(0, 10)
      showReportDialog.value = true
    }

    const openEditReportDialog = (item) => {
      reportDialogMode.value = 'edit'
      editingReportId.value = item.id
      fillReportForm(item)
      showReportDialog.value = true
    }

    const closeReportDialog = () => {
      if (submitting.value) {
        return
      }
      showReportDialog.value = false
      resetReportForm()
    }

    const openReportUploadPicker = () => {
      reportUploadInputRef.value?.click()
    }

    const clearReportUploadInput = () => {
      if (reportUploadInputRef.value) {
        reportUploadInputRef.value.value = ''
      }
    }

    const clearUploadedReportFile = () => {
      reportForm.reportFileName = ''
      reportForm.reportUrl = ''
      clearReportUploadInput()
    }

    const handleReportFileSelected = async (event) => {
      const file = event.target?.files?.[0]
      if (!file) {
        return
      }

      try {
        const uploadRes = await uploadHealthReportFile(file)
        const payload = unwrapData(uploadRes) || {}
        reportForm.reportFileName = payload.fileName || payload.name || file.name
        reportForm.reportUrl = payload.fileUrl || payload.downloadUrl || ''
        if (!reportForm.reportUrl) {
          throw new Error('missing url')
        }
      } catch (error) {
        const objectUrl = URL.createObjectURL(file)
        tempReportUrls.push(objectUrl)
        reportForm.reportFileName = file.name
        reportForm.reportUrl = objectUrl
      } finally {
        clearReportUploadInput()
      }
    }

    const submitReportDialog = async () => {
      if (!reportForm.examDate) {
        alert('请选择体检日期')
        return
      }
      if (!reportForm.reportTitle) {
        alert('请输入报告标题')
        return
      }
      if (submitting.value) {
        return
      }

      const payload = buildReportPayload()
      submitting.value = true
      try {
        if (reportDialogMode.value === 'create') {
          await createHealthReport(payload)
        } else {
          await updateHealthReport(editingReportId.value, payload)
        }
        showReportDialog.value = false
        resetReportForm()
        await loadHealthData()
      } catch (error) {
        const currentReports = loadLocalReports()
        const nextReports = reportDialogMode.value === 'create'
          ? [{id: `report-${Date.now()}`, ...payload}, ...currentReports]
          : currentReports.map((item) => (item.id === editingReportId.value ? {id: item.id, ...payload} : item))
        persistLocalReports(sortReportsDesc(nextReports.map((item) => normalizeReport(item))))
        usingLocalData.value = true
        showReportDialog.value = false
        resetReportForm()
        applyLocalData(loadLocalRecords(), nextReports)
      } finally {
        submitting.value = false
      }
    }

    const removeReport = async (item) => {
      if (!window.confirm(`确认删除报告【${item.reportTitle}】吗？`)) {
        return
      }
      try {
        await deleteHealthReport(item.id)
        await loadHealthData()
      } catch (error) {
        const nextReports = loadLocalReports().filter((report) => report.id !== item.id)
        persistLocalReports(nextReports)
        usingLocalData.value = true
        applyLocalData(loadLocalRecords(), nextReports)
      }
    }

    const viewReport = (item) => {
      if (!item.reportUrl) {
        alert('当前报告未上传文件')
        return
      }
      window.open(item.reportUrl, '_blank', 'noopener,noreferrer')
    }

    const goBack = () => {
      router.push('/home')
    }

    onMounted(() => {
      syncViewport()
      window.addEventListener('resize', syncViewport)
      loadHealthData()
    })

    onBeforeUnmount(() => {
      window.removeEventListener('resize', syncViewport)
      tempReportUrls.forEach((item) => URL.revokeObjectURL(item))
    })

    return {
      loading,
      submitting,
      usingLocalData,
      summary,
      allRecords,
      reports,
      metricDefinitions,
      visibleMetricCards,
      activeMetricKey,
      activeMetricMeta,
      draggingMetricKey,
      dragOverMetricKey,
      metricHistoryItems,
      trendMetricOptions,
      selectedTrendMetric,
      selectedTrendMeta,
      chartSeries,
      trendChartPoints,
      trendPolyline,
      showMetricCustomizer,
      selectedOverviewMetricKeys,
      showRecordDialog,
      showReportDialog,
      recordDialogMode,
      reportDialogMode,
      recordDialogHintText,
      recordForm,
      reportForm,
      isMobileViewport,
      displayReports,
      visibleRecordFieldRows,
      reportUploadInputRef,
      formatMetricValue,
      loadHealthData,
      openMetricHistory,
      handleMetricCardClick,
      handleMetricDragStart,
      handleMetricDragEnter,
      handleMetricDrop,
      handleMetricDragEnd,
      selectTrendMetric,
      selectAllMetrics,
      resetMetricSelection,
      toggleOverviewMetric,
      openCreateRecordDialog,
      openEditRecordDialog,
      closeRecordDialog,
      submitRecordDialog,
      removeRecord,
      openCreateReportDialog,
      openEditReportDialog,
      closeReportDialog,
      openReportUploadPicker,
      clearUploadedReportFile,
      handleReportFileSelected,
      submitReportDialog,
      removeReport,
      viewReport,
      goBack
    }
  }
}
</script>

<style scoped>
.health-page {
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
.overview-panel,
.trend-panel,
.history-panel,
.report-panel,
.dialog {
  border-radius: 18px;
  padding: 16px 18px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: linear-gradient(135deg, rgba(26, 16, 31, 0.88), rgba(18, 45, 54, 0.78));
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(16px);
}

.hero-panel,
.overview-panel,
.trend-panel {
  margin-bottom: 14px;
}

.top-layout {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr);
  gap: 14px;
  align-items: start;
  margin-bottom: 14px;
}

.top-layout .overview-panel,
.top-layout .trend-panel {
  margin-bottom: 0;
}

.hero-panel,
.panel-head,
.toolbar-left,
.toolbar-right,
.dialog-actions,
.mobile-card-actions,
.report-card-head,
.history-card-head,
.trend-chart-top,
.customizer-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hero-panel,
.panel-head,
.trend-chart-top,
.customizer-head,
.report-card-head,
.history-card-head {
  justify-content: space-between;
}

.page-title,
.panel-title,
.dialog-title,
.trend-chart-title,
.history-primary {
  margin: 0;
}

.page-title {
  font-size: 28px;
}

.page-subtitle,
.panel-tip,
.dialog-subtitle,
.field-tip,
.subtle-empty,
.report-card-head p,
.history-date,
.trend-chart-subtitle,
.customizer-head strong {
  margin: 6px 0 0;
  color: rgba(255, 255, 255, 0.74);
}

.hero-tags,
.toolbar-left,
.toolbar-right,
.trend-switch,
.report-summary-grid,
.customizer-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.hero-tag,
.trend-chip,
.status-chip,
.report-date-chip,
.metric-date {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
}

.hero-tag {
  background: rgba(255, 255, 255, 0.14);
  color: #ffe4ef;
}

.overview-head {
  align-items: flex-start;
}

.metric-customizer {
  margin-top: 14px;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.08);
}

.customizer-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.customizer-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0 12px;
  border-radius: 12px;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.06);
  transition: background 0.18s ease, border-color 0.18s ease;
}

.customizer-chip.active {
  border-color: rgba(255, 255, 255, 0.24);
  background: rgba(255, 255, 255, 0.16);
}

.hidden-checkbox {
  display: none;
}

.overview-grid {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.metric-card,
.summary-card,
.history-card,
.report-card,
.trend-label-card {
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.08);
}

.metric-card,
.summary-card,
.history-card,
.report-card {
  padding: 12px;
}

.metric-card {
  position: relative;
  overflow: hidden;
  cursor: grab;
  user-select: none;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}

.metric-card:hover,
.metric-card.active,
.metric-card.drag-over {
  transform: translateY(-1px);
  border-color: rgba(255, 255, 255, 0.24);
  background: rgba(255, 255, 255, 0.12);
  box-shadow: 0 12px 22px rgba(0, 0, 0, 0.16);
}

.metric-card.dragging {
  opacity: 0.66;
  transform: scale(0.98);
}

.metric-card:active {
  cursor: grabbing;
}

.metric-card::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
}

.accent-pink::before {
  background: linear-gradient(180deg, #ff6ea6, #ff3d71);
}

.accent-rose::before {
  background: linear-gradient(180deg, #ff4778, #fb7185);
}

.accent-orange::before {
  background: linear-gradient(180deg, #fb7185, #f59e0b);
}

.accent-cyan::before {
  background: linear-gradient(180deg, #22d3ee, #0ea5e9);
}

.accent-red::before {
  background: linear-gradient(180deg, #ef4444, #f97316);
}

.accent-purple::before {
  background: linear-gradient(180deg, #8b5cf6, #6366f1);
}

.accent-gold::before {
  background: linear-gradient(180deg, #f59e0b, #fbbf24);
}

.accent-green::before {
  background: linear-gradient(180deg, #22c55e, #14b8a6);
}

.accent-blue::before {
  background: linear-gradient(180deg, #38bdf8, #2563eb);
}

.accent-indigo::before {
  background: linear-gradient(180deg, #818cf8, #6366f1);
}

.accent-teal::before {
  background: linear-gradient(180deg, #14b8a6, #0f766e);
}

.metric-icon-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: #fff;
}

.metric-icon-text {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.metric-card-head {
  display: flex;
  gap: 10px;
  align-items: center;
}

.metric-card-head.compact {
  gap: 12px;
}

.metric-copy {
  min-width: 0;
}

.metric-copy.compact {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 4px;
}

.metric-label,
.trend-label-card span,
.summary-card span,
.history-meta-grid span,
.report-body span {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.72);
}

.metric-value,
.summary-card strong,
.trend-current strong {
  display: block;
  margin-top: 8px;
  font-size: 24px;
  line-height: 1.18;
}

.metric-date {
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.74);
  background: rgba(255, 255, 255, 0.08);
}

.metric-value.compact {
  margin-top: 0;
  font-size: 18px;
  line-height: 1.15;
}

.metric-date.compact {
  min-height: auto;
  padding: 0;
  border-radius: 0;
  background: transparent;
  font-size: 12px;
  line-height: 1.3;
}

.metric-icon-box.compact {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  flex-shrink: 0;
}

.metric-icon-text.compact {
  font-size: 11px;
}

.status-good {
  color: #86efac;
}

.status-warning {
  color: #fde68a;
}

.status-alert {
  color: #fca5a5;
}

.trend-head {
  align-items: flex-start;
}

.trend-chip {
  border: none;
  cursor: pointer;
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.trend-chip.active {
  background: rgba(255, 255, 255, 0.22);
}

.trend-chart-card {
  margin-top: 14px;
  padding: 12px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.08);
}

.trend-current {
  text-align: right;
}

.trend-visual {
  max-width: 920px;
  margin: 0 auto;
}

.trend-visual.compact {
  max-width: 100%;
}

.trend-svg {
  display: block;
  width: 100%;
  height: 220px;
  margin-top: 12px;
  overflow: visible;
}

.trend-grid {
  fill: none;
  stroke: rgba(255, 255, 255, 0.16);
  stroke-width: 1.4;
}

.trend-path {
  fill: none;
  stroke-width: 2.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.trend-dot {
  stroke: rgba(255, 255, 255, 0.5);
  stroke-width: 1.8;
}

.trend-labels {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(88px, 1fr));
  gap: 10px;
}

.trend-labels.compact {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.trend-label-card {
  padding: 10px 12px;
}

.trend-label-card.compact {
  padding: 8px 10px;
}

.trend-label-card strong {
  display: block;
  margin-top: 6px;
}

.health-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(320px, 0.92fr);
  gap: 14px;
}

.history-list,
.report-list {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-primary {
  font-size: 18px;
}

.status-chip,
.report-date-chip {
  background: rgba(255, 255, 255, 0.14);
}

.history-card {
  padding: 12px 14px;
}

.history-card-head {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(140px, 0.82fr) minmax(160px, 0.9fr) auto;
  gap: 10px;
  align-items: center;
}

.history-cell,
.report-body p {
  margin: 0;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.history-cell span {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.68);
}

.history-cell strong {
  font-size: 15px;
  line-height: 1.3;
}

.history-trend {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
}

.history-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.trend-up {
  color: #fda4af;
}

.trend-down {
  color: #86efac;
}

.trend-flat {
  color: rgba(255, 255, 255, 0.76);
}

.report-summary-grid {
  margin-top: 14px;
}

.report-summary-grid .summary-card {
  flex: 1 1 calc(33.333% - 6px);
}

.report-body {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.report-body.compact p {
  padding: 10px 12px;
}

.report-empty,
.history-empty,
.trend-empty {
  min-height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn,
.ghost-btn,
.mini-btn {
  border: none;
  border-radius: 10px;
  color: #fff;
  cursor: pointer;
}

.action-btn,
.ghost-btn {
  min-height: 38px;
  padding: 0 14px;
}

.action-btn {
  background: linear-gradient(135deg, #ff5f8f, #ff8a34);
}

.ghost-btn {
  background: rgba(255, 255, 255, 0.12);
}

.mini-btn {
  min-height: 30px;
  padding: 0 10px;
  background: rgba(255, 255, 255, 0.16);
}

.mini-btn.danger {
  background: rgba(239, 68, 68, 0.68);
}

.dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 40;
  padding: 18px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(4, 10, 18, 0.56);
}

.dialog {
  width: min(820px, 100%);
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
  gap: 12px;
}

.single-date-row {
  grid-template-columns: minmax(0, 220px);
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-field span {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.72);
}

.dialog-actions {
  justify-content: flex-end;
  flex-wrap: wrap;
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

.upload-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.upload-display {
  flex: 1;
}

.upload-btn {
  flex-shrink: 0;
}

.hidden-input {
  display: none;
}

@media (max-width: 1180px) {
  .overview-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .customizer-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .top-layout {
    grid-template-columns: 1fr;
  }

  .health-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 860px) {
  .overview-grid,
  .customizer-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .trend-svg,
  .trend-svg.compact {
    height: 180px;
  }

  .history-card-head {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .health-page {
    padding: 12px;
  }

  .hero-panel,
  .panel-head,
  .dialog-actions,
  .trend-chart-top,
  .upload-row,
  .customizer-head {
    flex-direction: column;
    align-items: stretch;
  }

  .overview-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .customizer-grid,
  .form-inline-grid {
    grid-template-columns: 1fr;
  }

  .history-card-head {
    grid-template-columns: 1fr;
  }

  .history-actions {
    justify-content: flex-start;
  }

  .single-date-row {
    grid-template-columns: 1fr;
  }

  .report-summary-grid .summary-card {
    flex: 1 1 calc(50% - 6px);
  }

  .metric-card,
  .history-card,
  .report-card,
  .summary-card {
    padding: 12px;
  }

  .metric-card {
    cursor: pointer;
  }

  .metric-icon-box {
    width: 46px;
    height: 46px;
    border-radius: 14px;
  }

  .metric-icon-box.compact {
    width: 38px;
    height: 38px;
    border-radius: 12px;
  }

  .metric-card-head.compact {
    gap: 10px;
  }

  .metric-value,
  .summary-card strong {
    font-size: 20px;
  }

  .metric-value.compact {
    font-size: 17px;
  }

  .trend-labels {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .trend-svg {
    height: 190px;
  }

  .trend-svg.compact {
    height: 170px;
  }

  .mobile-card-actions,
  .toolbar-left,
  .customizer-actions {
    width: 100%;
  }
}

@media (max-width: 560px) {
  .hero-panel,
  .overview-panel,
  .trend-panel,
  .history-panel,
  .report-panel,
  .dialog {
    padding: 14px;
    border-radius: 16px;
  }

  .page-title {
    font-size: 24px;
  }

  .overview-grid {
    grid-template-columns: 1fr;
  }

  .trend-labels.compact {
    grid-template-columns: 1fr;
  }

  .metric-date {
    padding: 0 9px;
  }

  .dialog-mask {
    padding: 10px;
  }

  .trend-svg {
    height: 170px;
  }

  .trend-svg.compact {
    height: 150px;
  }
}
</style>
