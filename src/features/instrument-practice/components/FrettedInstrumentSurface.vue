<template>
  <section
    class="fretted-surface"
    :class="[
      `instrument-${definition.id}`,
      `mode-${localMode}`,
      {damped: isDamped, 'reduced-motion': props.reducedMotion}
    ]"
    :aria-label="`${definition.label}演奏区`"
  >
    <div class="surface-controls">
      <div class="mode-switch" role="group" aria-label="演奏模式">
        <button
          v-for="modeOption in modeOptions"
          :key="modeOption.id"
          type="button"
          :class="{selected: localMode === modeOption.id}"
          :aria-pressed="localMode === modeOption.id"
          @click="selectMode(modeOption.id)"
        >
          {{ modeOption.label }}
        </button>
      </div>

      <label class="tuning-field">
        <span>调弦</span>
        <select :value="activeTuning.id" @change="selectTuning($event.target.value)">
          <option
            v-for="tuningOption in definition.tuningPresets"
            :key="tuningOption.id"
            :value="tuningOption.id"
          >
            {{ tuningOption.label }}
          </option>
        </select>
      </label>
    </div>

    <ChordRail
      v-if="localMode === 'chord'"
      :chords="definition.chordVoicings"
      :model-value="activeChord.id"
      :aria-label="`${definition.label}和弦`"
      @update:model-value="selectChord"
    />

    <div class="fretted-stage">
      <div class="fretboard-wrap">
        <div class="nut" aria-hidden="true"/>
        <div
          class="fretboard fretted-play-zone"
          :style="{'--string-count': definition.strings.length}"
          @contextmenu.prevent
        >
          <div
            v-for="(instrumentString, stringIndex) in definition.strings"
            :key="instrumentString.id"
            class="fret-string-row"
            :data-string-id="instrumentString.id"
          >
            <span
              class="fretted-wire"
              :class="{active: stringEnergy(instrumentString.id) > 0.02}"
              :style="stringStyle(instrumentString.id)"
              aria-hidden="true"
            />
            <button
              v-for="fret in fretNumbers"
              :key="fret"
              class="fret-cell"
              :class="{
                selected: isFretActive(stringIndex, fret),
                muted: resolvedFret(stringIndex) < 0
              }"
              type="button"
              :data-string-index="stringIndex"
              :data-fret="fret"
              :aria-label="`${instrumentString.label} ${fret === 0 ? '空弦' : `第 ${fret} 品`}`"
              :aria-pressed="isFretActive(stringIndex, fret)"
              :disabled="localMode !== 'fret'"
              @pointerdown="onFretPointerDown($event, stringIndex, fret)"
              @pointermove="onFretPointerMove"
              @pointerup="onFretPointerEnd"
              @pointercancel="onFretPointerCancel"
              @lostpointercapture="onFretPointerCancel"
            >
              <span v-if="fret === 0" class="open-mark">
                {{ resolvedFret(stringIndex) < 0 ? '×' : '○' }}
              </span>
              <span v-else-if="isFretActive(stringIndex, fret)" class="finger-dot"/>
            </button>
          </div>

          <div class="fret-markers" aria-hidden="true">
            <span v-for="fret in fretNumbers.slice(1)" :key="fret">
              {{ [3, 5, 7].includes(fret) ? '•' : '' }}
            </span>
          </div>
        </div>
      </div>

      <div
        ref="strumZoneRef"
        class="strum-zone fretted-play-zone"
        :style="{'--string-count': definition.strings.length}"
        role="group"
        aria-label="拨弦区，轻触单弦或纵向扫弦"
        @pointerdown="onStrumPointerDown"
        @pointermove="onStrumPointerMove"
        @pointerup="onStrumPointerEnd"
        @pointercancel="onStrumPointerCancel"
        @lostpointercapture="onStrumPointerCancel"
        @contextmenu.prevent
      >
        <div class="sound-hole" aria-hidden="true"/>
        <button
          v-for="(instrumentString, stringIndex) in definition.strings"
          :key="instrumentString.id"
          class="strum-string"
          type="button"
          tabindex="0"
          :aria-label="`拨动${instrumentString.label}`"
          :data-string-index="stringIndex"
          @keydown.enter.prevent="playString(stringIndex, 0.62)"
          @keydown.space.prevent="playString(stringIndex, 0.62)"
        >
          <span
            :class="{active: stringEnergy(instrumentString.id) > 0.02}"
            :style="stringStyle(instrumentString.id)"
          />
        </button>
        <span class="strum-hint" aria-hidden="true">扫弦</span>
      </div>
    </div>

    <button
      class="damp-control"
      :class="{active: isDamped}"
      type="button"
      :aria-pressed="isDamped"
      @pointerdown="onDampPointerDown"
      @pointerup="onDampPointerEnd"
      @pointercancel="onDampPointerEnd"
      @lostpointercapture="onDampPointerEnd"
      @keydown.space.prevent="emitDamp"
    >
      <span class="damp-icon" aria-hidden="true"/>
      按住闷音
    </button>
  </section>
</template>

<script setup>
import {computed, onBeforeUnmount, reactive, ref, watch} from 'vue'
import ChordRail from './ChordRail.vue'
import {
  getChord,
  getInstrumentDefinition,
  getTuning
} from '../instruments/definitions.js'
import {
  capturePointer,
  releasePointer,
  resolveIndexFromPosition,
  useInstrumentPointers,
  velocityToGain
} from '../composables/useInstrumentPointers.js'
import {useStringDynamics} from '../composables/useStringDynamics.js'

/**
 * 公共契约：
 * - instrumentId: guitar | ukulele；mode: chord | fret。
 * - tuningId/chordId 为受控值，对应变更通过 update:* 发回。
 * - performance 同步发出 note/damp 标准事件；interaction 只标记真实用户手势。
 */
const props = defineProps({
  instrumentId: {
    type: String,
    required: true,
    validator: (value) => ['guitar', 'ukulele'].includes(value)
  },
  mode: {
    type: String,
    default: 'chord',
    validator: (value) => ['chord', 'fret'].includes(value)
  },
  tuningId: {
    type: String,
    default: ''
  },
  chordId: {
    type: String,
    default: 'c-major'
  },
  reducedMotion: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'performance',
  'interaction',
  'update:mode',
  'update:tuningId',
  'update:chordId',
  'damp-change'
])

const modeOptions = Object.freeze([
  {id: 'chord', label: '和弦'},
  {id: 'fret', label: '指板'}
])

const definition = computed(() => getInstrumentDefinition(props.instrumentId))
const localMode = ref(props.mode)
const localTuningId = ref(props.tuningId || definition.value.tuningPresets[0].id)
const localChordId = ref(props.chordId)
const activeFrets = reactive(new Map())
const dampPointers = reactive(new Set())
const strumZoneRef = ref(null)
const {pointerTracker, crossingTracker, clear: clearPointers} = useInstrumentPointers()
const stringDynamics = useStringDynamics({
  reducedMotion: () => props.reducedMotion
})

const fretNumbers = computed(() => (
  Array.from({length: (definition.value.layout.maxFret || 7) + 1}, (_, index) => index)
))
const activeTuning = computed(() => getTuning(definition.value, localTuningId.value))
const activeChord = computed(() => getChord(definition.value, localChordId.value))
const isDamped = computed(() => dampPointers.size > 0)

watch(() => props.mode, (mode) => {
  localMode.value = mode
  activeFrets.clear()
  clearPointers()
})

watch(() => props.tuningId, (tuningId) => {
  if (tuningId) {
    localTuningId.value = getTuning(definition.value, tuningId).id
  }
})

watch(() => props.chordId, (chordId) => {
  localChordId.value = getChord(definition.value, chordId)?.id || ''
})

watch(definition, (nextDefinition) => {
  localTuningId.value = getTuning(nextDefinition, props.tuningId).id
  localChordId.value = getChord(nextDefinition, props.chordId)?.id || ''
  activeFrets.clear()
  clearPointers()
  stringDynamics.stop()
})

function selectMode(mode) {
  localMode.value = mode
  activeFrets.clear()
  emit('update:mode', mode)
}

function selectTuning(tuningId) {
  localTuningId.value = getTuning(definition.value, tuningId).id
  emit('update:tuningId', localTuningId.value)
}

function selectChord(chordId) {
  localChordId.value = getChord(definition.value, chordId)?.id || ''
  emit('update:chordId', localChordId.value)
}

function interaction(event) {
  emit('interaction', {
    instrumentId: definition.value.id,
    pointerType: event.pointerType || 'mouse'
  })
}

function resolvedFret(stringIndex) {
  if (localMode.value === 'chord') {
    return activeChord.value?.frets[stringIndex] ?? 0
  }

  let selectedFret = 0
  for (const fretState of activeFrets.values()) {
    if (fretState.stringIndex === stringIndex) {
      selectedFret = Math.max(selectedFret, fretState.fret)
    }
  }
  return selectedFret
}

function isFretActive(stringIndex, fret) {
  if (resolvedFret(stringIndex) !== fret) {
    return false
  }
  if (fret > 0 || localMode.value === 'chord') {
    return true
  }
  return [...activeFrets.values()]
    .some((fretState) => fretState.stringIndex === stringIndex && fretState.fret === 0)
}

function emitPerformance(performanceEvent) {
  emit('performance', {
    instrumentId: definition.value.id,
    ...performanceEvent
  })
}

function playString(stringIndex, velocity = 0.62) {
  const instrumentString = definition.value.strings[stringIndex]
  const fret = resolvedFret(stringIndex)
  if (!instrumentString || fret < 0) {
    return
  }

  const normalizedVelocity = Math.min(Math.max(velocity, 0.28), 1)
  stringDynamics.pluck(instrumentString.id, normalizedVelocity)
  emitPerformance({
    type: 'note',
    stringId: instrumentString.id,
    midi: activeTuning.value.midiNotes[stringIndex] + fret,
    velocity: normalizedVelocity,
    bendCents: 0,
    damped: isDamped.value
  })
}

function onFretPointerDown(event, stringIndex, fret) {
  if (localMode.value !== 'fret' || event.button > 0) {
    return
  }
  event.preventDefault()
  capturePointer(event)
  interaction(event)
  pointerTracker.begin(event, {kind: 'fret', stringIndex, fret})
  activeFrets.set(event.pointerId, {stringIndex, fret})
}

function onFretPointerMove(event) {
  const pointerState = pointerTracker.move(event)
  if (!pointerState?.moved || pointerState.payload.kind !== 'fret') {
    return
  }

  const hoveredCell = document.elementFromPoint?.(event.clientX, event.clientY)
    ?.closest?.('.fret-cell')
  if (!hoveredCell) {
    return
  }
  const stringIndex = Number(hoveredCell.dataset.stringIndex)
  const fret = Number(hoveredCell.dataset.fret)
  if (!Number.isInteger(stringIndex) || !Number.isInteger(fret)) {
    return
  }
  pointerState.payload.stringIndex = stringIndex
  pointerState.payload.fret = fret
  activeFrets.set(event.pointerId, {stringIndex, fret})
}

function clearFretPointer(event) {
  const pointerState = pointerTracker.get(event.pointerId)
  if (pointerState?.payload.kind === 'fret') {
    activeFrets.delete(event.pointerId)
  }
  pointerTracker.cancel(event)
  crossingTracker.end(event.pointerId)
}

function onFretPointerEnd(event) {
  clearFretPointer(event)
  releasePointer(event)
}

function onFretPointerCancel(event) {
  clearFretPointer(event)
}

function stringIndexAtPoint(event) {
  const bounds = strumZoneRef.value?.getBoundingClientRect()
  if (!bounds) {
    return -1
  }
  return resolveIndexFromPosition(
    event.clientY,
    bounds.top,
    bounds.height,
    definition.value.strings.length
  )
}

function onStrumPointerDown(event) {
  if (event.button > 0) {
    return
  }
  event.preventDefault()
  capturePointer(event)
  interaction(event)
  const stringIndex = stringIndexAtPoint(event)
  if (stringIndex < 0) {
    return
  }
  pointerTracker.begin(event, {kind: 'strum', stringIndex})
  crossingTracker.begin(event.pointerId, definition.value.strings[stringIndex].id, event.timeStamp)
  playString(stringIndex, 0.62)
}

function onStrumPointerMove(event) {
  const pointerState = pointerTracker.move(event)
  if (!pointerState?.moved || pointerState.payload.kind !== 'strum') {
    return
  }
  const stringIndex = stringIndexAtPoint(event)
  const instrumentString = definition.value.strings[stringIndex]
  if (!instrumentString
    || !crossingTracker.enter(event.pointerId, instrumentString.id, event.timeStamp)) {
    return
  }
  playString(stringIndex, velocityToGain(pointerState.velocity.speed))
}

function clearStrumPointer(event) {
  pointerTracker.cancel(event)
  crossingTracker.end(event.pointerId)
}

function onStrumPointerEnd(event) {
  clearStrumPointer(event)
  releasePointer(event)
}

function onStrumPointerCancel(event) {
  clearStrumPointer(event)
}

function emitDamp() {
  emitPerformance({type: 'damp', stringId: null, velocity: 1})
}

function onDampPointerDown(event) {
  if (event.button > 0) {
    return
  }
  event.preventDefault()
  capturePointer(event)
  interaction(event)
  dampPointers.add(event.pointerId)
  emitDamp()
  emit('damp-change', true)
}

function onDampPointerEnd(event) {
  const wasDamped = isDamped.value
  dampPointers.delete(event.pointerId)
  if (wasDamped && !isDamped.value) {
    emit('damp-change', false)
  }
  releasePointer(event)
}

function stringStyle(stringId) {
  return stringDynamics.styleFor(stringId)
}

function stringEnergy(stringId) {
  return stringDynamics.states[stringId]?.energy || 0
}

onBeforeUnmount(() => {
  activeFrets.clear()
  dampPointers.clear()
})
</script>

<style scoped>
.fretted-surface {
  --cyan: #60e6ee;
  --cyan-soft: rgba(96, 230, 238, 0.22);
  --wood-dark: #2b1512;
  --wood: #7a3f26;
  --wood-light: #c58750;
  width: 100%;
  min-height: 0;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  gap: 0.65rem;
  color: var(--theme-text, #f5f5f7);
}

.surface-controls {
  min-height: 2.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.mode-switch {
  display: flex;
  padding: 0.2rem;
  background: rgba(6, 18, 28, 0.56);
  border: 1px solid var(--theme-border, rgba(255, 255, 255, 0.14));
  border-radius: 0.85rem;
}

.mode-switch button {
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

.mode-switch button.selected {
  color: #071820;
  background: var(--cyan);
  box-shadow: 0 5px 18px rgba(24, 199, 214, 0.2);
}

.tuning-field {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--theme-text-muted, rgba(235, 235, 245, 0.6));
  font-size: 0.72rem;
}

.tuning-field select {
  min-height: 2.5rem;
  max-width: 9.5rem;
  padding: 0 1.8rem 0 0.65rem;
  color: var(--theme-text-soft, rgba(245, 245, 247, 0.86));
  background: var(--theme-field-surface, rgba(31, 33, 40, 0.76));
  border: 1px solid var(--theme-border, rgba(255, 255, 255, 0.14));
  border-radius: 0.75rem;
  font-size: 0.74rem;
}

.fretted-stage {
  min-height: 15rem;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: minmax(12rem, 1fr) minmax(7rem, 31%);
  overflow: hidden;
  border: 1px solid rgba(236, 192, 134, 0.26);
  border-radius: 1.25rem;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.05), transparent 22%, rgba(34, 9, 4, 0.12)),
    repeating-linear-gradient(92deg, transparent 0 18px, rgba(46, 12, 4, 0.12) 19px 20px),
    linear-gradient(125deg, var(--wood-light), var(--wood) 45%, var(--wood-dark));
  box-shadow:
    inset 0 1px rgba(255, 230, 190, 0.34),
    inset 0 -24px 50px rgba(27, 8, 5, 0.28),
    var(--theme-shadow-sm, 0 14px 34px rgba(0, 0, 0, 0.28));
}

.fretboard-wrap {
  min-width: 0;
  display: grid;
  grid-template-columns: 0.7rem minmax(0, 1fr);
  padding: 0.7rem 0 0;
}

.nut {
  z-index: 3;
  border-radius: 0.2rem;
  background: linear-gradient(90deg, #d9c6a9, #fff3d8 48%, #bca688);
  box-shadow: 2px 0 6px rgba(20, 6, 3, 0.35);
}

.fretboard {
  position: relative;
  min-width: 0;
  display: grid;
  grid-template-rows: repeat(var(--string-count), minmax(1.75rem, 1fr));
  padding-bottom: 1.1rem;
  overflow: hidden;
  background:
    repeating-linear-gradient(90deg, transparent 0 calc(12.5% - 2px), rgba(221, 208, 179, 0.76) calc(12.5% - 1px) 12.5%),
    linear-gradient(180deg, #38231d, #1e1210);
  box-shadow: inset 0 0 24px rgba(0, 0, 0, 0.5);
  touch-action: none;
}

.fret-string-row {
  position: relative;
  display: grid;
  grid-template-columns: repeat(8, minmax(2rem, 1fr));
}

.fretted-wire {
  position: absolute;
  z-index: 2;
  top: 50%;
  left: 0;
  right: 0;
  height: clamp(1px, calc((var(--string-count) + 1) * 0.24px), 2.5px);
  transform: translate3d(0, var(--string-displacement, 0), 0);
  transform-origin: center;
  background: linear-gradient(180deg, #fff2cd, #98836b 55%, #fff5dd);
  box-shadow:
    0 1px 1px rgba(0, 0, 0, 0.7),
    0 0 calc(8px * var(--string-energy, 0)) rgba(96, 230, 238, 0.9);
  pointer-events: none;
  will-change: transform, opacity;
}

.fretted-wire.active {
  background: var(--cyan);
}

.fret-cell {
  position: relative;
  z-index: 1;
  min-width: 0;
  min-height: 1.75rem;
  padding: 0;
  color: rgba(255, 244, 222, 0.8);
  background: transparent;
  border: 0;
  border-right: 1px solid rgba(221, 208, 179, 0.42);
  border-radius: 0;
  touch-action: none;
}

.fret-cell:disabled {
  cursor: default;
  opacity: 1;
}

.fret-cell.selected:not(:disabled),
.mode-chord .fret-cell.selected {
  background: radial-gradient(circle, var(--cyan-soft) 0 23%, transparent 25%);
}

.finger-dot {
  position: absolute;
  z-index: 3;
  top: 50%;
  left: 50%;
  width: 0.72rem;
  height: 0.72rem;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: var(--cyan);
  box-shadow: 0 0 0 3px rgba(8, 24, 30, 0.48), 0 0 16px rgba(96, 230, 238, 0.68);
}

.open-mark {
  position: absolute;
  left: 0.18rem;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 244, 222, 0.54);
  font-size: 0.62rem;
}

.fret-markers {
  position: absolute;
  left: 12.5%;
  right: 0;
  bottom: 0.05rem;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  color: rgba(255, 241, 216, 0.4);
  text-align: center;
  font-size: 0.68rem;
  pointer-events: none;
}

.strum-zone {
  position: relative;
  min-height: 7rem;
  display: grid;
  grid-template-rows: repeat(var(--string-count), minmax(1.45rem, 1fr));
  overflow: hidden;
  border-top: 1px solid rgba(255, 221, 171, 0.26);
  background:
    radial-gradient(circle at 50% 50%, rgba(4, 7, 9, 0.85) 0 23%, transparent 24%),
    linear-gradient(135deg, rgba(255, 207, 137, 0.16), rgba(50, 14, 8, 0.36));
  touch-action: none;
  user-select: none;
}

.sound-hole {
  position: absolute;
  z-index: 0;
  left: 50%;
  top: 50%;
  width: min(34%, 7rem);
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  border: 0.35rem double rgba(214, 161, 95, 0.58);
  border-radius: 50%;
  background: #120a09;
  box-shadow: inset 0 0 22px #000;
  pointer-events: none;
}

.strum-string {
  position: relative;
  z-index: 2;
  min-height: 1.45rem;
  padding: 0;
  background: transparent;
  border: 0;
  touch-action: none;
}

.strum-string > span {
  position: absolute;
  top: 50%;
  left: 5%;
  right: 5%;
  height: 1.5px;
  transform: translate3d(0, var(--string-displacement, 0), 0);
  background: linear-gradient(180deg, #fff2cd, #8d7761);
  box-shadow: 0 0 calc(10px * var(--string-energy, 0)) rgba(96, 230, 238, 0.95);
  will-change: transform, opacity;
}

.strum-string > span.active {
  background: var(--cyan);
}

.strum-hint {
  position: absolute;
  z-index: 1;
  right: 0.7rem;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 239, 213, 0.5);
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  writing-mode: vertical-rl;
  pointer-events: none;
}

.damp-control {
  justify-self: end;
  min-height: 2.75rem;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 0.85rem;
  color: var(--theme-text-soft, rgba(245, 245, 247, 0.86));
  background: var(--theme-control-surface, rgba(255, 255, 255, 0.1));
  border: 1px solid var(--theme-border, rgba(255, 255, 255, 0.14));
  border-radius: 0.8rem;
  font-size: 0.74rem;
  font-weight: 680;
}

.damp-control.active {
  color: #fff4e9;
  background: rgba(255, 147, 64, 0.3);
  border-color: rgba(255, 169, 98, 0.64);
}

.damp-icon {
  width: 0.86rem;
  height: 0.62rem;
  border: 2px solid currentColor;
  border-top: 0;
  border-radius: 0 0 0.4rem 0.4rem;
}

.damped .fretted-wire,
.damped .strum-string > span {
  opacity: 0.56;
}

@media (orientation: landscape) and (min-width: 40rem) {
  .fretted-stage {
    grid-template-columns: minmax(0, 1fr) minmax(10rem, 30%);
    grid-template-rows: minmax(15rem, 1fr);
  }

  .strum-zone {
    border-top: 0;
    border-left: 1px solid rgba(255, 221, 171, 0.26);
  }
}

@media (max-width: 28rem) {
  .surface-controls {
    align-items: stretch;
  }

  .tuning-field > span {
    display: none;
  }

  .tuning-field select {
    max-width: 7.5rem;
  }

  .fret-string-row {
    grid-template-columns: repeat(8, minmax(1.55rem, 1fr));
  }
}

@media (prefers-reduced-motion: reduce) {
  .fretted-wire,
  .strum-string > span {
    transform: none;
    will-change: opacity;
  }
}

.reduced-motion .fretted-wire,
.reduced-motion .strum-string > span {
  transform: none;
  will-change: opacity;
}

@media (prefers-reduced-transparency: reduce) {
  .mode-switch,
  .tuning-field select,
  .damp-control {
    background: var(--theme-popover-surface, #222329);
    backdrop-filter: none;
  }
}

@media (prefers-contrast: more) {
  .fretted-stage,
  .mode-switch,
  .tuning-field select,
  .damp-control {
    border-width: 2px;
  }

  .fretted-wire,
  .strum-string > span {
    height: 2px;
  }
}
</style>
