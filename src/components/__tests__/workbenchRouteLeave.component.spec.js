// @vitest-environment happy-dom
import {defineComponent} from 'vue'
import {createMemoryHistory, createRouter, RouterView} from 'vue-router'
import {flushPromises, mount} from '@vue/test-utils'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import WorkbenchPanel from '../workbench/WorkbenchPanel.vue'
import SystemDialogHost from '../SystemDialogHost.vue'

vi.mock('@/api/workbenchPreference', () => ({
  getWorkbenchPreferences: vi.fn(async () => ({data: {code: '0', data: {version: 0, schemaVersion: 1, payload: null}}})),
  saveWorkbenchPreferences: vi.fn(async ({version, payload}) => ({data: {code: '0', data: {version: version + 1, schemaVersion: 1, payload}}}))
}))
vi.mock('grid-layout-plus', async () => {
  const {defineComponent} = await import('vue')
  return {GridLayout: defineComponent({template: '<div><slot/></div>'}), GridItem: defineComponent({template: '<div><slot/></div>'})}
})
const wrappers = []
async function page() {
  const router = createRouter({history: createMemoryHistory(), routes: [
    {path: '/home', component: WorkbenchPanel, props: {source: 'backend', featureCodes: ['APP_HEALTH_RECORD'], tools: [{key: 'health-record', featureCode: 'APP_HEALTH_RECORD'}]}},
    {path: '/other', component: {template: '<div>其他应用</div>'}}
  ]})
  await router.push('/home'); await router.isReady()
  const wrapper = mount(defineComponent({components: {RouterView, SystemDialogHost}, template: '<RouterView/><SystemDialogHost/>'}), {
    attachTo: document.body, global: {plugins: [router], stubs: {HealthCard: {template: '<div/>'}}}
  })
  wrappers.push(wrapper); await flushPromises()
  return {wrapper, router}
}
beforeEach(() => { localStorage.clear(); localStorage.setItem('token', 'test-token'); localStorage.setItem('user', '{"id":"9223372036854775807"}') })
afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()); document.body.innerHTML = '' })
it.each([true, false])('有未保存草稿离开时系统确认框，选择 %s 决定路由是否离开', async accepted => {
  const {wrapper, router} = await page()
  await wrapper.get('.wb-heading [aria-pressed]').trigger('click')
  await wrapper.get('[aria-label="显示健康"]').setValue(false)
  const navigation = router.push('/other'); await flushPromises()
  const dialog = document.querySelector('[role="alertdialog"]')
  expect(dialog.textContent).toContain('放弃未保存的整理？')
  expect(router.currentRoute.value.path).toBe('/home')
  expect(document.activeElement.textContent.trim()).toBe('继续整理')
  dialog.querySelector(accepted ? '.primary' : '.secondary').click()
  await navigation; await flushPromises()
  expect(router.currentRoute.value.path).toBe(accepted ? '/other' : '/home')
  if (!accepted) {
    expect(wrapper.get('[aria-label="显示健康"]').element.checked).toBe(false)
    expect(wrapper.text()).toContain('有未保存更改')
  }
})
it('未修改的整理草稿可直接离开', async () => {
  const {wrapper, router} = await page()
  await wrapper.get('.wb-heading [aria-pressed]').trigger('click')
  await router.push('/other'); await flushPromises()
  expect(router.currentRoute.value.path).toBe('/other')
  expect(document.querySelector('[role="alertdialog"]')).toBeNull()
})
