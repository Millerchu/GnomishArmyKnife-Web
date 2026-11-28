<template>
  <div class="health-trend-chart">
    <div class="chart-summary-bar">
      <div class="chart-summary-main">
        <span class="chart-metric-name">{{ metricLabel }}</span>
        <strong v-if="activePoint" class="chart-active-value">
          {{ formatPointDisplay(activePoint) }}
          <small>{{ activePoint.measureDate }}</small>
        </strong>
        <span v-if="refRange?.label" class="chart-ref-badge">{{ refRange.label }}</span>
      </div>
      <div v-if="isDual" class="chart-stats">
        <span class="legend-item"><i class="legend-dot primary" />收缩压(高压)</span>
        <span class="legend-item"><i class="legend-dot secondary" />舒张压(低压)</span>
        <span>共 <b>{{ points.length }}</b> 点</span>
      </div>
      <div v-else class="chart-stats">
        <span>最新 <b>{{ formatValue(latestPoint?.value) }}</b></span>
        <span>最高 <b>{{ formatValue(maxValue) }}</b></span>
        <span>最低 <b>{{ formatValue(minValue) }}</b></span>
        <span>共 <b>{{ points.length }}</b> 点</span>
      </div>
    </div>

    <div class="chart-canvas-wrap">
      <svg
        class="trend-svg"
        :viewBox="`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`"
        role="img"
        :aria-label="`${metricLabel}趋势折线图`"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient :id="lineGradientId" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#38bdf8" />
            <stop offset="100%" stop-color="#27d5a4" />
          </linearGradient>
          <linearGradient :id="areaGradientId" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.28" />
            <stop offset="100%" stop-color="#27d5a4" stop-opacity="0.02" />
          </linearGradient>
        </defs>

        <!-- 水平网格线与 Y 轴刻度 -->
        <g v-for="tick in yTicks" :key="tick.y" class="y-grid-row">
          <line
            class="grid-line"
            :x1="PADDING.left"
            :y1="tick.y"
            :x2="VIEW_WIDTH - PADDING.right"
            :y2="tick.y"
          />
          <text
            class="axis-label y-label"
            :x="PADDING.left - 10"
            :y="tick.y + 4"
            text-anchor="end"
          >
            {{ tick.label }}
          </text>
        </g>

        <!-- 健康标准参考区间带 / 阈值虚线 -->
        <g v-if="referenceOverlay" class="reference-overlay">
          <rect
            v-if="referenceOverlay.band"
            class="ref-band"
            :x="PADDING.left"
            :y="referenceOverlay.band.y"
            :width="PLOT_WIDTH"
            :height="referenceOverlay.band.height"
          />
          <g v-for="line in referenceOverlay.lines" :key="line.id">
            <line
              class="ref-line"
              :x1="PADDING.left"
              :y1="line.y"
              :x2="VIEW_WIDTH - PADDING.right"
              :y2="line.y"
            />
            <text
              v-if="line.label"
              class="ref-line-label"
              :x="VIEW_WIDTH - PADDING.right"
              :y="Math.max(PADDING.top + 10, line.y - 5)"
              text-anchor="end"
            >
              {{ line.label }}
            </text>
          </g>
        </g>

        <!-- 悬停/选中竖向参考线 -->
        <line
          v-if="activeChartPoint"
          class="active-guide-line"
          :x1="activeChartPoint.x"
          :y1="PADDING.top"
          :x2="activeChartPoint.x"
          :y2="PLOT_BOTTOM"
        />

        <!-- 单曲线面积填充与折线 -->
        <template v-if="!isDual">
          <path
            v-if="areaPath"
            class="trend-area"
            :d="areaPath"
            :fill="`url(#${areaGradientId})`"
          />
          <polyline
            v-if="primaryPolyline"
            class="trend-line"
            :points="primaryPolyline"
            :stroke="`url(#${lineGradientId})`"
          />
        </template>

        <!-- 双曲线（血压：收缩压 + 舒张压） -->
        <template v-else>
          <polyline
            v-if="primaryPolyline"
            class="trend-line dual-primary"
            :points="primaryPolyline"
          />
          <polyline
            v-if="secondaryPolyline"
            class="trend-line dual-secondary"
            :points="secondaryPolyline"
          />
        </template>

        <!-- 数据点 -->
        <g
          v-for="(point, idx) in chartPoints"
          :key="point.key"
          class="trend-point-group"
          :class="{ active: idx === activeIndex }"
          tabindex="0"
          role="button"
          :aria-label="`${point.measureDate} ${formatPointDisplay(point)}`"
          @mouseenter="activeIndex = idx"
          @focus="activeIndex = idx"
          @click="activeIndex = idx"
        >
          <template v-if="point.y !== null">
            <circle class="point-hit" :cx="point.x" :cy="point.y" r="14" />
            <circle class="point-halo" :cx="point.x" :cy="point.y" :r="idx === activeIndex ? 8 : 6" />
            <circle class="point-core" :cx="point.x" :cy="point.y" :r="idx === activeIndex ? 4.5 : 3.5" />
            <text
              v-if="showPointLabels || idx === activeIndex"
              class="point-value-label"
              :class="{ active: idx === activeIndex }"
              :x="point.x"
              :y="Math.max(PADDING.top + 10, point.y - 10)"
              text-anchor="middle"
            >
              {{ formatRawNumber(point.value) }}
            </text>
          </template>
          <template v-if="isDual && point.y2 !== null">
            <circle class="point-hit" :cx="point.x" :cy="point.y2" r="14" />
            <circle class="point-halo secondary" :cx="point.x" :cy="point.y2" :r="idx === activeIndex ? 8 : 6" />
            <circle class="point-core secondary" :cx="point.x" :cy="point.y2" :r="idx === activeIndex ? 4.5 : 3.5" />
            <text
              v-if="showPointLabels || idx === activeIndex"
              class="point-value-label secondary"
              :class="{ active: idx === activeIndex }"
              :x="point.x"
              :y="Math.min(PLOT_BOTTOM - 4, point.y2 + 15)"
              text-anchor="middle"
            >
              {{ formatRawNumber(point.secondaryValue) }}
            </text>
          </template>
        </g>

        <!-- X 轴日期刻度（带碰撞间距保护） -->
        <g v-for="tick in xTicks" :key="tick.key">
          <text
            class="axis-label x-label"
            :x="tick.x"
            :y="VIEW_HEIGHT - 10"
            :text-anchor="tick.anchor"
          >
            {{ tick.label }}
          </text>
        </g>
      </svg>
    </div>
  </div>
</template>

<script setup>
import {computed, ref, watch} from 'vue'

const VIEW_WIDTH = 820
const VIEW_HEIGHT = 256
const PADDING = {top: 30, right: 28, bottom: 34, left: 62}
const PLOT_WIDTH = VIEW_WIDTH - PADDING.left - PADDING.right
const PLOT_HEIGHT = VIEW_HEIGHT - PADDING.top - PADDING.bottom
const PLOT_BOTTOM = PADDING.top + PLOT_HEIGHT
const MIN_X_TICK_GAP = 68

const props = defineProps({
  metricKey: {type: String, required: true},
  metricLabel: {type: String, default: ''},
  unit: {type: String, default: ''},
  decimals: {type: Number, default: 0},
  isDual: {type: Boolean, default: false},
  refRange: {type: Object, default: null},
  points: {type: Array, default: () => []}
})

const lineGradientId = computed(() => `health-trend-line-${props.metricKey}`)
const areaGradientId = computed(() => `health-trend-area-${props.metricKey}`)
const activeIndex = ref(0)

watch(
  () => props.points,
  (nextPoints) => {
    activeIndex.value = nextPoints.length ? nextPoints.length - 1 : 0
  },
  {immediate: true}
)

const primaryValues = computed(() => props.points
  .map((item) => (item.value === null || item.value === undefined ? NaN : Number(item.value)))
  .filter(Number.isFinite))

const secondaryValues = computed(() => (props.isDual
  ? props.points
    .map((item) => (item.secondaryValue === null || item.secondaryValue === undefined ? NaN : Number(item.secondaryValue)))
    .filter(Number.isFinite)
  : []))

const minValue = computed(() => (primaryValues.value.length ? Math.min(...primaryValues.value) : null))
const maxValue = computed(() => (primaryValues.value.length ? Math.max(...primaryValues.value) : null))
const latestPoint = computed(() => (props.points.length ? props.points[props.points.length - 1] : null))
const activePoint = computed(() => props.points[activeIndex.value] || latestPoint.value)

const yDomain = computed(() => {
  const allData = [...primaryValues.value, ...secondaryValues.value]
  if (!allData.length) {
    return {min: 0, max: 1}
  }
  const refVals = []
  if (props.refRange) {
    if (props.refRange.min != null) refVals.push(props.refRange.min)
    if (props.refRange.max != null) refVals.push(props.refRange.max)
    if (props.refRange.sysMax != null) refVals.push(props.refRange.sysMax)
    if (props.refRange.diaMax != null) refVals.push(props.refRange.diaMax)
  }
  const combined = [...allData, ...refVals]
  const rawMin = Math.min(...combined)
  const rawMax = Math.max(...combined)
  const span = rawMax - rawMin
  if (span === 0) {
    const pad = Math.max(Math.abs(rawMax) * 0.1, props.decimals > 0 ? 1 : 2)
    return {min: Math.max(0, rawMin - pad), max: rawMax + pad}
  }
  const pad = span * 0.16
  const paddedMin = rawMin >= 0 ? Math.max(0, rawMin - pad) : rawMin - pad
  return {min: paddedMin, max: rawMax + pad}
})

function valueToY(value) {
  const {min, max} = yDomain.value
  const range = Math.max(1e-9, max - min)
  return Number((PADDING.top + PLOT_HEIGHT - ((value - min) / range) * PLOT_HEIGHT).toFixed(1))
}

const yTicks = computed(() => {
  const {min, max} = yDomain.value
  const steps = 4
  const result = []
  for (let i = 0; i <= steps; i += 1) {
    const ratio = i / steps
    const value = max - (max - min) * ratio
    const y = PADDING.top + PLOT_HEIGHT * ratio
    result.push({
      y: Number(y.toFixed(1)),
      label: value.toFixed(props.decimals)
    })
  }
  return result
})

const referenceOverlay = computed(() => {
  const refObj = props.refRange
  if (!refObj) return null
  if (props.isDual && (refObj.sysMax != null || refObj.diaMax != null)) {
    const lines = []
    if (refObj.sysMax != null) {
      lines.push({id: 'sys', y: valueToY(refObj.sysMax), label: `高压标准 ${refObj.sysMax}`})
    }
    if (refObj.diaMax != null) {
      lines.push({id: 'dia', y: valueToY(refObj.diaMax), label: `低压标准 ${refObj.diaMax}`})
    }
    return {band: null, lines}
  }
  if (refObj.min != null && refObj.max != null) {
    const yTop = valueToY(refObj.max)
    const yBot = valueToY(refObj.min)
    return {
      band: {y: yTop, height: Math.max(2, yBot - yTop)},
      lines: [
        {id: 'max', y: yTop, label: refObj.label},
        {id: 'min', y: yBot, label: ''}
      ]
    }
  }
  if (refObj.max != null) {
    const yLine = valueToY(refObj.max)
    return {
      band: {y: yLine, height: Math.max(0, PLOT_BOTTOM - yLine)},
      lines: [{id: 'max', y: yLine, label: refObj.label}]
    }
  }
  if (refObj.min != null) {
    const yLine = valueToY(refObj.min)
    return {
      band: {y: PADDING.top, height: Math.max(0, yLine - PADDING.top)},
      lines: [{id: 'min', y: yLine, label: refObj.label}]
    }
  }
  return null
})

const chartPoints = computed(() => {
  const list = props.points || []
  if (!list.length) return []
  return list.map((item, idx) => {
    const x = list.length === 1
      ? PADDING.left + PLOT_WIDTH / 2
      : PADDING.left + (PLOT_WIDTH * idx) / (list.length - 1)
    const hasPrimary = item.value !== null && item.value !== undefined && Number.isFinite(Number(item.value))
    const hasSecondary = props.isDual && item.secondaryValue !== null && item.secondaryValue !== undefined
      && Number.isFinite(Number(item.secondaryValue))
    return {
      key: item.recordId != null ? String(item.recordId) : `${item.measureDate}-${idx}`,
      measureDate: item.measureDate,
      value: hasPrimary ? Number(item.value) : null,
      secondaryValue: hasSecondary ? Number(item.secondaryValue) : null,
      x: Number(x.toFixed(1)),
      y: hasPrimary ? valueToY(Number(item.value)) : null,
      y2: hasSecondary ? valueToY(Number(item.secondaryValue)) : null
    }
  })
})

const activeChartPoint = computed(() => chartPoints.value[activeIndex.value] || null)
const showPointLabels = computed(() => chartPoints.value.length <= 14)

const primaryPolyline = computed(() => chartPoints.value
  .filter((p) => p.y !== null)
  .map((p) => `${p.x},${p.y}`)
  .join(' '))

const secondaryPolyline = computed(() => (props.isDual
  ? chartPoints.value
    .filter((p) => p.y2 !== null)
    .map((p) => `${p.x},${p.y2}`)
    .join(' ')
  : ''))

const areaPath = computed(() => {
  if (props.isDual) return ''
  const pts = chartPoints.value.filter((p) => p.y !== null)
  if (pts.length < 2) return ''
  const first = pts[0]
  const last = pts[pts.length - 1]
  const linePart = pts.map((p) => `L ${p.x} ${p.y}`).join(' ')
  return `M ${first.x} ${PLOT_BOTTOM} ${linePart} L ${last.x} ${PLOT_BOTTOM} Z`
})

const xTicks = computed(() => {
  const pts = chartPoints.value
  if (!pts.length) return []
  const result = []
  let lastX = -Infinity
  pts.forEach((point, idx) => {
    const isLast = idx === pts.length - 1
    if (isLast && point.x - lastX < MIN_X_TICK_GAP && result.length > 0) {
      result.pop()
    }
    if (point.x - lastX >= MIN_X_TICK_GAP || isLast) {
      const anchor = idx === 0 && pts.length > 1
        ? 'start'
        : isLast && pts.length > 1
          ? 'end'
          : 'middle'
      result.push({
        key: point.key,
        x: point.x,
        label: formatDateLabel(point.measureDate),
        anchor
      })
      lastX = point.x
    }
  })
  return result
})

function formatDateLabel(dateStr) {
  if (!dateStr) return ''
  return dateStr.length === 10 ? dateStr.slice(2) : dateStr
}

function formatRawNumber(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return '暂无'
  }
  return Number(value).toFixed(props.decimals)
}

function formatValue(value) {
  const raw = formatRawNumber(value)
  if (raw === '暂无') return raw
  return props.unit ? `${raw} ${props.unit}` : raw
}

function formatPointDisplay(point) {
  if (!point) return '暂无'
  if (props.isDual) {
    const sys = formatRawNumber(point.value)
    const dia = formatRawNumber(point.secondaryValue)
    return `${sys} / ${dia} ${props.unit}`.trim()
  }
  return formatValue(point.value)
}
</script>

<style scoped>
.health-trend-chart {
  display: grid;
  gap: 10px;
}

.chart-summary-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px 18px;
  padding: 2px 4px;
}

.chart-summary-main {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 10px;
}

.chart-metric-name {
  font-size: 13px;
  color: #9db3c8;
}

.chart-active-value {
  font-size: 18px;
  color: #f3f8ff;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.chart-active-value small {
  margin-left: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #7dd3fc;
}

.chart-ref-badge {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  border-radius: 6px;
  background: rgba(16, 185, 129, 0.14);
  border: 1px solid rgba(52, 211, 153, 0.32);
  color: #6ee7b7;
  font-size: 11.5px;
  font-weight: 500;
}

.chart-stats {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  font-size: 12.5px;
  color: #8ea6bf;
  font-variant-numeric: tabular-nums;
}

.chart-stats b {
  color: #dbeafe;
  font-weight: 600;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.legend-dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  display: inline-block;
}

.legend-dot.primary {
  background: #38bdf8;
}

.legend-dot.secondary {
  background: #a78bfa;
}

.chart-canvas-wrap {
  width: 100%;
  border-radius: 14px;
  background: rgba(7, 19, 32, 0.56);
  border: 1px solid rgba(148, 163, 184, 0.14);
  padding: 8px 6px 4px;
  box-sizing: border-box;
}

.trend-svg {
  width: 100%;
  height: auto;
  display: block;
  overflow: visible;
}

.grid-line {
  stroke: rgba(148, 163, 184, 0.16);
  stroke-dasharray: 4 4;
  stroke-width: 1;
}

.ref-band {
  fill: rgba(16, 185, 129, 0.1);
}

.ref-line {
  stroke: rgba(52, 211, 153, 0.65);
  stroke-dasharray: 5 4;
  stroke-width: 1.25;
}

.ref-line-label {
  fill: #6ee7b7;
  font-size: 10.5px;
  font-weight: 500;
}

.active-guide-line {
  stroke: rgba(56, 189, 248, 0.35);
  stroke-dasharray: 3 3;
  stroke-width: 1;
}

.trend-line {
  fill: none;
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.trend-line.dual-primary {
  stroke: #38bdf8;
}

.trend-line.dual-secondary {
  stroke: #a78bfa;
}

.axis-label {
  fill: #89a1ba;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.trend-point-group {
  cursor: pointer;
  outline: none;
}

.point-hit {
  fill: transparent;
}

.point-halo {
  fill: rgba(56, 189, 248, 0.18);
  transition: r 0.15s ease, fill 0.15s ease;
}

.point-halo.secondary {
  fill: rgba(167, 139, 250, 0.2);
}

.trend-point-group.active .point-halo {
  fill: rgba(39, 213, 164, 0.3);
}

.point-core {
  fill: #38bdf8;
  stroke: #081828;
  stroke-width: 2;
  transition: r 0.15s ease, fill 0.15s ease;
}

.point-core.secondary {
  fill: #a78bfa;
}

.trend-point-group.active .point-core {
  fill: #27d5a4;
}

.point-value-label {
  fill: #cbd5e1;
  font-size: 11px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  pointer-events: none;
}

.point-value-label.secondary {
  fill: #c4b5fd;
}

.point-value-label.active {
  fill: #7bf0cc;
  font-weight: 700;
}
</style>
