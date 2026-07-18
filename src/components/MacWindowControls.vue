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
      <span class="mac-window-glyph close-glyph" aria-hidden="true"></span>
    </button>
    <button
      type="button"
      class="mac-window-dot minimize"
      :disabled="closeDisabled"
      aria-label="收起弹窗"
      title="收起"
      @click="$emit('minimize')"
    >
      <span class="mac-window-glyph minimize-glyph" aria-hidden="true"></span>
    </button>
    <button
      type="button"
      class="mac-window-dot zoom"
      :aria-label="maximized ? '还原弹窗' : '最大化弹窗'"
      :title="maximized ? '还原' : '最大化'"
      @click="$emit('toggle-maximize')"
    >
      <span class="mac-window-glyph zoom-glyph" aria-hidden="true"></span>
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
  gap: 2px;
}

.mac-window-dot {
  position: relative;
  isolation: isolate;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  min-width: 24px;
  min-height: 24px;
  border: 0;
  padding: 0;
  border-radius: 999px;
  background: transparent;
  cursor: pointer;
}

.mac-window-dot::before {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: -1;
  width: 12px;
  height: 12px;
  border-radius: 999px;
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.1);
  content: '';
  transform: translate(-50%, -50%);
  transition: filter 120ms ease, opacity 120ms ease;
}

.mac-window-glyph {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 1;
  width: 8px;
  height: 8px;
  pointer-events: none;
  opacity: 0;
  transform: translate(-50%, -50%);
  transition: opacity 120ms ease;
}

.mac-window-glyph::before {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 7px;
  height: 1.5px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.72);
  content: '';
  transform: translate(-50%, -50%);
}

.mac-window-glyph::after {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 7px;
  height: 1.5px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.72);
  content: '';
  transform: translate(-50%, -50%);
}

.mac-window-controls:hover .mac-window-glyph,
.mac-window-dot:focus-visible .mac-window-glyph {
  opacity: 1;
}

.mac-window-dot:focus-visible {
  outline: 2px solid var(--theme-accent);
  outline-offset: 2px;
}

.mac-window-dot:disabled {
  cursor: not-allowed;
}

.mac-window-dot:disabled::before {
  filter: grayscale(0.7);
  opacity: 0.45;
}

.mac-window-dot:disabled .mac-window-glyph {
  opacity: 0.28;
}

.mac-window-dot.close::before {
  background: #ff5f57;
}

.mac-window-dot.minimize::before {
  background: #febc2e;
}

.mac-window-dot.zoom::before {
  background: #28c840;
}

.close-glyph::before {
  transform: translate(-50%, -50%) rotate(45deg);
}

.close-glyph::after {
  transform: translate(-50%, -50%) rotate(-45deg);
}

.minimize-glyph::after {
  display: none;
}

.zoom-glyph::after {
  transform: translate(-50%, -50%) rotate(90deg);
}
</style>
