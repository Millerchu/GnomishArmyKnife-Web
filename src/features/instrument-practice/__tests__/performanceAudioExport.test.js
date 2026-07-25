import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildTakeAudioFileName,
  encodeAudioBufferAsWav
} from '../audio/performanceAudioExport.js'

test('WAV 导出使用标准 PCM 头并保留采样数据', async () => {
  const audioBuffer = {
    numberOfChannels: 1,
    sampleRate: 8000,
    length: 2,
    getChannelData: () => new Float32Array([0, -1])
  }

  const wav = encodeAudioBufferAsWav(audioBuffer)
  const view = new DataView(await wav.arrayBuffer())
  const text = (offset, length) => String.fromCharCode(
    ...Array.from({length}, (_, index) => view.getUint8(offset + index))
  )

  assert.equal(wav.type, 'audio/wav')
  assert.equal(text(0, 4), 'RIFF')
  assert.equal(text(8, 4), 'WAVE')
  assert.equal(view.getUint32(24, true), 8000)
  assert.equal(view.getInt16(44, true), 0)
  assert.equal(view.getInt16(46, true), -32768)
})

test('音频文件名包含乐器和稳定时间戳', () => {
  const fileName = buildTakeAudioFileName({
    instrumentId: 'piano',
    createdAt: Date.UTC(2026, 6, 25, 12, 34, 56)
  })

  assert.equal(fileName, 'portable-instrument-piano-20260725T123456.wav')
})
