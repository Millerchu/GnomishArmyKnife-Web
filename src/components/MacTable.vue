<template>
  <section class="mac-table-shell" :aria-label="label">
    <header v-if="$slots.toolbar || title" class="mac-table-toolbar">
      <div>
        <h3 v-if="title" class="mac-table-title">{{ title }}</h3>
        <p v-if="subtitle" class="mac-table-subtitle">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.toolbar" class="mac-table-toolbar-actions">
        <slot name="toolbar"/>
      </div>
    </header>

    <div class="mac-table-scroll">
      <table v-if="$slots.default" class="mac-table">
        <slot/>
      </table>
      <MacEmptyState v-else :title="emptyTitle" :description="emptyDescription"/>
    </div>
  </section>
</template>

<script>
import MacEmptyState from './MacEmptyState.vue'

export default {
  name: 'MacTable',
  components: {
    MacEmptyState
  },
  props: {
    label: {
      type: String,
      default: '数据列表'
    },
    title: {
      type: String,
      default: ''
    },
    subtitle: {
      type: String,
      default: ''
    },
    emptyTitle: {
      type: String,
      default: '暂无数据'
    },
    emptyDescription: {
      type: String,
      default: '调整筛选条件或稍后刷新。'
    }
  }
}
</script>

<style scoped>
.mac-table-shell {
  position: relative;
  isolation: isolate;
  border: 1px solid var(--theme-table-border);
  border-radius: 16px;
  background:
    linear-gradient(180deg, var(--theme-highlight-soft), transparent 18%),
    radial-gradient(circle at 12% 0%, var(--theme-accent-soft), transparent 30%),
    var(--theme-table-surface);
  box-shadow:
    var(--theme-shadow-md),
    inset 0 1px 0 var(--theme-highlight);
  backdrop-filter: blur(34px) saturate(125%);
  -webkit-backdrop-filter: blur(34px) saturate(125%);
  overflow: hidden;
}

.mac-table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  min-height: 58px;
  padding: 13px 16px;
  border-bottom: 1px solid var(--theme-table-divider);
  background:
    linear-gradient(180deg, var(--theme-highlight-soft), transparent),
    var(--theme-table-header);
  box-shadow:
    inset 0 1px 0 var(--theme-highlight),
    inset 0 -1px 0 var(--theme-divider);
}

.mac-table-title {
  margin: 0;
  color: var(--theme-text);
  font-size: 15px;
  font-weight: 650;
  letter-spacing: -0.01em;
}

.mac-table-subtitle {
  margin: 4px 0 0;
  color: var(--theme-text-muted);
  font-size: 12px;
}

.mac-table-toolbar-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.mac-table-scroll {
  overflow: auto;
  scrollbar-color: var(--theme-scrollbar) transparent;
  scrollbar-width: thin;
}

.mac-table-scroll::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.mac-table-scroll::-webkit-scrollbar-thumb {
  border: 2px solid transparent;
  border-radius: 999px;
  background: var(--theme-scrollbar);
  background-clip: padding-box;
}

.mac-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  color: var(--theme-table-text);
  font-variant-numeric: tabular-nums;
}

.mac-table :deep(th),
.mac-table :deep(td) {
  padding: 12px 13px;
  border-bottom: 1px solid var(--theme-table-divider);
  color: var(--theme-table-text);
  font-size: 13px;
  line-height: 1.45;
  text-align: left;
}

.mac-table :deep(th) {
  background:
    linear-gradient(180deg, var(--theme-highlight-soft), transparent),
    var(--theme-table-header);
  color: var(--theme-table-head-text);
  font-size: 11px;
  font-weight: 650;
  letter-spacing: 0.015em;
  white-space: nowrap;
}

.mac-table :deep(tbody tr) {
  background: var(--theme-table-row);
  transition: background-color 150ms ease, box-shadow 150ms ease;
}

.mac-table :deep(tbody tr:nth-child(even)) {
  background: var(--theme-table-row-even);
}

.mac-table :deep(tbody tr:hover),
.mac-table :deep(tbody tr:focus-within) {
  background: var(--theme-table-hover);
  box-shadow: inset 3px 0 0 var(--theme-accent);
}

.mac-table :deep(tr:last-child td) {
  border-bottom: 0;
}

@media (max-width: 720px) {
  .mac-table-shell {
    border-radius: 14px;
  }

  .mac-table-toolbar {
    align-items: flex-start;
    padding: 12px 13px;
  }

  .mac-table-toolbar-actions {
    justify-content: flex-start;
  }
}
</style>
