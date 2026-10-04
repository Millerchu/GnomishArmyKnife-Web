// @vitest-environment happy-dom
import {writeFileSync, readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {mount, flushPromises} from '@vue/test-utils'
import {it, vi} from 'vitest'
import GrowthRecords from '../GrowthRecords.vue'

// 显式运行的视觉检查导出，不进入应用运行代码；页面样本仅用于排版验证。
vi.mock('vue-router', () => ({useRouter:()=>({push:vi.fn()})}))
vi.mock('@/api/growthRecords', () => {
  const result=data=>({data:{code:'0',data}})
  return {
    ...Object.fromEntries(['Child','Measurement','Vaccination','Milestone'].flatMap(type =>
      ['create','update','delete'].map(action => [`${action}Growth${type}`,vi.fn()]))),
    listGrowthChildren:vi.fn().mockResolvedValue(result([{id:'1',name:'小果冻',birthday:'2021-06-18',gender:'UNKNOWN'}])),
    listGrowthMeasurements:vi.fn().mockResolvedValue(result([
      {id:'11',measureDate:'2026-06-18',heightCm:115,weightKg:20.75,note:'五岁生日测量',recordedBy:'爸爸'},
      {id:'12',measureDate:'2024-06-18',heightCm:99.6,weightKg:15.2,recordedBy:'爸爸'},
      {id:'13',measureDate:'2023-06-19',heightCm:89.4,weightKg:12.8,headCm:48.5,recordedBy:'爸爸'}])),
    listGrowthVaccinations:vi.fn().mockResolvedValue(result([{id:'21',vaccineName:'乙肝疫苗',dose:1,status:'COMPLETED',vaccinationDate:'2021-06-18',institution:'社区接种门诊'}])),
    listGrowthMilestones:vi.fn().mockResolvedValue(result([{id:'31',title:'第一次骑自行车',eventDate:'2026-06-18',note:'五岁的生日礼物，也是一点点勇敢。'}]))
  }
})
it.skipIf(process.env.GAK_GROWTH_VISUAL_QA !== 'true')('导出实际Vue页面结构用于桌面和手机排版检查',async()=>{
  const wrapper=mount(GrowthRecords)
  await flushPromises()
  const css=readFileSync(resolve('src/style.css'),'utf8')+readFileSync(resolve('src/styles/macos-ui.css'),'utf8')+
    ['src/views/GrowthRecords.vue','src/components/GrowthTrendChart.vue','src/components/ThemeToggle.vue'].map(path=>readFileSync(resolve(path),'utf8').match(/<style scoped>([\s\S]*?)<\/style>/)[1]).join('\n')
  const markup=wrapper.html().replaceAll('/app-icons/app-growth-record.svg','/app-growth-record.svg')
  writeFileSync(resolve('../../docs/qa/yaji-ui.html'),`<!doctype html><html lang="zh-CN" data-theme="dark"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>芽记 Vue 页面视觉检查 · 示例数据</title><style>${css}\nbody{height:auto}.growth-page{height:auto}</style>${markup}<script>document.querySelector('.theme-toggle')?.addEventListener('click',()=>{document.documentElement.dataset.theme=document.documentElement.dataset.theme==='light'?'dark':'light'})</script></html>`)
  writeFileSync(resolve('../../docs/qa/app-growth-record.svg'),readFileSync(resolve('public/app-icons/app-growth-record.svg')))
  wrapper.unmount()
})
