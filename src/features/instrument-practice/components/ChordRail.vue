<template>
  <div class="chord-rail" role="radiogroup" :aria-label="ariaLabel">
    <button
      v-for="chord in chords"
      :key="chord.id"
      class="chord-chip"
      :class="{selected: chord.id === modelValue}"
      type="button"
      role="radio"
      :aria-checked="chord.id === modelValue"
      :aria-label="`${chord.label} 和弦`"
      @click="selectChord(chord.id)"
    >
      <span>{{ chord.label }}</span>
      <small>{{ qualityLabels[chord.quality] }}</small>
    </button>
  </div>
</template>

<script setup>
/**
 * 公共契约：modelValue 为和弦 ID；选择时同时发出 update:modelValue 与 select，
 * 选择本身不产生任何演奏事件。
 */
defineProps({
  chords: {
    type: Array,
    required: true
  },
  modelValue: {
    type: String,
    default: ''
  },
  ariaLabel: {
    type: String,
    default: '选择和弦'
  }
})

const emit = defineEmits(['update:modelValue', 'select'])

const qualityLabels = Object.freeze({
  major: '大三',
  minor: '小三',
  dominant7: '属七'
})

function selectChord(chordId) {
  emit('update:modelValue', chordId)
  emit('select', chordId)
}
</script>

<style scoped>
.chord-rail {
  display: flex;
  gap: 0.45rem;
  overflow-x: auto;
  padding: 0.2rem 0.12rem 0.5rem;
  scroll-padding-inline: 0.12rem;
  scrollbar-width: none;
  touch-action: pan-x;
}

.chord-rail::-webkit-scrollbar {
  display: none;
}

.chord-chip {
  min-width: 3.55rem;
  min-height: 2.75rem;
  flex: 0 0 auto;
  display: grid;
  place-content: center;
  gap: 0.08rem;
  padding: 0.35rem 0.65rem;
  color: var(--theme-text-soft, rgba(245, 245, 247, 0.86));
  background: var(--theme-control-surface, rgba(255, 255, 255, 0.1));
  border: 1px solid var(--theme-border, rgba(255, 255, 255, 0.14));
  border-radius: 0.85rem;
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.08);
  transition: transform 100ms ease-out, border-color 160ms ease, background-color 160ms ease;
}

.chord-chip:active {
  transform: scale(0.96);
}

.chord-chip.selected {
  color: #071820;
  background: #60e6ee;
  border-color: rgba(180, 252, 255, 0.9);
  box-shadow: 0 0 0 1px rgba(96, 230, 238, 0.24), 0 8px 24px rgba(24, 199, 214, 0.2);
}

.chord-chip > span {
  font-size: 0.88rem;
  line-height: 1;
  font-weight: 760;
  letter-spacing: -0.015em;
}

.chord-chip > small {
  font-size: 0.58rem;
  line-height: 1.15;
  opacity: 0.68;
}

@media (prefers-reduced-motion: reduce) {
  .chord-chip {
    transition: color 100ms linear, background-color 100ms linear;
  }

  .chord-chip:active {
    transform: none;
  }
}

@media (prefers-contrast: more) {
  .chord-chip {
    border-width: 2px;
  }
}
</style>
