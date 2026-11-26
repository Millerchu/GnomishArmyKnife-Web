import test from 'node:test'
import assert from 'node:assert/strict'
import {installHoverScrollbar} from '../hoverScrollbar.js'

function createFakeDom() {
  const docListeners = new Map()
  const winListeners = new Map()
  const rootListeners = new Map()
  const timers = new Map()
  let nextTimerId = 1

  const add = (map) => (type, fn) => {
    if (!map.has(type)) map.set(type, new Set())
    map.get(type).add(fn)
  }
  const remove = (map) => (type, fn) => {
    map.get(type)?.delete(fn)
  }
  const emit = (map, type, event) => {
    for (const fn of map.get(type) || []) {
      fn(event)
    }
  }

  const makeEl = ({
    scrollHeight = 100,
    clientHeight = 100,
    scrollWidth = 100,
    clientWidth = 100,
    rect = {left: 0, top: 0, right: 200, bottom: 200},
    overflowY = 'auto',
    overflowX = 'hidden',
    parentElement = null
  } = {}) => ({
    nodeType: 1,
    dataset: {},
    scrollHeight,
    clientHeight,
    scrollWidth,
    clientWidth,
    parentElement,
    _style: {overflowY, overflowX},
    getBoundingClientRect: () => rect
  })

  const documentElement = {
    nodeType: 1,
    dataset: {},
    scrollHeight: 100,
    clientHeight: 100,
    scrollWidth: 100,
    clientWidth: 100,
    parentElement: null,
    _style: {overflowY: 'hidden', overflowX: 'hidden'},
    getBoundingClientRect: () => ({left: 0, top: 0, right: 1280, bottom: 800}),
    addEventListener: add(rootListeners),
    removeEventListener: remove(rootListeners)
  }

  const fakeWindow = {
    addEventListener: add(winListeners),
    removeEventListener: remove(winListeners),
    getComputedStyle: (el) => el._style || {overflowY: 'visible', overflowX: 'visible'},
    requestAnimationFrame: (cb) => {
      cb()
      return 1
    },
    cancelAnimationFrame: () => {},
    setTimeout: (cb) => {
      const id = nextTimerId++
      timers.set(id, cb)
      return id
    },
    clearTimeout: (id) => {
      timers.delete(id)
    }
  }

  const fakeDocument = {
    documentElement,
    body: null,
    scrollingElement: documentElement,
    addEventListener: add(docListeners),
    removeEventListener: remove(docListeners)
  }

  return {
    fakeWindow,
    fakeDocument,
    makeEl,
    emitDoc: (type, event) => emit(docListeners, type, event),
    emitRoot: (type, event) => emit(rootListeners, type, event),
    flushTimers: () => {
      for (const [id, cb] of [...timers.entries()]) {
        timers.delete(id)
        cb()
      }
    }
  }
}

test('installHoverScrollbar toggles data-scrollbar-hover near vertical/horizontal edges and clears on leave', () => {
  const env = createFakeDom()
  const prevWindow = globalThis.window
  const prevDocument = globalThis.document
  globalThis.window = env.fakeWindow
  globalThis.document = env.fakeDocument

  try {
    const uninstall = installHoverScrollbar({edgeThreshold: 24, scrollHideDelay: 500})
    const scrollBox = env.makeEl({
      scrollHeight: 600,
      clientHeight: 200,
      rect: {left: 0, top: 0, right: 300, bottom: 200},
      overflowY: 'auto'
    })

    // Far from right edge -> stays hidden
    env.emitDoc('pointermove', {target: scrollBox, clientX: 120, clientY: 80, pointerType: 'mouse'})
    assert.equal(scrollBox.dataset.scrollbarHover, undefined)

    // Near right edge (within 24px) -> reveals scrollbar
    env.emitDoc('pointermove', {target: scrollBox, clientX: 290, clientY: 80, pointerType: 'mouse'})
    assert.equal(scrollBox.dataset.scrollbarHover, 'true')

    // Move away -> hides scrollbar
    env.emitDoc('pointermove', {target: scrollBox, clientX: 100, clientY: 80, pointerType: 'mouse'})
    assert.equal(scrollBox.dataset.scrollbarHover, undefined)

    // Near right edge again, then pointer leaves document -> hides scrollbar
    env.emitDoc('pointermove', {target: scrollBox, clientX: 295, clientY: 80, pointerType: 'mouse'})
    assert.equal(scrollBox.dataset.scrollbarHover, 'true')
    env.emitRoot('pointerleave', {})
    assert.equal(scrollBox.dataset.scrollbarHover, undefined)

    uninstall()
  } finally {
    globalThis.window = prevWindow
    globalThis.document = prevDocument
  }
})

test('installHoverScrollbar toggles data-scrolling during scroll and clears after delay', () => {
  const env = createFakeDom()
  const prevWindow = globalThis.window
  const prevDocument = globalThis.document
  globalThis.window = env.fakeWindow
  globalThis.document = env.fakeDocument

  try {
    const uninstall = installHoverScrollbar({scrollHideDelay: 300})
    const pageEl = env.makeEl({scrollHeight: 1200, clientHeight: 600})

    env.emitDoc('scroll', {target: pageEl})
    assert.equal(pageEl.dataset.scrolling, 'true')

    env.flushTimers()
    assert.equal(pageEl.dataset.scrolling, undefined)

    uninstall()
  } finally {
    globalThis.window = prevWindow
    globalThis.document = prevDocument
  }
})
