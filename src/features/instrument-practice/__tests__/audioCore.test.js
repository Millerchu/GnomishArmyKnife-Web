import test from 'node:test'
import assert from 'node:assert/strict'
import {InstrumentAudioEngine} from '../audio/instrumentAudioEngine.js'
import {
    calculatePlaybackRate,
    normalizeSampleManifest,
    selectNearestSample
} from '../audio/sampleSelection.js'

class FakeAudioParam {
    constructor(value = 0) {
        this.value = value
        this.events = []
    }

    cancelScheduledValues(time) {
        this.events.push(['cancel', time])
    }

    setValueAtTime(value, time) {
        this.value = value
        this.events.push(['set', value, time])
    }

    linearRampToValueAtTime(value, time) {
        this.value = value
        this.events.push(['linear', value, time])
    }

    exponentialRampToValueAtTime(value, time) {
        this.value = value
        this.events.push(['exponential', value, time])
    }
}

class FakeAudioNode {
    constructor() {
        this.connections = []
    }

    connect(node) {
        this.connections.push(node)
        return node
    }
}

class FakeGainNode extends FakeAudioNode {
    constructor() {
        super()
        this.gain = new FakeAudioParam(1)
    }
}

class FakeBufferSourceNode extends FakeAudioNode {
    constructor() {
        super()
        this.playbackRate = new FakeAudioParam(1)
        this.startedAt = null
        this.stoppedAt = null
        this.buffer = null
        this.onended = null
    }

    start(time) {
        this.startedAt = time
    }

    stop(time) {
        this.stoppedAt = time
    }
}

class FakeOscillatorNode extends FakeAudioNode {
    constructor() {
        super()
        this.frequency = new FakeAudioParam(0)
        this.startedAt = null
        this.stoppedAt = null
    }

    start(time) {
        this.startedAt = time
    }

    stop(time) {
        this.stoppedAt = time
    }
}

class FakeAudioContext {
    constructor() {
        this.state = 'suspended'
        this.currentTime = 2
        this.destination = new FakeAudioNode()
        this.sources = []
        this.oscillators = []
    }

    createGain() {
        return new FakeGainNode()
    }

    createBufferSource() {
        const source = new FakeBufferSourceNode()
        this.sources.push(source)
        return source
    }

    createOscillator() {
        const oscillator = new FakeOscillatorNode()
        this.oscillators.push(oscillator)
        return oscillator
    }

    async decodeAudioData(encodedAudio) {
        return {encodedAudio, duration: 1}
    }

    async resume() {
        this.state = 'running'
    }

    async suspend() {
        this.state = 'suspended'
    }

    async close() {
        this.state = 'closed'
    }
}

const instrumentDefinition = {
    id: 'guitar',
    label: '吉他',
    strings: [],
    tuningPresets: [],
    sampleManifest: {
        samples: [
            {id: 'c4-soft', url: '/c4.wav', rootMidi: 60, velocity: 0.25},
            {id: 'c4-hard', url: '/c4.wav', rootMidi: 60, velocity: 0.9},
            {id: 'g4', url: '/g4.wav', rootMidi: 67, velocity: 0.7}
        ]
    }
}

const pianoDefinition = {
    id: 'piano',
    label: '钢琴',
    strings: [],
    tuningPresets: [],
    sampleManifest: [],
    soundType: 'synth-piano'
}

test('nearest sample prioritizes pitch and then velocity layer', () => {
    const samples = instrumentDefinition.sampleManifest.samples
    assert.equal(selectNearestSample(samples, 61, 0.95).id, 'c4-hard')
    assert.equal(selectNearestSample(samples, 66, 0.2).id, 'g4')
    assert.equal(selectNearestSample([], 60), null)
    assert.equal(calculatePlaybackRate(72, 60), 2)
    assert.ok(Math.abs(calculatePlaybackRate(60, 60, 100) - 2 ** (1 / 12)) < 1e-10)
})

test('sample manifest accepts the instrument definition src and velocity-layer shape', () => {
    assert.deepEqual(normalizeSampleManifest([
        {id: 'legacy', src: '/legacy.ogg', rootMidi: 60, velocityLayer: 'bright'}
    ]), [{
        id: 'legacy',
        src: '/legacy.ogg',
        url: '/legacy.ogg',
        rootMidi: 60,
        velocityLayer: 'bright',
        velocity: 0.95
    }])
    assert.equal(selectNearestSample([
        {id: 'soft', src: '/soft.ogg', rootMidi: 60, velocityLayer: 'soft'},
        {id: 'strong', src: '/strong.ogg', rootMidi: 60, velocityLayer: 'strong'}
    ], 60, 0.9).id, 'strong')
})

test('engine reports unsupported instead of throwing without AudioContext', async () => {
    const engine = new InstrumentAudioEngine({contextFactory: null})
    const states = []
    engine.subscribe(state => states.push(state.status))

    assert.equal(await engine.initialize(), false)
    assert.equal(await engine.unlock(), false)
    assert.equal(engine.playNote({
        instrumentId: 'guitar',
        stringId: 'e2',
        midi: 40
    }), null)
    assert.equal(states.at(-1), 'unsupported')
})

test('engine builds interactive buses, caches samples and unlocks on demand', async () => {
    const context = new FakeAudioContext()
    const factoryOptions = []
    let fetchCount = 0
    const engine = new InstrumentAudioEngine({
        contextFactory: options => {
            factoryOptions.push(options)
            return context
        },
        fetchImpl: async () => {
            fetchCount += 1
            return {
                ok: true,
                arrayBuffer: async () => new ArrayBuffer(8)
            }
        }
    })

    assert.equal(await engine.loadInstrument(instrumentDefinition), true)
    assert.deepEqual(factoryOptions, [{latencyHint: 'interactive'}])
    assert.equal(fetchCount, 2, '相同 URL 只能请求并解码一次')
    assert.equal(engine.state.status, 'prepared')
    assert.equal(await engine.unlock(), true)
    assert.equal(engine.state.status, 'ready')
    assert.equal(engine.masterBus.connections[0], context.destination)
    assert.equal(engine.instrumentBus.connections[0], engine.masterBus)
    assert.equal(engine.metronomeBus.connections[0], engine.masterBus)
})

test('合成钢琴无需下载采样即可加载，并以泛音振荡器演奏和闷音', async () => {
    const context = new FakeAudioContext()
    let fetchCount = 0
    const engine = new InstrumentAudioEngine({
        contextFactory: () => context,
        fetchImpl: async () => {
            fetchCount += 1
            throw new Error('合成钢琴不应请求外部采样')
        }
    })

    assert.equal(await engine.loadInstrument(pianoDefinition), true)
    assert.equal(fetchCount, 0)
    assert.deepEqual(engine.loadedInstrumentIds, ['piano'])
    assert.equal(await engine.unlock(), true)

    const voiceId = engine.playNote({
        instrumentId: 'piano',
        stringId: 'key-60',
        midi: 60,
        velocity: 0.8
    })
    assert.ok(voiceId)
    assert.equal(context.oscillators.length, 4)
    assert.equal(context.oscillators[0].frequency.value, 261.6255653005986)
    assert.equal(context.oscillators[0].startedAt, context.currentTime)

    engine.dampString({instrumentId: 'piano', stringId: 'key-60'})
    assert.equal(engine.voiceCount, 0)
    assert.equal(context.oscillators[0].stoppedAt, context.currentTime + 0.02)
})

test('failed background prefetch does not replace the active instrument status', async () => {
    const context = new FakeAudioContext()
    const engine = new InstrumentAudioEngine({
        contextFactory: () => context,
        fetchImpl: async url => {
            if (url === '/missing.wav') {
                return {ok: false}
            }
            return {
                ok: true,
                arrayBuffer: async () => new ArrayBuffer(8)
            }
        }
    })
    await engine.loadInstrument(instrumentDefinition)
    await engine.unlock()

    await assert.rejects(engine.loadInstrument({
        ...instrumentDefinition,
        id: 'ukulele',
        sampleManifest: [{id: 'missing', src: '/missing.wav', rootMidi: 60}]
    }, {background: true}))
    assert.equal(engine.state.status, 'ready')
})

test('engine limits polyphony and fades an evicted string voice for 20ms', async () => {
    const context = new FakeAudioContext()
    const engine = new InstrumentAudioEngine({
        contextFactory: () => context,
        fetchImpl: async () => ({
            ok: true,
            arrayBuffer: async () => new ArrayBuffer(8)
        }),
        maxVoices: 3,
        maxVoicesPerString: 2,
        fadeSeconds: 0.02
    })
    await engine.loadInstrument(instrumentDefinition)
    await engine.unlock()

    engine.playNote({instrumentId: 'guitar', stringId: 'e2', midi: 60, velocity: 0.4})
    engine.playNote({instrumentId: 'guitar', stringId: 'e2', midi: 60, velocity: 0.7})
    const firstSource = context.sources[0]
    engine.playNote({instrumentId: 'guitar', stringId: 'e2', midi: 60, velocity: 1})

    assert.equal(engine.voiceCount, 2)
    assert.equal(firstSource.stoppedAt, context.currentTime + 0.02)

    engine.playNote({instrumentId: 'guitar', stringId: 'b3', midi: 67})
    engine.playNote({instrumentId: 'guitar', stringId: 'g3', midi: 67})
    assert.equal(engine.voiceCount, 3)
})

test('performance bend and damp target only the matching active string', async () => {
    const context = new FakeAudioContext()
    const engine = new InstrumentAudioEngine({
        contextFactory: () => context,
        fetchImpl: async () => ({
            ok: true,
            arrayBuffer: async () => new ArrayBuffer(8)
        })
    })
    await engine.loadInstrument(instrumentDefinition)
    await engine.unlock()
    engine.playNote({instrumentId: 'guitar', stringId: 'e2', midi: 60})
    engine.playNote({instrumentId: 'guitar', stringId: 'a2', midi: 60})

    engine.playPerformanceEvent({
        type: 'bend',
        instrumentId: 'guitar',
        stringId: 'e2',
        bendCents: 100
    })
    assert.ok(context.sources[0].playbackRate.value > 1)
    assert.equal(context.sources[1].playbackRate.value, 1)

    engine.playPerformanceEvent({
        type: 'damp',
        instrumentId: 'guitar',
        stringId: 'e2'
    })
    assert.equal(engine.voiceCount, 1)
    assert.equal(context.sources[0].stoppedAt, context.currentTime + 0.02)
})

test('global damp stops every string and damped notes receive a short envelope', async () => {
    const context = new FakeAudioContext()
    const engine = new InstrumentAudioEngine({
        contextFactory: () => context,
        fetchImpl: async () => ({
            ok: true,
            arrayBuffer: async () => new ArrayBuffer(8)
        })
    })
    await engine.loadInstrument(instrumentDefinition)
    await engine.unlock()
    engine.playNote({instrumentId: 'guitar', stringId: 'e2', midi: 60})
    engine.playNote({instrumentId: 'guitar', stringId: 'a2', midi: 60})
    engine.playPerformanceEvent({
        type: 'damp',
        instrumentId: 'guitar',
        stringId: null
    })
    assert.equal(engine.voiceCount, 0)

    engine.playNote({
        instrumentId: 'guitar',
        stringId: 'e2',
        midi: 60,
        damped: true
    })
    assert.ok(Math.abs(context.sources.at(-1).stoppedAt - (context.currentTime + 0.11)) < 1e-10)
})

test('metronome click uses its own oscillator path', async () => {
    const context = new FakeAudioContext()
    const engine = new InstrumentAudioEngine({contextFactory: () => context})
    await engine.unlock()

    assert.equal(engine.scheduleMetronomeClick({when: 2.1, accent: true}), true)
    assert.equal(context.oscillators.length, 1)
    assert.equal(context.oscillators[0].frequency.value, 1600)
    assert.equal(context.oscillators[0].startedAt, 2.1)
})

test('pause immediately clears voices before suspending the audio clock', async () => {
    const context = new FakeAudioContext()
    const engine = new InstrumentAudioEngine({
        contextFactory: () => context,
        fetchImpl: async () => ({
            ok: true,
            arrayBuffer: async () => new ArrayBuffer(8)
        })
    })
    await engine.loadInstrument(instrumentDefinition)
    await engine.unlock()
    engine.playNote({instrumentId: 'guitar', stringId: 'e2', midi: 60})

    await engine.pause()
    assert.equal(context.sources[0].stoppedAt, context.currentTime)
    assert.equal(engine.voiceCount, 0)
    assert.equal(context.state, 'suspended')
})

test('dispose closes the audio context and clears decoded instrument state', async () => {
    const context = new FakeAudioContext()
    const engine = new InstrumentAudioEngine({
        contextFactory: () => context,
        fetchImpl: async () => ({
            ok: true,
            arrayBuffer: async () => new ArrayBuffer(8)
        })
    })
    await engine.loadInstrument(instrumentDefinition)
    await engine.unlock()

    await engine.dispose({close: true})
    assert.equal(context.state, 'closed')
    assert.equal(engine.context, null)
    assert.deepEqual(engine.loadedInstrumentIds, [])
})
