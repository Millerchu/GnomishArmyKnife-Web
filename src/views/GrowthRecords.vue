<template>
  <main class="growth-page">
    <nav class="page-nav"><button class="back-home-btn" @click="router.push('/home')"><span>←</span> 返回桌面</button><div class="nav-right"><small>个人生活 · 芽记</small><ThemeToggle /></div></nav>
    <header class="hero-panel">
      <div class="app-heading"><img :src="logoUrl" alt="芽记" /><div><h1 class="page-title">芽记 <span>成长记录</span></h1><p class="page-subtitle">管理宝宝档案、生长测量、接种记录和成长里程碑。</p></div></div>
      <div class="hero-tags"><span class="hero-tag">宝宝档案 {{ children.length }}</span><span v-if="measurements.length" class="hero-tag">最近测量 {{ history[0]?.measureDate }}</span></div>
    </header>
    <p v-if="error" class="surface-notice error" role="alert">{{ error }} <button class="link" :disabled="busy" @click="retry">重试加载</button></p>
    <p v-if="notice" class="surface-notice" role="status">{{ notice }}</p>
    <div v-if="loadingChildren" class="panel-section empty-state" role="status">正在读取宝宝档案…</div>
    <section v-else-if="!children.length && !error" class="panel-section empty-state"><h2>为宝宝建立第一份成长档案</h2><p>填写昵称和出生日期，开始记录每一次长大。</p><button class="action-btn" :disabled="busy" @click="openEditor('child')">＋ 新建宝宝档案</button></section>
    <template v-if="child && !loadingChildren">
      <section class="profile-panel">
        <div class="child-avatar">{{ child.name.slice(0, 1) }}</div><div class="child-copy"><h2>{{ child.name }} <span class="type-chip">{{ ageText(child.birthday) }}</span></h2><p>{{ child.birthday }} 出生 · {{ genderLabels[child.gender] || '暂不填写' }}</p></div>
        <div class="profile-actions"><select :value="selectedId" aria-label="切换宝宝" :disabled="busy || editorOpen" @change="selectedId = $event.target.value"><option v-for="item in children" :key="item.id" :value="String(item.id)">{{ item.name }}</option></select><button class="ghost-btn" :disabled="busy" @click="openEditor('child', child)">编辑档案</button><button class="ghost-btn" :disabled="busy" @click="openEditor('child')">新增宝宝</button><button class="action-btn" :disabled="busy || loadingRecords || !!recordsError" @click="openEditor('measurement')">＋ 记录成长</button></div>
      </section>
      <nav class="view-switch" aria-label="成长应用导航"><button v-for="item in tabs" :key="item.key" :class="{active: tab === item.key}" @click="tab = item.key">{{ item.label }}</button></nav>
      <p v-if="recordsError" class="surface-notice error" role="alert">{{ recordsError }} <button class="link" :disabled="busy" @click="loadRecords(selectedId)">重试加载</button></p>
      <div v-if="loadingRecords" class="panel-section empty-state" role="status">正在读取成长记录…</div>
      <template v-else-if="!recordsError">
        <section v-if="tab === 'overview'" class="overview">
          <div class="summary-grid"><article v-for="metric in GROWTH_METRICS.slice(0, 2)" :key="metric.key" class="summary-card"><span>最近{{ metric.label }}</span><strong>{{ metricValue(summaries[metric.key].value) }} <small>{{ metric.unit }}</small></strong><p>{{ summaries[metric.key].date || '暂无测量' }}<br>{{ deltaText(summaries[metric.key].delta) }}<template v-if="summaries[metric.key].delta != null"> {{ metric.unit }} · 较上次</template></p></article><article class="summary-card"><span>生长记录</span><strong>{{ measurements.length }} <small>次测量</small></strong><p>最近测量 {{ history[0]?.measureDate || '暂无' }}</p></article><article class="summary-card"><span>成长里程碑</span><strong>{{ milestones.length }} <small>个成长事件</small></strong><p>记录每一个值得珍藏的瞬间</p></article></div>
          <div class="overview-columns"><div><section class="panel-section"><div class="panel-head"><h2>生长趋势</h2><div class="trend-switch"><button v-for="metric in GROWTH_METRICS" :key="metric.key" :class="{active: metricKey === metric.key}" @click="metricKey = metric.key">{{ metric.label }}</button></div></div><GrowthTrendChart :records="measurements" :metric="currentMetric" /></section><section class="panel-section"><div class="panel-head"><h2>最近记录</h2><button class="link" @click="tab = 'records'">全部记录 ↗</button></div><div v-if="history.length" class="timeline"><article v-for="record in history.slice(0, 3)" :key="record.id" class="event"><small>{{ record.measureDate }} · {{ ageText(child.birthday, record.measureDate) }}</small><p><template v-for="metric in filledMetrics(record)" :key="metric.key">{{ metric.label }} {{ metricValue(record[metric.key]) }} {{ metric.unit }}　</template></p><small>{{ record.note || '生长测量' }}</small></article></div><p v-else class="empty-state compact">暂无记录，点击“记录成长”添加第一次测量。</p></section></div><aside><section class="panel-section"><div class="panel-head"><h2>成长里程碑</h2><button class="link" @click="tab = 'moments'">全部 ↗</button></div><article v-if="milestones.length" class="moment-card"><strong>{{ milestones[0].title }}</strong><small>{{ milestones[0].eventDate }} · {{ ageText(child.birthday, milestones[0].eventDate) }}</small><p>{{ milestones[0].note }}</p></article><p v-else class="empty-state compact">第一步、第一句话，都值得记下。</p><button class="ghost-btn" :disabled="busy" @click="openEditor('milestone')">＋ 添加里程碑</button></section><section class="panel-section"><div class="panel-head"><h2>接种概览</h2><button class="link" @click="tab = 'vaccines'">查看 ↗</button></div><div class="vaccine-summary"><strong>已接种 {{ completedVaccinations.length }} 次</strong><span>待接种计划 {{ plannedVaccinations.length }} 项</span></div><p v-if="nextPlan" class="panel-tip">最近预约：{{ nextPlan.vaccinationDate }} · {{ nextPlan.vaccineName }}</p><button class="ghost-btn" :disabled="busy" @click="openEditor('vaccination')">＋ 添加接种</button></section><p class="panel-tip safety-tip">生长数据用于记录与回顾，不作健康判定。</p></aside></div>
        </section>
        <section v-else-if="tab === 'records'" class="panel-section">
          <div class="panel-head"><div><h2>生长记录</h2><p class="panel-tip">按测量日期倒序展示，差值与前一次有效测量比较。</p></div><select v-model="year" aria-label="年份筛选"><option value="">全部年份</option><option v-for="value in years" :key="value">{{ value }}</option></select></div>
          <div v-if="filteredHistory.length" class="record-list"><article v-for="record in filteredHistory" :key="record.id" class="record-card"><div class="record-head"><strong>{{ record.measureDate }}</strong><span class="type-chip">{{ ageText(child.birthday, record.measureDate) }}</span></div><div class="record-values"><div v-for="metric in filledMetrics(record)" :key="metric.key"><span>{{ metric.label }}</span><strong>{{ metricValue(record[metric.key]) }} <small>{{ metric.unit }}</small></strong><small>较上次 {{ deltaText(record.deltas[metric.key]) }}<template v-if="record.deltas[metric.key] != null"> {{ metric.unit }}</template></small></div></div><p v-if="record.note" class="record-note">{{ record.note }}</p><div class="record-foot"><small>{{ record.recordedBy || '未填写记录人' }}</small><div><button class="ghost-btn" :disabled="busy" @click="openEditor('measurement', record)">编辑</button><button class="danger-btn" :disabled="busy" @click="remove('measurement', record)">删除</button></div></div></article></div><p v-else class="empty-state">{{ year ? '该年份暂无测量记录。' : '还没有生长记录，点击“记录成长”添加。' }}</p>
        </section>
        <section v-else-if="tab === 'curves'" class="panel-section"><div class="panel-head"><div><h2>成长曲线</h2><p class="panel-tip">按真实日期间隔展示，仅连接已录入的测量点。</p></div><div class="trend-switch"><button v-for="metric in GROWTH_METRICS" :key="metric.key" :class="{active: metricKey === metric.key}" @click="metricKey = metric.key">{{ metric.label }}</button></div></div><GrowthTrendChart :records="measurements" :metric="currentMetric" /><div class="curve-stats"><div><span>最近一次</span><strong>{{ metricValue(summaries[metricKey].value) }} {{ currentMetric.unit }}</strong><small>{{ summaries[metricKey].date || '暂无测量' }}</small></div><div><span>较上次测量</span><strong>{{ deltaText(summaries[metricKey].delta) }}<template v-if="summaries[metricKey].delta != null"> {{ currentMetric.unit }}</template></strong></div><div><span>有效测量</span><strong>{{ summaries[metricKey].count }} 次</strong></div></div></section>
        <section v-else-if="tab === 'vaccines'" class="panel-section"><div class="panel-head"><div><h2>接种记录</h2><p class="panel-tip">按疫苗归类保存，以接种本及接种单位信息为准。</p></div><button class="action-btn" :disabled="busy" @click="openEditor('vaccination')">＋ 添加接种</button></div><div class="trend-switch"><button :class="{active: vaccineStatus === 'COMPLETED'}" @click="vaccineStatus = 'COMPLETED'">已接种 · {{ completedVaccinations.length }}</button><button :class="{active: vaccineStatus === 'PLANNED'}" @click="vaccineStatus = 'PLANNED'">待接种 · {{ plannedVaccinations.length }}</button></div><p class="panel-tip vaccine-tip">接种计划由你填写，不自动推断疫苗种类或接种时间。</p><div v-if="vaccineGroups.length"><section v-for="group in vaccineGroups" :key="group.name" class="vaccine-group"><h3>{{ group.name }}</h3><article v-for="record in group.records" :key="record.id" class="vaccine-row"><div><strong>第 {{ record.dose }} 针</strong><small>{{ record.institution || '未填写接种单位' }}</small><small v-if="record.note">{{ record.note }}</small></div><div>{{ record.vaccinationDate }}<small>{{ vaccineStatus === 'PLANNED' ? '预约日期' : '接种日期' }}</small></div><div class="row-actions"><button class="ghost-btn" :disabled="busy" @click="openEditor('vaccination', record)">{{ vaccineStatus === 'PLANNED' ? '编辑 / 确认接种' : '编辑' }}</button><button class="danger-btn" :disabled="busy" @click="remove('vaccination', record)">删除</button></div></article></section></div><p v-else class="empty-state">{{ vaccineStatus === 'PLANNED' ? '暂无预约计划，收到接种单位通知后可以添加。' : '暂无接种记录，可以补录接种本信息。' }}</p></section>
        <section v-else class="panel-section"><div class="panel-head"><div><h2>成长里程碑</h2><p class="panel-tip">一个日期、一句话，留住成长里的小小高光。</p></div><button class="action-btn" :disabled="busy" @click="openEditor('milestone')">＋ 添加里程碑</button></div><div v-if="milestones.length" class="milestone-grid"><article v-for="record in milestones" :key="record.id" class="record-card"><h3>{{ record.title }}</h3><small>{{ record.eventDate }} · {{ ageText(child.birthday, record.eventDate) }}</small><p class="record-note">{{ record.note }}</p><div class="row-actions"><button class="ghost-btn" :disabled="busy" @click="openEditor('milestone', record)">编辑</button><button class="danger-btn" :disabled="busy" @click="remove('milestone', record)">删除</button></div></article></div><p v-else class="empty-state">还没有里程碑，记下一个难忘的瞬间吧。</p></section>
      </template>
      <footer class="page-footer"><span>芽记 · GAK 成长记录</span><button class="link danger-link" :disabled="busy" @click="remove('child', child)">删除当前宝宝档案</button></footer>
    </template>
    <GrowthRecordEditor v-model:open="editorOpen" v-model:form="form" :kind="editorKind" :title="editorTitle" :baseline="editorBaseline" :birthday="child?.birthday" :saving="saving" :error="formError" @save="save" />
  </main>
</template>

<script setup>
import {computed, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import {useRouter} from 'vue-router'
import * as api from '@/api/growthRecords'
import ThemeToggle from '@/components/ThemeToggle.vue'
import GrowthTrendChart from '@/components/GrowthTrendChart.vue'
import GrowthRecordEditor from '@/components/GrowthRecordEditor.vue'
import {confirmDialog} from '@/components/systemDialog'
import {GROWTH_METRICS, ageText, localToday, hasMetric, metricValue, deltaText, measurementHistory, metricSummary, growthPayload} from '@/utils/growthRecords'

const router = useRouter()
const logoUrl = '/app-icons/app-growth-record.svg'
const tabs = [{key:'overview',label:'成长概览'},{key:'records',label:'生长记录'},{key:'curves',label:'成长曲线'},{key:'vaccines',label:'接种记录'},{key:'moments',label:'成长里程碑'}]
const genderLabels = {BOY:'男孩',GIRL:'女孩',UNKNOWN:'暂不填写'}
const children = ref([]), selectedId = ref(''), loadingChildren = ref(false), error = ref('')
const measurements = ref([]), vaccinations = ref([]), milestones = ref([]), loadingRecords = ref(false), recordsError = ref('')
const tab = ref('overview'), metricKey = ref('heightCm'), year = ref(''), vaccineStatus = ref('COMPLETED')
const notice = ref(''), saving = ref(false), deleting = ref(false)
const editorOpen = ref(false), editorKind = ref('child'), editorId = ref(null), editorChildId = ref(''), editorBaseline = ref(0), form = ref({}), formError = ref('')
let childrenSequence = 0, recordsSequence = 0
const child = computed(() => children.value.find(item => String(item.id) === selectedId.value))
const busy = computed(() => saving.value || deleting.value || loadingChildren.value)
const history = computed(() => measurementHistory(measurements.value))
const summaries = computed(() => Object.fromEntries(GROWTH_METRICS.map(({key}) => [key, metricSummary(measurements.value,key)])))
const currentMetric = computed(() => GROWTH_METRICS.find(metric => metric.key === metricKey.value))
const years = computed(() => [...new Set(history.value.map(record => record.measureDate.slice(0,4)))].sort().reverse())
const filteredHistory = computed(() => history.value.filter(record => !year.value || record.measureDate.startsWith(year.value)))
const completedVaccinations = computed(() => vaccinations.value.filter(record => record.status === 'COMPLETED'))
const plannedVaccinations = computed(() => vaccinations.value.filter(record => record.status === 'PLANNED').sort((a,b) => a.vaccinationDate.localeCompare(b.vaccinationDate)))
const nextPlan = computed(() => plannedVaccinations.value[0])
const vaccineGroups = computed(() => {
  const grouped = new Map()
  const records = vaccineStatus.value === 'PLANNED' ? plannedVaccinations.value : completedVaccinations.value
  for (const record of records) {
    if (!grouped.has(record.vaccineName)) grouped.set(record.vaccineName, [])
    grouped.get(record.vaccineName).push(record)
  }
  return [...grouped].map(([name,records]) => ({name,records: [...records].sort((a,b) => a.dose-b.dose || a.vaccinationDate.localeCompare(b.vaccinationDate))}))
})
const titles = {child:'宝宝档案',measurement:'生长记录',vaccination:'接种记录',milestone:'成长里程碑'}
const editorTitle = computed(() => `${editorId.value ? '编辑' : '新增'}${titles[editorKind.value]}`)
const filledMetrics = (record) => GROWTH_METRICS.filter(({key}) => hasMetric(record[key]))
const message = (exception) => exception?.response?.data?.message || exception?.message || '操作失败，请稍后重试'
function unwrap(response) {
  const body = response?.data
  if (body?.code != null && ![0,'0',200,'200','SUCCESS'].includes(body.code)) throw new Error(body.message || '请求失败')
  return body?.data ?? body
}
async function loadChildren() {
  const sequence = ++childrenSequence
  loadingChildren.value = true
  error.value = ''
  try {
    const result = unwrap(await api.listGrowthChildren())
    if (sequence !== childrenSequence) return
    children.value = result
    if (!result.some(item => String(item.id) === selectedId.value)) selectedId.value = result.length ? String(result[0].id) : ''
    else await loadRecords(selectedId.value)
  } catch (exception) {
    if (sequence === childrenSequence) error.value = message(exception)
  } finally { if (sequence === childrenSequence) loadingChildren.value = false }
}
async function loadRecords(id) {
  const sequence = ++recordsSequence
  measurements.value = []; vaccinations.value = []; milestones.value = []
  recordsError.value = ''; loadingRecords.value = !!id
  if (!id) return
  try {
    const responses = await Promise.all([api.listGrowthMeasurements(id),api.listGrowthVaccinations(id),api.listGrowthMilestones(id)])
    if (sequence !== recordsSequence || id !== selectedId.value) return
    const results = responses.map(unwrap)
    measurements.value = results[0]; vaccinations.value = results[1]; milestones.value = results[2]
  } catch (exception) {
    if (sequence === recordsSequence) recordsError.value = message(exception)
  } finally { if (sequence === recordsSequence) loadingRecords.value = false }
}
watch(selectedId, id => { year.value = ''; notice.value = ''; void loadRecords(id) })
onMounted(loadChildren)
onBeforeUnmount(() => { childrenSequence += 1; recordsSequence += 1 })
function retry() { void loadChildren() }
function openEditor(kind, record = null) {
  if (busy.value) return
  editorKind.value = kind; editorId.value = record?.id ?? null; editorChildId.value = selectedId.value
  const defaults = kind === 'child' ? {name:'',birthday:'',gender:'UNKNOWN',note:''}
    : kind === 'measurement' ? {measureDate:localToday(),heightCm:'',weightKg:'',headCm:'',recordedBy:'',note:''}
      : kind === 'vaccination' ? {vaccineName:'',dose:1,vaccinationDate:localToday(),status:vaccineStatus.value,institution:'',note:''}
        : {title:'',eventDate:localToday(),note:''}
  form.value = record ? {...defaults,...record} : defaults
  formError.value = ''; editorBaseline.value += 1; editorOpen.value = true
}
const actions = {
  child: {create:api.createGrowthChild,update:api.updateGrowthChild,remove:api.deleteGrowthChild},
  measurement: {create:api.createGrowthMeasurement,update:api.updateGrowthMeasurement,remove:api.deleteGrowthMeasurement},
  vaccination: {create:api.createGrowthVaccination,update:api.updateGrowthVaccination,remove:api.deleteGrowthVaccination},
  milestone: {create:api.createGrowthMilestone,update:api.updateGrowthMilestone,remove:api.deleteGrowthMilestone}
}
function recordState(kind) { return kind === 'measurement' ? measurements : kind === 'vaccination' ? vaccinations : milestones }
function sortRecords(kind, records) {
  const dateField = kind === 'vaccination' ? 'vaccinationDate' : 'eventDate'
  return [...records].sort((a,b) => (b[dateField] || '').localeCompare(a[dateField] || '') || (b.createdAt || '').localeCompare(a.createdAt || ''))
}
async function save() {
  if (saving.value) return
  saving.value = true; formError.value = ''; notice.value = ''
  try {
    const kind = editorKind.value, id = editorId.value, targetChild = editorChildId.value
    const payload = growthPayload(kind,form.value), action = actions[kind]
    const args = kind === 'child' ? (id ? [id,payload] : [payload]) : (id ? [targetChild,id,payload] : [targetChild,payload])
    const result = unwrap(await (id ? action.update(...args) : action.create(...args)))
    if (kind === 'child') {
      children.value = id ? children.value.map(item => String(item.id) === String(id) ? result : item) : [...children.value,result]
      selectedId.value = String(result.id)
    } else if (targetChild === selectedId.value) {
      const state = recordState(kind)
      const updated = id ? state.value.map(item => String(item.id) === String(id) ? result : item) : [...state.value,result]
      state.value = kind === 'measurement' ? updated : sortRecords(kind,updated)
    }
    editorOpen.value = false; notice.value = '已保存'
  } catch (exception) { formError.value = message(exception) }
  finally { saving.value = false }
}
async function remove(kind, record) {
  if (busy.value) return
  const targetChild = selectedId.value
  deleting.value = true; notice.value = ''
  try {
    const confirmed = await confirmDialog(kind === 'child' ? `删除“${record.name}”的宝宝档案？有成长记录的档案不能直接删除。` : `删除这条${titles[kind]}？删除后无法恢复。`, {title:'确认删除',confirmText:'删除',tone:'danger'})
    if (!confirmed) return
    unwrap(await actions[kind].remove(...(kind === 'child' ? [record.id] : [targetChild,record.id])))
    if (kind === 'child') {
      children.value = children.value.filter(item => String(item.id) !== String(record.id))
      selectedId.value = children.value.length ? String(children.value[0].id) : ''
    } else if (targetChild === selectedId.value) {
      const state = recordState(kind)
      state.value = state.value.filter(item => String(item.id) !== String(record.id))
    }
    notice.value = '已删除'
  } catch (exception) { notice.value = message(exception) }
  finally { deleting.value = false }
}
</script>

<style scoped>
.growth-page{height:100%;min-height:100vh;overflow:auto;padding:14px 18px 20px;color:var(--theme-text)}h1,h2,h3,p{margin:0}button,input,select{font:inherit}button{cursor:pointer;border:0}button:disabled,select:disabled{opacity:.55;cursor:not-allowed}.page-nav{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}.nav-right{display:flex;align-items:center;gap:12px;color:var(--theme-text-muted)}.back-home-btn,.ghost-btn,.action-btn,.danger-btn{border-radius:999px;padding:9px 14px;color:var(--theme-text);background:var(--theme-control-surface)}.back-home-btn{display:flex;gap:8px;border:1px solid var(--theme-border);box-shadow:var(--theme-shadow-xs);padding:10px 16px}.action-btn{background:var(--theme-accent);color:var(--theme-on-accent)}.danger-btn{color:var(--theme-danger);background:var(--theme-danger-soft)}.link{background:none;color:var(--theme-link);padding:4px;font-size:12px}.danger-link{color:var(--theme-danger)}.hero-panel,.panel-section,.profile-panel,.surface-notice{border:1px solid var(--theme-border);border-radius:24px;background:linear-gradient(180deg,var(--theme-highlight-soft),transparent),var(--theme-surface);box-shadow:var(--theme-shadow-sm);backdrop-filter:blur(16px)}.hero-panel{padding:18px 20px;display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:14px}.app-heading{display:flex;align-items:center;gap:14px}.app-heading img{width:52px;height:52px;border-radius:15px}.page-title{font-size:30px;line-height:1.2}.page-title span{font-size:13px;font-weight:400;color:var(--theme-text-muted);margin-left:6px}.page-subtitle,.panel-tip{font-size:13px;color:var(--theme-text-muted);line-height:1.6;margin-top:8px}.hero-tags{display:flex;gap:10px;flex-wrap:wrap}.hero-tag,.type-chip{background:var(--theme-accent-soft);color:var(--theme-link);padding:6px 12px;border-radius:999px;font-size:12px}.profile-panel{padding:15px 18px;border-radius:20px;display:flex;align-items:center;gap:14px;margin-bottom:14px}.child-avatar{display:grid;place-items:center;width:54px;height:54px;border-radius:50%;border:1px solid var(--theme-border);background:var(--theme-control-surface);font-size:22px;flex-shrink:0}.child-copy h2{font-size:18px}.child-copy .type-chip{font-weight:400;margin-left:5px}.child-copy p{font-size:12px;color:var(--theme-text-muted);margin-top:5px}.profile-actions{margin-left:auto;display:flex;gap:8px;align-items:center;flex-wrap:wrap}select{padding:9px 12px;background:var(--theme-field-surface);border:1px solid var(--theme-border);border-radius:12px;color:var(--theme-text);max-width:200px}.view-switch,.trend-switch{display:flex;gap:4px;border:1px solid var(--theme-border);padding:4px;border-radius:12px;background:var(--theme-control-surface);width:fit-content}.view-switch{margin-bottom:14px}.view-switch button,.trend-switch button{background:none;color:var(--theme-text-muted);padding:8px 17px;border-radius:9px}.view-switch button.active,.trend-switch button.active{background:var(--theme-accent);color:var(--theme-on-accent)}.trend-switch{border-radius:999px}.trend-switch button{border-radius:999px;padding:6px 13px;font-size:12px}.summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:14px}.summary-card,.record-card,.moment-card{border:1px solid var(--theme-border);border-radius:20px;background:var(--theme-surface-muted);padding:14px 16px}.summary-card span,.summary-card small,.summary-card p{color:var(--theme-text-muted);font-size:12px}.summary-card strong{display:block;font-size:24px;margin:8px 0}.summary-card p{line-height:1.8}.overview-columns{display:grid;grid-template-columns:minmax(0,1.85fr) minmax(290px,1fr);gap:14px}.panel-section{padding:18px;margin-bottom:14px}.panel-head{display:flex;justify-content:space-between;gap:14px;align-items:center;margin-bottom:14px}.panel-head h2{font-size:20px}.timeline{margin-left:6px}.event{border-left:1px solid var(--theme-divider);padding:0 0 20px 24px;position:relative}.event:last-child{padding-bottom:0;border-color:transparent}.event:before{content:'';position:absolute;left:-5px;top:4px;width:7px;height:7px;border-radius:50%;border:2px solid var(--theme-accent);background:var(--theme-surface)}.event small,small{color:var(--theme-text-muted);font-size:12px}.event p{margin:8px 0;font-size:14px}.moment-card{padding:14px;margin-bottom:14px}.moment-card small{display:block;margin-top:8px}.moment-card p{font-size:13px;color:var(--theme-text-muted);margin-top:10px;white-space:pre-wrap;overflow-wrap:anywhere}.vaccine-summary{display:flex;flex-direction:column;gap:8px;background:var(--theme-surface-muted);border-radius:12px;padding:14px;margin-bottom:16px}.vaccine-summary span{color:var(--theme-text-muted);font-size:13px}.safety-tip{margin:0 8px}.record-list{display:grid;gap:14px}.record-head,.record-foot{display:flex;justify-content:space-between;align-items:center;gap:12px}.record-values{display:flex;gap:32px;flex-wrap:wrap;margin:16px 0}.record-values>div{display:flex;flex-direction:column;gap:6px}.record-values span{font-size:12px;color:var(--theme-text-muted)}.record-values strong{font-size:22px}.record-values small{font-weight:400}.record-foot{border-top:1px solid var(--theme-divider);padding-top:12px}.record-foot>div,.row-actions{display:flex;gap:8px}.record-note{white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px;margin:12px 0;color:var(--theme-text-soft)}.curve-stats{border-top:1px solid var(--theme-divider);margin-top:18px;padding-top:18px;display:flex;gap:60px}.curve-stats div{display:flex;flex-direction:column;gap:8px}.curve-stats span{font-size:12px;color:var(--theme-text-muted)}.curve-stats strong{font-size:22px}.vaccine-tip{margin:14px 0}.vaccine-group{border:1px solid var(--theme-border);border-radius:14px;overflow:hidden;margin-bottom:16px}.vaccine-group h3{font-size:14px;padding:12px 16px;background:var(--theme-table-header)}.vaccine-row{display:grid;grid-template-columns:1fr 1fr auto;align-items:center;gap:16px;padding:16px;border-top:1px solid var(--theme-divider);font-size:13px}.vaccine-row small{display:block;margin-top:5px;white-space:pre-wrap;overflow-wrap:anywhere}.milestone-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.milestone-grid h3{font-size:16px;margin-bottom:8px;overflow-wrap:anywhere}.page-footer{display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--theme-text-muted);margin-top:18px}.surface-notice{padding:12px 16px;margin-bottom:14px;font-size:13px}.error{color:var(--theme-danger)}.empty-state{padding:40px 15px;text-align:center;color:var(--theme-text-muted)}.empty-state h2{font-size:20px;color:var(--theme-text)}.empty-state p{margin:12px 0 20px}.empty-state.compact{padding:15px 0;text-align:left}.child-copy{min-width:0}.child-copy h2{overflow-wrap:anywhere}
@media(max-width:1000px){.profile-panel{flex-wrap:wrap}.profile-actions{width:100%;justify-content:flex-end}.milestone-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:720px){.growth-page{padding:12px}.hero-panel{flex-direction:column;align-items:stretch;padding:14px;border-radius:14px}.page-title{font-size:22px}.app-heading img{width:42px;height:42px}.app-heading{gap:10px}.page-subtitle{font-size:12px}.hero-tag{font-size:11px;padding:4px 9px}.profile-panel{padding:12px;border-radius:14px;gap:10px}.child-copy h2{font-size:16px}.child-copy .type-chip{display:inline-block;margin:3px 0;font-size:11px}.profile-actions{gap:6px}.profile-actions button,select{font-size:12px;padding:8px 11px}.view-switch{width:100%;justify-content:space-between;gap:2px;padding:3px}.view-switch button{padding:8px 6px;font-size:12px}.summary-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.summary-card{padding:12px;border-radius:14px}.summary-card strong{font-size:22px}.overview-columns{grid-template-columns:1fr}.panel-section{padding:12px;border-radius:14px}.panel-head{gap:8px;flex-wrap:wrap}.panel-head h2{font-size:16px}.panel-tip{font-size:12px}.record-card{padding:12px;border-radius:14px}.record-values{gap:20px}.record-values strong{font-size:20px}.curve-stats{gap:18px;flex-wrap:wrap}.curve-stats strong{font-size:18px}.vaccine-row{grid-template-columns:1fr 1fr;gap:10px;padding:12px}.vaccine-row .row-actions{grid-column:1/-1;justify-content:flex-end}.milestone-grid{grid-template-columns:1fr}.nav-right>small{display:none}.profile-panel,.hero-panel,.panel-section{backdrop-filter:none}.back-home-btn{padding:8px 12px}.page-footer{font-size:11px;gap:10px}}
</style>
