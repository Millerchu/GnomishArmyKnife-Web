// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import QuickCreateDialog from '../QuickCreateDialog.vue'
import { resolveQuickCreateTypes } from '@/constants/quickCreateRegistry'
import { createPersonalBill, listPersonalBankCards } from '@/api/personalBills'
import { listDataDictionaryOptionsByUsage } from '@/api/dataDictionary'

vi.mock('@/api/personalBills', () => ({
  listPersonalBankCards: vi.fn(),
  createPersonalBill: vi.fn(),
  createAnnualBudget: vi.fn()
}))
vi.mock('@/api/dataDictionary', () => ({ listDataDictionaryOptionsByUsage: vi.fn() }))

const cardId = '9007199254740993'
const cards = [{ id: cardId, cardType: 'CREDIT', cardName: '日常信用卡', institution: '测试银行', lastFour: '0123' }]
const response = data => ({ data: { code: '0', data } })
let wrapper

beforeEach(() => {
  listPersonalBankCards.mockResolvedValue(response(cards))
  createPersonalBill.mockResolvedValue(response({}))
  listDataDictionaryOptionsByUsage.mockImplementation(({ bizFieldCode }) => {
    const value = bizFieldCode === 'paymentMethod' ? '微信支付' : '餐饮'
    return Promise.resolve(response([{ itemLabel: value, itemValue: value, isDefault: true }]))
  })
})

afterEach(() => {
  wrapper?.unmount()
  vi.resetAllMocks()
})

async function open() {
  wrapper = mount(QuickCreateDialog, {
    props: {
      modelValue: true,
      initialTypeCode: 'PERSONAL_BILL',
      types: resolveQuickCreateTypes(['APP_PERSONAL_BILLS'])
    },
    global: { stubs: { MacDialog: { template: '<div><slot/><slot name="footer"/></div>' } } }
  })
  await flushPromises()
  await wrapper.get('.field-amount input').setValue('12.5')
}

it('快速记一笔保留完整银行卡 ID，支付方式独立提交', async () => {
  await open()
  expect(wrapper.get('.field-accountName optgroup').attributes('label')).toBe('信用卡')
  await wrapper.get('.field-accountName select').setValue(cardId)
  await wrapper.get('#quick-create-form').trigger('submit')

  expect(createPersonalBill).toHaveBeenCalledWith(expect.objectContaining({
    bankCardId: cardId, accountName: '', paymentMethod: '微信支付', amount: 12.5
  }))
})

it('选卡失败时可重试，也可当场手填并提交', async () => {
  listPersonalBankCards.mockRejectedValueOnce(new Error('network error'))
  await open()
  expect(wrapper.get('.field-accountName [role="alert"]').text()).toContain('银行卡加载失败')
  await wrapper.get('.field-accountName select').setValue('manual')
  await wrapper.get('[aria-label="手填资金账户"]').setValue(' 微信零钱 ')
  await wrapper.get('.field-accountName button').trigger('click')
  await flushPromises()
  expect(wrapper.get('.field-accountName optgroup').text()).toContain('日常信用卡')
  await wrapper.get('#quick-create-form').trigger('submit')

  expect(createPersonalBill).toHaveBeenCalledWith(expect.objectContaining({
    bankCardId: null, accountName: '微信零钱'
  }))
})
