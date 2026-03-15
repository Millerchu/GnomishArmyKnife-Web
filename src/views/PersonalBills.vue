<template>
  <div class="bills-page">
    <div class="page-nav">
      <button type="button" class="back-home-btn" @click="goBack">
        <span class="back-home-icon">←</span>
        <span>返回桌面</span>
      </button>
    </div>

    <div class="hero-panel">
      <div>
        <h1 class="page-title">个人账单</h1>
        <p class="page-subtitle">参考成熟记账应用的结构，把账单记录、月度收支分析和年度预算管理整合在同一页面内。</p>
      </div>
      <div class="hero-tags">
        <span class="hero-tag">本月支出 {{ formatCurrency(summary.currentMonthExpense) }}</span>
        <span class="hero-tag">本月收入 {{ formatCurrency(summary.currentMonthIncome) }}</span>
        <span class="hero-tag">{{ usingLocalData ? '本地演示数据' : '已接真实接口' }}</span>
      </div>
    </div>

    <section class="budget-panel">
      <div class="panel-head">
        <div>
          <h2 class="panel-title">{{ selectedYear }} 年预算看板</h2>
          <p class="panel-tip">年度预算功能已并入个人账单，预算按支出分类管理，执行进度实时由账单记录反推。</p>
        </div>
        <div class="toolbar-left">
          <button class="action-btn" :disabled="budgetSubmitting" @click="openCreateBudgetDialog">新增预算</button>
          <button class="ghost-btn" :disabled="budgetSubmitting" @click="loadBills">刷新预算</button>
        </div>
      </div>

      <div class="budget-overview-grid">
        <article class="summary-card">
          <span>年度预算</span>
          <strong>{{ formatCurrency(summary.annualBudgetAmount) }}</strong>
        </article>
        <article class="summary-card">
          <span>已用预算</span>
          <strong>{{ formatCurrency(summary.annualBudgetUsed) }}</strong>
        </article>
        <article class="summary-card">
          <span>剩余预算</span>
          <strong>{{ formatCurrency(summary.annualBudgetRemaining) }}</strong>
        </article>
        <article class="summary-card">
          <span>预算执行率</span>
          <strong>{{ formatPercent(summary.annualBudgetUsageRate) }}</strong>
        </article>
      </div>

      <div v-if="currentYearBudgets.length" class="budget-card-list">
        <article v-for="item in currentYearBudgets" :key="item.id" class="budget-card">
          <div class="budget-card-head">
            <div>
              <strong>{{ item.categoryName }}</strong>
              <p>{{ formatCurrency(item.usedAmount) }} / {{ formatCurrency(item.annualLimit) }}</p>
            </div>
            <div class="budget-card-actions">
              <span class="budget-status" :class="item.statusClass">{{ item.statusText }}</span>
              <button class="mini-btn" @click="openEditBudgetDialog(item)">编辑</button>
              <button class="mini-btn danger" @click="removeBudget(item)">删除</button>
            </div>
          </div>

          <div class="budget-track">
            <div class="budget-fill" :class="item.statusClass" :style="{width: `${Math.min(item.usageRate, 100)}%`}"></div>
          </div>

          <div class="budget-meta">
            <span>预警阈值 {{ formatPercent(item.alertThreshold) }}</span>
            <span>剩余 {{ formatCurrency(item.remainingAmount) }}</span>
          </div>
        </article>
      </div>
      <div v-else class="subtle-empty budget-empty">当前年度还没有预算记录</div>
    </section>

    <section class="filter-panel">
      <div class="filter-grid">
        <label class="field">
          <span>账单月份</span>
          <input v-model="query.month" class="input" type="month" />
        </label>

        <label class="field">
          <span>类型</span>
          <select v-model="query.billType" class="input">
            <option value="">全部类型</option>
            <option v-for="item in billTypeOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
        </label>

        <label class="field">
          <span>分类</span>
          <select v-model="query.categoryName" class="input">
            <option value="">全部分类</option>
            <option v-for="item in categoryOptions" :key="item" :value="item">{{ item }}</option>
          </select>
        </label>

        <label class="field">
          <span>关键词</span>
          <input
            v-model.trim="query.keyword"
            class="input"
            maxlength="64"
            placeholder="搜索商户、分类、备注、账户"
            @keyup.enter="handleSearch"
          />
        </label>
      </div>

      <div class="filter-actions">
        <button class="action-btn" :disabled="loading" @click="handleSearch">查询</button>
        <button class="ghost-btn" :disabled="loading" @click="resetQuery">重置</button>
      </div>
    </section>

    <div class="bills-layout">
      <section class="list-panel">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">账单流水</h2>
            <p class="panel-tip">记录每笔收入和支出，按月份查看主要消费去向，并与年度预算联动。</p>
          </div>
        </div>

        <div class="toolbar">
          <div class="toolbar-left">
            <button class="action-btn" :disabled="loading || submitting" @click="openCreateBillDialog">新增账单</button>
            <button class="ghost-btn" :disabled="loading || submitting" @click="loadBills">刷新列表</button>
          </div>
          <div class="toolbar-right">
            <span>共 {{ total }} 条</span>
            <span v-if="usingLocalData" class="mock-tip">当前为演示数据（后端未联通）</span>
          </div>
        </div>

        <div v-if="loading" class="empty-state">加载中...</div>

        <template v-else>
          <div v-if="pagedBills.length" class="table-wrap desktop-table">
            <table class="bill-table">
              <thead>
              <tr>
                <th>日期</th>
                <th>类型</th>
                <th>分类</th>
                <th>金额</th>
                <th>账户</th>
                <th>支付方式</th>
                <th>商户 / 对象</th>
                <th>备注</th>
                <th>操作</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="item in pagedBills" :key="item.id">
                <td>{{ item.billDate }}</td>
                <td>
                  <span class="type-chip" :class="item.billType === 'EXPENSE' ? 'expense' : 'income'">
                    {{ formatBillTypeText(item.billType) }}
                  </span>
                </td>
                <td>{{ item.categoryName }}</td>
                <td :class="item.billType === 'EXPENSE' ? 'amount-expense' : 'amount-income'">
                  {{ item.billType === 'EXPENSE' ? '-' : '+' }}{{ formatCurrency(item.amount) }}
                </td>
                <td>{{ item.accountName || '-' }}</td>
                <td>{{ item.paymentMethod || '-' }}</td>
                <td>{{ item.merchantName || '-' }}</td>
                <td>{{ item.note || '-' }}</td>
                <td>
                  <div class="row-actions">
                    <button class="mini-btn" @click="openEditBillDialog(item)">编辑</button>
                    <button class="mini-btn danger" @click="removeBill(item)">删除</button>
                  </div>
                </td>
              </tr>
              </tbody>
            </table>
          </div>

          <div v-if="pagedBills.length" class="mobile-list">
            <article v-for="item in pagedBills" :key="item.id" class="mobile-card">
              <div class="mobile-card-head">
                <div>
                  <h3 class="mobile-card-title">{{ item.categoryName }}</h3>
                  <p class="mobile-card-subtitle">{{ item.merchantName || item.accountName || '未填写对象' }}</p>
                </div>
                <span class="type-chip" :class="item.billType === 'EXPENSE' ? 'expense' : 'income'">
                  {{ formatBillTypeText(item.billType) }}
                </span>
              </div>

              <div class="mobile-card-grid">
                <p><span>金额</span><strong :class="item.billType === 'EXPENSE' ? 'amount-expense' : 'amount-income'">
                  {{ item.billType === 'EXPENSE' ? '-' : '+' }}{{ formatCurrency(item.amount) }}
                </strong></p>
                <p><span>日期</span><strong>{{ item.billDate }}</strong></p>
                <p><span>账户</span><strong>{{ item.accountName || '-' }}</strong></p>
                <p><span>支付方式</span><strong>{{ item.paymentMethod || '-' }}</strong></p>
                <p class="wide"><span>备注</span><strong>{{ item.note || '-' }}</strong></p>
              </div>

              <div class="mobile-card-actions">
                <button class="mini-btn" @click="openEditBillDialog(item)">编辑</button>
                <button class="mini-btn danger" @click="removeBill(item)">删除</button>
              </div>
            </article>
          </div>

          <div v-else class="empty-state">当前条件下暂无账单记录</div>
        </template>

        <div class="pager">
          <div class="pager-left">
            <span>第 {{ query.pageNo }} / {{ totalPages }} 页</span>
            <select v-model.number="query.pageSize" class="pager-select" :disabled="loading" @change="handlePageSizeChange">
              <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }} 条/页</option>
            </select>
          </div>
          <div class="pager-right">
            <button class="ghost-btn" :disabled="query.pageNo <= 1 || loading" @click="changePage(-1)">上一页</button>
            <button class="ghost-btn" :disabled="query.pageNo >= totalPages || loading" @click="changePage(1)">下一页</button>
          </div>
        </div>
      </section>

      <aside class="insight-panel">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">收支概览</h2>
            <p class="panel-tip">从月度收支、消费分类和最近账单三个视角快速回看现金流。</p>
          </div>
        </div>

        <div class="summary-grid">
          <article class="summary-card">
            <span>本月支出</span>
            <strong>{{ formatCurrency(summary.currentMonthExpense) }}</strong>
          </article>
          <article class="summary-card">
            <span>本月收入</span>
            <strong>{{ formatCurrency(summary.currentMonthIncome) }}</strong>
          </article>
          <article class="summary-card">
            <span>月度结余</span>
            <strong>{{ formatCurrency(summary.currentMonthBalance) }}</strong>
          </article>
          <article class="summary-card">
            <span>本年支出</span>
            <strong>{{ formatCurrency(summary.currentYearExpense) }}</strong>
          </article>
        </div>

        <div class="insight-block">
          <div class="insight-head">
            <h3 class="insight-title">本月分类支出</h3>
            <span>{{ categoryDistribution.length }} 类</span>
          </div>
          <div v-if="categoryDistribution.length" class="distribution-list">
            <div v-for="item in categoryDistribution" :key="item.categoryName" class="distribution-row">
              <div>
                <strong>{{ item.categoryName }}</strong>
                <span>{{ formatCurrency(item.amount) }}</span>
              </div>
              <b>{{ formatPercent(item.ratio) }}</b>
            </div>
          </div>
          <div v-else class="subtle-empty">本月暂无支出分类数据</div>
        </div>

        <div class="insight-block">
          <div class="insight-head">
            <h3 class="insight-title">最近账单</h3>
            <span>{{ recentBills.length }} 条</span>
          </div>
          <div v-if="recentBills.length" class="recent-list">
            <article v-for="item in recentBills" :key="item.id" class="recent-item" @click="openEditBillDialog(item)">
              <strong>{{ item.categoryName }} · {{ item.billDate }}</strong>
              <span :class="item.billType === 'EXPENSE' ? 'amount-expense' : 'amount-income'">
                {{ item.billType === 'EXPENSE' ? '-' : '+' }}{{ formatCurrency(item.amount) }}
              </span>
            </article>
          </div>
          <div v-else class="subtle-empty">暂无最近账单</div>
        </div>
      </aside>
    </div>

    <div v-if="showBillDialog" class="dialog-mask" @click.self="closeBillDialog">
      <div class="dialog">
        <h3 class="dialog-title">{{ billDialogMode === 'create' ? '新增账单' : '编辑账单' }}</h3>
        <form class="dialog-form" @submit.prevent="submitBillDialog">
          <div class="form-inline-grid">
            <label class="form-field">
              <span>账单类型</span>
              <select v-model="billForm.billType" class="input" required>
                <option v-for="item in billTypeOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
            </label>

            <label class="form-field">
              <span>分类</span>
              <input v-model.trim="billForm.categoryName" class="input" maxlength="32" placeholder="例如：餐饮 / 工资" required />
            </label>
          </div>

          <div class="form-inline-grid">
            <label class="form-field">
              <span>金额</span>
              <input v-model.number="billForm.amount" class="input" type="number" min="0" step="0.01" required />
            </label>

            <label class="form-field">
              <span>日期</span>
              <input v-model="billForm.billDate" class="input" type="date" required />
            </label>
          </div>

          <div class="form-inline-grid">
            <label class="form-field">
              <span>账户</span>
              <input v-model.trim="billForm.accountName" class="input" maxlength="32" placeholder="例如：招商银行卡" />
            </label>

            <label class="form-field">
              <span>支付方式</span>
              <input v-model.trim="billForm.paymentMethod" class="input" maxlength="32" placeholder="例如：支付宝 / 银行卡" />
            </label>
          </div>

          <label class="form-field">
            <span>商户 / 对象</span>
            <input v-model.trim="billForm.merchantName" class="input" maxlength="48" placeholder="例如：盒马 / 工资入账" />
          </label>

          <label class="form-field">
            <span>备注</span>
            <textarea v-model.trim="billForm.note" class="input textarea" rows="3" maxlength="160" placeholder="补充记录用途、场景等" />
          </label>

          <div class="dialog-actions">
            <button type="button" class="ghost-btn" :disabled="submitting" @click="closeBillDialog">取消</button>
            <button type="submit" class="action-btn" :disabled="submitting">
              {{ submitting ? '提交中...' : (billDialogMode === 'create' ? '保存账单' : '更新账单') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="showBudgetDialog" class="dialog-mask" @click.self="closeBudgetDialog">
      <div class="dialog">
        <h3 class="dialog-title">{{ budgetDialogMode === 'create' ? '新增年度预算' : '编辑年度预算' }}</h3>
        <form class="dialog-form" @submit.prevent="submitBudgetDialog">
          <div class="form-inline-grid">
            <label class="form-field">
              <span>预算年份</span>
              <input v-model.number="budgetForm.year" class="input" type="number" min="2020" max="2099" required />
            </label>

            <label class="form-field">
              <span>分类</span>
              <input v-model.trim="budgetForm.categoryName" class="input" maxlength="32" placeholder="例如：餐饮" required />
            </label>
          </div>

          <div class="form-inline-grid">
            <label class="form-field">
              <span>年度预算额度</span>
              <input v-model.number="budgetForm.annualLimit" class="input" type="number" min="0" step="0.01" required />
            </label>

            <label class="form-field">
              <span>预警阈值</span>
              <input v-model.number="budgetForm.alertThreshold" class="input" type="number" min="0" max="1" step="0.01" placeholder="例如：0.8" required />
            </label>
          </div>

          <label class="form-field">
            <span>备注</span>
            <textarea v-model.trim="budgetForm.note" class="input textarea" rows="3" maxlength="120" placeholder="例如：餐饮全年控制在 1.5 万内" />
          </label>

          <div class="dialog-actions">
            <button type="button" class="ghost-btn" :disabled="budgetSubmitting" @click="closeBudgetDialog">取消</button>
            <button type="submit" class="action-btn" :disabled="budgetSubmitting">
              {{ budgetSubmitting ? '提交中...' : (budgetDialogMode === 'create' ? '保存预算' : '更新预算') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import {computed, onMounted, reactive, ref} from 'vue'
import {useRouter} from 'vue-router'
import {
  createAnnualBudget,
  createPersonalBill,
  deleteAnnualBudget,
  deletePersonalBill,
  getPersonalBillSummary,
  listAnnualBudgets,
  listPersonalBills,
  updateAnnualBudget,
  updatePersonalBill
} from '@/api/personalBills'

const LOCAL_BILL_KEY = 'personal_bills_records'
const LOCAL_BUDGET_KEY = 'personal_budget_records'
const PAGE_SIZE_OPTIONS = [8, 12, 20]
const BILL_TYPE_OPTIONS = [
  {value: 'EXPENSE', label: '支出'},
  {value: 'INCOME', label: '收入'}
]
const DEFAULT_BILLS = [
  {id: 'bill-1', billType: 'EXPENSE', categoryName: '餐饮', amount: 68, accountName: '招商银行卡', paymentMethod: '支付宝', merchantName: '盒马鲜生', billDate: '2026-03-12', note: '晚餐和水果', updatedAt: '2026-03-12 20:13'},
  {id: 'bill-2', billType: 'EXPENSE', categoryName: '交通', amount: 36, accountName: '微信零钱', paymentMethod: '微信支付', merchantName: '滴滴出行', billDate: '2026-03-11', note: '加班打车', updatedAt: '2026-03-11 22:08'},
  {id: 'bill-3', billType: 'EXPENSE', categoryName: '数码', amount: 699, accountName: '招商银行卡', paymentMethod: '银行卡', merchantName: 'Apple', billDate: '2026-03-08', note: '配件补购', updatedAt: '2026-03-08 19:10'},
  {id: 'bill-4', billType: 'INCOME', categoryName: '工资', amount: 18500, accountName: '招商银行卡', paymentMethod: '银行转账', merchantName: '工资入账', billDate: '2026-03-05', note: '3 月工资', updatedAt: '2026-03-05 10:02'},
  {id: 'bill-5', billType: 'EXPENSE', categoryName: '居家', amount: 228, accountName: '招商银行卡', paymentMethod: '支付宝', merchantName: '京东', billDate: '2026-03-02', note: '清洁用品', updatedAt: '2026-03-02 15:46'},
  {id: 'bill-6', billType: 'EXPENSE', categoryName: '娱乐', amount: 188, accountName: '微信零钱', paymentMethod: '微信支付', merchantName: 'Steam', billDate: '2026-02-26', note: '游戏购买', updatedAt: '2026-02-26 09:35'},
  {id: 'bill-7', billType: 'INCOME', categoryName: '奖金', amount: 3200, accountName: '招商银行卡', paymentMethod: '银行转账', merchantName: '项目奖金', billDate: '2026-02-20', note: '', updatedAt: '2026-02-20 10:22'},
  {id: 'bill-8', billType: 'EXPENSE', categoryName: '学习', amount: 399, accountName: '支付宝余额', paymentMethod: '支付宝', merchantName: '极客时间', billDate: '2026-01-18', note: '年度课程', updatedAt: '2026-01-18 16:21'},
  {id: 'bill-9', billType: 'EXPENSE', categoryName: '旅行', amount: 1260, accountName: '招商银行卡', paymentMethod: '银行卡', merchantName: '携程', billDate: '2026-01-11', note: '春节返乡车票', updatedAt: '2026-01-11 11:08'}
]
const DEFAULT_BUDGETS = [
  {id: 'budget-1', year: 2026, categoryName: '餐饮', annualLimit: 15000, alertThreshold: 0.8, note: '控制外食支出'},
  {id: 'budget-2', year: 2026, categoryName: '交通', annualLimit: 6000, alertThreshold: 0.85, note: ''},
  {id: 'budget-3', year: 2026, categoryName: '居家', annualLimit: 8000, alertThreshold: 0.8, note: ''},
  {id: 'budget-4', year: 2026, categoryName: '娱乐', annualLimit: 5000, alertThreshold: 0.75, note: ''},
  {id: 'budget-5', year: 2026, categoryName: '数码', annualLimit: 12000, alertThreshold: 0.7, note: '大件设备也放这里'}
]

function unwrapData(res) {
  const payload = res?.data
  if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data
  }
  return payload
}

function getDefaultMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}`
}

function formatDateTime(date = new Date()) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hour = `${date.getHours()}`.padStart(2, '0')
  const minute = `${date.getMinutes()}`.padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

function normalizeBill(item = {}) {
  return {
    id: item.id ?? item.billId ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    billType: item.billType || item.type || 'EXPENSE',
    categoryName: item.categoryName || item.category || '',
    amount: Number(item.amount ?? 0),
    accountName: item.accountName || item.account || '',
    paymentMethod: item.paymentMethod || item.payMethod || '',
    merchantName: item.merchantName || item.merchant || '',
    billDate: item.billDate || item.transactionDate || '',
    note: item.note || item.remark || '',
    updatedAt: item.updatedAt || item.updateTime || item.createdAt || item.createTime || ''
  }
}

function normalizeBudget(item = {}) {
  return {
    id: item.id ?? item.budgetId ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    year: Number(item.year ?? new Date().getFullYear()),
    categoryName: item.categoryName || item.category || '',
    annualLimit: Number(item.annualLimit ?? item.limitAmount ?? 0),
    alertThreshold: Number(item.alertThreshold ?? 0.8),
    note: item.note || item.remark || ''
  }
}

function loadLocalBills() {
  try {
    const raw = localStorage.getItem(LOCAL_BILL_KEY)
    if (!raw) {
      localStorage.setItem(LOCAL_BILL_KEY, JSON.stringify(DEFAULT_BILLS))
      return DEFAULT_BILLS.map((item) => normalizeBill(item))
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return DEFAULT_BILLS.map((item) => normalizeBill(item))
    }
    return parsed.map((item) => normalizeBill(item))
  } catch (error) {
    return DEFAULT_BILLS.map((item) => normalizeBill(item))
  }
}

function loadLocalBudgets() {
  try {
    const raw = localStorage.getItem(LOCAL_BUDGET_KEY)
    if (!raw) {
      localStorage.setItem(LOCAL_BUDGET_KEY, JSON.stringify(DEFAULT_BUDGETS))
      return DEFAULT_BUDGETS.map((item) => normalizeBudget(item))
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return DEFAULT_BUDGETS.map((item) => normalizeBudget(item))
    }
    return parsed.map((item) => normalizeBudget(item))
  } catch (error) {
    return DEFAULT_BUDGETS.map((item) => normalizeBudget(item))
  }
}

function persistLocalBills(list) {
  localStorage.setItem(LOCAL_BILL_KEY, JSON.stringify(list))
}

function persistLocalBudgets(list) {
  localStorage.setItem(LOCAL_BUDGET_KEY, JSON.stringify(list))
}

function sortBills(list = []) {
  return [...list].sort((prev, next) => `${next.billDate}-${next.id}`.localeCompare(`${prev.billDate}-${prev.id}`))
}

function buildBudgetStatus(usageRate = 0, alertThreshold = 0.8) {
  if (usageRate >= 1) {
    return {statusClass: 'danger', statusText: '已超预算'}
  }
  if (usageRate >= alertThreshold) {
    return {statusClass: 'warning', statusText: '接近上限'}
  }
  return {statusClass: 'safe', statusText: '预算健康'}
}

function buildCategoryDistribution(records = []) {
  const expenseRecords = records.filter((item) => item.billType === 'EXPENSE')
  const total = expenseRecords.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const categoryMap = expenseRecords.reduce((result, item) => {
    const current = result[item.categoryName] || {categoryName: item.categoryName, amount: 0}
    current.amount += Number(item.amount || 0)
    result[item.categoryName] = current
    return result
  }, {})

  return Object.values(categoryMap)
    .map((item) => ({
      ...item,
      ratio: total > 0 ? item.amount / total : 0
    }))
    .sort((prev, next) => next.amount - prev.amount)
}

function buildSummary(allBills = [], filteredBills = [], budgets = [], selectedMonth = getDefaultMonth()) {
  const selectedYear = Number(selectedMonth.slice(0, 4))
  const currentMonthBills = filteredBills.filter((item) => `${item.billDate || ''}`.startsWith(selectedMonth))
  const currentYearBills = allBills.filter((item) => `${item.billDate || ''}`.startsWith(`${selectedYear}`))
  const currentYearExpenseBills = currentYearBills.filter((item) => item.billType === 'EXPENSE')
  const currentYearBudgets = budgets.filter((item) => Number(item.year) === selectedYear)

  const currentMonthExpense = currentMonthBills
    .filter((item) => item.billType === 'EXPENSE')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const currentMonthIncome = currentMonthBills
    .filter((item) => item.billType === 'INCOME')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const currentYearExpense = currentYearExpenseBills.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const annualBudgetAmount = currentYearBudgets.reduce((sum, item) => sum + Number(item.annualLimit || 0), 0)
  const currentYearBudgetSpent = currentYearBudgets.reduce((sum, item) => {
    const used = currentYearExpenseBills
      .filter((bill) => bill.categoryName === item.categoryName)
      .reduce((amountSum, bill) => amountSum + Number(bill.amount || 0), 0)
    return sum + used
  }, 0)

  return {
    currentMonthExpense,
    currentMonthIncome,
    currentMonthBalance: currentMonthIncome - currentMonthExpense,
    currentYearExpense,
    annualBudgetAmount,
    annualBudgetUsed: currentYearBudgetSpent,
    annualBudgetRemaining: Math.max(annualBudgetAmount - currentYearBudgetSpent, 0),
    annualBudgetUsageRate: annualBudgetAmount > 0 ? currentYearBudgetSpent / annualBudgetAmount : 0,
    categoryDistribution: buildCategoryDistribution(currentMonthBills),
    recentBills: sortBills(filteredBills).slice(0, 5)
  }
}

function buildBudgetViewList(budgets = [], bills = [], year) {
  const yearExpenseBills = bills.filter((item) => item.billType === 'EXPENSE' && `${item.billDate || ''}`.startsWith(`${year}`))
  return budgets
    .filter((item) => Number(item.year) === Number(year))
    .map((item) => {
      const usedAmount = yearExpenseBills
        .filter((bill) => bill.categoryName === item.categoryName)
        .reduce((sum, bill) => sum + Number(bill.amount || 0), 0)
      const annualLimit = Number(item.annualLimit || 0)
      const usageRate = annualLimit > 0 ? usedAmount / annualLimit : 0
      const status = buildBudgetStatus(usageRate, Number(item.alertThreshold || 0.8))
      return {
        ...item,
        usedAmount,
        remainingAmount: Math.max(annualLimit - usedAmount, 0),
        usageRate: Number((usageRate * 100).toFixed(2)),
        ...status
      }
    })
    .sort((prev, next) => next.usageRate - prev.usageRate || prev.categoryName.localeCompare(next.categoryName))
}

export default {
  name: 'PersonalBills',
  setup() {
    const router = useRouter()

    const loading = ref(false)
    const submitting = ref(false)
    const budgetSubmitting = ref(false)
    const usingLocalData = ref(false)
    const total = ref(0)
    const allBills = ref([])
    const pagedBills = ref([])
    const budgets = ref([])
    const categoryDistribution = ref([])
    const recentBills = ref([])
    const currentYearBudgets = ref([])
    const showBillDialog = ref(false)
    const showBudgetDialog = ref(false)
    const billDialogMode = ref('create')
    const budgetDialogMode = ref('create')
    const editingBillId = ref('')
    const editingBudgetId = ref('')

    const query = reactive({
      month: getDefaultMonth(),
      billType: '',
      categoryName: '',
      keyword: '',
      pageNo: 1,
      pageSize: PAGE_SIZE_OPTIONS[0]
    })

    const summary = reactive({
      currentMonthExpense: 0,
      currentMonthIncome: 0,
      currentMonthBalance: 0,
      currentYearExpense: 0,
      annualBudgetAmount: 0,
      annualBudgetUsed: 0,
      annualBudgetRemaining: 0,
      annualBudgetUsageRate: 0
    })

    const billForm = reactive({
      billType: 'EXPENSE',
      categoryName: '',
      amount: 0,
      accountName: '',
      paymentMethod: '',
      merchantName: '',
      billDate: '',
      note: ''
    })

    const budgetForm = reactive({
      year: Number(getDefaultMonth().slice(0, 4)),
      categoryName: '',
      annualLimit: 0,
      alertThreshold: 0.8,
      note: ''
    })

    const totalPages = computed(() => Math.max(1, Math.ceil(total.value / query.pageSize)))
    const pageSizeOptions = PAGE_SIZE_OPTIONS
    const billTypeOptions = BILL_TYPE_OPTIONS
    const selectedYear = computed(() => Number((query.month || getDefaultMonth()).slice(0, 4)))
    const categoryOptions = computed(() => Array.from(new Set(allBills.value.map((item) => item.categoryName).filter(Boolean))))

    const applySummary = (filteredBills) => {
      const nextSummary = buildSummary(allBills.value, filteredBills, budgets.value, query.month || getDefaultMonth())
      summary.currentMonthExpense = nextSummary.currentMonthExpense
      summary.currentMonthIncome = nextSummary.currentMonthIncome
      summary.currentMonthBalance = nextSummary.currentMonthBalance
      summary.currentYearExpense = nextSummary.currentYearExpense
      summary.annualBudgetAmount = nextSummary.annualBudgetAmount
      summary.annualBudgetUsed = nextSummary.annualBudgetUsed
      summary.annualBudgetRemaining = nextSummary.annualBudgetRemaining
      summary.annualBudgetUsageRate = nextSummary.annualBudgetUsageRate
      categoryDistribution.value = nextSummary.categoryDistribution
      recentBills.value = nextSummary.recentBills
      currentYearBudgets.value = buildBudgetViewList(budgets.value, allBills.value, selectedYear.value)
    }

    const matchesFilters = (item) => {
      const keyword = query.keyword.trim().toLowerCase()
      if (query.month && !`${item.billDate || ''}`.startsWith(query.month)) {
        return false
      }
      if (query.billType && item.billType !== query.billType) {
        return false
      }
      if (query.categoryName && item.categoryName !== query.categoryName) {
        return false
      }
      if (keyword) {
        const text = [
          item.categoryName,
          item.accountName,
          item.paymentMethod,
          item.merchantName,
          item.note
        ].filter(Boolean).join(' ').toLowerCase()
        if (!text.includes(keyword)) {
          return false
        }
      }
      return true
    }

    const applyLocalFilterAndPaging = () => {
      const filtered = sortBills(allBills.value.filter((item) => matchesFilters(item)))
      total.value = filtered.length
      const safePageNo = Math.min(query.pageNo, Math.max(1, Math.ceil(filtered.length / query.pageSize) || 1))
      query.pageNo = safePageNo
      const startIndex = (safePageNo - 1) * query.pageSize
      pagedBills.value = filtered.slice(startIndex, startIndex + query.pageSize)
      applySummary(filtered)
    }

    const syncLocalBills = (records) => {
      const nextRecords = sortBills(records.map((item) => normalizeBill(item)))
      allBills.value = nextRecords
      persistLocalBills(nextRecords)
      applyLocalFilterAndPaging()
    }

    const syncLocalBudgets = (records) => {
      const nextRecords = records.map((item) => normalizeBudget(item))
      budgets.value = nextRecords
      persistLocalBudgets(nextRecords)
      applyLocalFilterAndPaging()
    }

    const loadBills = async () => {
      loading.value = true
      try {
        const billRes = await listPersonalBills({
          pageNo: query.pageNo,
          pageSize: query.pageSize,
          month: query.month || undefined,
          billType: query.billType || undefined,
          categoryName: query.categoryName || undefined,
          keyword: query.keyword || undefined
        })
        const billPayload = unwrapData(billRes) || {}
        const billList = Array.isArray(billPayload)
          ? billPayload
          : (billPayload.list || billPayload.records || billPayload.rows || [])
        const normalizedBills = sortBills(billList.map((item) => normalizeBill(item)))
        allBills.value = normalizedBills
        pagedBills.value = normalizedBills
        total.value = Number(billPayload.total ?? billPayload.count ?? normalizedBills.length)
        usingLocalData.value = false

        try {
          const budgetRes = await listAnnualBudgets({year: selectedYear.value})
          const budgetPayload = unwrapData(budgetRes) || {}
          const budgetList = Array.isArray(budgetPayload)
            ? budgetPayload
            : (budgetPayload.list || budgetPayload.records || budgetPayload.rows || [])
          budgets.value = budgetList.map((item) => normalizeBudget(item))
        } catch (error) {
          budgets.value = loadLocalBudgets()
        }

        try {
          const summaryRes = await getPersonalBillSummary({
            month: query.month || undefined,
            year: selectedYear.value
          })
          const summaryPayload = unwrapData(summaryRes) || {}
          summary.currentMonthExpense = Number(summaryPayload.currentMonthExpense ?? 0)
          summary.currentMonthIncome = Number(summaryPayload.currentMonthIncome ?? 0)
          summary.currentMonthBalance = Number(summaryPayload.currentMonthBalance ?? 0)
          summary.currentYearExpense = Number(summaryPayload.currentYearExpense ?? 0)
          summary.annualBudgetAmount = Number(summaryPayload.annualBudgetAmount ?? 0)
          summary.annualBudgetUsed = Number(summaryPayload.annualBudgetUsed ?? 0)
          summary.annualBudgetRemaining = Number(summaryPayload.annualBudgetRemaining ?? 0)
          summary.annualBudgetUsageRate = Number(summaryPayload.annualBudgetUsageRate ?? 0)
          categoryDistribution.value = Array.isArray(summaryPayload.categoryDistribution)
            ? summaryPayload.categoryDistribution
            : buildSummary(allBills.value, allBills.value.filter((item) => matchesFilters(item)), budgets.value, query.month).categoryDistribution
          recentBills.value = Array.isArray(summaryPayload.recentBills)
            ? summaryPayload.recentBills.map((item) => normalizeBill(item))
            : sortBills(allBills.value.filter((item) => matchesFilters(item))).slice(0, 5)
          currentYearBudgets.value = Array.isArray(summaryPayload.budgetProgressList)
            ? summaryPayload.budgetProgressList
            : buildBudgetViewList(budgets.value, allBills.value, selectedYear.value)
        } catch (error) {
          applySummary(allBills.value.filter((item) => matchesFilters(item)))
        }
      } catch (error) {
        allBills.value = sortBills(loadLocalBills())
        budgets.value = loadLocalBudgets()
        usingLocalData.value = true
        applyLocalFilterAndPaging()
      } finally {
        loading.value = false
      }
    }

    const resetBillForm = () => {
      billForm.billType = 'EXPENSE'
      billForm.categoryName = ''
      billForm.amount = 0
      billForm.accountName = ''
      billForm.paymentMethod = ''
      billForm.merchantName = ''
      billForm.billDate = ''
      billForm.note = ''
    }

    const fillBillForm = (record) => {
      billForm.billType = record.billType || 'EXPENSE'
      billForm.categoryName = record.categoryName || ''
      billForm.amount = Number(record.amount || 0)
      billForm.accountName = record.accountName || ''
      billForm.paymentMethod = record.paymentMethod || ''
      billForm.merchantName = record.merchantName || ''
      billForm.billDate = record.billDate || ''
      billForm.note = record.note || ''
    }

    const resetBudgetForm = () => {
      budgetForm.year = selectedYear.value
      budgetForm.categoryName = ''
      budgetForm.annualLimit = 0
      budgetForm.alertThreshold = 0.8
      budgetForm.note = ''
    }

    const fillBudgetForm = (record) => {
      budgetForm.year = Number(record.year || selectedYear.value)
      budgetForm.categoryName = record.categoryName || ''
      budgetForm.annualLimit = Number(record.annualLimit || 0)
      budgetForm.alertThreshold = Number(record.alertThreshold || 0.8)
      budgetForm.note = record.note || ''
    }

    const openCreateBillDialog = () => {
      billDialogMode.value = 'create'
      editingBillId.value = ''
      resetBillForm()
      billForm.billDate = `${query.month || getDefaultMonth()}-01`
      showBillDialog.value = true
    }

    const openEditBillDialog = (item) => {
      billDialogMode.value = 'edit'
      editingBillId.value = item.id
      fillBillForm(item)
      showBillDialog.value = true
    }

    const closeBillDialog = () => {
      if (submitting.value) {
        return
      }
      showBillDialog.value = false
      resetBillForm()
    }

    const openCreateBudgetDialog = () => {
      budgetDialogMode.value = 'create'
      editingBudgetId.value = ''
      resetBudgetForm()
      showBudgetDialog.value = true
    }

    const openEditBudgetDialog = (item) => {
      budgetDialogMode.value = 'edit'
      editingBudgetId.value = item.id
      fillBudgetForm(item)
      showBudgetDialog.value = true
    }

    const closeBudgetDialog = () => {
      if (budgetSubmitting.value) {
        return
      }
      showBudgetDialog.value = false
      resetBudgetForm()
    }

    const buildBillPayload = () => ({
      billType: billForm.billType,
      categoryName: billForm.categoryName,
      amount: Number(billForm.amount || 0),
      accountName: billForm.accountName,
      paymentMethod: billForm.paymentMethod,
      merchantName: billForm.merchantName,
      billDate: billForm.billDate,
      note: billForm.note
    })

    const buildBudgetPayload = () => ({
      year: Number(budgetForm.year || selectedYear.value),
      categoryName: budgetForm.categoryName,
      annualLimit: Number(budgetForm.annualLimit || 0),
      alertThreshold: Number(budgetForm.alertThreshold || 0),
      note: budgetForm.note
    })

    const submitBillDialog = async () => {
      if (!billForm.categoryName) {
        alert('请输入分类')
        return
      }
      if (!billForm.amount) {
        alert('请输入金额')
        return
      }
      if (!billForm.billDate) {
        alert('请选择日期')
        return
      }
      if (submitting.value) {
        return
      }

      const payload = buildBillPayload()
      submitting.value = true
      try {
        if (billDialogMode.value === 'create') {
          await createPersonalBill(payload)
        } else {
          await updatePersonalBill(editingBillId.value, payload)
        }
        showBillDialog.value = false
        resetBillForm()
        await loadBills()
      } catch (error) {
        const now = formatDateTime()
        if (billDialogMode.value === 'create') {
          syncLocalBills([
            normalizeBill({
              ...payload,
              id: `bill-${Date.now()}`,
              updatedAt: now
            }),
            ...loadLocalBills()
          ])
        } else {
          syncLocalBills(loadLocalBills().map((item) => (
            item.id === editingBillId.value
              ? normalizeBill({
                ...item,
                ...payload,
                updatedAt: now
              })
              : item
          )))
        }
        usingLocalData.value = true
        showBillDialog.value = false
        resetBillForm()
      } finally {
        submitting.value = false
      }
    }

    const submitBudgetDialog = async () => {
      if (!budgetForm.categoryName) {
        alert('请输入预算分类')
        return
      }
      if (!budgetForm.annualLimit) {
        alert('请输入预算额度')
        return
      }
      if (budgetForm.alertThreshold <= 0 || budgetForm.alertThreshold > 1) {
        alert('预警阈值请输入 0 到 1 之间的小数')
        return
      }
      if (budgetSubmitting.value) {
        return
      }

      const payload = buildBudgetPayload()
      budgetSubmitting.value = true
      try {
        if (budgetDialogMode.value === 'create') {
          await createAnnualBudget(payload)
        } else {
          await updateAnnualBudget(editingBudgetId.value, payload)
        }
        showBudgetDialog.value = false
        resetBudgetForm()
        await loadBills()
      } catch (error) {
        if (budgetDialogMode.value === 'create') {
          syncLocalBudgets([
            normalizeBudget({
              ...payload,
              id: `budget-${Date.now()}`
            }),
            ...loadLocalBudgets()
          ])
        } else {
          syncLocalBudgets(loadLocalBudgets().map((item) => (
            item.id === editingBudgetId.value
              ? normalizeBudget({
                ...item,
                ...payload
              })
              : item
          )))
        }
        usingLocalData.value = true
        showBudgetDialog.value = false
        resetBudgetForm()
      } finally {
        budgetSubmitting.value = false
      }
    }

    const removeBill = async (item) => {
      if (!window.confirm(`确认删除账单【${item.categoryName} / ${item.billDate}】吗？`)) {
        return
      }
      try {
        await deletePersonalBill(item.id)
        await loadBills()
      } catch (error) {
        syncLocalBills(loadLocalBills().filter((record) => record.id !== item.id))
        usingLocalData.value = true
      }
    }

    const removeBudget = async (item) => {
      if (!window.confirm(`确认删除预算【${item.categoryName} / ${item.year}】吗？`)) {
        return
      }
      try {
        await deleteAnnualBudget(item.id)
        await loadBills()
      } catch (error) {
        syncLocalBudgets(loadLocalBudgets().filter((record) => record.id !== item.id))
        usingLocalData.value = true
      }
    }

    const handleSearch = () => {
      query.pageNo = 1
      loadBills()
    }

    const resetQuery = () => {
      query.month = getDefaultMonth()
      query.billType = ''
      query.categoryName = ''
      query.keyword = ''
      query.pageNo = 1
      query.pageSize = PAGE_SIZE_OPTIONS[0]
      loadBills()
    }

    const changePage = (offset) => {
      const nextPage = query.pageNo + offset
      if (nextPage < 1 || nextPage > totalPages.value) {
        return
      }
      query.pageNo = nextPage
      loadBills()
    }

    const handlePageSizeChange = () => {
      query.pageNo = 1
      loadBills()
    }

    const goBack = () => {
      router.push('/home')
    }

    const formatCurrency = (value) => `¥${Number(value || 0).toFixed(2)}`
    const formatPercent = (value) => `${(Number(value || 0) * 100).toFixed(0)}%`
    const formatBillTypeText = (value) => billTypeOptions.find((item) => item.value === value)?.label || value || '-'

    onMounted(() => {
      loadBills()
    })

    return {
      loading,
      submitting,
      budgetSubmitting,
      usingLocalData,
      total,
      pagedBills,
      currentYearBudgets,
      categoryDistribution,
      recentBills,
      query,
      summary,
      billForm,
      budgetForm,
      showBillDialog,
      showBudgetDialog,
      billDialogMode,
      budgetDialogMode,
      pageSizeOptions,
      billTypeOptions,
      categoryOptions,
      selectedYear,
      totalPages,
      handleSearch,
      resetQuery,
      changePage,
      handlePageSizeChange,
      openCreateBillDialog,
      openEditBillDialog,
      closeBillDialog,
      submitBillDialog,
      removeBill,
      openCreateBudgetDialog,
      openEditBudgetDialog,
      closeBudgetDialog,
      submitBudgetDialog,
      removeBudget,
      loadBills,
      goBack,
      formatCurrency,
      formatPercent,
      formatBillTypeText
    }
  }
}
</script>

<style scoped>
.bills-page {
  min-height: 100vh;
  height: 100%;
  padding: 18px 22px 26px;
  color: #fff;
  overflow: auto;
}

.page-nav {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 12px;
}

.back-home-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 42px;
  padding: 0 16px 0 12px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  color: #fff;
  cursor: pointer;
  background: rgba(12, 32, 52, 0.58);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(12px);
  transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;
}

.back-home-btn:hover {
  transform: translateY(-1px);
  background: rgba(16, 40, 64, 0.76);
  border-color: rgba(255, 255, 255, 0.28);
}

.back-home-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.14);
}

.hero-panel,
.budget-panel,
.filter-panel,
.list-panel,
.insight-panel,
.dialog {
  border-radius: 18px;
  padding: 16px 18px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: linear-gradient(135deg, rgba(7, 22, 39, 0.82), rgba(17, 49, 73, 0.72));
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(16px);
}

.hero-panel,
.budget-panel,
.filter-panel {
  margin-bottom: 14px;
}

.hero-panel,
.toolbar,
.panel-head,
.pager,
.insight-head,
.distribution-row,
.recent-item,
.dialog-actions,
.mobile-card-actions,
.budget-card-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hero-panel,
.toolbar,
.panel-head,
.pager,
.insight-head,
.distribution-row,
.budget-card-head {
  justify-content: space-between;
}

.page-title,
.panel-title,
.dialog-title,
.insight-title,
.mobile-card-title {
  margin: 0;
}

.page-title {
  font-size: 28px;
}

.page-subtitle,
.panel-tip,
.mobile-card-subtitle,
.subtle-empty,
.budget-card-head p {
  margin: 6px 0 0;
  color: rgba(255, 255, 255, 0.74);
}

.hero-tags,
.toolbar-left,
.toolbar-right,
.row-actions,
.mobile-card-actions,
.budget-card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.hero-tag,
.type-chip,
.budget-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
}

.hero-tag {
  background: rgba(91, 180, 255, 0.18);
  color: #d7f0ff;
}

.mock-tip {
  padding: 4px 8px;
  border-radius: 8px;
  color: #ffecb3;
  background: rgba(255, 184, 0, 0.2);
}

.budget-overview-grid,
.filter-grid,
.summary-grid,
.mobile-card-grid,
.form-inline-grid {
  display: grid;
  gap: 12px;
}

.budget-overview-grid {
  margin-top: 14px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.budget-card-list {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.budget-card,
.summary-card,
.distribution-row,
.recent-item,
.mobile-card {
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.08);
}

.budget-card,
.summary-card,
.mobile-card {
  padding: 14px;
}

.budget-card-head strong,
.summary-card strong {
  font-size: 22px;
  line-height: 1.2;
}

.budget-track {
  position: relative;
  height: 12px;
  margin-top: 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.budget-fill {
  height: 100%;
  border-radius: 999px;
}

.budget-fill.safe {
  background: linear-gradient(90deg, rgba(34, 197, 94, 0.92), rgba(45, 212, 191, 0.92));
}

.budget-fill.warning {
  background: linear-gradient(90deg, rgba(250, 204, 21, 0.92), rgba(249, 115, 22, 0.92));
}

.budget-fill.danger {
  background: linear-gradient(90deg, rgba(248, 113, 113, 0.92), rgba(220, 38, 38, 0.92));
}

.budget-status.safe {
  background: rgba(34, 197, 94, 0.18);
  color: #bbf7d0;
}

.budget-status.warning {
  background: rgba(250, 204, 21, 0.18);
  color: #fde68a;
}

.budget-status.danger {
  background: rgba(248, 113, 113, 0.18);
  color: #fecaca;
}

.budget-meta {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-top: 10px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.72);
}

.budget-empty {
  margin-top: 14px;
}

.filter-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
}

.filter-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.field,
.form-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field span,
.form-field span,
.mobile-card-grid span,
.summary-card span,
.distribution-row span {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.72);
}

.filter-actions {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

.bills-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(320px, 0.95fr);
  gap: 14px;
}

.summary-grid {
  margin-top: 14px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.insight-block {
  margin-top: 16px;
}

.distribution-list,
.recent-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.distribution-row,
.recent-item {
  padding: 12px 14px;
}

.distribution-row > div,
.recent-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.recent-item {
  cursor: pointer;
}

.action-btn,
.ghost-btn,
.mini-btn {
  border: none;
  border-radius: 10px;
  color: #fff;
  cursor: pointer;
}

.action-btn,
.ghost-btn {
  min-height: 38px;
  padding: 0 14px;
}

.action-btn {
  background: linear-gradient(135deg, #1996ff, #27d5a4);
}

.ghost-btn {
  background: rgba(255, 255, 255, 0.12);
}

.mini-btn {
  min-height: 30px;
  padding: 0 10px;
  background: rgba(255, 255, 255, 0.16);
}

.mini-btn.danger {
  background: rgba(239, 68, 68, 0.65);
}

.table-wrap {
  margin-top: 14px;
  overflow-x: auto;
}

.bill-table {
  width: 100%;
  min-width: 1120px;
  border-collapse: collapse;
}

.bill-table th,
.bill-table td {
  padding: 10px 8px;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  font-size: 13px;
}

.bill-table th {
  color: rgba(255, 255, 255, 0.88);
  font-weight: 600;
}

.type-chip.expense {
  background: rgba(239, 68, 68, 0.18);
  color: #fecaca;
}

.type-chip.income {
  background: rgba(34, 197, 94, 0.18);
  color: #bbf7d0;
}

.amount-expense {
  color: #fca5a5;
}

.amount-income {
  color: #86efac;
}

.mobile-list {
  display: none;
  margin-top: 14px;
  gap: 12px;
}

.mobile-card-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.mobile-card-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 12px;
}

.mobile-card-grid p {
  margin: 0;
  padding: 11px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mobile-card-grid strong {
  font-size: 14px;
  word-break: break-word;
}

.mobile-card-grid .wide {
  grid-column: 1 / -1;
}

.pager {
  margin-top: 16px;
  flex-wrap: wrap;
}

.pager-left,
.pager-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pager-select {
  border: none;
  outline: none;
  border-radius: 8px;
  height: 32px;
  padding: 0 8px;
  color: #fff;
  background: rgba(255, 255, 255, 0.16);
}

.pager-select option {
  color: #222;
}

.input {
  width: 100%;
  min-height: 40px;
  padding: 9px 12px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  outline: none;
}

.input::placeholder {
  color: rgba(255, 255, 255, 0.48);
}

.textarea {
  resize: vertical;
  min-height: 92px;
}

.dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 40;
  padding: 18px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(1, 8, 16, 0.58);
}

.dialog {
  width: min(760px, 100%);
  max-height: calc(100vh - 36px);
  overflow: auto;
  padding: 20px;
  border-radius: 20px;
}

.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-inline-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.dialog-actions {
  justify-content: flex-end;
  flex-wrap: wrap;
}

.empty-state {
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.68);
}

@media (max-width: 1100px) {
  .budget-card-list,
  .bills-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 860px) {
  .budget-overview-grid,
  .filter-grid,
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .bills-page {
    padding: 12px;
  }

  .hero-panel,
  .budget-panel,
  .filter-panel,
  .toolbar,
  .pager,
  .dialog-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-actions,
  .toolbar-left,
  .toolbar-right,
  .pager-left,
  .pager-right {
    width: 100%;
  }

  .filter-actions .action-btn,
  .filter-actions .ghost-btn,
  .toolbar-left .action-btn,
  .toolbar-left .ghost-btn,
  .pager-right .ghost-btn,
  .dialog-actions .action-btn,
  .dialog-actions .ghost-btn {
    flex: 1 1 calc(50% - 6px);
  }

  .desktop-table {
    display: none;
  }

  .mobile-list {
    display: grid;
  }

  .budget-overview-grid,
  .budget-card-list,
  .filter-grid,
  .summary-grid,
  .form-inline-grid,
  .mobile-card-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .hero-panel,
  .budget-panel,
  .filter-panel,
  .list-panel,
  .insight-panel,
  .dialog {
    padding: 14px;
    border-radius: 16px;
  }

  .page-title {
    font-size: 24px;
  }

  .dialog-mask {
    padding: 10px;
  }
}
</style>
