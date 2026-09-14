<template>
  <section class="credit-panel">
    <header><div><small>个人信用统计</small><h2>信用卡授信</h2></div><button @click="openAccount()">＋ 新增账户</button></header>
    <p class="hint">按独立授信录入，共享额度的多张卡合并为一个账户。金额为手工更新的当前快照。</p>
    <p v-if="error" role="alert">{{ error }} <button @click="loadCredit">重试</button></p>
    <p v-if="loading">正在加载授信信息…</p>
    <template v-else-if="!error">
      <div class="metrics"><article v-for="metric in metrics" :key="metric.label"><span>{{ metric.label }}</span><strong>{{ money(credit[metric.key]) }}</strong></article><article><span>额度使用率</span><strong>{{ (Number(credit.usageRate) * 100).toFixed(1) }}%</strong></article></div>
      <p v-if="!credit.accounts.length" class="hint">暂无授信账户，添加第一份信用卡额度开始统计。</p>
      <article v-for="account in credit.accounts" :key="account.id" class="account">
        <div><b>{{ account.accountName }}</b><small>{{ account.institution }} · 更新于 {{ account.updatedAt?.replace('T', ' ').slice(0, 16) }}</small><small>账单日 {{ account.billingDay || '未设置' }} / 还款日 {{ account.repaymentDay || '未设置' }}</small><small v-if="account.note">{{ account.note }}</small></div>
        <div><b>{{ money(account.creditLimit) }}</b><small>已用 {{ money(account.usedAmount) }} · 可用 {{ money(account.availableAmount) }}</small></div>
        <div class="actions"><button @click="openAccount(account)">编辑</button><button :disabled="saving" @click="removeAccount(account)">删除</button></div>
      </article>
    </template>
    <MacDialog v-model="showDialog" :title="editingId ? '编辑授信账户' : '新增授信账户'" width="640px" :close-disabled="saving">
      <form id="credit-account-form" class="credit-form" @submit.prevent="saveAccount">
        <label>账户名称<input v-model.trim="form.accountName" maxlength="64" placeholder="例如：招行共享额度账户" required /></label>
        <label>发卡机构<input v-model.trim="form.institution" maxlength="64" placeholder="例如：招商银行" required /></label>
        <label>总额度（元）<input v-model.number="form.creditLimit" type="number" min="0.01" max="9999999999.99" step="0.01" required /></label>
        <label>已用额度（元）<input v-model.number="form.usedAmount" type="number" min="0" max="9999999999.99" step="0.01" required /></label>
        <label>账单日（可选）<input v-model.number="form.billingDay" type="number" min="1" max="31" step="1" /></label>
        <label>还款日（可选）<input v-model.number="form.repaymentDay" type="number" min="1" max="31" step="1" /></label>
        <label class="wide">备注<input v-model.trim="form.note" maxlength="160" placeholder="共享卡、额度说明等" /></label>
        <p class="hint wide">日期为每月约定日，实际出账与还款时间以银行为准；此处不生成账单收支。</p>
        <p v-if="saveError" class="wide" role="alert">{{ saveError }}</p>
      </form>
      <template #footer><button :disabled="saving" type="submit" form="credit-account-form">{{ saving ? '保存中…' : '保存账户' }}</button></template>
    </MacDialog>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import MacDialog from '@/components/MacDialog.vue'
import { confirmDialog } from '@/components/systemDialog'
import { getPersonalCreditSummary, createPersonalCreditAccount, updatePersonalCreditAccount, deletePersonalCreditAccount } from '@/api/personalBills'
const credit = reactive({ accounts: [], totalLimit: 0, totalUsed: 0, totalAvailable: 0, usageRate: 0 })
const loading = ref(true), saving = ref(false), error = ref(''), saveError = ref(''), showDialog = ref(false), editingId = ref(null)
const defaults = () => ({ accountName: '', institution: '', creditLimit: '', usedAmount: 0, billingDay: '', repaymentDay: '', note: '' })
const form = reactive(defaults())
const metrics = [{ label: '总额度', key: 'totalLimit' }, { label: '已用额度', key: 'totalUsed' }, { label: '可用额度', key: 'totalAvailable' }]
const money = value => `¥${Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
async function loadCredit() {
  loading.value = true; error.value = ''
  try { const response = await getPersonalCreditSummary(); Object.assign(credit, response?.data?.data ?? response?.data ?? response) }
  catch (failure) { error.value = failure?.response?.data?.message || '加载信用账户失败' }
  finally { loading.value = false }
}
function openAccount(account) {
  editingId.value = account?.id ?? null; Object.assign(form, defaults(), account || {}); saveError.value = ''; showDialog.value = true
}
async function saveAccount() {
  saving.value = true; saveError.value = ''
  try {
    const payload = { ...form, billingDay: form.billingDay || null, repaymentDay: form.repaymentDay || null }
    if (editingId.value) await updatePersonalCreditAccount(editingId.value, payload)
    else await createPersonalCreditAccount(payload)
    showDialog.value = false; await loadCredit()
  } catch (failure) { saveError.value = failure?.response?.data?.message || '保存授信账户失败' }
  finally { saving.value = false }
}
async function removeAccount(account) {
  if (!await confirmDialog(`删除“${account.accountName}”后将重新计算授信总额。`, { title: '删除授信账户？', confirmText: '删除' })) return
  saving.value = true
  try { await deletePersonalCreditAccount(account.id); await loadCredit() }
  catch (failure) { error.value = failure?.response?.data?.message || '删除授信账户失败' }
  finally { saving.value = false }
}
onMounted(loadCredit)
</script>

<style scoped>
.credit-panel{padding:20px;border:1px solid var(--theme-border);border-radius:22px;background:var(--theme-surface);color:var(--theme-text)}header{display:flex;align-items:center;justify-content:space-between;gap:12px}h2{margin:3px 0;font-size:18px}small,.hint{color:var(--theme-text-muted);font-size:12px;line-height:1.6}.metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:16px 0}.metrics article{padding:12px;background:var(--theme-surface-muted);border-radius:12px}.metrics span,.metrics strong,.account small{display:block}.metrics span{font-size:12px;color:var(--theme-text-muted)}.metrics strong{margin-top:6px;font-size:20px;font-variant-numeric:tabular-nums}.account{display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;padding:14px 0;border-top:1px solid var(--theme-divider);overflow-wrap:anywhere}.actions{display:flex;gap:8px}button{border:0;padding:8px 12px;border-radius:9px;background:var(--theme-accent-soft);color:var(--theme-link);cursor:pointer}button:disabled{opacity:.5;cursor:wait}.credit-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.credit-form label{display:flex;flex-direction:column;gap:6px;font-size:12px}.credit-form input{width:100%;height:38px;padding:0 10px;border:1px solid var(--theme-border);border-radius:8px;background:var(--theme-field-surface);color:var(--theme-text)}.wide{grid-column:1/-1}@media(max-width:520px){.credit-form{grid-template-columns:1fr}.metrics strong{font-size:17px}}
</style>
