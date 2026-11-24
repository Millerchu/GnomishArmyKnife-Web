<script setup>
import ThemeToggle from './ThemeToggle.vue'

defineProps({
  title: { type: String, required: true },
  icon: String,
})
defineEmits(['back'])
</script>

<template>
  <header class="app-page-header">
    <button type="button" class="app-return" aria-label="返回工作台" title="返回工作台" @click="$emit('back')">←</button>
    <img v-if="icon" :src="icon" alt="" width="36" height="36" />
    <h1>{{ title }}</h1>
    <ThemeToggle />
    <div v-if="$slots.default" class="app-summary"><slot /></div>
  </header>
</template>

<style scoped>
.app-page-header {
  display: grid;
  grid-template-columns: auto auto 1fr auto;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
  color: var(--theme-text);
}
.app-page-header h1 {
  grid-column-end: 4;
  margin: 0;
  font-size: clamp(21px, 3vw, 30px);
  line-height: 1.25;
}
.app-page-header h1:first-of-type { grid-column-start: 2; }
.app-page-header img + h1:first-of-type { grid-column-start: 3; }
.app-return {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  border: 1px solid var(--theme-border);
  background: var(--theme-control-surface);
  color: var(--theme-text);
  font-size: 21px;
  cursor: pointer;
}
.app-summary {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  font-size: 13px;
  color: var(--theme-text-muted);
}
</style>
