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
    const fallbackClock = createFallbackClock()
    const timelineClock = clock || (() => engine.context ? engine.currentTime : fallbackClock())
    const takes = ref([])
    const isRecording = ref(false)
    const activePlaybackId = ref(null)
    let durationTimerId = null

    const recorder = new SessionRecorder({clock: timelineClock, maxTakes})
    const playback = new PerformancePlaybackScheduler({
        clock: timelineClock,
        dispatchEvent: dispatchEvent || ((event, when) => engine.playPerformanceEvent(event, when)),
        onComplete: () => {
            activePlaybackId.value = null
        }
    })

    function syncTakes() {
        takes.value = [...recorder.takes]
    }

    function clearDurationTimer() {
        if (durationTimerId !== null) {
            globalThis.clearTimeout?.(durationTimerId)
        }
        durationTimerId = null
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
        engine.stopAll()
        activePlaybackId.value = takeId
        return playback.play(take)
    }

    function stopPlayback() {
        playback.stop()
        engine.stopAll()
        activePlaybackId.value = null
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
        startRecording,
        capture,
        stopRecording,
        replayTake,
        stopPlayback,
        deleteTake,
        replaceTakes,
        clearTakes,
        recorder,
        playback
    }
}
