<template>
  <div class="bills-page">
    <header class="topbar">
      <button class="icon-button" type="button" aria-label="返回桌面" @click="router.push('/home')">←</button>
      <div>
        <p class="eyebrow">PERSONAL LEDGER</p>
        <h1>个人账单</h1>
      </div>
      <button class="soft-button" type="button" :disabled="loading" @click="loadBills">{{ loading ? '同步中' : '刷新' }}</button>
    </header>

    <section class="month-hero">
      <div class="month-switcher">
        <button type="button" aria-label="上个月" @click="shiftMonth(-1)">‹</button>
        <label>
          <span>账单月份</span>
          <input v-model="query.month" type="month" @change="handleSearch" />
        </label>
        <button type="button" aria-label="下个月" @click="shiftMonth(1)">›</button>
      </div>
      <div class="hero-metrics">
        <article><span>本月支出</span><strong>{{ formatCurrency(summary.currentMonthExpense) }}</strong></article>
        <article><span>本月收入</span><strong>{{ formatCurrency(summary.currentMonthIncome) }}</strong></article>
        <article><span>月度结余</span><strong :class="{ negative: summary.currentMonthBalance < 0 }">{{ formatCurrency(summary.currentMonthBalance) }}</strong></article>
      </div>
      <div class="budget-meter">
        <div><span>年度预算</span><b>{{ formatPercent(summary.annualBudgetUsageRate) }} 已使用</b></div>
        <div class="meter-track"><i :class="budgetTone" :style="{ width: `${Math.min(summary.annualBudgetUsageRate * 100, 100)}%` }"></i></div>
        <div class="budget-meter-footer">
          <small>剩余 {{ formatCurrency(summary.annualBudgetRemaining) }}</small>
          <button type="button" @click="showBudgetManager">管理预算 →</button>
        </div>
      </div>
    </section>

    <nav class="view-tabs" aria-label="账单视图">
      <button :class="{ active: activeView === 'detail' }" @click="activeView = 'detail'">明细</button>
      <button :class="{ active: activeView === 'stats' }" @click="activeView = 'stats'">统计</button>
    </nav>

    <main class="workspace">
      <section class="ledger-panel" :class="{ 'mobile-hidden': activeView !== 'detail' }">
        <div class="filter-bar">
          <div class="search-box"><span>⌕</span><input v-model.trim="query.keyword" placeholder="搜索商户、备注或账户" @keyup.enter="handleSearch" /></div>
          <select v-model="query.billType" @change="handleSearch"><option value="">全部类型</option><option value="EXPENSE">支出</option><option value="INCOME">收入</option></select>
          <select v-model="query.categoryName" @change="handleSearch"><option value="">全部分类</option><option v-for="item in billCategoryOptions" :key="item.value" :value="item.value">{{ item.label }}</option></select>
          <button class="filter-reset" type="button" @click="resetQuery">重置</button>
        </div>

        <div v-if="loading && !pagedBills.length" class="state-box">正在整理账单…</div>
        <div v-else-if="!groupedBills.length" class="state-box"><b>这个月很安静</b><span>没有找到符合条件的账单</span></div>
        <div v-else class="day-groups">
          <section v-for="group in groupedBills" :key="group.date" class="day-group">
            <header><div><strong>{{ formatDay(group.date) }}</strong><span>{{ formatWeekday(group.date) }}</span></div><p>支 {{ formatCurrency(group.expense) }} · 收 {{ formatCurrency(group.income) }}</p></header>
            <button v-for="item in group.items" :key="item.id" class="bill-row" type="button" @click="openEditBillDialog(item)">
              <span class="category-icon" :style="categoryStyle(item.categoryName)">{{ categoryIcon(item.categoryName) }}</span>
              <span class="bill-copy"><b>{{ item.categoryName }}</b><small>{{ item.merchantName || item.note || item.accountName || '未填写说明' }}</small></span>
              <span class="bill-meta"><b :class="item.billType === 'EXPENSE' ? 'expense' : 'income'">{{ item.billType === 'EXPENSE' ? '-' : '+' }}{{ formatAmount(item.amount) }}</b><small>{{ item.paymentMethod || item.accountName || '未选账户' }}</small></span>
            </button>
          </section>
        </div>
        <footer class="pager"><span>共 {{ total }} 条 · 第 {{ query.pageNo }}/{{ totalPages }} 页</span><div><button :disabled="query.pageNo <= 1 || loading" @click="changePage(-1)">上一页</button><button :disabled="query.pageNo >= totalPages || loading" @click="changePage(1)">下一页</button></div></footer>
      </section>

      <aside class="insight-panel" :class="{ 'mobile-hidden': activeView !== 'stats' }">
        <section class="insight-card comparison-card">
          <div class="section-heading"><div><span>MONTHLY PULSE</span><h2>月度脉搏</h2></div><small>对比上月</small></div>
          <div class="comparison-grid">
            <article><span>支出变化</span><strong :class="changeClass(summary.monthComparison.expenseDifference, true)">{{ formatSignedCurrency(summary.monthComparison.expenseDifference) }}</strong><small>{{ formatChangeRate(summary.monthComparison.expenseChangeRate) }}</small></article>
            <article><span>收入变化</span><strong :class="changeClass(summary.monthComparison.incomeDifference, false)">{{ formatSignedCurrency(summary.monthComparison.incomeDifference) }}</strong><small>{{ formatChangeRate(summary.monthComparison.incomeChangeRate) }}</small></article>
          </div>
        </section>

        <section class="insight-card trend-card">
          <div class="section-heading"><div><span>DAILY FLOW</span><h2>每日收支趋势</h2></div><div class="legend"><i></i>支出 <i></i>收入</div></div>
          <div class="chart-wrap">
            <svg viewBox="0 0 640 190" role="img" aria-label="每日收支趋势图" preserveAspectRatio="none">
              <line v-for="y in [30, 80, 130, 180]" :key="y" x1="12" :y1="y" x2="628" :y2="y" class="grid-line" />
              <polyline v-if="trendPoints.expense" :points="trendPoints.expense" class="trend expense-line" />
              <polyline v-if="trendPoints.income" :points="trendPoints.income" class="trend income-line" />
            </svg>
            <div class="chart-axis"><span>1日</span><span>{{ midMonthDay }}日</span><span>{{ summary.dailyTrend.length || 31 }}日</span></div>
          </div>
        </section>

        <section class="insight-card">
          <div class="section-heading"><div><span>SPENDING MAP</span><h2>分类支出</h2></div><small>{{ categoryDistribution.length }} 类</small></div>
          <div v-if="categoryDistribution.length" class="category-ranking">
            <article v-for="item in categoryDistribution" :key="item.categoryName">
              <span class="category-icon small" :style="categoryStyle(item.categoryName)">{{ categoryIcon(item.categoryName) }}</span>
              <div><p><b>{{ item.categoryName }}</b><span>{{ formatCurrency(item.amount) }}</span></p><div><i :style="{ width: `${Math.max(item.ratio * 100, 3)}%` }"></i></div></div>
              <strong>{{ formatPercent(item.ratio) }}</strong>
            </article>
          </div>
          <div v-else class="mini-empty">本月暂无分类支出</div>
        </section>

        <section class="insight-card budget-card-section">
          <div class="section-heading"><div><span>YEARLY GUARDRAILS</span><h2>{{ selectedYear }} 年预算</h2></div><button class="text-button" @click="openCreateBudgetDialog">＋ 新增</button></div>
          <div v-if="currentYearBudgets.length" class="budget-list">
            <article v-for="item in currentYearBudgets" :key="item.id">
              <div class="budget-item-head">
                <button type="button" @click="openEditBudgetDialog(item)"><span><b>{{ item.categoryName }}</b><small>{{ item.statusText }}</small></span><strong>{{ formatCurrency(item.usedAmount) }} / {{ formatCurrency(item.annualLimit) }}</strong></button>
                <div class="budget-item-actions"><button type="button" @click="openEditBudgetDialog(item)">编辑</button><button type="button" class="delete" @click="removeBudget(item)">删除</button></div>
              </div>
              <div><i :class="item.statusClass" :style="{ width: `${Math.min(item.usageRate, 100)}%` }"></i></div>
            </article>
          </div>
          <div v-else class="mini-empty">还没有预算，先给消费设一道温柔的边界。</div>
        </section>
      </aside>
    </main>

    <button class="quick-entry" type="button" @click="openCreateBillDialog"><span>＋</span><b>记一笔</b><small>快速记录收支</small></button>

    <MacDialog v-model="showBillDialog" :title="billDialogMode === 'create' ? '快速记一笔' : '编辑账单'" width="860px" :close-disabled="submitting" panel-class="personal-bill-dialog" @cancel="closeBillDialog">
      <form id="personal-bill-dialog-form" class="entry-form" @submit.prevent="submitBillDialog(false)">
        <div class="type-tabs"><button type="button" :class="{ active: billForm.billType === 'EXPENSE' }" @click="billForm.billType = 'EXPENSE'">支出</button><button type="button" :class="{ active: billForm.billType === 'INCOME' }" @click="billForm.billType = 'INCOME'">收入</button></div>
        <div class="amount-display"><span>¥</span><strong>{{ amountExpression || '0' }}</strong><small v-if="calculatedAmount !== amountExpression">= {{ calculatedAmount }}</small></div>
        <div class="entry-body">
          <div class="category-picker"><button v-for="item in billCategoryOptions" :key="item.value" type="button" :class="{ active: billForm.categoryName === item.value }" @click="billForm.categoryName = item.value"><span :style="categoryStyle(item.value)">{{ categoryIcon(item.value) }}</span><small>{{ item.label }}</small></button></div>
          <div class="number-pad" aria-label="金额键盘"><button v-for="key in keypadKeys" :key="key" type="button" :class="{ operator: ['+','−'].includes(key), done: key === '完成' }" @click="handleKeypad(key)">{{ key }}</button></div>
        </div>
        <div class="detail-fields">
          <label><span>日期</span><input v-model="billForm.billDate" type="date" required /></label>
          <label><span>账户</span><input v-model.trim="billForm.accountName" maxlength="32" placeholder="银行卡 / 现金" /></label>
          <label><span>支付方式</span><select v-model="billForm.paymentMethod"><option value="">未填写</option><option v-for="item in paymentMethodOptions" :key="item.value" :value="item.value">{{ item.label }}</option></select></label>
          <label><span>商户 / 对象</span><input v-model.trim="billForm.merchantName" maxlength="48" placeholder="消费地点或收入来源" /></label>
          <label class="wide"><span>备注</span><input v-model.trim="billForm.note" maxlength="160" placeholder="补充这笔账的故事" /></label>
        </div>
      </form>
      <template #footer>
        <button v-if="billDialogMode === 'edit'" class="danger-button" :disabled="submitting" @click="removeBill(editingBill)">删除</button>
        <button v-if="billDialogMode === 'create'" class="soft-button" :disabled="submitting" @click="submitBillDialog(true)">保存并再记</button>
        <button class="primary-button" type="submit" form="personal-bill-dialog-form" :disabled="submitting">{{ submitting ? '保存中…' : '保存账单' }}</button>
      </template>
    </MacDialog>

    <MacDialog v-model="showBudgetDialog" :title="budgetDialogMode === 'create' ? '新增年度预算' : '编辑年度预算'" width="860px" :close-disabled="budgetSubmitting" panel-class="personal-budget-dialog" @cancel="showBudgetDialog = false">
      <form id="personal-budget-dialog-form" class="budget-form dialog-density-grid dialog-grid-cols-4" @submit.prevent="submitBudgetDialog">
        <label><span>预算年份</span><input v-model.number="budgetForm.year" type="number" min="2020" max="2099" required /></label>
        <label><span>分类</span><select v-model="budgetForm.categoryName" required><option v-for="item in budgetCategoryOptions" :key="item.value" :value="item.value">{{ item.label }}</option></select></label>
        <label><span>年度额度</span><input v-model.number="budgetForm.annualLimit" type="number" min="0.01" step="0.01" required /></label>
        <label><span>预警阈值</span><input v-model.number="budgetForm.alertThreshold" type="number" min="0.01" max="1" step="0.01" required /></label>
        <label class="wide"><span>备注</span><input v-model.trim="budgetForm.note" maxlength="120" placeholder="例如：餐饮全年控制在 1.5 万内" /></label>
      </form>
      <template #footer><button v-if="budgetDialogMode === 'edit'" class="danger-button" @click="removeBudget(editingBudget)">删除</button><button class="primary-button" type="submit" form="personal-budget-dialog-form" :disabled="budgetSubmitting">{{ budgetSubmitting ? '保存中…' : '保存预算' }}</button></template>
    </MacDialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import MacDialog from '@/components/MacDialog.vue'
import { confirmDialog } from '@/components/systemDialog'
import { createAnnualBudget, createPersonalBill, deleteAnnualBudget, deletePersonalBill, getPersonalBillSummary, listAnnualBudgets, listPersonalBills, updateAnnualBudget, updatePersonalBill } from '@/api/personalBills'
import { listDataDictionaryOptionsByUsage } from '@/api/dataDictionary'

const router = useRouter()
const APP_CODE = 'APP_PERSONAL_BILLS'
const MODULE_CODE = 'PERSONAL_BILLS'
const keypadKeys = ['1','2','3','+','4','5','6','−','7','8','9','⌫','0','.','清空','完成']
const activeView = ref('detail')
const loading = ref(false)
const submitting = ref(false)
const budgetSubmitting = ref(false)
const pagedBills = ref([])
const total = ref(0)
const billCategoryOptions = ref([])
const budgetCategoryOptions = ref([])
const paymentMethodOptions = ref([])
const showBillDialog = ref(false)
const showBudgetDialog = ref(false)
const billDialogMode = ref('create')
const budgetDialogMode = ref('create')
const editingBill = ref(null)
const editingBudget = ref(null)
const amountExpression = ref('')

const currentMonth = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}` }
const today = () => new Date().toISOString().slice(0, 10)
const query = reactive({ month: currentMonth(), billType: '', categoryName: '', keyword: '', pageNo: 1, pageSize: 20 })
const summary = reactive({ currentMonthExpense: 0, currentMonthIncome: 0, currentMonthBalance: 0, currentYearExpense: 0, annualBudgetAmount: 0, annualBudgetUsed: 0, annualBudgetRemaining: 0, annualBudgetUsageRate: 0, monthComparison: {}, dailyTrend: [] })
const categoryDistribution = ref([])
const currentYearBudgets = ref([])
const billForm = reactive({ billType: 'EXPENSE', categoryName: '', amount: 0, accountName: '', paymentMethod: '', merchantName: '', billDate: today(), note: '' })
const budgetForm = reactive({ year: new Date().getFullYear(), categoryName: '', annualLimit: 0, alertThreshold: 0.8, note: '' })

const unwrap = response => response?.data?.data ?? response?.data ?? response
const normalizeOptions = payload => (Array.isArray(payload) ? payload : []).map(item => ({ value: item.itemValue || item.value || item.itemCode, label: item.itemLabel || item.label || item.itemValue })).filter(item => item.value)
const normalizeBill = item => ({ id: item.id, billType: item.billType || 'EXPENSE', categoryName: item.categoryName || '', amount: Number(item.amount || 0), accountName: item.accountName || '', paymentMethod: item.paymentMethod || '', merchantName: item.merchantName || '', billDate: item.billDate || '', note: item.note || '' })
const selectedYear = computed(() => Number(query.month.slice(0, 4)))
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / query.pageSize)))
const groupedBills = computed(() => {
  const groups = new Map()
  pagedBills.value.forEach(item => {
    if (!groups.has(item.billDate)) groups.set(item.billDate, { date: item.billDate, expense: 0, income: 0, items: [] })
    const group = groups.get(item.billDate); group.items.push(item); group[item.billType === 'EXPENSE' ? 'expense' : 'income'] += item.amount
  })
  return [...groups.values()]
})
const calculatedAmount = computed(() => {
  const parts = amountExpression.value.match(/\d+(?:\.\d+)?|[+−]/g) || []
  let value = Number(parts[0] || 0)
  for (let index = 1; index < parts.length - 1; index += 2) value += (parts[index] === '+' ? 1 : -1) * Number(parts[index + 1] || 0)
  return Math.max(0, value).toFixed(2)
})
const trendPoints = computed(() => {
  const rows = summary.dailyTrend || []; if (!rows.length) return { expense: '', income: '' }
  const max = Math.max(1, ...rows.flatMap(item => [Number(item.expense), Number(item.income)]))
  const points = key => rows.map((item, index) => `${12 + index * 616 / Math.max(rows.length - 1, 1)},${180 - Number(item[key]) / max * 150}`).join(' ')
  return { expense: points('expense'), income: points('income') }
})
const midMonthDay = computed(() => Math.ceil((summary.dailyTrend?.length || 31) / 2))
const budgetTone = computed(() => summary.annualBudgetUsageRate >= 1 ? 'danger' : summary.annualBudgetUsageRate >= 0.8 ? 'warning' : 'safe')

async function loadDictionaries() {
  const requestOption = bizFieldCode => listDataDictionaryOptionsByUsage({ appCode: APP_CODE, moduleCode: MODULE_CODE, bizFieldCode })
  const [bill, budget, payment] = await Promise.all([requestOption('categoryName'), requestOption('budgetCategoryName'), requestOption('paymentMethod')])
  billCategoryOptions.value = normalizeOptions(unwrap(bill)); budgetCategoryOptions.value = normalizeOptions(unwrap(budget)); paymentMethodOptions.value = normalizeOptions(unwrap(payment))
}
async function loadBills() {
  loading.value = true
  try {
    const [billsResponse, budgetsResponse, summaryResponse] = await Promise.all([
      listPersonalBills({ ...query, billType: query.billType || undefined, categoryName: query.categoryName || undefined, keyword: query.keyword || undefined }),
      listAnnualBudgets({ year: selectedYear.value }), getPersonalBillSummary({ month: query.month, year: selectedYear.value })
    ])
    const bills = unwrap(billsResponse) || {}; pagedBills.value = (bills.list || bills.records || bills.rows || []).map(normalizeBill); total.value = Number(bills.total || 0)
    const payload = unwrap(summaryResponse) || {}; Object.assign(summary, payload, { monthComparison: payload.monthComparison || {}, dailyTrend: payload.dailyTrend || [] })
    categoryDistribution.value = payload.categoryDistribution || []; currentYearBudgets.value = payload.budgetProgressList || []
    const budgets = unwrap(budgetsResponse); if (!currentYearBudgets.value.length && Array.isArray(budgets)) currentYearBudgets.value = budgets
  } catch (error) { window.alert(error?.response?.data?.message || '加载个人账单失败') } finally { loading.value = false }
}
function handleSearch() { query.pageNo = 1; loadBills() }
function resetQuery() { query.billType = ''; query.categoryName = ''; query.keyword = ''; query.pageNo = 1; loadBills() }
function changePage(offset) { query.pageNo += offset; loadBills() }
function shiftMonth(offset) { const [year, month] = query.month.split('-').map(Number); const next = new Date(year, month - 1 + offset, 1); query.month = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`; handleSearch() }
function resetBillForm() { Object.assign(billForm, { billType: 'EXPENSE', categoryName: billCategoryOptions.value[0]?.value || '', amount: 0, accountName: '', paymentMethod: '', merchantName: '', billDate: today(), note: '' }); amountExpression.value = '' }
function openCreateBillDialog() { billDialogMode.value = 'create'; editingBill.value = null; resetBillForm(); showBillDialog.value = true }
function openEditBillDialog(item) { billDialogMode.value = 'edit'; editingBill.value = item; Object.assign(billForm, item); amountExpression.value = String(item.amount); showBillDialog.value = true }
function closeBillDialog() { if (!submitting.value) showBillDialog.value = false }
function handleKeypad(key) {
  if (key === '完成') { submitBillDialog(false); return }
  if (key === '清空') { amountExpression.value = ''; return }
  if (key === '⌫') { amountExpression.value = amountExpression.value.slice(0, -1); return }
  const last = amountExpression.value.slice(-1)
  if (['+','−'].includes(key)) { if (amountExpression.value && !['+','−'].includes(last)) amountExpression.value += key; return }
  const currentPart = amountExpression.value.split(/[+−]/).pop()
  if (key === '.' && currentPart.includes('.')) return
  amountExpression.value += key
}
async function submitBillDialog(keepOpen) {
  billForm.amount = Number(calculatedAmount.value)
  if (!billForm.categoryName) return window.alert('请选择分类')
  if (billForm.amount <= 0) return window.alert('请输入大于 0 的金额')
  if (!billForm.billDate) return window.alert('请选择日期')
  submitting.value = true
  try {
    const payload = { ...billForm }
    if (billDialogMode.value === 'create') await createPersonalBill(payload); else await updatePersonalBill(editingBill.value.id, payload)
    await loadBills()
    if (keepOpen && billDialogMode.value === 'create') resetBillForm(); else showBillDialog.value = false
  } catch (error) { window.alert(error?.response?.data?.message || '保存账单失败') } finally { submitting.value = false }
}
async function removeBill(item) { if (!item || !await confirmDialog('这笔账单将被永久删除。', { title: '删除账单？', confirmText: '删除账单' })) return; await deletePersonalBill(item.id); showBillDialog.value = false; await loadBills() }
function openCreateBudgetDialog() { budgetDialogMode.value = 'create'; editingBudget.value = null; Object.assign(budgetForm, { year: selectedYear.value, categoryName: budgetCategoryOptions.value[0]?.value || '', annualLimit: 0, alertThreshold: 0.8, note: '' }); showBudgetDialog.value = true }
function showBudgetManager() { activeView.value = 'stats'; window.requestAnimationFrame(() => document.querySelector('.budget-card-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' })) }
function openEditBudgetDialog(item) { budgetDialogMode.value = 'edit'; editingBudget.value = item; Object.assign(budgetForm, { year: item.year || selectedYear.value, categoryName: item.categoryName, annualLimit: item.annualLimit, alertThreshold: item.alertThreshold, note: item.note || '' }); showBudgetDialog.value = true }
async function submitBudgetDialog() { budgetSubmitting.value = true; try { const payload = { ...budgetForm }; if (budgetDialogMode.value === 'create') await createAnnualBudget(payload); else await updateAnnualBudget(editingBudget.value.id, payload); showBudgetDialog.value = false; await loadBills() } catch (error) { window.alert(error?.response?.data?.message || '保存预算失败') } finally { budgetSubmitting.value = false } }
async function removeBudget(item) { if (!item || !await confirmDialog('这项年度预算将被永久删除。', { title: '删除预算？', confirmText: '删除预算' })) return; await deleteAnnualBudget(item.id); showBudgetDialog.value = false; await loadBills() }

const formatAmount = value => Number(value || 0).toFixed(2)
const formatCurrency = value => `¥${Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const formatSignedCurrency = value => `${Number(value || 0) > 0 ? '+' : ''}${formatCurrency(value)}`
const formatPercent = value => `${Math.round(Number(value || 0) * 100)}%`
const formatChangeRate = value => Number(value || 0) === 0 ? '暂无有效基数' : `${Number(value) > 0 ? '+' : ''}${(Number(value) * 100).toFixed(1)}%`
const formatDay = value => `${Number(value.slice(5, 7))}月${Number(value.slice(8, 10))}日`
const formatWeekday = value => ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'][new Date(`${value}T00:00:00`).getDay()]
const changeClass = (value, inverse) => Number(value) === 0 ? '' : ((Number(value) > 0) === inverse ? 'bad-change' : 'good-change')
const categoryIcon = name => ({ 餐饮:'餐', 交通:'行', 购物:'购', 数码:'数', 住房:'住', 工资:'薪', 医疗:'医', 娱乐:'乐', 人情社交:'友', 退款:'退' }[name] || String(name || '账').slice(0, 1))
const categoryStyle = name => { const hue = [...String(name)].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 280 + 20; return { '--category-hue': hue } }

onMounted(async () => { try { await loadDictionaries(); resetBillForm(); await loadBills() } catch (error) { window.alert(error?.response?.data?.message || '初始化个人账单失败') } })
</script>

<style scoped>
.bills-page{--ink:var(--theme-text);--muted:var(--theme-text-muted);--line:var(--theme-divider);--blue:var(--theme-accent);--cyan:#20b8d6;width:100%;height:100%;min-height:0;overflow-x:hidden;overflow-y:auto;overscroll-behavior-y:contain;-webkit-overflow-scrolling:touch;padding:28px clamp(18px,4vw,58px) 110px;color:var(--ink);background:transparent;font-family:"Avenir Next","PingFang SC",sans-serif}.topbar{max-width:1500px;margin:auto;display:flex;align-items:center;gap:16px}.topbar h1{margin:0;font-size:27px;letter-spacing:-.04em}.eyebrow,.section-heading span{margin:0 0 2px;color:var(--theme-link);font-size:10px;font-weight:800;letter-spacing:.18em}.icon-button,.soft-button,.filter-reset,.text-button,.pager button{border:0;cursor:pointer}.icon-button{width:42px;height:42px;border-radius:14px;background:var(--theme-control-surface);box-shadow:var(--theme-shadow-xs);font-size:21px}.soft-button{margin-left:auto;padding:10px 17px;border-radius:12px;background:var(--theme-control-surface);color:var(--theme-text-soft);font-weight:700}.month-hero{max-width:1500px;margin:22px auto 18px;padding:24px 28px;display:grid;grid-template-columns:minmax(220px,.8fr) 2fr minmax(230px,.9fr);gap:28px;align-items:center;color:var(--theme-on-accent);border:1px solid rgba(255,255,255,.3);border-radius:28px;background:linear-gradient(120deg,#152f57,#225ba0 55%,#1794aa);box-shadow:0 22px 55px rgba(29,65,114,.22);overflow:hidden;position:relative}.month-hero:after{content:"";position:absolute;width:280px;height:280px;border:1px solid rgba(255,255,255,.12);border-radius:50%;right:12%;top:-170px}.month-switcher{display:flex;align-items:center;gap:8px}.month-switcher button{border:0;background:rgba(255,255,255,.1);color:var(--theme-on-accent);width:34px;height:46px;border-radius:12px;font-size:24px}.month-switcher label{display:flex;flex-direction:column}.month-switcher label span{font-size:11px;color:#b9d3ed}.month-switcher input{width:128px;border:0;background:transparent;color:var(--theme-on-accent);font:700 20px inherit}.hero-metrics{display:grid;grid-template-columns:repeat(3,1fr)}.hero-metrics article{padding:4px 24px;border-left:1px solid rgba(255,255,255,.18)}.hero-metrics span,.budget-meter span{display:block;font-size:12px;color:#bcd1e8}.hero-metrics strong{display:block;margin-top:5px;font-size:clamp(20px,2vw,31px);letter-spacing:-.05em}.negative{color:#ffbaa9}.budget-meter>div:first-child{display:flex;justify-content:space-between}.budget-meter b{font-size:12px}.meter-track,.budget-list article>div{height:7px;margin:10px 0 7px;background:rgba(255,255,255,.16);border-radius:99px;overflow:hidden}.meter-track i,.budget-list i{display:block;height:100%;border-radius:inherit;background:#75e7cf}.meter-track i.warning,.budget-list i.warning{background:#ffc869}.meter-track i.danger,.budget-list i.danger{background:#ff8d7b}.budget-meter small{color:#d9e8f4}.view-tabs{max-width:1500px;margin:0 auto 14px;display:flex;gap:8px}.view-tabs button{border:0;border-radius:12px;background:transparent;padding:10px 18px;color:var(--theme-text-muted);font-weight:800;font-size:15px}.view-tabs button.active{background:var(--theme-surface-raised);color:var(--blue);box-shadow:0 8px 18px rgba(45,72,108,.08)}.workspace{max-width:1500px;margin:auto;display:grid;grid-template-columns:minmax(560px,1.35fr) minmax(390px,.85fr);gap:18px;align-items:start}.ledger-panel,.insight-card{border:1px solid var(--theme-border);background:var(--theme-surface);box-shadow:var(--theme-shadow-sm);backdrop-filter:blur(20px)}.ledger-panel{border-radius:24px;overflow:hidden}.filter-bar{padding:14px;display:grid;grid-template-columns:minmax(190px,1fr) 120px 130px auto;gap:8px;border-bottom:1px solid var(--line)}.search-box{display:flex;align-items:center;gap:8px;background:var(--theme-field-surface);border-radius:12px;padding:0 12px}.search-box input,.filter-bar select{min-width:0;border:0;outline:0;background:transparent;color:var(--ink);height:38px}.filter-bar select{padding:0 10px;border-radius:12px;background:var(--theme-field-surface)}.filter-reset{background:transparent;color:var(--theme-text-muted)}.day-group>header{padding:16px 20px 10px;display:flex;justify-content:space-between;align-items:end}.day-group>header div{display:flex;gap:8px;align-items:baseline}.day-group>header strong{font-size:16px}.day-group>header span,.day-group>header p{font-size:11px;color:var(--theme-text-muted);margin:0}.bill-row{width:100%;padding:13px 20px;display:flex;align-items:center;gap:13px;border:0;border-top:1px solid var(--theme-divider);background:transparent;text-align:left;color:var(--ink);cursor:pointer;transition:.2s}.bill-row:hover{background:var(--theme-surface-hover);transform:translateX(2px)}.category-icon{--category-hue:210;flex:none;width:43px;height:43px;border-radius:14px;display:grid;place-items:center;background:hsl(var(--category-hue) 85% 94%);color:hsl(var(--category-hue) 68% 45%);font-weight:900}.category-icon.small{width:34px;height:34px;border-radius:11px}.bill-copy,.bill-meta{display:flex;flex-direction:column;gap:3px}.bill-copy{min-width:0;flex:1}.bill-copy small,.bill-meta small{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--theme-text-muted);font-size:11px}.bill-meta{text-align:right}.bill-meta b{font-size:17px}.expense{color:var(--theme-text)}.income,.good-change{color:#159477}.bad-change{color:#e16c5a}.pager{padding:16px 20px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--line);font-size:12px;color:var(--theme-text-muted)}.pager button{padding:8px 12px;border-radius:9px;background:var(--theme-control-surface);color:var(--theme-text-soft);margin-left:6px}.insight-panel{display:grid;gap:14px}.insight-card{padding:20px;border-radius:22px}.section-heading{display:flex;justify-content:space-between;align-items:center;margin-bottom:17px}.section-heading h2{margin:0;font-size:17px}.section-heading small,.legend{color:var(--theme-text-muted);font-size:11px}.comparison-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.comparison-grid article{padding:14px;background:var(--theme-surface-muted);border-radius:15px}.comparison-grid span,.comparison-grid small{display:block;color:var(--theme-text-muted);font-size:11px}.comparison-grid strong{display:block;margin:5px 0 2px;font-size:18px}.chart-wrap svg{width:100%;height:175px;overflow:visible}.grid-line{stroke:var(--theme-chart-grid);stroke-width:1}.trend{fill:none;stroke-width:4;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}.expense-line{stroke:#2878ff}.income-line{stroke:#22b49c}.legend{display:flex;align-items:center;gap:4px}.legend i{width:8px;height:8px;border-radius:50%;background:#2878ff}.legend i:nth-child(2){background:#22b49c;margin-left:7px}.chart-axis{display:flex;justify-content:space-between;color:var(--theme-chart-axis);font-size:10px}.category-ranking{display:grid;gap:13px}.category-ranking article{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center}.category-ranking article>div p{display:flex;justify-content:space-between;margin:0 0 6px;font-size:12px}.category-ranking article>div p span{color:var(--theme-text-muted)}.category-ranking article>div>div{height:5px;background:var(--theme-divider);border-radius:9px;overflow:hidden}.category-ranking article>div>div i{display:block;height:100%;border-radius:9px;background:linear-gradient(90deg,#2878ff,#2ab7ca)}.category-ranking article>strong{font-size:11px;color:var(--theme-text-muted)}.budget-list{display:grid;gap:14px}.budget-list article button{width:100%;padding:0;border:0;background:transparent;display:flex;justify-content:space-between;text-align:left;color:var(--ink);cursor:pointer}.budget-list article button span{display:flex;flex-direction:column}.budget-list small{color:var(--theme-text-muted)}.budget-list strong{font-size:11px}.budget-list article>div{background:var(--theme-divider);margin:8px 0 0}.text-button{background:transparent;color:var(--blue);font-weight:800}.mini-empty,.state-box{padding:30px;text-align:center;color:var(--theme-text-muted)}.state-box{min-height:260px;display:grid;place-content:center;gap:5px}.quick-entry{position:fixed;z-index:20;right:clamp(22px,4vw,60px);bottom:28px;width:190px;padding:11px 18px 11px 12px;display:grid;grid-template-columns:44px 1fr;text-align:left;border:1px solid var(--theme-border);border-radius:22px;background:var(--theme-popover-surface);color:var(--ink);box-shadow:var(--theme-shadow-md);backdrop-filter:blur(20px);cursor:pointer}.quick-entry>span{grid-row:1/3;width:42px;height:42px;display:grid;place-items:center;border-radius:14px;background:linear-gradient(145deg,#2878ff,#18a6bd);color:var(--theme-on-accent);font-size:25px}.quick-entry b{align-self:end}.quick-entry small{color:var(--theme-text-muted)}.type-tabs{display:flex;gap:8px}.type-tabs button{flex:1;padding:11px;border:0;border-radius:12px;background:var(--theme-control-surface);color:var(--theme-text-muted);font-weight:800}.type-tabs button.active{background:var(--theme-accent-soft);color:var(--theme-link)}.amount-display{min-height:92px;margin:14px 0;padding:16px 20px;display:flex;align-items:center;gap:8px;border-radius:18px;background:linear-gradient(120deg,#142d50,#236eae);color:var(--theme-on-accent)}.amount-display span{font-size:24px}.amount-display strong{font-size:36px;letter-spacing:-.04em;word-break:break-all}.amount-display small{margin-left:auto;color:#a9d8ed}.entry-body{display:grid;grid-template-columns:1fr 280px;gap:14px}.category-picker{max-height:290px;overflow:auto;display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.category-picker button{padding:8px 3px;border:1px solid transparent;border-radius:13px;background:var(--theme-control-surface);color:var(--theme-text-soft)}.category-picker button.active{border-color:var(--theme-accent);background:var(--theme-accent-soft);color:var(--theme-link)}.category-picker button span{width:35px;height:35px;margin:auto;display:grid;place-items:center;border-radius:11px;background:hsl(var(--category-hue) 85% 94%);color:hsl(var(--category-hue) 68% 45%);font-weight:900}.category-picker small{display:block;margin-top:4px}.number-pad{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.number-pad button{min-height:52px;border:0;border-radius:13px;background:var(--theme-control-surface);color:var(--theme-text);font-size:18px;font-weight:800}.number-pad button.operator{color:var(--theme-link);background:var(--theme-accent-soft)}.number-pad button.done{background:var(--theme-accent);color:var(--theme-on-accent)}.detail-fields,.budget-form{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}.detail-fields label,.budget-form label{display:flex;flex-direction:column;gap:5px;color:var(--theme-text-muted);font-size:11px}.detail-fields .wide,.budget-form .wide{grid-column:1/-1}.detail-fields input,.detail-fields select,.budget-form input,.budget-form select{height:38px;border:1px solid var(--theme-border-strong);border-radius:10px;padding:0 11px;background:var(--theme-field-surface);color:var(--ink)}.primary-button,.danger-button{border:0;border-radius:11px;padding:10px 16px;font-weight:800}.primary-button{background:var(--theme-accent);color:var(--theme-on-accent)}.danger-button{margin-right:auto;background:var(--theme-danger-soft);color:var(--theme-danger)}
.budget-meter-footer{display:flex;align-items:center;justify-content:space-between}.budget-meter-footer button{position:relative;z-index:1;border:0;background:transparent;color:var(--theme-link);font-size:12px;font-weight:800;cursor:pointer}.budget-list article>.budget-item-head{height:auto;margin:0;background:transparent;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;overflow:visible}.budget-item-head>button{min-width:0}.budget-item-actions{display:flex;gap:5px}.budget-list .budget-item-actions button{width:auto;padding:5px 8px;border:1px solid var(--theme-border);border-radius:8px;color:var(--theme-link);font-size:11px}.budget-list .budget-item-actions button.delete{border-color:color-mix(in srgb,var(--theme-danger) 34%,transparent);color:var(--theme-danger)}.budget-list article>.budget-item-head+div{height:7px;margin:8px 0 0;background:var(--theme-divider);border-radius:99px;overflow:hidden}
.detail-fields{grid-template-columns:repeat(3,minmax(0,1fr))}
@media(min-width:901px){.view-tabs{display:none}}
@media(max-width:1100px){.month-hero{grid-template-columns:1fr 2fr}.budget-meter{grid-column:1/-1}.workspace{grid-template-columns:minmax(460px,1.2fr) minmax(330px,.8fr)}}
@media(max-width:900px){.bills-page{padding:18px 14px 100px}.topbar h1{font-size:23px}.month-hero{margin-top:16px;padding:20px;grid-template-columns:1fr;border-radius:24px}.hero-metrics article{padding:4px 11px}.hero-metrics article:first-child{border-left:0}.hero-metrics strong{font-size:20px}.budget-meter{grid-column:auto}.workspace{display:block}.mobile-hidden{display:none}.insight-panel{gap:12px}.filter-bar{grid-template-columns:1fr 1fr}.search-box{grid-column:1/-1}.ledger-panel{border-radius:20px}.quick-entry{left:20px;right:20px;bottom:18px;width:auto}.entry-body{grid-template-columns:1fr}.category-picker{max-height:180px}.number-pad{order:-1}.personal-bill-dialog{max-height:92vh}.detail-fields{grid-template-columns:1fr}.detail-fields .wide{grid-column:auto}}
@media(max-width:520px){.month-switcher{justify-content:center}.hero-metrics{gap:0}.hero-metrics span{font-size:10px}.hero-metrics strong{font-size:16px}.filter-bar{grid-template-columns:1fr}.search-box{grid-column:auto}.bill-row{padding:12px}.bill-meta small{max-width:80px}.category-picker{grid-template-columns:repeat(3,1fr)}.comparison-grid{grid-template-columns:1fr}.detail-fields,.budget-form{grid-template-columns:1fr}.budget-form .wide{grid-column:auto}}
@media(max-height:640px) and (orientation:landscape){.bills-page{padding:10px 14px 84px}.topbar h1{font-size:21px}.month-hero{margin:12px auto;padding:15px 18px;grid-template-columns:minmax(180px,.8fr) 2fr;gap:14px;border-radius:20px}.budget-meter{grid-column:1/-1}.hero-metrics strong{font-size:19px}.view-tabs{display:flex;margin-bottom:9px}.workspace{display:block}.mobile-hidden{display:none}.filter-bar{grid-template-columns:minmax(180px,1fr) 110px 120px auto}.insight-panel{grid-template-columns:repeat(2,minmax(0,1fr));align-items:start}.quick-entry{right:16px;bottom:12px}.entry-body{grid-template-columns:1fr 260px}.category-picker{max-height:180px}.number-pad button{min-height:44px}.amount-display{min-height:68px;margin:8px 0;padding:10px 16px}.detail-fields{margin-top:9px}}
@media(min-width:521px) and (max-width:900px){.detail-fields{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style>
