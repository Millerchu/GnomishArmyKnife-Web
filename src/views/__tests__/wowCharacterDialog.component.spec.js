// @vitest-environment happy-dom

import {flushPromises, mount} from '@vue/test-utils'
import {nextTick} from 'vue'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import WowCharacterStats from '../WowCharacterStats.vue'
import {listDataDictionaryOptionsByUsage} from '@/api/dataDictionary'
import {getWowCharacterOverview, listWowCharacters} from '@/api/wowCharacter'

const mountedWrappers = []

vi.mock('vue-router', () => ({
  useRouter: () => ({push: vi.fn()})
}))

vi.mock('@/api/dataDictionary', () => ({
  listDataDictionaryOptionsByUsage: vi.fn()
}))

vi.mock('@/api/wowCharacter', () => ({
  createWowCharacter: vi.fn(),
  deleteWowCharacter: vi.fn(),
  getWowCharacterOverview: vi.fn(),
  listWowCharacters: vi.fn(),
  updateWowCharacter: vi.fn()
}))

function buildApiResponse(payload) {
  return {data: {code: 200, message: 'success', data: payload}}
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal('alert', vi.fn())
  listDataDictionaryOptionsByUsage.mockResolvedValue(buildApiResponse([]))
  listWowCharacters.mockResolvedValue(buildApiResponse({list: [], total: 0}))
  getWowCharacterOverview.mockResolvedValue(buildApiResponse({}))
})

afterEach(() => {
  while (mountedWrappers.length > 0) {
    mountedWrappers.pop().unmount()
  }
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

describe('WowCharacterStats MacDialog integration', () => {
  it('Escape 依次关闭键位弹窗与主弹窗，并保留主表单状态', async () => {
    const wrapper = mount(WowCharacterStats, {
      attachTo: document.body,
      global: {stubs: {transition: true}}
    })
    mountedWrappers.push(wrapper)
    await flushPromises()

    wrapper.vm.openCreateDialog()
    wrapper.vm.form.characterName = '风渐渐'
    wrapper.vm.openKeybindingDialog({
      bindingName: '团本输出',
      bindingContent: 'SHIFT-1'
    })
    await nextTick()
    await nextTick()

    expect(document.body.querySelector('.mac-dialog-panel.wow-character-dialog')).not.toBeNull()
    expect(document.body.querySelector('.mac-dialog-panel.wow-keybinding-dialog')).not.toBeNull()

    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}))
    await nextTick()

    expect(document.body.querySelector('.mac-dialog-panel.wow-keybinding-dialog')).toBeNull()
    expect(document.body.querySelector('.mac-dialog-panel.wow-character-dialog')).not.toBeNull()
    expect(wrapper.vm.form.characterName).toBe('风渐渐')

    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}))
    await nextTick()

    expect(document.body.querySelector('.mac-dialog-panel.wow-character-dialog')).toBeNull()
  })

  it('可以保存多套用户命名的键位方案', async () => {
    const wrapper = mount(WowCharacterStats, {
      attachTo: document.body,
      global: {stubs: {transition: true}}
    })
    mountedWrappers.push(wrapper)
    await flushPromises()

    wrapper.vm.openCreateDialog()
    wrapper.vm.openKeybindingDialog()
    wrapper.vm.activeKeybinding.bindingName = '团本治疗'
    wrapper.vm.activeKeybinding.bindingContent = 'RAID-BINDINGS'
    wrapper.vm.saveActiveKeybinding()

    wrapper.vm.openKeybindingDialog()
    wrapper.vm.activeKeybinding.bindingName = '大秘境治疗'
    wrapper.vm.activeKeybinding.bindingContent = 'MYTHIC-BINDINGS'
    wrapper.vm.saveActiveKeybinding()

    expect(wrapper.vm.form.keybindings).toHaveLength(2)
    expect(wrapper.vm.form.keybindings.map((item) => item.bindingName)).toEqual(['团本治疗', '大秘境治疗'])
    expect(wrapper.vm.form.keybindings.every((item) => item.hasKeybinding)).toBe(true)
  })
})
