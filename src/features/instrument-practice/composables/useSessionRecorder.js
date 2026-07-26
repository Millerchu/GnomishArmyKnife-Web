import {onBeforeUnmount, onMounted, readonly, ref} from 'vue'
import {getInstrumentAudioEngine} from '../audio/instrumentAudioEngine.js'
import {
    MAX_INSTRUMENT_TAKE_CACHE,
    MAX_TAKE_DURATION_MS,
    PerformancePlaybackScheduler,
    SessionRecorder
} from '../audio/sessionRecorder.js'

function createFallbackClock() {
    return () => {
        if (typeof globalThis.performance?.now === 'function') {
            return globalThis.performance.now() / 1000
        }
        return Date.now() / 1000
    }
}

/**
 * @param {{
 *   engine?: import('../audio/instrumentAudioEngine.js').InstrumentAudioEngine,
 *   clock?: () => number,
 *   dispatchEvent?: (event: import('../types.js').PerformanceEvent, when: number) => void
 * }} options
 */
export function useSessionRecorder({
    engine = getInstrumentAudioEngine(),
    clock,
    dispatchEvent,
    maxTakes = MAX_INSTRUMENT_TAKE_CACHE
} = {}) {
    const PLAYBACK_VISUAL_DURATION_MS = 180
    const fallbackClock = createFallbackClock()
    const timelineClock = clock || (() => engine.context ? engine.currentTime : fallbackClock())
    const takes = ref([])
    const isRecording = ref(false)
    const activePlaybackId = ref(null)
    const activePlaybackKind = ref(null)
    const activePlaybackEvents = ref([])
    const isPlaybackPaused = ref(false)
    const playbackProgressMs = ref(0)
    const activePlaybackDurationMs = ref(0)
    const playbackVisualTimerIds = new Set()
    let playbackVisualSequence = 0
    let durationTimerId = null
    let progressTimerId = null
    let currentPlaybackTake = null
    let pausedOffsetMs = 0

    const recorder = new SessionRecorder({clock: timelineClock, maxTakes})
    const playback = new PerformancePlaybackScheduler({
        clock: timelineClock,
        dispatchEvent: (event, when) => {
            const eventDispatcher = dispatchEvent
                || ((performanceEvent, scheduledAt) => engine.playPerformanceEvent(performanceEvent, scheduledAt))
            eventDispatcher(event, when)
            schedulePlaybackVisual(event, when)
        },
        onComplete: () => {
            resetPlaybackState()
        }
    })

    function clearPlaybackVisuals() {
        for (const timerId of playbackVisualTimerIds) {
            globalThis.clearTimeout?.(timerId)
        }
        playbackVisualTimerIds.clear()
        activePlaybackEvents.value = []
    }

    function schedulePlaybackVisual(event, when) {
        const delayMs = Math.max(0, (Number(when) - timelineClock()) * 1000)
        const scheduleTimerId = globalThis.setTimeout?.(() => {
            playbackVisualTimerIds.delete(scheduleTimerId)
            const visualEvent = {
                ...event,
                playbackVisualId: ++playbackVisualSequence
            }
            activePlaybackEvents.value = [...activePlaybackEvents.value, visualEvent]
            const visualDurationMs = Math.min(
                1200,
                Math.max(PLAYBACK_VISUAL_DURATION_MS, Number(event.durationSeconds) * 1000 || 0)
            )
            const removeTimerId = globalThis.setTimeout?.(() => {
                playbackVisualTimerIds.delete(removeTimerId)
                activePlaybackEvents.value = activePlaybackEvents.value
                    .filter(candidate => candidate.playbackVisualId !== visualEvent.playbackVisualId)
            }, visualDurationMs)
            if (removeTimerId !== undefined) {
                playbackVisualTimerIds.add(removeTimerId)
            }
        }, delayMs)
        if (scheduleTimerId !== undefined) {
            playbackVisualTimerIds.add(scheduleTimerId)
        }
    }

    function syncTakes() {
        takes.value = [...recorder.takes]
    }

    function clearDurationTimer() {
        if (durationTimerId !== null) {
            globalThis.clearTimeout?.(durationTimerId)
        }
        durationTimerId = null
    }

    function clearProgressTimer() {
        if (progressTimerId !== null) {
            globalThis.clearInterval?.(progressTimerId)
        }
        progressTimerId = null
    }

    function updatePlaybackProgress() {
        if (playback.isPlaying) {
            playbackProgressMs.value = playback.getPositionMs()
        }
    }

    function startProgressTimer() {
        clearProgressTimer()
        updatePlaybackProgress()
        progressTimerId = globalThis.setInterval?.(updatePlaybackProgress, 80)
    }

    function resetPlaybackState() {
        clearProgressTimer()
        clearPlaybackVisuals()
        activePlaybackId.value = null
        activePlaybackKind.value = null
        isPlaybackPaused.value = false
        playbackProgressMs.value = 0
        activePlaybackDurationMs.value = 0
        currentPlaybackTake = null
        pausedOffsetMs = 0
    }

    function playTake(take, kind, offsetMs = 0) {
        playback.stop()
        engine.stopAll()
        clearPlaybackVisuals()
        currentPlaybackTake = take
        pausedOffsetMs = offsetMs
        activePlaybackId.value = take.id
        activePlaybackKind.value = kind
        isPlaybackPaused.value = false
        playbackProgressMs.value = offsetMs
        activePlaybackDurationMs.value = Number(take.durationMs) || 0
        const started = playback.play(take, {offsetMs})
        if (started) {
            startProgressTimer()
        } else {
            resetPlaybackState()
        }
        return started
    }

    function startRecording(metadata) {
        if (isRecording.value) {
            return false
        }
        stopPlayback()
        recorder.start(metadata)
        isRecording.value = true
        durationTimerId = globalThis.setTimeout?.(() => {
            stopRecording({durationMs: MAX_TAKE_DURATION_MS})
        }, MAX_TAKE_DURATION_MS)
        return true
    }

    function capture(event) {
        const result = recorder.capture(event)
        if (result.take) {
            clearDurationTimer()
            isRecording.value = false
            syncTakes()
        }
        return result.accepted
    }

    function stopRecording(options) {
        clearDurationTimer()
        const take = recorder.stop(options)
        isRecording.value = false
        if (take) {
            syncTakes()
        }
        return take
    }

    function replayTake(takeId) {
        if (isRecording.value) {
            stopRecording()
        }
        const take = recorder.takes.find(candidate => candidate.id === takeId)
        if (!take) {
            return false
        }
        return playTake(take, 'take')
    }

    function playPerformanceSequence(sequence) {
        if (isRecording.value) {
            stopRecording()
        }
        if (!sequence?.id || !Array.isArray(sequence.events)) {
            return false
        }
        return playTake(sequence, 'score')
    }

    function pausePlayback() {
        if (!playback.isPlaying || !currentPlaybackTake) {
            return false
        }
        pausedOffsetMs = playback.getPositionMs()
        playbackProgressMs.value = pausedOffsetMs
        playback.stop()
        engine.stopAll()
        clearProgressTimer()
        clearPlaybackVisuals()
        isPlaybackPaused.value = true
        return true
    }

    function resumePlayback() {
        if (!isPlaybackPaused.value || !currentPlaybackTake) {
            return false
        }
        isPlaybackPaused.value = false
        const resumed = playback.play(currentPlaybackTake, {offsetMs: pausedOffsetMs})
        if (resumed) {
            startProgressTimer()
        }
        return resumed
    }

    function stopPlayback() {
        playback.stop()
        engine.stopAll()
        resetPlaybackState()
    }

    function deleteTake(takeId) {
        if (activePlaybackId.value === takeId) {
            stopPlayback()
        }
        const deleted = recorder.deleteTake(takeId)
        syncTakes()
        return deleted
    }

    function replaceTakes(nextTakes) {
        recorder.replaceTakes(nextTakes)
        syncTakes()
    }

    function clearTakes() {
        clearDurationTimer()
        stopPlayback()
        recorder.clear()
        isRecording.value = false
        syncTakes()
    }

    function handleVisibilityChange() {
        if (!globalThis.document?.hidden) {
            return
        }
        if (isRecording.value) {
            stopRecording()
        }
        stopPlayback()
    }

    onMounted(() => {
        globalThis.document?.addEventListener?.('visibilitychange', handleVisibilityChange)
    })

    onBeforeUnmount(() => {
        globalThis.document?.removeEventListener?.('visibilitychange', handleVisibilityChange)
        clearTakes()
    })

    return {
        takes: readonly(takes),
        isRecording: readonly(isRecording),
        activePlaybackId: readonly(activePlaybackId),
        activePlaybackKind: readonly(activePlaybackKind),
        activePlaybackEvents: readonly(activePlaybackEvents),
        isPlaybackPaused: readonly(isPlaybackPaused),
        playbackProgressMs: readonly(playbackProgressMs),
        activePlaybackDurationMs: readonly(activePlaybackDurationMs),
        startRecording,
        capture,
        stopRecording,
        replayTake,
        playPerformanceSequence,
        pausePlayback,
        resumePlayback,
        stopPlayback,
        deleteTake,
        replaceTakes,
        clearTakes,
        recorder,
        playback
    }
}
