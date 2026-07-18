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
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.025) 18%),
    radial-gradient(circle at 12% 0%, rgba(95, 151, 255, 0.075), transparent 30%),
    var(--macos-table-surface, rgba(25, 28, 35, 0.82));
  box-shadow:
    0 22px 54px rgba(0, 0, 0, 0.3),
    0 4px 14px rgba(0, 0, 0, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.24);
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
  border-bottom: 1px solid var(--macos-table-divider, rgba(255, 255, 255, 0.085));
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.105), rgba(255, 255, 255, 0.035)),
    var(--macos-table-header, rgba(47, 50, 59, 0.9));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.13),
    inset 0 -1px 0 rgba(255, 255, 255, 0.075);
}

.mac-table-title {
  margin: 0;
  color: rgba(250, 250, 252, 0.92);
  font-size: 15px;
  font-weight: 650;
  letter-spacing: -0.01em;
}

.mac-table-subtitle {
  margin: 4px 0 0;
  color: rgba(238, 240, 245, 0.55);
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
  scrollbar-color: rgba(255, 255, 255, 0.25) transparent;
  scrollbar-width: thin;
}

.mac-table-scroll::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.mac-table-scroll::-webkit-scrollbar-thumb {
  border: 2px solid transparent;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.24);
  background-clip: padding-box;
}

.mac-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  color: rgba(255, 255, 255, 0.88);
  font-variant-numeric: tabular-nums;
}

.mac-table :deep(th),
.mac-table :deep(td) {
  padding: 12px 13px;
  border-bottom: 1px solid var(--macos-table-divider, rgba(255, 255, 255, 0.085));
  color: rgba(246, 247, 250, 0.88);
  font-size: 13px;
  line-height: 1.45;
  text-align: left;
}

.mac-table :deep(th) {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.03)),
    var(--macos-table-header, rgba(47, 50, 59, 0.9));
  color: rgba(244, 245, 249, 0.68);
  font-size: 11px;
  font-weight: 650;
  letter-spacing: 0.015em;
  white-space: nowrap;
}

.mac-table :deep(tbody tr) {
  background: rgba(255, 255, 255, 0.018);
  transition: background-color 150ms ease, box-shadow 150ms ease;
}

.mac-table :deep(tbody tr:nth-child(even)) {
  background: rgba(255, 255, 255, 0.034);
}

.mac-table :deep(tbody tr:hover),
.mac-table :deep(tbody tr:focus-within) {
  background: var(--macos-table-hover, rgba(10, 132, 255, 0.105));
  box-shadow: inset 3px 0 0 rgba(10, 132, 255, 0.82);
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
