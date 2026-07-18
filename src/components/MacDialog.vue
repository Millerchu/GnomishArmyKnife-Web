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
          :class="[panelClass, {maximized: dialogViewState.maximized, dragging: isDragging}]"
          :inert="isCloseConfirmationVisible || undefined"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          :style="panelStyle"
          tabindex="-1"
        >
          <header
            class="mac-dialog-head"
            :class="{draggable: isDesktopDragAvailable}"
            @pointerdown="startDrag"
            @pointermove="moveDrag"
            @pointerup="endDrag"
            @pointercancel="endDrag"
          >
            <div class="mac-dialog-window-controls" @pointerdown.stop>
              <MacWindowControls
                :close-disabled="closeDisabled"
                :maximized="isMaximized"
                @close="requestClose"
                @minimize="minimize"
                @toggle-maximize="toggleMaximize"
              />
            </div>
            <div class="mac-dialog-title-block">
              <h3 :id="titleId" class="mac-dialog-title">{{ title }}</h3>
              <p v-if="subtitle" class="mac-dialog-subtitle">{{ subtitle }}</p>
            </div>
          </header>

          <div class="mac-dialog-body">
            <slot/>
          </div>

          <footer v-if="$slots.footer" class="mac-dialog-actions">
            <slot name="footer"/>
          </footer>
        </section>

        <Transition name="mac-dialog-confirm">
          <div
            v-if="isCloseConfirmationVisible"
            class="mac-dialog-confirm-layer"
            role="presentation"
            @click.stop
          >
            <section
              ref="closeConfirmation"
              class="mac-dialog-confirm-card"
              role="alertdialog"
              aria-modal="true"
              :aria-labelledby="closeConfirmationTitleId"
              :aria-describedby="closeConfirmationDescriptionId"
              @keydown.tab="handleCloseConfirmationTab"
            >
              <div class="mac-dialog-confirm-icon" aria-hidden="true">!</div>
              <div class="mac-dialog-confirm-copy">
                <span>未保存的内容</span>
                <h4 :id="closeConfirmationTitleId">放弃未保存的更改？</h4>
                <p :id="closeConfirmationDescriptionId">
                  “{{ title }}”中的修改尚未保存。关闭后，本次填写内容将无法恢复。
                </p>
              </div>
              <div class="mac-dialog-confirm-actions">
                <button
                  ref="continueEditingButton"
                  type="button"
                  class="mac-dialog-confirm-keep"
                  @click="dismissCloseConfirmation"
                >
                  继续填写
                </button>
                <button
                  type="button"
                  class="mac-dialog-confirm-discard"
                  @click="confirmClose"
                >
                  放弃更改并关闭
                </button>
              </div>
            </section>
          </div>
        </Transition>
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
const DIALOG_DRAG_GUTTER_PX = 12
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
      default: false
    },
    confirmOnDirty: {
      type: Boolean,
      default: true
    },
    dirty: {
      type: Boolean,
      default: null
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
      isKeydownListening: false,
      viewportWidth: typeof window === 'undefined' ? 0 : window.innerWidth,
      dragOffset: {x: 0, y: 0},
      dragState: null,
      initialEditableState: null,
      isCloseConfirmationVisible: false,
      closeRequestFocusElement: null
    }
  },
  computed: {
    isMinimized() {
      return this.dialogViewState.minimized
    },
    isMaximized() {
      return this.dialogViewState.maximized
    },
    isDragging() {
      return this.dragState !== null
    },
    isDesktopDragAvailable() {
      return !this.isMinimized
        && !this.isMaximized
        && this.viewportWidth > 720
    },
    panelStyle() {
      return {
        maxWidth: this.width,
        width: this.width,
        '--mac-dialog-drag-x': `${this.dragOffset.x}px`,
        '--mac-dialog-drag-y': `${this.dragOffset.y}px`
      }
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
    },
    closeConfirmationTitleId() {
      return `mac-dialog-close-confirmation-title-${this.dialogId}`
    },
    closeConfirmationDescriptionId() {
      return `mac-dialog-close-confirmation-description-${this.dialogId}`
    }
  },
  watch: {
    modelValue(isOpen) {
      this.resetViewState()
      if (isOpen) {
        this.activateDialog()
        this.addKeydownListener()
        this.captureInitialEditableState()
        return
      }

      this.resetCloseProtection()
      this.deactivateDialog()
      this.focusReturnElement = null
    }
  },
  mounted() {
    window.addEventListener('resize', this.updateViewportWidth)
    if (this.modelValue) {
      this.activateDialog()
      this.addKeydownListener()
      this.captureInitialEditableState()
    }
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.updateViewportWidth)
    this.deactivateDialog()
  },
  methods: {
    resetViewState() {
      this.dialogViewState = reduceDialogViewState(
        this.dialogViewState,
        DIALOG_VIEW_ACTION.RESET
      )
      this.resetDragOffset()
    },
    resetDragOffset() {
      this.dragOffset = {x: 0, y: 0}
      this.dragState = null
    },
    requestClose() {
      const canClose = canRequestDialogClose({
        modelValue: this.modelValue,
        closeDisabled: this.closeDisabled
      })
      if (!canClose) {
        return
      }

      if (this.shouldConfirmClose()) {
        this.openCloseConfirmation()
        return
      }

      this.performClose()
    },
    performClose() {
      this.resetCloseProtection()
      this.deactivateDialog()
      this.resetViewState()
      this.$emit('update:modelValue', false)
      this.$emit('cancel')
      this.$emit('close')
    },
    confirmClose() {
      this.performClose()
    },
    openCloseConfirmation() {
      if (this.isCloseConfirmationVisible) {
        return
      }

      // 最小化状态下确认层不可见，先恢复原弹窗再询问，避免关闭请求没有反馈。
      if (this.isMinimized) {
        this.restore()
      }
      this.closeRequestFocusElement = document.activeElement
      this.isCloseConfirmationVisible = true
      this.$nextTick(() => {
        this.$refs.continueEditingButton?.focus()
      })
    },
    dismissCloseConfirmation() {
      if (!this.isCloseConfirmationVisible) {
        return
      }

      const focusTarget = this.closeRequestFocusElement
      this.isCloseConfirmationVisible = false
      this.closeRequestFocusElement = null
      this.$nextTick(() => {
        if (focusTarget?.isConnected) {
          focusTarget.focus()
          return
        }
        this.$refs.dialogPanel?.focus()
      })
    },
    resetCloseProtection() {
      this.initialEditableState = null
      this.isCloseConfirmationVisible = false
      this.closeRequestFocusElement = null
    },
    captureInitialEditableState() {
      this.initialEditableState = null
      this.$nextTick(() => {
        if (this.modelValue) {
          this.initialEditableState = this.serializeEditableState()
        }
      })
    },
    serializeEditableState() {
      const editableElements = this.$refs.dialogPanel?.querySelectorAll([
        'input:not([type="button"]):not([type="submit"]):not([type="reset"])',
        'select',
        'textarea',
        '[contenteditable="true"]'
      ].join(',')) || []

      const editableState = [...editableElements].map((element) => {
        const tagName = element.tagName.toLowerCase()
        const inputType = element.type || ''
        let value = element.value
        if (inputType === 'checkbox' || inputType === 'radio') {
          value = element.checked
        } else if (inputType === 'file') {
          value = [...(element.files || [])]
            .map((file) => [file.name, file.size, file.lastModified])
        } else if (tagName === 'select' && element.multiple) {
          value = [...element.selectedOptions].map((option) => option.value)
        } else if (element.isContentEditable) {
          value = element.textContent
        }

        return [tagName, inputType, Boolean(element.disabled), value]
      })
      return JSON.stringify(editableState)
    },
    shouldConfirmClose() {
      if (!this.confirmOnDirty) {
        return false
      }
      if (this.dirty !== null) {
        return this.dirty
      }
      if (this.initialEditableState === null) {
        return false
      }
      return this.serializeEditableState() !== this.initialEditableState
    },
    handleCloseConfirmationTab(event) {
      const focusableElements = [...(this.$refs.closeConfirmation?.querySelectorAll(
        FOCUSABLE_ELEMENT_SELECTOR
      ) || [])]
      if (focusableElements.length === 0) {
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements.at(-1)
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
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

      this.resetDragOffset()
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
      this.resetDragOffset()
      this.dialogViewState = reduceDialogViewState(
        this.dialogViewState,
        DIALOG_VIEW_ACTION.TOGGLE_MAXIMIZE,
        this.closeDisabled
      )
      this.activateDialog()
      this.$emit('maximize-change', this.dialogViewState.maximized)
    },
    startDrag(event) {
      if (
        !this.isDesktopDragAvailable
        || event.button !== 0
        || event.isPrimary === false
        || event.target.closest('button, a, input, select, textarea, [data-dialog-no-drag]')
      ) {
        return
      }

      const dialogPanel = this.$refs.dialogPanel
      const dialogMask = this.$refs.dialogMask
      if (!dialogPanel || !dialogMask) {
        return
      }

      const panelRect = dialogPanel.getBoundingClientRect()
      const maskRect = dialogMask.getBoundingClientRect()
      const minX = this.dragOffset.x + maskRect.left + DIALOG_DRAG_GUTTER_PX - panelRect.left
      const maxX = this.dragOffset.x + maskRect.right - DIALOG_DRAG_GUTTER_PX - panelRect.right
      const minY = this.dragOffset.y + maskRect.top + DIALOG_DRAG_GUTTER_PX - panelRect.top
      const maxY = this.dragOffset.y + maskRect.bottom - DIALOG_DRAG_GUTTER_PX - panelRect.bottom

      this.dragState = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: this.dragOffset.x,
        originY: this.dragOffset.y,
        minX: Math.min(minX, maxX),
        maxX: Math.max(minX, maxX),
        minY: Math.min(minY, maxY),
        maxY: Math.max(minY, maxY)
      }
      event.currentTarget.setPointerCapture?.(event.pointerId)
      event.preventDefault()
    },
    moveDrag(event) {
      if (!this.dragState || event.pointerId !== this.dragState.pointerId) {
        return
      }

      const x = this.dragState.originX + event.clientX - this.dragState.startX
      const y = this.dragState.originY + event.clientY - this.dragState.startY
      this.dragOffset = {
        x: Math.min(this.dragState.maxX, Math.max(this.dragState.minX, x)),
        y: Math.min(this.dragState.maxY, Math.max(this.dragState.minY, y))
      }
    },
    endDrag(event) {
      if (!this.dragState || event.pointerId !== this.dragState.pointerId) {
        return
      }

      event.currentTarget.releasePointerCapture?.(event.pointerId)
      this.dragState = null
    },
    updateViewportWidth() {
      this.viewportWidth = window.innerWidth
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
      if (this.isCloseConfirmationVisible) {
        this.dismissCloseConfirmation()
        return
      }
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
  background:
    radial-gradient(circle at 50% 18%, var(--theme-accent-soft), transparent 34%),
    var(--theme-scrim);
  backdrop-filter: blur(20px) saturate(118%);
  -webkit-backdrop-filter: blur(20px) saturate(118%);
}

.mac-dialog-mask.minimized {
  pointer-events: none;
}

.mac-dialog-panel {
  position: relative;
  isolation: isolate;
  width: min(100%, 720px);
  max-height: calc(100vh - 48px);
  max-height: calc(100dvh - 48px);
  display: flex;
  flex-direction: column;
  border: 1px solid var(--theme-border-strong);
  border-radius: 20px;
  background:
    linear-gradient(180deg, var(--theme-highlight), transparent 22%),
    radial-gradient(circle at 14% 0%, var(--theme-accent-soft), transparent 34%),
    var(--theme-surface-raised);
  box-shadow:
    var(--theme-shadow-lg),
    inset 0 1px 0 var(--theme-highlight),
    inset 0 0 0 1px var(--theme-highlight-soft);
  backdrop-filter: blur(46px) saturate(135%);
  -webkit-backdrop-filter: blur(46px) saturate(135%);
  color: var(--theme-text);
  color-scheme: inherit;
  overflow: hidden;
  transform: translate3d(var(--mac-dialog-drag-x, 0px), var(--mac-dialog-drag-y, 0px), 0);
}

.mac-dialog-panel::before {
  position: absolute;
  inset: 0;
  z-index: 4;
  border-radius: inherit;
  box-shadow:
    inset 0 1px 0 var(--theme-highlight),
    inset 1px 0 0 var(--theme-highlight-soft),
    inset -1px 0 0 var(--theme-divider),
    inset 0 -1px 0 var(--theme-divider);
  content: '';
  pointer-events: none;
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
  transform: none;
}

.mac-dialog-head {
  position: relative;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 64px;
  padding: 12px 104px 11px;
  border-bottom: 1px solid var(--theme-divider);
  background:
    linear-gradient(180deg, var(--theme-highlight-soft), transparent),
    var(--theme-surface-muted);
  box-shadow: inset 0 -1px 0 var(--theme-divider);
}

.mac-dialog-window-controls {
  position: absolute;
  top: 50%;
  left: 15px;
  transform: translateY(-50%);
}

.mac-dialog-title-block {
  min-width: 0;
  text-align: center;
}

.mac-dialog-head.draggable {
  cursor: grab;
  user-select: none;
}

.mac-dialog-panel.dragging,
.mac-dialog-panel.dragging .mac-dialog-head {
  cursor: grabbing;
}

.mac-dialog-panel.dragging {
  transition: none !important;
}

.mac-dialog-title {
  margin: 0;
  color: var(--theme-text);
  font-size: 15px;
  font-weight: 650;
  line-height: 1.3;
  letter-spacing: -0.012em;
}

.mac-dialog-subtitle {
  margin: 2px 0 0;
  overflow: hidden;
  color: var(--theme-text-muted);
  font-size: 11px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mac-dialog-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
  touch-action: pan-y;
  -webkit-overflow-scrolling: touch;
  padding: 20px;
  background: color-mix(in srgb, var(--theme-surface) 46%, transparent);
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  scrollbar-color: var(--theme-scrollbar) transparent;
}

.mac-dialog-body::-webkit-scrollbar {
  width: 6px;
}

.mac-dialog-body::-webkit-scrollbar-track {
  background: transparent;
}

.mac-dialog-body::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: var(--theme-scrollbar);
}

.mac-dialog-body::-webkit-scrollbar-thumb:hover {
  background: var(--theme-scrollbar-hover);
}

.mac-dialog-actions {
  flex: 0 0 auto;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 13px 18px 15px;
  border-top: 1px solid var(--theme-divider);
  background:
    linear-gradient(180deg, var(--theme-highlight-soft), transparent),
    var(--theme-surface);
  backdrop-filter: blur(26px) saturate(125%);
  -webkit-backdrop-filter: blur(26px) saturate(125%);
  padding-bottom: max(15px, env(safe-area-inset-bottom, 0px));
}

.mac-dialog-panel :deep(input:not([type="checkbox"]):not([type="radio"]):not([type="file"])),
.mac-dialog-panel :deep(select),
.mac-dialog-panel :deep(textarea) {
  border: 1px solid var(--theme-border) !important;
  border-radius: 10px !important;
  background:
    linear-gradient(180deg, var(--theme-highlight-soft), transparent),
    var(--theme-field-surface) !important;
  box-shadow:
    inset 0 1px 0 var(--theme-highlight-soft),
    var(--theme-shadow-xs) !important;
  backdrop-filter: blur(20px) saturate(118%);
  -webkit-backdrop-filter: blur(20px) saturate(118%);
}

.mac-dialog-panel :deep(input:not([type="checkbox"]):not([type="radio"]):not([type="file"]):focus),
.mac-dialog-panel :deep(select:focus),
.mac-dialog-panel :deep(textarea:focus) {
  border-color: var(--theme-accent) !important;
  box-shadow:
    0 0 0 3px var(--theme-focus-ring),
    inset 0 1px 0 var(--theme-highlight-soft) !important;
}

.mac-dialog-panel :deep(.action-btn) {
  border-color: color-mix(in srgb, var(--theme-accent) 70%, var(--theme-border)) !important;
  background: linear-gradient(180deg, var(--theme-accent), var(--theme-accent-strong)) !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.28),
    var(--theme-shadow-xs) !important;
  color: #fff !important;
}

.mac-dialog-panel :deep(.ghost-btn),
.mac-dialog-panel :deep(.mini-btn) {
  border-color: var(--theme-border) !important;
  background:
    linear-gradient(180deg, var(--theme-highlight-soft), transparent),
    var(--theme-control-surface) !important;
  box-shadow: inset 0 1px 0 var(--theme-highlight-soft) !important;
  color: var(--theme-text-soft) !important;
}

.mac-dialog-panel :deep(.action-btn),
.mac-dialog-panel :deep(.ghost-btn),
.mac-dialog-panel :deep(.mini-btn) {
  transition:
    filter 150ms ease,
    border-color 150ms ease,
    box-shadow 150ms ease,
    transform 150ms ease !important;
}

.mac-dialog-panel :deep(.action-btn:not(:disabled):hover),
.mac-dialog-panel :deep(.ghost-btn:not(:disabled):hover),
.mac-dialog-panel :deep(.mini-btn:not(:disabled):hover) {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

.mac-dialog-confirm-layer {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: grid;
  place-items: center;
  padding: 24px;
  background: color-mix(in srgb, var(--theme-scrim) 88%, transparent);
  backdrop-filter: blur(16px) saturate(112%);
  -webkit-backdrop-filter: blur(16px) saturate(112%);
}

.mac-dialog-confirm-card {
  width: min(100%, 460px);
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 16px;
  padding: 22px;
  border: 1px solid var(--theme-border-strong);
  border-radius: 18px;
  background:
    linear-gradient(180deg, var(--theme-highlight), transparent),
    var(--theme-popover-surface);
  box-shadow:
    var(--theme-shadow-lg),
    inset 0 1px 0 var(--theme-highlight);
  backdrop-filter: blur(42px) saturate(125%);
  -webkit-backdrop-filter: blur(42px) saturate(125%);
  color: var(--theme-text);
}

.mac-dialog-confirm-icon {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--theme-warning) 34%, transparent);
  border-radius: 11px;
  background: linear-gradient(180deg, rgba(255, 190, 62, 0.24), rgba(255, 159, 10, 0.12));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16);
  color: var(--theme-warning);
  font-size: 20px;
  font-weight: 800;
}

.mac-dialog-confirm-copy > span {
  display: block;
  margin-bottom: 5px;
  color: var(--theme-warning);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.mac-dialog-confirm-copy h4 {
  margin: 0;
  font-size: 19px;
  line-height: 1.35;
}

.mac-dialog-confirm-copy p {
  margin: 8px 0 0;
  color: var(--theme-text-muted);
  font-size: 14px;
  line-height: 1.65;
}

.mac-dialog-confirm-actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 4px;
}

.mac-dialog-confirm-actions button {
  min-height: 40px;
  padding: 9px 15px;
  border-radius: 999px;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: border-color 150ms ease, background 150ms ease, transform 150ms ease;
}

.mac-dialog-confirm-actions button:active {
  transform: translateY(1px);
}

.mac-dialog-confirm-actions button:focus-visible {
  outline: 3px solid var(--theme-focus-ring);
  outline-offset: 2px;
}

.mac-dialog-confirm-keep {
  border: 1px solid color-mix(in srgb, var(--theme-accent) 68%, var(--theme-border));
  background: linear-gradient(180deg, var(--theme-accent), var(--theme-accent-strong));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.28), 0 5px 16px rgba(0, 96, 214, 0.22);
  color: #fff;
}

.mac-dialog-confirm-keep:hover {
  border-color: var(--theme-accent);
  background: linear-gradient(180deg, color-mix(in srgb, var(--theme-accent) 82%, white), var(--theme-accent));
}

.mac-dialog-confirm-discard {
  border: 1px solid color-mix(in srgb, var(--theme-danger) 30%, transparent);
  background: var(--theme-danger-soft);
  color: var(--theme-danger);
}

.mac-dialog-confirm-discard:hover {
  border-color: color-mix(in srgb, var(--theme-danger) 48%, transparent);
  background: color-mix(in srgb, var(--theme-danger) 16%, transparent);
}

.mac-dialog-confirm-enter-active,
.mac-dialog-confirm-leave-active {
  transition: opacity 160ms ease;
}

.mac-dialog-confirm-enter-active .mac-dialog-confirm-card,
.mac-dialog-confirm-leave-active .mac-dialog-confirm-card {
  transition: opacity 160ms ease, transform 180ms cubic-bezier(0.2, 0.9, 0.2, 1);
}

.mac-dialog-confirm-enter-from,
.mac-dialog-confirm-leave-to,
.mac-dialog-confirm-enter-from .mac-dialog-confirm-card,
.mac-dialog-confirm-leave-to .mac-dialog-confirm-card {
  opacity: 0;
}

.mac-dialog-confirm-enter-from .mac-dialog-confirm-card,
.mac-dialog-confirm-leave-to .mac-dialog-confirm-card {
  transform: translateY(8px) scale(0.98);
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
  border: 1px solid var(--theme-border-strong);
  border-radius: 15px;
  background:
    linear-gradient(180deg, var(--theme-highlight), transparent),
    var(--theme-surface-raised);
  box-shadow: var(--theme-shadow-md), inset 0 1px 0 var(--theme-highlight);
  backdrop-filter: blur(34px) saturate(128%);
  -webkit-backdrop-filter: blur(34px) saturate(128%);
  color: var(--theme-text);
  cursor: pointer;
}

.mac-dialog-minimized:hover {
  border-color: var(--theme-border-strong);
  background:
    linear-gradient(180deg, var(--theme-highlight), transparent),
    var(--theme-popover-surface);
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
  color: var(--theme-text-soft);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mac-dialog-minimized strong {
  flex: 0 0 auto;
  color: var(--theme-link);
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
  transition: transform 260ms cubic-bezier(0.18, 0.89, 0.32, 1.2), opacity 180ms ease;
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
  transform: translateY(12px) scale(0.97);
}

@media (max-width: 720px) {
  .mac-dialog-mask {
    align-items: flex-end;
    min-height: 0;
    overflow: hidden;
    padding: 12px;
    padding-top: max(8px, env(safe-area-inset-top, 0px));
    padding-right: max(8px, env(safe-area-inset-right, 0px));
    padding-bottom: max(8px, env(safe-area-inset-bottom, 0px));
    padding-left: max(8px, env(safe-area-inset-left, 0px));
  }

  .mac-dialog-panel {
    min-height: 0;
    height: calc(100vh - 16px);
    height: calc(100dvh - 16px);
    height: calc(
      100dvh - 16px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)
    );
    max-width: calc(100vw - 16px) !important;
    max-width: calc(
      100vw - 16px - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px)
    ) !important;
    max-height: calc(100vh - 16px);
    max-height: calc(100dvh - 16px);
    max-height: calc(
      100dvh - 16px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)
    );
    border-radius: 20px;
  }

  .mac-dialog-head {
    min-height: 60px;
    padding: 11px 76px 10px;
  }

  .mac-dialog-body {
    flex: 1 1 0;
    height: 0;
    min-height: 0;
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior-y: contain;
    touch-action: pan-y pinch-zoom;
    padding: 16px;
    scrollbar-gutter: auto;
  }

  .mac-dialog-actions {
    position: relative;
    z-index: 1;
    flex: 0 0 auto;
    flex-wrap: wrap;
    padding: 12px 16px max(12px, env(safe-area-inset-bottom, 0px));
  }

  .mac-dialog-actions > * {
    min-height: 42px;
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

  .mac-dialog-window-controls {
    left: 11px;
  }

  .mac-dialog-minimized {
    right: 12px;
    bottom: 12px;
    left: 12px;
    max-width: none;
  }

  .mac-dialog-confirm-layer {
    align-items: end;
    padding: 12px;
  }

  .mac-dialog-confirm-card {
    width: 100%;
    padding: 18px;
    border-radius: 18px;
  }

  .mac-dialog-confirm-actions {
    flex-direction: column;
  }

  .mac-dialog-confirm-actions button {
    width: 100%;
    min-height: 44px;
  }
}

@media (max-height: 640px) and (orientation: landscape) {
  .mac-dialog-mask {
    align-items: center;
    padding: 8px;
  }

  .mac-dialog-panel {
    height: calc(100dvh - 16px);
    max-height: calc(100dvh - 16px);
    border-radius: 18px;
  }

  .mac-dialog-head {
    padding: 10px 14px;
  }

  .mac-dialog-body {
    padding: 12px 14px;
  }

  .mac-dialog-actions {
    padding: 9px 14px max(9px, env(safe-area-inset-bottom, 0px));
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

  .mac-dialog-confirm-enter-active,
  .mac-dialog-confirm-leave-active,
  .mac-dialog-confirm-enter-active .mac-dialog-confirm-card,
  .mac-dialog-confirm-leave-active .mac-dialog-confirm-card {
    transition-duration: 1ms;
  }
}
</style>
