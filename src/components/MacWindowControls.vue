<template>
  <div class="mac-window-controls" aria-hidden="true">
    <span class="mac-window-dot close"></span>
    <span class="mac-window-dot minimize"></span>
    <span class="mac-window-dot zoom"></span>
  </div>
</template>

<script>
export default {
  name: 'MacWindowControls'
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
  border-radius: 999px;
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.1);
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
