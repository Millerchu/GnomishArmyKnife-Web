<template>
  <div class="mac-window-controls" role="group" aria-label="弹窗窗口控制">
    <button
      type="button"
      class="mac-window-dot close"
      :disabled="closeDisabled"
      aria-label="取消并关闭弹窗"
      title="取消并关闭"
      @click="$emit('close')"
    >
      ×
    </button>
    <button
      type="button"
      class="mac-window-dot minimize"
      :disabled="closeDisabled"
      aria-label="收起弹窗"
      title="收起"
      @click="$emit('minimize')"
    >
      −
    </button>
    <button
      type="button"
      class="mac-window-dot zoom"
      :aria-label="maximized ? '还原弹窗' : '最大化弹窗'"
      :title="maximized ? '还原' : '最大化'"
      @click="$emit('toggle-maximize')"
    >
      +
    </button>
  </div>
</template>

<script>
export default {
  name: 'MacWindowControls',
  props: {
    closeDisabled: {
      type: Boolean,
      default: false
    },
    maximized: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'minimize', 'toggle-maximize']
}
</script>

<style scoped>
.mac-window-controls {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 54px;
}

.mac-window-dot {
  width: 12px;
  height: 12px;
  border: 0;
  padding: 0;
  border-radius: 999px;
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.1);
  color: transparent;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  line-height: 12px;
  transition: color 120ms ease, filter 120ms ease;
}

.mac-window-controls:hover .mac-window-dot,
.mac-window-dot:focus-visible {
  color: rgba(15, 23, 42, 0.72);
}

.mac-window-dot:focus-visible {
  outline: 2px solid rgba(37, 99, 235, 0.9);
  outline-offset: 2px;
}

.mac-window-dot:disabled {
  cursor: not-allowed;
  filter: grayscale(0.7);
  opacity: 0.45;
}

.mac-window-dot.close {
  background: #ff5f57;
}

.mac-window-dot.minimize {
  background: #febc2e;
}

.mac-window-dot.zoom {
  background: #28c840;
}
</style>
