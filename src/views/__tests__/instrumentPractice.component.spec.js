// @vitest-environment happy-dom

import {flushPromises, mount} from '@vue/test-utils'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import InstrumentPractice from '../InstrumentPractice.vue'
import {__instrumentPracticeMocks} from '@/features/instrument-practice/composables/index.js'

const routerPush = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({push: routerPush})
}))

vi.mock('@/features/instrument-practice/composables/index.js', async () => {
  const {ref} = await import('vue')
  const audio = {
    status: ref('prepared'),
    error: ref(''),
    loadedInstrumentIds: ref(['guzheng', 'guitar', 'ukulele', 'piano']),
    engine: {},
    prepareInstrument: vi.fn(async () => true),
    prefetchInstruments: vi.fn(),
    unlock: vi.fn(async () => true),
    retry: vi.fn(async () => true),
    playPerformanceEvent: vi.fn(),
    stopAll: vi.fn(),
    setVolumes: vi.fn()
  }
  const metronome = {
    bpm: ref(80),
    meter: ref('4/4'),
    isRunning: ref(false),
    currentBeat: ref(0),
    setBpm: vi.fn(),
    setMeter: vi.fn(),
    toggle: vi.fn(async () => {
      metronome.isRunning.value = !metronome.isRunning.value
      return metronome.isRunning.value
    }),
    stop: vi.fn(() => {
      metronome.isRunning.value = false
    })
  }
  const recorder = {
    takes: ref([]),
    isRecording: ref(false),
    activePlaybackId: ref(null),
    startRecording: vi.fn(() => {
      recorder.isRecording.value = true
      return true
    }),
    capture: vi.fn(),
    stopRecording: vi.fn(() => {
      recorder.isRecording.value = false
      const take = {
        id: 'take-1',
        instrumentId: 'guzheng',
        tuningId: 'd-pentatonic',
        bpm: 80,
        meter: '4/4',
        durationMs: 1000,
        events: []
      }
      recorder.takes.value = [take]
      return take
    }),
    stopPlayback: vi.fn(),
    replayTake: vi.fn(),
    deleteTake: vi.fn(),
    clearTakes: vi.fn(() => {
      recorder.takes.value = []
    })
  }

  return {
    useInstrumentAudio: () => audio,
    useMetronome: () => metronome,
    useSessionRecorder: () => recorder,
    __instrumentPracticeMocks: {audio, metronome, recorder}
  }
})

function mountPage() {
  return mount(InstrumentPractice, {
    global: {
      stubs: {
        FrettedInstrumentSurface: {
          name: 'FrettedInstrumentSurface',
          template: '<section data-test="fretted-surface" />'
        },
        GuzhengSurface: {
          name: 'GuzhengSurface',
          template: '<section data-test="guzheng-surface" />'
        },
        PianoSurface: {
          name: 'PianoSurface',
          template: '<section data-test="piano-surface" />'
        },
        MacDialog: {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template: '<section v-if="modelValue" role="dialog"><slot /></section>'
        },
        Transition: true
      }
    }
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  routerPush.mockReset()
  __instrumentPracticeMocks.audio.status.value = 'prepared'
  __instrumentPracticeMocks.recorder.takes.value = []
  __instrumentPracticeMocks.recorder.isRecording.value = false
  __instrumentPracticeMocks.recorder.activePlaybackId.value = null
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  })))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('随身乐器页面流程', () => {
  it('默认准备古筝并可切换至吉他或钢琴演奏面', async () => {
    const wrapper = mountPage()
    await flushPromises()

    expect(__instrumentPracticeMocks.audio.prepareInstrument)
      .toHaveBeenCalledWith(expect.objectContaining({id: 'guzheng'}))
    expect(__instrumentPracticeMocks.audio.prefetchInstruments)
      .toHaveBeenCalledWith([
        expect.objectContaining({id: 'guitar'}),
        expect.objectContaining({id: 'ukulele'}),
        expect.objectContaining({id: 'piano'})
      ])

    await wrapper.get('.instrument-switcher button:nth-child(2)').trigger('click')
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe('吉他')
    expect(wrapper.find('[data-test="fretted-surface"]').exists()).toBe(true)
    expect(__instrumentPracticeMocks.audio.prepareInstrument)
      .toHaveBeenLastCalledWith(expect.objectContaining({id: 'guitar'}))

    await wrapper.get('.instrument-switcher button:nth-child(4)').trigger('click')
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('钢琴')
    expect(wrapper.find('[data-test="piano-surface"]').exists()).toBe(true)
    expect(__instrumentPracticeMocks.audio.prepareInstrument)
      .toHaveBeenLastCalledWith(expect.objectContaining({id: 'piano'}))
    wrapper.unmount()
  })

  it('录制中切换乐器会先提交片段并停止旧声部', async () => {
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.get('.record-button').trigger('click')
    expect(__instrumentPracticeMocks.recorder.startRecording).toHaveBeenCalledWith({
      instrumentId: 'guzheng',
      tuningId: 'd-pentatonic',
      bpm: 80,
      meter: '4/4'
    })

    await wrapper.get('.instrument-switcher button:nth-child(3)').trigger('click')
    await flushPromises()

    expect(__instrumentPracticeMocks.recorder.stopRecording).toHaveBeenCalledTimes(1)
    expect(__instrumentPracticeMocks.recorder.stopPlayback).toHaveBeenCalled()
    expect(__instrumentPracticeMocks.audio.stopAll).toHaveBeenCalled()
    expect(wrapper.get('h1').text()).toBe('乌克丽丽')
    expect(wrapper.get('.record-button').attributes('aria-label')).toBe('开始录制')
    expect(wrapper.get('.practice-toolbar .tool-button:nth-of-type(3) small').text()).toBe('1/5')
    wrapper.unmount()
  })

  it('返回键回到平台首页，设置以会话内移动 Sheet 呈现', async () => {
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.get('.back-button').trigger('click')
    expect(routerPush).toHaveBeenCalledWith('/home')

    await wrapper.get('button[aria-label="打开练习设置"]').trigger('click')
    expect(wrapper.get('[role="dialog"]').text()).toContain('节拍器')
    expect(wrapper.get('[role="dialog"]').text()).toContain('不读取麦克风')
    wrapper.unmount()
  })

  it('紧凑横屏默认隐藏上下控件并允许随时恢复', async () => {
    vi.stubGlobal('matchMedia', vi.fn((query) => ({
      matches: query.includes('orientation: landscape'),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    })))
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.get('.instrument-practice-page').classes()).toContain('compact-landscape')
    expect(wrapper.get('.instrument-practice-page').classes()).toContain('chrome-hidden')
    expect(wrapper.get('.practice-header').attributes('aria-hidden')).toBe('true')
    expect(wrapper.get('.practice-toolbar').attributes('aria-hidden')).toBe('true')
    expect(wrapper.get('.landscape-chrome-toggle').text()).toContain('显示控件')

    await wrapper.get('.landscape-chrome-toggle').trigger('click')

    expect(wrapper.get('.instrument-practice-page').classes()).not.toContain('chrome-hidden')
    expect(wrapper.get('.practice-header').attributes('aria-hidden')).toBe('false')
    expect(wrapper.get('.landscape-chrome-toggle').text()).toContain('隐藏控件')
    wrapper.unmount()
  })
})
