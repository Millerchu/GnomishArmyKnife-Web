// @vitest-environment happy-dom

import {flushPromises, mount} from '@vue/test-utils'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import InstrumentPractice from '../InstrumentPractice.vue'
import {__instrumentPracticeMocks} from '@/features/instrument-practice/composables/index.js'

const routerPush = vi.fn()
const confirmDialogMock = vi.hoisted(() => vi.fn(async () => true))

vi.mock('vue-router', () => ({
  useRouter: () => ({push: routerPush})
}))

vi.mock('@/components/systemDialog.js', () => ({
  confirmDialog: confirmDialogMock
}))

vi.mock('@/api/instrumentPractice.js', () => ({
  listInstrumentPracticeTakes: vi.fn(async () => ({data: {data: []}})),
  createInstrumentPracticeTake: vi.fn(async (take) => ({
    data: {
      data: {
        take: {...take, id: 101, createdAt: Date.now()},
        overwrittenTakeId: null
      }
    }
  })),
  deleteInstrumentPracticeTake: vi.fn(async () => ({data: {data: null}}))
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
    activePlaybackEvents: ref([]),
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
    replayTake: vi.fn(() => true),
    deleteTake: vi.fn(),
    replaceTakes: vi.fn((takes) => {
      recorder.takes.value = takes
    }),
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
  confirmDialogMock.mockResolvedValue(true)
  routerPush.mockReset()
  __instrumentPracticeMocks.audio.status.value = 'prepared'
  __instrumentPracticeMocks.recorder.takes.value = []
  __instrumentPracticeMocks.recorder.isRecording.value = false
  __instrumentPracticeMocks.recorder.activePlaybackId.value = null
  __instrumentPracticeMocks.recorder.activePlaybackEvents.value = []
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
    expect(wrapper.get('.practice-toolbar .tool-button:nth-of-type(3) small').text()).toBe('0/10')
    wrapper.unmount()
  })

  it('第 11 段录制前明确提示会覆盖当前乐器最旧记录', async () => {
    const wrapper = mountPage()
    await flushPromises()
    __instrumentPracticeMocks.recorder.takes.value = Array.from({length: 10}, (_, index) => ({
      id: index + 1,
      instrumentId: 'guzheng',
      tuningId: 'd-pentatonic',
      bpm: 80,
      meter: '4/4',
      durationMs: 1000,
      events: [],
      createdAt: index
    }))
    await wrapper.vm.$nextTick()

    await wrapper.get('.record-button').trigger('click')
    await flushPromises()

    expect(confirmDialogMock).toHaveBeenCalledWith(
      expect.stringContaining('最旧的一段将被覆盖'),
      expect.objectContaining({confirmText: '继续录制'})
    )
    expect(__instrumentPracticeMocks.recorder.startRecording).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('取消删除确认后保留练习片段且不请求删除', async () => {
    const wrapper = mountPage()
    await flushPromises()
    __instrumentPracticeMocks.recorder.takes.value = [{
      id: 101,
      instrumentId: 'guzheng',
      tuningId: 'd-pentatonic',
      bpm: 80,
      meter: '4/4',
      durationMs: 1000,
      events: [],
      createdAt: 1
    }]
    confirmDialogMock.mockResolvedValueOnce(false)
    await wrapper.get('button[aria-label="打开已保存的练习录音列表"]').trigger('click')
    await wrapper.get('button[aria-label="删除片段"]').trigger('click')
    await flushPromises()

    expect(confirmDialogMock).toHaveBeenCalledWith(
      expect.stringContaining('无法恢复'),
      expect.objectContaining({confirmText: '删除', cancelText: '保留'})
    )
    expect(__instrumentPracticeMocks.recorder.deleteTake).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('录音片段展示录制完成时间', async () => {
    const completedAt = new Date(2026, 6, 26, 20, 13).getTime()
    const wrapper = mountPage()
    await flushPromises()
    __instrumentPracticeMocks.recorder.takes.value = [{
      id: 102,
      instrumentId: 'guzheng',
      tuningId: 'd-pentatonic',
      bpm: 80,
      meter: '4/4',
      durationMs: 1000,
      events: [],
      createdAt: completedAt
    }]
    await wrapper.vm.$nextTick()

    await wrapper.get('button[aria-label="打开已保存的练习录音列表"]').trigger('click')

    expect(wrapper.get('.take-copy').text()).toContain('完成于 2026-07-26 20:13')
    wrapper.unmount()
  })

  it('录音列表只展示当前乐器片段', async () => {
    const wrapper = mountPage()
    await flushPromises()
    __instrumentPracticeMocks.recorder.takes.value = [
      {
        id: 201,
        instrumentId: 'guzheng',
        tuningId: 'd-pentatonic',
        bpm: 80,
        meter: '4/4',
        durationMs: 1000,
        events: [],
        createdAt: 1
      },
      {
        id: 202,
        instrumentId: 'guitar',
        tuningId: 'standard',
        bpm: 96,
        meter: '3/4',
        durationMs: 2000,
        events: [],
        createdAt: 2
      }
    ]
    await wrapper.vm.$nextTick()

    await wrapper.get('button[aria-label="打开已保存的练习录音列表"]').trigger('click')

    expect(wrapper.findAll('.take-card')).toHaveLength(1)
    expect(wrapper.get('[role="dialog"]').text()).toContain('D 调')
    expect(wrapper.get('[role="dialog"]').text()).not.toContain('标准 EADGBE')
    wrapper.unmount()
  })

  it('回放片段时关闭列表并进入琴面演示', async () => {
    const wrapper = mountPage()
    await flushPromises()
    __instrumentPracticeMocks.recorder.takes.value = [{
      id: 203,
      instrumentId: 'guzheng',
      tuningId: 'g-pentatonic',
      bpm: 80,
      meter: '4/4',
      durationMs: 1000,
      events: [{at: 0, type: 'note', instrumentId: 'guzheng', stringId: 'string-1', midi: 43}],
      createdAt: 3
    }]
    await wrapper.vm.$nextTick()

    await wrapper.get('button[aria-label="打开已保存的练习录音列表"]').trigger('click')
    await wrapper.get('button[aria-label="回放片段"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(__instrumentPracticeMocks.recorder.replayTake).toHaveBeenCalledWith(203)
    expect(wrapper.get('[data-test="guzheng-surface"]').attributes('tuning-id')).toBe('g-pentatonic')
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
