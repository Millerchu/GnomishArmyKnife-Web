import {onBeforeUnmount} from 'vue'

export const POINTER_HYSTERESIS_PX = 10
export const GLISS_JITTER_COOLDOWN_MS = 36
const VELOCITY_HISTORY_MS = 80

function eventTimestamp(event) {
  return Number.isFinite(event?.timeStamp) ? event.timeStamp : Date.now()
}

function pointerPoint(event) {
  return {
    x: Number(event?.clientX) || 0,
    y: Number(event?.clientY) || 0,
    at: eventTimestamp(event)
  }
}

function trimHistory(history, now) {
  while (history.length > 2 && now - history[0].at > VELOCITY_HISTORY_MS) {
    history.shift()
  }
}

export function calculatePointerVelocity(history) {
  if (!Array.isArray(history) || history.length < 2) {
    return {x: 0, y: 0, speed: 0}
  }

  const first = history[0]
  const last = history[history.length - 1]
  const elapsed = Math.max(last.at - first.at, 1)
  const velocityX = (last.x - first.x) / elapsed
  const velocityY = (last.y - first.y) / elapsed
  return {
    x: velocityX,
    y: velocityY,
    speed: Math.hypot(velocityX, velocityY)
  }
}

export function velocityToGain(speed) {
  return Math.min(Math.max(0.28 + (Number(speed) || 0) * 0.3, 0.28), 1)
}

/**
 * 独立记录每根手指，供按品、滑奏和释放清理共享。
 */
export function createPointerTracker(options = {}) {
  const hysteresisPx = options.hysteresisPx ?? POINTER_HYSTERESIS_PX
  const pointers = new Map()

  function begin(event, payload = {}) {
    const point = pointerPoint(event)
    const pointerState = {
      pointerId: event.pointerId,
      pointerType: event.pointerType || 'mouse',
      origin: point,
      current: point,
      history: [point],
      moved: false,
      payload
    }
    pointers.set(event.pointerId, pointerState)
    return pointerState
  }

  function move(event) {
    const pointerState = pointers.get(event.pointerId)
    if (!pointerState) {
      return null
    }

    const point = pointerPoint(event)
    pointerState.current = point
    pointerState.history.push(point)
    trimHistory(pointerState.history, point.at)

    const distanceFromOrigin = Math.hypot(
      point.x - pointerState.origin.x,
      point.y - pointerState.origin.y
    )
    if (distanceFromOrigin >= hysteresisPx) {
      pointerState.moved = true
    }

    return {
      ...pointerState,
      distanceFromOrigin,
      velocity: calculatePointerVelocity(pointerState.history)
    }
  }

  function finish(pointerId) {
    const pointerState = pointers.get(pointerId) || null
    pointers.delete(pointerId)
    return pointerState
  }

  return {
    pointers,
    begin,
    move,
    get: (pointerId) => pointers.get(pointerId) || null,
    end: (event) => finish(event.pointerId),
    cancel: (event) => finish(event.pointerId),
    clear: () => pointers.clear()
  }
}

/**
 * 一次扫弦或滑奏手势中，每根弦只触发一次；结束后才允许下一轮触发。
 */
export function createCrossingTracker(options = {}) {
  const jitterCooldownMs = options.jitterCooldownMs ?? GLISS_JITTER_COOLDOWN_MS
  const gestures = new Map()

  function begin(pointerId, targetId, at = Date.now()) {
    gestures.set(pointerId, {
      currentTargetId: targetId,
      visited: new Map(targetId ? [[targetId, at]] : [])
    })
  }

  function enter(pointerId, targetId, at = Date.now()) {
    if (!targetId) {
      return false
    }

    const gesture = gestures.get(pointerId)
    if (!gesture) {
      begin(pointerId, targetId, at)
      return true
    }
    if (gesture.currentTargetId === targetId) {
      return false
    }

    gesture.currentTargetId = targetId
    const lastVisitAt = gesture.visited.get(targetId)
    if (lastVisitAt !== undefined && at - lastVisitAt <= jitterCooldownMs) {
      return false
    }
    if (lastVisitAt !== undefined) {
      return false
    }

    gesture.visited.set(targetId, at)
    return true
  }

  return {
    gestures,
    begin,
    enter,
    end: (pointerId) => gestures.delete(pointerId),
    clear: () => gestures.clear()
  }
}

export function capturePointer(event) {
  const captureTarget = event.currentTarget
  if (typeof captureTarget?.setPointerCapture !== 'function') {
    return
  }
  try {
    captureTarget.setPointerCapture(event.pointerId)
  } catch {
    // 指针可能已被系统取消；组件仍会通过 pointercancel 清理状态。
  }
}

export function releasePointer(event) {
  const captureTarget = event.currentTarget
  if (typeof captureTarget?.releasePointerCapture !== 'function') {
    return
  }
  try {
    if (typeof captureTarget.hasPointerCapture !== 'function'
      || captureTarget.hasPointerCapture(event.pointerId)) {
      captureTarget.releasePointerCapture(event.pointerId)
    }
  } catch {
    // lostpointercapture 可能先于这里发生，重复释放应保持幂等。
  }
}

export function resolveIndexFromPosition(position, start, size, count) {
  if (!Number.isFinite(size) || size <= 0 || count <= 0) {
    return -1
  }
  const relative = Math.min(Math.max((position - start) / size, 0), 0.999999)
  return Math.floor(relative * count)
}

/**
 * 在 setup 中使用时自动释放所有手势状态。
 */
export function useInstrumentPointers(options = {}) {
  const pointerTracker = createPointerTracker(options)
  const crossingTracker = createCrossingTracker(options)

  const clear = () => {
    pointerTracker.clear()
    crossingTracker.clear()
  }

  onBeforeUnmount(clear)

  return {
    pointerTracker,
    crossingTracker,
    clear
  }
}
