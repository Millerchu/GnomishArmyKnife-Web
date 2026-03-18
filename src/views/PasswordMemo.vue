<template>
  <div class="password-memo-page">
    <div class="page-nav">
      <button type="button" class="back-home-btn" @click="goBack">
        <span class="back-home-icon">←</span>
        <span>返回桌面</span>
      </button>
    </div>

    <div class="hero-panel">
      <div>
        <h1 class="page-title">密码备忘录</h1>
        <p class="page-subtitle">集中记录网站、社区和 App 账号信息，查看密码前需要再次输入当前用户密码校验。</p>
      </div>
      <div class="hero-tags">
        <span class="hero-tag">已接真实接口</span>
        <span class="hero-tag">总计 {{ total }} 条</span>
      </div>
    </div>

    <section class="filter-panel">
      <label class="field">
        <span>关键词</span>
        <input
          v-model.trim="query.keyword"
          class="input"
          maxlength="64"
          placeholder="搜索网站名、地址、用户名、手机、邮箱"
          @keyup.enter="handleSearch"
        />
      </label>

      <div class="filter-actions">
        <button class="action-btn" :disabled="loading" @click="handleSearch">查询</button>
        <button class="ghost-btn" :disabled="loading" @click="resetQuery">重置</button>
      </div>
    </section>

    <section class="list-panel">
      <div class="panel-head">
        <div>
          <h2 class="panel-title">账号列表</h2>
          <span class="panel-tip">主要展示网站名、地址、用户名 / 手机 / 邮箱，密码在详情中按需解锁</span>
        </div>
      </div>

      <div class="toolbar">
        <div class="toolbar-left">
          <button class="action-btn" :disabled="loading" @click="openCreateDialog">新增账号</button>
          <button class="ghost-btn" :disabled="loading" @click="loadMemos">刷新列表</button>
        </div>
        <div class="toolbar-right">
          <span>共 {{ total }} 条</span>
        </div>
      </div>

      <div v-if="loading" class="empty-state">加载中...</div>

      <template v-else>
        <div v-if="pagedRecords.length" class="table-wrap desktop-table">
          <table class="memo-table">
            <thead>
            <tr>
              <th>网站名</th>
              <th>地址</th>
              <th>用户名 / 手机 / 邮箱</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="item in pagedRecords" :key="item.id">
              <td>{{ item.siteName }}</td>
              <td>
                <a class="site-link" :href="normalizeUrl(item.siteUrl)" target="_blank" rel="noreferrer">{{ item.siteUrl || '-' }}</a>
              </td>
              <td>{{ buildAccountText(item) }}</td>
              <td>{{ item.updatedAt || item.createdAt || '-' }}</td>
              <td>
                <div class="row-actions">
                  <button class="mini-btn" @click="openDetailDialog(item)">详情</button>
                  <button class="mini-btn" @click="openEditDialog(item)">编辑</button>
                  <button class="mini-btn danger" @click="removeMemo(item)">删除</button>
                </div>
              </td>
            </tr>
            </tbody>
          </table>
        </div>

        <div v-if="pagedRecords.length" class="mobile-list">
          <article v-for="item in pagedRecords" :key="item.id" class="mobile-card">
            <div class="mobile-card-head">
              <div>
                <h3 class="mobile-card-title">{{ item.siteName }}</h3>
                <p class="mobile-card-link">{{ item.siteUrl || '-' }}</p>
              </div>
              <span class="mobile-card-time">{{ item.updatedAt || item.createdAt || '-' }}</span>
            </div>

            <div class="mobile-card-grid">
              <p><span>用户名</span><strong>{{ item.username || '-' }}</strong></p>
              <p><span>注册手机</span><strong>{{ item.registeredPhone || '-' }}</strong></p>
              <p class="wide"><span>注册邮箱</span><strong>{{ item.registeredEmail || '-' }}</strong></p>
            </div>

            <div class="mobile-card-actions">
              <button class="mini-btn" @click="openDetailDialog(item)">详情</button>
              <button class="mini-btn" @click="openEditDialog(item)">编辑</button>
              <button class="mini-btn danger" @click="removeMemo(item)">删除</button>
            </div>
          </article>
        </div>

        <div v-else class="empty-state">暂无账号记录</div>
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

    <div v-if="showEditDialog" class="dialog-mask" @click.self="closeEditDialog">
      <div class="dialog">
        <h3 class="dialog-title">{{ editMode === 'create' ? '新增账号备忘录' : '编辑账号备忘录' }}</h3>
        <form class="dialog-form" @submit.prevent="submitEditDialog">
          <label class="form-field">
            <span>网站名</span>
            <input v-model.trim="form.siteName" class="input" maxlength="64" placeholder="例如：GitHub" required />
          </label>

          <label class="form-field">
            <span>地址</span>
            <input v-model.trim="form.siteUrl" class="input" maxlength="255" placeholder="例如：https://github.com" required />
          </label>

          <div class="form-inline-grid">
            <label class="form-field">
              <span>用户名</span>
              <input v-model.trim="form.username" class="input" maxlength="64" placeholder="用户名（可选）" />
            </label>

            <label class="form-field">
              <span>密码</span>
              <input v-model="form.password" class="input" type="password" maxlength="128" placeholder="密码" required />
            </label>
          </div>

          <div class="form-inline-grid">
            <label class="form-field">
              <span>注册手机</span>
              <input v-model.trim="form.registeredPhone" class="input" maxlength="32" placeholder="注册手机（可选）" />
            </label>

            <label class="form-field">
              <span>注册邮箱</span>
              <input v-model.trim="form.registeredEmail" class="input" type="email" maxlength="128" placeholder="注册邮箱（可选）" />
            </label>
          </div>

          <label class="form-field">
            <span>备注</span>
            <textarea v-model.trim="form.remark" class="input textarea" rows="3" maxlength="200" placeholder="备注（可选）" />
          </label>

          <div class="dialog-actions">
            <button type="button" class="ghost-btn" :disabled="submitting" @click="closeEditDialog">取消</button>
            <button type="submit" class="action-btn" :disabled="submitting">
              {{ submitting ? '提交中...' : (editMode === 'create' ? '保存' : '更新') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="showDetailDialog" class="dialog-mask" @click.self="closeDetailDialog">
      <div class="dialog detail-dialog">
        <div class="detail-head">
          <div>
            <h3 class="dialog-title">账号详情</h3>
            <p class="detail-subtitle">关闭详情后再次打开，需要重新输入当前用户密码才能查看完整密码。</p>
          </div>
          <button class="dialog-close" @click="closeDetailDialog">x</button>
        </div>

        <div v-if="detailLoading" class="empty-state detail-empty">详情加载中...</div>

        <div v-else-if="activeDetail" class="detail-content">
          <div class="detail-grid">
            <p><span>网站名</span><strong>{{ activeDetail.siteName || '-' }}</strong></p>
            <p><span>地址</span><strong>{{ activeDetail.siteUrl || '-' }}</strong></p>
            <p><span>用户名</span><strong>{{ activeDetail.username || '-' }}</strong></p>
            <p><span>注册手机</span><strong>{{ activeDetail.registeredPhone || '-' }}</strong></p>
            <p class="wide"><span>注册邮箱</span><strong>{{ activeDetail.registeredEmail || '-' }}</strong></p>
            <p class="wide"><span>备注</span><strong>{{ activeDetail.remark || '-' }}</strong></p>
          </div>

          <div class="password-box">
            <div>
              <p class="password-label">密码</p>
              <p class="password-value">{{ revealedPassword || activeDetail.maskedPassword || maskPassword(activeDetail.password) }}</p>
            </div>
            <button class="ghost-btn" :disabled="!revealedPassword" @click="copyPassword">复制密码</button>
          </div>

          <form class="verify-form" @submit.prevent="verifyAndRevealPassword">
            <label class="form-field">
              <span>输入当前用户密码后显示完整密码</span>
              <input
                v-model="verifyForm.loginPassword"
                class="input"
                type="password"
                maxlength="128"
                autocomplete="current-password"
                placeholder="请输入当前登录用户密码"
              />
            </label>

            <div class="dialog-actions verify-actions">
              <button type="submit" class="action-btn" :disabled="verifyingPassword">
                {{ verifyingPassword ? '校验中...' : '验证并显示密码' }}
              </button>
            </div>
          </form>

          <p v-if="detailErrorMessage" class="error-tip">{{ detailErrorMessage }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import {computed, onMounted, reactive, ref} from 'vue'
import {useRouter} from 'vue-router'
import {
  createPasswordMemo,
  deletePasswordMemo,
  getPasswordMemoDetail,
  listPasswordMemos,
  updatePasswordMemo,
  verifyPasswordMemoAccess
} from '@/api/passwordMemo'

const PAGE_SIZE_OPTIONS = [8, 12, 20]

// 兼容统一响应包装与直接返回数据的两种接口形态。
function unwrapData(res) {
  const payload = res?.data
  if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data
  }
  return payload
}

// 把站点账号字段归一后再进页面状态，避免模板层兼容多套字段名。
function normalizeMemo(item = {}) {
  return {
    id: item.id ?? item.memoId ?? null,
    siteName: item.siteName || item.websiteName || '',
    siteUrl: item.siteUrl || item.websiteUrl || item.url || '',
    username: item.username || item.accountName || '',
    password: item.password || item.secret || '',
    maskedPassword: item.maskedPassword || '******',
    registeredPhone: item.registeredPhone || item.phone || '',
    registeredEmail: item.registeredEmail || item.email || '',
    remark: item.remark || '',
    createdAt: item.createdAt || item.createTime || '',
    updatedAt: item.updatedAt || item.updateTime || item.createdAt || item.createTime || ''
  }
}

function buildAccountText(item) {
  return [item.username, item.registeredPhone, item.registeredEmail].filter(Boolean).join(' / ') || '-'
}

// 详情弹窗默认只展示首尾字符，完整密码必须重新校验后才允许显示。
function maskPassword(value) {
  const source = `${value || ''}`
  if (!source) {
    return '未设置'
  }
  if (source.length <= 4) {
    return `${source[0] || '*'}${'*'.repeat(Math.max(source.length - 2, 1))}${source.slice(-1)}`
  }
  return `${source.slice(0, 2)}${'*'.repeat(source.length - 4)}${source.slice(-2)}`
}

function normalizeUrl(url) {
  if (!url) {
    return '#'
  }
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

function extractErrorMessage(error, fallback) {
  const data = error?.response?.data || {}
  return data.message || data.msg || fallback
}

export default {
  name: 'PasswordMemo',
  setup() {
    const router = useRouter()

    // 页面状态拆成列表、编辑弹窗和详情解锁三组，便于关闭详情后彻底重置敏感数据。
    const loading = ref(false)
    const submitting = ref(false)
    const verifyingPassword = ref(false)
    const total = ref(0)
    const pagedRecords = ref([])

    const showEditDialog = ref(false)
    const showDetailDialog = ref(false)
    const detailLoading = ref(false)
    const activeDetail = ref(null)
    const revealedPassword = ref('')
    const detailErrorMessage = ref('')
    const editMode = ref('create')
    const editingId = ref('')

    const query = reactive({
      keyword: '',
      pageNo: 1,
      pageSize: PAGE_SIZE_OPTIONS[0]
    })

    const form = reactive({
      siteName: '',
      siteUrl: '',
      username: '',
      password: '',
      registeredPhone: '',
      registeredEmail: '',
      remark: ''
    })

    const verifyForm = reactive({
      loginPassword: ''
    })

    const pageSizeOptions = PAGE_SIZE_OPTIONS

    const totalPages = computed(() => Math.max(1, Math.ceil(total.value / query.pageSize)))

    const fillForm = (memo) => {
      form.siteName = memo.siteName || ''
      form.siteUrl = memo.siteUrl || ''
      form.username = memo.username || ''
      form.password = memo.password || ''
      form.registeredPhone = memo.registeredPhone || ''
      form.registeredEmail = memo.registeredEmail || ''
      form.remark = memo.remark || ''
    }

    const resetForm = () => {
      fillForm({})
    }

    const loadMemos = async () => {
      loading.value = true
      try {
        const res = await listPasswordMemos({
          pageNo: query.pageNo,
          pageSize: query.pageSize,
          keyword: query.keyword || undefined
        })
        const payload = unwrapData(res)
        const rawList = Array.isArray(payload)
          ? payload
          : (payload?.list || payload?.records || payload?.rows || [])
        pagedRecords.value = rawList.map((item) => normalizeMemo(item))
        total.value = Number(payload?.total ?? payload?.count ?? rawList.length ?? 0)
      } catch (error) {
        pagedRecords.value = []
        total.value = 0
        alert(extractErrorMessage(error, '加载密码备忘录列表失败'))
      } finally {
        loading.value = false
      }
    }

    const handleSearch = () => {
      query.pageNo = 1
      loadMemos()
    }

    const resetQuery = () => {
      query.keyword = ''
      query.pageNo = 1
      query.pageSize = PAGE_SIZE_OPTIONS[0]
      loadMemos()
    }

    const handlePageSizeChange = () => {
      query.pageNo = 1
      loadMemos()
    }

    const changePage = (offset) => {
      const nextPage = query.pageNo + offset
      if (nextPage < 1 || nextPage > totalPages.value) {
        return
      }
      query.pageNo = nextPage
      loadMemos()
    }

    const openCreateDialog = () => {
      editMode.value = 'create'
      editingId.value = ''
      resetForm()
      showEditDialog.value = true
    }

    const openEditDialog = (item) => {
      editMode.value = 'edit'
      editingId.value = item.id
      resetForm()
      showEditDialog.value = true
      submitting.value = true
      getPasswordMemoDetail(item.id)
        .then((res) => {
          fillForm(normalizeMemo(unwrapData(res) || item))
        })
        .catch((error) => {
          console.error(error)
          fillForm(item)
          alert(extractErrorMessage(error, '加载账号详情失败，请重新打开编辑弹窗'))
        })
        .finally(() => {
          submitting.value = false
        })
    }

    const closeEditDialog = () => {
      if (submitting.value) {
        return
      }
      showEditDialog.value = false
      resetForm()
    }

    const submitEditDialog = async () => {
      if (!form.siteName) {
        alert('请输入网站名')
        return
      }
      if (!form.siteUrl) {
        alert('请输入地址')
        return
      }
      if (!form.password) {
        alert('请输入密码')
        return
      }
      if (!form.username && !form.registeredPhone && !form.registeredEmail) {
        alert('用户名、注册手机、注册邮箱至少填写一项')
        return
      }
      if (submitting.value) {
        return
      }

      const payload = {
        siteName: form.siteName,
        siteUrl: form.siteUrl,
        username: form.username,
        password: form.password,
        registeredPhone: form.registeredPhone,
        registeredEmail: form.registeredEmail,
        remark: form.remark
      }

      submitting.value = true
      try {
        if (editMode.value === 'create') {
          await createPasswordMemo(payload)
        } else {
          await updatePasswordMemo(editingId.value, payload)
        }
        showEditDialog.value = false
        resetForm()
        await loadMemos()
        alert(editMode.value === 'create' ? '账号备忘录新增成功' : '账号备忘录更新成功')
      } catch (error) {
        alert(extractErrorMessage(error, editMode.value === 'create' ? '新增失败，请稍后重试' : '更新失败，请稍后重试'))
      } finally {
        submitting.value = false
      }
    }

    const removeMemo = async (item) => {
      if (!window.confirm(`确认删除【${item.siteName}】吗？`)) {
        return
      }
      try {
        await deletePasswordMemo(item.id)
        await loadMemos()
        alert('删除成功')
      } catch (error) {
        alert(extractErrorMessage(error, '删除失败，请稍后重试'))
      }
    }

    const resetDetailState = () => {
      activeDetail.value = null
      revealedPassword.value = ''
      detailErrorMessage.value = ''
      verifyForm.loginPassword = ''
    }

    const closeDetailDialog = () => {
      if (verifyingPassword.value) {
        return
      }
      showDetailDialog.value = false
      resetDetailState()
    }

    const openDetailDialog = async (item) => {
      showDetailDialog.value = true
      resetDetailState()
      detailLoading.value = true
      try {
        const res = await getPasswordMemoDetail(item.id)
        activeDetail.value = normalizeMemo(unwrapData(res) || item)
      } catch (error) {
        showDetailDialog.value = false
        alert(extractErrorMessage(error, '加载账号详情失败'))
      } finally {
        detailLoading.value = false
      }
    }

    const verifyAndRevealPassword = async () => {
      if (!activeDetail.value) {
        return
      }
      if (!verifyForm.loginPassword) {
        detailErrorMessage.value = '请输入当前用户密码'
        return
      }

      verifyingPassword.value = true
      detailErrorMessage.value = ''
      try {
        const res = await verifyPasswordMemoAccess(activeDetail.value.id, {
          loginPassword: verifyForm.loginPassword
        })
        const payload = unwrapData(res) || {}
        const fullPassword = payload.password || payload.fullPassword || ''
        if (!fullPassword) {
          throw new Error('接口未返回完整密码')
        }
        revealedPassword.value = fullPassword
      } catch (error) {
        detailErrorMessage.value = extractErrorMessage(error, '密码校验失败，请稍后重试')
      } finally {
        verifyingPassword.value = false
      }
    }

    const copyPassword = async () => {
      if (!revealedPassword.value) {
        return
      }
      try {
        await navigator.clipboard.writeText(revealedPassword.value)
        detailErrorMessage.value = '密码已复制'
      } catch (error) {
        detailErrorMessage.value = '复制失败，请手动复制'
      }
    }

    const goBack = () => {
      router.push('/home')
    }

    onMounted(() => {
      loadMemos()
    })

    return {
      loading,
      submitting,
      verifyingPassword,
      total,
      pagedRecords,
      query,
      pageSizeOptions,
      totalPages,
      showEditDialog,
      showDetailDialog,
      detailLoading,
      activeDetail,
      revealedPassword,
      detailErrorMessage,
      editMode,
      form,
      verifyForm,
      buildAccountText,
      maskPassword,
      normalizeUrl,
      loadMemos,
      handleSearch,
      resetQuery,
      handlePageSizeChange,
      changePage,
      openCreateDialog,
      openEditDialog,
      closeEditDialog,
      submitEditDialog,
      removeMemo,
      openDetailDialog,
      closeDetailDialog,
      verifyAndRevealPassword,
      copyPassword,
      goBack
    }
  }
}
</script>

<style scoped>
.password-memo-page {
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

.top-bar,
.actions,
.hero-panel,
.filter-panel,
.panel-head,
.toolbar,
.pager,
.row-actions,
.mobile-card-actions,
.dialog-actions,
.detail-head,
.password-box {
  display: flex;
  align-items: center;
  gap: 12px;
}

.top-bar,
.hero-panel,
.filter-panel,
.toolbar,
.list-panel,
.dialog,
.password-box {
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: linear-gradient(135deg, rgba(7, 22, 39, 0.82), rgba(17, 49, 73, 0.72));
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(16px);
}

.top-bar,
.hero-panel,
.filter-panel,
.list-panel {
  border-radius: 18px;
  padding: 16px 18px;
}

.top-bar,
.hero-panel,
.panel-head,
.toolbar,
.pager,
.detail-head,
.password-box {
  justify-content: space-between;
}

.top-bar {
  justify-content: flex-end;
}

.top-bar,
.hero-panel,
.filter-panel {
  margin-bottom: 14px;
}

.page-title,
.panel-title,
.dialog-title,
.mobile-card-title {
  margin: 0;
}

.page-title {
  font-size: 28px;
}

.page-subtitle,
.panel-tip,
.detail-subtitle,
.mobile-card-link {
  margin: 6px 0 0;
  color: rgba(255, 255, 255, 0.74);
}

.hero-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.hero-tag {
  padding: 7px 12px;
  border-radius: 999px;
  font-size: 12px;
  background: rgba(91, 180, 255, 0.18);
  color: #d7f0ff;
}

.filter-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
}

.field,
.form-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field span,
.form-field span,
.detail-grid span,
.mobile-card-grid span,
.password-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.72);
}

.filter-actions {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

.toolbar {
  margin-top: 12px;
  margin-bottom: 10px;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
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
  color: rgba(255, 255, 255, 0.46);
}

.textarea {
  resize: vertical;
  min-height: 96px;
}

.ghost-btn,
.action-btn,
.mini-btn,
.dialog-close {
  border: none;
  border-radius: 10px;
  color: #fff;
  cursor: pointer;
}

.ghost-btn,
.action-btn {
  min-height: 38px;
  padding: 0 14px;
}

.mini-btn {
  height: 28px;
  min-width: 54px;
  padding: 0 8px;
  background: rgba(255, 255, 255, 0.18);
}

.ghost-btn {
  background: rgba(255, 255, 255, 0.12);
}

.action-btn {
  background: linear-gradient(135deg, #1996ff, #27d5a4);
}

.mini-btn.danger {
  background: rgba(239, 68, 68, 0.65);
}

.list-panel {
  overflow: hidden;
}

.table-wrap {
  overflow-x: auto;
  margin-top: 14px;
}

.memo-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 860px;
}

.memo-table th,
.memo-table td {
  padding: 10px 8px;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  vertical-align: top;
  font-size: 13px;
}

.memo-table th {
  color: rgba(255, 255, 255, 0.88);
  font-weight: 600;
}

.site-link {
  color: #9dd7ff;
  word-break: break-all;
}

.mobile-list {
  display: none;
  margin-top: 14px;
  gap: 12px;
}

.mobile-card {
  padding: 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.mobile-card-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.mobile-card-time {
  min-width: 88px;
  font-size: 12px;
  text-align: right;
  color: rgba(255, 255, 255, 0.64);
}

.mobile-card-grid,
.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 12px;
  margin-top: 12px;
}

.mobile-card-grid p,
.detail-grid p {
  margin: 0;
  padding: 11px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mobile-card-grid strong,
.detail-grid strong {
  font-size: 14px;
  word-break: break-word;
}

.wide {
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

.empty-state {
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.68);
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
  width: min(680px, 100%);
  max-height: calc(100vh - 36px);
  overflow: auto;
  padding: 20px;
  border-radius: 20px;
}

.detail-dialog {
  width: min(760px, 100%);
}

.dialog-form,
.detail-content,
.verify-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-inline-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.detail-subtitle {
  font-size: 13px;
}

.dialog-close {
  width: 34px;
  height: 34px;
  background: rgba(255, 255, 255, 0.12);
}

.password-box {
  margin-top: 16px;
  padding: 16px 18px;
  border-radius: 16px;
}

.password-value {
  margin: 6px 0 0;
  font-size: 28px;
  line-height: 1.3;
  letter-spacing: 1px;
  word-break: break-all;
}

.verify-actions {
  justify-content: flex-start;
}

.error-tip {
  margin: 0;
  font-size: 13px;
  color: #ffcccc;
}

.detail-empty {
  min-height: 260px;
}

@media (max-width: 960px) {
  .filter-panel {
    grid-template-columns: 1fr;
  }

  .filter-actions {
    align-items: stretch;
  }
}

@media (max-width: 720px) {
  .password-memo-page {
    padding: 12px;
  }

  .top-bar,
  .hero-panel,
  .panel-head,
  .toolbar,
  .pager,
  .detail-head,
  .password-box {
    flex-direction: column;
    align-items: stretch;
  }

  .actions,
  .row-actions,
  .toolbar-left,
  .toolbar-right,
  .mobile-card-actions,
  .dialog-actions {
    flex-wrap: wrap;
  }

  .actions .action-btn,
  .filter-actions .action-btn,
  .filter-actions .ghost-btn,
  .toolbar-left .action-btn,
  .toolbar-left .ghost-btn,
  .pager-right .ghost-btn,
  .dialog-actions .ghost-btn,
  .dialog-actions .action-btn {
    flex: 1 1 calc(50% - 6px);
  }

  .desktop-table {
    display: none;
  }

  .mobile-list {
    display: grid;
  }

  .form-inline-grid,
  .mobile-card-grid,
  .detail-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 520px) {
  .top-bar,
  .hero-panel,
  .filter-panel,
  .list-panel,
  .dialog {
    padding: 14px;
    border-radius: 16px;
  }

  .page-title {
    font-size: 24px;
  }

  .password-value {
    font-size: 22px;
  }

  .dialog-mask {
    padding: 10px;
  }

  .actions .action-btn,
  .filter-actions .action-btn,
  .filter-actions .ghost-btn,
  .toolbar-left .action-btn,
  .toolbar-left .ghost-btn,
  .pager-right .ghost-btn,
  .dialog-actions .ghost-btn,
  .dialog-actions .action-btn {
    flex-basis: 100%;
  }

  .mobile-card-actions .mini-btn {
    flex: 1 1 calc(50% - 6px);
  }
}
</style>
