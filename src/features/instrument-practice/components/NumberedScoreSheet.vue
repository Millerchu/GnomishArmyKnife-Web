<template>
  <div class="score-sheet">
    <section class="score-editor" aria-labelledby="score-editor-title">
      <div class="section-heading">
        <div>
          <span class="eyebrow">单声部简谱</span>
          <h2 id="score-editor-title">输入或粘贴曲谱</h2>
        </div>
        <span class="character-count" :class="{invalid: notationTooLong}">
          {{ draft.notation.length }}/{{ MAX_NUMBERED_SCORE_LENGTH }}
        </span>
      </div>

      <div class="score-meta-grid">
        <label>
          <span>调号</span>
          <select :value="draft.tonic" @change="setField('tonic', Number($event.target.value))">
            <option v-for="tonic in SCORE_TONIC_OPTIONS" :key="tonic.value" :value="tonic.value">
              {{ tonic.label }}
            </option>
          </select>
        </label>
        <label>
          <span>调式</span>
          <select :value="draft.mode" @change="setField('mode', $event.target.value)">
            <option v-for="mode in SCORE_MODE_OPTIONS" :key="mode.value" :value="mode.value">
              {{ mode.label }}
            </option>
          </select>
        </label>
        <label>
          <span>拍号</span>
          <select :value="draft.meter" @change="setField('meter', $event.target.value)">
            <option v-for="meter in meterOptions" :key="meter" :value="meter">{{ meter }}</option>
          </select>
        </label>
        <label>
          <span>速度</span>
          <span class="bpm-input">
            <input
              :value="draft.bpm"
              type="number"
              min="40"
              max="220"
              inputmode="numeric"
              @input="setField('bpm', Number($event.target.value))"
            >
            <small>BPM</small>
          </span>
        </label>
      </div>

      <label class="notation-field">
        <span class="sr-only">简谱文本</span>
        <textarea
          :value="draft.notation"
          rows="6"
          maxlength="5100"
          spellcheck="false"
          autocapitalize="off"
          placeholder="例如：1 2 3 4 | 5 - 5 -&#10;6/ 6/ 5 3 | 2 - 1 -"
          @input="setField('notation', $event.target.value)"
        />
      </label>

      <div class="syntax-guide" aria-label="支持的简谱记号">
        <span><b>1–7</b> 音符</span>
        <span><b>0</b> 休止</span>
        <span><b># / b</b> 升降</span>
        <span><b>' / ,</b> 八度</span>
        <span><b>/ / //</b> 短时值</span>
        <span><b>. / - / ~</b> 附点与延音</span>
      </div>
    </section>

    <section class="score-analysis" aria-live="polite">
      <div class="score-statistics">
        <span><strong>{{ formatDuration(parsedScore.durationMs) }}</strong>预计时长</span>
        <span><strong>{{ parsedScore.noteCount }}</strong>音符</span>
        <span><strong>{{ parsedScore.measureCount }}</strong>小节</span>
      </div>

      <div v-if="parsedScore.errors.length" class="feedback-list error-list">
        <p v-for="(error, index) in parsedScore.errors.slice(0, 4)" :key="`${error.index}-${index}`">
          <span aria-hidden="true">!</span>
          第 {{ error.line }} 行 {{ error.column }} 列：{{ error.message }}
        </p>
      </div>
      <div v-else-if="parsedScore.warnings.length" class="feedback-list warning-list">
        <p v-for="(warning, index) in parsedScore.warnings.slice(0, 4)" :key="`${warning.index}-${index}`">
          <span aria-hidden="true">i</span>
          {{ warning.message }}
        </p>
      </div>
      <p v-else class="valid-feedback">
        <span aria-hidden="true">✓</span>
        曲谱格式正确，可以选择乐器演奏
      </p>
    </section>

    <section class="instrument-choice" aria-labelledby="score-instrument-title">
      <div class="section-heading">
        <div>
          <span class="eyebrow">演奏音色</span>
          <h2 id="score-instrument-title">选择一种乐器</h2>
        </div>
      </div>

      <div class="instrument-card-grid">
        <button
          v-for="instrument in instrumentOptions"
          :key="instrument.id"
          type="button"
          :class="{selected: draft.instrumentId === instrument.id}"
          :aria-pressed="draft.instrumentId === instrument.id"
          @click="selectInstrument(instrument)"
        >
          <span class="instrument-symbol" :class="`symbol-${instrument.id}`" aria-hidden="true">
            <i/><i/><i/>
          </span>
          <strong>{{ instrument.label }}</strong>
          <small>{{ familyLabel(instrument.family) }}</small>
          <span class="selection-mark" aria-hidden="true">✓</span>
        </button>
      </div>

      <label v-if="selectedDefinition" class="tuning-field">
        <span>{{ selectedDefinition.label }}调弦</span>
        <select :value="draft.tuningId" @change="setField('tuningId', $event.target.value)">
          <option
            v-for="tuning in selectedDefinition.tuningPresets"
            :key="tuning.id"
            :value="tuning.id"
          >
            {{ tuning.label }}
          </option>
        </select>
      </label>
    </section>

    <button
      class="start-score-button"
      type="button"
      :disabled="!canStart"
      @click="startPlayback"
    >
      <span class="play-mark" aria-hidden="true"/>
      <span>
        <strong>开始演奏</strong>
        <small v-if="canStart">{{ selectedDefinition.label }} · {{ formatDuration(parsedScore.durationMs) }}</small>
        <small v-else>修正曲谱并选择乐器后可用</small>
      </span>
    </button>
  </div>
</template>

<script setup>
import {computed} from 'vue'

import {INSTRUMENT_DEFINITIONS} from '../instruments/definitions.js'
import {
  MAX_NUMBERED_SCORE_LENGTH,
  SCORE_MODE_OPTIONS,
  SCORE_TONIC_OPTIONS,
  parseNumberedScore
} from '../score/numberedScore.js'

const props = defineProps({
  draft: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:draft', 'play'])
const meterOptions = Object.freeze(['2/4', '3/4', '4/4', '6/8'])
const instrumentOptions = Object.values(INSTRUMENT_DEFINITIONS)
const parsedScore = computed(() => parseNumberedScore(props.draft))
const notationTooLong = computed(() => props.draft.notation.length > MAX_NUMBERED_SCORE_LENGTH)
const selectedDefinition = computed(() => (
  INSTRUMENT_DEFINITIONS[props.draft.instrumentId] || null
))
const canStart = computed(() => (
  parsedScore.value.valid
  && Boolean(selectedDefinition.value)
  && selectedDefinition.value.tuningPresets.some((tuning) => tuning.id === props.draft.tuningId)
))

function setField(field, value) {
  emit('update:draft', {
    ...props.draft,
    [field]: value
  })
}

function selectInstrument(instrument) {
  emit('update:draft', {
    ...props.draft,
    instrumentId: instrument.id,
    tuningId: instrument.tuningPresets[0]?.id || ''
  })
}

function familyLabel(family) {
  return {
    zither: '弦音与按音',
    fretted: '弦品演示',
    keyboard: '精确琴键'
  }[family] || '实时演奏'
}

function formatDuration(durationMs) {
  const totalSeconds = Math.max(0, Math.ceil(Number(durationMs) / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  return `${minutes}:${`${totalSeconds % 60}`.padStart(2, '0')}`
}

function startPlayback() {
  if (!canStart.value) {
    return
  }
  emit('play', {
    draft: {...props.draft},
    parsedScore: parsedScore.value
  })
}
</script>

<style scoped>
.score-sheet {
  --score-cyan: #65e6ed;
  display: grid;
  gap: 0.8rem;
  color: var(--theme-text-primary, #f5fbff);
}

.score-editor,
.score-analysis,
.instrument-choice {
  padding: 0.9rem;
  background:
    linear-gradient(145deg, rgba(26, 48, 62, 0.72), rgba(7, 20, 30, 0.76));
  border: 1px solid rgba(158, 216, 230, 0.14);
  border-radius: 1rem;
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.06);
}

.section-heading {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.72rem;
}

.section-heading h2,
.section-heading span {
  margin: 0;
}

.section-heading h2 {
  margin-top: 0.08rem;
  font-size: 0.94rem;
  letter-spacing: 0.01em;
}

.eyebrow {
  color: rgba(190, 226, 236, 0.52);
  font-size: 0.61rem;
  font-weight: 760;
  letter-spacing: 0.13em;
}

.character-count {
  color: rgba(218, 235, 241, 0.5);
  font-size: 0.65rem;
}

.character-count.invalid {
  color: #ff9878;
}

.score-meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 0.8fr 1fr;
  gap: 0.55rem;
}

.score-meta-grid label,
.tuning-field {
  min-width: 0;
  display: grid;
  gap: 0.3rem;
  color: rgba(220, 237, 243, 0.62);
  font-size: 0.65rem;
  font-weight: 680;
}

select,
input,
textarea {
  width: 100%;
  color: var(--theme-text-primary, #f5fbff);
  background: rgba(1, 11, 18, 0.56);
  border: 1px solid rgba(171, 219, 232, 0.15);
  border-radius: 0.7rem;
  outline: none;
  font: inherit;
}

select,
input {
  min-height: 2.45rem;
  padding: 0.48rem 0.62rem;
}

select:focus-visible,
input:focus-visible,
textarea:focus-visible {
  border-color: rgba(101, 230, 237, 0.72);
  box-shadow: 0 0 0 3px rgba(101, 230, 237, 0.14);
}

.bpm-input {
  position: relative;
}

.bpm-input input {
  padding-right: 2.3rem;
}

.bpm-input small {
  position: absolute;
  top: 50%;
  right: 0.52rem;
  color: rgba(216, 235, 242, 0.42);
  font-size: 0.55rem;
  pointer-events: none;
  transform: translateY(-50%);
}

.notation-field {
  display: block;
  margin-top: 0.65rem;
}

.notation-field textarea {
  min-height: 8rem;
  resize: vertical;
  padding: 0.78rem;
  font-family: ui-monospace, "SFMono-Regular", "Roboto Mono", monospace;
  font-size: 0.84rem;
  line-height: 1.75;
  letter-spacing: 0.04em;
}

.syntax-guide {
  display: flex;
  flex-wrap: wrap;
  gap: 0.32rem 0.7rem;
  margin-top: 0.58rem;
  color: rgba(211, 232, 240, 0.44);
  font-size: 0.59rem;
}

.syntax-guide b {
  color: rgba(224, 246, 250, 0.74);
}

.score-analysis {
  display: grid;
  gap: 0.62rem;
}

.score-statistics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.35rem;
}

.score-statistics span {
  min-width: 0;
  display: grid;
  gap: 0.1rem;
  padding: 0.48rem 0.58rem;
  color: rgba(206, 229, 237, 0.48);
  background: rgba(0, 10, 17, 0.36);
  border-radius: 0.68rem;
  font-size: 0.58rem;
}

.score-statistics strong {
  color: #effcff;
  font-size: 0.82rem;
}

.feedback-list {
  display: grid;
  gap: 0.3rem;
}

.feedback-list p,
.valid-feedback {
  margin: 0;
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
  font-size: 0.65rem;
  line-height: 1.45;
}

.feedback-list span,
.valid-feedback span {
  width: 1rem;
  height: 1rem;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 50%;
  font-size: 0.58rem;
  font-weight: 800;
}

.error-list p {
  color: #ffc0ad;
}

.error-list span {
  color: #2b0d06;
  background: #ff9878;
}

.warning-list p {
  color: #f6d7a4;
}

.warning-list span {
  color: #211507;
  background: #efbe71;
}

.valid-feedback {
  color: rgba(198, 239, 225, 0.78);
}

.valid-feedback span {
  color: #052016;
  background: #76dfb5;
}

.instrument-card-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.45rem;
}

.instrument-card-grid button {
  position: relative;
  min-width: 0;
  min-height: 5.3rem;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 0.16rem;
  padding: 0.55rem 0.35rem;
  color: rgba(227, 240, 246, 0.66);
  background: rgba(1, 11, 18, 0.38);
  border: 1px solid rgba(171, 219, 232, 0.12);
  border-radius: 0.8rem;
}

.instrument-card-grid button:active {
  transform: scale(0.97);
}

.instrument-card-grid button.selected {
  color: #eaffff;
  background: linear-gradient(145deg, rgba(35, 126, 137, 0.52), rgba(10, 52, 64, 0.62));
  border-color: rgba(101, 230, 237, 0.48);
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.1), 0 0.65rem 1.5rem rgba(0, 0, 0, 0.14);
}

.instrument-card-grid strong {
  overflow: hidden;
  max-width: 100%;
  font-size: 0.73rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.instrument-card-grid small {
  color: rgba(210, 231, 239, 0.42);
  font-size: 0.54rem;
}

.instrument-symbol {
  height: 1.3rem;
  display: flex;
  align-items: center;
  gap: 0.18rem;
  color: var(--score-cyan);
}

.instrument-symbol i {
  width: 1px;
  height: 0.82rem;
  display: block;
  background: currentColor;
  box-shadow: 0 0 0.35rem rgba(101, 230, 237, 0.46);
}

.instrument-symbol i:nth-child(2) {
  height: 1.18rem;
}

.symbol-guitar,
.symbol-ukulele {
  transform: rotate(-18deg);
}

.symbol-piano i {
  width: 0.28rem;
  height: 1rem;
  background: currentColor;
  box-shadow: none;
}

.selection-mark {
  position: absolute;
  top: 0.35rem;
  right: 0.38rem;
  opacity: 0;
  color: #071c21;
  font-size: 0.54rem;
}

button.selected .selection-mark {
  width: 0.92rem;
  height: 0.92rem;
  display: grid;
  place-items: center;
  opacity: 1;
  background: var(--score-cyan);
  border-radius: 50%;
}

.tuning-field {
  margin-top: 0.62rem;
}

.start-score-button {
  min-height: 3.65rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.7rem;
  padding: 0.65rem 1rem;
  color: #061b22;
  background: linear-gradient(145deg, #8bf2f2, #52d5df);
  border: 0;
  border-radius: 1rem;
  box-shadow: 0 0.9rem 2.1rem rgba(31, 196, 208, 0.18), inset 0 1px rgba(255, 255, 255, 0.62);
}

.start-score-button:active:not(:disabled) {
  transform: scale(0.98);
}

.start-score-button:disabled {
  color: rgba(221, 235, 240, 0.35);
  background: rgba(109, 139, 149, 0.16);
  box-shadow: none;
}

.start-score-button > span:last-child {
  display: grid;
  justify-items: start;
}

.start-score-button strong {
  font-size: 0.82rem;
}

.start-score-button small {
  margin-top: 0.08rem;
  font-size: 0.57rem;
}

.play-mark {
  width: 0;
  height: 0;
  border-top: 0.38rem solid transparent;
  border-bottom: 0.38rem solid transparent;
  border-left: 0.58rem solid currentColor;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}

@media (max-width: 32rem) {
  .score-meta-grid {
    grid-template-columns: 1fr 1fr;
  }

  .instrument-card-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (prefers-reduced-transparency: reduce) {
  .score-editor,
  .score-analysis,
  .instrument-choice {
    background: #0d202d;
  }
}

@media (prefers-contrast: more) {
  .score-editor,
  .score-analysis,
  .instrument-choice,
  .instrument-card-grid button,
  select,
  input,
  textarea {
    border-width: 2px;
    border-color: rgba(230, 251, 255, 0.72);
  }
}

:global(:root[data-theme="light"]) .score-sheet {
  color: #132833;
}

:global(:root[data-theme="light"]) .score-editor,
:global(:root[data-theme="light"]) .score-analysis,
:global(:root[data-theme="light"]) .instrument-choice {
  background: rgba(244, 250, 252, 0.92);
  border-color: rgba(39, 88, 103, 0.16);
}

:global(:root[data-theme="light"]) .score-sheet select,
:global(:root[data-theme="light"]) .score-sheet input,
:global(:root[data-theme="light"]) .score-sheet textarea,
:global(:root[data-theme="light"]) .instrument-card-grid button {
  color: #17313c;
  background: rgba(228, 241, 245, 0.82);
  border-color: rgba(39, 88, 103, 0.16);
}
</style>
