<template>
  <section
    class="piano-surface"
    :class="{'reduced-motion': props.reducedMotion}"
    aria-label="钢琴演奏区"
  >
    <div class="piano-controls">
      <div class="bank-switch" role="group" aria-label="钢琴音区">
        <button
          v-for="bank in definition.layout.keyBanks"
          :key="bank.id"
          type="button"
          :class="{selected: activeBank.id === bank.id}"
          :aria-pressed="activeBank.id === bank.id"
          @click="selectBank(bank.id)"
        >
          {{ bank.label }}
        </button>
      </div>
      <span class="piano-range" aria-live="polite">{{ keyRangeLabel }}</span>
    </div>

    <div
      class="piano-keybed piano-play-zone"
      role="group"
      :aria-label="`钢琴键盘，当前${keyRangeLabel}`"
      @pointerdown="onKeyboardPointerDown"
      @pointermove="onKeyboardPointerMove"
      @pointerup="onKeyboardPointerEnd"
      @pointercancel="onKeyboardPointerCancel"
      @lostpointercapture="onKeyboardPointerCancel"
      @contextmenu.prevent
    >
      <div class="piano-lid" aria-hidden="true">
        <span>PORTABLE PIANO</span>
      </div>
      <div class="piano-white-keys" :style="{'--white-key-count': whiteKeys.length}">
        <button
          v-for="key in whiteKeys"
          :key="key.id"
          class="piano-key piano-key-white"
          :class="{pressed: isKeyPressed(key.midi), tonic: key.isTonic}"
          type="button"
          :data-midi="key.midi"
          :aria-label="`演奏${key.note}`"
          :aria-pressed="isKeyPressed(key.midi)"
          @keydown.enter.prevent="playKeyFromKeyboard($event, key)"
          @keydown.space.prevent="playKeyFromKeyboard($event, key)"
        >
          <span v-if="key.isTonic" class="piano-note-label">{{ key.note }}</span>
        </button>
      </div>
      <button
        v-for="key in blackKeys"
        :key="key.id"
        class="piano-key piano-key-black"
        :class="{pressed: isKeyPressed(key.midi)}"
        :style="{left: `${key.blackPosition}%`}"
        type="button"
        :data-midi="key.midi"
        :aria-label="`演奏${key.note}`"
        :aria-pressed="isKeyPressed(key.midi)"
        @keydown.enter.prevent="playKeyFromKeyboard($event, key)"
        @keydown.space.prevent="playKeyFromKeyboard($event, key)"
      />
      <span class="piano-hint" aria-hidden="true">轻触 · 滑奏 · 多指和声</span>
    </div>
  </section>
</template>

<script setup>
import {computed, onBeforeUnmount, reactive, ref} from 'vue'

import {getInstrumentDefinition, midiToNoteName} from '../instruments/definitions.js'
import {
  capturePointer,
  releasePointer,
  useInstrumentPointers,
  velocityToGain
} from '../composables/useInstrumentPointers.js'

const BLACK_KEY_PITCH_CLASSES = new Set([1, 3, 6, 8, 10])

/**
 * 一组八度只呈现八个白键，保证竖屏中每个琴键仍可被拇指直接点击。
 * 滑奏使用已有的短速度历史与指针捕获，切换琴键时直接发音并保持多点按键状态。
 */
const props = defineProps({
  reducedMotion: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['performance', 'interaction'])

const definition = getInstrumentDefinition('piano')
const activeBankId = ref('middle')
const activePointers = reactive(new Map())
const {pointerTracker, crossingTracker, clear: clearPointers} = useInstrumentPointers()

const activeBank = computed(() => (
  definition.layout.keyBanks.find((bank) => bank.id === activeBankId.value)
  || definition.layout.keyBanks[1]
  || definition.layout.keyBanks[0]
))
const keyboardKeys = computed(() => createKeyboardKeys(activeBank.value.firstMidi))
const whiteKeys = computed(() => keyboardKeys.value.filter((key) => !key.isBlack))
const blackKeys = computed(() => keyboardKeys.value.filter((key) => key.isBlack))
const keyRangeLabel = computed(() => {
  const firstMidi = activeBank.value.firstMidi
  return `${midiToNoteName(firstMidi)} — ${midiToNoteName(firstMidi + 12)}`
})

function createKeyboardKeys(firstMidi) {
  let whiteIndex = 0
  return Array.from({length: 13}, (_, index) => {
    const midi = firstMidi + index
    const pitchClass = ((midi % 12) + 12) % 12
    const isBlack = BLACK_KEY_PITCH_CLASSES.has(pitchClass)
    const key = {
      id: `key-${midi}`,
      midi,
      note: midiToNoteName(midi),
      isBlack,
      isTonic: pitchClass === 0,
      blackPosition: 0
    }
    if (isBlack) {
      key.blackPosition = ((whiteIndex / 8) * 100)
    } else {
      whiteIndex += 1
    }
    return key
  })
}

function selectBank(bankId) {
  const bank = definition.layout.keyBanks.find((item) => item.id === bankId)
  if (!bank || bank.id === activeBankId.value) {
    return
  }
  activeBankId.value = bank.id
  activePointers.clear()
  clearPointers()
}

function interaction(event) {
  emit('interaction', {
    instrumentId: 'piano',
    pointerType: event.pointerType || 'keyboard'
  })
}

function emitPerformance(performanceEvent) {
  emit('performance', {
    instrumentId: 'piano',
    ...performanceEvent
  })
}

function playKey(key, velocity = 0.62) {
  if (!key) {
    return
  }
  emitPerformance({
    type: 'note',
    stringId: key.id,
    midi: key.midi,
    velocity: Math.min(Math.max(velocity, 0.28), 1),
    bendCents: 0
  })
}

function playKeyFromKeyboard(event, key) {
  interaction(event)
  playKey(key, 0.62)
}

function keyAtEvent(event, {fromPoint = false} = {}) {
  const element = fromPoint
    ? document.elementFromPoint?.(event.clientX, event.clientY)
    : event.target
  const pianoKey = element?.closest?.('.piano-key')
  const midi = Number(pianoKey?.dataset?.midi)
  return keyboardKeys.value.find((key) => key.midi === midi) || null
}

function onKeyboardPointerDown(event) {
  if (event.button > 0) {
    return
  }
  const key = keyAtEvent(event)
  if (!key) {
    return
  }
  event.preventDefault()
  capturePointer(event)
  interaction(event)
  pointerTracker.begin(event, {kind: 'key', midi: key.midi})
  crossingTracker.begin(event.pointerId, key.id, event.timeStamp)
  activePointers.set(event.pointerId, key.midi)
  playKey(key, 0.62)
}

function onKeyboardPointerMove(event) {
  const pointerState = pointerTracker.move(event)
  if (!pointerState?.moved || pointerState.payload.kind !== 'key') {
    return
  }
  const key = keyAtEvent(event, {fromPoint: true})
  if (!key || !crossingTracker.enter(event.pointerId, key.id, event.timeStamp)) {
    return
  }
  pointerState.payload.midi = key.midi
  activePointers.set(event.pointerId, key.midi)
  playKey(key, velocityToGain(pointerState.velocity.speed))
}

function clearKeyboardPointer(event) {
  activePointers.delete(event.pointerId)
  pointerTracker.cancel(event)
  crossingTracker.end(event.pointerId)
}

function onKeyboardPointerEnd(event) {
  clearKeyboardPointer(event)
  releasePointer(event)
}

function onKeyboardPointerCancel(event) {
  clearKeyboardPointer(event)
}

function isKeyPressed(midi) {
  return [...activePointers.values()].includes(midi)
}

onBeforeUnmount(() => {
  activePointers.clear()
})
</script>

<style scoped>
.piano-surface {
  --piano-cyan: #60e6ee;
  width: 100%;
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(15rem, 1fr);
  gap: 0.65rem;
}

.piano-controls {
  min-height: 2.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.bank-switch {
  display: flex;
  padding: 0.2rem;
  background: rgba(6, 18, 28, 0.56);
  border: 1px solid var(--theme-border, rgba(255, 255, 255, 0.14));
  border-radius: 0.85rem;
}

.bank-switch button {
  min-width: 3.6rem;
  min-height: 2.25rem;
  padding: 0.3rem 0.7rem;
  color: var(--theme-text-muted, rgba(235, 235, 245, 0.6));
  background: transparent;
  border: 0;
  border-radius: 0.65rem;
  font-size: 0.78rem;
  font-weight: 690;
}

.bank-switch button.selected {
  color: #071820;
  background: var(--piano-cyan);
  box-shadow: 0 0.3rem 1rem rgba(24, 199, 214, 0.18);
}

.piano-range {
  color: var(--theme-text-muted, rgba(235, 235, 245, 0.58));
  font-size: 0.72rem;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

.piano-keybed {
  position: relative;
  min-height: 15rem;
  overflow: hidden;
  padding-top: clamp(1.9rem, 8vw, 2.5rem);
  border: 1px solid rgba(213, 235, 239, 0.22);
  border-radius: 1.3rem;
  background:
    radial-gradient(circle at 50% -40%, rgba(96, 230, 238, 0.2), transparent 55%),
    linear-gradient(140deg, #162b36, #08141c 47%, #020608);
  box-shadow:
    inset 0 1px rgba(255, 255, 255, 0.12),
    inset 0 -1.5rem 2.6rem rgba(0, 0, 0, 0.6),
    var(--theme-shadow-sm, 0 0.9rem 2.2rem rgba(0, 0, 0, 0.28));
  touch-action: none;
  user-select: none;
}

.piano-lid {
  position: absolute;
  z-index: 1;
  inset: 0 0 auto;
  height: clamp(1.9rem, 8vw, 2.5rem);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(196, 239, 242, 0.48);
  background: linear-gradient(180deg, rgba(7, 20, 29, 0.96), rgba(12, 34, 45, 0.86));
  border-bottom: 1px solid rgba(170, 225, 232, 0.14);
  box-shadow: 0 0.4rem 1.2rem rgba(0, 0, 0, 0.3);
  font-size: 0.54rem;
  font-weight: 780;
  letter-spacing: 0.18em;
  pointer-events: none;
}

.piano-white-keys {
  height: 100%;
  display: grid;
  grid-template-columns: repeat(var(--white-key-count), minmax(0, 1fr));
}

.piano-key {
  -webkit-tap-highlight-color: transparent;
}

.piano-key:focus-visible {
  z-index: 4;
  outline: 3px solid var(--piano-cyan);
  outline-offset: -3px;
}

.piano-key-white {
  position: relative;
  min-width: 0;
  padding: 0;
  background:
    linear-gradient(90deg, rgba(0, 0, 0, 0.12), transparent 14% 86%, rgba(0, 0, 0, 0.16)),
    linear-gradient(180deg, #fcffff, #dbe5e6 78%, #abb9ba);
  border: 0;
  border-right: 1px solid rgba(2, 13, 18, 0.34);
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.9), inset 0 -0.35rem 0.5rem rgba(25, 54, 61, 0.16);
  transition: background-color 90ms ease-out, box-shadow 90ms ease-out;
}

.piano-key-white:last-child {
  border-right: 0;
}

.piano-key-white.pressed {
  background: linear-gradient(180deg, #c6fbfb, #66dce2 78%, #2aaeb9);
  box-shadow: inset 0 0.32rem 0.56rem rgba(0, 67, 78, 0.26), 0 0 1rem rgba(96, 230, 238, 0.4);
}

.piano-key-black {
  position: absolute;
  z-index: 2;
  top: clamp(1.9rem, 8vw, 2.5rem);
  width: min(12%, 3.7rem);
  height: 57%;
  padding: 0;
  transform: translateX(-50%);
  background: linear-gradient(90deg, #020609, #1b3038 48%, #05090c);
  border: 1px solid rgba(180, 231, 235, 0.16);
  border-top: 0;
  border-radius: 0 0 0.42rem 0.42rem;
  box-shadow: 0 0.5rem 0.6rem rgba(0, 0, 0, 0.52), inset 0 1px rgba(255, 255, 255, 0.09);
  transition: background-color 90ms ease-out, box-shadow 90ms ease-out;
}

.piano-key-black.pressed {
  background: linear-gradient(90deg, #09242c, #2f8d96 48%, #0a2931);
  box-shadow: 0 0.36rem 1rem rgba(96, 230, 238, 0.48), inset 0 0.26rem 0.38rem rgba(0, 0, 0, 0.34);
}

.piano-note-label {
  position: absolute;
  left: 50%;
  bottom: 0.48rem;
  transform: translateX(-50%);
  color: rgba(9, 34, 40, 0.58);
  font-size: 0.62rem;
  font-weight: 780;
  pointer-events: none;
}

.piano-key-white.pressed .piano-note-label {
  color: rgba(0, 44, 52, 0.72);
}

.piano-hint {
  position: absolute;
  z-index: 3;
  left: 50%;
  bottom: 0.5rem;
  transform: translateX(-50%);
  color: rgba(186, 222, 228, 0.52);
  font-size: 0.61rem;
  font-weight: 680;
  letter-spacing: 0.06em;
  pointer-events: none;
}

@media (orientation: landscape) and (min-width: 40rem) {
  .piano-keybed {
    min-height: 17rem;
  }
}

@media (max-width: 24rem) {
  .piano-range {
    display: none;
  }

  .bank-switch button {
    min-width: 3.25rem;
    padding-inline: 0.5rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .piano-key-white,
  .piano-key-black {
    transition: none;
  }
}

.reduced-motion .piano-key-white,
.reduced-motion .piano-key-black {
  transition: none;
}

@media (prefers-reduced-transparency: reduce) {
  .bank-switch,
  .piano-keybed,
  .piano-lid {
    backdrop-filter: none;
  }
}

@media (prefers-contrast: more) {
  .piano-keybed,
  .bank-switch {
    border-width: 2px;
  }

  .piano-key-white {
    border-right-width: 2px;
  }

  .piano-key-black {
    border-width: 2px;
  }
}
</style>
