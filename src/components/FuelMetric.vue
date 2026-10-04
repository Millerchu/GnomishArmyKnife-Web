<template>
  <b class="fuel-metric">
    <template v-if="valid"><small v-if="prefix" class="metric-unit metric-prefix">{{ prefix }}</small>{{ formatted }}<small v-if="unit" class="metric-unit metric-suffix">{{ unit }}</small></template>
    <template v-else>{{ emptyText }}</template>
  </b>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: { type: Number, default: null },
  precision: { type: Number, default: 2 },
  unit: { type: String, default: '' },
  prefix: { type: String, default: '' },
  emptyText: { type: String, default: '—' },
})
const valid = computed(() => props.value != null && Number.isFinite(props.value))
const formatted = computed(() => valid.value ? props.value.toFixed(props.precision) : '')
</script>

<style scoped>
.fuel-metric {
  font: inherit;
  color: inherit;
  white-space: nowrap;
}
.fuel-metric .metric-unit {
  font-size: .6em;
  font-weight: 500;
  color: inherit;
  opacity: .75;
}
.metric-suffix { margin-left: .3em; }
.metric-prefix { margin-right: .15em; }
</style>
