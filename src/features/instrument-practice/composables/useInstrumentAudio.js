import {computed, onBeforeUnmount, onMounted, readonly, ref} from 'vue'
import {getInstrumentAudioEngine} from '../audio/instrumentAudioEngine.js'

function scheduleIdleTask(callback) {
    if (typeof globalThis.requestIdleCallback === 'function') {
        const id = globalThis.requestIdleCallback(callback, {timeout: 1500})
        return () => globalThis.cancelIdleCallback?.(id)
    }
    const id = globalThis.setTimeout?.(callback, 250)
    return () => globalThis.clearTimeout?.(id)
}

/**
 * 管理采样加载、首次手势解锁和页面可见性生命周期。
 *
 * @param {{engine?: import('../audio/instrumentAudioEngine.js').InstrumentAudioEngine}} options
 */
export function useInstrumentAudio({engine = getInstrumentAudioEngine()} = {}) {
    const status = ref('idle')
    const error = ref('')
    const loadedInstrumentIds = ref(engine.loadedInstrumentIds)
    let lastDefinition = null
    let cancelPrefetch = null

    const unsubscribe = engine.subscribe(nextState => {
        status.value = nextState.status
        error.value = nextState.error
        loadedInstrumentIds.value = engine.loadedInstrumentIds
    })

    async function prepareInstrument(definition) {
        lastDefinition = definition
        try {
            const loaded = await engine.loadInstrument(definition)
            loadedInstrumentIds.value = engine.loadedInstrumentIds
            return loaded
        } catch {
            return false
        }
    }

    /**
     * 必须在 pointerdown 或 keydown 的同步调用链中触发。
     */
    async function unlock() {
        return engine.unlock()
    }

    async function retry() {
        const unlocked = await unlock()
        if (!lastDefinition) {
            return unlocked
        }
        const loaded = await prepareInstrument(lastDefinition)
        return unlocked && loaded
    }

    /**
     * 当前乐器加载完成后，页面可传入其余定义做空闲预取。
     */
    function prefetchInstruments(definitions) {
        cancelPrefetch?.()
        const pendingDefinitions = (Array.isArray(definitions) ? definitions : [])
            .filter(definition => !engine.loadedInstrumentIds.includes(definition.id))
        cancelPrefetch = scheduleIdleTask(async () => {
            for (const definition of pendingDefinitions) {
                try {
                    await engine.loadInstrument(definition, {background: true})
                } catch {
                    // 预取失败不打断当前乐器，切换时 prepareInstrument 会提供明确重试状态。
                }
            }
            loadedInstrumentIds.value = engine.loadedInstrumentIds
        })
    }

    function playPerformanceEvent(event, when) {
        if (engine.isRunning) {
            return engine.playPerformanceEvent(event, when)
        }
        return engine.unlock().then(unlocked =>
            unlocked ? engine.playPerformanceEvent(event, when) : null
        )
    }

    function playNote(note) {
        if (engine.isRunning) {
            return engine.playNote(note)
        }
        return engine.unlock().then(unlocked =>
            unlocked ? engine.playNote(note) : null
        )
    }

    function bendString(change) {
        engine.bendString(change)
    }

    function dampString(change) {
        engine.dampString(change)
    }

    async function handleVisibilityChange() {
        if (globalThis.document?.hidden) {
            await engine.pause()
        }
    }

    onMounted(() => {
        globalThis.document?.addEventListener?.('visibilitychange', handleVisibilityChange)
    })

    onBeforeUnmount(() => {
        cancelPrefetch?.()
        globalThis.document?.removeEventListener?.('visibilitychange', handleVisibilityChange)
        unsubscribe()
        // 页面退出后关闭上下文并清理采样缓存，避免移动端重复进入时遗留音频资源。
        void engine.dispose({close: true})
    })

    return {
        status: readonly(status),
        error: readonly(error),
        loadedInstrumentIds: readonly(loadedInstrumentIds),
        isReady: computed(() => status.value === 'ready'),
        isSupported: computed(() => status.value !== 'unsupported'),
        currentTime: () => engine.currentTime,
        prepareInstrument,
        prefetchInstruments,
        unlock,
        retry,
        playNote,
        playPerformanceEvent,
        bendString,
        dampString,
        stopAll: when => engine.stopAll(when),
        setVolumes: volumes => engine.setVolumes(volumes),
        pause: () => engine.pause(),
        engine
    }
}
