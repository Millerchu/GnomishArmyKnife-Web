const EDGE_THRESHOLD = 24
const SCROLL_HIDE_DELAY_MS = 900
const SCROLLABLE_OVERFLOW_VALUES = new Set(['auto', 'scroll', 'overlay'])

function isElement(node) {
  return Boolean(node && node.nodeType === 1)
}

function isAxisScrollable(el, axis) {
  if (!isElement(el)) return false
  if (el === document.scrollingElement || el === document.documentElement || el === document.body) {
    return true
  }
  const style = window.getComputedStyle(el)
  const overflow = axis === 'y' ? style.overflowY : style.overflowX
  return SCROLLABLE_OVERFLOW_VALUES.has(overflow)
}

function isPointerNearScrollbar(el, clientX, clientY, threshold = EDGE_THRESHOLD) {
  const hasVertical = el.scrollHeight > el.clientHeight + 1
  const hasHorizontal = el.scrollWidth > el.clientWidth + 1
  if (!hasVertical && !hasHorizontal) return false

  const rect = el.getBoundingClientRect()
  if (
    clientX < rect.left ||
    clientX > rect.right + 4 ||
    clientY < rect.top ||
    clientY > rect.bottom + 4
  ) {
    return false
  }

  const nearRight =
    hasVertical &&
    clientX >= rect.right - threshold &&
    clientX <= rect.right + 4 &&
    isAxisScrollable(el, 'y')

  if (nearRight) return true

  const nearBottom =
    hasHorizontal &&
    clientY >= rect.bottom - threshold &&
    clientY <= rect.bottom + 4 &&
    isAxisScrollable(el, 'x')

  return nearBottom
}

function resolveScrollTarget(target) {
  if (target === document || target === window) {
    return document.scrollingElement || document.documentElement
  }
  return isElement(target) ? target : null
}

/**
 * 全局滚动条交互增强：
 * - 鼠标移近任意可滚动容器的右侧/底部边缘时显示滚动条（data-scrollbar-hover="true"）
 * - 滚轮、触控板或键盘滚动期间临时显示滚动条，停止滚动后自动隐藏（data-scrolling="true"）
 */
export function installHoverScrollbar({
  edgeThreshold = EDGE_THRESHOLD,
  scrollHideDelay = SCROLL_HIDE_DELAY_MS
} = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {}
  }

  const hoveredElements = new Set()
  const scrollTimers = new Map()
  let rafId = null
  let pendingPoint = null
  let pointerPressed = false

  const setHoveredElements = (nextSet) => {
    for (const el of hoveredElements) {
      if (!nextSet.has(el)) {
        delete el.dataset.scrollbarHover
        hoveredElements.delete(el)
      }
    }
    for (const el of nextSet) {
      if (!hoveredElements.has(el)) {
        el.dataset.scrollbarHover = 'true'
        hoveredElements.add(el)
      }
    }
  }

  const clearHoveredElements = () => {
    for (const el of hoveredElements) {
      delete el.dataset.scrollbarHover
    }
    hoveredElements.clear()
  }

  const updateHoverState = (target, clientX, clientY) => {
    const nextHovered = new Set()
    let current = isElement(target) ? target : null

    while (current) {
      if (isPointerNearScrollbar(current, clientX, clientY, edgeThreshold)) {
        nextHovered.add(current)
      }
      current = current.parentElement
    }

    const scrollingEl = document.scrollingElement
    if (
      scrollingEl &&
      !nextHovered.has(scrollingEl) &&
      isPointerNearScrollbar(scrollingEl, clientX, clientY, edgeThreshold)
    ) {
      nextHovered.add(scrollingEl)
    }

    setHoveredElements(nextHovered)
  }

  const onPointerMove = (event) => {
    if (pointerPressed || event.pointerType === 'touch') return
    pendingPoint = {
      target: event.target,
      clientX: event.clientX,
      clientY: event.clientY
    }
    if (rafId !== null) return
    let executed = false
    rafId = window.requestAnimationFrame(() => {
      executed = true
      rafId = null
      if (!pendingPoint) return
      const {target, clientX, clientY} = pendingPoint
      pendingPoint = null
      updateHoverState(target, clientX, clientY)
    })
    if (executed) {
      rafId = null
    }
  }

  const onPointerDown = () => {
    pointerPressed = true
  }

  const onPointerUp = (event) => {
    if (!pointerPressed) return
    pointerPressed = false
    if (event && typeof event.clientX === 'number' && typeof event.clientY === 'number') {
      updateHoverState(event.target, event.clientX, event.clientY)
    }
  }

  const onPointerLeave = () => {
    if (pointerPressed) return
    pendingPoint = null
    clearHoveredElements()
  }

  const onScroll = (event) => {
    const el = resolveScrollTarget(event.target)
    if (!el) return
    el.dataset.scrolling = 'true'
    const existing = scrollTimers.get(el)
    if (existing) {
      window.clearTimeout(existing)
    }
    const timer = window.setTimeout(() => {
      delete el.dataset.scrolling
      scrollTimers.delete(el)
    }, scrollHideDelay)
    scrollTimers.set(el, timer)
  }

  document.addEventListener('pointermove', onPointerMove, {passive: true})
  document.addEventListener('pointerdown', onPointerDown, {passive: true})
  window.addEventListener('pointerup', onPointerUp, {passive: true})
  window.addEventListener('pointercancel', onPointerUp, {passive: true})
  document.documentElement.addEventListener('pointerleave', onPointerLeave, {passive: true})
  window.addEventListener('blur', onPointerLeave, {passive: true})
  document.addEventListener('scroll', onScroll, {capture: true, passive: true})

  return () => {
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId)
      rafId = null
    }
    for (const [el, timer] of scrollTimers.entries()) {
      window.clearTimeout(timer)
      delete el.dataset.scrolling
    }
    scrollTimers.clear()
    clearHoveredElements()
    document.removeEventListener('pointermove', onPointerMove)
    document.removeEventListener('pointerdown', onPointerDown)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerUp)
    document.documentElement.removeEventListener('pointerleave', onPointerLeave)
    window.removeEventListener('blur', onPointerLeave)
    document.removeEventListener('scroll', onScroll, true)
  }
}
