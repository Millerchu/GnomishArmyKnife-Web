import {getInstrumentDefinition} from '../instruments/definitions.js'
import {PERFORMANCE_EVENT_TYPES} from '../types.js'
import {calculatePlaybackRate, clamp, selectNearestSample} from './sampleSelection.js'
import {sortPerformanceEvents} from './sessionRecorder.js'

const EXPORT_SAMPLE_RATE = 44100
const EXPORT_CHANNEL_COUNT = 1
const EXPORT_TAIL_SECONDS = 3
const EXPORT_ATTACK_SECONDS = 0.005
const EXPORT_FADE_SECONDS = 0.02
const MAX_VOICES_PER_STRING = 2
const SYNTH_PIANO_PARTIALS = Object.freeze([
  {ratio: 1, gain: 1},
  {ratio: 2, gain: 0.22},
  {ratio: 3, gain: 0.09},
  {ratio: 4, gain: 0.035}
])
const SYNTH_PIANO_MIN_DECAY_SECONDS = 1.35
const SYNTH_PIANO_MAX_DECAY_SECONDS = 2.8

function midiToFrequency(midi) {
  return 440 * 2 ** ((Number(midi) - 69) / 12)
}

function getOfflineAudioContextConstructor() {
  return globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext || null
}

function normalizeTakeDurationMs(take) {
  const durationMs = Number(take?.durationMs)
  if (!Number.isFinite(durationMs) || durationMs < 0) {
    throw new Error('录音时长无效，无法导出音频')
  }
  return durationMs
}

function setAudioParamValue(parameter, value, time) {
  parameter?.setValueAtTime?.(value, time)
}

function rampAudioParam(parameter, value, time) {
  parameter?.linearRampToValueAtTime?.(value, time)
}

function cancelAudioParam(parameter, time) {
  parameter?.cancelScheduledValues?.(time)
}

function removeVoice(activeVoices, voice) {
  const voices = activeVoices.get(voice.stringId) || []
  activeVoices.set(voice.stringId, voices.filter((candidate) => candidate !== voice))
}

function fadeVoice(activeVoices, voice, fadeAt) {
  if (!voice || voice.stopping) {
    return
  }
  voice.stopping = true
  const gain = voice.gainNode?.gain
  const stopAt = fadeAt + EXPORT_FADE_SECONDS
  cancelAudioParam(gain, fadeAt)
  setAudioParamValue(gain, gain?.value ?? 0, fadeAt)
  rampAudioParam(gain, 0, stopAt)
  try {
    voice.stop(stopAt)
  } catch {
    // 离线渲染中重复停止已结束的声源不应影响其它事件。
  }
  removeVoice(activeVoices, voice)
}

function reserveStringVoice(activeVoices, stringId, startAt) {
  const existingVoices = activeVoices.get(stringId) || []
  while (existingVoices.length >= MAX_VOICES_PER_STRING) {
    fadeVoice(activeVoices, existingVoices.shift(), startAt)
  }
  return existingVoices
}

function addVoice(activeVoices, voice) {
  const voices = activeVoices.get(voice.stringId) || []
  voices.push(voice)
  activeVoices.set(voice.stringId, voices)
}

function createSampleVoice(context, destination, sampleBuffer, event, startAt) {
  const source = context.createBufferSource()
  const gainNode = context.createGain()
  const normalizedVelocity = clamp(event.velocity, 0.02, 1)
  const basePlaybackRate = calculatePlaybackRate(event.midi, event.sample.rootMidi)
  const playbackRate = calculatePlaybackRate(event.midi, event.sample.rootMidi, event.bendCents)

  source.buffer = sampleBuffer
  setAudioParamValue(source.playbackRate, playbackRate, startAt)
  setAudioParamValue(gainNode.gain, 0, startAt)
  rampAudioParam(gainNode.gain, normalizedVelocity, startAt + EXPORT_ATTACK_SECONDS)
  source.connect(gainNode)
  gainNode.connect(destination)
  source.start(startAt)

  return {
    stringId: event.stringId,
    gainNode,
    source,
    basePlaybackRate,
    stopping: false,
    stop: (when) => source.stop(when)
  }
}

function createSynthPianoVoice(context, destination, event, startAt) {
  const gainNode = context.createGain()
  const normalizedVelocity = clamp(event.velocity, 0.02, 1)
  const peakGain = normalizedVelocity * 0.5
  const naturalDecay = SYNTH_PIANO_MIN_DECAY_SECONDS
    + (SYNTH_PIANO_MAX_DECAY_SECONDS - SYNTH_PIANO_MIN_DECAY_SECONDS) * normalizedVelocity
  const releaseAt = startAt + naturalDecay
  const oscillators = SYNTH_PIANO_PARTIALS.map(({ratio, gain}) => {
    const oscillator = context.createOscillator()
    const partialGain = context.createGain()
    oscillator.type = 'sine'
    setAudioParamValue(oscillator.frequency, midiToFrequency(event.midi) * ratio, startAt)
    setAudioParamValue(partialGain.gain, gain, startAt)
    oscillator.connect(partialGain)
    partialGain.connect(gainNode)
    oscillator.start(startAt)
    return oscillator
  })

  setAudioParamValue(gainNode.gain, 0, startAt)
  rampAudioParam(gainNode.gain, peakGain, startAt + EXPORT_ATTACK_SECONDS)
  gainNode.gain.exponentialRampToValueAtTime?.(0.0001, releaseAt)
  gainNode.connect(destination)
  oscillators.forEach((oscillator) => oscillator.stop(releaseAt + EXPORT_FADE_SECONDS))

  return {
    stringId: event.stringId,
    gainNode,
    source: null,
    basePlaybackRate: 1,
    stopping: false,
    stop: (when) => oscillators.forEach((oscillator) => oscillator.stop(when))
  }
}

async function loadRequiredSampleBuffers(context, definition, events, fetchImpl) {
  const selectedSamples = events
    .filter((event) => event.type === PERFORMANCE_EVENT_TYPES.NOTE)
    .map((event) => selectNearestSample(definition.sampleManifest, event.midi, event.velocity))
    .filter(Boolean)
  const uniqueSamples = [...new Map(selectedSamples.map((sample) => [sample.id || sample.url || sample.src, sample])).values()]
  const entries = await Promise.all(uniqueSamples.map(async (sample) => {
    const url = sample.url || sample.src
    const response = await fetchImpl(url)
    if (!response || response.ok === false) {
      throw new Error(`采样加载失败：${url}`)
    }
    const encodedAudio = await response.arrayBuffer()
    const buffer = await context.decodeAudioData(encodedAudio)
    return [sample.id || url, buffer]
  }))
  return new Map(entries)
}

function playRenderedEvent(context, destination, definition, sampleBuffers, activeVoices, event) {
  const eventTime = Math.max(0, Number(event.at) || 0) / 1000
  if (event.type === PERFORMANCE_EVENT_TYPES.NOTE) {
    if (!Number.isFinite(Number(event.midi)) || !event.stringId) {
      return
    }
    reserveStringVoice(activeVoices, event.stringId, eventTime)
    let voice = null
    if (definition.soundType === 'synth-piano') {
      voice = createSynthPianoVoice(context, destination, event, eventTime)
    } else {
      const sample = selectNearestSample(definition.sampleManifest, event.midi, event.velocity)
      const sampleBuffer = sample ? sampleBuffers.get(sample.id || sample.url || sample.src) : null
      if (!sample || !sampleBuffer) {
        return
      }
      voice = createSampleVoice(context, destination, sampleBuffer, {...event, sample}, eventTime)
    }
    addVoice(activeVoices, voice)
    return
  }

  if (event.type === PERFORMANCE_EVENT_TYPES.BEND && event.stringId) {
    const bendRatio = 2 ** (Number(event.bendCents || 0) / 1200)
    ;(activeVoices.get(event.stringId) || []).forEach((voice) => {
      if (!voice.stopping && voice.source?.playbackRate) {
        setAudioParamValue(voice.source.playbackRate, voice.basePlaybackRate * bendRatio, eventTime)
      }
    })
    return
  }

  if (event.type === PERFORMANCE_EVENT_TYPES.DAMP) {
    const voices = event.stringId
      ? [...(activeVoices.get(event.stringId) || [])]
      : [...activeVoices.values()].flat()
    voices.forEach((voice) => fadeVoice(activeVoices, voice, eventTime))
  }
}

/**
 * 将事件式录音离线渲染为单声道 WAV；不读麦克风，也不会把导出的音频上传到服务器。
 *
 * @param {import('../types.js').SessionTake} take
 * @param {{fetchImpl?: typeof fetch}} [options]
 * @returns {Promise<Blob>}
 */
export async function renderTakeToWav(take, {fetchImpl = globalThis.fetch} = {}) {
  const OfflineAudioContextConstructor = getOfflineAudioContextConstructor()
  if (!OfflineAudioContextConstructor) {
    throw new Error('当前浏览器不支持离线音频导出')
  }
  if (typeof fetchImpl !== 'function') {
    throw new Error('当前浏览器无法读取乐器采样')
  }

  const durationMs = normalizeTakeDurationMs(take)
  const definition = getInstrumentDefinition(take?.instrumentId)
  const frameCount = Math.ceil((durationMs / 1000 + EXPORT_TAIL_SECONDS) * EXPORT_SAMPLE_RATE)
  const context = new OfflineAudioContextConstructor(
    EXPORT_CHANNEL_COUNT,
    Math.max(1, frameCount),
    EXPORT_SAMPLE_RATE
  )
  const masterGain = context.createGain()
  setAudioParamValue(masterGain.gain, 0.9, 0)
  masterGain.connect(context.destination)

  const events = sortPerformanceEvents(take?.events)
    .filter((event) => Number(event.at) >= 0 && Number(event.at) <= durationMs)
  const sampleBuffers = definition.soundType === 'synth-piano'
    ? new Map()
    : await loadRequiredSampleBuffers(context, definition, events, fetchImpl)
  const activeVoices = new Map()
  events.forEach((event) => {
    playRenderedEvent(context, masterGain, definition, sampleBuffers, activeVoices, event)
  })
  const renderedBuffer = await context.startRendering()
  return encodeAudioBufferAsWav(renderedBuffer)
}

/**
 * 以 16-bit PCM WAV 封装 OfflineAudioContext 的渲染结果，兼容 iOS 和 Android 的本地文件应用。
 */
export function encodeAudioBufferAsWav(audioBuffer) {
  const channelCount = Math.max(1, Number(audioBuffer?.numberOfChannels) || 1)
  const sampleRate = Math.max(1, Number(audioBuffer?.sampleRate) || EXPORT_SAMPLE_RATE)
  const frameCount = Math.max(0, Number(audioBuffer?.length) || 0)
  const bytesPerSample = 2
  const blockAlign = channelCount * bytesPerSample
  const output = new ArrayBuffer(44 + frameCount * blockAlign)
  const view = new DataView(output)
  const writeAscii = (offset, value) => {
    Array.from(value).forEach((character, index) => view.setUint8(offset + index, character.charCodeAt(0)))
  }

  writeAscii(0, 'RIFF')
  view.setUint32(4, 36 + frameCount * blockAlign, true)
  writeAscii(8, 'WAVE')
  writeAscii(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, channelCount, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, 16, true)
  writeAscii(36, 'data')
  view.setUint32(40, frameCount * blockAlign, true)

  const channels = Array.from({length: channelCount}, (_, index) => audioBuffer.getChannelData(index))
  let offset = 44
  for (let frame = 0; frame < frameCount; frame += 1) {
    channels.forEach((channel) => {
      const sample = Math.max(-1, Math.min(1, Number(channel[frame]) || 0))
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
      offset += bytesPerSample
    })
  }
  return new Blob([output], {type: 'audio/wav'})
}

/**
 * 为下载和移动端分享生成稳定、无空格的 WAV 文件名。
 */
export function buildTakeAudioFileName(take) {
  const timestamp = new Date(Number(take?.createdAt) || Date.now())
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, '')
  const instrumentId = String(take?.instrumentId || 'instrument').replace(/[^a-z0-9-]/gi, '') || 'instrument'
  return `portable-instrument-${instrumentId}-${timestamp}.wav`
}

/**
 * 在支持文件分享的手机上优先打开系统分享面板；其它浏览器回退至标准下载。
 */
export async function saveAudioBlobToDevice(blob, fileName) {
  const FileConstructor = globalThis.File
  const navigator = globalThis.navigator
  const file = typeof FileConstructor === 'function'
    ? new FileConstructor([blob], fileName, {type: blob.type || 'audio/wav'})
    : null
  if (file && typeof navigator?.canShare === 'function' && navigator.canShare({files: [file]})
    && typeof navigator.share === 'function') {
    try {
      await navigator.share({files: [file], title: '随身乐器录音'})
      return 'shared'
    } catch (error) {
      if (error?.name === 'AbortError') {
        return 'cancelled'
      }
    }
  }

  if (!globalThis.document || !globalThis.URL?.createObjectURL) {
    throw new Error('当前浏览器无法保存音频文件')
  }
  const url = globalThis.URL.createObjectURL(blob)
  const anchor = globalThis.document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.style.display = 'none'
  globalThis.document.body?.appendChild(anchor)
  anchor.click()
  anchor.remove()
  globalThis.setTimeout(() => globalThis.URL.revokeObjectURL(url), 1000)
  return 'downloaded'
}
