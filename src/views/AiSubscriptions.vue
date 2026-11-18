<template>
  <main class="subs-page">
    <header class="subs-header">
      <RouterLink class="back-link" to="/home" aria-label="返回工作台" title="返回工作台">←</RouterLink>
      <div class="brand">
        <img src="/app-icons/app-ai-subscription.png" alt="" />
        <div><p class="eyebrow">AI SUBS</p><h1>智订</h1></div>
      </div>
      <ThemeToggle />
    </header>
    <p v-if="loading" role="status" class="notice">正在读取应用权限…</p>
    <section v-else-if="source === 'unavailable'" class="notice" role="alert"><h2>暂时无法读取应用权限</h2><button type="button" @click="reload">重新读取</button></section>
    <section v-else-if="!allowed" class="notice"><h2>尚未获得智订访问权限</h2><p>请联系管理员在权限管理中授权。</p></section>
    <template v-else>
      <nav class="view-nav" aria-label="智订视图"><button v-for="view in views" :key="view.key" type="button" :aria-current="active === view.key ? 'page' : undefined" @click="active = view.key">{{ view.label }}</button></nav>
      <div class="toolbar"><div class="filters"><label>工具<select v-model="toolFilter"><option value="">全部工具</option><option v-for="tool in tools" :key="tool.code" :value="tool.code">{{ tool.name }}</option></select></label><label v-if="active !== 'overview'">账号<select v-model="accountFilter"><option value="">全部账号</option><option v-for="account in filteredAccounts" :key="account.id" :value="String(account.id)">{{ account.alias }}{{ account.archived ? '（已归档）' : '' }}</option></select></label></div><button type="button" :disabled="dataLoading" @click="loadData">{{ dataLoading ? '读取中…' : '刷新记录' }}</button></div>
      <p v-if="dataError" class="notice error" role="alert">{{ dataError }} <button type="button" @click="loadData">重试</button><span v-if="summary"> · 当前保留上次读取的数据</span></p>
      <p v-if="notice" class="notice" role="status">{{ notice }}</p>
      <section class="workspace" aria-live="polite" :aria-busy="dataLoading">
        <p v-if="dataLoading && !summary" role="status">正在读取智订记录…</p>
        <template v-else-if="active === 'overview'">
          <div class="subs-section-heading"><div><p class="eyebrow">YOUR AI, IN ONE PLACE</p><h2>订阅有序，投入可见</h2></div><label>统计月份<input v-model="month" type="month" @change="loadSummary" /></label></div>
          <p v-if="summary && summary.month !== month" class="warning">当前仍显示 {{ summary.month }} 的统计，请等待新月份读取完成或重试。</p><p class="subs-muted">总览统计全部账号（含历史归档），不受工具筛选影响。默认按 Asia/Shanghai 日期记录。</p>
          <p v-if="summaryError" class="error" role="alert">{{ summaryError }} <button type="button" @click="loadSummary">重试统计</button></p>
          <div v-if="!summary?.hasRecords" class="empty-state"><h3>从第一份 AI 订阅开始</h3><p>添加账号后，分别记录固定订阅、用量与真实支付。</p><button type="button" @click="openEditor('account')">＋ 添加账号</button></div>
          <template v-else>
            <p v-if="!summary.complete" class="warning">汇总不完整：{{ summary.missingReasons?.join('；') || '部分金额待核对' }}</p>
            <div v-for="group in summary.currencies" :key="group.currency" class="currency-section"><h3>{{ group.currency }} · 原币统计</h3><div class="metrics"><article><h3>本月确认成本</h3><strong>{{ aiMoney(group.confirmedCost) }}</strong><p>已确认订阅摊销 + 独立 API 消耗</p></article><article><h3>本月现金支出</h3><strong>{{ aiMoney(group.cashExpense) }}</strong><p>真实扣款与充值，扣除退款</p></article><article><h3>月均订阅承诺</h3><strong>{{ aiMoney(group.monthlyCommitment) }}</strong><p>有效且计划持续的订阅折算</p></article></div><p class="subs-muted">未确认订阅预计成本：{{ aiMoney(group.estimatedCost, group.currency) }}</p></div>
            <p v-if="!summary.currencies?.length" class="subs-muted">尚未记录金额；账号数量不能换算为费用。</p>
            <details class="method"><summary>查看统计口径</summary><p>金额按币种独立汇总，不自动换算人民币。订阅按已确认支付覆盖区间逐日摊销；未确认扣款单列为预计。套餐内消耗不重复计费，API 充值仅计现金流。未知费用与待核对记录不会显示为完整的零。</p><p>退款保留原支付关联，并重算其覆盖月份成本。区间采用左闭右开：结束日期不计入。</p></details>
          </template>
          <div class="tool-section"><h3>你的 AI 工具箱</h3><ul class="tool-list"><li v-for="tool in tools" :key="tool.code"><span class="tool-dot" aria-hidden="true"></span><strong>{{ tool.name }}</strong><small>{{ tool.syncNote || '手动记录' }}</small></li></ul></div>
        </template>
        <template v-else-if="active === 'accounts'">
          <div class="subs-section-heading"><div><p class="eyebrow">SUBSCRIPTIONS & ACCOUNTS</p><h2>订阅与账号</h2></div><div class="actions"><button type="button" @click="openEditor('account')">＋ 账号</button><button type="button" @click="openEditor('subscription')">＋ 订阅</button></div></div>
          <div v-if="!visibleAccounts.length" class="empty-state"><h3>还没有符合条件的账号</h3><p>支持同一工具多个账号，无密码备忘录也可使用。</p></div>
          <div v-for="account in visibleAccounts" :key="account.id" class="account-block"><header><div><h3>{{ account.alias }} <small>{{ toolName(account.toolCode) }}</small></h3><p class="subs-muted">{{ account.archived ? '已归档 · 历史记录保留' : account.note || '手动记录账号' }}</p><RouterLink v-if="account.passwordMemoId && account.passwordMemoAvailable" :to="{path: '/password-memo', query: {memoId: String(account.passwordMemoId)}}">{{ account.passwordMemoSummary || '查看关联备忘录' }}</RouterLink><p v-else-if="account.passwordMemoId" class="subs-muted">关联不可用，可编辑账号解绑或重选。</p></div><div v-if="!account.archived" class="actions"><button type="button" @click="openEditor('account', account)">编辑</button><button type="button" :disabled="mutating" @click="archiveAccount(account)">归档</button></div></header>
            <ul class="record-list"><li v-for="subscription in accountPlans(account.id)" :key="subscription.id"><div><strong>{{ subscription.planName }}</strong><span>{{ aiSubscriptionStatus(subscription) }} · {{ subscription.autoRenew ? '计划自动续费' : '不自动续费' }}</span><small>{{ subscription.startDate }} — {{ subscription.endDate }}（不含） · 下次扣费 {{ subscription.nextBillingDate || '未记录' }}</small></div><div class="record-value"><b>{{ aiMoney(subscription.amount, subscription.currency) }}</b><small>{{ subscription.cycleMonths ? `每 ${subscription.cycleMonths} 个月` : '自定义周期' }}</small><button v-if="!subscription.terminated && !account.archived" type="button" @click="openEditor('subscription', subscription)">编辑订阅</button><button v-if="!subscription.terminated && !account.archived" type="button" :disabled="mutating" @click="terminateSubscription(subscription)">标记终止</button></div></li></ul><p v-if="!accountPlans(account.id).length" class="subs-muted">尚未配置固定订阅，可直接记录 API 用量与支付。</p>
          </div>
        </template>
        <template v-else-if="active === 'usage'">
          <div class="subs-section-heading"><div><p class="eyebrow">USAGE & COST</p><h2>用量与费用</h2></div><div class="actions"><button type="button" @click="openEditor('usage')">＋ 用量</button><button type="button" @click="openEditor('payment')">＋ 支付</button></div></div>
          <div class="filters period-filter"><label>从<input v-model="dateFrom" type="date" /></label><label>至（不含）<input v-model="dateTo" type="date" /></label><label>计量状态<select v-model="usageStatus"><option value="">全部</option><option value="INCLUDED">计入统计</option><option value="REVIEW">待核对</option><option value="SUPERSEDED">已替代</option></select></label></div>
          <h3>用量观测 <small>· 按记录来源核算</small></h3><ul class="record-list"><li v-for="record in visibleUsage" :key="record.id"><div><strong>{{ accountName(record.accountId) }} · {{ record.kind === 'PACKAGE' ? '套餐额度' : '独立 API' }}</strong><span>{{ record.source === 'OFFICIAL' ? '官方同步' : '手动记录' }} · {{ record.metric }} · {{ record.dimension || '不分维度' }} · {{ record.mode === 'CUMULATIVE' ? '周期累计' : '本次增量' }}</span><small>{{ record.startDate }} — {{ record.endDate }}（不含） · {{ record.zoneId }}</small><small :class="{error: record.status === 'REVIEW'}">{{ AI_USAGE_LABELS[record.status] || record.status }}{{ record.reason ? `：${record.reason}` : '' }}</small></div><div class="record-value"><b>{{ record.quantity }} {{ record.unit }}</b><span>{{ record.kind === 'PACKAGE' ? '套餐内不额外计费' : aiMoney(record.cost, record.currency) }}</span><small>采集 {{ record.recordedAt || '未记录' }}</small><div v-if="record.source !== 'OFFICIAL'" class="actions"><button v-if="record.status === 'REVIEW'" type="button" :disabled="mutating" @click="resolveUsage(record, 'INDEPENDENT')">标为独立补充</button><button v-if="!['WITHDRAWN', 'SUPERSEDED', 'EXCLUDED'].includes(record.status)" type="button" :disabled="mutating" @click="resolveUsage(record, 'EXCLUDE')">排除统计</button><button v-if="record.status === 'EXCLUDED'" type="button" :disabled="mutating" @click="resolveUsage(record, 'NORMAL')">重新核对</button></div></div></li></ul><p v-if="!visibleUsage.length" class="empty-line">暂无符合条件的用量记录。</p>
          <h3 class="payment-heading">支付流水</h3><ul class="record-list"><li v-for="payment in visiblePayments" :key="payment.id"><div><strong>{{ accountName(payment.accountId) }} · {{ AI_PAYMENT_LABELS[payment.type] }}</strong><span>{{ payment.paymentDate }} · {{ payment.note || '无备注' }}</span><small v-if="payment.coverageStart">覆盖 {{ payment.coverageStart }} — {{ payment.coverageEnd }}（不含）</small><small v-if="payment.originalPaymentId">关联原支付 #{{ payment.originalPaymentId }}</small></div><b>{{ payment.type === 'REFUND' ? '− ' : '' }}{{ aiMoney(payment.amount, payment.currency) }}</b></li></ul><p v-if="!visiblePayments.length" class="empty-line">暂无符合条件的支付记录。</p>
        </template>
        <template v-else>
          <div class="subs-section-heading"><div><p class="eyebrow">RENEWAL CALENDAR</p><h2>续费日历</h2></div><label>时间范围<select v-model.number="renewalDays"><option :value="7">未来 7 天</option><option :value="30">未来 30 天</option></select></label></div><p class="subs-muted">预计扣费不代表已支付。修改自动续费记录不会实际取消厂商订阅。</p><ul class="record-list"><li v-for="(event, index) in renewalEvents" :key="`${event.subscription.id}-${index}`"><div><strong>{{ event.date }} · {{ event.label }}</strong><span>{{ accountName(event.subscription.accountId) }} · {{ event.subscription.planName }}</span></div><div class="record-value"><b v-if="event.label === '预计扣费'">{{ aiMoney(event.subscription.amount, event.subscription.currency) }}</b><button type="button" @click="openEditor('subscription', event.subscription)">管理续费记录</button></div></li></ul><p v-if="!renewalEvents.length" class="empty-line">未来 {{ renewalDays }} 天没有符合条件的续费事件。</p>
        </template>
        <footer class="scope-note"><strong>记录说明</strong><p>支持手动记录、OpenAI 组织和 xAI 团队的 API 费用同步。{{ summary?.updatedAt ? `最近记录：${summary.updatedAt}` : '' }}</p></footer>
        <AiIntegrationsPanel v-if="active === 'overview' && !dataLoading && !dataError" section="budget" :month="month" />
        <AiCostInsights v-if="active === 'overview' && summary?.hasRecords && !dataLoading && !dataError" :month="month" :tools="tools" />
        <AiSyncPanel v-if="active === 'accounts' && !dataLoading && !dataError" :accounts="accounts" @updated="loadData" />
        <AiIntegrationsPanel v-if="active === 'usage' && !dataLoading && !dataError && featureCodes.includes('APP_PERSONAL_BILLS')" section="bills" :payments="payments" />
      </section>
    </template>
    <MacDialog v-model="editorOpen" :title="`${editing?.id ? '编辑' : '新增'}${AI_EDITOR_LABELS[editorKind]}`" width="760px" mobile-presentation="fullScreen" :dirty="editorDirty" :close-disabled="editorBusy">
      <AiSubscriptionEditor v-if="editorOpen" :key="`${editorKind}-${editing?.id || 'new'}`" :kind="editorKind" :initial-value="editing" @dirty="editorDirty = $event" @busy="editorBusy = $event" @saved="saved" />
    </MacDialog>
  </main>
</template>
<script setup>
import {computed, onBeforeUnmount, ref, watch} from 'vue'
import {RouterLink} from 'vue-router'
import {useWorkbenchAccess} from '@/composables/useWorkbenchAccess'
import MacDialog from '@/components/MacDialog.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import AiSubscriptionEditor from '@/components/ai-subscriptions/AiSubscriptionEditor.vue'
import AiIntegrationsPanel from '@/components/ai-subscriptions/AiIntegrationsPanel.vue'
import AiCostInsights from '@/components/ai-subscriptions/AiCostInsights.vue'
import AiSyncPanel from '@/components/ai-subscriptions/AiSyncPanel.vue'
import {confirmDialog} from '@/components/systemDialog'
import {aiPayload, listAiTools, listAiAccounts, listAiSubscriptions, listAiUsageRecords, listAiPayments, getAiSummary, archiveAiAccount, terminateAiSubscription, resolveAiUsageRecord} from '@/api/aiSubscriptions'
import {AI_EDITOR_LABELS, AI_PAYMENT_LABELS, AI_USAGE_LABELS, aiToday, aiMoney, aiSubscriptionStatus, aiRenewals} from '@/utils/aiSubscriptions'
const {loading, source, featureCodes, reload} = useWorkbenchAccess()
const allowed = computed(() => featureCodes.value.includes('APP_AI_SUBSCRIPTION'))
const active = ref('overview'), month = ref(aiToday().slice(0, 7)), toolFilter = ref(''), accountFilter = ref('')
const dateFrom = ref(''), dateTo = ref(''), usageStatus = ref(''), renewalDays = ref(30)
const tools = ref([]), accounts = ref([]), subscriptions = ref([]), usageRecords = ref([]), payments = ref([]), summary = ref(null)
const dataLoading = ref(false), dataError = ref(''), summaryError = ref(''), notice = ref(''), mutating = ref(false)
const editorOpen = ref(false), editorKind = ref('account'), editing = ref(null), editorDirty = ref(false), editorBusy = ref(false)
const views = [{key: 'overview', label: '总览'}, {key: 'accounts', label: '订阅与账号'}, {key: 'usage', label: '用量与费用'}, {key: 'renewals', label: '续费日历'}]
let generation = 0, summaryGeneration = 0
const filteredAccounts = computed(() => accounts.value.filter(item => !toolFilter.value || item.toolCode === toolFilter.value))
const visibleAccounts = computed(() => filteredAccounts.value.filter(item => !accountFilter.value || String(item.id) === accountFilter.value))
function matchesAccount(id) { return visibleAccounts.value.some(account => String(account.id) === String(id)) }
function matchesDate(start, end = start) { return (!dateFrom.value || end >= dateFrom.value) && (!dateTo.value || start < dateTo.value) }
const visibleUsage = computed(() => usageRecords.value.filter(item => matchesAccount(item.accountId) && (!dateFrom.value || item.endDate > dateFrom.value) && (!dateTo.value || item.startDate < dateTo.value) && (!usageStatus.value || item.status === usageStatus.value)))
const visiblePayments = computed(() => payments.value.filter(item => matchesAccount(item.accountId) && matchesDate(item.paymentDate)))
const renewalEvents = computed(() => aiRenewals(subscriptions.value.filter(item => matchesAccount(item.accountId)), renewalDays.value))
function accountPlans(id) { return subscriptions.value.filter(item => String(item.accountId) === String(id)) }
function toolName(code) { return tools.value.find(tool => tool.code === code)?.name || code }
function accountName(id) { return accounts.value.find(account => String(account.id) === String(id))?.alias || '历史账号' }
function errorMessage(error) { return error?.response?.data?.message || error.message || '暂时无法读取记录，请重试' }
async function loadData() {
  if (!allowed.value) return
  const current = ++generation
  dataLoading.value = true; dataError.value = ''
  try {
    const responses = await Promise.all([listAiTools(), listAiAccounts(), listAiSubscriptions(), listAiUsageRecords(), listAiPayments()])
    if (current !== generation) return
    const lists = responses.map(aiPayload)
    if (lists.some(list => !Array.isArray(list))) throw new Error('智订列表格式不正确')
    ;[tools.value, accounts.value, subscriptions.value, usageRecords.value, payments.value] = lists
    await loadSummary()
  } catch (error) { if (current === generation) dataError.value = errorMessage(error) }
  finally { if (current === generation) dataLoading.value = false }
}
async function loadSummary() {
  if (!month.value || !allowed.value) return
  const current = ++summaryGeneration
  summaryError.value = ''
  try { const result = aiPayload(await getAiSummary({month: month.value})); if (current === summaryGeneration) summary.value = result }
  catch (error) { if (current === summaryGeneration) summaryError.value = errorMessage(error) }
}
function openEditor(kind, record = null) { editorKind.value = kind; editing.value = record; editorDirty.value = false; editorBusy.value = false; editorOpen.value = true }
async function saved() { editorDirty.value = false; editorOpen.value = false; notice.value = '记录已保存'; await loadData() }
async function archiveAccount(account) {
  if (!await confirmDialog(`归档「${account.alias}」？支付与用量历史会保留。`, {title: '归档 AI 账号', confirmText: '归档'})) return
  await mutate(() => archiveAiAccount(account.id), '账号已归档，历史记录已保留')
}
async function terminateSubscription(subscription) {
  if (!await confirmDialog(`将「${subscription.planName}」标记为终止？这不会取消厂商订阅或产生退款。`, {title: '标记终止', confirmText: '标记终止'})) return
  await mutate(() => terminateAiSubscription(subscription.id), '已标记终止；未操作厂商订阅')
}
async function resolveUsage(record, action) {
  const explanation = action === 'INDEPENDENT' ? '确认为官方汇总以外的独立补充？此记录将额外计入统计。' : action === 'EXCLUDE' ? '从统计中排除此记录？原始记录仍然保留。' : '恢复默认计量规则并重新核对重叠？'
  if (!await confirmDialog(explanation, {title: '核对用量记录', confirmText: '确认'})) return
  await mutate(() => resolveAiUsageRecord(record.id, action), '用量统计规则已更新')
}
async function mutate(action, text) {
  mutating.value = true
  try { aiPayload(await action()); notice.value = text; await loadData() }
  catch (error) { dataError.value = errorMessage(error) }
  finally { mutating.value = false }
}
watch(toolFilter, () => { accountFilter.value = '' })
watch(allowed, value => { if (value) loadData(); else { generation++; summaryGeneration++; accounts.value = []; subscriptions.value = []; usageRecords.value = []; payments.value = []; summary.value = null; editorOpen.value = false } }, {immediate: true})
onBeforeUnmount(() => { generation++; summaryGeneration++ })
</script>
<style scoped>
.subs-page{height:100%;min-height:0;overflow-y:auto;overscroll-behavior-y:contain;box-sizing:border-box;max-width:1360px;margin:0 auto;padding:24px clamp(16px,4vw,40px) 48px;color:var(--theme-text)}
.back-link{width:40px;height:40px;flex:none;display:grid;place-items:center;border:1px solid var(--theme-border);border-radius:14px;background:var(--theme-control-surface);color:var(--theme-text);text-decoration:none;font-size:21px}
.subs-header{display:flex;align-items:center;gap:16px;margin:0 0 20px;padding-inline-end:52px}
.brand{display:flex;align-items:center;gap:10px;flex:1;min-width:0}
.brand img{width:56px;height:56px;object-fit:contain}
.eyebrow{font-size:11px;letter-spacing:.18em;font-weight:700;color:var(--theme-link);margin:0 0 10px}
h1{font-size:27px;letter-spacing:-.04em;margin:0}
h2{font-size:26px;margin:0 0 12px}
h3{font-size:15px;margin:0}
h3 small{font-weight:400;color:var(--theme-text-muted)}
.view-nav{display:flex;gap:8px;margin-bottom:16px;overflow-x:auto;scrollbar-width:thin}
.view-nav button{border:1px solid transparent;border-radius:12px;background:none;min-height:44px;padding:8px 12px;color:var(--theme-text-muted);font:inherit;white-space:nowrap;cursor:pointer}
.view-nav button[aria-current]{color:var(--theme-link);border-color:var(--theme-border);background:var(--theme-surface-raised);font-weight:700}
.workspace,.notice{background:var(--theme-surface);border:1px solid var(--theme-border);box-shadow:var(--theme-shadow-sm);backdrop-filter:blur(20px)}
.workspace{border-radius:24px;padding:clamp(18px,3vw,28px)}
.subs-section-heading,.toolbar{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}
.toolbar{margin-bottom:20px}
.subs-muted{font-size:13px;color:var(--theme-text-muted);line-height:1.8}
.metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;background:var(--theme-divider);border:1px solid var(--theme-divider);border-radius:14px;overflow:hidden;margin:18px 0}
.metrics article{padding:20px;background:var(--theme-surface-strong)}
.metrics strong{display:block;font-size:30px;font-variant-numeric:tabular-nums;font-weight:500;margin:18px 0 8px;color:var(--theme-text);overflow-wrap:anywhere}
.metrics p{font-size:12px;color:var(--theme-text-muted);margin:0;line-height:1.6}
.currency-section{margin-top:26px}
.tool-section{margin:32px 0}
.tool-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;padding:0;list-style:none;margin:20px 0}
.tool-list li{display:flex;align-items:center;flex-wrap:wrap;gap:10px;border:1px solid var(--theme-border);border-radius:10px;padding:16px;background:var(--theme-surface-muted);font-size:14px}
.tool-dot{width:7px;height:7px;border-radius:50%;background:var(--theme-accent)}
.tool-list small{width:100%;font-size:11px;color:var(--theme-text-muted);line-height:1.7}
.scope-note{display:flex;gap:18px;border-top:1px solid var(--theme-divider);padding-top:20px;margin-top:28px;font-size:12px;line-height:1.8;color:var(--theme-text-muted)}
.scope-note strong{white-space:nowrap;color:var(--theme-text-soft)}
.scope-note p{margin:0}
.empty-state{text-align:center;padding:28px 16px;color:var(--theme-text-soft)}
.empty-state h3{color:var(--theme-text)}
.empty-state p,.empty-line{font-size:14px;color:var(--theme-text-muted);line-height:1.8}
.empty-line{padding:20px 0}
.notice{padding:16px;border:1px solid var(--theme-border);border-radius:12px;font-size:14px}
.subs-page button{font:inherit;cursor:pointer}
.subs-page button:not(.view-nav button, .theme-toggle){padding:8px 13px;border:1px solid var(--theme-border);background:var(--theme-control-surface);border-radius:8px;color:var(--theme-text);font-size:13px}
.subs-page button:disabled{opacity:.55;cursor:wait}
.subs-page label{display:flex;align-items:center;gap:8px;font-size:13px}
.subs-page select,.subs-page input{font:inherit;padding:8px;border:1px solid var(--theme-border-strong);border-radius:7px;background:var(--theme-surface-muted);color:inherit;min-width:0;max-width:100%}
.filters,.actions{display:flex;flex-wrap:wrap;gap:12px}
.period-filter{margin:20px 0}
.error{color:var(--theme-danger)}
.warning{background:var(--theme-warning-soft);color:var(--theme-warning);border-radius:10px;padding:14px;font-size:13px;line-height:1.7}
.method{font-size:13px;line-height:1.9;color:var(--theme-text-soft);padding:16px;background:var(--theme-surface-muted);border-radius:10px}
.method summary{cursor:pointer}
.account-block{padding:24px 0;border-top:1px solid var(--theme-border);margin-top:16px}
.account-block header{display:flex;justify-content:space-between;gap:16px}
.account-block a{color:var(--theme-accent);font-size:13px}
.record-list{list-style:none;padding:0;margin:14px 0}
.record-list li{display:flex;justify-content:space-between;gap:20px;padding:18px 0;border-bottom:1px solid var(--theme-border);font-size:14px;overflow-wrap:anywhere}
.record-list li>div{display:flex;flex-direction:column;gap:7px;min-width:0}
.record-list span,.record-list small{color:var(--theme-text-muted);font-size:12px;line-height:1.6}
.record-list .record-value{text-align:right;align-items:flex-end;flex-shrink:0;max-width:45%}
.record-value b{font-variant-numeric:tabular-nums}
.payment-heading{margin-top:32px}
button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid var(--theme-accent);outline-offset:3px}@media(max-width:640px){.subs-page{padding:16px 14px 32px}
.subs-header{gap:8px}
.brand img{width:46px;height:46px}
h1{font-size:23px}
.workspace{padding:22px 16px}
.view-nav{gap:4px}
.view-nav button{font-size:13px;padding-inline:8px}
.metrics{grid-template-columns:1fr}
.metrics article{padding:18px}
.metrics strong{margin:10px 0}
.tool-list{grid-template-columns:1fr 1fr}
.tool-list li{padding:12px 10px;gap:7px}
.scope-note{flex-direction:column;gap:6px}
h2{font-size:23px}
.record-list li{flex-direction:column;gap:12px}
.record-list .record-value{text-align:left;align-items:flex-start;max-width:100%}
.account-block header{flex-direction:column}
.filters{width:100%}
.filters label{max-width:100%}
.toolbar{align-items:flex-start}
.subs-section-heading{align-items:flex-start}}
</style>
