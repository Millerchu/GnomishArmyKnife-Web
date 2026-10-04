import test from 'node:test'
import assert from 'node:assert/strict'
import {ageText, dateStamp, metricSummary, measurementHistory, growthPayload} from '../growthRecords.js'

test('年龄按记录日计算并支持月末、闰年和非法日期', () => {
  assert.equal(ageText('2021-06-18','2026-06-18'),'5 岁')
  assert.equal(ageText('2021-06-18','2023-12-10'),'2 岁 5 个月 22 天')
  assert.equal(ageText('2021-06-18','2021-06-18'),'出生当天')
  assert.equal(ageText('2024-02-29','2025-02-28'),'1 岁')
  assert.equal(ageText('2024-01-31','2024-02-29'),'1 个月')
  assert.equal(ageText('2024-03-01','2024-02-29'),'—')
  assert.equal(Number.isNaN(dateStamp('2024-02-30')), true)
})

test('稀疏指标按各自前一条有效测量比较，头围不转零', () => {
  const records = [{id:'1',measureDate:'2023-01-01',heightCm:80,weightKg:10},
    {id:'2',measureDate:'2024-01-01',headCm:48.5,weightKg:null},
    {id:'3',measureDate:'2025-01-01',heightCm:100,weightKg:15}]
  assert.deepEqual(metricSummary(records,'headCm'),{value:48.5,date:'2024-01-01',count:1,delta:null})
  assert.equal(metricSummary(records,'weightKg').delta,5)
  assert.deepEqual(measurementHistory(records)[0].deltas,{heightCm:20,weightKg:5})
  assert.deepEqual(measurementHistory(records)[1].deltas,{})
  assert.equal(measurementHistory(records).filter(r => r.measureDate.startsWith('2025'))[0].deltas.heightCm,20)
})

test('同日以时间、字符串ID稳定排序，超大ID不损失精度', () => {
  const records = [{id:'900000000000000112',measureDate:'2024-01-01',heightCm:100},
    {id:'900000000000000111',measureDate:'2024-01-01',heightCm:99}]
  assert.equal(measurementHistory(records)[0].id,'900000000000000112')
  assert.equal(measurementHistory(records)[0].deltas.heightCm,1)
})

test('编辑可选指标清空时显式传null，不把空值写成0', () => {
  assert.deepEqual(growthPayload('measurement',{measureDate:'2024-06-18',heightCm:'',weightKg:'15.2',headCm:null,recordedBy:'',note:' '}),
    {measureDate:'2024-06-18',heightCm:null,weightKg:15.2,headCm:null,recordedBy:null,note:null})
})
