// @vitest-environment happy-dom

import {mount} from '@vue/test-utils'
import {describe, expect, it} from 'vitest'

import NumberedScoreSheet from '@/features/instrument-practice/components/NumberedScoreSheet.vue'
import {createDefaultNumberedScoreDraft} from '@/features/instrument-practice/score/numberedScore.js'

function mountSheet(draftOverrides = {}) {
  return mount(NumberedScoreSheet, {
    props: {
      draft: {
        ...createDefaultNumberedScoreDraft(),
        ...draftOverrides
      },
      'onUpdate:draft': async (draft) => {
        await wrapper.setProps({draft})
      }
    }
  })
}

let wrapper

describe('简谱编辑与乐器选择 Sheet', () => {
  it('粘贴时实时定位错误并禁用开始按钮', async () => {
    wrapper = mountSheet()
    await wrapper.get('textarea').setValue('1 2 @ 3')

    expect(wrapper.get('.error-list').text()).toContain('无法识别')
    expect(wrapper.get('.start-score-button').attributes()).toHaveProperty('disabled')
    wrapper.unmount()
  })

  it('保留小节警告，选择调弦后提交可演奏序列输入', async () => {
    wrapper = mountSheet({notation: '1 2 | 3 4'})
    expect(wrapper.get('.warning-list').text()).toContain('第 1 小节')

    await wrapper.get('.instrument-card-grid button:nth-child(2)').trigger('click')
    expect(wrapper.props('draft').instrumentId).toBe('guitar')
    expect(wrapper.props('draft').tuningId).toBe('standard')
    expect(wrapper.get('.start-score-button').attributes('disabled')).toBeUndefined()

    await wrapper.get('.start-score-button').trigger('click')
    expect(wrapper.emitted('play')).toHaveLength(1)
    expect(wrapper.emitted('play')[0][0]).toEqual(expect.objectContaining({
      draft: expect.objectContaining({instrumentId: 'guitar', tuningId: 'standard'}),
      parsedScore: expect.objectContaining({valid: true, noteCount: 4})
    }))
    wrapper.unmount()
  })
})
