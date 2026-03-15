<template>
  <div class="fuel-page">
    <div class="page-nav">
      <button type="button" class="back-home-btn" @click="goBack">
        <span class="back-home-icon">←</span>
        <span>返回桌面</span>
      </button>
    </div>

    <div class="hero-panel">
      <div>
        <h1 class="page-title">油耗统计</h1>
        <p class="page-subtitle">记录每次加油数据，持续观察平均油耗、月度花费和车辆用车成本，字段设计参考成熟加油类 App。</p>
      </div>
      <div class="hero-tags">
        <span class="hero-tag">平均油耗 {{ formatConsumption(summary.averageConsumption) }}</span>
        <span class="hero-tag">本月实付 {{ formatCurrency(summary.currentMonthAmount) }}</span>
        <span class="hero-tag">{{ usingLocalData ? '本地演示数据' : '已接真实接口' }}</span>
      </div>
    </div>

    <section class="price-panel">
      <div class="price-layout">
        <div class="price-info">
          <div class="panel-head">
            <div>
              <h2 class="panel-title">最新油价</h2>
              <p class="panel-tip">默认展示当前维护的最新参考油价，后续联调后可切换为实时地区油价。</p>
            </div>
            <span class="price-date">{{ latestFuelPrices.publishDate || '暂无发布时间' }}</span>
          </div>

          <div class="price-grid">
            <article v-for="item in fuelPriceCards" :key="item.code" class="price-card">
              <span>{{ item.label }}</span>
              <strong>{{ item.priceText }}</strong>
            </article>
          </div>
        </div>

        <article class="report-card trend-card">
          <div class="panel-head">
            <div>
              <h2 class="panel-title">{{ currentYearLabel }}每月用油走势</h2>
              <p class="panel-tip">同时展示月度加油量和月度实付金额，便于一起观察出行强度与支出变化。</p>
            </div>
          </div>

          <div v-if="monthlyFuelReport.length" class="line-chart">
            <div class="line-chart-legend">
              <span class="line-chart-legend-item">
                <i class="legend-dot fuel"></i>
                <span>加油量(L)</span>
              </span>
              <span class="line-chart-legend-item">
                <i class="legend-dot amount"></i>
                <span>实付金额</span>
              </span>
            </div>

            <svg class="line-chart-svg" viewBox="0 0 360 190" preserveAspectRatio="none" aria-hidden="true">
              <polyline class="line-chart-grid" points="30,22 30,160 338,160" />
              <polyline class="line-chart-path fuel" :points="monthlyTrendPolyline" />
              <polyline class="line-chart-path amount" :points="monthlyAmountPolyline" />
              <circle
                v-for="point in monthlyTrendPoints"
                :key="`${point.label}-fuel`"
                class="line-chart-dot fuel"
                :cx="point.x"
                :cy="point.y"
                r="4"
              />
              <circle
                v-for="point in monthlyAmountPoints"
                :key="`${point.label}-amount`"
                class="line-chart-dot amount"
                :cx="point.x"
                :cy="point.y"
                r="4"
              />
            </svg>

            <div class="line-chart-labels">
              <div v-for="(point, index) in monthlyTrendPoints" :key="point.label" class="line-chart-label">
                <span>{{ point.label }}</span>
                <strong>{{ formatNumber(point.value) }}L</strong>
                <em>{{ formatCurrency(monthlyAmountPoints[index]?.value || 0) }}</em>
              </div>
            </div>
          </div>
          <div v-else class="subtle-empty">暂无月度统计数据</div>
        </article>
      </div>
    </section>

    <div class="fuel-layout">
      <section class="list-panel">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">加油记录</h2>
            <p class="panel-tip">每条记录会自动结合同车上一次里程估算行驶距离和油耗，便于观察长期趋势。</p>
          </div>
        </div>

        <div class="toolbar">
          <div class="toolbar-left">
            <button class="action-btn" :disabled="loading || submitting" @click="openCreateDialog">新增记录</button>
            <button class="ghost-btn" :disabled="loading || submitting" @click="loadRecords">刷新列表</button>
          </div>
          <div class="toolbar-right">
            <span>共 {{ total }} 条</span>
            <span v-if="usingLocalData" class="mock-tip">当前为演示数据（后端未联通）</span>
          </div>
        </div>

        <div v-if="loading" class="empty-state">加载中...</div>
        <template v-else>
          <div v-if="pagedRecords.length" class="table-wrap desktop-table">
            <table class="record-table">
              <thead>
              <tr>
                <th>日期</th>
                <th>车辆</th>
                <th>里程(km)</th>
                <th>加油量(L)</th>
                <th>加油金额</th>
                <th>优惠后</th>
                <th>优惠金额</th>
                <th>单价</th>
                <th>油号</th>
                <th>方式</th>
                <th>估算油耗</th>
                <th>操作</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="item in pagedRecords" :key="item.id">
                <td>{{ item.fuelDate }}</td>
                <td>{{ item.vehicleName }}</td>
                <td>{{ formatNumber(item.odometerKm) }}</td>
                <td>{{ formatNumber(item.fuelVolume) }}</td>
                <td>{{ formatCurrency(item.totalAmount) }}</td>
                <td>{{ formatCurrency(item.discountedAmount) }}</td>
                <td>{{ formatCurrency(item.discountAmount) }}</td>
                <td>{{ formatUnitPrice(item.unitPrice) }}</td>
                <td>{{ formatFuelTypeText(item.fuelType) }}</td>
                <td>{{ formatFillTypeText(item.fillType) }}</td>
                <td>{{ formatConsumption(item.fuelConsumption) }}</td>
                <td>
                  <div class="row-actions">
                    <button class="mini-btn" @click="openEditDialog(item)">编辑</button>
                    <button class="mini-btn danger" @click="removeRecord(item)">删除</button>
                  </div>
                </td>
              </tr>
              </tbody>
            </table>
          </div>

          <div v-if="pagedRecords.length" class="mobile-record-list">
            <article v-for="item in pagedRecords" :key="item.id" class="mobile-record-card">
              <div class="mobile-record-head">
                <div>
                  <strong class="mobile-record-title">{{ item.vehicleName }}</strong>
                  <p class="mobile-record-subtitle">{{ item.fuelDate }} · {{ item.stationName || '未填写油站' }}</p>
                </div>
                <span class="consumption-chip" :class="consumptionClassMap[getConsumptionLevel(item.fuelConsumption)]">
                  {{ formatConsumption(item.fuelConsumption) }}
                </span>
              </div>

              <div class="mobile-record-grid">
                <p><span>里程</span><strong>{{ formatNumber(item.odometerKm) }} km</strong></p>
                <p><span>加油量</span><strong>{{ formatNumber(item.fuelVolume) }} L</strong></p>
                <p><span>加油金额</span><strong>{{ formatCurrency(item.totalAmount) }}</strong></p>
                <p><span>优惠后</span><strong>{{ formatCurrency(item.discountedAmount) }}</strong></p>
                <p><span>优惠金额</span><strong>{{ formatCurrency(item.discountAmount) }}</strong></p>
                <p><span>单价</span><strong>{{ formatUnitPrice(item.unitPrice) }}</strong></p>
                <p><span>油号 / 方式</span><strong>{{ formatFuelTypeText(item.fuelType) }} / {{ formatFillTypeText(item.fillType) }}</strong></p>
                <p class="wide"><span>备注</span><strong>{{ item.note || '-' }}</strong></p>
              </div>

              <div class="mobile-card-actions">
                <button class="mini-btn" @click="openEditDialog(item)">编辑</button>
                <button class="mini-btn danger" @click="removeRecord(item)">删除</button>
              </div>
            </article>
          </div>

          <div v-else class="empty-state">当前条件下暂无加油记录</div>
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
            <h2 class="panel-title">用车洞察</h2>
            <p class="panel-tip">从油耗、实付金额和累计优惠三个角度快速查看燃油开销。</p>
          </div>
        </div>

        <div class="summary-grid">
          <article class="summary-card">
            <span>总实付</span>
            <strong>{{ formatCurrency(summary.totalAmount) }}</strong>
          </article>
          <article class="summary-card">
            <span>累计优惠</span>
            <strong>{{ formatCurrency(summary.totalDiscountAmount) }}</strong>
          </article>
          <article class="summary-card">
            <span>总加油量</span>
            <strong>{{ formatNumber(summary.totalFuelVolume) }} L</strong>
          </article>
          <article class="summary-card">
            <span>平均单价</span>
            <strong>{{ formatUnitPrice(summary.averageUnitPrice) }}</strong>
          </article>
          <article class="summary-card">
            <span>平均油耗</span>
            <strong>{{ formatConsumption(summary.averageConsumption) }}</strong>
          </article>
        </div>

        <div class="insight-block">
          <div class="insight-head">
            <h3 class="insight-title">车辆统计</h3>
            <span>{{ vehicleStats.length }} 台</span>
          </div>
          <div v-if="vehicleStats.length" class="stats-list">
            <div v-for="item in vehicleStats" :key="item.vehicleName" class="stats-row">
              <div>
                <strong>{{ item.vehicleName }}</strong>
                <span>{{ formatConsumption(item.averageConsumption) }} · {{ formatCurrency(item.totalAmount) }} · 优惠 {{ formatCurrency(item.totalDiscountAmount) }}</span>
              </div>
              <b>{{ item.recordCount }} 条</b>
            </div>
          </div>
          <div v-else class="subtle-empty">暂无车辆统计数据</div>
        </div>

        <div class="insight-block">
          <div class="insight-head">
            <h3 class="insight-title">最近记录</h3>
            <span>{{ recentRecords.length }} 条</span>
          </div>
          <div v-if="recentRecords.length" class="recent-list">
            <article v-for="item in recentRecords" :key="item.id" class="recent-item" @click="openEditDialog(item)">
              <strong>{{ item.vehicleName }} · {{ item.fuelDate }}</strong>
              <span>{{ formatCurrency(item.discountedAmount || item.totalAmount) }} / {{ formatNumber(item.fuelVolume) }}L</span>
            </article>
          </div>
          <div v-else class="subtle-empty">暂无最近记录</div>
        </div>
      </aside>
    </div>

    <section class="report-panel">
      <div class="report-grid">
        <article class="report-card">
          <div class="panel-head">
            <div>
              <h2 class="panel-title">各年用油花费统计</h2>
              <p class="panel-tip">从年度角度查看燃油支出变化，可快速识别用车强度和油价波动的影响。</p>
            </div>
          </div>

          <div class="bar-chart">
            <div v-for="item in yearlyCostReport" :key="item.label" class="bar-row">
              <span class="bar-label">{{ item.label }}</span>
              <div class="bar-track">
                <div class="bar-fill yearly" :style="{width: `${getBarWidth(item.totalAmount, maxYearlyCost)}%`}"></div>
              </div>
              <div class="bar-meta">
                <strong>{{ formatCurrency(item.totalAmount) }}</strong>
                <span>{{ formatNumber(item.totalFuelVolume) }} L</span>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>

    <div v-if="showDialog" class="dialog-mask" @click.self="closeDialog">
      <div class="dialog">
        <h3 class="dialog-title">{{ dialogMode === 'create' ? '新增加油记录' : '编辑加油记录' }}</h3>
        <form class="dialog-form" @submit.prevent="submitDialog">
          <div class="form-inline-grid">
            <label class="form-field">
              <span>车辆名称</span>
              <input v-model.trim="form.vehicleName" class="input" maxlength="40" placeholder="例如：Model Y" required />
            </label>

            <label class="form-field">
              <span>加油日期</span>
              <input v-model="form.fuelDate" class="input" type="date" required />
            </label>
          </div>

          <div class="form-inline-grid">
            <label class="form-field">
              <span>当前里程(km)</span>
              <input v-model.number="form.odometerKm" class="input" type="number" min="0" step="1" placeholder="例如：15236" required />
            </label>

            <label class="form-field">
              <span>加油量(L)</span>
              <input v-model.number="form.fuelVolume" class="input" type="number" min="0" step="0.01" placeholder="例如：38.52" required />
            </label>
          </div>

          <div class="form-inline-grid">
            <label class="form-field">
              <span>加油金额</span>
              <input v-model.number="form.totalAmount" class="input" type="number" min="0" step="0.01" placeholder="例如：312.5" required />
            </label>

            <label class="form-field">
              <span>实际优惠后金额</span>
              <input v-model.number="form.discountedAmount" class="input" type="number" min="0" step="0.01" placeholder="例如：298.8" required />
            </label>
          </div>

          <div class="form-inline-grid">
            <label class="form-field">
              <span>单价（可选，留空自动计算）</span>
              <input v-model.number="form.unitPrice" class="input" type="number" min="0" step="0.001" placeholder="例如：8.110" />
            </label>

            <label class="form-field">
              <span>油号</span>
              <select v-model="form.fuelType" class="input">
                <option v-for="item in fuelTypeOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
            </label>

            <label class="form-field">
              <span>加油方式</span>
              <select v-model="form.fillType" class="input">
                <option v-for="item in fillTypeOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
            </label>
          </div>

          <label class="form-field">
            <span>油站名称</span>
            <input v-model.trim="form.stationName" class="input" maxlength="60" placeholder="例如：中国石化滨江站" />
          </label>

          <label class="form-field">
            <span>备注</span>
            <textarea v-model.trim="form.note" class="input textarea" rows="3" maxlength="240" placeholder="记录路况、油价变化或保养说明" />
          </label>

          <div class="dialog-actions">
            <button type="button" class="ghost-btn" :disabled="submitting" @click="closeDialog">取消</button>
            <button type="submit" class="action-btn" :disabled="submitting">
              {{ submitting ? '提交中...' : (dialogMode === 'create' ? '保存记录' : '更新记录') }}
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
  createFuelRecord,
  deleteFuelRecord,
  getFuelReports,
  getLatestFuelPrices,
  getFuelSummary,
  listFuelRecords,
  updateFuelRecord
} from '@/api/fuelStats'

const LOCAL_RECORD_KEY = 'fuel_stats_records'
const PAGE_SIZE_OPTIONS = [8, 12, 20]
const FUEL_TYPE_OPTIONS = [
  {value: '92', label: '92 号汽油'},
  {value: '95', label: '95 号汽油'},
  {value: '98', label: '98 号汽油'},
  {value: 'DIESEL', label: '柴油'}
]
const FILL_TYPE_OPTIONS = [
  {value: 'FULL', label: '满油'},
  {value: 'PARTIAL', label: '补油'}
]
const DEFAULT_RECORDS = [
  {
    id: 'fuel-1',
    vehicleName: 'Model Y',
    fuelDate: '2026-03-13',
    odometerKm: 15320,
    fuelVolume: 41.26,
    totalAmount: 326.78,
    discountedAmount: 308.78,
    unitPrice: 7.92,
    fuelType: '95',
    fillType: 'FULL',
    stationName: '中国石化滨江站',
    note: '周末高速返程后加满。',
    createdAt: '2026-03-13 20:14',
    updatedAt: '2026-03-13 20:14'
  },
  {
    id: 'fuel-2',
    vehicleName: 'Model Y',
    fuelDate: '2026-03-05',
    odometerKm: 14876,
    fuelVolume: 39.82,
    totalAmount: 314.18,
    discountedAmount: 302.18,
    unitPrice: 7.89,
    fuelType: '95',
    fillType: 'FULL',
    stationName: '中国石油城西站',
    note: '工作周通勤加油。',
    createdAt: '2026-03-05 08:32',
    updatedAt: '2026-03-05 08:32'
  },
  {
    id: 'fuel-3',
    vehicleName: '卡罗拉',
    fuelDate: '2026-03-12',
    odometerKm: 86210,
    fuelVolume: 33.57,
    totalAmount: 251.77,
    discountedAmount: 245.77,
    unitPrice: 7.50,
    fuelType: '92',
    fillType: 'FULL',
    stationName: '壳牌文一路站',
    note: '城区通勤，油耗相对稳定。',
    createdAt: '2026-03-12 19:05',
    updatedAt: '2026-03-12 19:05'
  },
  {
    id: 'fuel-4',
    vehicleName: '卡罗拉',
    fuelDate: '2026-03-01',
    odometerKm: 85736,
    fuelVolume: 34.12,
    totalAmount: 255.22,
    discountedAmount: 251.22,
    unitPrice: 7.48,
    fuelType: '92',
    fillType: 'FULL',
    stationName: '壳牌文一路站',
    note: '',
    createdAt: '2026-03-01 18:11',
    updatedAt: '2026-03-01 18:11'
  },
  {
    id: 'fuel-5',
    vehicleName: 'Model Y',
    fuelDate: '2026-02-24',
    odometerKm: 14430,
    fuelVolume: 40.15,
    totalAmount: 312.37,
    discountedAmount: 300.37,
    unitPrice: 7.78,
    fuelType: '95',
    fillType: 'PARTIAL',
    stationName: '中国石化滨江站',
    note: '长途出发前补油。',
    createdAt: '2026-02-24 07:56',
    updatedAt: '2026-02-24 07:56'
  }
]
const DEFAULT_LATEST_PRICES = {
  publishDate: '2026-03-15 09:00',
  prices: {
    '92': 7.58,
    '95': 8.09,
    '98': 8.96,
    DIESEL: 7.26
  }
}

function unwrapData(res) {
  const payload = res?.data
  if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data
  }
  return payload
}

function formatDateTime(date = new Date()) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hour = `${date.getHours()}`.padStart(2, '0')
  const minute = `${date.getMinutes()}`.padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

function getCurrentMonthKey() {
  const date = new Date()
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`
}

function normalizeRecord(item = {}) {
  const fuelVolume = Number(item.fuelVolume ?? item.volume ?? 0)
  const totalAmount = Number(item.totalAmount ?? item.amount ?? 0)
  const discountedAmount = Number(item.discountedAmount ?? item.actualAmount ?? item.paidAmount ?? totalAmount)
  const unitPrice = Number(item.unitPrice ?? (fuelVolume > 0 ? discountedAmount / fuelVolume : 0))

  return {
    id: item.id ?? item.recordId ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    vehicleName: item.vehicleName || item.carName || '',
    fuelDate: item.fuelDate || item.recordDate || '',
    odometerKm: Number(item.odometerKm ?? item.odometer ?? 0),
    fuelVolume,
    totalAmount,
    discountedAmount,
    discountAmount: Math.max(0, totalAmount - discountedAmount),
    unitPrice,
    fuelType: item.fuelType || '95',
    fillType: item.fillType || 'FULL',
    stationName: item.stationName || item.station || '',
    note: item.note || item.remark || '',
    createdAt: item.createdAt || item.createTime || '',
    updatedAt: item.updatedAt || item.updateTime || item.createdAt || item.createTime || '',
    distanceKm: Number(item.distanceKm ?? 0),
    fuelConsumption: item.fuelConsumption != null ? Number(item.fuelConsumption) : null
  }
}

function loadLocalRecords() {
  try {
    const raw = localStorage.getItem(LOCAL_RECORD_KEY)
    if (!raw) {
      localStorage.setItem(LOCAL_RECORD_KEY, JSON.stringify(DEFAULT_RECORDS))
      return DEFAULT_RECORDS.map((item) => normalizeRecord(item))
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return DEFAULT_RECORDS.map((item) => normalizeRecord(item))
    }
    return parsed.map((item) => normalizeRecord(item))
  } catch (error) {
    return DEFAULT_RECORDS.map((item) => normalizeRecord(item))
  }
}

function persistLocalRecords(list) {
  localStorage.setItem(LOCAL_RECORD_KEY, JSON.stringify(list))
}

function calculateDerivedRecords(records = []) {
  const ascending = [...records]
    .map((item) => normalizeRecord(item))
    .sort((prev, next) => (
      `${prev.vehicleName}-${prev.fuelDate}-${prev.odometerKm}`.localeCompare(`${next.vehicleName}-${next.fuelDate}-${next.odometerKm}`)
    ))

  const previousMap = new Map()
  const derived = ascending.map((item) => {
    const previous = previousMap.get(item.vehicleName)
    const distanceKm = previous && item.odometerKm > previous.odometerKm
      ? item.odometerKm - previous.odometerKm
      : 0
    const fuelConsumption = distanceKm > 0
      ? (item.fuelVolume / distanceKm) * 100
      : null

    previousMap.set(item.vehicleName, item)
    return {
      ...item,
      distanceKm,
      fuelConsumption
    }
  })

  return derived.sort((prev, next) => (
    `${next.fuelDate}-${next.odometerKm}`.localeCompare(`${prev.fuelDate}-${prev.odometerKm}`)
  ))
}

function buildSummary(records = []) {
  const totalAmount = records.reduce((sum, item) => sum + Number(item.discountedAmount || item.totalAmount || 0), 0)
  const totalDiscountAmount = records.reduce((sum, item) => sum + Number(item.discountAmount || 0), 0)
  const totalFuelVolume = records.reduce((sum, item) => sum + Number(item.fuelVolume || 0), 0)
  const currentMonthKey = getCurrentMonthKey()
  const currentMonthAmount = records
    .filter((item) => `${item.fuelDate || ''}`.startsWith(currentMonthKey))
    .reduce((sum, item) => sum + Number(item.discountedAmount || item.totalAmount || 0), 0)
  const consumptionRecords = records.filter((item) => item.fuelConsumption != null && item.fuelConsumption > 0)
  const averageConsumption = consumptionRecords.length
    ? consumptionRecords.reduce((sum, item) => sum + Number(item.fuelConsumption || 0), 0) / consumptionRecords.length
    : 0

  return {
    totalAmount,
    totalDiscountAmount,
    totalFuelVolume,
    averageUnitPrice: totalFuelVolume > 0 ? totalAmount / totalFuelVolume : 0,
    averageConsumption,
    currentMonthAmount
  }
}

function buildVehicleStats(records = []) {
  const map = records.reduce((result, item) => {
    const current = result[item.vehicleName] || {
      vehicleName: item.vehicleName,
      totalAmount: 0,
      totalDiscountAmount: 0,
      totalFuelVolume: 0,
      totalDistance: 0,
      recordCount: 0
    }
    current.totalAmount += Number(item.discountedAmount || item.totalAmount || 0)
    current.totalDiscountAmount += Number(item.discountAmount || 0)
    current.totalFuelVolume += Number(item.fuelVolume || 0)
    current.totalDistance += Number(item.distanceKm || 0)
    current.recordCount += 1
    result[item.vehicleName] = current
    return result
  }, {})

  return Object.values(map)
    .map((item) => ({
      ...item,
      averageConsumption: item.totalDistance > 0 ? (item.totalFuelVolume / item.totalDistance) * 100 : 0
    }))
    .sort((prev, next) => next.recordCount - prev.recordCount)
}

function buildRecentRecords(records = []) {
  return records.slice(0, 4)
}

function buildMonthlyFuelReport(records = []) {
  const currentYear = `${new Date().getFullYear()}`
  const monthMap = Array.from({length: 12}, (_, index) => ({
    label: `${`${index + 1}`.padStart(2, '0')}月`,
    fuelVolume: 0,
    totalAmount: 0
  }))

  records.forEach((item) => {
    if (!`${item.fuelDate || ''}`.startsWith(currentYear)) {
      return
    }
    const monthIndex = Number(`${item.fuelDate}`.slice(5, 7)) - 1
    if (monthIndex >= 0 && monthIndex < 12) {
      monthMap[monthIndex].fuelVolume += Number(item.fuelVolume || 0)
      monthMap[monthIndex].totalAmount += Number(item.discountedAmount || item.totalAmount || 0)
    }
  })

  return monthMap
}

function buildYearlyCostReport(records = []) {
  const yearMap = records.reduce((result, item) => {
    const year = `${item.fuelDate || ''}`.slice(0, 4) || '未知'
    const current = result[year] || {
      label: year,
      totalAmount: 0,
      totalFuelVolume: 0
    }
    current.totalAmount += Number(item.discountedAmount || item.totalAmount || 0)
    current.totalFuelVolume += Number(item.fuelVolume || 0)
    result[year] = current
    return result
  }, {})

  return Object.values(yearMap).sort((prev, next) => prev.label.localeCompare(next.label))
}

export default {
  name: 'FuelStats',
  setup() {
    const router = useRouter()

    const loading = ref(false)
    const submitting = ref(false)
    const usingLocalData = ref(false)
    const total = ref(0)
    const pagedRecords = ref([])
    const allRecords = ref([])
    const vehicleStats = ref([])
    const recentRecords = ref([])
    const monthlyFuelReport = ref([])
    const yearlyCostReport = ref([])
    const latestFuelPrices = reactive({
      publishDate: '',
      prices: {
        '92': 0,
        '95': 0,
        '98': 0,
        DIESEL: 0
      }
    })

    const summary = reactive({
      totalAmount: 0,
      totalDiscountAmount: 0,
      totalFuelVolume: 0,
      averageUnitPrice: 0,
      averageConsumption: 0,
      currentMonthAmount: 0
    })

    const showDialog = ref(false)
    const dialogMode = ref('create')
    const editingId = ref('')

    const query = reactive({
      pageNo: 1,
      pageSize: PAGE_SIZE_OPTIONS[0]
    })

    const form = reactive({
      vehicleName: '',
      fuelDate: '',
      odometerKm: 0,
      fuelVolume: 0,
      totalAmount: 0,
      discountedAmount: 0,
      unitPrice: null,
      fuelType: '95',
      fillType: 'FULL',
      stationName: '',
      note: ''
    })

    const pageSizeOptions = PAGE_SIZE_OPTIONS
    const fuelTypeOptions = FUEL_TYPE_OPTIONS
    const fillTypeOptions = FILL_TYPE_OPTIONS

    const totalPages = computed(() => Math.max(1, Math.ceil(total.value / query.pageSize)))
    const currentYearLabel = `${new Date().getFullYear()}年`
    const fuelPriceCards = computed(() => ([
      {code: '92', label: '92 号汽油', priceText: latestFuelPrices.prices['92'] ? `¥${Number(latestFuelPrices.prices['92']).toFixed(2)}/L` : '-'},
      {code: '95', label: '95 号汽油', priceText: latestFuelPrices.prices['95'] ? `¥${Number(latestFuelPrices.prices['95']).toFixed(2)}/L` : '-'},
      {code: '98', label: '98 号汽油', priceText: latestFuelPrices.prices['98'] ? `¥${Number(latestFuelPrices.prices['98']).toFixed(2)}/L` : '-'},
      {code: 'DIESEL', label: '柴油', priceText: latestFuelPrices.prices.DIESEL ? `¥${Number(latestFuelPrices.prices.DIESEL).toFixed(2)}/L` : '-'}
    ]))
    const maxYearlyCost = computed(() => Math.max(1, ...yearlyCostReport.value.map((item) => Number(item.totalAmount || 0))))
    const monthlyTrendPoints = computed(() => {
      const chartWidth = 308
      const chartHeight = 138
      const offsetX = 30
      const offsetY = 22
      const maxValue = Math.max(1, ...monthlyFuelReport.value.map((item) => Number(item.fuelVolume || 0)))
      return monthlyFuelReport.value.map((item, index) => {
        const x = offsetX + (chartWidth / 11) * index
        const y = offsetY + chartHeight - (Number(item.fuelVolume || 0) / maxValue) * chartHeight
        return {
          label: item.label,
          value: Number(item.fuelVolume || 0),
          x: Number(x.toFixed(2)),
          y: Number(y.toFixed(2))
        }
      })
    })
    const monthlyTrendPolyline = computed(() => monthlyTrendPoints.value.map((point) => `${point.x},${point.y}`).join(' '))
    const monthlyAmountPoints = computed(() => {
      const chartWidth = 308
      const chartHeight = 138
      const offsetX = 30
      const offsetY = 22
      const maxValue = Math.max(1, ...monthlyFuelReport.value.map((item) => Number(item.totalAmount || 0)))
      return monthlyFuelReport.value.map((item, index) => {
        const x = offsetX + (chartWidth / 11) * index
        const y = offsetY + chartHeight - (Number(item.totalAmount || 0) / maxValue) * chartHeight
        return {
          label: item.label,
          value: Number(item.totalAmount || 0),
          x: Number(x.toFixed(2)),
          y: Number(y.toFixed(2))
        }
      })
    })
    const monthlyAmountPolyline = computed(() => monthlyAmountPoints.value.map((point) => `${point.x},${point.y}`).join(' '))

    const consumptionClassMap = {
      low: 'low',
      medium: 'medium',
      high: 'high',
      none: 'none'
    }

    const formatNumber = (value) => (
      value == null || Number.isNaN(Number(value))
        ? '-'
        : Number(value).toFixed(Number(value) % 1 === 0 ? 0 : 2)
    )

    const formatCurrency = (value) => `¥${Number(value || 0).toFixed(2)}`
    const formatUnitPrice = (value) => value ? `¥${Number(value).toFixed(3)}/L` : '-'
    const formatConsumption = (value) => value ? `${Number(value).toFixed(2)} L/100km` : '-'
    const formatFuelTypeText = (value) => fuelTypeOptions.find((item) => item.value === value)?.label || value || '-'
    const formatFillTypeText = (value) => fillTypeOptions.find((item) => item.value === value)?.label || value || '-'

    const getConsumptionLevel = (value) => {
      if (!value) {
        return 'none'
      }
      if (value <= 6.5) {
        return 'low'
      }
      if (value <= 9) {
        return 'medium'
      }
      return 'high'
    }

    const applyInsights = (records) => {
      const nextSummary = buildSummary(records)
      summary.totalAmount = nextSummary.totalAmount
      summary.totalDiscountAmount = nextSummary.totalDiscountAmount
      summary.totalFuelVolume = nextSummary.totalFuelVolume
      summary.averageUnitPrice = nextSummary.averageUnitPrice
      summary.averageConsumption = nextSummary.averageConsumption
      summary.currentMonthAmount = nextSummary.currentMonthAmount
      vehicleStats.value = buildVehicleStats(records)
      recentRecords.value = buildRecentRecords(records)
      monthlyFuelReport.value = buildMonthlyFuelReport(records)
      yearlyCostReport.value = buildYearlyCostReport(records)
    }

    const applyLatestPrices = (payload = {}) => {
      latestFuelPrices.publishDate = payload.publishDate || payload.updateTime || DEFAULT_LATEST_PRICES.publishDate
      latestFuelPrices.prices['92'] = Number(payload.prices?.['92'] ?? payload.price92 ?? DEFAULT_LATEST_PRICES.prices['92'])
      latestFuelPrices.prices['95'] = Number(payload.prices?.['95'] ?? payload.price95 ?? DEFAULT_LATEST_PRICES.prices['95'])
      latestFuelPrices.prices['98'] = Number(payload.prices?.['98'] ?? payload.price98 ?? DEFAULT_LATEST_PRICES.prices['98'])
      latestFuelPrices.prices.DIESEL = Number(payload.prices?.DIESEL ?? payload.priceDiesel ?? DEFAULT_LATEST_PRICES.prices.DIESEL)
    }

    const applyReports = (payload = {}, fallbackRecords = []) => {
      if (Array.isArray(payload.currentYearMonthlyFuel) && payload.currentYearMonthlyFuel.length) {
        monthlyFuelReport.value = payload.currentYearMonthlyFuel.map((item) => ({
          label: item.label || item.month || '',
          fuelVolume: Number(item.fuelVolume ?? item.totalFuelVolume ?? 0),
          totalAmount: Number(item.totalAmount ?? item.discountedAmount ?? item.actualAmount ?? 0)
        }))
      } else {
        monthlyFuelReport.value = buildMonthlyFuelReport(fallbackRecords)
      }

      if (Array.isArray(payload.yearlyCostStats) && payload.yearlyCostStats.length) {
        yearlyCostReport.value = payload.yearlyCostStats.map((item) => ({
          label: item.label || item.year || '',
          totalAmount: Number(item.totalAmount ?? item.discountedAmount ?? item.actualAmount ?? 0),
          totalFuelVolume: Number(item.totalFuelVolume ?? 0)
        }))
      } else {
        yearlyCostReport.value = buildYearlyCostReport(fallbackRecords)
      }
    }

    const applyLocalFilterAndPaging = () => {
      const filtered = allRecords.value
      total.value = filtered.length
      const safePageNo = Math.min(query.pageNo, Math.max(1, Math.ceil(filtered.length / query.pageSize) || 1))
      query.pageNo = safePageNo
      const startIndex = (safePageNo - 1) * query.pageSize
      pagedRecords.value = filtered.slice(startIndex, startIndex + query.pageSize)
      applyInsights(allRecords.value)
    }

    const syncLocalRecords = (records) => {
      const nextRecords = calculateDerivedRecords(records)
      allRecords.value = nextRecords
      persistLocalRecords(nextRecords)
      applyLocalFilterAndPaging()
    }

    const loadRecords = async () => {
      loading.value = true
      try {
        const listRes = await listFuelRecords({
          pageNo: query.pageNo,
          pageSize: query.pageSize
        })
        const payload = unwrapData(listRes) || {}
        const rawList = Array.isArray(payload)
          ? payload
          : (payload.list || payload.records || payload.rows || [])
        const normalizedList = calculateDerivedRecords(rawList)
        allRecords.value = normalizedList
        pagedRecords.value = normalizedList
        total.value = Number(payload.total ?? payload.count ?? normalizedList.length ?? 0)
        usingLocalData.value = false

        try {
          const summaryRes = await getFuelSummary()
          const summaryPayload = unwrapData(summaryRes) || {}
          summary.totalAmount = Number(summaryPayload.totalPaidAmount ?? summaryPayload.discountedAmount ?? summaryPayload.totalAmount ?? 0)
          summary.totalDiscountAmount = Number(summaryPayload.totalDiscountAmount ?? 0)
          summary.totalFuelVolume = Number(summaryPayload.totalFuelVolume ?? 0)
          summary.averageUnitPrice = Number(summaryPayload.averageUnitPrice ?? 0)
          summary.averageConsumption = Number(summaryPayload.averageConsumption ?? 0)
          summary.currentMonthAmount = Number(summaryPayload.currentMonthAmount ?? 0)
          vehicleStats.value = Array.isArray(summaryPayload.vehicleStats) ? summaryPayload.vehicleStats : buildVehicleStats(normalizedList)
          recentRecords.value = Array.isArray(summaryPayload.recentRecords)
            ? summaryPayload.recentRecords.map((item) => normalizeRecord(item))
            : buildRecentRecords(normalizedList)
        } catch (error) {
          applyInsights(normalizedList)
        }

        try {
          const priceRes = await getLatestFuelPrices()
          applyLatestPrices(unwrapData(priceRes) || {})
        } catch (error) {
          applyLatestPrices(DEFAULT_LATEST_PRICES)
        }

        try {
          const reportRes = await getFuelReports()
          applyReports(unwrapData(reportRes) || {}, normalizedList)
        } catch (error) {
          applyReports({}, normalizedList)
        }
      } catch (error) {
        allRecords.value = calculateDerivedRecords(loadLocalRecords())
        usingLocalData.value = true
        applyLocalFilterAndPaging()
        applyLatestPrices(DEFAULT_LATEST_PRICES)
      } finally {
        loading.value = false
      }
    }

    const resetForm = () => {
      form.vehicleName = ''
      form.fuelDate = ''
      form.odometerKm = 0
      form.fuelVolume = 0
      form.totalAmount = 0
      form.discountedAmount = 0
      form.unitPrice = null
      form.fuelType = '95'
      form.fillType = 'FULL'
      form.stationName = ''
      form.note = ''
    }

    const fillForm = (record) => {
      form.vehicleName = record.vehicleName || ''
      form.fuelDate = record.fuelDate || ''
      form.odometerKm = Number(record.odometerKm || 0)
      form.fuelVolume = Number(record.fuelVolume || 0)
      form.totalAmount = Number(record.totalAmount || 0)
      form.discountedAmount = Number(record.discountedAmount || record.totalAmount || 0)
      form.unitPrice = Number(record.unitPrice || 0)
      form.fuelType = record.fuelType || '95'
      form.fillType = record.fillType || 'FULL'
      form.stationName = record.stationName || ''
      form.note = record.note || ''
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

    const buildFormPayload = () => {
      const fuelVolume = Number(form.fuelVolume || 0)
      const totalAmount = Number(form.totalAmount || 0)
      const discountedAmount = Number(form.discountedAmount || 0)
      return {
        vehicleName: form.vehicleName,
        fuelDate: form.fuelDate,
        odometerKm: Number(form.odometerKm || 0),
        fuelVolume,
        totalAmount,
        discountedAmount,
        unitPrice: Number(form.unitPrice || 0) || (fuelVolume > 0 ? discountedAmount / fuelVolume : 0),
        fuelType: form.fuelType,
        fillType: form.fillType,
        stationName: form.stationName,
        note: form.note
      }
    }

    const submitDialog = async () => {
      if (!form.vehicleName) {
        alert('请输入车辆名称')
        return
      }
      if (!form.fuelDate) {
        alert('请选择加油日期')
        return
      }
      if (!form.odometerKm) {
        alert('请输入当前里程')
        return
      }
      if (!form.fuelVolume) {
        alert('请输入加油量')
        return
      }
      if (!form.totalAmount) {
        alert('请输入加油金额')
        return
      }
      if (!form.discountedAmount) {
        alert('请输入实际优惠后金额')
        return
      }
      if (Number(form.discountedAmount) > Number(form.totalAmount)) {
        alert('优惠后金额不能大于加油金额')
        return
      }
      if (submitting.value) {
        return
      }

      const payload = buildFormPayload()
      submitting.value = true
      try {
        if (dialogMode.value === 'create') {
          await createFuelRecord(payload)
        } else {
          await updateFuelRecord(editingId.value, payload)
        }
        showDialog.value = false
        resetForm()
        await loadRecords()
      } catch (error) {
        const now = formatDateTime()
        if (dialogMode.value === 'create') {
          syncLocalRecords([
            normalizeRecord({
              ...payload,
              id: `fuel-${Date.now()}`,
              createdAt: now,
              updatedAt: now
            }),
            ...loadLocalRecords()
          ])
        } else {
          syncLocalRecords(loadLocalRecords().map((item) => (
            item.id === editingId.value
              ? normalizeRecord({
                ...item,
                ...payload,
                updatedAt: now
              })
              : item
          )))
        }
        usingLocalData.value = true
        showDialog.value = false
        resetForm()
      } finally {
        submitting.value = false
      }
    }

    const removeRecord = async (item) => {
      if (!window.confirm(`确认删除【${item.vehicleName} / ${item.fuelDate}】这条记录吗？`)) {
        return
      }
      try {
        await deleteFuelRecord(item.id)
        await loadRecords()
      } catch (error) {
        syncLocalRecords(loadLocalRecords().filter((record) => record.id !== item.id))
        usingLocalData.value = true
      }
    }

    const changePage = (offset) => {
      const nextPage = query.pageNo + offset
      if (nextPage < 1 || nextPage > totalPages.value) {
        return
      }
      query.pageNo = nextPage
      loadRecords()
    }

    const handlePageSizeChange = () => {
      query.pageNo = 1
      loadRecords()
    }

    const goBack = () => {
      router.push('/home')
    }

    const getBarWidth = (value, maxValue) => {
      if (!value || !maxValue) {
        return 0
      }
      return Math.max(6, (Number(value) / Number(maxValue)) * 100)
    }

    onMounted(() => {
      loadRecords()
    })

    return {
      loading,
      submitting,
      usingLocalData,
      total,
      pagedRecords,
      summary,
      vehicleStats,
      recentRecords,
      monthlyFuelReport,
      yearlyCostReport,
      latestFuelPrices,
      query,
      form,
      showDialog,
      dialogMode,
      pageSizeOptions,
      fuelTypeOptions,
      fillTypeOptions,
      currentYearLabel,
      fuelPriceCards,
      totalPages,
      maxYearlyCost,
      monthlyTrendPoints,
      monthlyTrendPolyline,
      monthlyAmountPoints,
      monthlyAmountPolyline,
      consumptionClassMap,
      formatNumber,
      formatCurrency,
      formatUnitPrice,
      formatConsumption,
      formatFuelTypeText,
      formatFillTypeText,
      getConsumptionLevel,
      getBarWidth,
      changePage,
      handlePageSizeChange,
      openCreateDialog,
      openEditDialog,
      closeDialog,
      submitDialog,
      removeRecord,
      loadRecords,
      goBack
    }
  }
}
</script>

<style scoped>
.fuel-page {
  min-height: 100vh;
  padding: 18px 22px 26px;
  color: #fff;
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
.price-panel,
.list-panel,
.insight-panel,
.report-panel,
.dialog {
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: linear-gradient(135deg, rgba(7, 22, 39, 0.82), rgba(17, 49, 73, 0.72));
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(16px);
}

.hero-panel,
.price-panel,
.list-panel,
.insight-panel,
.report-panel {
  border-radius: 18px;
  padding: 16px 18px;
}

.hero-panel,
.toolbar,
.panel-head,
.pager,
.insight-head,
.stats-row,
.recent-item,
.dialog-actions,
.mobile-card-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hero-panel,
.toolbar,
.panel-head,
.pager,
.insight-head,
.stats-row,
.recent-item {
  justify-content: space-between;
}

.hero-panel,
.price-panel {
  margin-bottom: 14px;
}

.fuel-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(300px, 0.9fr);
  gap: 14px;
}

.report-panel {
  margin-top: 14px;
}

.page-title,
.panel-title,
.dialog-title,
.insight-title,
.mobile-record-title {
  margin: 0;
}

.page-title {
  font-size: 28px;
}

.page-subtitle,
.panel-tip,
.subtle-empty,
.mobile-record-subtitle {
  margin: 6px 0 0;
  color: rgba(255, 255, 255, 0.74);
}

.hero-tags,
.toolbar-left,
.toolbar-right,
.row-actions,
.mobile-card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.hero-tag,
.consumption-chip {
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

.mock-tip {
  padding: 4px 8px;
  border-radius: 8px;
  color: #ffecb3;
  background: rgba(255, 184, 0, 0.2);
}

.price-date {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.price-layout,
.price-grid,
.report-grid {
  display: grid;
  gap: 12px;
}

.price-layout {
  grid-template-columns: minmax(320px, 0.95fr) minmax(0, 1.25fr);
  align-items: stretch;
}

.price-info {
  min-width: 0;
}

.price-grid {
  margin-top: 14px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.report-grid {
  grid-template-columns: 1fr;
}

.price-card,
.report-card {
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.08);
}

.price-card {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.price-card strong {
  font-size: 22px;
  line-height: 1.2;
}

.report-card {
  padding: 14px;
}

.form-inline-grid,
.summary-grid,
.mobile-record-grid {
  display: grid;
  gap: 12px;
}

.form-inline-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.summary-grid {
  margin-top: 14px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-field span,
.mobile-record-grid span,
.summary-card span {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.72);
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
  background: linear-gradient(135deg, #1996ff, #27d5a4);
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
  background: rgba(239, 68, 68, 0.65);
}

.table-wrap {
  margin-top: 14px;
  overflow-x: auto;
}

.record-table {
  width: 100%;
  min-width: 1160px;
  border-collapse: collapse;
}

.record-table th,
.record-table td {
  padding: 10px 8px;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  font-size: 13px;
}

.record-table th {
  color: rgba(255, 255, 255, 0.88);
  font-weight: 600;
}

.mobile-record-list {
  display: none;
  margin-top: 14px;
  gap: 12px;
}

.mobile-record-card,
.summary-card,
.stats-row,
.recent-item {
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.08);
}

.mobile-record-card {
  padding: 14px;
}

.mobile-record-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.mobile-record-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 12px;
}

.mobile-record-grid p {
  margin: 0;
  padding: 11px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mobile-record-grid strong {
  font-size: 14px;
  word-break: break-word;
}

.mobile-record-grid .wide {
  grid-column: 1 / -1;
}

.consumption-chip.none {
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.84);
}

.consumption-chip.low {
  background: rgba(34, 197, 94, 0.22);
  color: #bbf7d0;
}

.consumption-chip.medium {
  background: rgba(59, 130, 246, 0.22);
  color: #dbeafe;
}

.consumption-chip.high {
  background: rgba(239, 68, 68, 0.22);
  color: #fecaca;
}

.summary-card {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.summary-card strong {
  font-size: 22px;
  line-height: 1.2;
}

.trend-card {
  display: flex;
  flex-direction: column;
}

.line-chart {
  margin-top: 14px;
}

.line-chart-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 8px;
}

.line-chart-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.82);
}

.legend-dot {
  display: inline-flex;
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

.legend-dot.fuel {
  background: #4fd1ff;
}

.legend-dot.amount {
  background: #f59e0b;
}

.line-chart-svg {
  display: block;
  width: 100%;
  height: 190px;
}

.line-chart-grid {
  fill: none;
  stroke: rgba(255, 255, 255, 0.16);
  stroke-width: 1.2;
}

.line-chart-path {
  fill: none;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.line-chart-path.fuel {
  stroke: #4fd1ff;
}

.line-chart-path.amount {
  stroke: #f59e0b;
  stroke-dasharray: 0;
}

.line-chart-dot {
  stroke: rgba(10, 23, 36, 0.9);
  stroke-width: 2;
}

.line-chart-dot.fuel {
  fill: #7ef9c7;
}

.line-chart-dot.amount {
  fill: #ffd37a;
}

.line-chart-labels {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 8px;
  margin-top: 10px;
}

.line-chart-label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
}

.line-chart-label span,
.line-chart-label strong,
.line-chart-label em {
  font-size: 12px;
}

.line-chart-label em {
  font-style: normal;
  color: rgba(255, 224, 163, 0.92);
}

.bar-chart {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 14px;
}

.bar-row {
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr) 126px;
  gap: 12px;
  align-items: center;
}

.bar-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.76);
}

.bar-track {
  position: relative;
  height: 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 999px;
}

.bar-fill.monthly {
  background: linear-gradient(90deg, rgba(59, 130, 246, 0.92), rgba(45, 212, 191, 0.92));
}

.bar-fill.yearly {
  background: linear-gradient(90deg, rgba(249, 115, 22, 0.92), rgba(239, 68, 68, 0.92));
}

.bar-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.bar-meta strong,
.bar-meta span {
  font-size: 12px;
}

.insight-block {
  margin-top: 16px;
}

.insight-title {
  font-size: 16px;
}

.stats-list,
.recent-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.stats-row,
.recent-item {
  padding: 12px 14px;
}

.stats-row > div,
.recent-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.recent-item {
  cursor: pointer;
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
  width: min(720px, 100%);
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

.dialog-actions {
  justify-content: flex-end;
  flex-wrap: wrap;
}

@media (max-width: 1100px) {
  .price-layout,
  .fuel-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 860px) {
  .price-grid,
  .line-chart-labels {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .fuel-page {
    padding: 12px;
  }

  .hero-panel,
  .price-panel,
  .toolbar,
  .pager,
  .dialog-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar-left,
  .toolbar-right,
  .pager-left,
  .pager-right {
    width: 100%;
  }

  .toolbar-left .action-btn,
  .toolbar-left .ghost-btn,
  .pager-right .ghost-btn,
  .dialog-actions .action-btn,
  .dialog-actions .ghost-btn {
    flex: 1 1 calc(50% - 6px);
  }

  .desktop-table {
    display: none;
  }

  .mobile-record-list {
    display: grid;
  }

  .summary-grid,
  .form-inline-grid {
    grid-template-columns: 1fr;
  }

  .report-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .hero-panel,
  .price-panel,
  .list-panel,
  .insight-panel,
  .report-panel,
  .dialog {
    padding: 14px;
    border-radius: 16px;
  }

  .page-title {
    font-size: 24px;
  }

  .mobile-record-grid,
  .price-grid {
    grid-template-columns: 1fr;
  }

  .line-chart-labels {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .bar-row {
    grid-template-columns: 46px minmax(0, 1fr);
  }

  .bar-meta {
    grid-column: 1 / -1;
    align-items: flex-start;
    margin-top: -2px;
  }

  .toolbar-left .action-btn,
  .toolbar-left .ghost-btn,
  .pager-right .ghost-btn,
  .dialog-actions .action-btn,
  .dialog-actions .ghost-btn,
  .mobile-card-actions .mini-btn {
    flex-basis: 100%;
  }

  .dialog-mask {
    padding: 10px;
  }
}
</style>
