import {
  calculateSecondsPerBeat,
  METRONOME_MAX_BPM,
  METRONOME_METERS,
  METRONOME_MIN_BPM
} from '../audio/metronomeScheduler.js'
import {
  getInstrumentDefinition,
  getTuning
} from '../instruments/definitions.js'

export const MAX_NUMBERED_SCORE_LENGTH = 5000
export const MAX_SCORE_EVENT_COUNT = 20000
export const MAX_SCORE_DURATION_MS = 10 * 60 * 1000

export const SCORE_TONIC_OPTIONS = Object.freeze([
  {value: 0, label: 'C'},
  {value: 1, label: 'C♯ / D♭'},
  {value: 2, label: 'D'},
  {value: 3, label: 'D♯ / E♭'},
  {value: 4, label: 'E'},
  {value: 5, label: 'F'},
  {value: 6, label: 'F♯ / G♭'},
  {value: 7, label: 'G'},
  {value: 8, label: 'G♯ / A♭'},
  {value: 9, label: 'A'},
  {value: 10, label: 'A♯ / B♭'},
  {value: 11, label: 'B'}
])

export const SCORE_MODE_OPTIONS = Object.freeze([
  {value: 'major', label: '大调'},
  {value: 'natural-minor', label: '自然小调'}
])

const MODE_INTERVALS = Object.freeze({
  major: [0, 2, 4, 5, 7, 9, 11],
  'natural-minor': [0, 2, 3, 5, 7, 8, 10]
})
const SCORE_TOKEN_PATTERN = /^[#b]?[0-7][',]{0,2}\/{0,2}\.?~?/

let fallbackSequenceId = 0

export function createDefaultNumberedScoreDraft() {
  return {
    notation: '1 2 3 4 | 5 - 5 - | 6/ 6/ 5 3 | 2 - 1 -',
    tonic: 0,
    mode: 'major',
    meter: '4/4',
    bpm: 80,
    instrumentId: '',
    tuningId: ''
  }
}

function createLocation(source, index) {
  const before = source.slice(0, index)
  const lines = before.split(/\r\n|\r|\n/)
  return {
    index,
    line: lines.length,
    column: lines[lines.length - 1].length + 1
  }
}

function tokenizeScore(source) {
  const tokens = []
  const errors = []
  let cursor = 0

  while (cursor < source.length) {
    const character = source[cursor]
    if (character === '\r' || character === '\n') {
      const location = createLocation(source, cursor)
      tokens.push({type: 'measure', value: '|', ...location})
      cursor += character === '\r' && source[cursor + 1] === '\n' ? 2 : 1
      continue
    }
    if (/\s/.test(character)) {
      cursor += 1
      continue
    }
    if (character === '|') {
      tokens.push({type: 'measure', value: character, ...createLocation(source, cursor)})
      cursor += 1
      continue
    }
    if (character === '-') {
      tokens.push({type: 'extension', value: character, ...createLocation(source, cursor)})
      cursor += 1
      continue
    }

    const matchedToken = source.slice(cursor).match(SCORE_TOKEN_PATTERN)?.[0]
    if (!matchedToken) {
      errors.push({
        ...createLocation(source, cursor),
        message: `无法识别“${character}”`
      })
      cursor += 1
      continue
    }
    tokens.push({
      type: 'value',
      value: matchedToken,
      ...createLocation(source, cursor)
    })
    cursor += matchedToken.length
  }

  return {tokens, errors}
}

function parseValueToken(token, draft) {
  const matched = token.value.match(/^([#b]?)([0-7])([',]{0,2})(\/{0,2})(\.?)(~?)$/)
  if (!matched) {
    return {error: '音符格式无效'}
  }

  const [, accidentalMark, degreeText, octaveMarks, slashMarks, dotMark, tieMark] = matched
  const degree = Number(degreeText)
  const durationBeats = (1 / (2 ** slashMarks.length)) * (dotMark ? 1.5 : 1)
  if (degree === 0) {
    if (accidentalMark || octaveMarks || tieMark) {
      return {error: '休止符 0 不能使用升降号、八度或延音线'}
    }
    return {
      note: {
        kind: 'rest',
        source: token.value,
        durationBeats,
        tied: false
      }
    }
  }

  const octaveOffset = [...octaveMarks].reduce((total, mark) => (
    total + (mark === "'" ? 1 : -1)
  ), 0)
  const accidental = accidentalMark === '#' ? 1 : accidentalMark === 'b' ? -1 : 0
  const intervals = MODE_INTERVALS[draft.mode] || MODE_INTERVALS.major
  const midi = 60 + Number(draft.tonic) + intervals[degree - 1] + accidental + octaveOffset * 12
  return {
    note: {
      kind: 'note',
      source: token.value,
      degree,
      accidental,
      octaveOffset,
      midi,
      durationBeats,
      tied: Boolean(tieMark)
    }
  }
}

function normalizeDraft(draft) {
  const bpm = Number(draft?.bpm)
  return {
    ...createDefaultNumberedScoreDraft(),
    ...draft,
    notation: String(draft?.notation ?? ''),
    tonic: Math.min(11, Math.max(0, Math.round(Number(draft?.tonic) || 0))),
    mode: MODE_INTERVALS[draft?.mode] ? draft.mode : 'major',
    meter: METRONOME_METERS.includes(draft?.meter) ? draft.meter : '4/4',
    bpm
  }
}

/**
 * 把单声部简谱解析为以“拍”为单位的时间线。小节长度错误只警告，
 * 因为不完整小节常用于弱起或收尾，不应阻断用户演奏。
 *
 * @param {Partial<import('../types.js').NumberedScoreDraft>} scoreDraft
 */
export function parseNumberedScore(scoreDraft) {
  const draft = normalizeDraft(scoreDraft)
  const errors = []
  const warnings = []

  if (!draft.notation.trim()) {
    errors.push({line: 1, column: 1, index: 0, message: '请输入简谱'})
  }
  if (draft.notation.length > MAX_NUMBERED_SCORE_LENGTH) {
    errors.push({
      line: 1,
      column: 1,
      index: 0,
      message: `简谱最多 ${MAX_NUMBERED_SCORE_LENGTH} 个字符`
    })
  }
  if (!Number.isFinite(draft.bpm) || draft.bpm < METRONOME_MIN_BPM || draft.bpm > METRONOME_MAX_BPM) {
    errors.push({
      line: 1,
      column: 1,
      index: 0,
      message: `速度需在 ${METRONOME_MIN_BPM}–${METRONOME_MAX_BPM} BPM`
    })
  }

  const tokenized = tokenizeScore(draft.notation)
  errors.push(...tokenized.errors)
  const notes = []
  const measureBeats = Number(draft.meter.split('/')[0])
  let currentBeat = 0
  let currentMeasureBeat = 0
  let measureIndex = 0
  let measureHasContent = false
  let pendingTie = null

  const finishMeasure = (token) => {
    if (measureHasContent && Math.abs(currentMeasureBeat - measureBeats) > 0.0001) {
      warnings.push({
        line: token?.line || 1,
        column: token?.column || 1,
        index: token?.index || 0,
        message: `第 ${measureIndex + 1} 小节为 ${formatBeatCount(currentMeasureBeat)} 拍，应为 ${measureBeats} 拍`
      })
    }
    if (measureHasContent) {
      measureIndex += 1
    }
    currentMeasureBeat = 0
    measureHasContent = false
  }

  for (const token of tokenized.tokens) {
    if (token.type === 'measure') {
      finishMeasure(token)
      continue
    }
    if (token.type === 'extension') {
      const previousNote = notes.at(-1)
      if (!previousNote) {
        errors.push({...token, message: '延长记号 - 前没有可延长的音符或休止符'})
        continue
      }
      previousNote.durationBeats += 1
      currentBeat += 1
      currentMeasureBeat += 1
      measureHasContent = true
      continue
    }

    const parsedToken = parseValueToken(token, draft)
    if (parsedToken.error) {
      errors.push({...token, message: parsedToken.error})
      continue
    }
    const note = parsedToken.note
    if (pendingTie) {
      if (note.kind !== 'note' || note.midi !== pendingTie.midi) {
        errors.push({...token, message: '延音线 ~ 后必须连接相同音高'})
      } else {
        pendingTie.durationBeats += note.durationBeats
        pendingTie.tied = note.tied
        currentBeat += note.durationBeats
        currentMeasureBeat += note.durationBeats
        measureHasContent = true
        pendingTie = note.tied ? pendingTie : null
        continue
      }
      pendingTie = null
    }

    const timelineNote = {
      ...note,
      atBeat: currentBeat,
      measureIndex,
      line: token.line,
      column: token.column
    }
    notes.push(timelineNote)
    currentBeat += note.durationBeats
    currentMeasureBeat += note.durationBeats
    measureHasContent = true
    pendingTie = note.tied ? timelineNote : null
  }

  if (pendingTie) {
    errors.push({
      line: pendingTie.line,
      column: pendingTie.column,
      index: 0,
      message: '延音线 ~ 后缺少相同音高'
    })
  }
  finishMeasure(tokenized.tokens.at(-1))

  const secondsPerBeat = Number.isFinite(draft.bpm)
    ? calculateSecondsPerBeat(draft.bpm, draft.meter)
    : 0
  const durationMs = currentBeat * secondsPerBeat * 1000
  const noteCount = notes.filter((note) => note.kind === 'note').length
  if (noteCount > MAX_SCORE_EVENT_COUNT) {
    errors.push({
      line: 1,
      column: 1,
      index: 0,
      message: `自动演奏最多 ${MAX_SCORE_EVENT_COUNT} 个音符`
    })
  }
  if (durationMs > MAX_SCORE_DURATION_MS) {
    errors.push({
      line: 1,
      column: 1,
      index: 0,
      message: '自动演奏时长不能超过 10 分钟'
    })
  }

  return {
    valid: errors.length === 0 && noteCount > 0,
    draft,
    notes,
    errors,
    warnings,
    durationBeats: currentBeat,
    durationMs,
    noteCount,
    measureCount: measureIndex
  }
}

function formatBeatCount(beatCount) {
  return Number.isInteger(beatCount) ? `${beatCount}` : `${Number(beatCount.toFixed(2))}`
}

function createSequenceId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `score-${globalThis.crypto.randomUUID()}`
  }
  fallbackSequenceId += 1
  return `score-${Date.now()}-${fallbackSequenceId}`
}

function octaveCandidates(midi, minimum, maximum) {
  const pitchClass = ((Math.round(midi) % 12) + 12) % 12
  const candidates = []
  for (let candidate = minimum; candidate <= maximum; candidate += 1) {
    if (((candidate % 12) + 12) % 12 === pitchClass) {
      candidates.push(candidate)
    }
  }
  return candidates
}

function chooseFoldedMidi(rawMidi, minimum, maximum, previousMapping) {
  if (rawMidi >= minimum && rawMidi <= maximum) {
    return Math.round(rawMidi)
  }
  const candidates = octaveCandidates(rawMidi, minimum, maximum)
  const center = (minimum + maximum) / 2
  if (!candidates.length) {
    return Math.min(maximum, Math.max(minimum, rawMidi))
  }
  return candidates.reduce((best, candidate) => {
    const previousMidi = previousMapping?.midi
    const previousRawMidi = previousMapping?.rawMidi
    let score = Math.abs(candidate - rawMidi) * 0.35 + Math.abs(candidate - center) * 0.08
    if (Number.isFinite(previousMidi)) {
      score += Math.abs(candidate - previousMidi)
      const rawDirection = Math.sign(rawMidi - previousRawMidi)
      const mappedDirection = Math.sign(candidate - previousMidi)
      if (rawDirection && mappedDirection && rawDirection !== mappedDirection) {
        score += 8
      }
    }
    return !best || score < best.score ? {midi: candidate, score} : best
  }, null).midi
}

function mapKeyboardNote(rawMidi, tuning, previousMapping) {
  const minimum = Math.min(...tuning.midiNotes)
  const maximum = Math.max(...tuning.midiNotes)
  const midi = chooseFoldedMidi(rawMidi, minimum, maximum, previousMapping)
  return {midi, rawMidi, stringId: `key-${midi}`}
}

function mapFrettedNote(rawMidi, definition, tuning, previousMapping) {
  const maxFret = Number(definition.layout?.maxFret) || 7
  const positions = tuning.midiNotes.flatMap((openMidi, stringIndex) => (
    Array.from({length: maxFret + 1}, (_, fret) => ({
      midi: openMidi + fret,
      stringId: definition.strings[stringIndex].id,
      stringIndex,
      fret
    }))
  ))
  const minimum = Math.min(...positions.map((position) => position.midi))
  const maximum = Math.max(...positions.map((position) => position.midi))
  const foldedMidi = chooseFoldedMidi(rawMidi, minimum, maximum, previousMapping)
  const candidates = positions.filter((position) => position.midi === foldedMidi)
  const selected = candidates.reduce((best, position) => {
    let score = position.fret * 0.25
    if (previousMapping) {
      score += Math.abs(position.fret - previousMapping.fret) * 0.8
      score += Math.abs(position.stringIndex - previousMapping.stringIndex) * 1.2
    }
    return !best || score < best.score ? {...position, score} : best
  }, null)
  return {...selected, rawMidi}
}

function mapGuzhengNote(rawMidi, definition, tuning, previousMapping) {
  const minimum = Math.min(...tuning.midiNotes)
  const maximum = Math.max(...tuning.midiNotes)
  const midi = chooseFoldedMidi(rawMidi, minimum, maximum, previousMapping)
  const nearestString = tuning.midiNotes.reduce((best, openMidi, stringIndex) => {
    const distance = Math.abs(openMidi - midi)
    return !best || distance < best.distance
      ? {openMidi, stringIndex, distance}
      : best
  }, null)
  return {
    midi,
    rawMidi,
    stringId: definition.strings[nearestString.stringIndex].id,
    stringIndex: nearestString.stringIndex,
    scoreAltered: nearestString.openMidi !== midi
  }
}

/**
 * 根据目标乐器生成临时回放序列。事件的 MIDI 保持目标旋律音高，
 * stringId/fret 只负责让琴面显示真实可操作的位置。
 *
 * @param {ReturnType<typeof parseNumberedScore>} parsedScore
 * @param {Partial<import('../types.js').NumberedScoreDraft>} scoreDraft
 * @returns {import('../types.js').ScorePerformanceSequence}
 */
export function buildScorePerformanceSequence(parsedScore, scoreDraft) {
  if (!parsedScore?.valid) {
    throw new Error('简谱存在错误，无法生成演奏序列')
  }
  const draft = normalizeDraft(scoreDraft)
  const definition = getInstrumentDefinition(draft.instrumentId)
  if (definition.id !== draft.instrumentId) {
    throw new Error('请选择用于演奏的乐器')
  }
  const tuning = getTuning(definition, draft.tuningId)
  const secondsPerBeat = calculateSecondsPerBeat(draft.bpm, draft.meter)
  let previousMapping = null
  const events = parsedScore.notes
    .filter((note) => note.kind === 'note')
    .map((note) => {
      let mapping
      if (definition.family === 'keyboard') {
        mapping = mapKeyboardNote(note.midi, tuning, previousMapping)
      } else if (definition.family === 'fretted') {
        mapping = mapFrettedNote(note.midi, definition, tuning, previousMapping)
      } else {
        mapping = mapGuzhengNote(note.midi, definition, tuning, previousMapping)
      }
      previousMapping = mapping
      return {
        at: note.atBeat * secondsPerBeat * 1000,
        type: 'note',
        instrumentId: definition.id,
        stringId: mapping.stringId,
        midi: mapping.midi,
        velocity: 0.72,
        durationSeconds: Math.max(0.05, note.durationBeats * secondsPerBeat * 0.92),
        scoreMeasureIndex: note.measureIndex,
        scoreAltered: Boolean(mapping.scoreAltered),
        fret: mapping.fret
      }
    })

  return {
    id: createSequenceId(),
    kind: 'score',
    title: '输入简谱',
    instrumentId: definition.id,
    tuningId: tuning.id,
    bpm: draft.bpm,
    meter: draft.meter,
    durationMs: parsedScore.durationMs,
    events
  }
}
