<template>
  <Teleport to="body">
    <Transition name="system-dialog">
      <div
        v-if="activeDialog"
        class="system-dialog-mask"
        role="presentation"
        @pointerdown.self="cancelActiveDialog"
      >
        <section
          ref="dialogCard"
          class="system-dialog-card"
          :class="`is-${activeDialog.tone}`"
          :role="activeDialog.kind === 'confirm' ? 'alertdialog' : 'dialog'"
          aria-modal="true"
          :aria-labelledby="titleId"
          :aria-describedby="messageId"
          tabindex="-1"
          @keydown="handleKeydown"
        >
          <div class="system-dialog-symbol" aria-hidden="true">
            <svg v-if="activeDialog.tone === 'success'" viewBox="0 0 24 24">
              <path d="m7.2 12.3 3.1 3.1 6.7-7"/>
            </svg>
            <svg v-else viewBox="0 0 24 24">
              <path d="M12 8.1v5.2"/>
              <path d="M12 16.8h.01"/>
              <path d="M10.2 4.7 3.3 17a2 2 0 0 0 1.8 3h13.8a2 2 0 0 0 1.8-3L13.8 4.7a2 2 0 0 0-3.6 0Z"/>
            </svg>
          </div>

          <div class="system-dialog-copy">
            <span>{{ eyebrow }}</span>
            <h2 :id="titleId">{{ resolvedTitle }}</h2>
            <p :id="messageId">{{ activeDialog.message }}</p>
          </div>

          <div class="system-dialog-actions">
            <button
              v-if="activeDialog.kind === 'confirm'"
              ref="cancelButton"
              type="button"
              class="system-dialog-button secondary"
              @click="settleActiveDialog(false)"
            >
              {{ activeDialog.cancelText }}
            </button>
            <button
              ref="confirmButton"
              type="button"
              class="system-dialog-button primary"
              @click="settleActiveDialog(true)"
            >
              {{ activeDialog.confirmText }}
            </button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import {computed, nextTick, onBeforeUnmount, onMounted, ref} from 'vue'

import {registerSystemDialogPresenter} from './systemDialog.js'

const activeDialog = ref(null)
const dialogQueue = []
const dialogCard = ref(null)
const cancelButton = ref(null)
const confirmButton = ref(null)
const focusReturnElement = ref(null)
const titleId = 'system-dialog-title'
const messageId = 'system-dialog-message'
let unregisterPresenter = null

const eyebrow = computed(() => {
  if (activeDialog.value?.tone === 'success') return '操作完成'
  if (activeDialog.value?.tone === 'danger') return '请谨慎确认'
  return '需要注意'
})

const resolvedTitle = computed(() => {
  if (activeDialog.value?.title) return activeDialog.value.title
  if (activeDialog.value?.tone === 'success') return '已完成'
  if (activeDialog.value?.tone === 'danger') return '确认此操作？'
  return '请确认'
})

function presentNextDialog() {
  if (activeDialog.value || dialogQueue.length === 0) {
    return
  }
  focusReturnElement.value = document.activeElement
  activeDialog.value = dialogQueue.shift()
  nextTick(() => {
    const focusTarget = activeDialog.value?.kind === 'confirm'
      ? cancelButton.value
      : confirmButton.value
    focusTarget?.focus()
  })
}

function enqueueDialog(dialogRequest) {
  dialogQueue.push(dialogRequest)
  presentNextDialog()
}

function settleActiveDialog(result) {
  if (!activeDialog.value) {
    return
  }
  const settledDialog = activeDialog.value
  activeDialog.value = null
  settledDialog.resolve(result)
  nextTick(() => {
    if (focusReturnElement.value?.isConnected) {
      focusReturnElement.value.focus()
    }
    focusReturnElement.value = null
    presentNextDialog()
  })
}

function cancelActiveDialog() {
  if (activeDialog.value?.kind === 'confirm') {
    settleActiveDialog(false)
  }
}

function handleKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault()
    settleActiveDialog(activeDialog.value?.kind === 'alert')
    return
  }
  if (event.key !== 'Tab') {
    return
  }

  const focusableButtons = [...(dialogCard.value?.querySelectorAll('button:not(:disabled)') || [])]
  const firstButton = focusableButtons[0]
  const lastButton = focusableButtons.at(-1)
  if (event.shiftKey && document.activeElement === firstButton) {
    event.preventDefault()
    lastButton?.focus()
  } else if (!event.shiftKey && document.activeElement === lastButton) {
    event.preventDefault()
    firstButton?.focus()
  }
}

onMounted(() => {
  unregisterPresenter = registerSystemDialogPresenter(enqueueDialog)
})

onBeforeUnmount(() => {
  unregisterPresenter?.()
  activeDialog.value?.resolve(false)
  dialogQueue.splice(0).forEach((dialogRequest) => dialogRequest.resolve(false))
})
</script>

<style scoped>
.system-dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 24px;
  background:
    radial-gradient(circle at 50% 38%, var(--theme-accent-soft), transparent 34%),
    color-mix(in srgb, var(--theme-scrim) 92%, transparent);
  backdrop-filter: blur(22px) saturate(118%);
  -webkit-backdrop-filter: blur(22px) saturate(118%);
}

.system-dialog-card {
  position: relative;
  isolation: isolate;
  width: min(100%, 430px);
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  gap: 16px;
  padding: 24px;
  border: 1px solid var(--theme-border-strong);
  border-radius: 22px;
  background:
    linear-gradient(180deg, var(--theme-highlight), transparent 42%),
    radial-gradient(circle at 12% 0%, var(--system-dialog-tint), transparent 42%),
    var(--theme-popover-surface);
  box-shadow:
    0 28px 80px rgba(0, 0, 0, 0.28),
    0 8px 24px rgba(0, 0, 0, 0.12),
    inset 0 1px 0 var(--theme-highlight);
  backdrop-filter: blur(44px) saturate(138%);
  -webkit-backdrop-filter: blur(44px) saturate(138%);
  color: var(--theme-text);
  --system-dialog-color: var(--theme-warning);
  --system-dialog-tint: color-mix(in srgb, var(--theme-warning) 17%, transparent);
}

.system-dialog-card.is-danger {
  --system-dialog-color: var(--theme-danger);
  --system-dialog-tint: var(--theme-danger-soft);
}

.system-dialog-card.is-success {
  --system-dialog-color: var(--theme-success);
  --system-dialog-tint: color-mix(in srgb, var(--theme-success) 15%, transparent);
}

.system-dialog-card::after {
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  box-shadow: inset 0 0 0 1px var(--theme-highlight-soft);
  content: '';
  pointer-events: none;
}

.system-dialog-symbol {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--system-dialog-color) 30%, transparent);
  border-radius: 15px;
  background: color-mix(in srgb, var(--system-dialog-color) 13%, transparent);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18);
  color: var(--system-dialog-color);
}

.system-dialog-symbol svg {
  width: 25px;
  height: 25px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2;
}

.system-dialog-copy {
  min-width: 0;
}

.system-dialog-copy > span {
  display: block;
  margin: 1px 0 5px;
  color: var(--system-dialog-color);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
}

.system-dialog-copy h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.018em;
  line-height: 1.25;
}

.system-dialog-copy p {
  margin: 8px 0 0;
  color: var(--theme-text-muted);
  font-size: 14px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.system-dialog-actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 4px;
}

.system-dialog-button {
  min-width: 88px;
  min-height: 40px;
  padding: 9px 17px;
  border-radius: 999px;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition:
    transform 110ms ease-out,
    border-color 160ms ease,
    background 160ms ease,
    box-shadow 160ms ease;
}

.system-dialog-button:active {
  transform: scale(0.97);
  transition-duration: 80ms;
}

.system-dialog-button:focus-visible {
  outline: 3px solid var(--theme-focus-ring);
  outline-offset: 2px;
}

.system-dialog-button.secondary {
  border: 1px solid var(--theme-border);
  background: var(--theme-control-surface);
  color: var(--theme-text);
}

.system-dialog-button.secondary:hover {
  border-color: var(--theme-border-strong);
  background: color-mix(in srgb, var(--theme-control-surface) 82%, var(--theme-text) 8%);
}

.system-dialog-button.primary {
  border: 1px solid color-mix(in srgb, var(--system-dialog-color) 58%, transparent);
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--system-dialog-color) 86%, white),
    var(--system-dialog-color)
  );
  box-shadow:
    0 6px 18px color-mix(in srgb, var(--system-dialog-color) 24%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  color: #fff;
}

.system-dialog-button.primary:hover {
  filter: brightness(1.06);
}

.system-dialog-enter-active,
.system-dialog-leave-active {
  transition: opacity 180ms ease;
}

.system-dialog-enter-active .system-dialog-card,
.system-dialog-leave-active .system-dialog-card {
  transition:
    opacity 180ms ease,
    transform 320ms cubic-bezier(0.16, 1, 0.3, 1),
    backdrop-filter 240ms ease;
}

.system-dialog-enter-from,
.system-dialog-leave-to,
.system-dialog-enter-from .system-dialog-card,
.system-dialog-leave-to .system-dialog-card {
  opacity: 0;
}

.system-dialog-enter-from .system-dialog-card,
.system-dialog-leave-to .system-dialog-card {
  transform: translateY(10px) scale(0.965);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

@media (max-width: 520px) {
  .system-dialog-mask {
    align-items: end;
    padding:
      12px
      max(12px, env(safe-area-inset-right))
      max(12px, env(safe-area-inset-bottom))
      max(12px, env(safe-area-inset-left));
  }

  .system-dialog-card {
    width: 100%;
    grid-template-columns: 42px minmax(0, 1fr);
    gap: 13px;
    padding: 20px;
    border-radius: 22px;
  }

  .system-dialog-symbol {
    width: 42px;
    height: 42px;
    border-radius: 13px;
  }

  .system-dialog-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .system-dialog-actions .primary:only-child {
    grid-column: 1 / -1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .system-dialog-enter-active,
  .system-dialog-leave-active,
  .system-dialog-enter-active .system-dialog-card,
  .system-dialog-leave-active .system-dialog-card {
    transition-duration: 120ms;
  }

  .system-dialog-enter-from .system-dialog-card,
  .system-dialog-leave-to .system-dialog-card {
    transform: none;
  }
}

@media (prefers-reduced-transparency: reduce) {
  .system-dialog-mask {
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

  .system-dialog-card {
    background: var(--theme-surface-raised);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}

@media (prefers-contrast: more) {
  .system-dialog-card {
    border-width: 2px;
    background: var(--theme-surface-raised);
  }
}
</style>
