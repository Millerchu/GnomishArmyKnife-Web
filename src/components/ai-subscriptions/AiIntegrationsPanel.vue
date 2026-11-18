<template>
  <details class="settings" @toggle="toggle"><summary>{{ section === 'budget' ? '月度预算与提醒' : '关联个人账单' }}</summary>
    <template v-if="open">
      <p v-if="error" role="alert">{{ error }} <button type="button" @click="load">重新读取</button></p>
      <p v-if="notice" role="status">{{ notice }}</p>
      <template v-if="section === 'budget'">
        <p>预算按 {{ month }} 的确认成本计算，各币种分别提醒。</p>
        <ul><li v-for="item in budgets" :key="item.currency">{{ item.currency }} · 已确认 {{ aiMoney(item.confirmedCost) }} / 预算 {{ aiMoney(item.amount) }} · 达到 {{ Math.round(item.threshold * 100) }}% 时提醒<span v-if="!item.complete">（汇总不完整）</span></li></ul>
        <form @submit.prevent="save"><label>币种<input v-model.trim="currency" required pattern="[A-Z]{3}" maxlength="3" placeholder="CNY"></label><label>月预算<input v-model="amount" required type="number" min="0.01" step="0.01"></label><label>提醒百分比<input v-model="percent" type="number" required min="1" max="100" step="1"></label><button :disabled="busy">保存该币种预算</button></form>
      </template>
      <template v-else>
        <p>只有显式关联或生成账单才会影响个人账单。解绑保留原账单。</p>
        <label>支付记录<select v-model="paymentId" :disabled="busy"><option value="">选择一笔支付</option><option v-for="item in payments" :key="item.id" :value="String(item.id)">{{ item.paymentDate }} · {{ AI_PAYMENT_LABELS[item.type] }} · {{ aiMoney(item.amount, item.currency) }} · #{{ item.id }}</option></select></label>
        <template v-if="paymentId && loaded && !error"><template v-if="linked"><p>{{ linked.available ? `已关联账单 #${linked.billId}` : '原账单不可用' }}</p><button :disabled="busy" @click="changeLink('unlink')">解除关联</button></template>
          <template v-else><label>已有同日同额账单<select v-model="candidate"><option value="">选择已有账单</option><option v-for="item in candidates" :key="item.billId" :value="item.billId">#{{ item.billId }} · {{ aiMoney(item.amount, item.currency) }}</option></select></label><button :disabled="busy || !candidate" @click="changeLink('existing')">关联所选账单</button><button :disabled="busy" @click="changeLink('create')">为此支付生成账单</button></template>
        </template>
      </template>
    </template>
  </details>
</template>
<script setup>
import {ref, watch} from 'vue'
import {aiPayload} from '@/api/aiSubscriptions'
import {listBudgets, saveBudget, billCandidates, getBillLink, linkPayment, unlinkPayment} from '@/api/aiIntegrations'
import {aiMoney, AI_PAYMENT_LABELS} from '@/utils/aiSubscriptions'
const props = defineProps({section: String, month: String, payments: {type: Array, default: () => []}})
const open = ref(false), busy = ref(false), loaded = ref(false), error = ref(''), notice = ref('')
const currency = ref('CNY'), percent = ref(80), amount = ref(''), budgets = ref([])
const paymentId = ref(''), candidate = ref(''), candidates = ref([]), linked = ref(null)
let generation = 0
function toggle(event) { open.value = event.target.open; if (open.value) load() }
function message(e) { return e.response?.data?.message || e.message || '操作失败' }
async function load() {
  const current = ++generation
  loaded.value = false; error.value = ''; candidate.value = ''; candidates.value = []; linked.value = null
  if (!open.value) return
  try {
    if (props.section === 'budget') { const result = aiPayload(await listBudgets(props.month)); if (current === generation) budgets.value = result }
    else if (paymentId.value) {
      const [link, options] = await Promise.all([getBillLink(paymentId.value), billCandidates(paymentId.value)])
      if (current === generation) { linked.value = aiPayload(link); candidates.value = aiPayload(options) }
    }
    if (current === generation) loaded.value = true
  } catch (e) { if (current === generation) error.value = message(e) }
}
async function write(action, result) {
  if (busy.value) return
  busy.value = true; notice.value = ''; error.value = ''
  try { aiPayload(await action()); notice.value = result; await load() } catch (e) { error.value = message(e) } finally { busy.value = false }
}
function save() { return write(() => saveBudget({month: props.month, currency: currency.value, amount: amount.value, threshold: (percent.value / 100).toFixed(2)}), '预算已保存') }
function changeLink(mode) { return write(() => mode === 'unlink' ? unlinkPayment(paymentId.value) : linkPayment(paymentId.value, mode === 'existing' ? candidate.value : null), mode === 'unlink' ? '已解绑，原账单保留' : '账单已关联') }
watch([() => props.month, paymentId], () => { notice.value = ''; load() })
</script>
<style scoped>
.settings{margin-top:16px;padding:16px;border:1px solid var(--theme-border);border-radius:12px;background:var(--theme-surface-muted)}.settings summary{cursor:pointer;font-weight:600}.settings form{display:flex;gap:10px;align-items:end;flex-wrap:wrap}.settings label{display:inline-grid;gap:5px;font-size:13px;margin:5px}.settings input,.settings select,.settings button{padding:8px;border:1px solid var(--theme-border-strong);border-radius:6px;font:inherit;max-width:100%;box-sizing:border-box}.settings button{cursor:pointer}.settings p{font-size:14px}.settings [role=alert]{color:var(--theme-danger)}
.settings button{background:var(--theme-control-surface);color:var(--theme-text)}
</style>
