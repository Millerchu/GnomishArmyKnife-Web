import {PERFORMANCE_EVENT_TYPES} from '../types.js'
import {normalizeBpm, normalizeMeter} from './metronomeScheduler.js'
import {clamp} from './sampleSelection.js'

export const MAX_TAKE_DURATION_MS = 10 * 60 * 1000
export const MAX_SESSION_TAKES = 5
const PLAYBACK_LOOK_AHEAD_MS = 25
const PLAYBACK_SCHEDULE_AHEAD_SECONDS = 0.1

let fallbackTakeSequence = 0

function createTakeId() {
    if (typeof globalThis.crypto?.randomUUID === 'function') {
        return globalThis.crypto.randomUUID()
    }
    fallbackTakeSequence += 1
    return `take-${Date.now()}-${fallbackTakeSequence}`
}

/**
 * @param {import('../types.js').PerformanceEvent[]} events
 * @returns {import('../types.js').PerformanceEvent[]}
 */
export function sortPerformanceEvents(events) {
    if (!Array.isArray(events)) {
        return []
    }
    return [...events].sort((left, right) => Number(left.at) - Number(right.at))
}

/**
 * 保留最近的 take，页面刷新后不做持久化。
 *
 * @param {import('../types.js').SessionTake[]} takes
 * @param {number} [limit=5]
 * @returns {import('../types.js').SessionTake[]}
 */
export function limitSessionTakes(takes, limit = MAX_SESSION_TAKES) {
    const normalizedLimit = Math.max(1, Number(limit) || MAX_SESSION_TAKES)
    return Array.isArray(takes) ? takes.slice(-normalizedLimit) : []
}

/**
 * 只接受演奏输出需要的字段，避免把 PointerEvent 或组件状态写入录制结果。
 *
 * @param {Partial<import('../types.js').PerformanceEvent>} event
 * @param {number} at
 * @returns {import('../types.js').PerformanceEvent | null}
 */
export function normalizePerformanceEvent(event, at) {
    const validTypes = Object.values(PERFORMANCE_EVENT_TYPES)
    if (
        !event
        || !validTypes.includes(event.type)
        || !event.instrumentId
        || (event.type !== PERFORMANCE_EVENT_TYPES.DAMP && !event.stringId)
    ) {
        return null
    }

    const normalizedEvent = {
        at: clamp(at, 0, MAX_TAKE_DURATION_MS),
        type: event.type,
        instrumentId: event.instrumentId,
        stringId: event.stringId ? String(event.stringId) : null
    }
    if (Number.isFinite(Number(event.midi))) {
        normalizedEvent.midi = Number(event.midi)
    }
    if (Number.isFinite(Number(event.velocity))) {
        normalizedEvent.velocity = clamp(event.velocity, 0, 1)
    }
    if (Number.isFinite(Number(event.bendCents))) {
        normalizedEvent.bendCents = Number(event.bendCents)
    }
    if (typeof event.damped === 'boolean') {
        normalizedEvent.damped = event.damped
    }
    return normalizedEvent
}

/**
 * 页面会话内事件录制器。clock 单位为秒，与 AudioContext.currentTime 保持一致。
 */
export class SessionRecorder {
    constructor({
        clock = () => 0,
        idFactory = createTakeId,
        nowFactory = () => Date.now(),
        maxDurationMs = MAX_TAKE_DURATION_MS,
        maxTakes = MAX_SESSION_TAKES
    } = {}) {
        this.clock = clock
        this.idFactory = idFactory
        this.nowFactory = nowFactory
        this.maxDurationMs = maxDurationMs
        this.maxTakes = maxTakes
        this.activeSession = null
        this.takes = []
    }

    get isRecording() {
        return Boolean(this.activeSession)
    }

    start({instrumentId, tuningId, bpm, meter}) {
        if (this.activeSession) {
            throw new Error('已有正在录制的片段，请先停止录制')
        }
        if (!instrumentId || !tuningId) {
            throw new Error('录制前必须指定乐器和调弦')
        }
        this.activeSession = {
            instrumentId,
            tuningId,
            bpm: normalizeBpm(bpm),
            meter: normalizeMeter(meter),
            startedAtSeconds: this.clock(),
            createdAt: this.nowFactory(),
            events: []
        }
    }

    /**
     * @returns {{accepted: boolean, take: import('../types.js').SessionTake | null}}
     */
    capture(event) {
        if (!this.activeSession) {
            return {accepted: false, take: null}
        }

        const elapsedMs = Math.max(0, (this.clock() - this.activeSession.startedAtSeconds) * 1000)
        if (elapsedMs >= this.maxDurationMs) {
            return {
                accepted: false,
                take: this.stop({durationMs: this.maxDurationMs})
            }
        }

        const normalizedEvent = normalizePerformanceEvent(event, elapsedMs)
        if (!normalizedEvent) {
            return {accepted: false, take: null}
        }
        this.activeSession.events.push(normalizedEvent)
        return {accepted: true, take: null}
    }

    /**
     * @param {{durationMs?: number}} options
     * @returns {import('../types.js').SessionTake | null}
     */
    stop({durationMs} = {}) {
        if (!this.activeSession) {
            return null
        }
        const session = this.activeSession
        const measuredDuration = (this.clock() - session.startedAtSeconds) * 1000
        const finalDuration = clamp(
            Number.isFinite(Number(durationMs)) ? durationMs : measuredDuration,
            0,
            this.maxDurationMs
        )
        const events = sortPerformanceEvents(session.events)
            .filter(event => event.at <= finalDuration)
        const take = {
            id: this.idFactory(),
            instrumentId: session.instrumentId,
            tuningId: session.tuningId,
            bpm: session.bpm,
            meter: session.meter,
            durationMs: finalDuration,
            events,
            createdAt: session.createdAt
        }

        this.activeSession = null
        this.takes = limitSessionTakes([...this.takes, take], this.maxTakes)
        return take
    }

    deleteTake(takeId) {
        const previousLength = this.takes.length
        this.takes = this.takes.filter(take => take.id !== takeId)
        return this.takes.length !== previousLength
    }

    clear() {
        this.activeSession = null
        this.takes = []
    }
}

/**
 * 录制回放也使用 AudioContext 时钟前瞻调度，setInterval 仅负责补充调度窗口。
 */
export class PerformancePlaybackScheduler {
    constructor({
        clock = () => 0,
        dispatchEvent = () => {},
        onComplete = () => {},
        setIntervalFn = globalThis.setInterval?.bind(globalThis),
        clearIntervalFn = globalThis.clearInterval?.bind(globalThis),
        lookAheadMs = PLAYBACK_LOOK_AHEAD_MS,
        scheduleAheadSeconds = PLAYBACK_SCHEDULE_AHEAD_SECONDS
    } = {}) {
        this.clock = clock
        this.dispatchEvent = dispatchEvent
        this.onComplete = onComplete
        this.setIntervalFn = setIntervalFn
        this.clearIntervalFn = clearIntervalFn
        this.lookAheadMs = lookAheadMs
        this.scheduleAheadSeconds = scheduleAheadSeconds
        this.intervalId = null
        this.activePlayback = null
    }

    get isPlaying() {
        return Boolean(this.activePlayback)
    }

    play(take, {startDelaySeconds = 0.03} = {}) {
        if (!take) {
            return false
        }
        this.stop()
        const events = sortPerformanceEvents(take.events)
            .filter(event => event.at >= 0 && event.at <= take.durationMs)
        this.activePlayback = {
            take,
            events,
            eventIndex: 0,
            startedAtSeconds: this.clock() + Math.max(0, Number(startDelaySeconds) || 0)
        }
        this.tick()
        if (typeof this.setIntervalFn === 'function') {
            this.intervalId = this.setIntervalFn(() => this.tick(), this.lookAheadMs)
        }
        return true
    }

    tick() {
        const playback = this.activePlayback
        if (!playback) {
            return
        }
        const scheduleUntil = this.clock() + this.scheduleAheadSeconds

        while (playback.eventIndex < playback.events.length) {
            const event = playback.events[playback.eventIndex]
            const eventTime = playback.startedAtSeconds + event.at / 1000
            if (eventTime > scheduleUntil) {
                break
            }
            this.dispatchEvent(event, eventTime)
            playback.eventIndex += 1
        }

        const completesAt = playback.startedAtSeconds + playback.take.durationMs / 1000
        if (playback.eventIndex >= playback.events.length && this.clock() >= completesAt) {
            const completedTake = playback.take
            this.stop()
            this.onComplete(completedTake)
        }
    }

    stop() {
        if (this.intervalId !== null && typeof this.clearIntervalFn === 'function') {
            this.clearIntervalFn(this.intervalId)
        }
        this.intervalId = null
        this.activePlayback = null
    }
}
