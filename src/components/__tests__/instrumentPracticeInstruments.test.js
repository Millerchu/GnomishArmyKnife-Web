import test from 'node:test'
import assert from 'node:assert/strict'
import {existsSync, readFileSync, statSync} from 'node:fs'
import {
  GUITAR_CHORDS,
  INSTRUMENT_DEFINITIONS,
  UKULELE_CHORDS,
  createPentatonicTuning,
  getChord,
  getInstrumentDefinition,
  getTuning,
  midiToNoteName
} from '../../features/instrument-practice/instruments/definitions.js'
import {
  POINTER_HYSTERESIS_PX,
  calculatePointerVelocity,
  createCrossingTracker,
  createPointerTracker,
  resolveIndexFromPosition,
  velocityToGain
} from '../../features/instrument-practice/composables/useInstrumentPointers.js'
import {
  advanceDampedString,
  createStringDynamics
} from '../../features/instrument-practice/composables/useStringDynamics.js'

function pointerEvent(pointerId, clientX, clientY, timeStamp = 0) {
  return {pointerId, clientX, clientY, timeStamp, pointerType: 'touch'}
}

test('古筝提供 21 弦 D/G 五声音阶且覆盖四个八度', () => {
  const definition = INSTRUMENT_DEFINITIONS.guzheng
  assert.equal(definition.strings.length, 21)
  assert.deepEqual(
    definition.tuningPresets.map((preset) => preset.id),
    ['d-pentatonic', 'g-pentatonic']
  )
  assert.deepEqual(definition.tuningPresets[0].midiNotes.slice(0, 6), [38, 40, 42, 45, 47, 50])
  assert.equal(definition.tuningPresets[0].midiNotes.at(-1), 86)
  assert.equal(definition.tuningPresets[1].midiNotes.at(-1), 91)
  assert.deepEqual(createPentatonicTuning(38), definition.tuningPresets[0].midiNotes)
})

test('吉他与乌克丽丽均提供 21 个和弦及规定调弦', () => {
  const guitar = getInstrumentDefinition('guitar')
  const ukulele = getInstrumentDefinition('ukulele')

  assert.equal(GUITAR_CHORDS.length, 21)
  assert.equal(UKULELE_CHORDS.length, 21)
  assert.ok(GUITAR_CHORDS.every((chord) => chord.frets.length === 6))
  assert.ok(UKULELE_CHORDS.every((chord) => chord.frets.length === 4))
  assert.deepEqual(
    guitar.tuningPresets.map((preset) => preset.id),
    ['standard', 'drop-d', 'dadgad']
  )
  assert.deepEqual(
    ukulele.tuningPresets.map((preset) => preset.id),
    ['high-g', 'low-g']
  )
  assert.deepEqual(getTuning(guitar, 'drop-d').midiNotes, [38, 45, 50, 55, 59, 64])
  assert.deepEqual(getTuning(ukulele, 'high-g').midiNotes, [67, 60, 64, 69])
  assert.equal(getChord(guitar, 'b-7').label, 'B7')
})

test('钢琴提供三组八度音区与无版权素材依赖的合成音色', () => {
  const piano = getInstrumentDefinition('piano')

  assert.equal(piano.soundType, 'synth-piano')
  assert.equal(piano.strings.length, 37)
  assert.deepEqual(
    piano.layout.keyBanks.map((bank) => bank.id),
    ['low', 'middle', 'high']
  )
  assert.deepEqual(
    piano.tuningPresets[0].midiNotes.slice(0, 3),
    [48, 49, 50]
  )
  assert.equal(piano.tuningPresets[0].midiNotes.at(-1), 84)
  assert.deepEqual(piano.sampleManifest, [])
})

test('紧凑横屏控制行不会截获和弦条触摸', () => {
  const pageSource = readFileSync(
    new URL('../../views/InstrumentPractice.vue', import.meta.url),
    'utf8'
  )

  assert.match(
    pageSource,
    /\.instrument-practice-page \.surface-controls \{\s*pointer-events: none;/
  )
  assert.match(
    pageSource,
    /\.instrument-practice-page \.surface-controls \.mode-switch,\s*\.instrument-practice-page \.surface-controls \.tuning-field \{\s*pointer-events: auto;/
  )
})

test('采样清单与实际 MP3 产物保持一致并保留速度层', () => {
  Object.values(INSTRUMENT_DEFINITIONS).forEach((definition) => {
    if (definition.soundType === 'synth-piano') {
      assert.deepEqual(definition.sampleManifest, [])
      return
    }
    assert.ok(Array.isArray(definition.sampleManifest))
    assert.ok(definition.sampleManifest.length > 0)
    definition.sampleManifest.forEach((sample) => {
      assert.equal(typeof sample.src, 'string')
      assert.match(sample.src, /\.mp3$/)
      assert.equal(typeof sample.rootMidi, 'number')
      assert.ok(['soft', 'strong'].includes(sample.velocityLayer))
      assert.equal(
        existsSync(new URL(`../../../public${sample.src}`, import.meta.url)),
        true,
        `${sample.src} 必须存在`
      )
    })
    const totalBytes = definition.sampleManifest.reduce((total, sample) => (
      total + statSync(new URL(`../../../public${sample.src}`, import.meta.url)).size
    ), 0)
    assert.ok(totalBytes <= 4 * 1024 * 1024, `${definition.label}采样包不得超过 4MB`)
  })
  assert.equal(INSTRUMENT_DEFINITIONS.guzheng.sampleManifest.length, 18)
  assert.equal(INSTRUMENT_DEFINITIONS.guitar.sampleManifest.length, 8)
  assert.equal(INSTRUMENT_DEFINITIONS.ukulele.sampleManifest.length, 5)
  assert.equal(
    existsSync(new URL('../../../public/instrument-samples/NOTICE.md', import.meta.url)),
    true
  )
  assert.equal(midiToNoteName(60), 'C4')
})

test('指针在越过 10px 迟滞后才进入连续手势并计算短历史速度', () => {
  const tracker = createPointerTracker()
  tracker.begin(pointerEvent(1, 0, 0, 0), {kind: 'gliss'})
  assert.equal(tracker.move(pointerEvent(1, POINTER_HYSTERESIS_PX - 1, 0, 10)).moved, false)
  const moved = tracker.move(pointerEvent(1, 20, 0, 20))
  assert.equal(moved.moved, true)
  assert.equal(moved.velocity.x, 1)
  assert.equal(calculatePointerVelocity(moved.history).speed, 1)
  assert.equal(velocityToGain(10), 1)
  assert.equal(tracker.end(pointerEvent(1, 20, 0, 20)).payload.kind, 'gliss')
  assert.equal(tracker.pointers.size, 0)
})

test('一次滑奏中相同琴弦只触发一次，结束后可重新触发', () => {
  const crossingTracker = createCrossingTracker()
  crossingTracker.begin(4, 'string-1', 0)
  assert.equal(crossingTracker.enter(4, 'string-2', 10), true)
  assert.equal(crossingTracker.enter(4, 'string-2', 20), false)
  assert.equal(crossingTracker.enter(4, 'string-1', 50), false)
  crossingTracker.end(4)
  assert.equal(crossingTracker.enter(4, 'string-1', 100), true)
  assert.equal(resolveIndexFromPosition(25, 0, 100, 4), 1)
})

test('阻尼弦模型叠加拨弦冲量并在减少动态时只保留静态能量反馈', () => {
  const model = {position: 4, velocity: 20, energy: 1}
  advanceDampedString(model, 1 / 60)
  assert.notEqual(model.position, 4)
  assert.ok(model.energy > 0)

  const queuedFrames = []
  const states = {}
  const dynamics = createStringDynamics({
    states,
    requestFrame: (callback) => {
      queuedFrames.push(callback)
      return queuedFrames.length
    },
    cancelFrame: () => {}
  })
  dynamics.pluck('string-1', 0.5)
  const firstVelocity = states['string-1'].velocity
  dynamics.pluck('string-1', 0.5)
  assert.ok(states['string-1'].velocity > firstVelocity)
  dynamics.stop()

  const reducedStates = {}
  const reducedDynamics = createStringDynamics({
    states: reducedStates,
    reducedMotion: true,
    requestFrame: () => 1,
    cancelFrame: () => {}
  })
  reducedDynamics.pluck('string-1', 0.8)
  assert.equal(reducedStates['string-1'].position, 0)
  assert.equal(reducedStates['string-1'].velocity, 0)
  assert.equal(reducedStates['string-1'].reducedFeedback, true)
})
