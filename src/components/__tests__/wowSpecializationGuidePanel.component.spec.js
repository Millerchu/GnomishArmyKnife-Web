// @vitest-environment happy-dom

import {flushPromises, mount} from '@vue/test-utils'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import WowSpecializationGuidePanel from '@/components/wow/WowSpecializationGuidePanel.vue'
import {listWowSpecializationGuides} from '@/api/wowCharacter'

vi.mock('@/api/wowCharacter', () => ({
  listWowSpecializationGuides: vi.fn(),
  updateWowSpecializationGuide: vi.fn()
}))

const guides = [
  {
    id: 1,
    classCode: 'death_knight',
    className: '死亡骑士',
    specCode: 'blood_death_knight',
    specName: '鲜血',
    roleType: 'TANK',
    mythicTalentBuildName: '12.1 大秘境',
    mythicTalentSummary: '大秘境构筑。',
    raidTalentBuildName: '12.1 团本',
    raidTalentSummary: '团本构筑。',
    statPriority: '力量 ＞ 急速 ＞ 暴击',
    rotationNotes: '保持骨盾覆盖。',
    trinketRanking: 'S：饰品甲；A：饰品乙。',
    sourceName: 'Wowhead 12.1.0 职业指南',
    sourceUrl: 'https://www.wowhead.com/guide',
    sourceUpdatedAt: '2026-08-14'
  },
  {
    id: 2,
    classCode: 'priest',
    className: '牧师',
    specCode: 'discipline',
    specName: '戒律',
    roleType: 'HEALER',
    mythicTalentBuildName: '12.1 大秘境',
    raidTalentBuildName: '12.1 团本',
    statPriority: '智力 ＞ 急速',
    sourceName: 'Wowhead',
    sourceUrl: 'https://www.wowhead.com/guide/priest'
  }
]

describe('WoW 职业专精指南面板', () => {
  beforeEach(() => {
    listWowSpecializationGuides.mockResolvedValue({data: {data: guides}})
  })

  it('加载当前赛季专精并展示四类指南信息', async () => {
    const wrapper = mount(WowSpecializationGuidePanel, {
      props: {versionName: '12.1.0', seasonName: '至暗之夜 第2赛季'},
      global: {stubs: {MacDialog: true}}
    })
    await flushPromises()

    expect(listWowSpecializationGuides).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('鲜血')
    expect(wrapper.text()).toContain('主流天赋')
    expect(wrapper.text()).toContain('属性优先级')
    expect(wrapper.text()).toContain('循环手法')
    expect(wrapper.text()).toContain('大秘境')
    expect(wrapper.text()).toContain('团本')
    expect(wrapper.text()).toContain('饰品评分')
    expect(wrapper.get('.guide-source-strip a').attributes('href')).toBe('https://www.wowhead.com/guide')
  })

  it('可以按职责筛选专精', async () => {
    const wrapper = mount(WowSpecializationGuidePanel, {global: {stubs: {MacDialog: true}}})
    await flushPromises()

    const healerButton = wrapper.findAll('.guide-role-filter button').find((button) => button.text().includes('治疗'))
    await healerButton.trigger('click')

    expect(wrapper.text()).toContain('戒律')
    expect(wrapper.find('.guide-dossier-head').text()).toContain('治疗')
  })
})
