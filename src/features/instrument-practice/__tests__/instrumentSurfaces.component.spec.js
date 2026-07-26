// @vitest-environment happy-dom

import {mount} from '@vue/test-utils'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import FrettedInstrumentSurface from '../components/FrettedInstrumentSurface.vue'
import GuzhengSurface from '../components/GuzhengSurface.vue'
import PianoSurface from '../components/PianoSurface.vue'

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  })))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('乐器琴面回放与简谱反馈', () => {
  it('古筝按当前调式显示简谱并高亮回放琴弦', () => {
    const wrapper = mount(GuzhengSurface, {
      props: {
        tuningId: 'd-pentatonic',
        showNumberedNotes: true,
        playbackEvents: [{
          playbackVisualId: 1,
          type: 'note',
          instrumentId: 'guzheng',
          stringId: 'string-1',
          midi: 38,
          velocity: 0.7
        }]
      }
    })

    expect(wrapper.get('.note-label').text()).toBe('1')
    expect(wrapper.get('[data-string-index="0"]').classes()).toContain('playback-active')
    wrapper.unmount()
  })

  it('吉他和乌克丽丽指板均可显示简谱并定位回放品位', async () => {
    for (const instrument of [
      {id: 'guitar', tuningId: 'standard', midi: 43},
      {id: 'ukulele', tuningId: 'high-g', midi: 70}
    ]) {
      const wrapper = mount(FrettedInstrumentSurface, {
        props: {
          instrumentId: instrument.id,
          mode: 'fret',
          tuningId: instrument.tuningId,
          showNumberedNotes: true,
          playbackEvents: [{
            playbackVisualId: 1,
            type: 'note',
            instrumentId: instrument.id,
            stringId: 'string-1',
            midi: instrument.midi,
            velocity: 0.7
          }]
        }
      })

      expect(wrapper.findAll('.fret-note-number').length).toBeGreaterThan(0)
      expect(wrapper.get('.fret-cell.playback-active').attributes('data-fret')).toBe('3')
      wrapper.unmount()
    }
  })

  it('钢琴显示 1–7 并同步压下回放琴键', () => {
    const wrapper = mount(PianoSurface, {
      props: {
        showNumberedNotes: true,
        playbackEvents: [{
          playbackVisualId: 1,
          type: 'note',
          instrumentId: 'piano',
          stringId: 'key-60',
          midi: 60,
          velocity: 0.7
        }]
      }
    })

    const middleC = wrapper.get('[data-midi="60"]')
    expect(middleC.classes()).toContain('pressed')
    expect(middleC.get('.piano-note-label').text()).toBe('1')
    wrapper.unmount()
  })
})
