import {clamp} from './sampleSelection.js'

export const METRONOME_MIN_BPM = 40
export const METRONOME_MAX_BPM = 220
export const METRONOME_METERS = Object.freeze(['2/4', '3/4', '4/4', '6/8'])
export const DEFAULT_METRONOME_BPM = 80
export const DEFAULT_METRONOME_METER = '4/4'

/**
 * @param {number} bpm
 * @returns {number}
 */
export function normalizeBpm(bpm) {
    return Math.round(clamp(bpm, METRONOME_MIN_BPM, METRONOME_MAX_BPM))
}
/**
 * @param {string} meter
 * @returns {string}
 */
export function normalizeMeter(meter) {
    return METRONOME_METERS.includes(meter) ? meter : DEFAULT_METRONOME_METER
}

/**
 * @param {string} meter
 * @returns {{beats: number, denominator: number}}
 */
export function parseMeter(meter) {
    const normalizedMeter = normalizeMeter(meter)
    const [beats, denominator] = normalizedMeter.split('/').map(Number)
    return {beats, denominator}
}

/**
 * 以拍号分母为拍单位，6/8 的一次脉冲对应八分音符。
 *
 * @param {number} bpm
 * @param {string} meter
 * @returns {number}
 */
export function calculateSecondsPerBeat(bpm, meter) {
    const {denominator} = parseMeter(meter)
    return (60 / normalizeBpm(bpm)) * (4 / denominator)
}

/**
 * 基于 AudioContext 时钟的前瞻调度器，避免用 setInterval 直接决定发声时刻。
 */
export class MetronomeScheduler {
    constructor({
        clock,
        scheduleClick,
        onBeatScheduled = () => {},
        setIntervalFn = globalThis.setInterval?.bind(globalThis),
        clearIntervalFn = globalThis.clearInterval?.bind(globalThis),
        lookAheadMs = 25,
        scheduleAheadSeconds = 0.1
    } = {}) {
        this.clock = typeof clock === 'function' ? clock : () => 0
        this.scheduleClick = typeof scheduleClick === 'function' ? scheduleClick : () => false
        this.onBeatScheduled = onBeatScheduled
        this.setIntervalFn = setIntervalFn
        this.clearIntervalFn = clearIntervalFn
        this.lookAheadMs = lookAheadMs
        this.scheduleAheadSeconds = scheduleAheadSeconds
        this.bpm = DEFAULT_METRONOME_BPM
        this.meter = DEFAULT_METRONOME_METER
        this.nextBeatTime = 0
        this.beatIndex = 0
        this.intervalId = null
        this.running = false
    }

    configure({bpm = this.bpm, meter = this.meter} = {}) {
        this.bpm = normalizeBpm(bpm)
        this.meter = normalizeMeter(meter)
        return {bpm: this.bpm, meter: this.meter}
    }

    start({bpm = this.bpm, meter = this.meter, startDelaySeconds = 0.03} = {}) {
        if (this.running) {
            return false
        }
        this.configure({bpm, meter})
        this.running = true
        this.beatIndex = 0
        this.nextBeatTime = this.clock() + Math.max(0, Number(startDelaySeconds) || 0)
        this.tick()
        if (typeof this.setIntervalFn === 'function') {
            this.intervalId = this.setIntervalFn(() => this.tick(), this.lookAheadMs)
        }
        return true
    }

    /**
     * 暴露 tick 便于使用假时钟验证窗口边界和漂移行为。
     */
    tick() {
        if (!this.running) {
            return
        }
        const scheduleUntil = this.clock() + this.scheduleAheadSeconds
        const {beats} = parseMeter(this.meter)
        const beatDuration = calculateSecondsPerBeat(this.bpm, this.meter)

        while (this.nextBeatTime <= scheduleUntil) {
            const beat = this.beatIndex + 1
            const accent = this.beatIndex === 0
            this.scheduleClick({
                when: this.nextBeatTime,
                beat,
                accent,
                meter: this.meter,
                bpm: this.bpm
            })
            this.onBeatScheduled({
                when: this.nextBeatTime,
                beat,
                accent
            })
            this.nextBeatTime += beatDuration
            this.beatIndex = (this.beatIndex + 1) % beats
        }
    }

    stop() {
        if (this.intervalId !== null && typeof this.clearIntervalFn === 'function') {
            this.clearIntervalFn(this.intervalId)
        }
        this.intervalId = null
        this.running = false
        this.beatIndex = 0
    }
}
