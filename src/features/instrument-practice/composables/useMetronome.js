import {onBeforeUnmount, onMounted, readonly, ref} from 'vue'
import {
    DEFAULT_METRONOME_BPM,
    DEFAULT_METRONOME_METER,
    MetronomeScheduler,
    normalizeBpm,
    normalizeMeter
} from '../audio/metronomeScheduler.js'
import {getInstrumentAudioEngine} from '../audio/instrumentAudioEngine.js'

/**
 * @param {{engine?: import('../audio/instrumentAudioEngine.js').InstrumentAudioEngine}} options
 */
export function useMetronome({engine = getInstrumentAudioEngine()} = {}) {
    const bpm = ref(DEFAULT_METRONOME_BPM)
    const meter = ref(DEFAULT_METRONOME_METER)
    const isRunning = ref(false)
    const currentBeat = ref(0)
    const visualTimers = new Set()

    function scheduleVisualBeat({when, beat}) {
        const delayMs = Math.max(0, (when - engine.currentTime) * 1000)
        const timerId = globalThis.setTimeout?.(() => {
            visualTimers.delete(timerId)
            if (isRunning.value) {
                currentBeat.value = beat
            }
        }, delayMs)
        if (timerId !== undefined) {
            visualTimers.add(timerId)
        }
    }

    const scheduler = new MetronomeScheduler({
        clock: () => engine.currentTime,
        scheduleClick: click => engine.scheduleMetronomeClick(click),
        onBeatScheduled: scheduleVisualBeat
    })

    function clearVisualTimers() {
        visualTimers.forEach(timerId => globalThis.clearTimeout?.(timerId))
        visualTimers.clear()
    }

    async function start() {
        if (isRunning.value) {
            return true
        }
        const unlocked = await engine.unlock()
        if (!unlocked) {
            return false
        }
        scheduler.start({bpm: bpm.value, meter: meter.value})
        isRunning.value = true
        return true
    }

    function stop() {
        scheduler.stop()
        clearVisualTimers()
        isRunning.value = false
        currentBeat.value = 0
    }

    async function toggle() {
        if (isRunning.value) {
            stop()
            return false
        }
        return start()
    }

    function setBpm(nextBpm) {
        bpm.value = normalizeBpm(nextBpm)
        scheduler.configure({bpm: bpm.value, meter: meter.value})
    }

    function setMeter(nextMeter) {
        meter.value = normalizeMeter(nextMeter)
        currentBeat.value = 0
        scheduler.configure({bpm: bpm.value, meter: meter.value})
    }

    function handleVisibilityChange() {
        if (globalThis.document?.hidden) {
            stop()
        }
    }

    onMounted(() => {
        globalThis.document?.addEventListener?.('visibilitychange', handleVisibilityChange)
    })

    onBeforeUnmount(() => {
        globalThis.document?.removeEventListener?.('visibilitychange', handleVisibilityChange)
        stop()
    })

    return {
        bpm: readonly(bpm),
        meter: readonly(meter),
        isRunning: readonly(isRunning),
        currentBeat: readonly(currentBeat),
        setBpm,
        setMeter,
        start,
        stop,
        toggle,
        scheduler
    }
}
