/** @import {InstrumentDefinition} from '../types.js' */

/**
 * @typedef {Object} ChordVoicing
 * @property {string} id
 * @property {string} label
 * @property {'major' | 'minor' | 'dominant7'} quality
 * @property {number[]} frets
 */

/**
 * @typedef {Object} TuningPreset
 * @property {string} id
 * @property {string} label
 * @property {number[]} midiNotes
 */

const GUITAR_SAMPLE_ROOTS = [40, 45, 50, 55, 59, 64, 69, 76]
const GUZHENG_SAMPLE_ROOTS = [38, 45, 50, 57, 62, 69, 74, 81, 86]
const UKULELE_SAMPLE_ROOTS = [60, 64, 67, 69, 72]

function createSampleManifest(instrumentId, rootMidiList, velocityLayers) {
  return rootMidiList.flatMap((rootMidi) => (
    velocityLayers.map((velocityLayer) => ({
      id: `${instrumentId}-${rootMidi}-${velocityLayer}`,
      rootMidi,
      src: `/instrument-samples/${instrumentId}/${rootMidi}-${velocityLayer}.mp3`,
      velocityLayer
    }))
  ))
}

function createStrings(count, prefix = '弦') {
  return Array.from({length: count}, (_, index) => ({
    id: `string-${index + 1}`,
    label: `${prefix}${index + 1}`
  }))
}

/**
 * 古筝采用五声音阶，数组按低音至高音排列。
 *
 * @param {number} firstMidi
 * @returns {number[]}
 */
export function createPentatonicTuning(firstMidi) {
  const intervals = [0, 2, 4, 7, 9]
  return Array.from({length: 21}, (_, index) => {
    const octave = Math.floor(index / intervals.length)
    return firstMidi + octave * 12 + intervals[index % intervals.length]
  })
}

/** @type {ChordVoicing[]} */
export const GUITAR_CHORDS = [
  {id: 'c-major', label: 'C', quality: 'major', frets: [-1, 3, 2, 0, 1, 0]},
  {id: 'c-minor', label: 'Cm', quality: 'minor', frets: [-1, 3, 5, 5, 4, 3]},
  {id: 'c-7', label: 'C7', quality: 'dominant7', frets: [-1, 3, 2, 3, 1, 0]},
  {id: 'd-major', label: 'D', quality: 'major', frets: [-1, -1, 0, 2, 3, 2]},
  {id: 'd-minor', label: 'Dm', quality: 'minor', frets: [-1, -1, 0, 2, 3, 1]},
  {id: 'd-7', label: 'D7', quality: 'dominant7', frets: [-1, -1, 0, 2, 1, 2]},
  {id: 'e-major', label: 'E', quality: 'major', frets: [0, 2, 2, 1, 0, 0]},
  {id: 'e-minor', label: 'Em', quality: 'minor', frets: [0, 2, 2, 0, 0, 0]},
  {id: 'e-7', label: 'E7', quality: 'dominant7', frets: [0, 2, 0, 1, 0, 0]},
  {id: 'f-major', label: 'F', quality: 'major', frets: [1, 3, 3, 2, 1, 1]},
  {id: 'f-minor', label: 'Fm', quality: 'minor', frets: [1, 3, 3, 1, 1, 1]},
  {id: 'f-7', label: 'F7', quality: 'dominant7', frets: [1, 3, 1, 2, 1, 1]},
  {id: 'g-major', label: 'G', quality: 'major', frets: [3, 2, 0, 0, 0, 3]},
  {id: 'g-minor', label: 'Gm', quality: 'minor', frets: [3, 5, 5, 3, 3, 3]},
  {id: 'g-7', label: 'G7', quality: 'dominant7', frets: [3, 2, 0, 0, 0, 1]},
  {id: 'a-major', label: 'A', quality: 'major', frets: [-1, 0, 2, 2, 2, 0]},
  {id: 'a-minor', label: 'Am', quality: 'minor', frets: [-1, 0, 2, 2, 1, 0]},
  {id: 'a-7', label: 'A7', quality: 'dominant7', frets: [-1, 0, 2, 0, 2, 0]},
  {id: 'b-major', label: 'B', quality: 'major', frets: [-1, 2, 4, 4, 4, 2]},
  {id: 'b-minor', label: 'Bm', quality: 'minor', frets: [-1, 2, 4, 4, 3, 2]},
  {id: 'b-7', label: 'B7', quality: 'dominant7', frets: [-1, 2, 1, 2, 0, 2]}
]

/** @type {ChordVoicing[]} */
export const UKULELE_CHORDS = [
  {id: 'c-major', label: 'C', quality: 'major', frets: [0, 0, 0, 3]},
  {id: 'c-minor', label: 'Cm', quality: 'minor', frets: [0, 3, 3, 3]},
  {id: 'c-7', label: 'C7', quality: 'dominant7', frets: [0, 0, 0, 1]},
  {id: 'd-major', label: 'D', quality: 'major', frets: [2, 2, 2, 0]},
  {id: 'd-minor', label: 'Dm', quality: 'minor', frets: [2, 2, 1, 0]},
  {id: 'd-7', label: 'D7', quality: 'dominant7', frets: [2, 2, 2, 3]},
  {id: 'e-major', label: 'E', quality: 'major', frets: [1, 4, 0, 2]},
  {id: 'e-minor', label: 'Em', quality: 'minor', frets: [0, 4, 3, 2]},
  {id: 'e-7', label: 'E7', quality: 'dominant7', frets: [1, 2, 0, 2]},
  {id: 'f-major', label: 'F', quality: 'major', frets: [2, 0, 1, 0]},
  {id: 'f-minor', label: 'Fm', quality: 'minor', frets: [1, 0, 1, 3]},
  {id: 'f-7', label: 'F7', quality: 'dominant7', frets: [2, 3, 1, 3]},
  {id: 'g-major', label: 'G', quality: 'major', frets: [0, 2, 3, 2]},
  {id: 'g-minor', label: 'Gm', quality: 'minor', frets: [0, 2, 3, 1]},
  {id: 'g-7', label: 'G7', quality: 'dominant7', frets: [0, 2, 1, 2]},
  {id: 'a-major', label: 'A', quality: 'major', frets: [2, 1, 0, 0]},
  {id: 'a-minor', label: 'Am', quality: 'minor', frets: [2, 0, 0, 0]},
  {id: 'a-7', label: 'A7', quality: 'dominant7', frets: [0, 1, 0, 0]},
  {id: 'b-major', label: 'B', quality: 'major', frets: [4, 3, 2, 2]},
  {id: 'b-minor', label: 'Bm', quality: 'minor', frets: [4, 2, 2, 2]},
  {id: 'b-7', label: 'B7', quality: 'dominant7', frets: [2, 3, 2, 2]}
]

/** @type {InstrumentDefinition} */
const GUZHENG_DEFINITION = {
  id: 'guzheng',
  label: '古筝',
  family: 'zither',
  strings: createStrings(21),
  tuningPresets: [
    {id: 'd-pentatonic', label: 'D 调', midiNotes: createPentatonicTuning(38)},
    {id: 'g-pentatonic', label: 'G 调', midiNotes: createPentatonicTuning(43)}
  ],
  chordVoicings: [],
  sampleManifest: createSampleManifest('guzheng', GUZHENG_SAMPLE_ROOTS, ['soft', 'strong']),
  layout: {
    stringBanks: [
      {id: 'low', label: '低音', start: 0, end: 6},
      {id: 'middle', label: '中音', start: 7, end: 13},
      {id: 'high', label: '高音', start: 14, end: 20}
    ]
  }
}

/** @type {InstrumentDefinition} */
const GUITAR_DEFINITION = {
  id: 'guitar',
  label: '吉他',
  family: 'fretted',
  strings: createStrings(6),
  tuningPresets: [
    {id: 'standard', label: '标准 EADGBE', midiNotes: [40, 45, 50, 55, 59, 64]},
    {id: 'drop-d', label: 'Drop D', midiNotes: [38, 45, 50, 55, 59, 64]},
    {id: 'dadgad', label: 'DADGAD', midiNotes: [38, 45, 50, 55, 57, 62]}
  ],
  chordVoicings: GUITAR_CHORDS,
  sampleManifest: createSampleManifest('guitar', GUITAR_SAMPLE_ROOTS, ['strong']),
  layout: {maxFret: 7}
}

/** @type {InstrumentDefinition} */
const UKULELE_DEFINITION = {
  id: 'ukulele',
  label: '乌克丽丽',
  family: 'fretted',
  strings: createStrings(4),
  tuningPresets: [
    {id: 'high-g', label: 'High-G', midiNotes: [67, 60, 64, 69]},
    {id: 'low-g', label: 'Low-G', midiNotes: [55, 60, 64, 69]}
  ],
  chordVoicings: UKULELE_CHORDS,
  sampleManifest: createSampleManifest('ukulele', UKULELE_SAMPLE_ROOTS, ['strong']),
  layout: {maxFret: 7}
}

/** @type {Readonly<Record<string, InstrumentDefinition>>} */
export const INSTRUMENT_DEFINITIONS = Object.freeze({
  guzheng: GUZHENG_DEFINITION,
  guitar: GUITAR_DEFINITION,
  ukulele: UKULELE_DEFINITION
})

/**
 * @param {string} instrumentId
 * @returns {InstrumentDefinition}
 */
export function getInstrumentDefinition(instrumentId) {
  return INSTRUMENT_DEFINITIONS[instrumentId] || GUZHENG_DEFINITION
}

/**
 * 无效调弦回退到该乐器的首个预设，避免交互中出现无声琴弦。
 *
 * @param {InstrumentDefinition} definition
 * @param {string} tuningId
 * @returns {TuningPreset}
 */
export function getTuning(definition, tuningId) {
  return definition.tuningPresets.find((preset) => preset.id === tuningId)
    || definition.tuningPresets[0]
}

/**
 * @param {InstrumentDefinition} definition
 * @param {string} chordId
 * @returns {ChordVoicing|null}
 */
export function getChord(definition, chordId) {
  return definition.chordVoicings.find((chord) => chord.id === chordId)
    || definition.chordVoicings[0]
    || null
}

export function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum)
}

export function midiToNoteName(midi) {
  const noteNames = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B']
  const normalizedMidi = Math.round(midi)
  const octave = Math.floor(normalizedMidi / 12) - 1
  return `${noteNames[((normalizedMidi % 12) + 12) % 12]}${octave}`
}
