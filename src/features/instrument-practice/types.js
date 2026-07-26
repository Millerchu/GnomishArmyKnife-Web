/**
 * @typedef {'guzheng' | 'guitar' | 'ukulele' | 'piano'} InstrumentId
 */

/**
 * 单个可解码采样。velocity 使用 0-1 的力度锚点，同一根音可配置多个力度层。
 *
 * @typedef {Object} InstrumentSample
 * @property {string} id
 * @property {string} [url]
 * @property {string} [src] - 兼容乐器定义层的静态资源字段。
 * @property {number} rootMidi
 * @property {number} [velocity=0.7]
 * @property {'soft' | 'normal' | 'strong' | 'bright'} [velocityLayer]
 */

/**
 * @typedef {Object} InstrumentSampleManifest
 * @property {InstrumentSample[]} samples
 * @property {string} [source]
 * @property {string} [license]
 */

/**
 * 乐器页面使用的稳定配置结构。
 *
 * @typedef {Object} InstrumentDefinition
 * @property {InstrumentId} id
 * @property {string} label
 * @property {Array<{id: string, label: string}>} strings
 * @property {Array<{id: string, label: string, midiNotes: number[]}>} tuningPresets
 * @property {Array<{id: string, label: string, frets: number[]}>} [chordVoicings]
 * @property {InstrumentSampleManifest | InstrumentSample[]} sampleManifest
 * @property {'sample' | 'synth-piano'} [soundType='sample'] - 钢琴以 Web Audio 合成音色演奏，不依赖外部位图或音频素材。
 * @property {Record<string, unknown>} [layout]
 */

/**
 * 录制层只保存标准化输出事件，at 为相对录制起点的毫秒数。
 *
 * @typedef {Object} PerformanceEvent
 * @property {number} at
 * @property {'note' | 'bend' | 'damp'} type
 * @property {InstrumentId} instrumentId
 * @property {string | null} stringId - 全局闷音事件为 null。
 * @property {number} [midi]
 * @property {number} [velocity]
 * @property {number} [bendCents]
 * @property {boolean} [damped] - 按住闷音时产生的短音符。
 * @property {number} [durationSeconds] - 临时曲谱回放的发声时长，不写入后端录音协议。
 * @property {number} [scoreMeasureIndex] - 临时曲谱的小节序号，仅用于前端演示。
 * @property {boolean} [scoreAltered] - 古筝变音需同步显示左手按弦反馈。
 * @property {number} [fret] - 临时曲谱映射到有品乐器的位置，仅用于前端演示。
 */

/**
 * @typedef {Object} SessionTake
 * @property {string} id
 * @property {InstrumentId} instrumentId
 * @property {string} tuningId
 * @property {number} bpm
 * @property {string} meter
 * @property {number} durationMs
 * @property {PerformanceEvent[]} events
 * @property {number} createdAt
 */

/**
 * @typedef {Object} NumberedScoreDraft
 * @property {string} notation
 * @property {number} tonic - C 至 B 对应 0–11。
 * @property {'major' | 'natural-minor'} mode
 * @property {'2/4' | '3/4' | '4/4' | '6/8'} meter
 * @property {number} bpm
 * @property {InstrumentId | ''} instrumentId
 * @property {string} tuningId
 */

/**
 * @typedef {Object} ParsedScoreNote
 * @property {'note' | 'rest'} kind
 * @property {number} atBeat
 * @property {number} durationBeats
 * @property {number} measureIndex
 * @property {number} [midi]
 */

/**
 * @typedef {Object} ScorePerformanceSequence
 * @property {string} id
 * @property {'score'} kind
 * @property {string} title
 * @property {InstrumentId} instrumentId
 * @property {string} tuningId
 * @property {number} bpm
 * @property {string} meter
 * @property {number} durationMs
 * @property {PerformanceEvent[]} events
 */

export const PERFORMANCE_EVENT_TYPES = Object.freeze({
    NOTE: 'note',
    BEND: 'bend',
    DAMP: 'damp'
})
