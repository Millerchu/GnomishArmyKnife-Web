<template>
  <section class="ai-editor">
    <p v-if="loading" role="status">正在加载账号与计费配置…</p>
    <div v-else-if="loadError" role="alert" class="editor-error"><p>{{ loadError }}</p><button type="button" @click="load">重新加载</button></div>
    <template v-else>
      <div v-if="activeKind !== 'account' && !availableAccounts.length" class="editor-empty">
        <h3>先添加一个 AI 账号</h3><p>用量、订阅与支付均归属到具体账号。</p><button type="button" @click="startAccount">添加账号</button>
      </div>
      <form v-else class="ai-form" @submit.prevent="save">
        <p v-if="returnKind" class="editor-note">添加账号后将继续填写{{ AI_EDITOR_LABELS[returnKind] }}。</p>
        <div class="editor-fields">
          <template v-if="activeKind === 'account'">
            <label>工具<select v-model="form.toolCode" :disabled="Boolean(initialValue?.id)" required><option value="">请选择工具</option><option v-for="tool in tools" :key="tool.code" :value="tool.code">{{ tool.name }}</option></select></label>
            <label>账号别名<input v-model.trim="form.alias" maxlength="80" required placeholder="例如：工作账号" /></label>
            <div class="wide editor-note">只记录账号身份；无需填写登录密码或 API Key。六个工具均支持手动记录。</div>
            <div class="wide memo-picker"><button type="button" @click="loadMemos" :disabled="memoLoading">{{ memoLoading ? '读取中…' : '选择密码备忘录关联（可选）' }}</button>
              <p v-if="memoError" role="alert">{{ memoError }}</p>
              <label v-if="memoLoaded || form.passwordMemoId">密码备忘录<select v-model="form.passwordMemoId"><option value="">不关联 / 解绑</option><option v-if="form.passwordMemoId && !memos.some(item => String(item.id) === form.passwordMemoId)" :value="form.passwordMemoId">当前关联 · 保存时校验</option><option v-for="memo in memos" :key="memo.id" :value="String(memo.id)">{{ memo.summary }}</option></select></label>
            </div>
          </template>
          <template v-else>
            <label class="wide">账号<select v-model="form.accountId" required :disabled="Boolean(initialValue?.id)" @change="applyAccountDefaults"><option value="">请选择账号</option><option v-for="account in selectableAccounts" :key="account.id" :value="String(account.id)">{{ account.alias }} · {{ toolName(account.toolCode) }}{{ account.archived ? '（已归档）' : '' }}</option></select></label>
          </template>
          <template v-if="activeKind === 'subscription'">
            <label>套餐名称<input v-model.trim="form.planName" required maxlength="100" placeholder="按实际套餐填写" /></label>
            <label>每期金额<input v-model="form.amount" type="text" inputmode="decimal" pattern="[0-9]+([.][0-9]{1,6})?" required /></label>
            <label>币种<input v-model.trim="form.currency" required pattern="[A-Z]{3}" maxlength="3" placeholder="CNY / USD" /></label>
            <label>周期（月数；0 表示自定义）<input v-model="form.cycleMonths" type="number" min="0" max="120" step="1" required /></label>
            <label>权益开始日<input v-model="form.startDate" type="date" required /></label>
            <label>权益结束日（不含当日）<input v-model="form.endDate" type="date" :min="form.startDate" required /></label>
            <label>下次扣费日<input v-model="form.nextBillingDate" type="date" /><small>按月计费时留空可按起始日推算</small></label>
            <label>试用结束日<input v-model="form.trialEndDate" type="date" /></label>
            <label>提前提醒天数<input v-model="form.reminderDays" type="number" min="0" max="365" step="1" required /></label>
            <label class="check"><input v-model="form.autoRenew" type="checkbox" />计划自动续费</label>
            <p class="wide editor-note">这里的续费设置仅用于记录，不会取消厂商订阅。实付需另记「AI 支付」，不会自动假设已扣费。</p>
          </template>
          <template v-if="activeKind === 'usage'">
            <label>归属<select v-model="form.kind"><option value="PACKAGE">套餐额度</option><option value="API">独立 API</option></select></label>
            <label>计量方式<select v-model="form.mode"><option value="INCREMENT">本次增量</option><option value="CUMULATIVE">当前周期累计</option></select></label>
            <label>周期标识<input v-model.trim="form.periodKey" required maxlength="100" placeholder="例如：2026-11" /></label>
            <label>时区<input v-model.trim="form.zoneId" required maxlength="64" /></label>
            <label>区间开始日<input v-model="form.startDate" type="date" required /></label>
            <label>区间结束日（不含当日）<input v-model="form.endDate" type="date" :min="form.startDate" required /></label>
            <label>指标<select v-model="form.metric"><option value="TOKENS">Token 总量</option><option value="INPUT_TOKENS">输入 Token</option><option value="OUTPUT_TOKENS">输出 Token</option><option value="CACHE_TOKENS">缓存 Token</option><option value="MESSAGES">消息数</option><option value="REQUESTS">请求数</option><option value="CREDITS">积分</option><option value="DURATION">时长</option></select></label>
            <label>单位<input v-model.trim="form.unit" required maxlength="32" placeholder="tokens / 条 / 秒" /></label>
            <label>数量<input v-model="form.quantity" type="text" inputmode="decimal" pattern="[0-9]+([.][0-9]{1,6})?" required /></label>
            <label>模型 / 项目维度（可选）<input v-model.trim="form.dimension" maxlength="120" /></label>
            <label v-if="form.kind === 'API'">实际费用（未知留空）<input v-model="form.cost" type="text" inputmode="decimal" pattern="[0-9]+([.][0-9]{1,6})?" /></label>
            <label>币种<input v-model.trim="form.currency" pattern="[A-Z]{3}" maxlength="3" required /></label>
            <p class="wide editor-note">累计请保持周期、指标、单位和维度一致；新快照替代旧值。重叠区间可能进入待核对；跨月用量不会按天数猜测拆分。套餐内用量不重复计费。</p>
          </template>
          <template v-if="activeKind === 'payment'">
            <label>支付类型<select v-model="form.type" @change="paymentTypeChanged"><option v-for="(label, value) in AI_PAYMENT_LABELS" :key="value" :value="value">{{ label }}</option></select></label>
            <label v-if="form.type === 'SUBSCRIPTION'">对应订阅<select v-model="form.subscriptionId" required @change="applySubscriptionDefaults"><option value="">请选择订阅</option><option v-for="subscription in accountSubscriptions" :key="subscription.id" :value="String(subscription.id)">{{ subscription.planName }}</option></select></label>
            <label v-if="form.type === 'REFUND'">原支付<select v-model="form.originalPaymentId" required @change="applyRefundDefaults"><option value="">请选择原支付</option><option v-for="payment in refundablePayments" :key="payment.id" :value="String(payment.id)">{{ payment.paymentDate }} · {{ AI_PAYMENT_LABELS[payment.type] }} · {{ aiMoney(payment.amount, payment.currency) }}</option></select></label>
            <label>实付 / 退款金额<input v-model="form.amount" type="text" inputmode="decimal" pattern="[0-9]+([.][0-9]{1,6})?" required /></label>
            <label>币种<input v-model.trim="form.currency" pattern="[A-Z]{3}" maxlength="3" :readonly="form.type === 'REFUND'" required /></label>
            <label>支付日期<input v-model="form.paymentDate" type="date" required /></label>
            <template v-if="form.type === 'SUBSCRIPTION'"><label>覆盖开始日<input v-model="form.coverageStart" type="date" required /></label><label>覆盖结束日（不含当日）<input v-model="form.coverageEnd" type="date" :min="form.coverageStart" required /></label></template>
            <p class="wide editor-note">支付记录保存后不可覆盖。退款关联原支付并按原覆盖周期冲减成本；历史月份会重新计算。充值仅计现金流，不计 API 消耗成本。</p>
          </template>
          <label v-if="activeKind === 'account' || activeKind === 'payment'" class="wide">备注<textarea v-model.trim="form.note" maxlength="1000" rows="3" /></label>
        </div>
        <p v-if="saveError" class="editor-error" role="alert">{{ saveError }}</p>
        <div class="editor-actions"><button v-if="returnKind" type="button" :disabled="saving" @click="returnToForm">返回原表单</button><button type="submit" :disabled="saving">{{ saving ? '正在保存…' : `保存${AI_EDITOR_LABELS[activeKind]}` }}</button></div>
      </form>
    </template>
  </section>
</template>
<script setup>
import {computed, onBeforeUnmount, reactive, ref, watch} from 'vue'
import {aiPayload, listAiTools, listAiAccounts, listAiSubscriptions, listAiPayments, listAiPasswordMemoOptions, createAiAccount, updateAiAccount, createAiSubscription, updateAiSubscription, createAiUsageRecord, createAiPayment} from '@/api/aiSubscriptions'
import {AI_EDITOR_LABELS, AI_PAYMENT_LABELS, aiToday, aiMoney, aiRequestKey} from '@/utils/aiSubscriptions'
const props = defineProps({kind: {type: String, required: true}, initialValue: {type: Object, default: null}})
const emit = defineEmits(['saved', 'dirty', 'busy'])
const activeKind = ref(props.kind)
const returnKind = ref('')
const tools = ref([]), accounts = ref([]), subscriptions = ref([]), payments = ref([]), memos = ref([])
const loading = ref(false), saving = ref(false), memoLoading = ref(false), memoLoaded = ref(false)
const loadError = ref(''), saveError = ref(''), memoError = ref(''), baseline = ref('')
const form = reactive({})
let generation = 0
const availableAccounts = computed(() => accounts.value.filter(account => !account.archived || activeKind.value === 'payment'))
const selectableAccounts = computed(() => availableAccounts.value.filter(account => !account.archived || form.type === 'REFUND'))
const accountSubscriptions = computed(() => subscriptions.value.filter(item => String(item.accountId) === form.accountId && !item.terminated))
const refundablePayments = computed(() => payments.value.filter(item => String(item.accountId) === form.accountId && item.type !== 'REFUND'))
function toolName(code) { return tools.value.find(tool => tool.code === code)?.name || code }
function message(error) { return error?.response?.data?.message || error.message || '保存失败，请重试' }
function defaults(kind) {
  const today = aiToday()
  const tomorrow = new Date(`${today}T00:00:00Z`); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  if (kind === 'account') return {toolCode: '', alias: '', passwordMemoId: '', note: ''}
  if (kind === 'subscription') return {accountId: '', planName: '', amount: '', currency: 'CNY', cycleMonths: 1, startDate: today, endDate: '', nextBillingDate: '', trialEndDate: '', reminderDays: 3, autoRenew: true}
  if (kind === 'usage') return {accountId: '', kind: 'API', mode: 'INCREMENT', periodKey: today.slice(0, 7), zoneId: 'Asia/Shanghai', startDate: today, endDate: tomorrow.toISOString().slice(0, 10), metric: 'TOKENS', unit: 'tokens', dimension: '', quantity: '', cost: '', currency: 'CNY'}
  return {accountId: '', type: 'SUBSCRIPTION', subscriptionId: '', originalPaymentId: '', amount: '', currency: 'CNY', paymentDate: today, coverageStart: '', coverageEnd: '', note: '', requestKey: aiRequestKey()}
}
function initialize(value = null) {
  Object.keys(form).forEach(key => delete form[key])
  const initial = defaults(activeKind.value)
  Object.assign(form, initial)
  if (value) Object.keys(initial).forEach(key => { if (value[key] != null) form[key] = key.endsWith('Id') ? String(value[key]) : value[key] })
  else if (activeKind.value !== 'account' && availableAccounts.value.length) {
    if (activeKind.value === 'payment' && !availableAccounts.value.some(account => !account.archived)) form.type = 'REFUND'
    form.accountId = String(selectableAccounts.value[0].id); applyAccountDefaults()
  }
  baseline.value = JSON.stringify(form); saveError.value = ''; emit('dirty', false)
}
async function load() {
  const current = ++generation
  loading.value = true; loadError.value = ''
  try {
    const results = await Promise.all([listAiTools(), listAiAccounts(), listAiSubscriptions(), ...(props.kind === 'payment' ? [listAiPayments()] : [])])
    if (current !== generation) return
    const payloads = results.map(aiPayload)
    if (payloads.some(payload => !Array.isArray(payload))) throw new Error('智订选项数据格式不正确')
    ;[tools.value, accounts.value, subscriptions.value] = payloads
    payments.value = payloads[3] || []
    initialize(props.initialValue)
  } catch (error) { if (current === generation) loadError.value = message(error) }
  finally { if (current === generation) loading.value = false }
}
function applyAccountDefaults() {
  const subscription = accountSubscriptions.value[0]
  if (subscription) form.currency = subscription.currency
  if (activeKind.value === 'payment') { form.subscriptionId = subscription ? String(subscription.id) : ''; form.originalPaymentId = ''; applySubscriptionDefaults() }
}
function applySubscriptionDefaults() {
  if (form.type !== 'SUBSCRIPTION') return
  const subscription = accountSubscriptions.value.find(item => String(item.id) === form.subscriptionId)
  form.amount = subscription?.amount ?? ''; form.coverageStart = subscription?.startDate || ''; form.coverageEnd = subscription?.endDate || ''
  if (subscription) form.currency = subscription.currency
}
function applyRefundDefaults() {
  const original = refundablePayments.value.find(item => String(item.id) === form.originalPaymentId)
  if (original) form.currency = original.currency
}
function paymentTypeChanged() {
  form.amount = ''; form.originalPaymentId = ''
  if (!selectableAccounts.value.some(account => String(account.id) === form.accountId)) { form.accountId = selectableAccounts.value[0] ? String(selectableAccounts.value[0].id) : ''; applyAccountDefaults() }
  applySubscriptionDefaults()
}
function startAccount() { returnKind.value = activeKind.value; activeKind.value = 'account'; initialize() }
function returnToForm() { activeKind.value = returnKind.value; returnKind.value = ''; initialize() }
async function loadMemos() {
  memoLoading.value = true; memoError.value = ''
  try { const options = aiPayload(await listAiPasswordMemoOptions()); if (!Array.isArray(options)) throw new Error('关联列表格式不正确'); memos.value = options; memoLoaded.value = true }
  catch (error) { memoError.value = message(error) }
  finally { memoLoading.value = false }
}
function payload() {
  const result = {...form}
  for (const key of ['passwordMemoId', 'subscriptionId', 'originalPaymentId', 'nextBillingDate', 'trialEndDate', 'coverageStart', 'coverageEnd', 'cost']) if (result[key] === '') result[key] = null
  if (activeKind.value === 'subscription') { result.cycleMonths = Number(result.cycleMonths); result.reminderDays = Number(result.reminderDays) }
  if (activeKind.value === 'usage' && result.kind === 'PACKAGE') result.cost = null
  if (activeKind.value === 'payment') {
    if (result.type !== 'SUBSCRIPTION') { result.subscriptionId = null; result.coverageStart = null; result.coverageEnd = null }
    if (result.type !== 'REFUND') result.originalPaymentId = null
  }
  return result
}
async function save() {
  if (saving.value || loading.value || loadError.value) return
  saveError.value = ''
  const request = payload()
  if (['subscription', 'usage'].includes(activeKind.value) && request.endDate <= request.startDate) { saveError.value = '结束日必须晚于开始日（结束日不包含在区间内）'; return }
  if (activeKind.value === 'payment' && request.type === 'SUBSCRIPTION' && request.coverageEnd <= request.coverageStart) { saveError.value = '覆盖结束日必须晚于开始日'; return }
  saving.value = true
  try {
    const id = returnKind.value ? null : props.initialValue?.id
    const actions = {account: () => id ? updateAiAccount(id, request) : createAiAccount(request), subscription: () => id ? updateAiSubscription(id, request) : createAiSubscription(request), usage: () => createAiUsageRecord(request), payment: () => createAiPayment(request)}
    const saved = aiPayload(await actions[activeKind.value]())
    baseline.value = JSON.stringify(form); emit('dirty', false)
    if (returnKind.value) { accounts.value.unshift(saved); returnToForm(); form.accountId = String(saved.id); applyAccountDefaults(); baseline.value = JSON.stringify(form) }
    else emit('saved', saved)
  } catch (error) { saveError.value = message(error) }
  finally { saving.value = false }
}
watch(form, () => emit('dirty', JSON.stringify(form) !== baseline.value), {deep: true})
watch([loading, saving], () => emit('busy', loading.value || saving.value))
watch(() => [props.kind, props.initialValue], () => { activeKind.value = props.kind; returnKind.value = ''; load() }, {immediate: true})
onBeforeUnmount(() => { generation++ })
</script>
<style scoped>
.ai-editor{color:var(--theme-text,#153e3b);font-size:14px}.editor-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.editor-fields label{display:flex;flex-direction:column;gap:8px;min-width:0}.editor-fields input,.editor-fields select,.editor-fields textarea{box-sizing:border-box;width:100%;border:1px solid #bfd4ca;border-radius:8px;padding:10px 12px;font:inherit;background:var(--theme-input-bg,#fff);color:inherit;min-width:0}.editor-fields .wide{grid-column:1/-1}.editor-fields .check{flex-direction:row;align-items:center}.check input{width:auto}.editor-note{font-size:12px;line-height:1.8;color:#617b70;margin:0}.editor-actions{display:flex;justify-content:flex-end;gap:12px;margin-top:24px}.ai-editor button{border:1px solid #377965;border-radius:8px;background:#e3f4eb;padding:10px 16px;color:#164c3f;font:inherit;cursor:pointer}.editor-actions button[type=submit]{background:#176c58;color:white}.ai-editor button:disabled{opacity:.55;cursor:wait}.editor-error{color:#ad3e32;line-height:1.8}.editor-empty{padding:28px;text-align:center;background:#edf6f0;border-radius:12px}.memo-picker{display:grid;gap:12px}.ai-editor :focus-visible{outline:3px solid #378a70;outline-offset:2px}@media(max-width:600px){.editor-fields{grid-template-columns:1fr}.editor-actions button{flex:1}}
</style>
