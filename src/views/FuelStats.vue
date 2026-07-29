<template>
  <div class="fuel-page">
    <div class="page-nav">
      <button type="button" class="nav-icon-btn back-home-btn" aria-label="返回桌面" @click="goBack">
        <span class="back-home-icon" aria-hidden="true">‹</span>
        <span class="back-home-text">返回桌面</span>
      </button>
      <strong class="mobile-nav-title">油耗统计</strong>
      <button type="button" class="nav-icon-btn mobile-nav-add" aria-label="新增加油记录" @click="openCreateDialog">
        <span aria-hidden="true">＋</span>
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
        <span class="hero-tag">已接真实接口</span>
      </div>
    </div>

    <section class="headline-panel">
      <article class="headline-card">
        <div class="headline-copy">
          <div class="headline-topline">
            <span class="headline-label">最新油耗</span>
            <div v-if="consumptionVehicleOptions.length" class="headline-switches">
              <button
                v-for="vehicleName in consumptionVehicleOptions"
                :key="vehicleName"
                type="button"
                class="headline-switch-btn"
                :class="{ active: vehicleName === activeConsumptionVehicleName }"
                @click="switchConsumptionVehicle(vehicleName)"
              >
                {{ vehicleName }}
              </button>
            </div>
          </div>
          <strong class="headline-value">{{ formatConsumption(latestConsumptionRecord?.fuelConsumption) }}</strong>
          <p class="headline-meta">
            {{ latestConsumptionRecord?.vehicleName || '暂无车辆' }}
            <span v-if="latestConsumptionRecord?.fuelDate"> · {{ latestConsumptionRecord.fuelDate }}</span>
            <span v-if="latestConsumptionRecord?.distanceKm > 0"> · 里程差 {{ formatNumber(latestConsumptionRecord.distanceKm) }} km</span>
          </p>
        </div>
        <div class="headline-stats">
          <div class="headline-stat">
            <span>最新实付</span>
            <strong>{{ formatCurrency(latestConsumptionRecord?.discountedAmount || latestConsumptionRecord?.totalAmount) }}</strong>
          </div>
          <div class="headline-stat">
            <span>加油量</span>
            <strong>{{ latestConsumptionRecord ? `${formatNumber(latestConsumptionRecord.fuelVolume)} L` : '-' }}</strong>
          </div>
          <div class="headline-stat">
            <span>车辆均值</span>
            <strong>{{ formatConsumption(activeVehicleAverageConsumption) }}</strong>
          </div>
        </div>
      </article>
    </section>

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

          <div class="price-extra-grid">
            <article v-for="item in fuelPriceExtraItems" :key="item.label" class="price-extra-item">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </article>
          </div>
        </div>

        <article class="report-card trend-card">
          <div class="trend-card-head">
            <div>
              <span class="trend-eyebrow">年度用油概览</span>
              <h2 class="panel-title">{{ currentYearLabel }}用油节奏</h2>
              <p class="panel-tip">油量与支出拆分呈现，快速看清出行强度和实际花费。</p>
            </div>
            <div class="trend-summary" aria-label="年度用油汇总">
              <div>
                <span>累计油量</span>
                <strong>{{ formatNumber(yearFuelVolume) }} L</strong>
              </div>
              <div>
                <span>年度实付</span>
                <strong>{{ formatCurrency(yearPaidAmount) }}</strong>
              </div>
              <div>
                <span>活跃月份</span>
                <strong>{{ activeFuelMonthCount }} 个月</strong>
              </div>
            </div>
          </div>

          <div v-if="monthlyFuelReport.length" class="analytics-chart-grid">
            <section class="analytics-chart-card volume-chart-card">
              <header class="analytics-chart-head">
                <div>
                  <span class="chart-kicker fuel">油量</span>
                  <h3>月度加油量</h3>
                </div>
                <div class="chart-peak">
                  <span>峰值 · {{ monthlyPeakVolume.label }}</span>
                  <strong>{{ formatNumber(monthlyPeakVolume.value) }} L</strong>
                </div>
              </header>

              <div class="volume-chart" role="img" :aria-label="`${currentYearLabel}每月加油量柱状图`">
                <div class="volume-chart-guides" aria-hidden="true">
                  <i></i><i></i><i></i>
                </div>
                <div class="volume-bars">
                  <button
                    v-for="item in monthlyVolumeBars"
                    :key="`${item.label}-volume`"
                    type="button"
                    class="volume-bar-item"
                    :class="{ empty: !item.value }"
                    :aria-label="`${item.label}加油量${formatNumber(item.value)}升`"
                    :title="`${item.label} · ${formatNumber(item.value)} L`"
                  >
                    <span class="volume-bar-value">{{ item.value ? formatNumber(item.value) : '0' }}</span>
                    <span class="volume-bar-track">
                      <i :style="{ height: `${item.height}%` }"></i>
                    </span>
                    <span class="volume-bar-month">{{ item.label }}</span>
                  </button>
                </div>
              </div>
            </section>

            <section class="analytics-chart-card amount-chart-card">
              <header class="analytics-chart-head">
                <div>
                  <span class="chart-kicker amount">支出</span>
                  <h3>月度实付趋势</h3>
                </div>
                <div class="chart-peak">
                  <span>月均实付</span>
                  <strong>{{ formatCurrency(averageMonthlyPaidAmount) }}</strong>
                </div>
              </header>

              <div class="amount-area-chart">
                <svg
                  class="amount-area-svg"
                  viewBox="0 0 360 190"
                  preserveAspectRatio="none"
                  role="img"
                  :aria-label="`${currentYearLabel}每月实付金额面积趋势图`"
                >
                  <defs>
                    <linearGradient id="fuel-spend-area" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stop-color="#ffb44a" stop-opacity="0.42" />
                      <stop offset="100%" stop-color="#ffb44a" stop-opacity="0.02" />
                    </linearGradient>
                  </defs>
                  <line v-for="lineY in amountChartGridLines" :key="lineY" class="amount-chart-grid-line" x1="26" :y1="lineY" x2="338" :y2="lineY" />
                  <path class="amount-chart-area" :d="monthlyAmountAreaPath" />
                  <polyline class="amount-chart-line" :points="monthlyAmountPolyline" />
                  <g
                    v-for="point in monthlyAmountPoints"
                    :key="`${point.label}-amount`"
                    class="amount-chart-point"
                    :class="{ empty: !point.value, peak: point.index === monthlyPeakAmount.index }"
                  >
                    <circle class="amount-chart-point-halo" :cx="point.x" :cy="point.y" r="8" />
                    <circle class="amount-chart-point-core" :cx="point.x" :cy="point.y" r="3.5">
                      <title>{{ point.label }} · {{ formatCurrency(point.value) }}</title>
                    </circle>
                  </g>
                </svg>
                <div class="amount-chart-months" aria-hidden="true">
                  <span v-for="point in monthlyAmountPoints" :key="`${point.label}-month`">{{ point.label }}</span>
                </div>
              </div>
            </section>
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
            <button class="ghost-btn" :disabled="submitting" @click="openVehicleDialog">车辆管理</button>
            <button class="ghost-btn" :disabled="loading || submitting" @click="loadRecords">刷新列表</button>
          </div>
          <div class="toolbar-right">
            <span>共 {{ total }} 条</span>
          </div>
        </div>

        <div v-if="loading && !pagedRecords.length" class="empty-state">加载中...</div>
        <template v-else>
          <div v-if="pagedRecords.length" class="table-wrap desktop-table">
            <table class="record-table">
              <thead>
              <tr>
                <th>日期</th>
                <th>车辆</th>
                <th>加油量(L)</th>
                <th>优惠后</th>
                <th>估算油耗</th>
                <th>油站</th>
                <th>操作</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="item in pagedRecords" :key="item.id">
                <td>{{ item.fuelDate }}</td>
                <td>{{ item.vehicleName }}</td>
                <td>{{ formatNumber(item.fuelVolume) }}</td>
                <td>{{ formatCurrency(item.discountedAmount) }}</td>
                <td>{{ formatConsumption(item.fuelConsumption) }}</td>
                <td>{{ item.stationName || '-' }}</td>
                <td>
                  <div class="row-actions">
                    <button class="mini-btn" @click="openDetailDialog(item)">详情</button>
                    <button class="mini-btn" @click="openEditDialog(item)">编辑</button>
                    <button class="mini-btn danger" @click="removeRecord(item)">删除</button>
                  </div>
                </td>
              </tr>
              </tbody>
            </table>
          </div>

          <div v-if="pagedRecords.length" class="mobile-record-list">
            <article
              v-for="item in pagedRecords"
              :key="item.id"
              class="mobile-record-card"
            >
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
                <p><span>加油量</span><strong>{{ formatNumber(item.fuelVolume) }} L</strong></p>
                <p><span>优惠后</span><strong>{{ formatCurrency(item.discountedAmount) }}</strong></p>
                <p><span>油站</span><strong>{{ item.stationName || '-' }}</strong></p>
                <p class="wide"><span>备注</span><strong>{{ item.note || '-' }}</strong></p>
              </div>

              <div class="mobile-card-actions">
                <button type="button" class="mobile-detail-hint" @click="openDetailDialog(item)">
                  查看详情 <span aria-hidden="true">›</span>
                </button>
                <div class="mobile-secondary-actions">
                  <button class="mini-btn" @click.stop="openEditDialog(item)">编辑</button>
                  <button class="mini-btn danger" @click.stop="removeRecord(item)">删除</button>
                </div>
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

    <nav class="mobile-action-dock" aria-label="油耗统计快捷操作">
      <button type="button" class="dock-secondary-btn" :disabled="loading || submitting" @click="loadRecords">
        <span class="dock-icon" aria-hidden="true">↻</span>
        <span>刷新</span>
      </button>
      <button type="button" class="dock-primary-btn" :disabled="loading || submitting" @click="openCreateDialog">
        <span class="dock-plus" aria-hidden="true">＋</span>
        <span>新增记录</span>
      </button>
      <button type="button" class="dock-secondary-btn" :disabled="submitting" @click="openVehicleDialog">
        <span class="dock-icon" aria-hidden="true">▱</span>
        <span>车辆</span>
      </button>
    </nav>

    <MacDialog
      v-model="showDetailDialog"
      title="加油记录详情"
      :subtitle="detailRecord ? `${detailRecord.vehicleName} · ${detailRecord.fuelDate}` : ''"
      width="960px"
      panel-class="fuel-record-detail-dialog"
      mobile-presentation="sheet"
      :close-disabled="false"
      @cancel="closeDetailDialog"
    >
        <div v-if="detailRecord" class="detail-dialog">
        <div class="detail-dialog-head">
          <span class="consumption-chip" :class="consumptionClassMap[getConsumptionLevel(detailRecord.fuelConsumption)]">
            {{ formatConsumption(detailRecord.fuelConsumption) }}
          </span>
        </div>

          <div class="detail-grid">
          <p><span>车辆名称</span><strong>{{ detailRecord.vehicleName || '-' }}</strong></p>
          <p><span>加油时间</span><strong>{{ formatDateTime(detailRecord.fuelTime || detailRecord.fuelDate) }}</strong></p>
          <p><span>当前里程</span><strong>{{ formatNumber(detailRecord.odometerKm) }} km</strong></p>
          <p><span>里程差</span><strong>{{ detailRecord.distanceKm ? `${formatNumber(detailRecord.distanceKm)} km` : '-' }}</strong></p>
          <p><span>加油量</span><strong>{{ formatNumber(detailRecord.fuelVolume) }} L</strong></p>
          <p><span>机显单价</span><strong>{{ formatUnitPrice(detailRecord.machineUnitPrice) }}</strong></p>
          <p><span>机显金额</span><strong>{{ formatCurrency(detailRecord.totalAmount) }}</strong></p>
          <p><span>实付单价</span><strong>{{ formatUnitPrice(detailRecord.unitPrice) }}</strong></p>
          <p><span>优惠后金额</span><strong>{{ formatCurrency(detailRecord.discountedAmount) }}</strong></p>
          <p><span>优惠金额</span><strong>{{ formatCurrency(detailRecord.discountAmount) }}</strong></p>
          <p><span>燃油标号</span><strong>{{ formatFuelTypeText(detailRecord.fuelType) }}</strong></p>
          <p><span>加油方式</span><strong>{{ formatFillTypeText(detailRecord.fillType) }}</strong></p>
          <p><span>油量警告灯</span><strong>{{ detailRecord.fuelWarningLight ? '已亮' : '未亮' }}</strong></p>
          <p><span>上次记录</span><strong>{{ detailRecord.lastRecordKnown ? '已记录' : '未记录' }}</strong></p>
          <p><span>油站名称</span><strong>{{ detailRecord.stationName || '-' }}</strong></p>
          <p class="wide"><span>备注</span><strong>{{ detailRecord.note || '-' }}</strong></p>
        </div>

        <AttachmentGallery v-if="detailRecord.attachments?.length" :attachments="detailRecord.attachments" />

      </div>
      <template #footer>
        <button v-if="detailRecord" type="button" class="action-btn" @click="openEditDialog(detailRecord)">编辑记录</button>
      </template>
    </MacDialog>

    <MacDialog
      v-model="showDialog"
      :title="dialogMode === 'create' ? energyFieldLabels.createTitle : energyFieldLabels.editTitle"
      width="1040px"
      panel-class="fuel-record-dialog"
      mobile-presentation="fullScreen"
      :close-disabled="submitting"
      @cancel="closeDialog"
    >
        <form id="fuel-record-dialog-form" class="dialog-form dialog-density-grid dialog-grid-cols-4" @submit.prevent="submitDialog">
          <div class="form-inline-grid dialog-grid-group">
            <label class="form-field dialog-span-2">
              <span>选择车辆 <i>*</i></span>
              <select v-model="form.vehicleName" class="input" required @change="handleFormVehicleChange">
                <option value="" disabled>{{ vehicleOptions.length ? '请选择车辆' : '请先维护车辆' }}</option>
                <option v-for="item in vehicleOptions" :key="item.id || item.vehicleName" :value="item.vehicleName">
                  {{ item.vehicleName }}{{ item.legacy ? '（历史记录）' : '' }}
                </option>
              </select>
              <button v-if="!vehicleOptions.length" type="button" class="form-link-btn" @click="openVehicleDialog">去维护车辆</button>
            </label>

            <label class="form-field dialog-span-2">
              <span>{{ energyFieldLabels.time }} <i>*</i></span>
              <input v-model="form.fuelTime" class="input" type="datetime-local" required />
            </label>
          </div>

          <label class="form-field dialog-span-all">
            <span>当前里程(km) <i>*</i></span>
            <input v-model.number="form.odometerKm" class="input" type="number" min="0" step="1" placeholder="请输入当前里程" required />
          </label>

          <section class="energy-calculation-card dialog-span-all">
            <div class="calculation-row">
              <label class="form-field">
                <span>{{ energyFieldLabels.machineUnitPrice }} <i>*</i></span>
                <input v-model.number="form.machineUnitPrice" class="input calculation-input" type="number" min="0" step="0.001" placeholder="0.000" required @input="syncMachineAmountFromUnitPrice" />
              </label>
              <span class="calculation-operator" aria-hidden="true">×</span>
              <label class="form-field">
                <span>{{ energyFieldLabels.volume }} <i>*</i></span>
                <input v-model.number="form.fuelVolume" class="input calculation-input" type="number" min="0" step="0.01" placeholder="0.00" required @input="handleFuelVolumeInput" />
              </label>
              <span class="calculation-operator" aria-hidden="true">＝</span>
              <label class="form-field">
                <span>{{ energyFieldLabels.totalAmount }} <i>*</i></span>
                <input v-model.number="form.totalAmount" class="input calculation-input" type="number" min="0" step="0.01" placeholder="请输入机显金额" required @input="syncMachineUnitPriceFromAmount" />
              </label>
            </div>

            <div class="calculation-row secondary">
              <div class="form-field calculation-result">
                <span>{{ energyFieldLabels.actualUnitPrice }}</span>
                <strong>{{ formatEnergyUnitPrice(calculatedActualUnitPrice) }}</strong>
              </div>
              <span class="calculation-operator" aria-hidden="true">－</span>
              <div class="form-field calculation-result">
                <span>优惠金额</span>
                <strong>{{ formatCurrency(calculatedDiscountAmount) }}</strong>
              </div>
              <span class="calculation-operator" aria-hidden="true">＝</span>
              <label class="form-field">
                <span>实付金额 <i>*</i></span>
                <input v-model.number="form.discountedAmount" class="input calculation-input" type="number" min="0" step="0.01" placeholder="请输入实际支付金额" required />
              </label>
            </div>
          </section>

          <div class="record-status-grid dialog-span-all">
            <div class="record-status-field">
              <span>{{ energyFieldLabels.fillQuestion }} <i>*</i></span>
              <div class="segmented-control">
                <button v-for="item in formFillTypeOptions" :key="item.value" type="button" :class="{active: form.fillType === item.value}" @click="form.fillType = item.value">{{ item.label }}</button>
              </div>
            </div>
            <div v-if="currentFormEnergyType !== 'ELECTRIC'" class="record-status-field">
              <span>油量警告灯亮了吗？ <i>*</i></span>
              <div class="segmented-control">
                <button type="button" :class="{active: form.fuelWarningLight}" @click="form.fuelWarningLight = true">油灯亮</button>
                <button type="button" :class="{active: !form.fuelWarningLight}" @click="form.fuelWarningLight = false">没有亮</button>
              </div>
            </div>
          </div>

          <div class="form-inline-grid dialog-grid-group">
            <label class="form-field dialog-span-2">
              <span>{{ energyFieldLabels.stationName }}</span>
              <input v-model.trim="form.stationName" class="input" maxlength="60" :placeholder="energyFieldLabels.stationPlaceholder" />
            </label>
            <label class="form-field dialog-span-2">
              <span>{{ energyFieldLabels.energyType }}</span>
              <select v-model="form.fuelType" class="input">
                <option v-for="item in formFuelTypeOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
            </label>
          </div>

          <div class="record-status-grid record-status-grid-single dialog-span-2">
            <div class="record-status-field">
              <span>上次记录了吗？ <i>*</i></span>
              <div class="segmented-control">
                <button type="button" :class="{active: form.lastRecordKnown}" @click="form.lastRecordKnown = true">记录了</button>
                <button type="button" :class="{active: !form.lastRecordKnown}" @click="form.lastRecordKnown = false">没记录</button>
              </div>
            </div>
          </div>

          <label class="form-field dialog-span-all">
            <span>备注</span>
            <textarea v-model.trim="form.note" class="input textarea" rows="3" maxlength="240" placeholder="记录路况、油价变化或保养说明" />
          </label>

          <AttachmentManager
            class="dialog-span-all"
            v-model="form.attachments"
            usage-type="IMAGE"
            :max-count="3"
            :title="energyFieldLabels.voucherTitle"
            :hint="energyFieldLabels.voucherHint"
          />

        </form>
        <template #footer>
          <button form="fuel-record-dialog-form" type="submit" class="action-btn" :disabled="submitting">
            {{ submitting ? '提交中...' : (dialogMode === 'create' ? energyFieldLabels.saveText : energyFieldLabels.updateText) }}
          </button>
        </template>
    </MacDialog>

    <MacDialog
      v-model="showVehicleDialog"
      title="车辆管理"
      subtitle="维护车辆后，加油或充电记录可直接选择。"
      width="720px"
      panel-class="fuel-vehicle-dialog"
      mobile-presentation="sheet"
      :close-disabled="vehicleSubmitting"
      @cancel="closeVehicleDialog"
    >
      <div class="vehicle-dialog">
        <form id="fuel-vehicle-form" class="vehicle-form" @submit.prevent="submitVehicle">
          <label class="form-field vehicle-name-field">
            <span>车辆名称</span>
            <input v-model.trim="vehicleForm.vehicleName" class="input" maxlength="64" placeholder="例如：CS75 PLUS / Model Y" required />
          </label>
          <label class="form-field">
            <span>能源类型</span>
            <select v-model="vehicleForm.energyType" class="input" @change="handleVehicleEnergyTypeChange">
              <option v-for="item in vehicleEnergyTypeOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
          </label>
          <label class="form-field">
            <span>{{ vehicleForm.energyType === 'ELECTRIC' ? '默认充电类型' : '默认油号' }}</span>
            <select v-model="vehicleForm.defaultFuelType" class="input">
              <option v-for="item in vehicleDefaultFuelTypeOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
          </label>
          <label class="vehicle-default-option">
            <input v-model="vehicleForm.defaultVehicle" type="checkbox" />
            <span>作为默认车辆</span>
          </label>
        </form>

        <div class="vehicle-list-head">
          <h4>已维护车辆</h4>
          <span>{{ fuelVehicles.length }} 台</span>
        </div>
        <div v-if="fuelVehicles.length" class="vehicle-list">
          <article v-for="item in fuelVehicles" :key="item.id" class="vehicle-item">
            <div class="vehicle-item-main">
              <strong>{{ item.vehicleName }}</strong>
              <span>{{ formatVehicleEnergyText(item.energyType) }} · 默认{{ formatFuelTypeText(item.defaultFuelType) }}</span>
            </div>
            <span v-if="item.defaultVehicle" class="default-vehicle-chip">默认</span>
            <div class="vehicle-item-actions">
              <button type="button" class="mini-btn" @click="openVehicleEdit(item)">编辑</button>
              <button type="button" class="mini-btn danger" @click="removeVehicle(item)">删除</button>
            </div>
          </article>
        </div>
        <div v-else class="subtle-empty">还没有车辆，先添加一台用于后续记录。</div>
      </div>
      <template #footer>
        <button type="button" class="ghost-btn" :disabled="vehicleSubmitting" @click="resetVehicleForm">新增车辆</button>
        <button form="fuel-vehicle-form" type="submit" class="action-btn" :disabled="vehicleSubmitting">
          {{ vehicleSubmitting ? '保存中...' : (vehicleDialogMode === 'create' ? '保存车辆' : '更新车辆') }}
        </button>
      </template>
    </MacDialog>
  </div>
</template>

<script>
import {computed, onMounted, reactive, ref} from 'vue'
import {useRouter} from 'vue-router'
import MacDialog from '@/components/MacDialog.vue'
import {confirmDialog} from '@/components/systemDialog'
import AttachmentManager from '@/components/AttachmentManager.vue'
import AttachmentGallery from '@/components/AttachmentGallery.vue'
import {
  createFuelRecord,
  createFuelVehicle,
  deleteFuelRecord,
  deleteFuelVehicle,
  getFuelReports,
  getLatestFuelPrices,
  getFuelSummary,
  listFuelVehicles,
  listFuelRecords,
  updateFuelRecord,
  updateFuelVehicle
} from '@/api/fuelStats'

const PAGE_SIZE_OPTIONS = [8, 12, 20]
const FUEL_TYPE_OPTIONS = [
  {value: '92', label: '92 号汽油'},
  {value: '95', label: '95 号汽油'},
  {value: '98', label: '98 号汽油'},
  {value: 'DIESEL', label: '柴油'}
]
const ELECTRIC_FUEL_TYPE_OPTIONS = [
  {value: 'ELECTRIC', label: '交流 / 直流充电'}
]
const FILL_TYPE_OPTIONS = [
  {value: 'FULL', label: '满油'},
  {value: 'PARTIAL', label: '补油'}
]
const ELECTRIC_FILL_TYPE_OPTIONS = [
  {value: 'FULL', label: '充满'},
  {value: 'PARTIAL', label: '补电'}
]
const VEHICLE_ENERGY_TYPE_OPTIONS = [
  {value: 'FUEL', label: '燃油车'},
  {value: 'ELECTRIC', label: '新能源车'}
]
// 兼容统一响应包装与直接返回数据的两种接口形态。
function unwrapData(res) {
  const payload = res?.data
  if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data
  }
  return payload
}

// 统一加油记录字段，并把优惠后实付金额和优惠金额一并算好供页面复用。
function normalizeRecord(item = {}) {
  const fuelVolume = Number(item.fuelVolume ?? item.volume ?? 0)
  const totalAmount = Number(item.totalAmount ?? item.amount ?? 0)
  const discountedAmount = Number(item.discountedAmount ?? item.actualAmount ?? item.paidAmount ?? totalAmount)
  const unitPrice = Number(item.unitPrice ?? (fuelVolume > 0 ? discountedAmount / fuelVolume : 0))
  const machineUnitPrice = Number(item.machineUnitPrice ?? (fuelVolume > 0 ? totalAmount / fuelVolume : unitPrice))

  return {
    id: item.id ?? item.recordId ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    vehicleName: item.vehicleName || item.carName || '',
    fuelDate: item.fuelDate || item.recordDate || '',
    fuelTime: item.fuelTime || item.recordTime || item.fuelDate || item.recordDate || '',
    odometerKm: Number(item.odometerKm ?? item.odometer ?? 0),
    fuelVolume,
    machineUnitPrice,
    totalAmount,
    discountedAmount,
    discountAmount: Number(item.discountAmount ?? Math.max(0, totalAmount - discountedAmount)),
    unitPrice,
    fuelType: item.fuelType || '95',
    fillType: item.fillType || 'FULL',
    fuelWarningLight: Boolean(item.fuelWarningLight),
    lastRecordKnown: item.lastRecordKnown !== false,
    stationName: item.stationName || item.station || '',
    note: item.note || item.remark || '',
    createdAt: item.createdAt || item.createTime || '',
    updatedAt: item.updatedAt || item.updateTime || item.createdAt || item.createTime || '',
    distanceKm: Number(item.distanceKm ?? 0),
    fuelConsumption: item.fuelConsumption != null ? Number(item.fuelConsumption) : null,
    attachments: Array.isArray(item.attachments) ? item.attachments : []
  }
}

// 车辆档案与历史加油记录分开维护，名称仍作为旧记录兼容键。
function normalizeFuelVehicle(item = {}) {
  return {
    id: item.id ?? '',
    vehicleName: item.vehicleName || '',
    energyType: item.energyType === 'ELECTRIC' ? 'ELECTRIC' : 'FUEL',
    defaultFuelType: item.defaultFuelType || (item.energyType === 'ELECTRIC' ? 'ELECTRIC' : '95'),
    defaultVehicle: Boolean(item.defaultVehicle ?? item.isDefault)
  }
}

function formatDateTimeInput(value) {
  if (!value) {
    const now = new Date()
    const offsetTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    return offsetTime.toISOString().slice(0, 16)
  }
  const normalized = `${value}`.replace(' ', 'T')
  return normalized.length >= 16 ? normalized.slice(0, 16) : `${normalized}T00:00`
}

// 里程差和百公里油耗依赖同车上一条记录，这里集中补全派生指标。
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

// 概览卡片、车辆统计和图表公用同一套聚合结果，保证金额口径始终按优惠后实付计算。
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
  components: {MacDialog, AttachmentManager, AttachmentGallery},
  setup() {
    const router = useRouter()

    // 页面状态分成记录列表、洞察面板、图表报表和弹窗表单四块。
    const loading = ref(false)
    const submitting = ref(false)
    const total = ref(0)
    const pagedRecords = ref([])
    const vehicleStats = ref([])
    const recentRecords = ref([])
    const monthlyFuelReport = ref([])
    const yearlyCostReport = ref([])
    const fuelVehicles = ref([])
    const selectedVehicleName = ref('')
    const latestFuelPrices = reactive({
      publishDate: '',
      nextAdjustTime: '',
      adjustWindow: '',
      priceChangeHint: '',
      remark: '',
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
    const showDetailDialog = ref(false)
    const showVehicleDialog = ref(false)
    const dialogMode = ref('create')
    const vehicleDialogMode = ref('create')
    const editingId = ref('')
    const editingVehicleId = ref('')
    const detailRecord = ref(null)
    const vehicleSubmitting = ref(false)

    const query = reactive({
      pageNo: 1,
      pageSize: PAGE_SIZE_OPTIONS[0]
    })

    const form = reactive({
      vehicleName: '',
      fuelTime: '',
      odometerKm: 0,
      fuelVolume: 0,
      machineUnitPrice: 0,
      totalAmount: 0,
      discountedAmount: 0,
      fuelType: '95',
      fillType: 'FULL',
      fuelWarningLight: false,
      lastRecordKnown: true,
      stationName: '',
      note: '',
      attachments: []
    })
    const vehicleForm = reactive({
      vehicleName: '',
      energyType: 'FUEL',
      defaultFuelType: '95',
      defaultVehicle: false
    })

    const pageSizeOptions = PAGE_SIZE_OPTIONS
    const fuelTypeOptions = FUEL_TYPE_OPTIONS
    const fillTypeOptions = FILL_TYPE_OPTIONS
    const vehicleEnergyTypeOptions = VEHICLE_ENERGY_TYPE_OPTIONS

    const totalPages = computed(() => Math.max(1, Math.ceil(total.value / query.pageSize)))
    const currentYearLabel = `${new Date().getFullYear()}年`
    const fuelPriceCards = computed(() => ([
      {code: '92', label: '92 号汽油', priceText: latestFuelPrices.prices['92'] ? `¥${Number(latestFuelPrices.prices['92']).toFixed(2)}/L` : '-'},
      {code: '95', label: '95 号汽油', priceText: latestFuelPrices.prices['95'] ? `¥${Number(latestFuelPrices.prices['95']).toFixed(2)}/L` : '-'},
      {code: '98', label: '98 号汽油', priceText: latestFuelPrices.prices['98'] ? `¥${Number(latestFuelPrices.prices['98']).toFixed(2)}/L` : '-'},
      {code: 'DIESEL', label: '柴油', priceText: latestFuelPrices.prices.DIESEL ? `¥${Number(latestFuelPrices.prices.DIESEL).toFixed(2)}/L` : '-'}
    ]))
    const vehicleOptions = computed(() => {
      const maintainedNames = new Set(fuelVehicles.value.map((item) => item.vehicleName))
      const legacyVehicleMap = new Map()
      const candidateRecords = [...recentRecords.value, ...pagedRecords.value]
      candidateRecords.forEach((item) => {
        if (!item.vehicleName || maintainedNames.has(item.vehicleName) || legacyVehicleMap.has(item.vehicleName)) {
          return
        }
        const electricVehicle = item.fuelType === 'ELECTRIC'
        legacyVehicleMap.set(item.vehicleName, {
          id: `legacy-${item.vehicleName}`,
          vehicleName: item.vehicleName,
          energyType: electricVehicle ? 'ELECTRIC' : 'FUEL',
          defaultFuelType: electricVehicle ? 'ELECTRIC' : '95',
          legacy: true
        })
      })
      const legacyVehicles = Array.from(legacyVehicleMap.values())
      return [...fuelVehicles.value, ...legacyVehicles]
    })
    const currentFormVehicle = computed(() => (
      vehicleOptions.value.find((item) => item.vehicleName === form.vehicleName) || null
    ))
    const currentFormEnergyType = computed(() => (
      currentFormVehicle.value?.energyType || (form.fuelType === 'ELECTRIC' ? 'ELECTRIC' : 'FUEL')
    ))
    const formFuelTypeOptions = computed(() => (
      currentFormEnergyType.value === 'ELECTRIC' ? ELECTRIC_FUEL_TYPE_OPTIONS : FUEL_TYPE_OPTIONS
    ))
    const formFillTypeOptions = computed(() => (
      currentFormEnergyType.value === 'ELECTRIC' ? ELECTRIC_FILL_TYPE_OPTIONS : FILL_TYPE_OPTIONS
    ))
    const vehicleDefaultFuelTypeOptions = computed(() => (
      vehicleForm.energyType === 'ELECTRIC' ? ELECTRIC_FUEL_TYPE_OPTIONS : FUEL_TYPE_OPTIONS
    ))
    const calculatedMachineAmount = computed(() => Number(form.totalAmount || 0))
    const actualPaidAmount = computed(() => Number(form.discountedAmount || 0))
    const calculatedActualUnitPrice = computed(() => {
      const volume = Number(form.fuelVolume || 0)
      return volume > 0 ? Number((actualPaidAmount.value / volume).toFixed(3)) : 0
    })
    const calculatedDiscountAmount = computed(() => Number(Math.max(
      0,
      calculatedMachineAmount.value - actualPaidAmount.value
    ).toFixed(2)))
    const energyFieldLabels = computed(() => {
      if (currentFormEnergyType.value === 'ELECTRIC') {
        return {
          time: '充电时间',
          volume: '充电量(kWh)',
          machineUnitPrice: '桩显单价(元/kWh)',
          totalAmount: '桩显金额',
          actualUnitPrice: '实付单价(元/kWh)',
          energyType: '充电类型',
          fillQuestion: '是否充满？',
          stationName: '充电站名称',
          stationPlaceholder: '例如：特来电滨江站',
          voucherTitle: '充电凭证',
          voucherHint: '最多 3 张，可上传充电订单、仪表盘或充电桩照片。',
          createTitle: '新增充电记录',
          editTitle: '编辑充电记录',
          saveText: '保存充电记录',
          updateText: '更新充电记录'
        }
      }
      return {
        time: '加油时间',
        volume: '加油量(L)',
        machineUnitPrice: '机显单价(元/L)',
        totalAmount: '机显金额',
        actualUnitPrice: '实付单价(元/L)',
          energyType: '燃油标号',
        fillQuestion: '是否加满？',
          stationName: '加油站',
        stationPlaceholder: '例如：中国石化滨江站',
        voucherTitle: '加油凭证',
        voucherHint: '最多 3 张，可上传小票、仪表盘或加油机照片。',
        createTitle: '新增加油记录',
        editTitle: '编辑加油记录',
        saveText: '保存加油记录',
        updateText: '更新加油记录'
      }
    })
    const consumptionSourceRecords = computed(() => {
      const merged = [...recentRecords.value, ...pagedRecords.value]
      const uniqueMap = new Map()
      merged.forEach((item) => {
        const normalized = normalizeRecord(item)
        if (normalized.fuelConsumption == null || Number(normalized.fuelConsumption) <= 0 || !normalized.vehicleName) {
          return
        }
        const key = normalized.id || `${normalized.vehicleName}-${normalized.fuelDate}-${normalized.odometerKm}`
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, normalized)
        }
      })
      return Array.from(uniqueMap.values()).sort((prev, next) => (
        `${next.fuelDate}-${next.odometerKm}`.localeCompare(`${prev.fuelDate}-${prev.odometerKm}`)
      ))
    })
    const consumptionVehicleOptions = computed(() => Array.from(new Set(
      consumptionSourceRecords.value.map((item) => item.vehicleName).filter(Boolean)
    )))
    const activeConsumptionVehicleName = computed(() => {
      if (selectedVehicleName.value && consumptionVehicleOptions.value.includes(selectedVehicleName.value)) {
        return selectedVehicleName.value
      }
      return consumptionVehicleOptions.value[0] || ''
    })
    const latestConsumptionRecord = computed(() => (
      consumptionSourceRecords.value.find((item) => item.vehicleName === activeConsumptionVehicleName.value) || null
    ))
    const activeVehicleStat = computed(() => (
      vehicleStats.value.find((item) => item.vehicleName === activeConsumptionVehicleName.value) || null
    ))
    const activeVehicleAverageConsumption = computed(() => (
      Number(activeVehicleStat.value?.averageConsumption ?? summary.averageConsumption ?? 0)
    ))
    const fuelPriceExtraItems = computed(() => ([
      {label: '下次调价时间', value: latestFuelPrices.nextAdjustTime || '待维护'},
      {label: '调价窗口', value: latestFuelPrices.adjustWindow || '待维护'},
      {label: '调价说明', value: latestFuelPrices.priceChangeHint || latestFuelPrices.remark || '暂无说明'}
    ]))
    const maxYearlyCost = computed(() => Math.max(1, ...yearlyCostReport.value.map((item) => Number(item.totalAmount || 0))))
    const activeMonthlyFuelReport = computed(() => monthlyFuelReport.value.filter((item) => (
      Number(item.fuelVolume || 0) > 0 || Number(item.totalAmount || 0) > 0
    )))
    const yearFuelVolume = computed(() => monthlyFuelReport.value.reduce(
      (sum, item) => sum + Number(item.fuelVolume || 0),
      0
    ))
    const yearPaidAmount = computed(() => monthlyFuelReport.value.reduce(
      (sum, item) => sum + Number(item.totalAmount || 0),
      0
    ))
    const activeFuelMonthCount = computed(() => activeMonthlyFuelReport.value.length)
    const averageMonthlyPaidAmount = computed(() => (
      activeFuelMonthCount.value
        ? yearPaidAmount.value / activeFuelMonthCount.value
        : 0
    ))
    const monthlyPeakVolume = computed(() => monthlyFuelReport.value.reduce(
      (peak, item, index) => {
        const value = Number(item.fuelVolume || 0)
        return value > peak.value ? {label: item.label, value, index} : peak
      },
      {label: '-', value: 0, index: -1}
    ))
    const monthlyPeakAmount = computed(() => monthlyFuelReport.value.reduce(
      (peak, item, index) => {
        const value = Number(item.totalAmount || 0)
        return value > peak.value ? {label: item.label, value, index} : peak
      },
      {label: '-', value: 0, index: -1}
    ))
    const monthlyVolumeBars = computed(() => {
      const maxValue = Math.max(1, monthlyPeakVolume.value.value)
      return monthlyFuelReport.value.map((item) => {
        const value = Number(item.fuelVolume || 0)
        return {
          label: item.label,
          value,
          height: value > 0 ? Math.max(8, Number(((value / maxValue) * 100).toFixed(2))) : 0
        }
      })
    })
    const monthlyAmountPoints = computed(() => {
      const chartWidth = 312
      const chartHeight = 120
      const offsetX = 26
      const offsetY = 34
      const maxValue = Math.max(1, ...monthlyFuelReport.value.map((item) => Number(item.totalAmount || 0)))
      return monthlyFuelReport.value.map((item, index) => {
        const x = offsetX + (chartWidth / Math.max(1, monthlyFuelReport.value.length - 1)) * index
        const y = offsetY + chartHeight - (Number(item.totalAmount || 0) / maxValue) * chartHeight
        return {
          label: item.label,
          value: Number(item.totalAmount || 0),
          index,
          x: Number(x.toFixed(2)),
          y: Number(y.toFixed(2))
        }
      })
    })
    const monthlyAmountPolyline = computed(() => monthlyAmountPoints.value.map((point) => `${point.x},${point.y}`).join(' '))
    const monthlyAmountAreaPath = computed(() => {
      if (!monthlyAmountPoints.value.length) {
        return ''
      }
      const baselineY = 154
      const [firstPoint] = monthlyAmountPoints.value
      const lastPoint = monthlyAmountPoints.value[monthlyAmountPoints.value.length - 1]
      const linePoints = monthlyAmountPoints.value.map((point) => `L ${point.x} ${point.y}`).join(' ')
      return `M ${firstPoint.x} ${baselineY} ${linePoints} L ${lastPoint.x} ${baselineY} Z`
    })
    const amountChartGridLines = [34, 74, 114, 154]

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
    const formatEnergyUnitPrice = (value) => `¥${Number(value || 0).toFixed(3)}${currentFormEnergyType.value === 'ELECTRIC' ? '/kWh' : '/L'}`
    const formatDateTime = (value) => value ? `${value}`.replace('T', ' ').slice(0, 16) : '-'
    const formatConsumption = (value) => value ? `${Number(value).toFixed(2)} L/100km` : '-'
    const formatFuelTypeText = (value) => (
      value === 'ELECTRIC'
        ? '交流 / 直流充电'
        : (fuelTypeOptions.find((item) => item.value === value)?.label || value || '-')
    )
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

    const applyLatestPrices = (payload = {}) => {
      latestFuelPrices.publishDate = payload.publishDate || payload.updateTime || ''
      latestFuelPrices.nextAdjustTime = payload.nextAdjustTime || payload.nextAdjustDate || ''
      latestFuelPrices.adjustWindow = payload.adjustWindow || payload.nextAdjustWindow || ''
      latestFuelPrices.priceChangeHint = payload.priceChangeHint || payload.priceTrend || payload.trend || ''
      latestFuelPrices.remark = payload.remark || payload.description || ''
      latestFuelPrices.prices['92'] = Number(payload.prices?.['92'] ?? payload.price92 ?? 0)
      latestFuelPrices.prices['95'] = Number(payload.prices?.['95'] ?? payload.price95 ?? 0)
      latestFuelPrices.prices['98'] = Number(payload.prices?.['98'] ?? payload.price98 ?? 0)
      latestFuelPrices.prices.DIESEL = Number(payload.prices?.DIESEL ?? payload.priceDiesel ?? 0)
    }

    const syncSelectedVehicle = () => {
      if (!consumptionVehicleOptions.value.length) {
        selectedVehicleName.value = ''
        return
      }
      if (!consumptionVehicleOptions.value.includes(selectedVehicleName.value)) {
        selectedVehicleName.value = consumptionVehicleOptions.value[0]
      }
    }

    const applyReports = (payload = {}) => {
      if (Array.isArray(payload.currentYearMonthlyFuel) && payload.currentYearMonthlyFuel.length) {
        monthlyFuelReport.value = payload.currentYearMonthlyFuel.map((item) => ({
          label: item.label || item.month || '',
          fuelVolume: Number(item.fuelVolume ?? item.totalFuelVolume ?? 0),
          totalAmount: Number(item.totalAmount ?? item.discountedAmount ?? item.actualAmount ?? 0)
        }))
      } else {
        monthlyFuelReport.value = []
      }

      if (Array.isArray(payload.yearlyCostStats) && payload.yearlyCostStats.length) {
        yearlyCostReport.value = payload.yearlyCostStats.map((item) => ({
          label: item.label || item.year || '',
          totalAmount: Number(item.totalAmount ?? item.discountedAmount ?? item.actualAmount ?? 0),
          totalFuelVolume: Number(item.totalFuelVolume ?? 0)
        }))
      } else {
        yearlyCostReport.value = []
      }
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
        const normalizedList = rawList.map((item) => normalizeRecord(item))
        pagedRecords.value = normalizedList
        total.value = Number(payload.total ?? payload.count ?? normalizedList.length ?? 0)

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
          syncSelectedVehicle()
        } catch (error) {
          vehicleStats.value = buildVehicleStats(normalizedList)
          recentRecords.value = buildRecentRecords(normalizedList)
          syncSelectedVehicle()
        }

        try {
          const priceRes = await getLatestFuelPrices()
          applyLatestPrices(unwrapData(priceRes) || {})
        } catch (error) {
          applyLatestPrices()
        }

        try {
          const reportRes = await getFuelReports()
          applyReports(unwrapData(reportRes) || {})
        } catch (error) {
          applyReports({})
        }
      } catch (error) {
        pagedRecords.value = []
        total.value = 0
        vehicleStats.value = []
        recentRecords.value = []
        monthlyFuelReport.value = []
        yearlyCostReport.value = []
        latestFuelPrices.publishDate = ''
        latestFuelPrices.nextAdjustTime = ''
        latestFuelPrices.adjustWindow = ''
        latestFuelPrices.priceChangeHint = ''
        latestFuelPrices.remark = ''
        latestFuelPrices.prices['92'] = 0
        latestFuelPrices.prices['95'] = 0
        latestFuelPrices.prices['98'] = 0
        latestFuelPrices.prices.DIESEL = 0
        summary.totalAmount = 0
        summary.totalDiscountAmount = 0
        summary.totalFuelVolume = 0
        summary.averageUnitPrice = 0
        summary.averageConsumption = 0
        summary.currentMonthAmount = 0
        alert(error?.response?.data?.message || '加载油耗统计数据失败')
      } finally {
        loading.value = false
      }
    }

    const loadFuelVehicles = async () => {
      try {
        const response = await listFuelVehicles()
        const payload = unwrapData(response) || []
        const list = Array.isArray(payload) ? payload : (payload.list || payload.records || [])
        fuelVehicles.value = list.map((item) => normalizeFuelVehicle(item))
      } catch (error) {
        // 车辆接口不可用时仍保留历史记录推导出的兼容选项，避免阻断旧数据编辑。
        fuelVehicles.value = []
      }
    }

    // 机显单价和机显金额均可录入，始终以用户最后编辑的字段反算另一个字段。
    const machineAmountSource = ref('UNIT_PRICE')
    const syncMachineAmountFromUnitPrice = () => {
      machineAmountSource.value = 'UNIT_PRICE'
      form.totalAmount = Number(Math.max(
        0,
        Number(form.machineUnitPrice || 0) * Number(form.fuelVolume || 0)
      ).toFixed(2))
    }
    const syncMachineUnitPriceFromAmount = () => {
      machineAmountSource.value = 'TOTAL_AMOUNT'
      const volume = Number(form.fuelVolume || 0)
      if (volume > 0) {
        form.machineUnitPrice = Number((Number(form.totalAmount || 0) / volume).toFixed(3))
      }
    }
    const handleFuelVolumeInput = () => {
      if (machineAmountSource.value === 'TOTAL_AMOUNT') {
        syncMachineUnitPriceFromAmount()
        return
      }
      syncMachineAmountFromUnitPrice()
    }

    const resetForm = () => {
      const defaultVehicle = fuelVehicles.value.find((item) => item.defaultVehicle) || vehicleOptions.value[0]
      form.vehicleName = defaultVehicle?.vehicleName || ''
      form.fuelTime = formatDateTimeInput()
      form.odometerKm = 0
      form.fuelVolume = 0
      form.machineUnitPrice = 0
      form.totalAmount = 0
      form.discountedAmount = 0
      form.fuelType = '95'
      form.fillType = 'FULL'
      form.fuelWarningLight = false
      form.lastRecordKnown = true
      form.stationName = ''
      form.note = ''
      form.attachments = []
      handleFormVehicleChange()
    }

    const fillForm = (record) => {
      form.vehicleName = record.vehicleName || ''
      form.fuelTime = formatDateTimeInput(record.fuelTime || record.fuelDate)
      form.odometerKm = Number(record.odometerKm || 0)
      form.fuelVolume = Number(record.fuelVolume || 0)
      form.machineUnitPrice = Number(record.machineUnitPrice || 0)
      form.totalAmount = Number(record.totalAmount || 0)
      form.discountedAmount = Number(record.discountedAmount || 0)
      form.fuelType = record.fuelType || '95'
      form.fillType = record.fillType || 'FULL'
      form.fuelWarningLight = Boolean(record.fuelWarningLight)
      form.lastRecordKnown = record.lastRecordKnown !== false
      form.stationName = record.stationName || ''
      form.note = record.note || ''
      form.attachments = [...(record.attachments || [])]
      machineAmountSource.value = 'UNIT_PRICE'
    }

    const openCreateDialog = () => {
      dialogMode.value = 'create'
      editingId.value = ''
      resetForm()
      showDialog.value = true
    }

    const openEditDialog = (item) => {
      showDetailDialog.value = false
      dialogMode.value = 'edit'
      editingId.value = item.id
      fillForm(item)
      showDialog.value = true
    }

    const openDetailDialog = (item) => {
      detailRecord.value = item
      showDetailDialog.value = true
    }

    const closeDetailDialog = () => {
      showDetailDialog.value = false
      detailRecord.value = null
    }

    const closeDialog = () => {
      if (submitting.value) {
        return
      }
      showDialog.value = false
      resetForm()
    }

    const handleFormVehicleChange = () => {
      const vehicle = vehicleOptions.value.find((item) => item.vehicleName === form.vehicleName)
      if (!vehicle) {
        return
      }
      form.fuelType = vehicle.defaultFuelType || (vehicle.energyType === 'ELECTRIC' ? 'ELECTRIC' : '95')
      const price = Number(latestFuelPrices.prices[form.fuelType] || 0)
      form.machineUnitPrice = price
      syncMachineAmountFromUnitPrice()
      if (!formFillTypeOptions.value.some((item) => item.value === form.fillType)) {
        form.fillType = 'FULL'
      }
    }

    const resetVehicleForm = () => {
      vehicleDialogMode.value = 'create'
      editingVehicleId.value = ''
      vehicleForm.vehicleName = ''
      vehicleForm.energyType = 'FUEL'
      vehicleForm.defaultFuelType = '95'
      vehicleForm.defaultVehicle = fuelVehicles.value.length === 0
    }

    const openVehicleDialog = async () => {
      await loadFuelVehicles()
      resetVehicleForm()
      showVehicleDialog.value = true
    }

    const closeVehicleDialog = () => {
      if (vehicleSubmitting.value) {
        return
      }
      showVehicleDialog.value = false
      resetVehicleForm()
    }

    const handleVehicleEnergyTypeChange = () => {
      vehicleForm.defaultFuelType = vehicleForm.energyType === 'ELECTRIC' ? 'ELECTRIC' : '95'
    }

    const openVehicleEdit = (vehicle) => {
      vehicleDialogMode.value = 'edit'
      editingVehicleId.value = vehicle.id
      vehicleForm.vehicleName = vehicle.vehicleName
      vehicleForm.energyType = vehicle.energyType
      vehicleForm.defaultFuelType = vehicle.defaultFuelType
      vehicleForm.defaultVehicle = vehicle.defaultVehicle
    }

    const buildVehiclePayload = () => ({
      vehicleName: vehicleForm.vehicleName,
      energyType: vehicleForm.energyType,
      defaultFuelType: vehicleForm.defaultFuelType,
      defaultVehicle: vehicleForm.defaultVehicle
    })

    const submitVehicle = async () => {
      if (!vehicleForm.vehicleName) {
        alert('请输入车辆名称')
        return
      }
      if (vehicleSubmitting.value) {
        return
      }
      vehicleSubmitting.value = true
      try {
        if (vehicleDialogMode.value === 'create') {
          await createFuelVehicle(buildVehiclePayload())
        } else {
          await updateFuelVehicle(editingVehicleId.value, buildVehiclePayload())
        }
        await loadFuelVehicles()
        resetVehicleForm()
      } catch (error) {
        alert(error?.response?.data?.message || '保存车辆失败')
      } finally {
        vehicleSubmitting.value = false
      }
    }

    const removeVehicle = async (vehicle) => {
      if (!await confirmDialog(`删除“${vehicle.vehicleName}”后不能再从车辆列表选择它。`, {
        title: '删除车辆？',
        confirmText: '删除车辆'
      })) {
        return
      }
      try {
        await deleteFuelVehicle(vehicle.id)
        await loadFuelVehicles()
        if (editingVehicleId.value === vehicle.id) {
          resetVehicleForm()
        }
      } catch (error) {
        alert(error?.response?.data?.message || '删除车辆失败')
      }
    }

    const buildFormPayload = () => {
      const fuelVolume = Number(form.fuelVolume || 0)
      return {
        vehicleName: form.vehicleName,
        fuelTime: form.fuelTime,
        odometerKm: Number(form.odometerKm || 0),
        fuelVolume,
        machineUnitPrice: Number(form.machineUnitPrice || 0),
        totalAmount: calculatedMachineAmount.value,
        discountAmount: calculatedDiscountAmount.value,
        discountedAmount: actualPaidAmount.value,
        unitPrice: calculatedActualUnitPrice.value,
        fuelType: form.fuelType,
        fillType: form.fillType,
        fuelWarningLight: form.fuelWarningLight,
        lastRecordKnown: form.lastRecordKnown,
        stationName: form.stationName,
        note: form.note,
        attachmentIds: form.attachments.map((item) => item.id)
      }
    }

    const submitDialog = async () => {
      if (!form.vehicleName) {
        alert('请输入车辆名称')
        return
      }
      if (!form.fuelTime) {
        alert(`请选择${energyFieldLabels.value.time}`)
        return
      }
      if (!form.odometerKm) {
        alert('请输入当前里程')
        return
      }
      if (!form.fuelVolume) {
        alert(`请输入${energyFieldLabels.value.volume}`)
        return
      }
      if (!form.machineUnitPrice) {
        alert(`请输入${energyFieldLabels.value.machineUnitPrice}`)
        return
      }
      if (!calculatedMachineAmount.value) {
        alert(`请输入${energyFieldLabels.value.totalAmount}`)
        return
      }
      if (form.discountedAmount === '' || form.discountedAmount === null || Number(form.discountedAmount) < 0) {
        alert('请输入实付金额')
        return
      }
      if (actualPaidAmount.value > calculatedMachineAmount.value) {
        alert('实付金额不能大于机显金额')
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
        alert(error?.response?.data?.message || '保存加油记录失败')
      } finally {
        submitting.value = false
      }
    }

    const removeRecord = async (item) => {
      if (!await confirmDialog(`【${item.vehicleName} / ${item.fuelDate}】这条加油记录将被永久删除。`, {
        title: '删除加油记录？',
        confirmText: '删除记录'
      })) {
        return
      }
      try {
        await deleteFuelRecord(item.id)
        await loadRecords()
      } catch (error) {
        alert(error?.response?.data?.message || '删除加油记录失败')
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

    const switchConsumptionVehicle = (vehicleName) => {
      selectedVehicleName.value = vehicleName
    }

    const getBarWidth = (value, maxValue) => {
      if (!value || !maxValue) {
        return 0
      }
      return Math.max(6, (Number(value) / Number(maxValue)) * 100)
    }

    onMounted(() => {
      loadFuelVehicles()
      loadRecords()
    })

    return {
      loading,
      submitting,
      total,
      pagedRecords,
      summary,
      vehicleStats,
      recentRecords,
      monthlyFuelReport,
      yearlyCostReport,
      fuelVehicles,
      latestFuelPrices,
      latestConsumptionRecord,
      consumptionVehicleOptions,
      activeConsumptionVehicleName,
      activeVehicleAverageConsumption,
      fuelPriceExtraItems,
      query,
      form,
      vehicleForm,
      showDialog,
      showDetailDialog,
      showVehicleDialog,
      dialogMode,
      vehicleDialogMode,
      detailRecord,
      vehicleSubmitting,
      pageSizeOptions,
      fuelTypeOptions,
      fillTypeOptions,
      vehicleEnergyTypeOptions,
      currentYearLabel,
      fuelPriceCards,
      vehicleOptions,
      formFuelTypeOptions,
      formFillTypeOptions,
      vehicleDefaultFuelTypeOptions,
      calculatedMachineAmount,
      calculatedActualUnitPrice,
      calculatedDiscountAmount,
      syncMachineAmountFromUnitPrice,
      syncMachineUnitPriceFromAmount,
      handleFuelVolumeInput,
      energyFieldLabels,
      totalPages,
      maxYearlyCost,
      yearFuelVolume,
      yearPaidAmount,
      activeFuelMonthCount,
      averageMonthlyPaidAmount,
      monthlyPeakVolume,
      monthlyPeakAmount,
      monthlyVolumeBars,
      monthlyAmountPoints,
      monthlyAmountPolyline,
      monthlyAmountAreaPath,
      amountChartGridLines,
      consumptionClassMap,
      formatNumber,
      formatCurrency,
      formatUnitPrice,
      formatEnergyUnitPrice,
      formatDateTime,
      formatConsumption,
      formatFuelTypeText,
      formatFillTypeText,
      formatVehicleEnergyText: (value) => value === 'ELECTRIC' ? '新能源' : '燃油车',
      getConsumptionLevel,
      getBarWidth,
      switchConsumptionVehicle,
      changePage,
      handlePageSizeChange,
      openCreateDialog,
      openVehicleDialog,
      openDetailDialog,
      openEditDialog,
      closeDetailDialog,
      closeDialog,
      submitDialog,
      closeVehicleDialog,
      resetVehicleForm,
      handleVehicleEnergyTypeChange,
      openVehicleEdit,
      submitVehicle,
      removeVehicle,
      handleFormVehicleChange,
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
  height: 100%;
  padding: 18px 22px 26px;
  color: var(--theme-text);
  overflow: auto;
}

.page-nav {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-bottom: 12px;
}

.nav-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--theme-border);
  color: var(--theme-text-soft);
  cursor: pointer;
  background: var(--theme-control-surface);
  box-shadow: var(--theme-shadow-xs);
  backdrop-filter: blur(18px) saturate(160%);
  -webkit-backdrop-filter: blur(18px) saturate(160%);
  transition: transform 100ms ease-out, background 180ms ease, border-color 180ms ease;
}

.back-home-btn {
  gap: 10px;
  min-height: 42px;
  padding: 0 16px 0 12px;
  border-radius: 999px;
}

.back-home-btn:hover {
  transform: translateY(-1px);
  background: var(--theme-surface-hover);
  border-color: var(--theme-border-strong);
}

.back-home-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  font-size: 28px;
  font-weight: 500;
  line-height: 1;
  background: var(--theme-surface-muted);
}

.mobile-nav-title,
.mobile-nav-add,
.mobile-action-dock {
  display: none;
}

.nav-icon-btn:active,
.headline-switch-btn:active,
.action-btn:active,
.ghost-btn:active,
.mini-btn:active,
.mobile-record-card:active {
  transform: scale(0.97);
  transition-duration: 100ms;
}

.hero-panel,
.headline-panel,
.price-panel,
.list-panel,
.insight-panel,
.report-panel {
  border: 1px solid var(--theme-border);
  background: var(--theme-surface);
  box-shadow: var(--theme-shadow-sm);
  backdrop-filter: blur(16px);
}

.hero-panel,
.headline-panel,
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
.headline-panel,
.price-panel {
  margin-bottom: 14px;
}

.headline-panel {
  padding: 0;
  overflow: hidden;
}

.headline-card {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(260px, 0.8fr);
  gap: 0;
  color: var(--theme-on-accent);
  background:
    radial-gradient(circle at top right, rgba(96, 192, 255, 0.22), transparent 28%),
    linear-gradient(135deg, rgba(8, 29, 48, 0.96), rgba(14, 58, 87, 0.88));
}

.headline-copy,
.headline-stats {
  padding: 18px 20px;
}

.headline-copy {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
}

.headline-topline {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.headline-label {
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(175, 224, 255, 0.8);
}

.headline-switches {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  max-width: 100%;
}

.headline-switch-btn {
  min-height: 30px;
  padding: 0 12px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
  cursor: pointer;
  transition: background 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
  touch-action: manipulation;
}

.headline-switch-btn:hover {
  transform: translateY(-1px);
  border-color: rgba(123, 211, 255, 0.42);
}

.headline-switch-btn.active {
  border-color: rgba(123, 211, 255, 0.48);
  background: linear-gradient(135deg, rgba(20, 150, 255, 0.26), rgba(39, 213, 164, 0.26));
  color: #f4fbff;
}

.headline-value {
  font-size: clamp(30px, 4vw, 44px);
  line-height: 1;
  letter-spacing: -0.04em;
}

.headline-meta {
  margin: 0;
  color: rgba(255, 255, 255, 0.76);
  line-height: 1.6;
}

.headline-stats {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
}

.headline-stat {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.06);
}

.headline-stat span {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.68);
}

.headline-stat strong {
  font-size: 20px;
  line-height: 1.2;
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
  color: var(--theme-text-muted);
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
  background: var(--theme-accent-soft);
  color: var(--theme-link);
}

.price-date {
  font-size: 12px;
  color: var(--theme-text-muted);
}

.price-layout,
.price-grid,
.report-grid {
  display: grid;
  gap: 12px;
}

.price-layout {
  grid-template-columns: minmax(250px, 0.7fr) minmax(0, 1.5fr);
  align-items: stretch;
}

.price-info {
  min-width: 0;
}

.price-grid {
  margin-top: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.price-extra-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  margin-top: 10px;
}

.report-grid {
  grid-template-columns: 1fr;
}

.price-card,
.report-card {
  border-radius: 16px;
  border: 1px solid var(--theme-border);
  background: var(--theme-surface-muted);
}

.price-card {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.price-card strong {
  font-size: 16px;
  line-height: 1.15;
}

.price-card span {
  font-size: 12px;
  color: var(--theme-text-muted);
}

.price-extra-item {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid var(--theme-border);
  background: var(--theme-surface-muted);
}

.price-extra-item span {
  font-size: 12px;
  color: var(--theme-text-muted);
}

.price-extra-item strong {
  line-height: 1.45;
  font-size: 14px;
  color: var(--theme-text);
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
  color: var(--theme-text-muted);
}

.form-field span i,
.record-status-field > span i {
  color: #ff5b61;
  font-style: normal;
}

.form-link-btn {
  align-self: flex-start;
  padding: 0;
  border: 0;
  color: var(--theme-link);
  background: transparent;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.input {
  width: 100%;
  min-height: 40px;
  padding: 9px 12px;
  border: 1px solid var(--theme-border-strong);
  border-radius: 12px;
  background: var(--theme-field-surface);
  color: var(--theme-text);
  outline: none;
}

.input::placeholder {
  color: var(--theme-text-muted);
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
  color: var(--theme-text-soft);
  cursor: pointer;
}

.action-btn,
.ghost-btn {
  min-height: 38px;
  padding: 0 14px;
}

.action-btn {
  background: linear-gradient(135deg, #1996ff, #27d5a4);
  color: var(--theme-on-accent);
}

.ghost-btn {
  background: var(--theme-control-surface);
}

.mini-btn {
  min-height: 30px;
  padding: 0 10px;
  background: var(--theme-control-surface);
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
  min-width: 820px;
  border-collapse: collapse;
}

.record-table th,
.record-table td {
  padding: 10px 8px;
  text-align: left;
  border-bottom: 1px solid var(--theme-table-divider);
  font-size: 13px;
  white-space: nowrap;
}

.record-table td:nth-child(6) {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.record-table th {
  color: var(--theme-table-head-text);
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
  border: 1px solid var(--theme-border);
  background: var(--theme-surface-muted);
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
  background: var(--theme-control-surface);
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
  background: var(--theme-control-surface);
  color: var(--theme-text-soft);
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
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 18px;
  overflow: hidden;
  border-color: color-mix(in srgb, var(--theme-border-strong) 72%, transparent);
  background:
    radial-gradient(circle at 12% 0%, rgba(48, 214, 192, 0.1), transparent 34%),
    radial-gradient(circle at 92% 8%, rgba(255, 159, 10, 0.1), transparent 30%),
    color-mix(in srgb, var(--theme-surface-muted) 92%, transparent);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--theme-highlight-soft) 80%, transparent),
    0 16px 40px color-mix(in srgb, var(--theme-scrim) 16%, transparent);
}

.trend-card-head {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
}

.trend-eyebrow {
  display: block;
  margin-bottom: 5px;
  color: #30d6c0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.trend-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(92px, 1fr));
  gap: 8px;
  min-width: min(100%, 360px);
}

.trend-summary > div {
  display: grid;
  gap: 3px;
  padding: 9px 11px;
  border: 1px solid color-mix(in srgb, var(--theme-border) 76%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--theme-control-surface) 76%, transparent);
  backdrop-filter: blur(16px) saturate(140%);
  -webkit-backdrop-filter: blur(16px) saturate(140%);
}

.trend-summary span {
  color: var(--theme-text-muted);
  font-size: 10px;
}

.trend-summary strong {
  color: var(--theme-text);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}

.analytics-chart-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.analytics-chart-card {
  min-width: 0;
  padding: 14px;
  border: 1px solid color-mix(in srgb, var(--theme-border) 80%, transparent);
  border-radius: 18px;
  background: color-mix(in srgb, var(--theme-surface) 74%, transparent);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--theme-highlight-soft) 72%, transparent);
  backdrop-filter: blur(22px) saturate(145%);
  -webkit-backdrop-filter: blur(22px) saturate(145%);
}

.analytics-chart-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.analytics-chart-head h3 {
  margin: 5px 0 0;
  color: var(--theme-text);
  font-size: 15px;
  line-height: 1.2;
  letter-spacing: -0.015em;
}

.chart-kicker {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--theme-text-muted);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.chart-kicker::before {
  width: 14px;
  height: 3px;
  border-radius: 999px;
  content: "";
}

.chart-kicker.fuel::before {
  background: #30d6c0;
  box-shadow: 0 0 12px rgba(48, 214, 192, 0.46);
}

.chart-kicker.amount::before {
  background: #ff9f0a;
  box-shadow: 0 0 12px rgba(255, 159, 10, 0.42);
}

.chart-peak {
  display: grid;
  justify-items: end;
  gap: 2px;
  text-align: right;
}

.chart-peak span {
  color: var(--theme-text-muted);
  font-size: 10px;
}

.chart-peak strong {
  color: var(--theme-text);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.volume-chart {
  position: relative;
  height: 218px;
  margin-top: 12px;
  padding-top: 10px;
}

.volume-chart-guides {
  position: absolute;
  inset: 34px 0 28px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  pointer-events: none;
}

.volume-chart-guides i {
  width: 100%;
  border-top: 1px dashed color-mix(in srgb, var(--theme-chart-grid) 78%, transparent);
}

.volume-bars {
  position: absolute;
  z-index: 1;
  inset: 10px 0 0;
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  align-items: stretch;
  gap: clamp(3px, 0.8vw, 8px);
}

.volume-bar-item {
  display: grid;
  grid-template-rows: 24px minmax(0, 1fr) 24px;
  align-items: end;
  min-width: 0;
  padding: 0;
  border: 0;
  outline: none;
  color: inherit;
  background: transparent;
  cursor: pointer;
  touch-action: manipulation;
  transition: transform 100ms ease-out;
}

.volume-bar-item:active {
  transform: scale(0.97);
}

.volume-bar-item:focus-visible {
  border-radius: 8px;
  outline: 2px solid var(--theme-focus-ring);
  outline-offset: 2px;
}

.volume-bar-value,
.volume-bar-month {
  overflow: hidden;
  color: var(--theme-text-muted);
  font-size: 9px;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  text-align: center;
  text-overflow: clip;
  white-space: nowrap;
}

.volume-bar-value {
  align-self: start;
  opacity: 0;
  transform: translateY(3px);
  transition: opacity 140ms ease-out, transform 180ms ease-out;
}

.volume-bar-item:hover .volume-bar-value,
.volume-bar-item:focus-visible .volume-bar-value {
  opacity: 1;
  transform: translateY(0);
}

.volume-bar-track {
  position: relative;
  align-self: stretch;
  justify-self: center;
  width: clamp(8px, 48%, 22px);
  overflow: hidden;
  border-radius: 8px 8px 4px 4px;
  background: color-mix(in srgb, var(--theme-control-surface) 84%, transparent);
}

.volume-bar-track > i {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  border-radius: inherit;
  background: linear-gradient(180deg, #65ead8 0%, #30d6c0 48%, #0a8f83 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.38),
    0 0 16px rgba(48, 214, 192, 0.22);
  transition: height 420ms cubic-bezier(0.2, 0.82, 0.2, 1), filter 160ms ease-out;
}

.volume-bar-item:hover .volume-bar-track > i,
.volume-bar-item:focus-visible .volume-bar-track > i {
  filter: brightness(1.14);
}

.volume-bar-item.empty {
  opacity: 0.46;
}

.volume-bar-item.empty .volume-bar-track::after {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 2px;
  border-radius: 999px;
  background: var(--theme-text-muted);
  content: "";
}

.volume-bar-month {
  align-self: end;
  padding-top: 8px;
}

.amount-area-chart {
  position: relative;
  margin-top: 10px;
}

.amount-area-svg {
  display: block;
  width: 100%;
  height: 190px;
  overflow: visible;
}

.amount-chart-grid-line {
  stroke: color-mix(in srgb, var(--theme-chart-grid) 82%, transparent);
  stroke-width: 1;
  stroke-dasharray: 3 5;
  vector-effect: non-scaling-stroke;
}

.amount-chart-area {
  fill: url(#fuel-spend-area);
}

.amount-chart-line {
  fill: none;
  stroke: #ff9f0a;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
  filter: drop-shadow(0 5px 8px rgba(255, 159, 10, 0.18));
}

.amount-chart-point {
  color: #ffb340;
  transition: opacity 140ms ease-out;
}

.amount-chart-point-halo {
  fill: currentColor;
  opacity: 0.12;
  transition: opacity 140ms ease-out;
}

.amount-chart-point-core {
  fill: currentColor;
  stroke: var(--theme-chart-point-stroke);
  stroke-width: 1.5;
  vector-effect: non-scaling-stroke;
}

.amount-chart-point:hover .amount-chart-point-halo,
.amount-chart-point.peak .amount-chart-point-halo {
  opacity: 0.34;
}

.amount-chart-point.empty {
  color: var(--theme-text-muted);
  opacity: 0.42;
}

.amount-chart-months {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  margin: -13px 0 0;
}

.amount-chart-months span {
  overflow: hidden;
  color: var(--theme-text-muted);
  font-size: 9px;
  line-height: 1;
  text-align: center;
  white-space: nowrap;
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
  color: var(--theme-chart-axis);
}

.bar-track {
  position: relative;
  height: 12px;
  border-radius: 999px;
  background: var(--theme-chart-grid);
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
  color: var(--theme-text-muted);
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
  color: var(--theme-text);
  background: var(--theme-control-surface);
}

.pager-select option {
  color: var(--theme-text);
}

.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.energy-calculation-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--theme-border);
  border-radius: 16px;
  background: color-mix(in srgb, var(--theme-surface-muted) 84%, transparent);
}

.calculation-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 22px minmax(0, 1fr) 22px minmax(0, 1fr);
  align-items: end;
  gap: 8px;
}

.calculation-row.secondary {
  padding-top: 12px;
  border-top: 1px solid var(--theme-table-divider);
}

.calculation-operator {
  align-self: end;
  padding-bottom: 10px;
  color: var(--theme-text-muted);
  font-size: 20px;
  text-align: center;
}

.calculation-input {
  font-variant-numeric: tabular-nums;
}

.calculation-result {
  min-height: 40px;
}

.calculation-result strong {
  display: flex;
  align-items: center;
  min-height: 40px;
  padding: 0 12px;
  border-radius: 12px;
  color: var(--theme-text);
  background: var(--theme-field-surface);
  font-size: 17px;
  font-variant-numeric: tabular-nums;
}

.calculation-result.emphasis strong {
  color: #54e3b1;
}

.record-status-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.record-status-grid-single {
  grid-template-columns: minmax(0, 1fr);
}

.record-status-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.record-status-field > span {
  color: var(--theme-text-muted);
  font-size: 12px;
}

.segmented-control {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

.segmented-control button {
  min-height: 40px;
  padding: 0 8px;
  border: 1px solid var(--theme-border-strong);
  border-radius: 11px;
  color: var(--theme-text-muted);
  background: var(--theme-control-surface);
  cursor: pointer;
  transition: transform 100ms ease-out, color 180ms ease, background 180ms ease, border-color 180ms ease;
}

.segmented-control button.active {
  border-color: rgba(39, 213, 164, 0.42);
  color: var(--theme-on-accent);
  background: linear-gradient(135deg, #1996ff, #27d5a4);
}

.segmented-control button:active {
  transform: scale(0.97);
}

.vehicle-dialog {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.vehicle-form {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(150px, 0.7fr) minmax(150px, 0.85fr);
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--theme-border);
  border-radius: 16px;
  background: var(--theme-surface-muted);
}

.vehicle-default-option {
  grid-column: 1 / -1;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 28px;
  color: var(--theme-text-soft);
  font-size: 13px;
  cursor: pointer;
}

.vehicle-default-option input {
  width: 16px;
  height: 16px;
  accent-color: var(--theme-link);
}

.vehicle-list-head,
.vehicle-item,
.vehicle-item-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.vehicle-list-head {
  justify-content: space-between;
}

.vehicle-list-head h4 {
  margin: 0;
  font-size: 15px;
}

.vehicle-list-head span {
  color: var(--theme-text-muted);
  font-size: 13px;
}

.vehicle-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.vehicle-item {
  min-height: 70px;
  padding: 12px 14px;
  border: 1px solid var(--theme-border);
  border-radius: 14px;
  background: var(--theme-surface-muted);
}

.vehicle-item-main {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 4px;
}

.vehicle-item-main strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vehicle-item-main span {
  color: var(--theme-text-muted);
  font-size: 12px;
}

.default-vehicle-chip {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  color: var(--theme-link);
  background: var(--theme-accent-soft);
  font-size: 11px;
  font-weight: 600;
}

.dialog-actions {
  justify-content: flex-end;
  flex-wrap: wrap;
}

.detail-dialog-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.detail-grid p {
  margin: 0;
  padding: 12px 14px;
  border-radius: 14px;
  background: var(--theme-surface-muted);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-grid span {
  font-size: 12px;
  color: var(--theme-text-muted);
}

.detail-grid strong {
  line-height: 1.5;
  word-break: break-word;
}

.detail-grid .wide {
  grid-column: 1 / -1;
}

.mobile-detail-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 40px;
  padding: 0;
  border: 0;
  color: var(--theme-link);
  background: transparent;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.mobile-detail-hint > span {
  font-size: 22px;
  line-height: 1;
}

.mobile-secondary-actions {
  display: flex;
  gap: 8px;
}

@media (max-width: 1100px) {
  .headline-card,
  .price-layout,
  .fuel-layout {
    grid-template-columns: 1fr;
  }

  .headline-stats {
    border-left: none;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 860px) {
  .price-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .analytics-chart-grid {
    grid-template-columns: 1fr;
  }

  .detail-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .fuel-page {
    padding: 0 12px calc(112px + env(safe-area-inset-bottom));
    scroll-padding-top: calc(68px + env(safe-area-inset-top));
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", sans-serif;
    font-optical-sizing: auto;
  }

  .page-nav {
    position: sticky;
    z-index: 20;
    top: 0;
    min-height: calc(56px + env(safe-area-inset-top));
    margin: 0 -12px 10px;
    padding: env(safe-area-inset-top) 12px 0;
    justify-content: space-between;
    background: color-mix(in srgb, var(--theme-surface) 72%, transparent);
    backdrop-filter: blur(22px) saturate(180%);
    -webkit-backdrop-filter: blur(22px) saturate(180%);
  }

  .page-nav::after {
    position: absolute;
    right: 0;
    bottom: -12px;
    left: 0;
    height: 12px;
    content: "";
    pointer-events: none;
    background: linear-gradient(to bottom, color-mix(in srgb, var(--theme-surface) 22%, transparent), transparent);
  }

  .back-home-btn,
  .mobile-nav-add {
    display: inline-flex;
    width: 44px;
    height: 44px;
    min-height: 44px;
    padding: 0;
    border-color: transparent;
    border-radius: 50%;
    box-shadow: none;
  }

  .back-home-text {
    display: none;
  }

  .back-home-icon {
    width: auto;
    height: auto;
    background: transparent;
  }

  .mobile-nav-title {
    display: block;
    font-size: 17px;
    font-weight: 650;
    letter-spacing: -0.01em;
  }

  .mobile-nav-add {
    font-size: 24px;
    color: var(--theme-link);
  }

  .hero-panel,
  .headline-card,
  .price-panel,
  .toolbar,
  .pager,
  .dialog-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .hero-panel {
    gap: 12px;
    padding: 2px 0 6px;
    border: 0;
    background: transparent;
    box-shadow: none;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

  .hero-panel > div:first-child {
    display: none;
  }

  .hero-tags {
    flex-wrap: nowrap;
    margin: 0 -2px;
    padding: 2px;
    overflow-x: auto;
    scroll-snap-type: x proximity;
    scrollbar-width: none;
  }

  .hero-tags::-webkit-scrollbar,
  .headline-switches::-webkit-scrollbar {
    display: none;
  }

  .hero-tag {
    flex: 0 0 auto;
    min-height: 32px;
    scroll-snap-align: start;
  }

  .headline-card {
    display: block;
  }

  .headline-copy {
    min-height: 184px;
    justify-content: flex-end;
  }

  .headline-label {
    font-size: 11px;
  }

  .headline-switches {
    width: 100%;
    padding-bottom: 2px;
    flex-wrap: nowrap;
    justify-content: flex-start;
    overflow-x: auto;
    scroll-snap-type: x proximity;
    scrollbar-width: none;
  }

  .headline-switch-btn {
    flex: 0 0 auto;
    min-height: 36px;
    scroll-snap-align: start;
  }

  .headline-value {
    font-size: clamp(38px, 12vw, 54px);
    letter-spacing: -0.055em;
  }

  .headline-meta {
    font-size: 13px;
  }

  .headline-stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    padding-top: 12px;
    padding-bottom: 12px;
  }

  .headline-stat {
    min-width: 0;
    padding: 10px;
  }

  .headline-stat strong {
    overflow: hidden;
    font-size: clamp(14px, 4vw, 18px);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .toolbar-left,
  .toolbar-right,
  .pager-left,
  .pager-right {
    width: 100%;
  }

  .toolbar-left {
    display: none;
  }

  .toolbar {
    padding: 0;
    margin-top: 10px;
    background: transparent;
  }

  .toolbar-right {
    justify-content: flex-end;
    color: var(--theme-text-muted);
    font-size: 13px;
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

  .mobile-record-card {
    padding: 16px;
    border-radius: 20px;
    box-shadow: var(--theme-shadow-xs);
  }

  .mobile-record-grid {
    gap: 8px;
  }

  .mobile-record-grid p {
    min-height: 64px;
  }

  .mobile-card-actions {
    min-height: 52px;
    margin-top: 12px;
    padding-top: 10px;
    justify-content: space-between;
    border-top: 1px solid var(--theme-table-divider);
  }

  .mobile-secondary-actions .mini-btn {
    min-width: 54px;
    min-height: 40px;
  }

  .mobile-secondary-actions .mini-btn.danger {
    color: #ff6b6b;
    background: transparent;
  }

  .price-panel,
  .list-panel,
  .insight-panel,
  .report-panel {
    box-shadow: var(--theme-shadow-xs);
  }

  .panel-title {
    font-size: 19px;
    letter-spacing: -0.015em;
  }

  .panel-tip {
    font-size: 13px;
    line-height: 1.55;
  }

  .line-chart {
    overflow: hidden;
  }

  .trend-card-head {
    align-items: stretch;
    flex-direction: column;
    gap: 14px;
  }

  .trend-summary {
    width: 100%;
    min-width: 0;
  }

  .analytics-chart-card {
    padding: 13px;
    border-radius: 16px;
  }

  .volume-chart {
    height: 208px;
  }

  .amount-area-svg {
    height: 184px;
  }

  .summary-card {
    min-height: 92px;
  }

  .summary-card strong {
    font-size: clamp(18px, 6vw, 24px);
    letter-spacing: -0.025em;
  }

  .summary-grid,
  .form-inline-grid,
  .detail-grid {
    grid-template-columns: 1fr;
  }

  .report-grid {
    grid-template-columns: 1fr;
  }

  .input {
    min-height: 48px;
    font-size: 16px;
  }

  .vehicle-form {
    grid-template-columns: 1fr;
    padding: 12px;
  }

  .energy-calculation-card {
    padding: 12px;
  }

  .calculation-row {
    grid-template-columns: minmax(0, 1fr) 18px minmax(0, 1fr) 18px minmax(0, 1fr);
    gap: 5px;
  }

  .calculation-operator {
    font-size: 16px;
  }

  .calculation-result strong {
    padding: 0 8px;
    font-size: 14px;
  }

  .record-status-grid {
    grid-template-columns: 1fr;
  }

  .vehicle-item {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .vehicle-item-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .fuel-vehicle-dialog .ghost-btn,
  .fuel-vehicle-dialog .action-btn {
    min-height: 46px;
  }

  .action-btn[form="fuel-record-dialog-form"] {
    width: 100%;
    min-height: 50px;
    border-radius: 14px;
    font-size: 16px;
    font-weight: 700;
  }

  .mobile-action-dock {
    position: fixed;
    z-index: 30;
    right: 12px;
    bottom: max(10px, env(safe-area-inset-bottom));
    left: 12px;
    display: grid;
    grid-template-columns: 68px minmax(0, 1fr) 68px;
    align-items: center;
    gap: 8px;
    min-height: 76px;
    padding: 8px;
    border: 1px solid color-mix(in srgb, var(--theme-border-strong) 72%, transparent);
    border-radius: 26px;
    background: color-mix(in srgb, var(--theme-surface) 78%, transparent);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
  }

  .dock-secondary-btn,
  .dock-primary-btn {
    min-height: 58px;
    border: 0;
    cursor: pointer;
    touch-action: manipulation;
  }

  .dock-secondary-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    border-radius: 18px;
    color: var(--theme-text-muted);
    background: transparent;
    font-size: 11px;
  }

  .dock-icon {
    font-size: 21px;
    line-height: 1;
  }

  .dock-primary-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border-radius: 19px;
    color: #fff;
    background: linear-gradient(135deg, #0a84ff, #20c997);
    box-shadow: 0 8px 22px rgba(10, 132, 255, 0.28);
    font-size: 15px;
    font-weight: 700;
  }

  .dock-plus {
    font-size: 24px;
    font-weight: 400;
    line-height: 1;
  }

  .dock-secondary-btn:active,
  .dock-primary-btn:active {
    transform: scale(0.96);
  }
}

@media (max-width: 560px) {
  .hero-panel,
  .headline-copy,
  .headline-stats,
  .price-panel,
  .list-panel,
  .insight-panel,
  .report-panel,
  .dialog {
    padding: 14px;
    border-radius: 16px;
  }

  .mobile-record-grid,
  .price-grid {
    grid-template-columns: 1fr;
  }

  .headline-topline {
    align-items: stretch;
  }

  .headline-switches {
    justify-content: flex-start;
  }

  .trend-card {
    gap: 14px;
  }

  .trend-summary {
    gap: 6px;
  }

  .trend-summary > div {
    min-width: 0;
    padding: 8px;
  }

  .trend-summary strong {
    overflow: hidden;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .analytics-chart-head {
    gap: 8px;
  }

  .chart-peak strong {
    font-size: 13px;
  }

  .volume-bars {
    gap: 3px;
  }

  .bar-row {
    grid-template-columns: 46px minmax(0, 1fr);
  }

  .bar-meta {
    grid-column: 1 / -1;
    align-items: flex-start;
    margin-top: -2px;
  }

  .pager-right .ghost-btn,
  .dialog-actions .action-btn,
  .dialog-actions .ghost-btn {
    flex-basis: 100%;
  }

}

@media (prefers-reduced-motion: reduce) {
  .nav-icon-btn,
  .headline-switch-btn,
  .action-btn,
  .ghost-btn,
  .mini-btn,
  .mobile-record-card,
  .dock-secondary-btn,
  .dock-primary-btn,
  .bar-fill {
    scroll-behavior: auto;
    transition: none;
  }
}

@media (prefers-reduced-transparency: reduce) {
  .page-nav,
  .mobile-action-dock,
  .nav-icon-btn,
  .hero-panel,
  .headline-panel,
  .price-panel,
  .list-panel,
  .insight-panel,
  .report-panel,
  .trend-card,
  .analytics-chart-card,
  .trend-summary > div {
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    background-color: var(--theme-surface);
  }
}

@media (prefers-contrast: more) {
  .page-nav,
  .mobile-action-dock,
  .mobile-record-card,
  .price-card,
  .summary-card,
  .trend-card,
  .analytics-chart-card,
  .trend-summary > div {
    border-color: var(--theme-text);
  }
}
</style>
