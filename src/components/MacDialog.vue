<template>
  <Teleport to="body">
    <Transition name="mac-dialog">
      <div
        v-if="modelValue"
        class="mac-dialog-mask"
        role="presentation"
        @click.self="handleMaskClick"
      >
        <section
          class="mac-dialog-panel"
          :class="panelClass"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          :style="{maxWidth: width}"
        >
          <header class="mac-dialog-head">
            <MacWindowControls/>
            <div class="mac-dialog-title-block">
              <h3 :id="titleId" class="mac-dialog-title">{{ title }}</h3>
              <p v-if="subtitle" class="mac-dialog-subtitle">{{ subtitle }}</p>
            </div>
            <button
              class="mac-dialog-close"
              type="button"
              aria-label="Close dialog"
              @click="close"
            >
              x
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
  </Teleport>
</template>

<script>
import MacWindowControls from './MacWindowControls.vue'

let dialogIdSeed = 0

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
    panelClass: {
      type: [String, Array, Object],
      default: ''
    }
  },
  emits: ['update:modelValue', 'close'],
  data() {
    dialogIdSeed += 1
    return {
      dialogId: dialogIdSeed
    }
  },
  computed: {
    titleId() {
      return `mac-dialog-title-${this.dialogId}`
    }
  },
  methods: {
    close() {
      this.$emit('update:modelValue', false)
      this.$emit('close')
    },
    handleMaskClick() {
      if (this.closeOnMask) {
        this.close()
      }
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

.mac-dialog-panel {
  width: min(100%, 720px);
  max-height: calc(100vh - 48px);
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

.mac-dialog-head {
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
}

.mac-dialog-body {
  min-height: 0;
  overflow: auto;
  padding: 20px;
}

.mac-dialog-actions {
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

.mac-dialog-enter-active,
.mac-dialog-leave-active {
  transition: opacity 180ms cubic-bezier(0.2, 0.9, 0.2, 1);
}

.mac-dialog-enter-active .mac-dialog-panel,
.mac-dialog-leave-active .mac-dialog-panel {
  transition: transform 220ms cubic-bezier(0.2, 0.9, 0.2, 1), opacity 180ms ease;
}

.mac-dialog-enter-from,
.mac-dialog-leave-to {
  opacity: 0;
}

.mac-dialog-enter-from .mac-dialog-panel,
.mac-dialog-leave-to .mac-dialog-panel {
  opacity: 0;
  transform: translateY(10px) scale(0.985);
}

@media (max-width: 720px) {
  .mac-dialog-mask {
    align-items: flex-end;
    padding: 12px;
  }

  .mac-dialog-panel {
    max-height: calc(100vh - 24px);
    border-radius: 22px;
  }

  .mac-dialog-head {
    grid-template-columns: 1fr auto;
  }

  .mac-dialog-head :deep(.mac-window-controls) {
    display: none;
  }
}
</style>
