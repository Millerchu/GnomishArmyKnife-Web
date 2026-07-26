import assert from 'node:assert/strict'
import test from 'node:test'

import {
  MAX_NUMBERED_SCORE_LENGTH,
  buildScorePerformanceSequence,
  createDefaultNumberedScoreDraft,
  parseNumberedScore
} from '../score/numberedScore.js'

function createDraft(overrides = {}) {
  return {
    ...createDefaultNumberedScoreDraft(),
    notation: '1 2 3 4',
    ...overrides
  }
}

test('解析常用简谱记号及紧凑输入', () => {
  const parsed = parseNumberedScore(createDraft({
    notation: "1#4b7|1'/2,//.3. 0 -"
  }))

  assert.equal(parsed.valid, true)
  assert.equal(parsed.noteCount, 6)
  assert.equal(parsed.notes[0].midi, 60)
  assert.equal(parsed.notes[1].midi, 66)
  assert.equal(parsed.notes[2].midi, 70)
  assert.equal(parsed.notes[3].midi, 72)
  assert.equal(parsed.notes[3].durationBeats, 0.5)
  assert.equal(parsed.notes[4].durationBeats, 0.375)
  assert.equal(parsed.notes[5].durationBeats, 1.5)
  assert.equal(parsed.notes.at(-1).kind, 'rest')
  assert.equal(parsed.notes.at(-1).durationBeats, 2)
})

test('按大小调、八度和拍号分母转换音高与时值', () => {
  const minor = parseNumberedScore(createDraft({
    notation: "3 6 7 1' 1,",
    tonic: 9,
    mode: 'natural-minor',
    meter: '6/8',
    bpm: 120
  }))

  assert.deepEqual(minor.notes.map((note) => note.midi), [72, 77, 79, 81, 57])
  assert.equal(minor.durationMs, 1250)
})

test('延长与同音延音线合并为连续事件', () => {
  const parsed = parseNumberedScore(createDraft({
    notation: '1~ | 1 - 2 3'
  }))

  assert.equal(parsed.valid, true)
  assert.equal(parsed.notes.length, 3)
  assert.equal(parsed.notes[0].durationBeats, 3)
  assert.equal(parsed.notes[1].atBeat, 3)
})

test('小节拍数不符只警告，非法字符与无效延音线阻止播放', () => {
  const warningOnly = parseNumberedScore(createDraft({notation: '1 2 | 3 4'}))
  assert.equal(warningOnly.valid, true)
  assert.equal(warningOnly.warnings.length, 2)

  const invalid = parseNumberedScore(createDraft({notation: '1~ 2 @ -'}))
  assert.equal(invalid.valid, false)
  assert.ok(invalid.errors.some((error) => error.message.includes('相同音高')))
  assert.ok(invalid.errors.some((error) => error.message.includes('无法识别')))
  assert.ok(invalid.errors.every((error) => error.line >= 1 && error.column >= 1))
})

test('限制字符数、BPM 与十分钟时长', () => {
  const tooLong = parseNumberedScore(createDraft({
    notation: '1'.repeat(MAX_NUMBERED_SCORE_LENGTH + 1)
  }))
  assert.equal(tooLong.valid, false)
  assert.ok(tooLong.errors.some((error) => error.message.includes('最多')))

  const invalidBpm = parseNumberedScore(createDraft({bpm: 221}))
  assert.equal(invalidBpm.valid, false)
  assert.ok(invalidBpm.errors.some((error) => error.message.includes('40–220')))

  const tooLongDuration = parseNumberedScore(createDraft({
    notation: `1${'-'.repeat(900)}`
  }))
  assert.equal(tooLongDuration.valid, false)
  assert.ok(tooLongDuration.errors.some((error) => error.message.includes('10 分钟')))
})

test('映射钢琴精确琴键与有品乐器的可演奏弦品', () => {
  const parsed = parseNumberedScore(createDraft({notation: "1, 3 5 1'"}))
  const piano = buildScorePerformanceSequence(parsed, createDraft({
    instrumentId: 'piano',
    tuningId: 'concert-pitch'
  }))
  assert.deepEqual(piano.events.map((event) => event.stringId), [
    'key-48',
    'key-64',
    'key-67',
    'key-72'
  ])

  for (const [instrumentId, tuningId, stringCount] of [
    ['guitar', 'standard', 6],
    ['ukulele', 'high-g', 4]
  ]) {
    const sequence = buildScorePerformanceSequence(parsed, createDraft({
      instrumentId,
      tuningId
    }))
    assert.equal(sequence.events.length, 4)
    for (const event of sequence.events) {
      const stringIndex = Number(event.stringId.split('-')[1]) - 1
      assert.ok(stringIndex >= 0 && stringIndex < stringCount)
      assert.ok(event.fret >= 0 && event.fret <= 7)
    }
  }
})

test('古筝变音保持准确 MIDI 并标记左手按弦反馈', () => {
  const draft = createDraft({
    notation: '#1 5',
    instrumentId: 'guzheng',
    tuningId: 'd-pentatonic'
  })
  const sequence = buildScorePerformanceSequence(parseNumberedScore(draft), draft)

  assert.equal(sequence.events[0].midi % 12, 1)
  assert.equal(sequence.events[0].scoreAltered, true)
  assert.match(sequence.events[0].stringId, /^string-/)
})
