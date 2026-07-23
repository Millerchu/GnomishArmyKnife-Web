import {onBeforeUnmount, reactive} from 'vue'

const DEFAULT_STIFFNESS = 260
const DEFAULT_DAMPING = 17
const MAX_FRAME_SECONDS = 1 / 30
const REST_POSITION = 0.01
const REST_VELOCITY = 0.02

function readBoolean(valueOrGetter) {
  return typeof valueOrGetter === 'function'
    ? Boolean(valueOrGetter())
    : Boolean(valueOrGetter?.value ?? valueOrGetter)
}

export function advanceDampedString(model, elapsedSeconds, options = {}) {
  const stiffness = options.stiffness ?? DEFAULT_STIFFNESS
  const damping = options.damping ?? DEFAULT_DAMPING
  const elapsed = Math.min(Math.max(elapsedSeconds, 0), MAX_FRAME_SECONDS)
  const acceleration = -stiffness * model.position - damping * model.velocity

  model.velocity += acceleration * elapsed
  model.position += model.velocity * elapsed
  model.energy = Math.min(Math.abs(model.position) / 8 + Math.abs(model.velocity) / 220, 1)
  return model
}

/**
 * 使用当前位移和速度叠加冲量，因此快速重复拨弦不会跳回预设关键帧。
 */
export function createStringDynamics(options = {}) {
  const states = options.states || reactive({})
  const requestFrame = options.requestFrame
    || (globalThis.requestAnimationFrame
      ? (callback) => globalThis.requestAnimationFrame(callback)
      : null)
    || ((callback) => globalThis.setTimeout(() => callback(Date.now()), 16))
  const cancelFrame = options.cancelFrame
    || (globalThis.cancelAnimationFrame
      ? (frameId) => globalThis.cancelAnimationFrame(frameId)
      : (frameId) => globalThis.clearTimeout(frameId))
  let animationFrame = 0
  let previousTimestamp = 0

  function ensureState(stringId) {
    if (!states[stringId]) {
      states[stringId] = {
        position: 0,
        velocity: 0,
        energy: 0,
        reducedFeedback: false
      }
    }
    return states[stringId]
  }

  function hasMovingStrings() {
    return Object.values(states).some((state) => (
      Math.abs(state.position) > REST_POSITION
      || Math.abs(state.velocity) > REST_VELOCITY
      || state.energy > 0.01
    ))
  }

  function render(timestamp) {
    const elapsed = previousTimestamp
      ? (timestamp - previousTimestamp) / 1000
      : 1 / 60
    previousTimestamp = timestamp

    const reducedMotion = readBoolean(options.reducedMotion)
    for (const state of Object.values(states)) {
      if (reducedMotion) {
        state.position = 0
        state.velocity = 0
        state.reducedFeedback = state.energy > 0.01
        state.energy *= 0.78
        if (state.energy < 0.01) {
          state.energy = 0
          state.reducedFeedback = false
        }
        continue
      }

      if (state.reducedFeedback) {
        state.energy *= 0.78
        if (state.energy < 0.01) {
          state.energy = 0
          state.reducedFeedback = false
        }
        continue
      }

      advanceDampedString(state, elapsed, options)
      if (Math.abs(state.position) <= REST_POSITION && Math.abs(state.velocity) <= REST_VELOCITY) {
        state.position = 0
        state.velocity = 0
      }
    }

    if (hasMovingStrings()) {
      animationFrame = requestFrame(render)
      return
    }
    animationFrame = 0
    previousTimestamp = 0
  }

  function ensureAnimation() {
    if (!animationFrame) {
      animationFrame = requestFrame(render)
    }
  }

  function pluck(stringId, impulse = 1) {
    const state = ensureState(stringId)
    const normalizedImpulse = Math.min(Math.max(Number(impulse) || 0.5, 0.15), 1)

    if (readBoolean(options.reducedMotion)) {
      state.position = 0
      state.velocity = 0
      state.energy = Math.max(state.energy, normalizedImpulse)
      state.reducedFeedback = true
    } else {
      state.velocity += normalizedImpulse * 190
      state.energy = Math.max(state.energy, normalizedImpulse)
      state.reducedFeedback = false
    }
    ensureAnimation()
  }

  function styleFor(stringId) {
    const state = ensureState(stringId)
    return {
      '--string-displacement': `${state.position.toFixed(3)}px`,
      '--string-energy': state.energy.toFixed(3)
    }
  }

  function stop() {
    if (animationFrame) {
      cancelFrame(animationFrame)
    }
    animationFrame = 0
    previousTimestamp = 0
    for (const state of Object.values(states)) {
      state.position = 0
      state.velocity = 0
      state.energy = 0
      state.reducedFeedback = false
    }
  }

  return {states, pluck, styleFor, stop}
}

export function useStringDynamics(options = {}) {
  const dynamics = createStringDynamics(options)
  onBeforeUnmount(dynamics.stop)
  return dynamics
}
