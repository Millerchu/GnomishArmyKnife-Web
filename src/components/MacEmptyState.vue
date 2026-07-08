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
  color: rgba(219, 235, 247, 0.68);
  text-align: center;
}

.mac-empty-state strong {
  color: #f2f9ff;
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
  border: 1px solid rgba(226, 241, 255, 0.2);
  border-radius: 13px;
  background:
    linear-gradient(90deg, transparent 0 30%, rgba(93, 231, 213, 0.22) 30% 32%, transparent 32%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.05)),
    rgba(7, 20, 34, 0.46);
  box-shadow:
    0 10px 24px rgba(0, 7, 18, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
}
</style>
