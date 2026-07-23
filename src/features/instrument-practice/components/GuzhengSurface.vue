<template>
  <section
    class="guzheng-surface"
    :class="{'reduced-motion': props.reducedMotion}"
    aria-label="古筝演奏区"
  >
    <div class="guzheng-controls">
      <div class="tuning-switch" role="group" aria-label="古筝调式">
        <button
          v-for="tuningOption in definition.tuningPresets"
          :key="tuningOption.id"
          type="button"
          :class="{selected: activeTuning.id === tuningOption.id}"
          :aria-pressed="activeTuning.id === tuningOption.id"
          @click="selectTuning(tuningOption.id)"
        >
          {{ tuningOption.label }}
        </button>
      </div>

      <div class="bank-switch" role="group" aria-label="横屏音区">
        <button
          v-for="bank in definition.layout.stringBanks"
          :key="bank.id"
          type="button"
          :class="{selected: activeBankId === bank.id}"
          :aria-pressed="activeBankId === bank.id"
          @click="activeBankId = bank.id"
        >
          {{ bank.label }}
        </button>
      </div>

      <span v-if="isTremoloActive" class="tremolo-status" role="status">
        摇指中
      </span>
    </div>

    <div
      ref="boardRef"
      class="guzheng-board guzheng-play-zone"
      @contextmenu.prevent
    >
      <div
        v-for="(instrumentString, stringIndex) in definition.strings"
        :key="instrumentString.id"
        :ref="(element) => setStringRowRef(element, stringIndex)"
        class="guzheng-string-row"
        :class="{
          'outside-active-bank': !isStringInActiveBank(stringIndex),
          pressed: isStringPressed(instrumentString.id)
        }"
        :data-string-index="stringIndex"
      >
        <div
          class="pressure-zone"
          role="slider"
          tabindex="0"
          aria-label="左侧按弦区"
          aria-valuemin="-80"
          aria-valuemax="200"
          :aria-valuenow="bendForString(instrumentString.id)"
          @pointerdown="onPressurePointerDown($event, stringIndex)"
          @pointermove="onPressurePointerMove"
          @pointerup="onPressurePointerEnd"
          @pointercancel="onPressurePointerCancel"
          @lostpointercapture="onPressurePointerCancel"
        >
          <span class="note-label">{{ noteLabel(stringIndex) }}</span>
        </div>

        <span class="bridge" aria-hidden="true"/>

        <button
          class="pluck-zone"
          type="button"
          :aria-label="`拨动${noteLabel(stringIndex)}弦`"
          @pointerdown="onPluckPointerDown($event, stringIndex)"
          @pointermove="onPluckPointerMove"
          @pointerup="onPluckPointerEnd"
          @pointercancel="onPluckPointerCancel"
          @lostpointercapture="onPluckPointerCancel"
          @keydown.enter.prevent="playString(stringIndex, 0.62)"
          @keydown.space.prevent="playString(stringIndex, 0.62)"
        >
          <span class="pluck-target" aria-hidden="true"/>
        </button>

        <span
          class="guzheng-string"
          :class="{active: stringEnergy(instrumentString.id) > 0.02}"
          :style="stringStyle(instrumentString.id)"
          aria-hidden="true"
        />
      </div>

      <span class="pressure-hint" aria-hidden="true">按 · 颤</span>
      <span class="pluck-hint" aria-hidden="true">拨 · 滑</span>
    </div>

    <div class="guzheng-actions">
      <button
        class="damp-button"
        type="button"
        @pointerdown="onDamp"
      >
        止音
      </button>
      <button
        class="tremolo-button"
        :class="{active: isTremoloActive}"
        type="button"
        :aria-pressed="isTremoloActive"
        @pointerdown="onTremoloPointerDown"
        @pointerup="onTremoloPointerEnd"
        @pointercancel="onTremoloPointerEnd"
        @lostpointercapture="onTremoloPointerEnd"
      >
        <span aria-hidden="true">≋</span>
        按住摇指
      </button>
    </div>
  </section>
</template>

<script setup>
import {computed, onBeforeUnmount, reactive, ref, watch} from 'vue'
import {
  clamp,
  getInstrumentDefinition,
  getTuning,
  midiToNoteName
} from '../instruments/definitions.js'
import {
  capturePointer,
  releasePointer,
  resolveIndexFromPosition,
  useInstrumentPointers,
  velocityToGain
} from '../composables/useInstrumentPointers.js'
import {useStringDynamics} from '../composables/useStringDynamics.js'

const TREMOLO_INTERVAL_MS = 95

/**
 * 公共契约：
 * - tuningId: d-pentatonic | g-pentatonic；tremolo 为受控摇指状态。
 * - performance 同步发出 note/bend/damp 标准事件。
 * - interaction 用于在同一 pointerdown 调用栈解锁 AudioContext。
 */
const props = defineProps({
  tuningId: {
    type: String,
    default: 'd-pentatonic'
  },
  tremolo: {
    type: Boolean,
    default: false
  },
  reducedMotion: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'performance',
  'interaction',
  'update:tuningId',
  'update:tremolo',
  'tremolo-change'
])

const definition = getInstrumentDefinition('guzheng')
const localTuningId = ref(props.tuningId)
const activeBankId = ref('middle')
const boardRef = ref(null)
const stringRowRefs = new Map()
const pressurePointers = reactive(new Map())
const tremoloPointers = reactive(new Set())
const tremoloTimers = new Map()
const {pointerTracker, crossingTracker, clear: clearPointers} = useInstrumentPointers()
const stringDynamics = useStringDynamics({
  reducedMotion: () => props.reducedMotion
})

const activeTuning = computed(() => getTuning(definition, localTuningId.value))
const activeBank = computed(() => (
  definition.layout.stringBanks.find((bank) => bank.id === activeBankId.value)
  || definition.layout.stringBanks[1]
))
const isTremoloActive = computed(() => props.tremolo || tremoloPointers.size > 0)

watch(() => props.tuningId, (tuningId) => {
  localTuningId.value = getTuning(definition, tuningId).id
})

watch(isTremoloActive, (active) => {
  if (!active) {
    stopAllTremolo()
    return
  }

  for (const pointerState of pointerTracker.pointers.values()) {
    if (pointerState.payload.kind === 'pluck') {
      startTremolo(pointerState.pointerId, pointerState.payload.stringIndex)
    }
  }
})

function selectTuning(tuningId) {
  localTuningId.value = getTuning(definition, tuningId).id
  emit('update:tuningId', localTuningId.value)
}

function setStringRowRef(element, stringIndex) {
  if (element) {
    stringRowRefs.set(stringIndex, element)
  } else {
    stringRowRefs.delete(stringIndex)
  }
}

function isLandscape() {
  if (typeof window === 'undefined') {
    return false
  }
  return window.matchMedia?.('(orientation: landscape)').matches
    ?? window.innerWidth > window.innerHeight
}

function visibleStringIndices() {
  if (!isLandscape()) {
    return definition.strings.map((_, index) => index)
  }
  return Array.from(
    {length: activeBank.value.end - activeBank.value.start + 1},
    (_, index) => activeBank.value.start + index
  )
}

function isStringInActiveBank(stringIndex) {
  return stringIndex >= activeBank.value.start && stringIndex <= activeBank.value.end
}

function noteLabel(stringIndex) {
  return midiToNoteName(activeTuning.value.midiNotes[stringIndex])
}

function interaction(event) {
  emit('interaction', {
    instrumentId: 'guzheng',
    pointerType: event.pointerType || 'mouse'
  })
}

function emitPerformance(performanceEvent) {
  emit('performance', {
    instrumentId: 'guzheng',
    ...performanceEvent
  })
}

function playString(stringIndex, velocity = 0.62) {
  const instrumentString = definition.strings[stringIndex]
  if (!instrumentString) {
    return
  }
  const normalizedVelocity = clamp(velocity, 0.28, 1)
  stringDynamics.pluck(instrumentString.id, normalizedVelocity)
  emitPerformance({
    type: 'note',
    stringId: instrumentString.id,
    midi: activeTuning.value.midiNotes[stringIndex],
    velocity: normalizedVelocity,
    bendCents: 0
  })
}

function stringIndexAtPoint(event) {
  for (const [stringIndex, element] of stringRowRefs.entries()) {
    const bounds = element.getBoundingClientRect()
    if (bounds.height > 0 && event.clientY >= bounds.top && event.clientY < bounds.bottom) {
      return stringIndex
    }
  }

  const boardBounds = boardRef.value?.getBoundingClientRect()
  const indices = visibleStringIndices()
  if (!boardBounds) {
    return -1
  }
  const visibleIndex = resolveIndexFromPosition(
    event.clientY,
    boardBounds.top,
    boardBounds.height,
    indices.length
  )
  return indices[visibleIndex] ?? -1
}

function onPluckPointerDown(event, stringIndex) {
  if (event.button > 0) {
    return
  }
  event.preventDefault()
  capturePointer(event)
  interaction(event)
  pointerTracker.begin(event, {kind: 'pluck', stringIndex})
  crossingTracker.begin(event.pointerId, definition.strings[stringIndex].id, event.timeStamp)
  playString(stringIndex, 0.62)
  if (isTremoloActive.value) {
    startTremolo(event.pointerId, stringIndex)
  }
}

function onPluckPointerMove(event) {
  const pointerState = pointerTracker.move(event)
  if (!pointerState?.moved || pointerState.payload.kind !== 'pluck') {
    return
  }
  const stringIndex = stringIndexAtPoint(event)
  const instrumentString = definition.strings[stringIndex]
  if (!instrumentString
    || !crossingTracker.enter(event.pointerId, instrumentString.id, event.timeStamp)) {
    return
  }

  pointerState.payload.stringIndex = stringIndex
  playString(stringIndex, velocityToGain(pointerState.velocity.speed))
  if (isTremoloActive.value) {
    startTremolo(event.pointerId, stringIndex)
  }
}

function clearPluckPointer(event) {
  const pointerState = pointerTracker.get(event.pointerId)
  if (pointerState?.payload.kind !== 'pluck') {
    return
  }
  stopTremolo(event.pointerId)
  pointerTracker.cancel(event)
  crossingTracker.end(event.pointerId)
}

function onPluckPointerEnd(event) {
  clearPluckPointer(event)
  releasePointer(event)
}

function onPluckPointerCancel(event) {
  clearPluckPointer(event)
}

function onPressurePointerDown(event, stringIndex) {
  if (event.button > 0) {
    return
  }
  event.preventDefault()
  capturePointer(event)
  interaction(event)
  pointerTracker.begin(event, {kind: 'pressure', stringIndex})
  pressurePointers.set(event.pointerId, {
    stringIndex,
    bendCents: 0
  })
}

function onPressurePointerMove(event) {
  const pointerState = pointerTracker.move(event)
  if (!pointerState?.moved || pointerState.payload.kind !== 'pressure') {
    return
  }

  const pressureState = pressurePointers.get(event.pointerId)
  if (!pressureState) {
    return
  }
  // 向琴码推动主要升高音高，纵向小幅移动作为颤音细节。
  const bendCents = Math.round(clamp(
    (event.clientX - pointerState.origin.x) * 2.5
      + (event.clientY - pointerState.origin.y) * 1.2,
    -80,
    200
  ))
  pressureState.bendCents = bendCents
  const instrumentString = definition.strings[pressureState.stringIndex]
  emitPerformance({
    type: 'bend',
    stringId: instrumentString.id,
    midi: activeTuning.value.midiNotes[pressureState.stringIndex],
    velocity: velocityToGain(pointerState.velocity.speed),
    bendCents
  })
}

function clearPressurePointer(event) {
  const pressureState = pressurePointers.get(event.pointerId)
  if (!pressureState) {
    return
  }
  const instrumentString = definition.strings[pressureState.stringIndex]
  emitPerformance({
    type: 'bend',
    stringId: instrumentString.id,
    midi: activeTuning.value.midiNotes[pressureState.stringIndex],
    velocity: 0,
    bendCents: 0
  })
  pressurePointers.delete(event.pointerId)
  pointerTracker.cancel(event)
}

function onPressurePointerEnd(event) {
  clearPressurePointer(event)
  releasePointer(event)
}

function onPressurePointerCancel(event) {
  clearPressurePointer(event)
}

function isStringPressed(stringId) {
  const stringIndex = definition.strings.findIndex((item) => item.id === stringId)
  return [...pressurePointers.values()].some((item) => item.stringIndex === stringIndex)
}

function bendForString(stringId) {
  const stringIndex = definition.strings.findIndex((item) => item.id === stringId)
  const pressureState = [...pressurePointers.values()]
    .find((item) => item.stringIndex === stringIndex)
  return pressureState?.bendCents || 0
}

function startTremolo(pointerId, stringIndex) {
  stopTremolo(pointerId)
  tremoloTimers.set(pointerId, globalThis.setInterval(() => {
    playString(stringIndex, 0.54)
  }, TREMOLO_INTERVAL_MS))
}

function stopTremolo(pointerId) {
  const timer = tremoloTimers.get(pointerId)
  if (timer !== undefined) {
    globalThis.clearInterval(timer)
    tremoloTimers.delete(pointerId)
  }
}

function stopAllTremolo() {
  for (const pointerId of tremoloTimers.keys()) {
    stopTremolo(pointerId)
  }
}

function onTremoloPointerDown(event) {
  if (event.button > 0) {
    return
  }
  event.preventDefault()
  capturePointer(event)
  interaction(event)
  tremoloPointers.add(event.pointerId)
  emit('update:tremolo', true)
  emit('tremolo-change', true)
}

function onTremoloPointerEnd(event) {
  const ownedPointer = tremoloPointers.delete(event.pointerId)
  if (ownedPointer && tremoloPointers.size === 0) {
    emit('update:tremolo', false)
    emit('tremolo-change', false)
  }
  releasePointer(event)
}

function onDamp(event) {
  interaction(event)
  emitPerformance({type: 'damp', stringId: null, velocity: 1})
}

function stringStyle(stringId) {
  return stringDynamics.styleFor(stringId)
}

function stringEnergy(stringId) {
  return stringDynamics.states[stringId]?.energy || 0
}

onBeforeUnmount(() => {
  stopAllTremolo()
  pressurePointers.clear()
  tremoloPointers.clear()
  clearPointers()
})
</script>

<style scoped>
.guzheng-surface {
  --cyan: #60e6ee;
  --wood-deep: #3a1710;
  --wood-mid: #874527;
  --wood-gold: #ca8a4c;
  width: 100%;
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 0.65rem;
  color: var(--theme-text, #f5f5f7);
}

.guzheng-controls,
.guzheng-actions {
  min-height: 2.75rem;
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.tuning-switch,
.bank-switch {
  display: flex;
  padding: 0.18rem;
  border: 1px solid var(--theme-border, rgba(255, 255, 255, 0.14));
  border-radius: 0.8rem;
  background: rgba(6, 18, 28, 0.56);
}

.tuning-switch button,
.bank-switch button {
  min-height: 2.25rem;
  min-width: 3.25rem;
  padding: 0.3rem 0.65rem;
  color: var(--theme-text-muted, rgba(235, 235, 245, 0.6));
  background: transparent;
  border: 0;
  border-radius: 0.62rem;
  font-size: 0.75rem;
  font-weight: 680;
}

.tuning-switch button.selected,
.bank-switch button.selected {
  color: #071820;
  background: var(--cyan);
  box-shadow: 0 5px 18px rgba(24, 199, 214, 0.2);
}

.bank-switch {
  display: none;
}

.tremolo-status {
  margin-left: auto;
  padding: 0.3rem 0.58rem;
  color: #071820;
  background: var(--cyan);
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 760;
}

.guzheng-board {
  position: relative;
  min-height: 28rem;
  display: grid;
  grid-template-rows: repeat(21, minmax(1.18rem, 1fr));
  overflow: hidden;
  border: 1px solid rgba(246, 197, 132, 0.3);
  border-radius: 1.35rem 2.4rem 1.35rem 2.4rem;
  background:
    linear-gradient(90deg, rgba(58, 17, 8, 0.2), transparent 14% 78%, rgba(45, 11, 6, 0.38)),
    repeating-linear-gradient(88deg, transparent 0 22px, rgba(64, 18, 7, 0.14) 23px 24px),
    linear-gradient(130deg, #d09a59, var(--wood-mid) 48%, var(--wood-deep));
  box-shadow:
    inset 0 1px rgba(255, 228, 178, 0.38),
    inset 0 -25px 60px rgba(32, 7, 3, 0.32),
    var(--theme-shadow-sm, 0 14px 34px rgba(0, 0, 0, 0.28));
  touch-action: none;
  user-select: none;
}

.guzheng-string-row {
  position: relative;
  min-height: 1.18rem;
  display: grid;
  grid-template-columns: minmax(5.2rem, 42%) 1rem minmax(6rem, 1fr);
}

.guzheng-string-row::after {
  content: "";
  position: absolute;
  inset: auto 1.2rem 0 1.2rem;
  height: 1px;
  background: rgba(77, 26, 13, 0.13);
  pointer-events: none;
}

.pressure-zone,
.pluck-zone {
  position: relative;
  z-index: 2;
  min-width: 0;
  min-height: 1.18rem;
  padding: 0;
  background: transparent;
  border: 0;
  border-radius: 0;
  touch-action: none;
}

.pressure-zone {
  cursor: ew-resize;
}

.pluck-zone {
  cursor: ns-resize;
}

.note-label {
  position: absolute;
  left: 0.48rem;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 237, 207, 0.62);
  font-size: 0.56rem;
  font-weight: 660;
  font-variant-numeric: tabular-nums;
  pointer-events: none;
}

.bridge {
  z-index: 3;
  align-self: center;
  justify-self: center;
  width: 0.7rem;
  height: 82%;
  min-height: 1rem;
  clip-path: polygon(50% 0, 95% 100%, 5% 100%);
  background: linear-gradient(90deg, #805326, #f2ca78 48%, #8d5b29);
  filter: drop-shadow(2px 2px 2px rgba(38, 10, 4, 0.48));
  pointer-events: none;
}

.guzheng-string {
  position: absolute;
  z-index: 4;
  left: 1.1rem;
  right: 1.1rem;
  top: 50%;
  height: 1px;
  transform: translate3d(0, var(--string-displacement, 0), 0);
  transform-origin: 63% center;
  background: linear-gradient(180deg, #fff2c9, #9e7c54 58%, #ffe8b5);
  box-shadow:
    0 1px 1px rgba(41, 12, 5, 0.7),
    0 0 calc(9px * var(--string-energy, 0)) rgba(96, 230, 238, 0.96);
  pointer-events: none;
  will-change: transform, opacity;
}

.guzheng-string.active {
  height: 1.5px;
  background: var(--cyan);
}

.guzheng-string-row.pressed .guzheng-string {
  background: linear-gradient(90deg, var(--cyan) 0 42%, #fff0c7 49%);
}

.pluck-target {
  position: absolute;
  top: 50%;
  right: 12%;
  width: 0.42rem;
  height: 0.42rem;
  transform: translateY(-50%) scale(calc(0.82 + var(--string-energy, 0) * 0.45));
  border-radius: 50%;
  background: rgba(96, 230, 238, calc(0.18 + var(--string-energy, 0) * 0.5));
  pointer-events: none;
}

.pressure-hint,
.pluck-hint {
  position: absolute;
  z-index: 5;
  bottom: 0.55rem;
  padding: 0.18rem 0.42rem;
  color: rgba(255, 238, 211, 0.52);
  background: rgba(42, 12, 6, 0.38);
  border-radius: 999px;
  font-size: 0.57rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  pointer-events: none;
}

.pressure-hint {
  left: 0.55rem;
}

.pluck-hint {
  right: 0.55rem;
}

.guzheng-actions {
  justify-content: flex-end;
}

.damp-button,
.tremolo-button {
  min-height: 2.75rem;
  padding: 0.42rem 0.88rem;
  color: var(--theme-text-soft, rgba(245, 245, 247, 0.86));
  background: var(--theme-control-surface, rgba(255, 255, 255, 0.1));
  border: 1px solid var(--theme-border, rgba(255, 255, 255, 0.14));
  border-radius: 0.82rem;
  font-size: 0.74rem;
  font-weight: 690;
}

.tremolo-button {
  display: flex;
  align-items: center;
  gap: 0.38rem;
}

.tremolo-button > span {
  color: var(--cyan);
  font-size: 1.15rem;
  line-height: 1;
}

.tremolo-button.active {
  color: #071820;
  background: var(--cyan);
  border-color: rgba(180, 252, 255, 0.9);
}

.tremolo-button.active > span {
  color: inherit;
}

@media (orientation: landscape) {
  .bank-switch {
    display: flex;
  }

  .guzheng-board {
    min-height: 19rem;
    grid-template-rows: repeat(7, minmax(2.5rem, 1fr));
  }

  .guzheng-string-row {
    min-height: 2.5rem;
  }

  .guzheng-string-row.outside-active-bank {
    display: none;
  }

  .pressure-zone,
  .pluck-zone {
    min-height: 2.5rem;
  }
}

@media (max-width: 35rem) {
  .guzheng-string-row {
    grid-template-columns: minmax(4.2rem, 39%) 0.9rem minmax(5rem, 1fr);
  }

  .note-label {
    font-size: 0.52rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .guzheng-string {
    transform: none;
    will-change: opacity;
  }

  .pluck-target {
    transform: translateY(-50%);
  }
}

.reduced-motion .guzheng-string {
  transform: none;
  will-change: opacity;
}

.reduced-motion .pluck-target {
  transform: translateY(-50%);
}

@media (prefers-reduced-transparency: reduce) {
  .tuning-switch,
  .bank-switch,
  .damp-button,
  .tremolo-button {
    background: var(--theme-popover-surface, #222329);
    backdrop-filter: none;
  }
}

@media (prefers-contrast: more) {
  .guzheng-board,
  .tuning-switch,
  .bank-switch,
  .damp-button,
  .tremolo-button {
    border-width: 2px;
  }

  .guzheng-string {
    height: 2px;
  }
}
</style>
