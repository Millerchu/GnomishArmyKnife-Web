import {PERFORMANCE_EVENT_TYPES} from '../types.js'
import {
    calculatePlaybackRate,
    clamp,
    normalizeSampleManifest,
    selectNearestSample
} from './sampleSelection.js'

const DEFAULT_MAX_VOICES = 32
const DEFAULT_MAX_VOICES_PER_STRING = 2
const DEFAULT_FADE_SECONDS = 0.02
const ATTACK_SECONDS = 0.005

function createBrowserAudioContext(options) {
    const AudioContextConstructor = globalThis.AudioContext || globalThis.webkitAudioContext
    return AudioContextConstructor ? new AudioContextConstructor(options) : null
}

function defaultFetch(input) {
    if (typeof globalThis.fetch !== 'function') {
        throw new Error('当前环境不支持采样文件加载')
    }
    return globalThis.fetch(input)
}

function setAudioParamValue(parameter, value, time) {
    if (typeof parameter?.setValueAtTime === 'function') {
        parameter.setValueAtTime(value, time)
        return
    }
    if (parameter) {
        parameter.value = value
    }
}

function rampAudioParam(parameter, value, time) {
    if (typeof parameter?.linearRampToValueAtTime === 'function') {
        parameter.linearRampToValueAtTime(value, time)
        return
    }
    setAudioParamValue(parameter, value, time)
}

function cancelAudioParam(parameter, time) {
    parameter?.cancelScheduledValues?.(time)
}

/**
 * 原生 Web Audio 乐器引擎。依赖均可注入，以便在 Node 和不支持 AudioContext 的浏览器中安全运行。
 */
export class InstrumentAudioEngine {
    constructor({
        contextFactory = createBrowserAudioContext,
        fetchImpl = defaultFetch,
        maxVoices = DEFAULT_MAX_VOICES,
        maxVoicesPerString = DEFAULT_MAX_VOICES_PER_STRING,
        fadeSeconds = DEFAULT_FADE_SECONDS
    } = {}) {
        this.contextFactory = contextFactory
        this.fetchImpl = fetchImpl
        this.maxVoices = Math.max(1, Number(maxVoices) || DEFAULT_MAX_VOICES)
        this.maxVoicesPerString = Math.max(1, Number(maxVoicesPerString) || DEFAULT_MAX_VOICES_PER_STRING)
        this.fadeSeconds = Math.max(0.005, Number(fadeSeconds) || DEFAULT_FADE_SECONDS)

        this.context = null
        this.masterBus = null
        this.instrumentBus = null
        this.metronomeBus = null
        this.instrumentDefinitions = new Map()
        this.instrumentBuffers = new Map()
        this.bufferPromises = new Map()
        this.instrumentLoadPromises = new Map()
        this.activeVoices = []
        this.voiceSequence = 0
        this.unlockPromise = null
        this.state = {status: 'idle', error: ''}
        this.stateListeners = new Set()
    }

    /**
     * @param {(state: {status: string, error: string}) => void} listener
     * @returns {() => void}
     */
    subscribe(listener) {
        if (typeof listener !== 'function') {
            return () => {}
        }
        this.stateListeners.add(listener)
        listener({...this.state})
        return () => this.stateListeners.delete(listener)
    }

    get currentTime() {
        return Number(this.context?.currentTime) || 0
    }

    get isRunning() {
        return this.context?.state === 'running'
    }

    get voiceCount() {
        return this.activeVoices.length
    }

    get loadedInstrumentIds() {
        return [...this.instrumentBuffers.keys()]
    }

    _updateState(status, error = '') {
        this.state = {status, error}
        this.stateListeners.forEach(listener => listener({...this.state}))
    }

    /**
     * 建立总线但不强行恢复声音；浏览器仍可要求用户手势后 resume。
     *
     * @returns {Promise<boolean>}
     */
    async initialize() {
        if (this.context && this.context.state !== 'closed') {
            return true
        }
        if (typeof this.contextFactory !== 'function') {
            this._updateState('unsupported', '当前浏览器不支持 Web Audio')
            return false
        }

        try {
            const contextOrPromise = this.contextFactory({latencyHint: 'interactive'})
            this.context = typeof contextOrPromise?.then === 'function'
                ? await contextOrPromise
                : contextOrPromise
            if (!this.context) {
                this._updateState('unsupported', '当前浏览器不支持 Web Audio')
                return false
            }

            this.masterBus = this.context.createGain()
            this.instrumentBus = this.context.createGain()
            this.metronomeBus = this.context.createGain()
            this.instrumentBus.connect(this.masterBus)
            this.metronomeBus.connect(this.masterBus)
            this.masterBus.connect(this.context.destination)
            setAudioParamValue(this.masterBus.gain, 0.9, this.currentTime)
            setAudioParamValue(this.instrumentBus.gain, 1, this.currentTime)
            setAudioParamValue(this.metronomeBus.gain, 0.55, this.currentTime)
            this._updateState(this.isRunning ? 'ready' : 'prepared')
            return true
        } catch (error) {
            this.context = null
            this._updateState('unsupported', error?.message || 'Web Audio 初始化失败')
            return false
        }
    }

    /**
     * 必须从真实指针或键盘事件中调用，以满足移动浏览器的声音解锁规则。
     *
     * @returns {Promise<boolean>}
     */
    unlock() {
        if (this.unlockPromise) {
            return this.unlockPromise
        }
        if (this.context && this.context.state !== 'closed') {
            this.unlockPromise = this._resumeContext()
                .finally(() => {
                    this.unlockPromise = null
                })
            return this.unlockPromise
        }

        const initializationPromise = this.initialize()
        // 默认工厂会同步创建 context；此处立即调用 resume，确保仍处于真实手势调用栈。
        const unlockAttempt = this.context
            ? this._resumeContext()
            : initializationPromise.then(initialized => initialized ? this._resumeContext() : false)
        this.unlockPromise = Promise.resolve(unlockAttempt)
            .finally(() => {
                this.unlockPromise = null
            })
        return this.unlockPromise
    }

    async _resumeContext() {
        try {
            if (this.context.state !== 'running' && typeof this.context.resume === 'function') {
                await this.context.resume()
            }
            const unlocked = this.context.state === 'running'
            this._updateState(
                unlocked ? 'ready' : 'blocked',
                unlocked ? '' : '轻触演奏区以启用声音'
            )
            return unlocked
        } catch (error) {
            this._updateState('blocked', error?.message || '声音启用失败，请再次轻触演奏区')
            return false
        }
    }

    /**
     * 解码并缓存一件乐器的全部采样。相同 URL 在多件乐器之间只解码一次。
     *
     * @param {import('../types.js').InstrumentDefinition} definition
     * @param {{background?: boolean}} options
     * @returns {Promise<boolean>}
     */
    async loadInstrument(definition, {background = false} = {}) {
        const instrumentId = definition?.id
        const samples = normalizeSampleManifest(definition?.sampleManifest)
        if (!instrumentId || samples.length === 0) {
            throw new Error('乐器采样配置不完整')
        }
        if (this.instrumentBuffers.has(instrumentId)) {
            return true
        }
        if (this.instrumentLoadPromises.has(instrumentId)) {
            try {
                const loaded = await this.instrumentLoadPromises.get(instrumentId)
                if (!background) {
                    this._updateState(this.isRunning ? 'ready' : 'prepared')
                }
                return loaded
            } catch (error) {
                if (!background) {
                    this._updateState('error', error?.message || `${definition.label || '乐器'}采样加载失败`)
                }
                throw error
            }
        }

        const normalizedDefinition = {
            ...definition,
            sampleManifest: {
                ...(Array.isArray(definition.sampleManifest) ? {} : definition.sampleManifest),
                samples
            }
        }
        if (!background) {
            this._updateState('loading')
        }
        const loadPromise = this._loadInstrumentSamples(normalizedDefinition)
        this.instrumentLoadPromises.set(instrumentId, loadPromise)
        try {
            const loaded = await loadPromise
            if (!background) {
                this._updateState(this.isRunning ? 'ready' : 'prepared')
            }
            return loaded
        } catch (error) {
            if (!background) {
                this._updateState('error', error?.message || `${definition.label || '乐器'}采样加载失败`)
            }
            throw error
        } finally {
            this.instrumentLoadPromises.delete(instrumentId)
        }
    }

    async _loadInstrumentSamples(definition) {
        const initialized = await this.initialize()
        if (!initialized) {
            return false
        }

        const sampleBufferEntries = await Promise.all(
            definition.sampleManifest.samples.map(async sample => {
                const audioBuffer = await this._loadSampleBuffer(sample.url)
                return [sample.id || sample.url, audioBuffer]
            })
        )
        this.instrumentDefinitions.set(definition.id, definition)
        this.instrumentBuffers.set(definition.id, new Map(sampleBufferEntries))
        return true
    }

    async _loadSampleBuffer(url) {
        if (this.bufferPromises.has(url)) {
            return this.bufferPromises.get(url)
        }

        const bufferPromise = (async () => {
            const response = await this.fetchImpl(url)
            if (!response || response.ok === false) {
                throw new Error(`采样加载失败：${url}`)
            }
            const encodedAudio = await response.arrayBuffer()
            return this.context.decodeAudioData(encodedAudio)
        })()
        this.bufferPromises.set(url, bufferPromise)
        try {
            return await bufferPromise
        } catch (error) {
            this.bufferPromises.delete(url)
            throw error
        }
    }

    /**
     * 播放标准化音符，未解锁或采样未就绪时安全返回 null。
     *
     * @param {Object} note
     * @param {string} note.instrumentId
     * @param {string} note.stringId
     * @param {number} note.midi
     * @param {number} [note.velocity=0.7]
     * @param {number} [note.bendCents=0]
     * @param {boolean} [note.damped=false]
     * @param {number} [note.when]
     * @param {number} [note.durationSeconds]
     * @returns {string | null}
     */
    playNote({
        instrumentId,
        stringId,
        midi,
        velocity = 0.7,
        bendCents = 0,
        damped = false,
        when,
        durationSeconds
    }) {
        if (!this.isRunning) {
            return null
        }

        const definition = this.instrumentDefinitions.get(instrumentId)
        const buffers = this.instrumentBuffers.get(instrumentId)
        const sample = selectNearestSample(definition?.sampleManifest?.samples, midi, velocity)
        const audioBuffer = sample ? buffers?.get(sample.id || sample.url) : null
        if (!sample || !audioBuffer) {
            return null
        }

        const startAt = Math.max(this.currentTime, Number(when) || this.currentTime)
        this._makeVoiceCapacity(instrumentId, stringId, startAt)

        const source = this.context.createBufferSource()
        const voiceGain = this.context.createGain()
        const normalizedVelocity = clamp(velocity, 0.02, 1)
        const basePlaybackRate = calculatePlaybackRate(midi, sample.rootMidi)
        const playbackRate = calculatePlaybackRate(midi, sample.rootMidi, bendCents)

        source.buffer = audioBuffer
        setAudioParamValue(source.playbackRate, playbackRate, startAt)
        setAudioParamValue(voiceGain.gain, 0, startAt)
        rampAudioParam(voiceGain.gain, normalizedVelocity, startAt + ATTACK_SECONDS)
        source.connect(voiceGain)
        voiceGain.connect(this.instrumentBus)

        const voice = {
            id: `voice-${++this.voiceSequence}`,
            source,
            gainNode: voiceGain,
            instrumentId,
            stringId,
            startedAt: startAt,
            basePlaybackRate,
            peakGain: normalizedVelocity,
            stopping: false
        }
        source.onended = () => this._removeVoice(voice.id)
        this.activeVoices.push(voice)
        source.start(startAt)

        const requestedDuration = damped
            ? Math.min(Number(durationSeconds) || 0.09, 0.12)
            : Number(durationSeconds)
        if (Number.isFinite(requestedDuration) && requestedDuration > 0) {
            this._scheduleVoiceRelease(voice, startAt + requestedDuration)
        }
        return voice.id
    }

    /**
     * 在指定弦当前仍发声的声部上调节音高。
     */
    bendString({instrumentId, stringId, bendCents = 0, when} = {}) {
        const changeAt = Math.max(this.currentTime, Number(when) || this.currentTime)
        const bendRatio = 2 ** (Number(bendCents || 0) / 1200)
        this.activeVoices
            .filter(voice => voice.instrumentId === instrumentId && voice.stringId === stringId && !voice.stopping)
            .forEach(voice => {
                const targetRate = voice.basePlaybackRate * bendRatio
                cancelAudioParam(voice.source.playbackRate, changeAt)
                setAudioParamValue(voice.source.playbackRate, voice.source.playbackRate.value, changeAt)
                rampAudioParam(voice.source.playbackRate, targetRate, changeAt + 0.016)
            })
    }

    /**
     * 以短淡出停止指定弦，避免触发爆音。
     */
    dampString({instrumentId, stringId, when} = {}) {
        const dampAt = Math.max(this.currentTime, Number(when) || this.currentTime)
        this.activeVoices
            .filter(voice =>
                voice.instrumentId === instrumentId
                && (!stringId || voice.stringId === stringId)
            )
            .forEach(voice => this._fadeAndStopVoice(voice, dampAt))
    }

    /**
     * 用标准化事件驱动实时演奏或录音回放。
     *
     * @param {import('../types.js').PerformanceEvent} event
     * @param {number} [when]
     */
    playPerformanceEvent(event, when) {
        if (event?.type === PERFORMANCE_EVENT_TYPES.NOTE) {
            return this.playNote({...event, when})
        }
        if (event?.type === PERFORMANCE_EVENT_TYPES.BEND) {
            this.bendString({...event, when})
        }
        if (event?.type === PERFORMANCE_EVENT_TYPES.DAMP) {
            this.dampString({...event, when})
        }
        return null
    }

    _makeVoiceCapacity(instrumentId, stringId, now) {
        const voicesOnString = this.activeVoices
            .filter(voice => voice.instrumentId === instrumentId && voice.stringId === stringId)
            .sort((left, right) => left.startedAt - right.startedAt)
        while (voicesOnString.length >= this.maxVoicesPerString) {
            this._fadeAndStopVoice(voicesOnString.shift(), now)
        }

        const orderedVoices = [...this.activeVoices].sort((left, right) => left.startedAt - right.startedAt)
        while (this.activeVoices.length >= this.maxVoices && orderedVoices.length > 0) {
            this._fadeAndStopVoice(orderedVoices.shift(), now)
        }
    }

    _fadeAndStopVoice(voice, fadeAt) {
        if (!voice || voice.stopping) {
            return
        }
        voice.stopping = true
        const stopAt = fadeAt + this.fadeSeconds
        const gainParameter = voice.gainNode?.gain
        cancelAudioParam(gainParameter, fadeAt)
        setAudioParamValue(gainParameter, gainParameter?.value ?? 0, fadeAt)
        rampAudioParam(gainParameter, 0, stopAt)
        try {
            voice.source.stop(stopAt)
        } catch {
            // 已自然结束的 AudioBufferSourceNode 再次 stop 会抛错，此时只需移出活动列表。
        }
        this._removeVoice(voice.id)
    }

    _scheduleVoiceRelease(voice, fadeAt) {
        const stopAt = fadeAt + this.fadeSeconds
        const gainParameter = voice.gainNode?.gain
        setAudioParamValue(gainParameter, voice.peakGain, fadeAt)
        rampAudioParam(gainParameter, 0, stopAt)
        try {
            voice.source.stop(stopAt)
        } catch {
            // 某些短采样可能先自然结束，onended 会负责活动声部清理。
        }
    }

    _removeVoice(voiceId) {
        this.activeVoices = this.activeVoices.filter(voice => voice.id !== voiceId)
    }

    _stopVoiceImmediately(voice, stopAt) {
        if (!voice) {
            return
        }
        try {
            voice.source.stop(stopAt)
        } catch {
            // 已结束声部无需重复处理。
        }
        this._removeVoice(voice.id)
    }

    stopAll(when = this.currentTime) {
        ;[...this.activeVoices].forEach(voice => this._fadeAndStopVoice(voice, when))
    }

    stopAllImmediately(when = this.currentTime) {
        ;[...this.activeVoices].forEach(voice => this._stopVoiceImmediately(voice, when))
    }

    /**
     * 节拍器独立走 metronome bus，不会进入演奏事件录制。
     */
    scheduleMetronomeClick({when, accent = false} = {}) {
        if (!this.isRunning) {
            return false
        }
        const startAt = Math.max(this.currentTime, Number(when) || this.currentTime)
        const oscillator = this.context.createOscillator()
        const clickGain = this.context.createGain()
        oscillator.frequency.value = accent ? 1600 : 1050
        setAudioParamValue(clickGain.gain, accent ? 0.22 : 0.14, startAt)
        if (typeof clickGain.gain?.exponentialRampToValueAtTime === 'function') {
            clickGain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.035)
        } else {
            rampAudioParam(clickGain.gain, 0, startAt + 0.035)
        }
        oscillator.connect(clickGain)
        clickGain.connect(this.metronomeBus)
        oscillator.start(startAt)
        oscillator.stop(startAt + 0.04)
        return true
    }

    setVolumes({master, instrument, metronome} = {}) {
        const now = this.currentTime
        if (Number.isFinite(Number(master))) {
            setAudioParamValue(this.masterBus?.gain, clamp(master, 0, 1), now)
        }
        if (Number.isFinite(Number(instrument))) {
            setAudioParamValue(this.instrumentBus?.gain, clamp(instrument, 0, 1), now)
        }
        if (Number.isFinite(Number(metronome))) {
            setAudioParamValue(this.metronomeBus?.gain, clamp(metronome, 0, 1), now)
        }
    }

    /**
     * 页面隐藏时停止活动声部并 suspend，等待下一次真实手势恢复。
     */
    async pause() {
        // suspend 后音频时钟不再前进，因此后台切换必须立即 stop，不能留下等待淡出的声部。
        this.stopAllImmediately()
        if (this.context?.state === 'running' && typeof this.context.suspend === 'function') {
            await this.context.suspend()
        }
        if (this.context && this.context.state !== 'closed') {
            this._updateState('suspended')
        }
    }

    async dispose({close = false} = {}) {
        if (!this.context) {
            return
        }
        if (close && typeof this.context.close === 'function') {
            this.stopAllImmediately()
            await this.context.close()
            this.context = null
            this.masterBus = null
            this.instrumentBus = null
            this.metronomeBus = null
            this.instrumentDefinitions.clear()
            this.instrumentBuffers.clear()
            this.bufferPromises.clear()
            this._updateState('idle')
            return
        }
        await this.pause()
    }
}

let sharedAudioEngine

/**
 * 页面默认共享一个 AudioContext，避免移动浏览器创建过多上下文。
 */
export function getInstrumentAudioEngine(options) {
    if (!sharedAudioEngine) {
        sharedAudioEngine = new InstrumentAudioEngine(options)
    }
    return sharedAudioEngine
}

export async function resetInstrumentAudioEngineForTests() {
    await sharedAudioEngine?.dispose({close: true})
    sharedAudioEngine = undefined
}
