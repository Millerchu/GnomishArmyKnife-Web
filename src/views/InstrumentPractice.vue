<template>
  <div
    class="instrument-practice-page"
    :class="{
      'compact-landscape': compactLandscape,
      'chrome-hidden': compactLandscape && landscapeChromeHidden
    }"
  >
    <header
      id="practice-header"
      class="practice-header"
      :aria-hidden="compactLandscape && landscapeChromeHidden"
      :inert="compactLandscape && landscapeChromeHidden"
    >
      <div class="header-leading">
        <button class="icon-button back-button" type="button" aria-label="返回应用首页" @click="goHome">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m14.5 5-7 7 7 7"/>
          </svg>
        </button>
        <div class="page-identity">
          <span class="identity-mark" aria-hidden="true">
            <i/><i/><i/>
          </span>
          <div>
            <p>随身乐器</p>
            <h1>{{ currentDefinition.label }}</h1>
          </div>
        </div>
      </div>

      <nav class="instrument-switcher" aria-label="选择乐器">
        <button
          v-for="instrument in instrumentOptions"
          :key="instrument.id"
          type="button"
          :class="{selected: currentInstrumentId === instrument.id}"
          :aria-current="currentInstrumentId === instrument.id ? 'page' : undefined"
          @click="selectInstrument(instrument.id)"
        >
          <span class="instrument-glyph" :class="`glyph-${instrument.id}`" aria-hidden="true"/>
          {{ instrument.label }}
          <span
            v-if="audio.loadedInstrumentIds.value.includes(instrument.id)"
            class="loaded-dot"
            aria-label="采样已就绪"
          />
        </button>
      </nav>

      <div class="audio-status" :class="`status-${audio.status.value}`" role="status" aria-live="polite">
        <span class="status-indicator" aria-hidden="true"/>
        <span>{{ audioStatusLabel }}</span>
        <button
          v-if="canRetryAudio"
          type="button"
          @click="retryAudio"
        >
          重试
        </button>
      </div>
    </header>

    <main class="practice-main">
      <section class="instrument-stage" :aria-busy="audio.status.value === 'loading'">
        <div v-if="audio.status.value === 'loading'" class="loading-material" aria-hidden="true">
          <span/><span/><span/>
        </div>

        <GuzhengSurface
          v-if="currentInstrumentId === 'guzheng'"
          v-model:tuning-id="activeTuningId"
          v-model:tremolo="tremoloActive"
          :reduced-motion="reducedMotion"
          @interaction="handleInteraction"
          @performance="handlePerformance"
        />
        <PianoSurface
          v-else-if="currentInstrumentId === 'piano'"
          :reduced-motion="reducedMotion"
          @interaction="handleInteraction"
          @performance="handlePerformance"
        />
        <FrettedInstrumentSurface
          v-else
          v-model:mode="activeMode"
          v-model:tuning-id="activeTuningId"
          v-model:chord-id="activeChordId"
          :instrument-id="currentInstrumentId"
          :reduced-motion="reducedMotion"
          @interaction="handleInteraction"
          @performance="handlePerformance"
        />
      </section>
    </main>

    <footer
      id="practice-toolbar"
      class="practice-toolbar"
      aria-label="练习工具"
      :aria-hidden="compactLandscape && landscapeChromeHidden"
      :inert="compactLandscape && landscapeChromeHidden"
    >
      <div class="beat-readout" :class="{active: metronome.isRunning.value}" aria-hidden="true">
        <span
          v-for="beat in visibleBeatCount"
          :key="beat"
          :class="{current: metronome.currentBeat.value === beat}"
        />
      </div>

      <button
        class="tool-button metronome-button"
        :class="{active: metronome.isRunning.value}"
        type="button"
        :aria-pressed="metronome.isRunning.value"
        @click="toggleMetronome"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 20h8M9.5 4h5l3.5 16H6L9.5 4Z"/>
          <path d="m12 8 3 5"/>
        </svg>
        <span>{{ metronome.bpm.value }}</span>
        <small>BPM</small>
      </button>

      <button
        class="record-button"
        :class="{recording: recorder.isRecording.value}"
        type="button"
        :aria-pressed="recorder.isRecording.value"
        :aria-label="recorder.isRecording.value ? '停止录制' : '开始录制'"
        @click="toggleRecording"
      >
        <span aria-hidden="true"/>
        <strong>{{ recorder.isRecording.value ? '停止' : '录制' }}</strong>
      </button>

      <button
        class="tool-button"
        :class="{active: recorder.activePlaybackId.value}"
        type="button"
        aria-label="打开本次练习录音列表"
        @click="takesDialogVisible = true"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 6h14M5 12h14M5 18h9"/>
          <circle cx="18" cy="18" r="2"/>
        </svg>
        <span>片段</span>
        <small>{{ recorder.takes.value.length }}/5</small>
      </button>

      <button
        class="tool-button"
        type="button"
        aria-label="打开练习设置"
        @click="settingsDialogVisible = true"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6"/>
        </svg>
        <span>设置</span>
        <small>{{ metronome.meter.value }}</small>
      </button>
    </footer>

    <button
      v-if="compactLandscape"
      class="landscape-chrome-toggle"
      :class="{
        expanded: !landscapeChromeHidden,
        recording: recorder.isRecording.value,
        ticking: metronome.isRunning.value
      }"
      type="button"
      aria-controls="practice-header practice-toolbar"
      :aria-expanded="!landscapeChromeHidden"
      :aria-label="landscapeChromeHidden ? '显示乐器与练习控件' : '隐藏乐器与练习控件'"
      @click="toggleLandscapeChrome"
    >
      <span class="chrome-toggle-status" aria-hidden="true"/>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path v-if="landscapeChromeHidden" d="m7 9 5 5 5-5"/>
        <path v-else d="m7 15 5-5 5 5"/>
      </svg>
      <span>{{ landscapeChromeHidden ? '显示控件' : '隐藏控件' }}</span>
    </button>

    <Transition name="practice-notice">
      <p v-if="noticeMessage" class="practice-notice" role="status">
        {{ noticeMessage }}
      </p>
    </Transition>

    <MacDialog
      v-model="takesDialogVisible"
      title="本次练习片段"
      subtitle="片段只保留在当前页面会话中"
      width="560px"
      mobile-presentation="sheet"
      :confirm-on-dirty="false"
      panel-class="instrument-practice-sheet"
    >
      <div v-if="recorder.takes.value.length" class="take-list">
        <article
          v-for="(take, index) in reversedTakes"
          :key="take.id"
          class="take-card"
          :class="{playing: recorder.activePlaybackId.value === take.id}"
        >
          <div class="take-index" aria-hidden="true">{{ recorder.takes.value.length - index }}</div>
          <div class="take-copy">
            <strong>{{ instrumentLabel(take.instrumentId) }}</strong>
            <span>{{ tuningLabel(take) }} · {{ take.bpm }} BPM · {{ take.meter }}</span>
            <small>{{ formatDuration(take.durationMs) }} · {{ take.events.length }} 个动作</small>
          </div>
          <button
            class="take-play"
            type="button"
            :aria-label="recorder.activePlaybackId.value === take.id ? '停止回放' : '回放片段'"
            @click="toggleTakePlayback(take)"
          >
            <svg v-if="recorder.activePlaybackId.value !== take.id" viewBox="0 0 24 24" aria-hidden="true">
              <path d="m9 7 8 5-8 5V7Z"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 8h8v8H8z"/>
            </svg>
          </button>
          <button
            class="take-delete"
            type="button"
            aria-label="删除片段"
            @click="recorder.deleteTake(take.id)"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 7h14M9 7V4h6v3M8 10v8M12 10v8M16 10v8M7 7l1 13h8l1-13"/>
            </svg>
          </button>
        </article>
      </div>
      <div v-else class="empty-takes">
        <span class="empty-wave" aria-hidden="true"><i/><i/><i/><i/><i/></span>
        <h2>还没有练习片段</h2>
        <p>点击底部录制键，演奏动作会被轻量记录，无需麦克风权限。</p>
      </div>
    </MacDialog>

    <MacDialog
      v-model="settingsDialogVisible"
      title="练习设置"
      subtitle="设置仅在本次页面会话中生效"
      width="560px"
      mobile-presentation="sheet"
      :confirm-on-dirty="false"
      panel-class="instrument-practice-sheet"
    >
      <div class="practice-settings">
        <section class="settings-section">
          <div class="settings-heading">
            <div>
              <span>节拍器</span>
              <p>稳定速度，不写入演奏录音</p>
            </div>
            <button
              type="button"
              :class="{active: metronome.isRunning.value}"
              :aria-pressed="metronome.isRunning.value"
              @click="toggleMetronome"
            >
              {{ metronome.isRunning.value ? '运行中' : '开启' }}
            </button>
          </div>
          <label class="range-field">
            <span>速度</span>
            <input
              :value="metronome.bpm.value"
              type="range"
              min="40"
              max="220"
              step="1"
              @input="metronome.setBpm(Number($event.target.value))"
            >
            <output>{{ metronome.bpm.value }} BPM</output>
          </label>
          <label class="select-field">
            <span>拍号</span>
            <select :value="metronome.meter.value" @change="metronome.setMeter($event.target.value)">
              <option v-for="meter in meterOptions" :key="meter" :value="meter">{{ meter }}</option>
            </select>
          </label>
        </section>

        <section class="settings-section">
          <div class="settings-heading">
            <div>
              <span>声音</span>
              <p>分别控制乐器与节拍提示</p>
            </div>
          </div>
          <label class="range-field">
            <span>乐器</span>
            <input v-model.number="instrumentVolume" type="range" min="0" max="1" step="0.05">
            <output>{{ Math.round(instrumentVolume * 100) }}%</output>
          </label>
          <label class="range-field">
            <span>节拍</span>
            <input v-model.number="metronomeVolume" type="range" min="0" max="1" step="0.05">
            <output>{{ Math.round(metronomeVolume * 100) }}%</output>
          </label>
        </section>

        <section class="settings-section compact-settings">
          <label class="toggle-field">
            <span>
              <strong>触感提示</strong>
              <small>仅在开始与停止录制时轻触反馈</small>
            </span>
            <input v-model="hapticsEnabled" type="checkbox">
          </label>
          <div class="source-note">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 8v5M12 17h.01"/>
              <circle cx="12" cy="12" r="9"/>
            </svg>
            <p>采样乐器使用 CC0 公共领域素材；钢琴使用原生合成音色。应用不读取麦克风，也不会上传演奏记录。</p>
          </div>
        </section>
      </div>
    </MacDialog>
  </div>
</template>

<script setup>
import {computed, onBeforeUnmount, onMounted, reactive, ref, watch} from 'vue'
import {useRouter} from 'vue-router'

import MacDialog from '@/components/MacDialog.vue'
import FrettedInstrumentSurface from '@/features/instrument-practice/components/FrettedInstrumentSurface.vue'
import GuzhengSurface from '@/features/instrument-practice/components/GuzhengSurface.vue'
import PianoSurface from '@/features/instrument-practice/components/PianoSurface.vue'
import {
  useInstrumentAudio,
  useMetronome,
  useSessionRecorder
} from '@/features/instrument-practice/composables/index.js'
import {
  INSTRUMENT_DEFINITIONS,
  getInstrumentDefinition,
  getTuning
} from '@/features/instrument-practice/instruments/definitions.js'

const NOTICE_DURATION_MS = 2600
const meterOptions = Object.freeze(['2/4', '3/4', '4/4', '6/8'])
const router = useRouter()
const audio = useInstrumentAudio()
const metronome = useMetronome({engine: audio.engine})
const recorder = useSessionRecorder({engine: audio.engine})

const currentInstrumentId = ref('guzheng')
const tremoloActive = ref(false)
const takesDialogVisible = ref(false)
const settingsDialogVisible = ref(false)
const noticeMessage = ref('')
const instrumentVolume = ref(1)
const metronomeVolume = ref(0.55)
const hapticsEnabled = ref(true)
const reducedMotion = ref(false)
const compactLandscape = ref(false)
const landscapeChromeHidden = ref(false)
const tuningIds = reactive({
  guzheng: 'd-pentatonic',
  guitar: 'standard',
  ukulele: 'high-g',
  piano: 'concert-pitch'
})
const modes = reactive({
  guitar: 'chord',
  ukulele: 'chord'
})
const chordIds = reactive({
  guitar: 'c-major',
  ukulele: 'c-major'
})

const instrumentOptions = Object.values(INSTRUMENT_DEFINITIONS)
const currentDefinition = computed(() => getInstrumentDefinition(currentInstrumentId.value))
const activeTuningId = computed({
  get: () => tuningIds[currentInstrumentId.value],
  set: (tuningId) => {
    tuningIds[currentInstrumentId.value] = tuningId
  }
})
const activeMode = computed({
  get: () => modes[currentInstrumentId.value] || 'chord',
  set: (mode) => {
    modes[currentInstrumentId.value] = mode
  }
})
const activeChordId = computed({
  get: () => chordIds[currentInstrumentId.value] || 'c-major',
  set: (chordId) => {
    chordIds[currentInstrumentId.value] = chordId
  }
})
const reversedTakes = computed(() => [...recorder.takes.value].reverse())
const visibleBeatCount = computed(() => Number(metronome.meter.value.split('/')[0]) || 4)
const canRetryAudio = computed(() => (
  ['blocked', 'error', 'suspended'].includes(audio.status.value)
))
const audioStatusLabel = computed(() => {
  const instrumentName = currentDefinition.value.label
  const statusLabels = {
    idle: '准备采样',
    loading: `正在加载${instrumentName}`,
    prepared: '轻触琴弦启用声音',
    ready: '实时演奏',
    blocked: '声音等待授权',
    error: '采样加载失败',
    unsupported: '浏览器不支持实时音频',
    suspended: '轻触恢复声音'
  }
  return statusLabels[audio.status.value] || '准备就绪'
})

let noticeTimerId = null
let mediaPreference = null
let compactLandscapePreference = null
let instrumentSwitchToken = 0

function showNotice(message) {
  noticeMessage.value = message
  if (noticeTimerId !== null) {
    globalThis.clearTimeout(noticeTimerId)
  }
  noticeTimerId = globalThis.setTimeout(() => {
    noticeMessage.value = ''
    noticeTimerId = null
  }, NOTICE_DURATION_MS)
}

function vibrate(pattern = 12) {
  if (hapticsEnabled.value && typeof globalThis.navigator?.vibrate === 'function') {
    globalThis.navigator.vibrate(pattern)
  }
}

function syncVolumes() {
  audio.setVolumes({
    master: 0.9,
    instrument: instrumentVolume.value,
    metronome: metronomeVolume.value
  })
}

async function prepareInstrument(instrumentId) {
  const definition = getInstrumentDefinition(instrumentId)
  const loaded = await audio.prepareInstrument(definition)
  if (!loaded && audio.error.value) {
    showNotice(audio.error.value)
  }
  return loaded
}

async function selectInstrument(instrumentId, {announce = true} = {}) {
  if (!INSTRUMENT_DEFINITIONS[instrumentId] || instrumentId === currentInstrumentId.value) {
    return true
  }
  const switchToken = ++instrumentSwitchToken
  if (recorder.isRecording.value) {
    recorder.stopRecording()
    vibrate([8, 40, 8])
    showNotice('已保存当前录制片段')
  }
  recorder.stopPlayback()
  audio.stopAll()
  tremoloActive.value = false
  currentInstrumentId.value = instrumentId
  const loaded = await prepareInstrument(instrumentId)
  if (switchToken !== instrumentSwitchToken) {
    return false
  }
  if (loaded && announce) {
    showNotice(`${getInstrumentDefinition(instrumentId).label}已就绪`)
  }
  return loaded
}

function handleInteraction() {
  void audio.unlock().then((unlocked) => {
    if (unlocked) {
      syncVolumes()
    }
  })
}

function handlePerformance(performanceEvent) {
  void audio.playPerformanceEvent(performanceEvent)
  recorder.capture(performanceEvent)
}

async function retryAudio() {
  const recovered = await audio.retry()
  if (recovered) {
    syncVolumes()
    showNotice('声音已恢复')
  }
}

async function toggleMetronome() {
  const running = await metronome.toggle()
  if (!running && !metronome.isRunning.value && audio.status.value === 'blocked') {
    showNotice('请轻触演奏区后再次开启节拍器')
  }
}

function toggleRecording() {
  if (recorder.isRecording.value) {
    const take = recorder.stopRecording()
    vibrate([10, 35, 10])
    showNotice(take?.events.length ? '练习片段已保存' : '已保存空白练习片段')
    return
  }
  recorder.stopPlayback()
  const started = recorder.startRecording({
    instrumentId: currentInstrumentId.value,
    tuningId: activeTuningId.value,
    bpm: metronome.bpm.value,
    meter: metronome.meter.value
  })
  if (started) {
    vibrate(12)
    showNotice('开始记录演奏动作')
  }
}

async function toggleTakePlayback(take) {
  if (recorder.activePlaybackId.value === take.id) {
    recorder.stopPlayback()
    return
  }
  const unlockPromise = audio.unlock()
  if (take.instrumentId !== currentInstrumentId.value) {
    const switched = await selectInstrument(take.instrumentId, {announce: false})
    if (!switched) {
      return
    }
  } else {
    await prepareInstrument(take.instrumentId)
  }
  const unlocked = await unlockPromise
  if (!unlocked) {
    showNotice('声音未启用，请轻触演奏区重试')
    return
  }
  syncVolumes()
  recorder.replayTake(take.id)
}

function instrumentLabel(instrumentId) {
  return getInstrumentDefinition(instrumentId).label
}

function tuningLabel(take) {
  const definition = getInstrumentDefinition(take.instrumentId)
  return getTuning(definition, take.tuningId).label
}

function formatDuration(durationMs) {
  const totalSeconds = Math.max(0, Math.round(Number(durationMs) / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = `${totalSeconds % 60}`.padStart(2, '0')
  return `${minutes}:${seconds}`
}

function updateMotionPreference(event) {
  reducedMotion.value = Boolean(event?.matches)
}

function updateCompactLandscapePreference(event) {
  const nextCompactLandscape = Boolean(event?.matches)
  const enteringCompactLandscape = nextCompactLandscape && !compactLandscape.value
  compactLandscape.value = nextCompactLandscape

  if (enteringCompactLandscape) {
    landscapeChromeHidden.value = true
  } else if (!nextCompactLandscape) {
    landscapeChromeHidden.value = false
  }
}

function toggleLandscapeChrome() {
  if (!compactLandscape.value) {
    return
  }
  landscapeChromeHidden.value = !landscapeChromeHidden.value
}

function goHome() {
  router.push('/home')
}

watch([instrumentVolume, metronomeVolume], syncVolumes)

onMounted(async () => {
  mediaPreference = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)') || null
  compactLandscapePreference = globalThis.matchMedia?.(
    '(orientation: landscape) and (max-height: 34rem)'
  ) || null
  updateMotionPreference(mediaPreference)
  updateCompactLandscapePreference(compactLandscapePreference)
  mediaPreference?.addEventListener?.('change', updateMotionPreference)
  compactLandscapePreference?.addEventListener?.('change', updateCompactLandscapePreference)
  await prepareInstrument(currentInstrumentId.value)
  audio.prefetchInstruments(
    instrumentOptions.filter((definition) => definition.id !== currentInstrumentId.value)
  )
})

onBeforeUnmount(() => {
  if (noticeTimerId !== null) {
    globalThis.clearTimeout(noticeTimerId)
  }
  mediaPreference?.removeEventListener?.('change', updateMotionPreference)
  compactLandscapePreference?.removeEventListener?.('change', updateCompactLandscapePreference)
  metronome.stop()
  recorder.clearTakes()
  audio.stopAll()
})
</script>

<style scoped>
.instrument-practice-page {
  --practice-cyan: #60e6ee;
  --practice-cyan-soft: rgba(96, 230, 238, 0.16);
  --practice-orange: #ff914d;
  --practice-ink: #06111b;
  --practice-material: rgba(10, 24, 36, 0.72);
  position: fixed;
  inset: 0;
  z-index: 30;
  min-width: 20rem;
  height: 100dvh;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  overflow: hidden;
  color: #f7fbff;
  background:
    radial-gradient(circle at 15% 8%, rgba(57, 127, 150, 0.22), transparent 30rem),
    radial-gradient(circle at 86% 86%, rgba(150, 76, 35, 0.18), transparent 32rem),
    linear-gradient(148deg, #0a1a27, #04101a 58%, #081018);
  isolation: isolate;
}

.instrument-practice-page::before,
.instrument-practice-page::after {
  content: "";
  position: absolute;
  z-index: -1;
  pointer-events: none;
}

.instrument-practice-page::before {
  inset: 0;
  opacity: 0.11;
  background-image:
    repeating-linear-gradient(92deg, transparent 0 28px, rgba(255, 255, 255, 0.04) 29px 30px),
    linear-gradient(120deg, transparent 35%, rgba(96, 230, 238, 0.14) 35.1% 35.3%, transparent 35.4%);
  mask-image: linear-gradient(to bottom, transparent, #000 14%, #000 86%, transparent);
}

.instrument-practice-page::after {
  width: 22rem;
  height: 22rem;
  right: -12rem;
  top: 18%;
  border: 1px solid rgba(96, 230, 238, 0.12);
  border-radius: 50%;
  box-shadow: 0 0 0 4rem rgba(96, 230, 238, 0.018), 0 0 0 8rem rgba(96, 230, 238, 0.012);
}

button,
select,
input {
  font: inherit;
}

button {
  -webkit-tap-highlight-color: transparent;
}

.practice-header {
  position: relative;
  z-index: 10;
  display: grid;
  grid-template-columns: minmax(8rem, 1fr) auto minmax(8rem, 1fr);
  align-items: center;
  gap: 1rem;
  padding:
    max(0.7rem, env(safe-area-inset-top))
    max(1rem, env(safe-area-inset-right))
    0.7rem
    max(1rem, env(safe-area-inset-left));
  background: linear-gradient(180deg, rgba(4, 14, 23, 0.92), rgba(4, 14, 23, 0.58));
  border-bottom: 1px solid rgba(170, 222, 237, 0.12);
  box-shadow: 0 1rem 2rem rgba(0, 0, 0, 0.12);
  backdrop-filter: blur(24px) saturate(145%);
}

.header-leading {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.72rem;
}

.icon-button {
  width: 2.75rem;
  height: 2.75rem;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  padding: 0;
  color: rgba(242, 250, 255, 0.86);
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(185, 225, 238, 0.14);
  border-radius: 0.9rem;
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.08);
}

.icon-button:active {
  transform: scale(0.94);
  background: rgba(96, 230, 238, 0.13);
}

.icon-button svg {
  width: 1.25rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.page-identity {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.58rem;
}

.page-identity p,
.page-identity h1 {
  margin: 0;
}

.page-identity p {
  color: rgba(218, 233, 241, 0.5);
  font-size: 0.62rem;
  font-weight: 720;
  letter-spacing: 0.14em;
}

.page-identity h1 {
  margin-top: 0.1rem;
  font-family: ui-serif, "Songti SC", "STSong", serif;
  font-size: 1.04rem;
  line-height: 1.05;
  letter-spacing: 0.02em;
}

.identity-mark {
  width: 1.85rem;
  height: 1.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.16rem;
  border-radius: 0.62rem;
  background: linear-gradient(145deg, rgba(96, 230, 238, 0.22), rgba(255, 145, 77, 0.12));
  border: 1px solid rgba(96, 230, 238, 0.22);
}

.identity-mark i {
  width: 1px;
  height: 1rem;
  background: var(--practice-cyan);
  box-shadow: 0 0 0.35rem rgba(96, 230, 238, 0.62);
  transform: rotate(12deg);
}

.identity-mark i:nth-child(2) {
  height: 1.3rem;
}

.instrument-switcher {
  justify-self: center;
  display: grid;
  grid-template-columns: repeat(4, minmax(5.25rem, 1fr));
  padding: 0.22rem;
  background: rgba(1, 9, 15, 0.48);
  border: 1px solid rgba(178, 222, 235, 0.12);
  border-radius: 1rem;
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.05);
}

.instrument-switcher button {
  position: relative;
  min-height: 2.65rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.38rem;
  padding: 0.35rem 0.72rem;
  color: rgba(224, 236, 243, 0.58);
  background: transparent;
  border: 0;
  border-radius: 0.78rem;
  font-size: 0.76rem;
  font-weight: 720;
  transition: color 120ms ease, background-color 120ms ease, transform 100ms ease-out;
}

.instrument-switcher button:active {
  transform: scale(0.96);
}

.instrument-switcher button.selected {
  color: #06151d;
  background: linear-gradient(145deg, #8cf4f6, #53dce7);
  box-shadow: 0 0.45rem 1.4rem rgba(27, 200, 214, 0.22), inset 0 1px rgba(255, 255, 255, 0.68);
}

.instrument-glyph {
  position: relative;
  width: 1rem;
  height: 1rem;
  flex: 0 0 auto;
  opacity: 0.76;
}

.instrument-glyph::before,
.instrument-glyph::after {
  content: "";
  position: absolute;
}

.glyph-guzheng::before {
  inset: 0.18rem 0.02rem;
  border: 1px solid currentColor;
  border-radius: 45% 20%;
  transform: rotate(-8deg);
}

.glyph-guzheng::after {
  left: 0.2rem;
  right: 0.15rem;
  top: 0.48rem;
  height: 1px;
  background: currentColor;
  box-shadow: 0 -0.2rem currentColor, 0 0.2rem currentColor;
  transform: rotate(-8deg);
}

.glyph-guitar::before,
.glyph-ukulele::before {
  width: 0.62rem;
  height: 0.74rem;
  left: 0;
  bottom: 0;
  border: 1px solid currentColor;
  border-radius: 45%;
  transform: rotate(-24deg);
}

.glyph-guitar::after,
.glyph-ukulele::after {
  width: 0.62rem;
  height: 1px;
  right: 0;
  top: 0.24rem;
  background: currentColor;
  transform: rotate(-50deg);
  transform-origin: right;
}

.glyph-ukulele {
  transform: scale(0.84);
}

.glyph-piano::before {
  inset: 0.12rem 0.05rem 0.18rem;
  border: 1px solid currentColor;
  border-radius: 0.14rem 0.14rem 0.3rem 0.3rem;
  background: repeating-linear-gradient(90deg, transparent 0 calc(25% - 1px), currentColor calc(25% - 1px) 25%);
}

.glyph-piano::after {
  left: 0.16rem;
  right: 0.16rem;
  top: 0.12rem;
  height: 0.38rem;
  background: currentColor;
  border-radius: 0.1rem 0.1rem 0.02rem 0.02rem;
  box-shadow: 0.2rem 0.3rem rgba(0, 0, 0, 0.5), 0.6rem 0.3rem rgba(0, 0, 0, 0.5);
}

.loaded-dot {
  position: absolute;
  right: 0.35rem;
  top: 0.35rem;
  width: 0.28rem;
  height: 0.28rem;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.46;
}

.audio-status {
  justify-self: end;
  min-height: 2.35rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.6rem;
  color: rgba(224, 237, 244, 0.62);
  background: rgba(255, 255, 255, 0.045);
  border: 1px solid rgba(174, 219, 234, 0.1);
  border-radius: 999px;
  font-size: 0.66rem;
  font-weight: 650;
  white-space: nowrap;
}

.status-indicator {
  width: 0.42rem;
  height: 0.42rem;
  border-radius: 50%;
  background: rgba(202, 219, 227, 0.5);
}

.status-ready .status-indicator {
  background: var(--practice-cyan);
  box-shadow: 0 0 0.55rem rgba(96, 230, 238, 0.72);
}

.status-loading .status-indicator {
  background: #f1c57d;
  animation: status-breathe 1s ease-in-out infinite alternate;
}

.status-error .status-indicator,
.status-blocked .status-indicator {
  background: var(--practice-orange);
}

.audio-status button {
  min-height: 1.65rem;
  padding: 0.15rem 0.45rem;
  color: #fff3e8;
  background: rgba(255, 145, 77, 0.2);
  border: 1px solid rgba(255, 145, 77, 0.35);
  border-radius: 999px;
  font-size: inherit;
}

.practice-main {
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
  padding: clamp(0.7rem, 2vw, 1.25rem) max(0.9rem, env(safe-area-inset-right))
    clamp(0.7rem, 2vw, 1.25rem) max(0.9rem, env(safe-area-inset-left));
  scrollbar-width: none;
}

.practice-main::-webkit-scrollbar {
  display: none;
}

.instrument-stage {
  position: relative;
  width: min(100%, 74rem);
  min-height: 100%;
  margin: 0 auto;
  display: flex;
}

.loading-material {
  position: absolute;
  z-index: 8;
  right: 0.65rem;
  top: 0.65rem;
  display: flex;
  align-items: center;
  gap: 0.18rem;
  padding: 0.42rem 0.58rem;
  background: rgba(4, 14, 23, 0.7);
  border: 1px solid rgba(96, 230, 238, 0.16);
  border-radius: 999px;
  backdrop-filter: blur(14px);
  pointer-events: none;
}

.loading-material span {
  width: 0.18rem;
  height: 0.7rem;
  border-radius: 999px;
  background: var(--practice-cyan);
  animation: loading-wave 650ms ease-in-out infinite alternate;
}

.loading-material span:nth-child(2) {
  animation-delay: 120ms;
}

.loading-material span:nth-child(3) {
  animation-delay: 240ms;
}

.practice-toolbar {
  position: relative;
  z-index: 12;
  justify-self: center;
  min-width: min(100%, 25rem);
  min-height: 4.65rem;
  display: grid;
  grid-template-columns: repeat(4, minmax(3.6rem, 1fr));
  align-items: center;
  gap: 0.35rem;
  margin: 0 auto max(0.55rem, env(safe-area-inset-bottom));
  padding: 0.42rem;
  background: linear-gradient(180deg, rgba(18, 38, 52, 0.8), rgba(5, 17, 27, 0.86));
  border: 1px solid rgba(178, 222, 235, 0.17);
  border-radius: 1.35rem;
  box-shadow:
    0 1.2rem 3rem rgba(0, 0, 0, 0.34),
    inset 0 1px rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(24px) saturate(150%);
}

.beat-readout {
  position: absolute;
  left: 0.8rem;
  right: 0.8rem;
  top: -0.3rem;
  display: flex;
  justify-content: center;
  gap: 0.3rem;
  pointer-events: none;
}

.beat-readout span {
  width: 0.26rem;
  height: 0.26rem;
  border-radius: 50%;
  background: rgba(202, 225, 234, 0.2);
}

.beat-readout.active span.current {
  background: var(--practice-cyan);
  box-shadow: 0 0 0.55rem rgba(96, 230, 238, 0.7);
}

.tool-button,
.record-button {
  min-height: 3.65rem;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 0.05rem;
  padding: 0.28rem 0.35rem;
  color: rgba(225, 237, 244, 0.68);
  background: transparent;
  border: 0;
  border-radius: 0.98rem;
}

.tool-button:active,
.record-button:active {
  transform: scale(0.94);
}

.tool-button.active {
  color: var(--practice-cyan);
  background: rgba(96, 230, 238, 0.08);
}

.tool-button svg {
  width: 1.18rem;
  height: 1.18rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.tool-button > span,
.record-button strong {
  font-size: 0.66rem;
  line-height: 1.15;
  font-weight: 720;
}

.tool-button small {
  color: rgba(207, 225, 234, 0.42);
  font-size: 0.54rem;
  font-weight: 680;
}

.record-button {
  color: #ffe9db;
}

.record-button > span {
  width: 1.02rem;
  height: 1.02rem;
  border: 0.18rem solid rgba(255, 255, 255, 0.12);
  border-radius: 50%;
  background: var(--practice-orange);
  box-shadow: 0 0 0.8rem rgba(255, 98, 42, 0.28);
}

.record-button.recording {
  color: #fff6ef;
  background: rgba(255, 91, 45, 0.16);
}

.record-button.recording > span {
  border: 0;
  border-radius: 0.22rem;
  animation: record-pulse 880ms ease-in-out infinite alternate;
}

.landscape-chrome-toggle {
  display: none;
}

.practice-notice {
  position: fixed;
  z-index: 120;
  left: 50%;
  bottom: max(6.3rem, calc(env(safe-area-inset-bottom) + 5.7rem));
  max-width: calc(100vw - 2rem);
  margin: 0;
  padding: 0.62rem 0.85rem;
  color: rgba(247, 252, 255, 0.94);
  background: rgba(7, 23, 34, 0.92);
  border: 1px solid rgba(96, 230, 238, 0.2);
  border-radius: 999px;
  box-shadow: 0 0.8rem 2rem rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(18px);
  font-size: 0.72rem;
  font-weight: 650;
  text-align: center;
  transform: translateX(-50%);
}

.practice-notice-enter-active,
.practice-notice-leave-active {
  transition: opacity 160ms ease, transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.practice-notice-enter-from,
.practice-notice-leave-to {
  opacity: 0;
  transform: translate(-50%, 0.7rem) scale(0.96);
}

.take-list {
  display: grid;
  gap: 0.62rem;
}

.take-card {
  display: grid;
  grid-template-columns: 2.3rem minmax(0, 1fr) 2.75rem 2.75rem;
  align-items: center;
  gap: 0.55rem;
  min-height: 4.55rem;
  padding: 0.55rem;
  background: var(--theme-control-surface, rgba(255, 255, 255, 0.06));
  border: 1px solid var(--theme-border, rgba(255, 255, 255, 0.1));
  border-radius: 1rem;
}

.take-card.playing {
  border-color: rgba(96, 230, 238, 0.46);
  box-shadow: inset 0 0 0 1px rgba(96, 230, 238, 0.1);
}

.take-index {
  width: 2.2rem;
  height: 2.2rem;
  display: grid;
  place-items: center;
  color: #071820;
  background: var(--practice-cyan);
  border-radius: 0.78rem;
  font-size: 0.74rem;
  font-weight: 780;
}

.take-copy {
  min-width: 0;
  display: grid;
  gap: 0.12rem;
}

.take-copy strong {
  color: var(--theme-text, #f5f5f7);
  font-size: 0.84rem;
}

.take-copy span,
.take-copy small {
  overflow: hidden;
  color: var(--theme-text-muted, rgba(235, 235, 245, 0.58));
  font-size: 0.66rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.take-copy small {
  font-size: 0.61rem;
  opacity: 0.7;
}

.take-play,
.take-delete {
  width: 2.65rem;
  height: 2.65rem;
  display: grid;
  place-items: center;
  padding: 0;
  color: var(--theme-text-soft, rgba(245, 245, 247, 0.82));
  background: var(--theme-field-surface, rgba(255, 255, 255, 0.08));
  border: 1px solid var(--theme-border, rgba(255, 255, 255, 0.12));
  border-radius: 0.82rem;
}

.take-play {
  color: var(--practice-cyan);
}

.take-delete {
  color: rgba(255, 151, 112, 0.88);
}

.take-play svg,
.take-delete svg {
  width: 1.15rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.empty-takes {
  min-height: 15rem;
  display: grid;
  place-content: center;
  justify-items: center;
  padding: 2rem 1rem;
  text-align: center;
}

.empty-takes h2,
.empty-takes p {
  margin: 0;
}

.empty-takes h2 {
  margin-top: 1rem;
  color: var(--theme-text, #f5f5f7);
  font-size: 1rem;
}

.empty-takes p {
  max-width: 20rem;
  margin-top: 0.42rem;
  color: var(--theme-text-muted, rgba(235, 235, 245, 0.58));
  font-size: 0.72rem;
  line-height: 1.55;
}

.empty-wave {
  height: 2.4rem;
  display: flex;
  align-items: center;
  gap: 0.24rem;
}

.empty-wave i {
  width: 0.18rem;
  height: 0.8rem;
  border-radius: 999px;
  background: var(--practice-cyan);
  opacity: 0.74;
}

.empty-wave i:nth-child(2),
.empty-wave i:nth-child(4) {
  height: 1.55rem;
}

.empty-wave i:nth-child(3) {
  height: 2.3rem;
}

.practice-settings {
  display: grid;
  gap: 0.8rem;
}

.settings-section {
  display: grid;
  gap: 0.78rem;
  padding: 0.85rem;
  background: var(--theme-control-surface, rgba(255, 255, 255, 0.055));
  border: 1px solid var(--theme-border, rgba(255, 255, 255, 0.1));
  border-radius: 1rem;
}

.settings-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.settings-heading span {
  color: var(--theme-text, #f5f5f7);
  font-size: 0.82rem;
  font-weight: 740;
}

.settings-heading p {
  margin: 0.12rem 0 0;
  color: var(--theme-text-muted, rgba(235, 235, 245, 0.58));
  font-size: 0.65rem;
}

.settings-heading button {
  min-height: 2.35rem;
  padding: 0.35rem 0.7rem;
  color: var(--practice-cyan);
  background: rgba(96, 230, 238, 0.08);
  border: 1px solid rgba(96, 230, 238, 0.2);
  border-radius: 0.75rem;
  font-size: 0.68rem;
  font-weight: 720;
}

.settings-heading button.active {
  color: #071820;
  background: var(--practice-cyan);
}

.range-field,
.select-field,
.toggle-field {
  display: grid;
  align-items: center;
  gap: 0.6rem;
  color: var(--theme-text-soft, rgba(245, 245, 247, 0.82));
  font-size: 0.7rem;
}

.range-field {
  grid-template-columns: 3.2rem minmax(0, 1fr) 4.2rem;
}

.range-field input {
  width: 100%;
  accent-color: var(--practice-cyan);
}

.range-field output {
  color: var(--theme-text-muted, rgba(235, 235, 245, 0.58));
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.select-field {
  grid-template-columns: 3.2rem minmax(0, 1fr);
}

.select-field select {
  min-height: 2.65rem;
  padding: 0 0.65rem;
  color: var(--theme-text, #f5f5f7);
  background: var(--theme-field-surface, rgba(255, 255, 255, 0.08));
  border: 1px solid var(--theme-border, rgba(255, 255, 255, 0.12));
  border-radius: 0.78rem;
}

.compact-settings {
  gap: 0.9rem;
}

.toggle-field {
  grid-template-columns: minmax(0, 1fr) auto;
}

.toggle-field > span {
  display: grid;
  gap: 0.15rem;
}

.toggle-field strong {
  font-size: 0.76rem;
}

.toggle-field small {
  color: var(--theme-text-muted, rgba(235, 235, 245, 0.58));
  font-size: 0.63rem;
}

.toggle-field input {
  width: 2.9rem;
  height: 1.65rem;
  accent-color: var(--practice-cyan);
}

.source-note {
  display: grid;
  grid-template-columns: 1.4rem minmax(0, 1fr);
  align-items: start;
  gap: 0.55rem;
  padding-top: 0.8rem;
  border-top: 1px solid var(--theme-border, rgba(255, 255, 255, 0.1));
}

.source-note svg {
  width: 1.15rem;
  fill: none;
  stroke: var(--practice-cyan);
  stroke-width: 1.6;
  stroke-linecap: round;
}

.source-note p {
  margin: 0;
  color: var(--theme-text-muted, rgba(235, 235, 245, 0.58));
  font-size: 0.66rem;
  line-height: 1.55;
}

@keyframes status-breathe {
  to {
    opacity: 0.38;
    transform: scale(0.74);
  }
}

@keyframes loading-wave {
  to {
    height: 0.3rem;
    opacity: 0.35;
  }
}

@keyframes record-pulse {
  to {
    opacity: 0.58;
    transform: scale(0.82);
  }
}

@media (max-width: 54rem) {
  .practice-header {
    grid-template-columns: 1fr auto;
    gap: 0.55rem 0.75rem;
  }

  .instrument-switcher {
    grid-column: 1 / -1;
    grid-row: 2;
    width: 100%;
  }

  .audio-status {
    max-width: 10rem;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

@media (max-width: 30rem) {
  .practice-header {
    padding-inline: max(0.65rem, env(safe-area-inset-left));
  }

  .page-identity p,
  .identity-mark {
    display: none;
  }

  .instrument-switcher {
    grid-template-columns: repeat(4, 1fr);
  }

  .instrument-switcher button {
    padding-inline: 0.3rem;
  }

  .audio-status {
    max-width: 8.7rem;
  }

  .practice-toolbar {
    width: calc(100% - 1.1rem);
  }

  .take-card {
    grid-template-columns: 2.1rem minmax(0, 1fr) 2.55rem 2.55rem;
    gap: 0.38rem;
  }
}

@media (orientation: landscape) and (max-height: 34rem) {
  .instrument-practice-page {
    display: block;
  }

  .practice-header {
    position: absolute;
    inset: 0 0 auto;
    grid-template-columns: minmax(8rem, 1fr) auto minmax(4rem, 1fr);
    padding-top: max(0.45rem, env(safe-area-inset-top));
    padding-right: max(5.6rem, calc(env(safe-area-inset-right) + 5rem));
    padding-bottom: 0.45rem;
    transition:
      transform 280ms cubic-bezier(0.22, 1, 0.36, 1),
      opacity 180ms ease-out;
    will-change: transform, opacity;
  }

  .instrument-switcher {
    grid-column: auto;
    grid-row: auto;
    width: auto;
  }

  .page-identity p,
  .instrument-glyph {
    display: none;
  }

  .instrument-switcher {
    grid-template-columns: repeat(4, minmax(3.75rem, 1fr));
  }

  .instrument-switcher button {
    min-height: 2.35rem;
  }

  .audio-status {
    display: none;
  }

  .practice-main {
    position: absolute;
    inset: 0;
    overflow: hidden;
    padding:
      max(4.15rem, calc(env(safe-area-inset-top) + 3.45rem))
      max(0.65rem, env(safe-area-inset-right))
      max(4.3rem, calc(env(safe-area-inset-bottom) + 3.75rem))
      max(0.65rem, env(safe-area-inset-left));
    transition: padding 280ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .instrument-stage {
    height: 100%;
  }

  .practice-toolbar {
    position: absolute;
    left: 50%;
    bottom: max(0.25rem, env(safe-area-inset-bottom));
    width: min(25rem, calc(100% - 7rem));
    min-height: 3.8rem;
    margin: 0;
    transform: translateX(-50%);
    transition:
      transform 280ms cubic-bezier(0.22, 1, 0.36, 1),
      opacity 180ms ease-out;
    will-change: transform, opacity;
  }

  .tool-button,
  .record-button {
    min-height: 3rem;
  }

  .landscape-chrome-toggle {
    position: absolute;
    z-index: 18;
    top: max(0.48rem, env(safe-area-inset-top));
    right: max(0.65rem, env(safe-area-inset-right));
    min-height: 2.45rem;
    display: flex;
    align-items: center;
    gap: 0.32rem;
    padding: 0.35rem 0.62rem;
    color: rgba(231, 244, 249, 0.76);
    background: rgba(7, 22, 32, 0.72);
    border: 1px solid rgba(164, 220, 233, 0.16);
    border-radius: 999px;
    box-shadow: 0 0.55rem 1.5rem rgba(0, 0, 0, 0.22), inset 0 1px rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(18px) saturate(145%);
    font-size: 0.64rem;
    font-weight: 720;
    transition:
      transform 100ms ease-out,
      color 160ms ease-out,
      background-color 160ms ease-out,
      border-color 160ms ease-out;
  }

  .landscape-chrome-toggle:active {
    transform: scale(0.94);
  }

  .landscape-chrome-toggle.expanded {
    color: #dffcff;
    background: rgba(12, 42, 54, 0.84);
    border-color: rgba(96, 230, 238, 0.28);
  }

  .landscape-chrome-toggle svg {
    width: 0.9rem;
    height: 0.9rem;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .chrome-toggle-status {
    width: 0.36rem;
    height: 0.36rem;
    flex: 0 0 auto;
    border-radius: 50%;
    background: rgba(211, 230, 237, 0.42);
  }

  .landscape-chrome-toggle.ticking .chrome-toggle-status {
    background: var(--practice-cyan);
    box-shadow: 0 0 0.48rem rgba(96, 230, 238, 0.7);
  }

  .landscape-chrome-toggle.recording .chrome-toggle-status {
    background: var(--practice-orange);
    box-shadow: 0 0 0.55rem rgba(255, 102, 44, 0.72);
    animation: record-pulse 880ms ease-in-out infinite alternate;
  }

  .chrome-hidden .practice-header {
    opacity: 0;
    pointer-events: none;
    transform: translateY(calc(-100% - env(safe-area-inset-top)));
  }

  .chrome-hidden .practice-toolbar {
    opacity: 0;
    pointer-events: none;
    transform: translate(-50%, calc(100% + env(safe-area-inset-bottom) + 0.5rem));
  }

  .chrome-hidden .practice-main {
    padding:
      max(0.42rem, env(safe-area-inset-top))
      max(0.55rem, env(safe-area-inset-right))
      max(0.42rem, env(safe-area-inset-bottom))
      max(0.55rem, env(safe-area-inset-left));
  }

  .chrome-hidden .practice-notice {
    bottom: max(0.9rem, calc(env(safe-area-inset-bottom) + 0.55rem));
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }

  .practice-notice-enter-from,
  .practice-notice-leave-to {
    transform: translateX(-50%);
  }
}

@media (prefers-reduced-transparency: reduce) {
  .practice-header,
  .practice-toolbar,
  .landscape-chrome-toggle,
  .practice-notice,
  .loading-material {
    background: #0b1a25;
    backdrop-filter: none;
  }
}

@media (prefers-contrast: more) {
  .practice-header,
  .practice-toolbar,
  .landscape-chrome-toggle,
  .instrument-switcher,
  .audio-status,
  .icon-button,
  .take-card,
  .settings-section {
    border-width: 2px;
    border-color: rgba(224, 248, 255, 0.62);
  }

  .audio-status,
  .tool-button {
    color: #fff;
  }
}
</style>

<style>
.instrument-practice-sheet .mac-dialog-body {
  padding: 0.8rem;
}

:root[data-theme="light"] .instrument-practice-page {
  color: #17242b;
  background:
    radial-gradient(circle at 15% 8%, rgba(72, 181, 192, 0.17), transparent 30rem),
    radial-gradient(circle at 86% 86%, rgba(190, 116, 68, 0.14), transparent 32rem),
    linear-gradient(148deg, #f5f8f8, #e8f0f1 58%, #f4f1ed);
}

:root[data-theme="light"] .instrument-practice-page .practice-header {
  background: linear-gradient(180deg, rgba(250, 253, 253, 0.94), rgba(238, 246, 247, 0.82));
  border-color: rgba(31, 70, 78, 0.14);
  box-shadow: 0 1rem 2rem rgba(25, 62, 71, 0.08);
}

:root[data-theme="light"] .instrument-practice-page .page-identity h1,
:root[data-theme="light"] .instrument-practice-page .tool-button,
:root[data-theme="light"] .instrument-practice-page .record-button {
  color: #17303a;
}

:root[data-theme="light"] .instrument-practice-page .page-identity p,
:root[data-theme="light"] .instrument-practice-page .tool-button small {
  color: rgba(23, 48, 58, 0.54);
}

:root[data-theme="light"] .instrument-practice-page .icon-button,
:root[data-theme="light"] .instrument-practice-page .audio-status {
  color: rgba(23, 48, 58, 0.76);
  background: rgba(255, 255, 255, 0.72);
  border-color: rgba(31, 70, 78, 0.14);
}

:root[data-theme="light"] .instrument-practice-page .instrument-switcher,
:root[data-theme="light"] .instrument-practice-page .mode-switch,
:root[data-theme="light"] .instrument-practice-page .tuning-switch,
:root[data-theme="light"] .instrument-practice-page .bank-switch {
  background: rgba(255, 255, 255, 0.68);
  border-color: rgba(31, 70, 78, 0.13);
}

:root[data-theme="light"] .instrument-practice-page .instrument-switcher button,
:root[data-theme="light"] .instrument-practice-page .mode-switch button,
:root[data-theme="light"] .instrument-practice-page .tuning-switch button,
:root[data-theme="light"] .instrument-practice-page .bank-switch button {
  color: rgba(23, 48, 58, 0.6);
}

:root[data-theme="light"] .instrument-practice-page .instrument-switcher button.selected,
:root[data-theme="light"] .instrument-practice-page .mode-switch button.selected,
:root[data-theme="light"] .instrument-practice-page .tuning-switch button.selected,
:root[data-theme="light"] .instrument-practice-page .bank-switch button.selected {
  color: #06151d;
}

:root[data-theme="light"] .instrument-practice-page .practice-toolbar {
  background: linear-gradient(180deg, rgba(250, 253, 253, 0.9), rgba(235, 244, 246, 0.94));
  border-color: rgba(31, 70, 78, 0.16);
  box-shadow: 0 1.2rem 3rem rgba(30, 61, 69, 0.18), inset 0 1px rgba(255, 255, 255, 0.8);
}

:root[data-theme="light"] .instrument-practice-page .landscape-chrome-toggle {
  color: rgba(23, 48, 58, 0.76);
  background: rgba(248, 252, 252, 0.86);
  border-color: rgba(31, 70, 78, 0.16);
  box-shadow: 0 0.55rem 1.5rem rgba(30, 61, 69, 0.14), inset 0 1px rgba(255, 255, 255, 0.88);
}

:root[data-theme="light"] .instrument-practice-page .practice-notice,
:root[data-theme="light"] .instrument-practice-page .loading-material {
  color: #17303a;
  background: rgba(247, 252, 252, 0.94);
  border-color: rgba(31, 117, 128, 0.2);
}

@media (max-width: 720px) {
  .instrument-practice-sheet.mobile-presentation-sheet {
    max-height: min(78dvh, 42rem);
  }
}

@media (orientation: landscape) and (max-height: 34rem) {
  .instrument-practice-page .fretted-surface,
  .instrument-practice-page .guzheng-surface,
  .instrument-practice-page .piano-surface {
    position: relative;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: 2.9rem minmax(0, 1fr);
    gap: 0.35rem;
  }

  .instrument-practice-page .surface-controls,
  .instrument-practice-page .guzheng-controls,
  .instrument-practice-page .piano-controls {
    position: relative;
    z-index: 7;
    grid-column: 1;
    grid-row: 1;
    min-height: 2.7rem;
  }

  /* 控制行与和弦条共享横屏网格，空白区域需要把触摸透传给下层和弦按钮。 */
  .instrument-practice-page .surface-controls {
    pointer-events: none;
  }

  .instrument-practice-page .surface-controls .mode-switch,
  .instrument-practice-page .surface-controls .tuning-field {
    pointer-events: auto;
  }

  .instrument-practice-page.chrome-hidden .tuning-field,
  .instrument-practice-page.chrome-hidden .tremolo-status,
  .instrument-practice-page.chrome-hidden .piano-range {
    margin-right: 5.7rem;
  }

  .instrument-practice-page .fretted-surface .chord-rail {
    z-index: 6;
    grid-column: 1;
    grid-row: 1;
    min-width: 0;
    margin-right: 12rem;
    margin-left: 8rem;
    padding: 0.1rem 0 0.2rem;
  }

  .instrument-practice-page .fretted-stage,
  .instrument-practice-page .guzheng-board,
  .instrument-practice-page .piano-keybed {
    grid-column: 1;
    grid-row: 2;
    min-height: 0;
    height: 100%;
  }

  .instrument-practice-page .damp-control,
  .instrument-practice-page .guzheng-actions {
    position: absolute;
    z-index: 8;
    right: 0.65rem;
    bottom: 0.55rem;
  }

  .instrument-practice-page .guzheng-actions {
    min-height: auto;
  }

  .instrument-practice-page .guzheng-board {
    grid-template-rows: repeat(7, minmax(1.62rem, 1fr));
  }

  .instrument-practice-page .guzheng-string-row,
  .instrument-practice-page .guzheng-string-row .pressure-zone,
  .instrument-practice-page .guzheng-string-row .pluck-zone {
    min-height: 1.62rem;
  }

  .instrument-practice-page .guzheng-board .pressure-hint,
  .instrument-practice-page .guzheng-board .pluck-hint {
    display: none;
  }

  .instrument-practice-page .damp-control,
  .instrument-practice-page .damp-button,
  .instrument-practice-page .tremolo-button {
    min-height: 2.35rem;
  }
}
</style>
