<template>
  <div class="health-trend-chart">
    <div class="chart-summary-bar">
      <div class="chart-summary-main">
        <span class="chart-metric-name">{{ metricLabel }}</span>
        <strong v-if="activePoint" class="chart-active-value">
          {{ formatValue(activePoint.value) }}
          <small>{{ activePoint.measureDate }}</small>
        </strong>
      </div>
      <div class="chart-stats">
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
            <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.32" />
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

        <!-- 悬停/选中竖向参考线 -->
        <line
          v-if="activeChartPoint"
          class="active-guide-line"
          :x1="activeChartPoint.x"
          :y1="PADDING.top"
          :x2="activeChartPoint.x"
          :y2="PLOT_BOTTOM"
        />

        <!-- 面积填充与趋势折线 -->
        <path
          v-if="areaPath"
          class="trend-area"
          :d="areaPath"
          :fill="`url(#${areaGradientId})`"
        />
        <polyline
          v-if="polylinePoints"
          class="trend-line"
          :points="polylinePoints"
          :stroke="`url(#${lineGradientId})`"
        />

        <!-- 数据点 -->
        <g
          v-for="(point, idx) in chartPoints"
          :key="point.key"
          class="trend-point-group"
          :class="{ active: idx === activeIndex }"
          tabindex="0"
          role="button"
          :aria-label="`${point.measureDate} ${formatValue(point.value)}`"
          @mouseenter="activeIndex = idx"
          @focus="activeIndex = idx"
          @click="activeIndex = idx"
        >
          <circle class="point-hit" :cx="point.x" :cy="point.y" r="14" />
          <circle class="point-halo" :cx="point.x" :cy="point.y" :r="idx === activeIndex ? 8 : 6" />
          <circle class="point-core" :cx="point.x" :cy="point.y" :r="idx === activeIndex ? 4.5 : 3.5" />
          <text
            v-if="showPointLabels || idx === activeIndex"
            class="point-value-label"
            :class="{ active: idx === activeIndex }"
            :x="point.x"
            :y="Math.max(PADDING.top + 10, point.y - 11)"
            text-anchor="middle"
          >
            {{ formatRawNumber(point.value) }}
          </text>
        </g>

        <!-- X 轴日期刻度 -->
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
const VIEW_HEIGHT = 250
const PADDING = {top: 28, right: 28, bottom: 34, left: 62}
const PLOT_WIDTH = VIEW_WIDTH - PADDING.left - PADDING.right
const PLOT_HEIGHT = VIEW_HEIGHT - PADDING.top - PADDING.bottom
const PLOT_BOTTOM = PADDING.top + PLOT_HEIGHT

const props = defineProps({
  metricKey: {type: String, required: true},
  metricLabel: {type: String, default: ''},
  unit: {type: String, default: ''},
  decimals: {type: Number, default: 0},
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

const numericValues = computed(() => props.points.map((item) => Number(item.value)).filter(Number.isFinite))
const minValue = computed(() => (numericValues.value.length ? Math.min(...numericValues.value) : null))
const maxValue = computed(() => (numericValues.value.length ? Math.max(...numericValues.value) : null))
const latestPoint = computed(() => (props.points.length ? props.points[props.points.length - 1] : null))
const activePoint = computed(() => props.points[activeIndex.value] || latestPoint.value)

const yDomain = computed(() => {
  if (minValue.value === null || maxValue.value === null) {
    return {min: 0, max: 1}
  }
  const span = maxValue.value - minValue.value
  if (span === 0) {
    const pad = Math.max(Math.abs(maxValue.value) * 0.1, props.decimals > 0 ? 1 : 2)
    return {min: Math.max(0, minValue.value - pad), max: maxValue.value + pad}
  }
  const pad = span * 0.16
  const paddedMin = minValue.value >= 0 ? Math.max(0, minValue.value - pad) : minValue.value - pad
  return {min: paddedMin, max: maxValue.value + pad}
})

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

const chartPoints = computed(() => {
  const list = props.points || []
  if (!list.length) {
    return []
  }
  const {min, max} = yDomain.value
  const range = Math.max(1e-9, max - min)
  return list.map((item, idx) => {
    const num = Number(item.value)
    const x = list.length === 1
      ? PADDING.left + PLOT_WIDTH / 2
      : PADDING.left + (PLOT_WIDTH * idx) / (list.length - 1)
    const y = PADDING.top + PLOT_HEIGHT - ((num - min) / range) * PLOT_HEIGHT
    return {
      key: item.recordId != null ? String(item.recordId) : `${item.measureDate}-${idx}`,
      measureDate: item.measureDate,
      value: num,
      x: Number(x.toFixed(1)),
      y: Number(y.toFixed(1))
    }
  })
})

const activeChartPoint = computed(() => chartPoints.value[activeIndex.value] || null)
const showPointLabels = computed(() => chartPoints.value.length <= 14)

const polylinePoints = computed(() => chartPoints.value.map((p) => `${p.x},${p.y}`).join(' '))

const areaPath = computed(() => {
  const pts = chartPoints.value
  if (pts.length < 2) {
    return ''
  }
  const first = pts[0]
  const last = pts[pts.length - 1]
  const linePart = pts.map((p) => `L ${p.x} ${p.y}`).join(' ')
  return `M ${first.x} ${PLOT_BOTTOM} ${linePart} L ${last.x} ${PLOT_BOTTOM} Z`
})

const xTicks = computed(() => {
  const pts = chartPoints.value
  if (!pts.length) {
    return []
  }
  const maxLabels = 8
  const step = pts.length <= maxLabels ? 1 : Math.ceil((pts.length - 1) / (maxLabels - 1))
  const indices = new Set()
  for (let i = 0; i < pts.length; i += step) {
    indices.add(i)
  }
  indices.add(pts.length - 1)
  return Array.from(indices).sort((a, b) => a - b).map((idx) => {
    const point = pts[idx]
    const anchor = idx === 0 && pts.length > 1
      ? 'start'
      : idx === pts.length - 1 && pts.length > 1
        ? 'end'
        : 'middle'
    return {
      key: point.key,
      x: point.x,
      label: formatDateLabel(point.measureDate),
      anchor
    }
  })
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
</script>

<style scoped>
.health-trend-chart {
  display: grid;
  gap: 10px;
}

.chart-summary-bar {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 10px 18px;
  padding: 2px 4px;
}

.chart-summary-main {
  display: flex;
  align-items: baseline;
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
}

.chart-active-value small {
  margin-left: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #7dd3fc;
}

.chart-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12.5px;
  color: #8ea6bf;
}

.chart-stats b {
  color: #dbeafe;
  font-weight: 600;
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

.trend-point-group.active .point-halo {
  fill: rgba(39, 213, 164, 0.3);
}

.point-core {
  fill: #38bdf8;
  stroke: #081828;
  stroke-width: 2;
  transition: r 0.15s ease, fill 0.15s ease;
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

.point-value-label.active {
  fill: #7bf0cc;
  font-weight: 700;
}
</style>
