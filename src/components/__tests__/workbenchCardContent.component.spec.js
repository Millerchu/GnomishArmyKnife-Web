// @vitest-environment happy-dom
import {mount} from '@vue/test-utils'
import {nextTick} from 'vue'
import {expect, it, vi} from 'vitest'
import WorkbenchCardContent from '../workbench/WorkbenchCardContent.vue'

it('摘要溢出时可聚焦滚动且只在有剩余内容的边缘淡出，内容变短后取消提示', async () => {
  let resized
  const disconnect = vi.fn()
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback) { resized = callback }
    observe() {}
    disconnect() { disconnect() }
  })
  const wrapper = mount(WorkbenchCardContent, {slots: {default: '<div class="wb-card-body">摘要内容</div>'}})
  try {
    const element = wrapper.element
    let total = 500
    Object.defineProperties(element, {scrollHeight: {get: () => total}, clientHeight: {value: 200}})
    resized(); await nextTick()
    expect(wrapper.classes()).toContain('can-scroll-down')
    expect(wrapper.classes()).not.toContain('can-scroll-up')
    expect(wrapper.attributes('tabindex')).toBe('0')
    element.scrollTop = 100; await wrapper.trigger('scroll')
    expect(wrapper.classes()).toEqual(expect.arrayContaining(['can-scroll-up', 'can-scroll-down']))
    element.scrollTop = 300; await wrapper.trigger('scroll')
    expect(wrapper.classes()).toContain('can-scroll-up')
    expect(wrapper.classes()).not.toContain('can-scroll-down')
    total = 180; element.scrollTop = 0; resized(); await nextTick()
    expect(wrapper.classes()).toEqual(['wb-card-content'])
    expect(wrapper.attributes('tabindex')).toBeUndefined()
  } finally {
    wrapper.unmount()
    expect(disconnect).toHaveBeenCalledOnce()
    vi.unstubAllGlobals()
  }
})
