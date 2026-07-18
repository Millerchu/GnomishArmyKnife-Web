<template>
  <div class="mac-empty-state">
    <div class="mac-empty-mark" aria-hidden="true"></div>
    <strong>{{ title }}</strong>
    <p>{{ description }}</p>
    <slot/>
  </div>
</template>

<script>
export default {
  name: 'MacEmptyState',
  props: {
    title: {
      type: String,
      default: '暂无数据'
    },
    description: {
      type: String,
      default: '调整筛选条件或稍后再试。'
    }
  }
}
</script>

<style scoped>
.mac-empty-state {
  min-height: 180px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 8px;
  padding: 28px;
  border-radius: 22px;
  color: var(--theme-text-muted);
  text-align: center;
}

.mac-empty-state strong {
  color: var(--theme-text);
  font-size: 16px;
}

.mac-empty-state p {
  max-width: 34rem;
  margin: 0;
  line-height: 1.55;
}

.mac-empty-mark {
  width: 48px;
  height: 36px;
  border: 1px solid var(--theme-border);
  border-radius: 13px;
  background:
    linear-gradient(90deg, transparent 0 30%, var(--theme-accent-soft) 30% 32%, transparent 32%),
    linear-gradient(180deg, var(--theme-highlight-soft), transparent),
    var(--theme-surface-muted);
  box-shadow:
    var(--theme-shadow-xs),
    inset 0 1px 0 var(--theme-highlight-soft);
}
</style>
