// @vitest-environment happy-dom

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {mount} from '@vue/test-utils'
import FrettedInstrumentSurface from '../../features/instrument-practice/components/FrettedInstrumentSurface.vue'
import GuzhengSurface from '../../features/instrument-practice/components/GuzhengSurface.vue'

function pointerPayload(pointerId, clientX, clientY) {
  return {
    pointerId,
    pointerType: 'touch',
    button: 0,
    clientX,
    clientY
  }
}

describe('随身乐器演奏面', () => {
  beforeEach(() => {
    Element.prototype.setPointerCapture = vi.fn()
    Element.prototype.releasePointerCapture = vi.fn()
    Element.prototype.hasPointerCapture = vi.fn(() => true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('和弦选择保持静音，扫弦在 pointerdown 同步发出和弦音', async () => {
    const wrapper = mount(FrettedInstrumentSurface, {
      props: {
        instrumentId: 'guitar',
        mode: 'chord',
        chordId: 'c-major',
        reducedMotion: true
      }
    })

    const chordButtons = wrapper.findAll('.chord-chip')
    await chordButtons.find((button) => button.text().includes('Dm')).trigger('click')
    expect(wrapper.emitted('update:chordId')).toEqual([['d-minor']])
    expect(wrapper.emitted('performance')).toBeUndefined()

    const strumZone = wrapper.find('.strum-zone')
    strumZone.element.getBoundingClientRect = () => ({
      top: 0,
      bottom: 600,
      left: 0,
      right: 300,
      width: 300,
      height: 600
    })
    await strumZone.trigger('pointerdown', pointerPayload(1, 40, 350))

    const noteEvent = wrapper.emitted('performance')[0][0]
    expect(noteEvent.type).toBe('note')
    expect(noteEvent.instrumentId).toBe('guitar')
    expect(wrapper.emitted('interaction')).toHaveLength(1)
    expect(Element.prototype.setPointerCapture).toHaveBeenCalled()
  })

  it('自由指板用 pointerId Map 保留同弦最高品位，取消后回到剩余按指', async () => {
    const wrapper = mount(FrettedInstrumentSurface, {
      props: {
        instrumentId: 'ukulele',
        mode: 'fret',
        tuningId: 'high-g',
        reducedMotion: true
      }
    })
    const thirdFret = wrapper.find('[data-string-index="0"][data-fret="3"]')
    const fifthFret = wrapper.find('[data-string-index="0"][data-fret="5"]')

    await thirdFret.trigger('pointerdown', pointerPayload(11, 10, 10))
    await fifthFret.trigger('pointerdown', pointerPayload(12, 20, 10))

    const strumZone = wrapper.find('.strum-zone')
    strumZone.element.getBoundingClientRect = () => ({
      top: 0,
      bottom: 400,
      left: 0,
      right: 300,
      width: 300,
      height: 400
    })
    await strumZone.trigger('pointerdown', pointerPayload(20, 30, 10))
    expect(wrapper.emitted('performance').at(-1)[0].midi).toBe(72)

    await fifthFret.trigger('pointercancel', pointerPayload(12, 20, 10))
    await strumZone.trigger('pointerdown', pointerPayload(21, 30, 10))
    expect(wrapper.emitted('performance').at(-1)[0].midi).toBe(70)

    await thirdFret.trigger('lostpointercapture', pointerPayload(11, 10, 10))
    await strumZone.trigger('pointerdown', pointerPayload(22, 30, 10))
    expect(wrapper.emitted('performance').at(-1)[0].midi).toBe(67)
  })

  it('闷音在按下时即时发出 damp，并清理 lostpointercapture 状态', async () => {
    const wrapper = mount(FrettedInstrumentSurface, {
      props: {instrumentId: 'guitar'}
    })
    const dampButton = wrapper.find('.damp-control')
    await dampButton.trigger('pointerdown', pointerPayload(2, 0, 0))

    expect(wrapper.emitted('performance')[0][0].type).toBe('damp')
    expect(wrapper.emitted('damp-change')).toEqual([[true]])
    expect(dampButton.classes()).toContain('active')

    await dampButton.trigger('lostpointercapture', pointerPayload(2, 0, 0))
    expect(wrapper.emitted('damp-change')).toEqual([[true], [false]])
    expect(dampButton.classes()).not.toContain('active')
  })

  it('古筝渲染 21 弦，右拨与跨弦滑奏按手势去重', async () => {
    const wrapper = mount(GuzhengSurface, {
      props: {reducedMotion: true}
    })
    const rows = wrapper.findAll('.guzheng-string-row')
    expect(rows).toHaveLength(21)
    rows.forEach((row, index) => {
      row.element.getBoundingClientRect = () => ({
        top: index * 20,
        bottom: (index + 1) * 20,
        left: 0,
        right: 300,
        width: 300,
        height: 20
      })
    })

    const firstPluckZone = rows[0].find('.pluck-zone')
    await firstPluckZone.trigger('pointerdown', pointerPayload(5, 240, 5, 1))
    await firstPluckZone.trigger('pointermove', pointerPayload(5, 240, 25, 30))
    await firstPluckZone.trigger('pointermove', pointerPayload(5, 240, 5, 60))
    await firstPluckZone.trigger('pointerup', pointerPayload(5, 240, 5, 80))

    const noteEvents = wrapper.emitted('performance')
      .map(([performanceEvent]) => performanceEvent)
      .filter((performanceEvent) => performanceEvent.type === 'note')
    expect(noteEvents.map((performanceEvent) => performanceEvent.stringId))
      .toEqual(['string-1', 'string-2'])
    expect(noteEvents.map((performanceEvent) => performanceEvent.midi))
      .toEqual([38, 40])
  })

  it('古筝左按拖动发 bend，pointercancel 将同弦音高归零', async () => {
    const wrapper = mount(GuzhengSurface, {
      props: {tuningId: 'g-pentatonic', reducedMotion: true}
    })
    const pressureZone = wrapper.find('.pressure-zone')
    await pressureZone.trigger('pointerdown', pointerPayload(8, 20, 10, 1))
    await pressureZone.trigger('pointermove', pointerPayload(8, 50, 14, 30))
    await pressureZone.trigger('pointercancel', pointerPayload(8, 50, 14, 40))

    const bendEvents = wrapper.emitted('performance')
      .map(([performanceEvent]) => performanceEvent)
      .filter((performanceEvent) => performanceEvent.type === 'bend')
    expect(bendEvents[0].bendCents).toBeGreaterThan(0)
    expect(bendEvents[0].midi).toBe(43)
    expect(bendEvents.at(-1).bendCents).toBe(0)
  })

  it('摇指为瞬时按住状态并在释放后关闭', async () => {
    vi.useFakeTimers()
    const wrapper = mount(GuzhengSurface, {
      props: {reducedMotion: true}
    })
    const tremoloButton = wrapper.find('.tremolo-button')
    await tremoloButton.trigger('pointerdown', pointerPayload(9, 0, 0))
    expect(wrapper.emitted('tremolo-change')).toEqual([[true]])
    expect(tremoloButton.classes()).toContain('active')

    await tremoloButton.trigger('pointerup', pointerPayload(9, 0, 0))
    expect(wrapper.emitted('tremolo-change')).toEqual([[true], [false]])
    expect(tremoloButton.classes()).not.toContain('active')
    vi.useRealTimers()
  })
})
