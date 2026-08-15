// @vitest-environment happy-dom

import {flushPromises, mount} from '@vue/test-utils'
import {nextTick} from 'vue'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import WowCharacterStats from '../WowCharacterStats.vue'
import {listDataDictionaryOptionsByUsage} from '@/api/dataDictionary'
import {
  getWowCharacterOverview,
  getWowSeasonInfo,
  listWowCharacters,
  resetAllWowCharacterWeeklyProgress,
  resetWowCharacterWeeklyProgress,
  saveWowCharacterWeeklyVault,
  updateWowCharacter
} from '@/api/wowCharacter'
import {confirmDialog} from '@/components/systemDialog'

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
  getWowSeasonInfo: vi.fn(),
  listWowCharacterMythicSeasonHistory: vi.fn(),
  listWowCharacters: vi.fn(),
  resetAllWowCharacterWeeklyProgress: vi.fn(),
  resetWowMythicSeason: vi.fn(),
  resetWowCharacterWeeklyProgress: vi.fn(),
  saveWowCharacterWeeklyVault: vi.fn(),
  updateWowCharacter: vi.fn()
}))

vi.mock('@/components/systemDialog', () => ({
  confirmDialog: vi.fn()
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
  getWowSeasonInfo.mockResolvedValue(buildApiResponse({highlights: [], dungeons: []}))
  confirmDialog.mockResolvedValue(true)
  resetAllWowCharacterWeeklyProgress.mockResolvedValue(buildApiResponse(0))
  resetWowCharacterWeeklyProgress.mockResolvedValue(buildApiResponse({}))
  saveWowCharacterWeeklyVault.mockResolvedValue(buildApiResponse({}))
  updateWowCharacter.mockResolvedValue(buildApiResponse({}))
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

  it('打开角色详情时使用重置后的本周低保与大秘钥匙数据', async () => {
    resetWowCharacterWeeklyProgress.mockResolvedValue(buildApiResponse({
      id: 7,
      characterName: '风渐渐',
      level: 90,
      mythicBestLevel: 0,
      mythicDungeonName: null,
      weeklyVaults: [{
        id: 11,
        weekStartDate: '2026-08-06',
        raidProgressCount: 0,
        mythicProgressCount: 0,
        worldProgressCount: 0
      }]
    }))
    const wrapper = mount(WowCharacterStats, {
      attachTo: document.body,
      global: {stubs: {transition: true}}
    })
    mountedWrappers.push(wrapper)
    await flushPromises()

    await wrapper.vm.openEditDialog({id: 7, characterName: '旧数据', level: 90})

    expect(resetWowCharacterWeeklyProgress).toHaveBeenCalledWith(7)
    expect(wrapper.vm.form.characterName).toBe('风渐渐')
    expect(wrapper.vm.form.mythicBestLevel).toBe(0)
    expect(wrapper.vm.form.mythicDungeonName).toBe('')
    expect(wrapper.vm.form.weeklyVaults).toMatchObject([{weekStartDate: '2026-08-06'}])
  })

  it('低保快捷弹窗加载本周记录并单独保存进度', async () => {
    const weeklyCharacter = {
      id: 7,
      characterName: '风渐渐',
      level: 90,
      className: '法师',
      specName: '冰霜',
      raceName: '人类',
      realmName: '影之哀伤',
      faction: 'ALLIANCE',
      itemLevel: 700,
      mythicBestLevel: 0,
      mythicDungeonName: '旧赛季副本',
      mythicRuns: [],
      keybindings: [],
      macros: [],
      weeklyVaults: [{
        id: 11,
        weekStartDate: '2026-08-06',
        raidProgressCount: 1,
        mythicProgressCount: 2,
        worldProgressCount: 6
      }]
    }
    resetWowCharacterWeeklyProgress.mockResolvedValue(buildApiResponse(weeklyCharacter))
    saveWowCharacterWeeklyVault.mockResolvedValue(buildApiResponse({}))
    const wrapper = mount(WowCharacterStats, {
      attachTo: document.body,
      global: {stubs: {transition: true}}
    })
    mountedWrappers.push(wrapper)
    await flushPromises()

    await wrapper.vm.openWeeklyVaultDialog({id: 7, level: 90})

    expect(wrapper.vm.showWeeklyVaultDialog).toBe(true)
    expect(wrapper.vm.quickWeeklyVault).toMatchObject({
      weekStartDate: '2026-08-06',
      raidProgressCount: 1,
      mythicProgressCount: 2,
      worldProgressCount: 6
    })

    wrapper.vm.quickWeeklyVault.mythicProgressCount = 4
    await wrapper.vm.saveWeeklyVaultDialog()

    expect(saveWowCharacterWeeklyVault).toHaveBeenCalledWith(7, {
      id: 11,
      weekStartDate: '2026-08-06',
      raidProgressCount: 1,
      mythicProgressCount: 4,
      worldProgressCount: 6,
      note: '',
      attachmentIds: []
    })
    expect(updateWowCharacter).not.toHaveBeenCalled()
    expect(wrapper.vm.showWeeklyVaultDialog).toBe(false)
  })

  it('概览统计点击后同步设置角色列表筛选条件', async () => {
    const wrapper = mount(WowCharacterStats, {
      attachTo: document.body,
      global: {stubs: {transition: true}}
    })
    mountedWrappers.push(wrapper)
    await flushPromises()
    wrapper.vm.factionOptions = [{value: 'ALLIANCE', label: '联盟'}]
    wrapper.vm.classOptions = [{value: '法师', label: '法师'}]

    await wrapper.vm.applyInsightFilter('faction', '联盟')
    expect(wrapper.vm.query.faction).toBe('ALLIANCE')
    expect(listWowCharacters).toHaveBeenLastCalledWith(expect.objectContaining({faction: 'ALLIANCE'}))

    await wrapper.vm.applyInsightFilter('className', '法师')
    expect(wrapper.vm.query.className).toBe('法师')
    expect(listWowCharacters).toHaveBeenLastCalledWith(expect.objectContaining({className: '法师'}))

    await wrapper.vm.applyInsightFilter('realmName', '影之哀伤')
    expect(wrapper.vm.query.realmName).toBe('影之哀伤')
    expect(listWowCharacters).toHaveBeenLastCalledWith(expect.objectContaining({realmName: '影之哀伤'}))

    await wrapper.vm.applyInsightFilter('realmName', '影之哀伤')
    expect(wrapper.vm.query.realmName).toBe('')
    expect(listWowCharacters).toHaveBeenLastCalledWith(expect.objectContaining({realmName: undefined}))
  })

  it('批量重置低保后刷新角色列表与概览', async () => {
    resetAllWowCharacterWeeklyProgress.mockResolvedValue(buildApiResponse(2))
    const wrapper = mount(WowCharacterStats, {
      attachTo: document.body,
      global: {stubs: {transition: true}}
    })
    mountedWrappers.push(wrapper)
    await flushPromises()
    listWowCharacters.mockClear()
    getWowCharacterOverview.mockClear()

    await wrapper.vm.resetAllWeeklyVaults()

    expect(confirmDialog).toHaveBeenCalledWith(
      expect.stringContaining('清空所有满级角色'),
      expect.objectContaining({confirmText: '确认重置'})
    )
    expect(resetAllWowCharacterWeeklyProgress).toHaveBeenCalledTimes(1)
    expect(listWowCharacters).toHaveBeenCalledTimes(1)
    expect(getWowCharacterOverview).toHaveBeenCalledTimes(1)
    expect(globalThis.alert).toHaveBeenCalledWith('已重置 2 个满级角色的低保数据')
  })
})
