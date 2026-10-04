// @vitest-environment happy-dom
import {mount, flushPromises} from '@vue/test-utils'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import GrowthRecords from '../GrowthRecords.vue'

const api = vi.hoisted(() => Object.fromEntries([
  'listGrowthChildren','createGrowthChild','updateGrowthChild','deleteGrowthChild',
  'listGrowthMeasurements','createGrowthMeasurement','updateGrowthMeasurement','deleteGrowthMeasurement',
  'listGrowthVaccinations','createGrowthVaccination','updateGrowthVaccination','deleteGrowthVaccination',
  'listGrowthMilestones','createGrowthMilestone','updateGrowthMilestone','deleteGrowthMilestone'
].map(name => [name,vi.fn()])))
const confirm = vi.hoisted(() => vi.fn())
vi.mock('@/api/growthRecords', () => api)
vi.mock('@/components/systemDialog', () => ({confirmDialog:confirm}))
vi.mock('vue-router', () => ({useRouter:()=>({push:vi.fn()})}))
const result = data => ({data:{code:'0',data}})
const child = {id:'900000000000000111',name:'小果冻',birthday:'2021-06-18',gender:'UNKNOWN'}
const second = {id:'900000000000000112',name:'小布丁',birthday:'2023-01-01',gender:'GIRL'}
const measure = {id:'900000000000000221',childId:child.id,measureDate:'2024-06-18',heightCm:99.6,weightKg:15.2,headCm:null}
let wrapper
function page() {
  wrapper = mount(GrowthRecords,{global:{stubs:{ThemeToggle:true,
    MacDialog:{props:['modelValue','title'],template:'<div v-if="modelValue" role="dialog"><h3>{{ title }}</h3><slot/><slot name="footer"/></div>'}}}})
  return wrapper
}
function button(text) { return wrapper.findAll('button').find(item => item.text() === text) }
beforeEach(() => {
  vi.resetAllMocks()
  api.listGrowthChildren.mockResolvedValue(result([child]))
  api.listGrowthMeasurements.mockResolvedValue(result([measure]))
  api.listGrowthVaccinations.mockResolvedValue(result([]))
  api.listGrowthMilestones.mockResolvedValue(result([]))
  confirm.mockResolvedValue(true)
})
afterEach(() => wrapper?.unmount())

describe('芽记真实接口交互', () => {
  it('没有宝宝时提供首次建档，成功后加载该宝宝记录', async () => {
    api.listGrowthChildren.mockResolvedValue(result([]))
    api.createGrowthChild.mockResolvedValue(result(child))
    page(); await flushPromises()
    await button('＋ 新建宝宝档案').trigger('click')
    await wrapper.find('input[maxlength="64"]').setValue('小果冻')
    await wrapper.find('input[type="date"]').setValue('2021-06-18')
    await wrapper.find('#growth-record-form').trigger('submit')
    await flushPromises()
    expect(api.createGrowthChild).toHaveBeenCalledWith({name:'小果冻',birthday:'2021-06-18',gender:'UNKNOWN',note:null})
    expect(api.listGrowthMeasurements).toHaveBeenCalledWith(child.id)
  })

  it('仅填头围保存，失败时保留内容，再次成功后同步摘要', async () => {
    api.createGrowthMeasurement.mockRejectedValueOnce(new Error('暂时无法保存'))
      .mockResolvedValueOnce(result({id:'333',measureDate:'2025-01-01',headCm:48.5}))
    page(); await flushPromises()
    await button('＋ 记录成长').trigger('click')
    await wrapper.findAll('input[type="number"]')[2].setValue('48.5')
    await wrapper.find('#growth-record-form').trigger('submit'); await flushPromises()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    expect(wrapper.findAll('input[type="number"]')[2].element.value).toBe('48.5')
    expect(wrapper.text()).toContain('暂时无法保存')
    expect(api.createGrowthMeasurement.mock.calls[0][1]).toMatchObject({heightCm:null,weightKg:null,headCm:48.5})
    await wrapper.find('#growth-record-form').trigger('submit'); await flushPromises()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    await button('头围').trigger('click')
    expect(wrapper.find('svg').attributes('aria-label')).toContain('1次测量')
  })

  it('编辑清空体重后显式传null，删除成功后摘要重算', async () => {
    api.updateGrowthMeasurement.mockResolvedValue(result({...measure,weightKg:null}))
    api.deleteGrowthMeasurement.mockResolvedValue(result(null))
    page(); await flushPromises()
    await button('生长记录').trigger('click')
    await button('编辑').trigger('click')
    await wrapper.findAll('input[type="number"]')[1].setValue('')
    await wrapper.find('#growth-record-form').trigger('submit'); await flushPromises()
    expect(api.updateGrowthMeasurement).toHaveBeenCalledWith(child.id,measure.id,expect.objectContaining({weightKg:null}))
    await button('删除').trigger('click'); await flushPromises()
    expect(api.deleteGrowthMeasurement).toHaveBeenCalledWith(child.id,measure.id)
    expect(wrapper.text()).toContain('还没有生长记录')
  })

  it('切换宝宝后迟到的上一份响应不能覆盖当前记录', async () => {
    let resolveFirst
    api.listGrowthChildren.mockResolvedValue(result([child,second]))
    api.listGrowthMeasurements.mockImplementation(id => id === child.id
      ? new Promise(resolve => {resolveFirst=resolve}) : Promise.resolve(result([{id:'222',measureDate:'2024-01-01',heightCm:70}])))
    page(); await flushPromises()
    await wrapper.find('select[aria-label="切换宝宝"]').setValue(second.id)
    await flushPromises()
    resolveFirst(result([measure])); await flushPromises()
    expect(wrapper.text()).toContain('小布丁')
    expect(wrapper.find('.summary-card').text()).toContain('70')
    expect(wrapper.find('.summary-card').text()).not.toContain('99.6')
  })

  it('接种计划编辑为已接种，成功后移动至已接种列表', async () => {
    const plan={id:'77',vaccineName:'预约疫苗',dose:1,status:'PLANNED',vaccinationDate:'2025-06-18'}
    api.listGrowthVaccinations.mockResolvedValue(result([plan]))
    api.updateGrowthVaccination.mockResolvedValue(result({...plan,status:'COMPLETED'}))
    page(); await flushPromises()
    await button('接种记录').trigger('click')
    await button('待接种 · 1').trigger('click')
    await button('编辑 / 确认接种').trigger('click')
    const select=wrapper.find('[role="dialog"] select')
    await select.setValue('COMPLETED')
    await wrapper.find('#growth-record-form').trigger('submit'); await flushPromises()
    expect(api.updateGrowthVaccination).toHaveBeenCalledWith(child.id,'77',expect.objectContaining({status:'COMPLETED'}))
    expect(wrapper.text()).toContain('已接种 · 1')
    expect(wrapper.text()).toContain('待接种 · 0')
  })

  it('加载失败提供重试且不提供伪造业务记录', async () => {
    api.listGrowthMeasurements.mockRejectedValueOnce(new Error('网络异常'))
    page(); await flushPromises()
    expect(wrapper.text()).toContain('网络异常')
    expect(wrapper.find('.summary-card').exists()).toBe(false)
    await button('重试加载').trigger('click'); await flushPromises()
    expect(wrapper.find('.summary-card').text()).toContain('99.6')
  })
})
