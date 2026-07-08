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
  border: 1px solid rgba(221, 239, 255, 0.18);
  border-radius: 22px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.11), rgba(255, 255, 255, 0.04)),
    rgba(7, 20, 34, 0.46);
  box-shadow:
    0 16px 38px rgba(0, 7, 18, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(22px) saturate(150%);
  overflow: hidden;
}

.mac-table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 16px 18px;
  border-bottom: 1px solid rgba(226, 241, 255, 0.13);
  background:
    linear-gradient(180deg, rgba(244, 249, 255, 0.15), rgba(222, 239, 255, 0.08)),
    rgba(11, 28, 43, 0.62);
}

.mac-table-title {
  margin: 0;
  color: #f2f9ff;
  font-size: 17px;
}

.mac-table-subtitle {
  margin: 4px 0 0;
  color: rgba(219, 235, 247, 0.68);
  font-size: 13px;
}

.mac-table-toolbar-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.mac-table-scroll {
  overflow: auto;
}

.mac-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.mac-table :deep(th),
.mac-table :deep(td) {
  padding: 12px 14px;
  border-bottom: 1px solid rgba(226, 241, 255, 0.13);
  color: rgba(239, 248, 255, 0.9);
  text-align: left;
}

.mac-table :deep(th) {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(234, 245, 255, 0.82);
  font-size: 12px;
}

.mac-table :deep(tr:last-child td) {
  border-bottom: 0;
}
</style>
