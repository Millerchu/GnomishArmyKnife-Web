<template>
  <div class="glass-select" :class="{disabled}" v-bind="$attrs" ref="selectRef">
    <button
      type="button"
      class="glass-select-trigger"
      :class="triggerClass"
      :disabled="disabled"
      :aria-expanded="open ? 'true' : 'false'"
      :aria-controls="listboxId"
      @click="toggle"
    >
      <span class="glass-select-value" :class="{placeholder: !selectedOption}">
        {{ displayLabel }}
      </span>
      <span class="glass-select-chevron" aria-hidden="true"></span>
    </button>

    <transition name="glass-select-fade">
      <div v-if="open" :id="listboxId" class="glass-select-menu" role="listbox">
        <button
          v-for="option in options"
          :key="`${option.value}`"
          type="button"
          class="glass-select-option"
          :class="{active: option.value === modelValue}"
          role="option"
          :aria-selected="option.value === modelValue ? 'true' : 'false'"
          @click="select(option)"
        >
          <span>{{ option.label }}</span>
          <span v-if="option.value === modelValue" class="glass-select-check" aria-hidden="true"></span>
        </button>
      </div>
    </transition>
  </div>
</template>

<script>
let selectIdSeed = 0

export default {
  name: 'GlassSelect',
  inheritAttrs: false,
  props: {
    modelValue: {
      type: [String, Number, Boolean],
      default: ''
    },
    options: {
      type: Array,
      default: () => []
    },
    disabled: {
      type: Boolean,
      default: false
    },
    placeholder: {
      type: String,
      default: '请选择'
    },
    triggerClass: {
      type: [String, Array, Object],
      default: ''
    }
  },
  emits: ['update:modelValue', 'change'],
  data() {
    selectIdSeed += 1
    return {
      open: false,
      selectId: selectIdSeed
    }
  },
  computed: {
    listboxId() {
      return `glass-select-listbox-${this.selectId}`
    },
    selectedOption() {
      return this.options.find((option) => option.value === this.modelValue) || null
    },
    displayLabel() {
      return this.selectedOption ? this.selectedOption.label : this.placeholder
    }
  },
  watch: {
    disabled(value) {
      if (value) {
        this.open = false
      }
    }
  },
  mounted() {
    document.addEventListener('click', this.handleDocumentClick)
    document.addEventListener('keydown', this.handleKeydown)
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleDocumentClick)
    document.removeEventListener('keydown', this.handleKeydown)
  },
  methods: {
    toggle() {
      if (this.disabled) {
        return
      }
      this.open = !this.open
    },
    close() {
      this.open = false
    },
    select(option) {
      if (this.disabled) {
        return
      }
      this.$emit('update:modelValue', option.value)
      this.$emit('change', option.value)
      this.close()
    },
    handleDocumentClick(event) {
      if (!this.open || this.$refs.selectRef?.contains(event.target)) {
        return
      }
      this.close()
    },
    handleKeydown(event) {
      if (event.key === 'Escape') {
        this.close()
      }
    }
  }
}
</script>

<style scoped>
.glass-select {
  position: relative;
  min-width: 132px;
}

.glass-select-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 40px;
  padding: 0 13px 0 15px;
  border: 1px solid var(--theme-border-strong);
  border-radius: 14px;
  color: var(--theme-text);
  cursor: pointer;
  background:
    linear-gradient(180deg, var(--theme-highlight-soft), transparent),
    var(--theme-field-surface);
  box-shadow:
    inset 0 1px 0 var(--theme-highlight-soft),
    var(--theme-shadow-xs);
  backdrop-filter: blur(18px) saturate(150%);
  transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}

.glass-select-trigger:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--theme-accent) 48%, var(--theme-border));
  background:
    linear-gradient(180deg, var(--theme-highlight), transparent),
    var(--theme-surface-hover);
}

.glass-select-trigger:focus-visible {
  outline: none;
  border-color: var(--theme-accent);
  box-shadow:
    0 0 0 3px var(--theme-focus-ring),
    var(--theme-shadow-sm);
}

.glass-select-trigger:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.glass-select-value {
  overflow: hidden;
  color: var(--theme-text);
  font-size: 14px;
  font-weight: 750;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.glass-select-value.placeholder {
  color: var(--theme-text-muted);
}

.glass-select-chevron {
  width: 8px;
  height: 8px;
  flex: 0 0 auto;
  border-right: 2px solid var(--theme-text-muted);
  border-bottom: 2px solid var(--theme-text-muted);
  transform: translateY(-2px) rotate(45deg);
}

.glass-select-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 60;
  width: 100%;
  min-width: max-content;
  max-height: 260px;
  overflow: auto;
  padding: 7px;
  border: 1px solid var(--theme-border-strong);
  border-radius: 16px;
  background:
    linear-gradient(180deg, var(--theme-highlight-soft), transparent),
    var(--theme-popover-surface);
  box-shadow:
    var(--theme-shadow-md),
    inset 0 1px 0 var(--theme-highlight-soft);
  backdrop-filter: blur(26px) saturate(165%);
}

.glass-select-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  min-height: 34px;
  padding: 0 10px;
  border: 0;
  border-radius: 11px;
  color: var(--theme-text-soft);
  cursor: pointer;
  background: transparent;
  font-size: 13px;
  font-weight: 720;
  text-align: left;
  white-space: nowrap;
  transition: background 140ms ease, color 140ms ease;
}

.glass-select-option:hover,
.glass-select-option.active {
  color: var(--theme-text);
  background: var(--theme-accent-soft);
}

.glass-select-check {
  width: 8px;
  height: 13px;
  border-right: 2px solid var(--theme-accent);
  border-bottom: 2px solid var(--theme-accent);
  transform: rotate(40deg);
}

.glass-select-fade-enter-active,
.glass-select-fade-leave-active {
  transition: opacity 120ms ease, transform 120ms ease;
}

.glass-select-fade-enter-from,
.glass-select-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}
</style>
