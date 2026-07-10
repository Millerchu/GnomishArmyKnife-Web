<template>
  <Teleport to="body">
    <Transition name="mac-dialog">
      <div
        v-if="modelValue"
        v-show="!isMinimized"
        ref="dialogMask"
        class="mac-dialog-mask"
        :class="{minimized: isMinimized}"
        :inert="isMinimized"
        :aria-hidden="isMinimized ? 'true' : undefined"
        :style="{zIndex: dialogZIndex}"
        role="presentation"
        @pointerdown="activateDialog"
        @click.self="handleMaskClick"
      >
        <section
          ref="dialogPanel"
          class="mac-dialog-panel"
          :class="[panelClass, {maximized: dialogViewState.maximized}]"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          :style="{maxWidth: width, width: width}"
          tabindex="-1"
        >
          <header class="mac-dialog-head">
            <MacWindowControls
              :close-disabled="closeDisabled"
              :maximized="isMaximized"
              @close="requestClose"
              @minimize="minimize"
              @toggle-maximize="toggleMaximize"
            />
            <div class="mac-dialog-title-block">
              <h3 :id="titleId" class="mac-dialog-title">{{ title }}</h3>
              <p v-if="subtitle" class="mac-dialog-subtitle">{{ subtitle }}</p>
            </div>
            <button
              class="mac-dialog-close"
              type="button"
              :disabled="closeDisabled"
              aria-label="取消并关闭弹窗"
              @click="requestClose"
            >
              ×
            </button>
          </header>

          <div class="mac-dialog-body">
            <slot/>
          </div>

          <footer v-if="$slots.footer" class="mac-dialog-actions">
            <slot name="footer"/>
          </footer>
        </section>
      </div>
    </Transition>
    <Transition name="mac-dialog-dock">
      <button
        v-if="modelValue && isMinimized"
        ref="restoreButton"
        class="mac-dialog-minimized"
        type="button"
        :aria-label="`恢复${title}弹窗`"
        :style="{bottom: dockBottom, zIndex: dialogZIndex}"
        @click="restore"
      >
        <span class="mac-dialog-minimized-dot" aria-hidden="true"></span>
        <span class="mac-dialog-minimized-title">{{ title }}</span>
        <strong>点击恢复</strong>
      </button>
    </Transition>
  </Teleport>
</template>

<script>
import {reactive} from 'vue'

import MacWindowControls from './MacWindowControls.vue'
import {
  DIALOG_VIEW_ACTION,
  canRequestDialogClose,
  createDialogViewState,
  reduceDialogViewState
} from './macDialogState.js'

let dialogIdSeed = 0

const DIALOG_Z_INDEX_BASE = 90
const DIALOG_Z_INDEX_STEP = 2
const DOCK_BOTTOM_BASE_PX = 20
const DOCK_VERTICAL_STEP_PX = 60
const FOCUSABLE_ELEMENT_SELECTOR = [
  'button:not(:disabled)',
  'a[href]',
  'input:not(:disabled)',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  '[tabindex]:not([tabindex="-1"])'
].join(',')
const activeDialogIdStack = reactive([])

export default {
  name: 'MacDialog',
  components: {
    MacWindowControls
  },
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      required: true
    },
    subtitle: {
      type: String,
      default: ''
    },
    width: {
      type: String,
      default: '720px'
    },
    closeOnMask: {
      type: Boolean,
      default: true
    },
    closeDisabled: {
      type: Boolean,
      default: false
    },
    panelClass: {
      type: [String, Array, Object],
      default: ''
    }
  },
  emits: [
    'update:modelValue',
    'cancel',
    'close',
    'minimize',
    'restore',
    'maximize-change'
  ],
  data() {
    dialogIdSeed += 1
    return {
      dialogId: dialogIdSeed,
      dialogViewState: createDialogViewState(),
      focusReturnElement: null,
      isKeydownListening: false
    }
  },
  computed: {
    isMinimized() {
      return this.dialogViewState.minimized
    },
    isMaximized() {
      return this.dialogViewState.maximized
    },
    dialogStackIndex() {
      return activeDialogIdStack.indexOf(this.dialogId)
    },
    dialogZIndex() {
      const stackIndex = Math.max(this.dialogStackIndex, 0)
      return DIALOG_Z_INDEX_BASE + stackIndex * DIALOG_Z_INDEX_STEP
    },
    dockBottom() {
      const stackIndex = Math.max(this.dialogStackIndex, 0)
      return `${DOCK_BOTTOM_BASE_PX + stackIndex * DOCK_VERTICAL_STEP_PX}px`
    },
    titleId() {
      return `mac-dialog-title-${this.dialogId}`
    }
  },
  watch: {
    modelValue(isOpen) {
      this.resetViewState()
      if (isOpen) {
        this.activateDialog()
        this.addKeydownListener()
        return
      }

      this.deactivateDialog()
      this.focusReturnElement = null
    }
  },
  mounted() {
    if (this.modelValue) {
      this.activateDialog()
      this.addKeydownListener()
    }
  },
  beforeUnmount() {
    this.deactivateDialog()
  },
  methods: {
    resetViewState() {
      this.dialogViewState = reduceDialogViewState(
        this.dialogViewState,
        DIALOG_VIEW_ACTION.RESET
      )
    },
    requestClose() {
      const canClose = canRequestDialogClose({
        modelValue: this.modelValue,
        closeDisabled: this.closeDisabled
      })
      if (!canClose) {
        return
      }

      this.deactivateDialog()
      this.resetViewState()
      this.$emit('update:modelValue', false)
      this.$emit('cancel')
      this.$emit('close')
    },
    close() {
      this.requestClose()
    },
    addKeydownListener() {
      if (this.isKeydownListening) {
        return
      }

      document.addEventListener('keydown', this.handleKeydown)
      this.isKeydownListening = true
    },
    removeKeydownListener() {
      if (!this.isKeydownListening) {
        return
      }

      document.removeEventListener('keydown', this.handleKeydown)
      this.isKeydownListening = false
    },
    removeFromDialogStack() {
      const stackIndex = activeDialogIdStack.indexOf(this.dialogId)
      if (stackIndex >= 0) {
        activeDialogIdStack.splice(stackIndex, 1)
      }
    },
    activateDialog() {
      if (!this.modelValue) {
        return
      }

      this.removeFromDialogStack()
      activeDialogIdStack.push(this.dialogId)
    },
    deactivateDialog() {
      this.removeKeydownListener()
      this.removeFromDialogStack()
    },
    isTopmostDialog() {
      return activeDialogIdStack.at(-1) === this.dialogId
    },
    minimize() {
      const nextState = reduceDialogViewState(
        this.dialogViewState,
        DIALOG_VIEW_ACTION.MINIMIZE,
        this.closeDisabled
      )
      if (nextState.minimized === this.dialogViewState.minimized) {
        return
      }

      const dialogPanel = this.$refs.dialogPanel
      const activeElement = document.activeElement
      this.focusReturnElement = dialogPanel?.contains(activeElement)
        ? activeElement
        : null
      this.dialogViewState = nextState
      this.activateDialog()
      this.$emit('minimize')
      this.$nextTick(() => {
        this.$refs.restoreButton?.focus()
      })
    },
    restore() {
      const nextState = reduceDialogViewState(
        this.dialogViewState,
        DIALOG_VIEW_ACTION.RESTORE
      )
      if (nextState.minimized === this.dialogViewState.minimized) {
        return
      }

      this.dialogViewState = nextState
      this.activateDialog()
      this.$emit('restore')
      this.$nextTick(() => {
        this.restoreDialogFocus()
      })
    },
    restoreDialogFocus() {
      const dialogPanel = this.$refs.dialogPanel
      if (!dialogPanel) {
        return
      }

      const focusReturnElement = this.focusReturnElement
      if (
        focusReturnElement?.isConnected
        && dialogPanel.contains(focusReturnElement)
      ) {
        focusReturnElement.focus()
        this.focusReturnElement = null
        return
      }

      const firstFocusableElement = dialogPanel.querySelector(
        FOCUSABLE_ELEMENT_SELECTOR
      )
      const focusTarget = firstFocusableElement || dialogPanel
      focusTarget.focus()
      this.focusReturnElement = null
    },
    toggleMaximize() {
      this.dialogViewState = reduceDialogViewState(
        this.dialogViewState,
        DIALOG_VIEW_ACTION.TOGGLE_MAXIMIZE,
        this.closeDisabled
      )
      this.activateDialog()
      this.$emit('maximize-change', this.dialogViewState.maximized)
    },
    handleMaskClick() {
      if (this.closeOnMask) {
        this.requestClose()
      }
    },
    handleKeydown(event) {
      if (
        event.defaultPrevented
        || event.key !== 'Escape'
        || !this.isTopmostDialog()
      ) {
        return
      }

      event.preventDefault()
      this.requestClose()
    }
  }
}
</script>

<style scoped>
.mac-dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(1, 8, 16, 0.52);
  backdrop-filter: blur(14px) saturate(132%);
}

.mac-dialog-mask.minimized {
  pointer-events: none;
}

.mac-dialog-panel {
  width: min(100%, 720px);
  max-height: calc(100vh - 48px);
  max-height: calc(100dvh - 48px);
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(221, 239, 255, 0.2);
  border-radius: 26px;
  background:
    linear-gradient(180deg, rgba(26, 57, 72, 0.84), rgba(8, 22, 36, 0.88)),
    rgba(10, 26, 40, 0.74);
  box-shadow:
    0 36px 96px rgba(0, 7, 18, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(30px) saturate(160%);
  overflow: hidden;
}

.mac-dialog-panel.maximized {
  width: calc(100vw - 32px) !important;
  width: calc(
    100vw - 32px - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px)
  ) !important;
  height: calc(100vh - 32px);
  height: calc(100dvh - 32px);
  height: calc(
    100dvh - 32px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)
  );
  max-width: none !important;
  max-height: none;
}

.mac-dialog-head {
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 14px;
  align-items: start;
  padding: 18px 20px;
  border-bottom: 1px solid rgba(226, 241, 255, 0.12);
}

.mac-dialog-title {
  margin: 0;
  color: #f2f9ff;
  font-size: 18px;
  line-height: 1.25;
}

.mac-dialog-subtitle {
  margin: 4px 0 0;
  color: rgba(219, 235, 247, 0.68);
  font-size: 13px;
  line-height: 1.5;
}

.mac-dialog-close {
  width: 34px;
  height: 34px;
  border: 1px solid rgba(226, 241, 255, 0.18);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(238, 248, 255, 0.9);
  cursor: pointer;
  transition: opacity 160ms ease, background 160ms ease, border-color 160ms ease;
}

.mac-dialog-close:hover:not(:disabled) {
  border-color: rgba(118, 221, 230, 0.46);
  background: rgba(86, 202, 214, 0.18);
}

.mac-dialog-close:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

.mac-dialog-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 20px;
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  scrollbar-color: rgba(92, 205, 217, 0.42) rgba(255, 255, 255, 0.04);
}

.mac-dialog-body::-webkit-scrollbar {
  width: 6px;
}

.mac-dialog-body::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.04);
}

.mac-dialog-body::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(142, 184, 194, 0.32);
}

.mac-dialog-body::-webkit-scrollbar-thumb:hover {
  background: rgba(75, 211, 222, 0.68);
}

.mac-dialog-actions {
  flex: 0 0 auto;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px 18px;
  border-top: 1px solid rgba(226, 241, 255, 0.12);
  background:
    linear-gradient(180deg, rgba(10, 28, 42, 0), rgba(8, 22, 36, 0.88) 34%),
    rgba(8, 22, 36, 0.56);
  backdrop-filter: blur(18px) saturate(145%);
}

.mac-dialog-minimized {
  position: fixed;
  left: 20px;
  bottom: 20px;
  z-index: 90;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  max-width: min(420px, calc(100vw - 40px));
  min-height: 48px;
  padding: 10px 14px;
  border: 1px solid rgba(219, 241, 248, 0.22);
  border-radius: 16px;
  background:
    linear-gradient(135deg, rgba(28, 64, 78, 0.78), rgba(8, 24, 37, 0.84)),
    rgba(10, 27, 40, 0.74);
  box-shadow: 0 18px 48px rgba(0, 8, 18, 0.38), inset 0 1px 0 rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(24px) saturate(155%);
  color: #eaf8ff;
  cursor: pointer;
}

.mac-dialog-minimized:hover {
  border-color: rgba(91, 220, 229, 0.48);
  background:
    linear-gradient(135deg, rgba(33, 79, 91, 0.86), rgba(9, 30, 43, 0.9)),
    rgba(10, 27, 40, 0.8);
}

.mac-dialog-minimized-dot {
  flex: 0 0 auto;
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #febc2e;
  box-shadow: 0 0 12px rgba(254, 188, 46, 0.5);
}

.mac-dialog-minimized-title {
  overflow: hidden;
  color: rgba(231, 246, 252, 0.82);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mac-dialog-minimized strong {
  flex: 0 0 auto;
  color: #71dfe6;
  font-size: 12px;
}

.mac-dialog-enter-active,
.mac-dialog-leave-active {
  transition: opacity 180ms cubic-bezier(0.2, 0.9, 0.2, 1);
}

.mac-dialog-leave-active.mac-dialog-mask {
  pointer-events: none;
}

.mac-dialog-enter-active .mac-dialog-panel,
.mac-dialog-leave-active .mac-dialog-panel {
  transition: transform 220ms cubic-bezier(0.2, 0.9, 0.2, 1), opacity 180ms ease;
}

.mac-dialog-dock-enter-active,
.mac-dialog-dock-leave-active {
  transition: transform 220ms cubic-bezier(0.2, 0.9, 0.2, 1), opacity 180ms ease;
}

.mac-dialog-enter-from,
.mac-dialog-leave-to {
  opacity: 0;
}

.mac-dialog-enter-from .mac-dialog-panel,
.mac-dialog-leave-to .mac-dialog-panel,
.mac-dialog-dock-enter-from,
.mac-dialog-dock-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.985);
}

@media (max-width: 720px) {
  .mac-dialog-mask {
    align-items: flex-end;
    padding: 12px;
    padding-top: max(8px, env(safe-area-inset-top, 0px));
    padding-right: max(8px, env(safe-area-inset-right, 0px));
    padding-bottom: max(8px, env(safe-area-inset-bottom, 0px));
    padding-left: max(8px, env(safe-area-inset-left, 0px));
  }

  .mac-dialog-panel {
    max-width: calc(100vw - 16px) !important;
    max-width: calc(
      100vw - 16px - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px)
    ) !important;
    max-height: calc(100vh - 16px);
    max-height: calc(100dvh - 16px);
    max-height: calc(
      100dvh - 16px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)
    );
    border-radius: 22px;
  }

  .mac-dialog-panel.maximized {
    width: calc(100vw - 16px) !important;
    width: calc(
      100vw - 16px - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px)
    ) !important;
    height: calc(100vh - 16px);
    height: calc(100dvh - 16px);
    height: calc(
      100dvh - 16px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)
    );
    max-width: none !important;
    max-height: none;
  }

  .mac-dialog-head {
    grid-template-columns: 1fr auto;
  }

  .mac-dialog-head :deep(.mac-window-controls) {
    display: none;
  }

  .mac-dialog-minimized {
    right: 12px;
    bottom: 12px;
    left: 12px;
    max-width: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mac-dialog-enter-active,
  .mac-dialog-leave-active,
  .mac-dialog-enter-active .mac-dialog-panel,
  .mac-dialog-leave-active .mac-dialog-panel,
  .mac-dialog-dock-enter-active,
  .mac-dialog-dock-leave-active {
    transition-duration: 1ms;
  }
}
</style>
