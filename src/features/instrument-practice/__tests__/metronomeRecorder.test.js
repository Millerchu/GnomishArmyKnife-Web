import test from 'node:test'
import assert from 'node:assert/strict'
import {
    calculateSecondsPerBeat,
    MetronomeScheduler,
    normalizeBpm,
    normalizeMeter
} from '../audio/metronomeScheduler.js'
import {
    MAX_TAKE_DURATION_MS,
    PerformancePlaybackScheduler,
    SessionRecorder,
    limitSessionTakes,
    normalizePerformanceEvent
} from '../audio/sessionRecorder.js'

test('metronome settings enforce supported BPM and meter', () => {
    assert.equal(normalizeBpm(20), 40)
    assert.equal(normalizeBpm(300), 220)
    assert.equal(normalizeBpm(89.6), 90)
    assert.equal(normalizeMeter('6/8'), '6/8')
    assert.equal(normalizeMeter('5/4'), '4/4')
    assert.equal(calculateSecondsPerBeat(120, '4/4'), 0.5)
    assert.equal(calculateSecondsPerBeat(80, '6/8'), 0.375)
})

test('metronome schedules 100ms ahead and accents the first beat', () => {
    let currentTime = 10
    const scheduledClicks = []
    const scheduler = new MetronomeScheduler({
        clock: () => currentTime,
        scheduleClick: click => scheduledClicks.push(click),
        setIntervalFn: null,
        clearIntervalFn: null,
        scheduleAheadSeconds: 0.1
    })

    scheduler.start({bpm: 120, meter: '2/4', startDelaySeconds: 0})
    assert.deepEqual(
        scheduledClicks.map(click => [click.when, click.beat, click.accent]),
        [[10, 1, true]]
    )

    currentTime = 10.45
    scheduler.tick()
    currentTime = 10.95
    scheduler.tick()
    assert.deepEqual(
        scheduledClicks.map(click => [click.beat, click.accent]),
        [[1, true], [2, false], [1, true]]
    )
})

test('recorder normalizes events, caps duration and retains five recent takes', () => {
    let currentTime = 4
    let idSequence = 0
    const recorder = new SessionRecorder({
        clock: () => currentTime,
        idFactory: () => `take-${++idSequence}`,
        nowFactory: () => 1234
    })

    recorder.start({
        instrumentId: 'guzheng',
        tuningId: 'd-pentatonic',
        bpm: 80,
        meter: '4/4'
    })
    currentTime = 4.12
    assert.equal(recorder.capture({
        type: 'note',
        instrumentId: 'guzheng',
        stringId: 'string-1',
        midi: 38,
        velocity: 1.4,
        damped: true,
        ignoredPointerState: true
    }).accepted, true)
    currentTime = 4.5
    const firstTake = recorder.stop()

    assert.ok(Math.abs(firstTake.events[0].at - 120) < 1e-8)
    assert.equal(firstTake.events[0].velocity, 1)
    assert.equal(firstTake.events[0].damped, true)
    assert.equal('ignoredPointerState' in firstTake.events[0], false)
    assert.equal(firstTake.durationMs, 500)
    assert.equal(firstTake.createdAt, 1234)

    for (let index = 0; index < 5; index += 1) {
        recorder.start({
            instrumentId: 'guitar',
            tuningId: 'standard',
            bpm: 80,
            meter: '4/4'
        })
        recorder.stop({durationMs: 10})
    }
    assert.equal(recorder.takes.length, 5)
    assert.equal(recorder.takes[0].id, 'take-2')
    assert.equal(recorder.takes.at(-1).id, 'take-6')
})

test('recorder automatically commits at ten minutes', () => {
    let currentTime = 0
    const recorder = new SessionRecorder({
        clock: () => currentTime,
        idFactory: () => 'limited-take'
    })
    recorder.start({
        instrumentId: 'ukulele',
        tuningId: 'high-g',
        bpm: 100,
        meter: '3/4'
    })
    currentTime = 601
    const result = recorder.capture({
        type: 'note',
        instrumentId: 'ukulele',
        stringId: 'a4',
        midi: 69
    })

    assert.equal(result.accepted, false)
    assert.equal(result.take.durationMs, MAX_TAKE_DURATION_MS)
    assert.equal(recorder.isRecording, false)
})

test('playback dispatches events against the audio clock in look-ahead windows', () => {
    let currentTime = 10
    const dispatched = []
    const completed = []
    const playback = new PerformancePlaybackScheduler({
        clock: () => currentTime,
        dispatchEvent: (event, when) => dispatched.push([event.stringId, when]),
        onComplete: take => completed.push(take.id),
        setIntervalFn: null,
        clearIntervalFn: null,
        scheduleAheadSeconds: 0.1
    })
    const take = {
        id: 'take-a',
        durationMs: 300,
        events: [
            {at: 250, type: 'damp', instrumentId: 'guitar', stringId: 'e2'},
            {at: 0, type: 'note', instrumentId: 'guitar', stringId: 'e2', midi: 40},
            {at: 80, type: 'bend', instrumentId: 'guitar', stringId: 'e2', bendCents: 20}
        ]
    }

    playback.play(take, {startDelaySeconds: 0})
    assert.deepEqual(dispatched, [['e2', 10], ['e2', 10.08]])

    currentTime = 10.2
    playback.tick()
    assert.deepEqual(dispatched[2], ['e2', 10.25])
    currentTime = 10.31
    playback.tick()
    assert.deepEqual(completed, ['take-a'])
    assert.equal(playback.isPlaying, false)
})

test('playback resumes from an audio-clock offset without replaying earlier notes', () => {
    let currentTime = 20
    const dispatched = []
    const playback = new PerformancePlaybackScheduler({
        clock: () => currentTime,
        dispatchEvent: (event, when) => dispatched.push([event.at, when]),
        setIntervalFn: null,
        clearIntervalFn: null,
        scheduleAheadSeconds: 0.1
    })
    const sequence = {
        id: 'score-a',
        durationMs: 1000,
        events: [
            {at: 0, type: 'note', instrumentId: 'piano', stringId: 'key-60', midi: 60},
            {at: 400, type: 'note', instrumentId: 'piano', stringId: 'key-62', midi: 62},
            {at: 800, type: 'note', instrumentId: 'piano', stringId: 'key-64', midi: 64}
        ]
    }

    playback.play(sequence, {startDelaySeconds: 0, offsetMs: 350})
    assert.equal(dispatched[0][0], 400)
    assert.ok(Math.abs(dispatched[0][1] - 20.05) < 0.000001)
    assert.ok(Math.abs(playback.getPositionMs() - 350) < 0.000001)

    currentTime = 20.4
    playback.tick()
    assert.equal(dispatched[1][0], 800)
    assert.ok(Math.abs(dispatched[1][1] - 20.45) < 0.000001)
    assert.ok(Math.abs(playback.getPositionMs() - 750) < 0.000001)
})

test('session helpers reject invalid events and keep recent values', () => {
    assert.equal(normalizePerformanceEvent({type: 'note'}, 0), null)
    assert.deepEqual(normalizePerformanceEvent({
        type: 'damp',
        instrumentId: 'guitar',
        stringId: null
    }, 120), {
        at: 120,
        type: 'damp',
        instrumentId: 'guitar',
        stringId: null
    })
    assert.deepEqual(limitSessionTakes([{id: 1}, {id: 2}, {id: 3}], 2), [{id: 2}, {id: 3}])
})
