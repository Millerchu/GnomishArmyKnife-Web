const DEFAULT_VELOCITY = 0.7
const VELOCITY_LAYER_ANCHORS = Object.freeze({
    soft: 0.3,
    normal: 0.7,
    strong: 0.92,
    bright: 0.95
})

/**
 * 把数值限制在给定区间。
 *
 * @param {number} value
 * @param {number} minimum
 * @param {number} maximum
 * @returns {number}
 */
export function clamp(value, minimum, maximum) {
    const numericValue = Number(value)
    if (!Number.isFinite(numericValue)) {
        return minimum
    }
    return Math.min(maximum, Math.max(minimum, numericValue))
}

/**
 * 兼容 `{samples}` 和直接数组两种清单形态，音频层内部统一使用 url 与数值力度。
 *
 * @param {import('../types.js').InstrumentSampleManifest | import('../types.js').InstrumentSample[]} manifest
 * @returns {import('../types.js').InstrumentSample[]}
 */
export function normalizeSampleManifest(manifest) {
    const samples = Array.isArray(manifest) ? manifest : manifest?.samples
    if (!Array.isArray(samples)) {
        return []
    }
    return samples
        .map(sample => {
            const url = sample?.url || sample?.src
            const velocity = sample?.velocity
                ?? VELOCITY_LAYER_ANCHORS[sample?.velocityLayer]
                ?? DEFAULT_VELOCITY
            return {
                ...sample,
                id: sample?.id || url,
                url,
                velocity: clamp(velocity, 0, 1)
            }
        })
        .filter(sample =>
            typeof sample.url === 'string'
            && sample.url.length > 0
            && Number.isFinite(Number(sample.rootMidi))
        )
}

/**
 * 找到距离目标音高最近的采样；根音距离优先，力度层距离次之。
 *
 * @param {import('../types.js').InstrumentSample[]} samples
 * @param {number} targetMidi
 * @param {number} [velocity=0.7]
 * @returns {import('../types.js').InstrumentSample | null}
 */
export function selectNearestSample(samples, targetMidi, velocity = DEFAULT_VELOCITY) {
    if (!Array.isArray(samples) || !Number.isFinite(Number(targetMidi))) {
        return null
    }

    const validSamples = normalizeSampleManifest(samples)
    if (validSamples.length === 0) {
        return null
    }

    const normalizedVelocity = clamp(velocity, 0, 1)
    return validSamples.reduce((nearestSample, candidate) => {
        if (!nearestSample) {
            return candidate
        }

        const nearestPitchDistance = Math.abs(Number(nearestSample.rootMidi) - Number(targetMidi))
        const candidatePitchDistance = Math.abs(Number(candidate.rootMidi) - Number(targetMidi))
        if (candidatePitchDistance !== nearestPitchDistance) {
            return candidatePitchDistance < nearestPitchDistance ? candidate : nearestSample
        }

        const nearestVelocity = clamp(nearestSample.velocity ?? DEFAULT_VELOCITY, 0, 1)
        const candidateVelocity = clamp(candidate.velocity ?? DEFAULT_VELOCITY, 0, 1)
        return Math.abs(candidateVelocity - normalizedVelocity) < Math.abs(nearestVelocity - normalizedVelocity)
            ? candidate
            : nearestSample
    }, null)
}

/**
 * 计算目标音高相对采样根音的播放速率，bendCents 可用于按音和颤音。
 *
 * @param {number} targetMidi
 * @param {number} rootMidi
 * @param {number} [bendCents=0]
 * @returns {number}
 */
export function calculatePlaybackRate(targetMidi, rootMidi, bendCents = 0) {
    const semitoneDistance = Number(targetMidi) - Number(rootMidi) + Number(bendCents) / 100
    if (!Number.isFinite(semitoneDistance)) {
        return 1
    }
    return 2 ** (semitoneDistance / 12)
}
