<template>
  <div class="password-memo-page">
    <div class="password-memo-shell">
      <header class="memo-page-header">
        <button type="button" class="memo-back-button" aria-label="返回桌面" @click="goBack">
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="m12.5 4.5-5 5.5 5 5.5" />
          </svg>
          <span>返回桌面</span>
        </button>

        <div class="memo-heading">
          <span class="memo-heading-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 3 5.5 5.6v5.7c0 4.2 2.7 7.9 6.5 9.7 3.8-1.8 6.5-5.5 6.5-9.7V5.6L12 3Z" />
              <path d="M9.5 11.5h5M10.5 11.5V10a1.5 1.5 0 0 1 3 0v1.5" />
            </svg>
          </span>
          <div>
            <h1 class="memo-page-title">密码备忘录</h1>
            <p class="memo-page-subtitle">集中管理常用账号，敏感密码仅在身份验证后显示。</p>
          </div>
        </div>
      </header>

      <main class="memo-list-panel">
        <div class="memo-panel-heading">
          <div>
            <h2>账号列表</h2>
            <p>网站、用户名和联系方式统一归档，密码默认保持锁定。</p>
          </div>
          <span class="memo-count"><strong>{{ total }}</strong> 个账号</span>
        </div>

        <div class="memo-toolbar">
          <div class="memo-search">
            <label class="visually-hidden" for="password-memo-search">搜索账号</label>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="8.5" cy="8.5" r="5" />
              <path d="m12.2 12.2 4 4" />
            </svg>
            <input
              id="password-memo-search"
              v-model.trim="query.keyword"
              maxlength="64"
              placeholder="搜索网站、地址、用户名、手机或邮箱"
              @keyup.enter="handleSearch"
            />
            <button
              v-if="query.keyword"
              type="button"
              class="memo-search-clear"
              aria-label="清空搜索关键词"
              @click="resetQuery"
            >
              ×
            </button>
            <button type="button" class="memo-search-submit" :disabled="loading" @click="handleSearch">搜索</button>
          </div>

          <label class="memo-category-filter">
            <span class="visually-hidden">按类别筛选</span>
            <select v-model="query.category" :disabled="loading || categoryLoading" @change="handleSearch">
              <option value="">全部类别</option>
              <option v-for="item in categoryOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
          </label>

          <div class="memo-toolbar-actions">
            <button type="button" class="memo-button memo-button-secondary" :disabled="loading" @click="loadMemos">
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M15.8 7.1A6.2 6.2 0 1 0 16 12" />
                <path d="M12.8 7.1h3.3V3.8" />
              </svg>
              <span>刷新</span>
            </button>
            <button type="button" class="memo-button memo-button-primary" :disabled="loading" @click="openCreateDialog">
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M10 4v12M4 10h12" />
              </svg>
              <span>新增账号</span>
            </button>
          </div>
        </div>

        <div v-if="loading && !pagedRecords.length" class="memo-empty-state">
          <span class="memo-loading-indicator" aria-hidden="true"></span>
          <span>正在加载账号...</span>
        </div>

      <template v-else>
        <div v-if="pagedRecords.length" class="memo-table-wrap desktop-table">
          <table class="memo-table">
            <thead>
            <tr>
              <th class="memo-site-column">网站</th>
              <th class="memo-category-column">类别</th>
              <th>账号信息</th>
              <th class="memo-time-column">更新时间</th>
              <th class="memo-action-column">操作</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="item in pagedRecords" :key="item.id">
              <td>
                <div class="memo-site-identity">
                  <span class="memo-site-avatar" aria-hidden="true">{{ item.siteName?.slice(0, 1) || '?' }}</span>
                  <div>
                    <strong>{{ item.siteName }}</strong>
                    <a class="memo-site-link" :href="normalizeUrl(item.siteUrl)" target="_blank" rel="noreferrer">
                      {{ displaySiteAddress(item.siteUrl) }}
                      <span aria-hidden="true">↗</span>
                    </a>
                  </div>
                </div>
              </td>
              <td><span class="memo-category-badge">{{ categoryLabel(item.category) }}</span></td>
              <td>
                <div class="memo-account-summary">
                  <strong>{{ item.username || '未填写用户名' }}</strong>
                  <span v-if="item.registeredPhone">手机 {{ item.registeredPhone }}</span>
                  <span v-if="item.registeredEmail">邮箱 {{ item.registeredEmail }}</span>
                  <span v-if="!item.registeredPhone && !item.registeredEmail" class="memo-cell-muted">未填写联系方式</span>
                </div>
              </td>
              <td class="memo-time-cell">
                <time>{{ item.updatedAt || item.createdAt || '-' }}</time>
              </td>
              <td class="memo-action-cell">
                <div class="memo-row-actions">
                  <button type="button" class="memo-row-button memo-row-button-emphasis" @click="openDetailDialog(item)">详情</button>
                  <button type="button" class="memo-row-button" @click="openEditDialog(item)">编辑</button>
                  <button type="button" class="memo-row-button memo-row-button-danger" @click="removeMemo(item)">删除</button>
                </div>
              </td>
            </tr>
            </tbody>
          </table>
        </div>

        <div v-if="pagedRecords.length" class="memo-mobile-list">
          <article v-for="item in pagedRecords" :key="item.id" class="memo-mobile-card">
            <div class="memo-mobile-card-head">
              <div class="memo-site-identity">
                <span class="memo-site-avatar" aria-hidden="true">{{ item.siteName?.slice(0, 1) || '?' }}</span>
                <div>
                  <h3>{{ item.siteName }}</h3>
                  <a class="memo-site-link" :href="normalizeUrl(item.siteUrl)" target="_blank" rel="noreferrer">
                    {{ displaySiteAddress(item.siteUrl) }}
                    <span aria-hidden="true">↗</span>
                  </a>
                </div>
              </div>
              <time>{{ item.updatedAt || item.createdAt || '-' }}</time>
            </div>

            <div class="memo-mobile-card-grid">
              <p><span>类别</span><strong>{{ categoryLabel(item.category) }}</strong></p>
              <p><span>用户名</span><strong>{{ item.username || '-' }}</strong></p>
              <p><span>注册手机</span><strong>{{ item.registeredPhone || '-' }}</strong></p>
              <p class="wide"><span>注册邮箱</span><strong>{{ item.registeredEmail || '-' }}</strong></p>
            </div>

            <div class="memo-mobile-card-actions">
              <button type="button" class="memo-row-button memo-row-button-emphasis" @click="openDetailDialog(item)">详情</button>
              <button type="button" class="memo-row-button" @click="openEditDialog(item)">编辑</button>
              <button type="button" class="memo-row-button memo-row-button-danger" @click="removeMemo(item)">删除</button>
            </div>
          </article>
        </div>

        <div v-else class="memo-empty-state">
          <span class="memo-empty-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M4.5 7.5h15v12h-15zM8 7.5V5.8c0-.7.6-1.3 1.3-1.3h5.4c.7 0 1.3.6 1.3 1.3v1.7" />
              <path d="M9 13h6" />
            </svg>
          </span>
          <strong>暂无账号记录</strong>
          <span>新增第一个账号，建立你的安全备忘录。</span>
        </div>
      </template>

        <div class="memo-pagination">
          <div class="memo-page-status">
            <span>第 <strong>{{ query.pageNo }}</strong> / {{ totalPages }} 页</span>
            <select v-model.number="query.pageSize" :disabled="loading" aria-label="每页显示数量" @change="handlePageSizeChange">
              <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }} 条/页</option>
            </select>
          </div>
          <div class="memo-page-actions">
            <button type="button" :disabled="query.pageNo <= 1 || loading" @click="changePage(-1)">
              <span aria-hidden="true">←</span>
              上一页
            </button>
            <button type="button" :disabled="query.pageNo >= totalPages || loading" @click="changePage(1)">
              下一页
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </main>
    </div>

    <MacDialog
      v-model="showEditDialog"
      :title="editMode === 'create' ? '新增账号备忘录' : '编辑账号备忘录'"
      width="960px"
      panel-class="password-memo-edit-dialog"
      :close-disabled="submitting"
      @cancel="closeEditDialog"
    >
        <form id="password-memo-edit-dialog-form" class="dialog-form dialog-density-grid dialog-grid-cols-4" @submit.prevent="submitEditDialog">
          <label class="form-field">
            <span>网站名</span>
            <input v-model.trim="form.siteName" class="input" maxlength="64" placeholder="例如：GitHub" required />
          </label>

          <label class="form-field">
            <span>类别</span>
            <select v-model="form.category" class="input" :disabled="categoryLoading || !categoryOptions.length" required>
              <option value="">{{ categoryLoading ? '正在加载类别...' : '请选择类别' }}</option>
              <option v-for="item in categoryOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
          </label>

          <label class="form-field dialog-span-2">
            <span>地址</span>
            <input v-model.trim="form.siteUrl" class="input" maxlength="255" placeholder="例如：https://github.com" required />
          </label>

          <div class="form-inline-grid dialog-grid-group">
            <label class="form-field">
              <span>用户名</span>
              <input v-model.trim="form.username" class="input" maxlength="64" placeholder="用户名（可选）" />
            </label>

            <div v-if="editMode === 'create'" class="form-field">
              <label for="password-memo-create-password">密码</label>
              <div class="password-input-wrap">
                <input
                  id="password-memo-create-password"
                  v-model="form.password"
                  class="input"
                  :type="passwordVisibility.create ? 'text' : 'password'"
                  maxlength="128"
                  placeholder="密码"
                  required
                />
                <button
                  type="button"
                  class="password-hold-button"
                  :class="{active: passwordVisibility.create}"
                  aria-label="按住显示密码"
                  title="按住显示密码"
                  @pointerdown.prevent="showPasswordField('create')"
                  @pointerup="hidePasswordField('create')"
                  @pointerleave="hidePasswordField('create')"
                  @pointercancel="hidePasswordField('create')"
                  @keydown.space.prevent="showPasswordField('create')"
                  @keyup.space.prevent="hidePasswordField('create')"
                  @blur="hidePasswordField('create')"
                  @contextmenu.prevent
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 12s3.6-6 9-6 9 6 9 6-3.6 6-9 6-9-6-9-6Zm9 3.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div class="form-inline-grid dialog-grid-group">
            <label class="form-field">
              <span>注册手机</span>
              <input v-model.trim="form.registeredPhone" class="input" maxlength="32" placeholder="注册手机（可选）" />
            </label>

            <label class="form-field">
              <span>注册邮箱</span>
              <input v-model.trim="form.registeredEmail" class="input" type="email" maxlength="128" placeholder="注册邮箱（可选）" />
            </label>
          </div>

          <label class="form-field dialog-span-all">
            <span>备注</span>
            <textarea v-model.trim="form.remark" class="input textarea" rows="3" maxlength="200" placeholder="备注（可选）" />
          </label>

        </form>
        <template #footer>
          <button form="password-memo-edit-dialog-form" type="submit" class="action-btn" :disabled="submitting">
            {{ submitting ? '提交中...' : (editMode === 'create' ? '保存' : '更新') }}
          </button>
        </template>
    </MacDialog>

    <MacDialog
      v-model="showHistoryDialog"
      :title="historyMode === 'create' ? '手动添加历史密码' : '编辑历史密码'"
      :subtitle="historyMode === 'create' ? '补录一段过去使用过的密码及其使用周期。' : '密码留空时仅调整使用周期。'"
      width="620px"
      panel-class="password-memo-history-dialog"
      :close-disabled="maintainingHistory"
      @cancel="closeHistoryDialog"
    >
      <form id="password-memo-history-form" class="dialog-form history-maintain-form" @submit.prevent="submitHistoryForm">
        <label class="form-field">
          <span>{{ historyMode === 'create' ? '历史密码' : '历史密码（可选）' }}</span>
          <input
            v-model="historyForm.password"
            class="input"
            type="password"
            maxlength="128"
            autocomplete="new-password"
            :placeholder="historyMode === 'create' ? '请输入历史密码' : '留空则保持原密码'"
            :required="historyMode === 'create'"
          />
        </label>
        <div class="history-period-grid">
          <label class="form-field">
            <span>使用起始时间</span>
            <input v-model="historyForm.usageStartedAt" class="input" type="datetime-local" required />
          </label>
          <label class="form-field">
            <span>使用结束时间</span>
            <input v-model="historyForm.usageEndedAt" class="input" type="datetime-local" required />
          </label>
        </div>
        <p class="history-form-hint">手工维护只影响历史记录，不会修改当前正在使用的密码。</p>
        <p v-if="historyFormError" class="error-tip">{{ historyFormError }}</p>
      </form>
      <template #footer>
        <button form="password-memo-history-form" type="submit" class="action-btn" :disabled="maintainingHistory">
          {{ maintainingHistory ? '保存中...' : (historyMode === 'create' ? '添加历史记录' : '保存修改') }}
        </button>
      </template>
    </MacDialog>

    <MacDialog
      v-model="showUpdatePasswordDialog"
      title="更新账号密码"
      subtitle="更新后，当前密码会自动归档到历史密码中。"
      width="560px"
      panel-class="password-memo-update-password-dialog"
      :close-disabled="updatingPassword"
      @cancel="closeUpdatePasswordDialog"
    >
      <form id="password-memo-update-password-form" class="dialog-form update-password-form" @submit.prevent="submitPasswordUpdate">
        <div class="form-field">
          <label for="password-memo-update-password">新密码</label>
          <div class="password-input-wrap">
            <input
              id="password-memo-update-password"
              v-model="passwordUpdateForm.newPassword"
              class="input"
              :type="passwordVisibility.updateNew ? 'text' : 'password'"
              maxlength="128"
              autocomplete="new-password"
              placeholder="请输入新密码"
              required
            />
            <button
              type="button"
              class="password-hold-button"
              :class="{active: passwordVisibility.updateNew}"
              aria-label="按住显示新密码"
              title="按住显示新密码"
              @pointerdown.prevent="showPasswordField('updateNew')"
              @pointerup="hidePasswordField('updateNew')"
              @pointerleave="hidePasswordField('updateNew')"
              @pointercancel="hidePasswordField('updateNew')"
              @keydown.space.prevent="showPasswordField('updateNew')"
              @keyup.space.prevent="hidePasswordField('updateNew')"
              @blur="hidePasswordField('updateNew')"
              @contextmenu.prevent
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 12s3.6-6 9-6 9 6 9 6-3.6 6-9 6-9-6-9-6Zm9 3.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" />
              </svg>
            </button>
          </div>
        </div>
        <div class="form-field">
          <label for="password-memo-confirm-password">确认新密码</label>
          <div class="password-input-wrap">
            <input
              id="password-memo-confirm-password"
              v-model="passwordUpdateForm.confirmPassword"
              class="input"
              :type="passwordVisibility.updateConfirm ? 'text' : 'password'"
              maxlength="128"
              autocomplete="new-password"
              placeholder="请再次输入新密码"
              required
            />
            <button
              type="button"
              class="password-hold-button"
              :class="{active: passwordVisibility.updateConfirm}"
              aria-label="按住显示确认密码"
              title="按住显示确认密码"
              @pointerdown.prevent="showPasswordField('updateConfirm')"
              @pointerup="hidePasswordField('updateConfirm')"
              @pointerleave="hidePasswordField('updateConfirm')"
              @pointercancel="hidePasswordField('updateConfirm')"
              @keydown.space.prevent="showPasswordField('updateConfirm')"
              @keyup.space.prevent="hidePasswordField('updateConfirm')"
              @blur="hidePasswordField('updateConfirm')"
              @contextmenu.prevent
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 12s3.6-6 9-6 9 6 9 6-3.6 6-9 6-9-6-9-6Zm9 3.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" />
              </svg>
            </button>
          </div>
        </div>
        <p v-if="passwordUpdateError" class="error-tip">{{ passwordUpdateError }}</p>
      </form>
      <template #footer>
        <button form="password-memo-update-password-form" type="submit" class="action-btn" :disabled="updatingPassword">
          {{ updatingPassword ? '更新中...' : '确认更新密码' }}
        </button>
      </template>
    </MacDialog>

    <MacDialog
      v-model="showDetailDialog"
      title="账号详情"
      subtitle="关闭详情后再次打开，需要重新输入当前用户密码才能查看完整密码。"
      width="900px"
      panel-class="password-memo-verify-dialog"
      :close-disabled="detailLoading || verifyingPassword"
      @cancel="closeDetailDialog"
    >
      <div class="detail-dialog">
        <div v-if="detailLoading" class="empty-state detail-empty">详情加载中...</div>

        <div v-else-if="activeDetail" class="detail-content">
          <div class="detail-grid">
            <p><span>网站名</span><strong>{{ activeDetail.siteName || '-' }}</strong></p>
            <p><span>类别</span><strong>{{ categoryLabel(activeDetail.category) }}</strong></p>
            <p><span>地址</span><strong>{{ activeDetail.siteUrl || '-' }}</strong></p>
            <p><span>用户名</span><strong>{{ activeDetail.username || '-' }}</strong></p>
            <p><span>注册手机</span><strong>{{ activeDetail.registeredPhone || '-' }}</strong></p>
            <p><span>注册邮箱</span><strong>{{ activeDetail.registeredEmail || '-' }}</strong></p>
            <p class="wide"><span>备注</span><strong>{{ activeDetail.remark || '-' }}</strong></p>
          </div>

          <div class="password-box">
            <div>
              <p class="password-label">密码</p>
              <p class="password-value">{{ displayedMaskedPassword || activeDetail.maskedPassword || maskPassword(activeDetail.password) }}</p>
            </div>
            <span v-if="displayedMaskedPassword" class="copy-status-badge">已安全复制</span>
          </div>

          <form id="password-memo-verify-form" class="verify-form" @submit.prevent="verifyAndRevealPassword">
            <label class="form-field">
              <span>输入当前用户密码后自动复制账号密码</span>
              <input
                v-model="verifyForm.loginPassword"
                class="input"
                type="password"
                maxlength="128"
                autocomplete="current-password"
                placeholder="请输入当前登录用户密码"
              />
            </label>

          </form>

          <p v-if="detailStatusMessage" :class="['detail-status', detailStatusType]">{{ detailStatusMessage }}</p>

          <section class="password-history-section">
            <div class="history-heading">
              <div>
                <h3>历史密码</h3>
                <p>完成上方身份验证后显示首字符，并保留每次密码的使用周期。</p>
              </div>
              <div class="history-heading-actions">
                <span>{{ activeDetail.passwordHistory.length }} 条</span>
                <button type="button" @click="openCreateHistoryDialog">＋ 手动添加</button>
              </div>
            </div>
            <div v-if="activeDetail.passwordHistory.length" class="history-table-wrap">
              <table class="history-table">
                <thead>
                  <tr>
                    <th>历史密码</th>
                    <th>使用起始时间</th>
                    <th>使用结束时间</th>
                    <th class="history-action-column">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="history in activeDetail.passwordHistory" :key="history.id">
                    <td><code>{{ history.maskedPassword }}</code></td>
                    <td>{{ history.usageStartedAt || '-' }}</td>
                    <td>{{ history.usageEndedAt || '-' }}</td>
                    <td>
                      <div class="history-row-actions">
                        <button type="button" @click="openEditHistoryDialog(history)">编辑</button>
                        <button type="button" class="danger" :disabled="maintainingHistory" @click="removePasswordHistory(history)">删除</button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="history-empty">尚未更新过密码，暂无历史记录。</p>
          </section>
        </div>
      </div>
      <template #footer>
        <button type="button" class="ghost-btn" :disabled="detailLoading || verifyingPassword || !activeDetail" @click="openUpdatePasswordDialog">
          更新密码
        </button>
        <button form="password-memo-verify-form" type="submit" class="action-btn" :disabled="verifyingPassword || detailLoading || !activeDetail">
          {{ verifyingPassword ? '校验并复制中...' : '验证并复制密码' }}
        </button>
      </template>
    </MacDialog>
  </div>
</template>

<script>
import {computed, onMounted, reactive, ref} from 'vue'
import {useRouter} from 'vue-router'
import MacDialog from '@/components/MacDialog.vue'
import {listDataDictionaryOptionsByUsage} from '@/api/dataDictionary'
import {
  createPasswordMemoHistory,
  createPasswordMemo,
  deletePasswordMemo,
  deletePasswordMemoHistory,
  getPasswordMemoDetail,
  listPasswordMemos,
  updatePasswordMemo,
  updatePasswordMemoHistory,
  updatePasswordMemoPassword,
  verifyPasswordMemoAccess
} from '@/api/passwordMemo'

const PAGE_SIZE_OPTIONS = [8, 12, 20]
const PASSWORD_MEMO_APP_CODE = 'APP_PASSWORD_MEMO'
const PASSWORD_MEMO_MODULE_CODE = 'PASSWORD_MEMO'
const CATEGORY_FIELD_CODE = 'category'

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
    category: item.category || '',
    siteName: item.siteName || item.websiteName || '',
    siteUrl: item.siteUrl || item.websiteUrl || item.url || '',
    username: item.username || item.accountName || '',
    password: item.password || item.secret || '',
    maskedPassword: item.maskedPassword || '******',
    registeredPhone: item.registeredPhone || item.phone || '',
    registeredEmail: item.registeredEmail || item.email || '',
    remark: item.remark || '',
    createdAt: item.createdAt || item.createTime || '',
    updatedAt: item.updatedAt || item.updateTime || item.createdAt || item.createTime || '',
    passwordHistory: (item.passwordHistory || item.history || []).map((history) => ({
      id: history.id,
      maskedPassword: history.maskedPassword || '********',
      usageStartedAt: history.usageStartedAt || history.startedAt || '',
      usageEndedAt: history.usageEndedAt || history.endedAt || ''
    }))
  }
}

function normalizeDictionaryOptions(payload) {
  const source = Array.isArray(payload) ? payload : payload?.list || payload?.items || []
  return source.map((item) => ({
    value: item.itemValue || item.value || item.itemCode || item.code || '',
    label: item.itemLabel || item.label || item.itemValue || item.value || '',
    isDefault: Boolean(item.isDefault)
  })).filter((item) => item.value && item.label)
}

// 页面只保留密码掩码，明文仅在验证成功后的复制动作中短暂存在。
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

function maskPasswordToFirstCharacter(value) {
  const source = `${value || ''}`
  if (!source) {
    return '********'
  }
  return `${source.slice(0, 1)}${'*'.repeat(Math.max(source.length - 1, 1))}`
}

// Clipboard API 在异步校验完成后可能失去用户激活态，保留兼容复制路径。
async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value)
      return
    } catch {
      // 继续使用兼容复制方案。
    }
  }
  const copyInput = document.createElement('textarea')
  copyInput.value = value
  copyInput.setAttribute('readonly', '')
  copyInput.style.position = 'fixed'
  copyInput.style.opacity = '0'
  document.body.appendChild(copyInput)
  copyInput.select()
  const copied = typeof document.execCommand === 'function' && document.execCommand('copy')
  document.body.removeChild(copyInput)
  if (!copied) {
    throw new Error('浏览器拒绝访问剪贴板')
  }
}

function normalizeUrl(url) {
  if (!url) {
    return '#'
  }
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

// 列表仅展示便于识别的主机名，完整地址仍保留在链接目标中。
function displaySiteAddress(url) {
  if (!url) {
    return '未填写地址'
  }
  try {
    return new URL(normalizeUrl(url)).host.replace(/^www\./i, '')
  } catch {
    return url
  }
}

function extractErrorMessage(error, fallback) {
  const data = error?.response?.data || {}
  return data.message || data.msg || fallback
}

function toDateTimeInputValue(value) {
  return `${value || ''}`.replace(' ', 'T').slice(0, 16)
}

export default {
  name: 'PasswordMemo',
  components: {MacDialog},
  setup() {
    const router = useRouter()

    // 页面状态拆成列表、编辑弹窗和详情解锁三组，便于关闭详情后彻底重置敏感数据。
    const loading = ref(false)
    const categoryLoading = ref(false)
    const submitting = ref(false)
    const verifyingPassword = ref(false)
    const updatingPassword = ref(false)
    const maintainingHistory = ref(false)
    const total = ref(0)
    const pagedRecords = ref([])
    const categoryOptions = ref([])

    const showEditDialog = ref(false)
    const showDetailDialog = ref(false)
    const showUpdatePasswordDialog = ref(false)
    const showHistoryDialog = ref(false)
    const detailLoading = ref(false)
    const activeDetail = ref(null)
    const displayedMaskedPassword = ref('')
    const detailStatusMessage = ref('')
    const detailStatusType = ref('')
    const passwordUpdateError = ref('')
    const historyFormError = ref('')
    const historyMode = ref('create')
    const editingHistoryId = ref(null)
    const editMode = ref('create')
    const editingId = ref('')

    const query = reactive({
      keyword: '',
      category: '',
      pageNo: 1,
      pageSize: PAGE_SIZE_OPTIONS[0]
    })

    const form = reactive({
      category: '',
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

    const passwordUpdateForm = reactive({
      newPassword: '',
      confirmPassword: ''
    })

    const passwordVisibility = reactive({
      create: false,
      updateNew: false,
      updateConfirm: false
    })

    const historyForm = reactive({
      password: '',
      usageStartedAt: '',
      usageEndedAt: ''
    })

    const pageSizeOptions = PAGE_SIZE_OPTIONS

    const totalPages = computed(() => Math.max(1, Math.ceil(total.value / query.pageSize)))

    const categoryLabel = (category) => {
      if (!category) {
        return '未分类'
      }
      return categoryOptions.value.find((item) => item.value === category)?.label || category
    }

    const loadCategoryOptions = async () => {
      categoryLoading.value = true
      try {
        const response = await listDataDictionaryOptionsByUsage({
          appCode: PASSWORD_MEMO_APP_CODE,
          moduleCode: PASSWORD_MEMO_MODULE_CODE,
          bizFieldCode: CATEGORY_FIELD_CODE
        })
        categoryOptions.value = normalizeDictionaryOptions(unwrapData(response))
        if (!form.category) {
          form.category = categoryOptions.value.find((item) => item.isDefault)?.value || ''
        }
      } catch (error) {
        categoryOptions.value = []
        alert(extractErrorMessage(error, '加载密码类别失败'))
      } finally {
        categoryLoading.value = false
      }
    }

    const showPasswordField = (field) => {
      passwordVisibility[field] = true
    }

    const hidePasswordField = (field) => {
      passwordVisibility[field] = false
    }

    const fillForm = (memo) => {
      form.category = memo.category
        || categoryOptions.value.find((item) => item.isDefault)?.value
        || ''
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
      passwordVisibility.create = false
    }

    const loadMemos = async () => {
      loading.value = true
      try {
        const res = await listPasswordMemos({
          pageNo: query.pageNo,
          pageSize: query.pageSize,
          keyword: query.keyword || undefined,
          category: query.category || undefined
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
      query.category = ''
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
      if (!form.category) {
        alert('请选择类别')
        return
      }
      if (editMode.value === 'create' && !form.password) {
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
        category: form.category,
        siteName: form.siteName,
        siteUrl: form.siteUrl,
        username: form.username,
        registeredPhone: form.registeredPhone,
        registeredEmail: form.registeredEmail,
        remark: form.remark
      }
      if (editMode.value === 'create') {
        payload.password = form.password
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
      displayedMaskedPassword.value = ''
      detailStatusMessage.value = ''
      detailStatusType.value = ''
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
        detailStatusMessage.value = '请输入当前用户密码'
        detailStatusType.value = 'error'
        return
      }

      verifyingPassword.value = true
      detailStatusMessage.value = ''
      detailStatusType.value = ''
      try {
        const res = await verifyPasswordMemoAccess(activeDetail.value.id, {
          loginPassword: verifyForm.loginPassword
        })
        const payload = unwrapData(res) || {}
        const fullPassword = payload.password || payload.fullPassword || ''
        if (!fullPassword) {
          throw new Error('接口未返回完整密码')
        }
        await copyText(fullPassword)
        displayedMaskedPassword.value = payload.maskedPassword || maskPasswordToFirstCharacter(fullPassword)
        if (Array.isArray(payload.passwordHistory)) {
          activeDetail.value.passwordHistory = normalizeMemo({passwordHistory: payload.passwordHistory}).passwordHistory
        }
        verifyForm.loginPassword = ''
        detailStatusMessage.value = '账号密码已自动复制到剪贴板'
        detailStatusType.value = 'success'
      } catch (error) {
        detailStatusMessage.value = extractErrorMessage(error, '密码校验或复制失败，请稍后重试')
        detailStatusType.value = 'error'
      } finally {
        verifyingPassword.value = false
      }
    }

    const resetPasswordUpdateForm = () => {
      passwordUpdateForm.newPassword = ''
      passwordUpdateForm.confirmPassword = ''
      passwordUpdateError.value = ''
      passwordVisibility.updateNew = false
      passwordVisibility.updateConfirm = false
    }

    const openUpdatePasswordDialog = () => {
      if (!activeDetail.value) {
        return
      }
      resetPasswordUpdateForm()
      showUpdatePasswordDialog.value = true
    }

    const closeUpdatePasswordDialog = () => {
      if (updatingPassword.value) {
        return
      }
      showUpdatePasswordDialog.value = false
      resetPasswordUpdateForm()
    }

    const submitPasswordUpdate = async () => {
      if (!activeDetail.value) {
        return
      }
      if (!passwordUpdateForm.newPassword) {
        passwordUpdateError.value = '请输入新密码'
        return
      }
      if (passwordUpdateForm.newPassword !== passwordUpdateForm.confirmPassword) {
        passwordUpdateError.value = '两次输入的新密码不一致'
        return
      }
      updatingPassword.value = true
      passwordUpdateError.value = ''
      try {
        const res = await updatePasswordMemoPassword(activeDetail.value.id, {
          newPassword: passwordUpdateForm.newPassword
        })
        activeDetail.value = normalizeMemo(unwrapData(res) || activeDetail.value)
        displayedMaskedPassword.value = ''
        detailStatusMessage.value = '密码更新成功，原密码已归档到历史记录'
        detailStatusType.value = 'success'
        showUpdatePasswordDialog.value = false
        resetPasswordUpdateForm()
        await loadMemos()
      } catch (error) {
        passwordUpdateError.value = extractErrorMessage(error, '密码更新失败，请稍后重试')
      } finally {
        updatingPassword.value = false
      }
    }

    const resetHistoryForm = () => {
      historyForm.password = ''
      historyForm.usageStartedAt = ''
      historyForm.usageEndedAt = ''
      historyFormError.value = ''
      editingHistoryId.value = null
    }

    const openCreateHistoryDialog = () => {
      historyMode.value = 'create'
      resetHistoryForm()
      showHistoryDialog.value = true
    }

    const openEditHistoryDialog = (history) => {
      historyMode.value = 'edit'
      resetHistoryForm()
      editingHistoryId.value = history.id
      historyForm.usageStartedAt = toDateTimeInputValue(history.usageStartedAt)
      historyForm.usageEndedAt = toDateTimeInputValue(history.usageEndedAt)
      showHistoryDialog.value = true
    }

    const closeHistoryDialog = () => {
      if (maintainingHistory.value) {
        return
      }
      showHistoryDialog.value = false
      resetHistoryForm()
    }

    const submitHistoryForm = async () => {
      if (!activeDetail.value) {
        return
      }
      if (historyMode.value === 'create' && !historyForm.password) {
        historyFormError.value = '请输入历史密码'
        return
      }
      if (!historyForm.usageStartedAt || !historyForm.usageEndedAt) {
        historyFormError.value = '请填写完整的使用起止时间'
        return
      }
      if (historyForm.usageStartedAt >= historyForm.usageEndedAt) {
        historyFormError.value = '使用结束时间必须晚于起始时间'
        return
      }

      const payload = {
        password: historyForm.password || undefined,
        usageStartedAt: historyForm.usageStartedAt,
        usageEndedAt: historyForm.usageEndedAt
      }
      maintainingHistory.value = true
      historyFormError.value = ''
      try {
        const response = historyMode.value === 'create'
          ? await createPasswordMemoHistory(activeDetail.value.id, payload)
          : await updatePasswordMemoHistory(activeDetail.value.id, editingHistoryId.value, payload)
        activeDetail.value = normalizeMemo(unwrapData(response) || activeDetail.value)
        showHistoryDialog.value = false
        resetHistoryForm()
        detailStatusMessage.value = historyMode.value === 'create' ? '历史密码添加成功' : '历史密码更新成功'
        detailStatusType.value = 'success'
      } catch (error) {
        historyFormError.value = extractErrorMessage(error, '历史密码保存失败，请稍后重试')
      } finally {
        maintainingHistory.value = false
      }
    }

    const removePasswordHistory = async (history) => {
      if (!activeDetail.value || maintainingHistory.value) {
        return
      }
      if (!window.confirm(`确认删除使用起始时间为 ${history.usageStartedAt || '-'} 的历史密码吗？`)) {
        return
      }
      maintainingHistory.value = true
      try {
        const response = await deletePasswordMemoHistory(activeDetail.value.id, history.id)
        activeDetail.value = normalizeMemo(unwrapData(response) || activeDetail.value)
        detailStatusMessage.value = '历史密码已删除'
        detailStatusType.value = 'success'
      } catch (error) {
        detailStatusMessage.value = extractErrorMessage(error, '历史密码删除失败，请稍后重试')
        detailStatusType.value = 'error'
      } finally {
        maintainingHistory.value = false
      }
    }

    const goBack = () => {
      router.push('/home')
    }

    onMounted(() => {
      Promise.all([loadCategoryOptions(), loadMemos()])
    })

    return {
      loading,
      categoryLoading,
      submitting,
      verifyingPassword,
      updatingPassword,
      maintainingHistory,
      total,
      pagedRecords,
      categoryOptions,
      query,
      pageSizeOptions,
      totalPages,
      showEditDialog,
      showDetailDialog,
      showUpdatePasswordDialog,
      showHistoryDialog,
      detailLoading,
      activeDetail,
      displayedMaskedPassword,
      detailStatusMessage,
      detailStatusType,
      passwordUpdateError,
      historyFormError,
      historyMode,
      editMode,
      form,
      verifyForm,
      passwordUpdateForm,
      passwordVisibility,
      historyForm,
      maskPassword,
      normalizeUrl,
      displaySiteAddress,
      categoryLabel,
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
      openUpdatePasswordDialog,
      closeUpdatePasswordDialog,
      submitPasswordUpdate,
      showPasswordField,
      hidePasswordField,
      openCreateHistoryDialog,
      openEditHistoryDialog,
      closeHistoryDialog,
      submitHistoryForm,
      removePasswordHistory,
      goBack
    }
  }
}
</script>

<style scoped>
.password-memo-page {
  position: relative;
  height: 100%;
  min-height: 100vh;
  padding: 20px 24px 30px;
  overflow-y: auto;
  color: var(--theme-text);
  scrollbar-gutter: stable;
}

.password-memo-page::before {
  position: fixed;
  inset: 0;
  content: "";
  pointer-events: none;
  background:
    linear-gradient(180deg, rgba(5, 8, 13, 0.28), rgba(5, 8, 13, 0.5)),
    radial-gradient(circle at 48% -20%, rgba(91, 161, 255, 0.09), transparent 42%);
}

.password-memo-shell {
  position: relative;
  z-index: 1;
  width: min(1680px, 100%);
  margin: 0 auto;
}

.memo-page-header {
  display: flex;
  align-items: center;
  gap: 18px;
  min-height: 50px;
  margin-bottom: 16px;
}

.memo-back-button,
.memo-button,
.memo-row-button,
.memo-page-actions button,
.memo-search-clear,
.memo-search-submit {
  font: inherit;
}

.memo-back-button {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 7px;
  min-height: 36px;
  padding: 0 12px 0 9px;
  border: 1px solid var(--theme-border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--theme-surface-strong) 82%, transparent);
  box-shadow: inset 0 1px 0 var(--theme-highlight-soft);
  color: var(--theme-text-soft);
  font-size: 13px;
  font-weight: 600;
  backdrop-filter: blur(18px) saturate(130%);
  transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease, transform 160ms ease;
}

.memo-back-button svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.memo-back-button:hover {
  border-color: color-mix(in srgb, var(--theme-accent) 40%, var(--theme-border));
  background: var(--theme-surface-hover);
  color: var(--theme-text);
  transform: translateX(-2px);
}

.memo-heading {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
}

.memo-heading-mark {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border: 1px solid color-mix(in srgb, var(--theme-accent) 30%, var(--theme-border));
  border-radius: 13px;
  background:
    linear-gradient(145deg, color-mix(in srgb, var(--theme-accent) 26%, transparent), transparent),
    color-mix(in srgb, var(--theme-surface-strong) 84%, transparent);
  color: var(--theme-link-hover);
  box-shadow: inset 0 1px 0 var(--theme-highlight);
  backdrop-filter: blur(18px) saturate(135%);
}

.memo-heading-mark svg,
.memo-empty-icon svg {
  width: 24px;
  height: 24px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.6;
}

.memo-page-title {
  margin: 0;
  color: var(--theme-text);
  font-size: clamp(22px, 1.7vw, 28px);
  font-weight: 720;
  line-height: 1.1;
  letter-spacing: -0.025em;
}

.memo-page-subtitle {
  margin: 4px 0 0;
  color: var(--theme-text-muted);
  font-size: 13px;
  line-height: 1.4;
}

.memo-list-panel {
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--theme-border-strong) 78%, transparent);
  border-radius: 20px;
  background:
    linear-gradient(180deg, var(--theme-highlight-soft), transparent 16%),
    color-mix(in srgb, var(--theme-table-surface) 94%, #11151c 6%);
  box-shadow:
    0 24px 60px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 var(--theme-highlight);
  backdrop-filter: blur(36px) saturate(128%);
}

.memo-panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 17px 20px 14px;
}

.memo-panel-heading h2 {
  margin: 0;
  color: var(--theme-text);
  font-size: 18px;
  font-weight: 680;
  letter-spacing: -0.015em;
}

.memo-panel-heading p {
  margin: 4px 0 0;
  color: var(--theme-text-muted);
  font-size: 12px;
  line-height: 1.45;
}

.memo-count {
  flex: 0 0 auto;
  padding: 6px 10px;
  border: 1px solid var(--theme-border);
  border-radius: 999px;
  background: var(--theme-control-surface);
  color: var(--theme-text-muted);
  font-size: 12px;
}

.memo-count strong {
  color: var(--theme-text-soft);
  font-variant-numeric: tabular-nums;
}

.memo-toolbar {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) 150px auto;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  border-top: 1px solid var(--theme-divider);
  border-bottom: 1px solid var(--theme-divider);
  background: color-mix(in srgb, var(--theme-surface-muted) 72%, transparent);
}

.memo-category-filter {
  min-width: 0;
}

.memo-category-filter select {
  width: 100%;
  height: 40px;
  padding: 0 32px 0 12px;
  border: 1px solid var(--theme-border);
  border-radius: 12px;
  outline: 0;
  background: color-mix(in srgb, var(--theme-field-surface) 84%, transparent);
  color: var(--theme-text-soft);
  font: inherit;
  font-size: 13px;
  box-shadow: inset 0 1px 0 var(--theme-highlight-soft);
}

.memo-category-filter select:focus {
  border-color: var(--theme-accent);
  box-shadow: 0 0 0 3px var(--theme-focus-ring);
}

.memo-search {
  display: flex;
  min-width: 0;
  height: 40px;
  align-items: center;
  gap: 9px;
  padding: 0 10px 0 12px;
  border: 1px solid var(--theme-border);
  border-radius: 12px;
  background: color-mix(in srgb, var(--theme-field-surface) 84%, transparent);
  box-shadow: inset 0 1px 0 var(--theme-highlight-soft);
  transition: border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease;
}

.memo-search:focus-within {
  border-color: var(--theme-accent);
  background: var(--theme-field-surface);
  box-shadow: 0 0 0 3px var(--theme-focus-ring);
}

.memo-search > svg {
  flex: 0 0 auto;
  width: 18px;
  height: 18px;
  fill: none;
  stroke: var(--theme-text-muted);
  stroke-linecap: round;
  stroke-width: 1.7;
}

.memo-toolbar .memo-search input {
  min-width: 0;
  width: 100%;
  height: 38px !important;
  min-height: 38px !important;
  padding: 0 !important;
  border: 0 !important;
  border-radius: 0 !important;
  outline: 0;
  background: transparent !important;
  box-shadow: none !important;
  color: var(--theme-text) !important;
  font-size: 13px;
  backdrop-filter: none;
}

.memo-toolbar .memo-search input:focus {
  box-shadow: none !important;
}

.memo-toolbar .memo-search input::placeholder {
  color: var(--theme-text-muted) !important;
}

.memo-search-clear {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--theme-control-surface);
  color: var(--theme-text-muted);
  font-size: 18px;
  line-height: 1;
}

.memo-search-clear:hover {
  background: var(--theme-surface-hover);
  color: var(--theme-text);
}

.memo-search-submit {
  flex: 0 0 auto;
  min-height: 26px;
  padding: 0 4px 0 10px;
  border: 0;
  border-left: 1px solid var(--theme-divider);
  background: transparent;
  color: var(--theme-link);
  font-size: 12px;
  font-weight: 650;
}

.memo-search-submit:not(:disabled):hover {
  color: var(--theme-link-hover);
}

.memo-search-submit:disabled {
  opacity: 0.45;
}

.memo-toolbar-actions,
.memo-row-actions,
.memo-mobile-card-actions,
.memo-page-actions,
.memo-page-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.memo-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid var(--theme-border);
  border-radius: 11px;
  color: var(--theme-text-soft);
  font-size: 13px;
  font-weight: 650;
  box-shadow: inset 0 1px 0 var(--theme-highlight-soft);
  transition: transform 160ms ease, border-color 160ms ease, background-color 160ms ease, box-shadow 160ms ease;
}

.memo-button svg {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.memo-button-secondary {
  background: var(--theme-control-surface);
}

.memo-button-primary {
  border-color: color-mix(in srgb, var(--theme-accent) 72%, var(--theme-border));
  background: linear-gradient(180deg, var(--theme-accent), var(--theme-accent-strong));
  color: #ffffff;
  box-shadow:
    0 8px 20px color-mix(in srgb, var(--theme-accent) 24%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.24);
}

.memo-button:not(:disabled):hover {
  transform: translateY(-1px);
}

.memo-button-secondary:not(:disabled):hover {
  border-color: color-mix(in srgb, var(--theme-accent) 38%, var(--theme-border));
  background: var(--theme-surface-hover);
}

.memo-button-primary:not(:disabled):hover {
  border-color: var(--theme-link-hover);
  box-shadow:
    0 11px 24px color-mix(in srgb, var(--theme-accent) 31%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.memo-button:disabled,
.memo-row-button:disabled,
.memo-page-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.memo-table-wrap {
  overflow-x: auto;
  scrollbar-color: var(--theme-scrollbar) transparent;
  scrollbar-width: thin;
}

.memo-table {
  width: 100%;
  min-width: 880px;
  border-collapse: separate;
  border-spacing: 0;
  color: var(--theme-table-text);
  font-variant-numeric: tabular-nums;
  table-layout: fixed;
}

.memo-table th,
.memo-table td {
  padding: 11px 20px;
  border-bottom: 1px solid var(--theme-table-divider);
  text-align: left;
}

.memo-list-panel .memo-table td {
  height: 60px;
  vertical-align: middle !important;
  color: var(--theme-table-text);
  font-size: 13px;
}

.memo-table th {
  height: 38px;
  background: color-mix(in srgb, var(--theme-table-header) 78%, transparent);
  color: var(--theme-table-head-text);
  font-size: 11px;
  font-weight: 650;
  letter-spacing: 0.03em;
  white-space: nowrap;
}

.memo-table tbody tr {
  background: transparent;
  transition: background-color 140ms ease;
}

.memo-table tbody tr:hover,
.memo-table tbody tr:focus-within {
  background: color-mix(in srgb, var(--theme-accent) 6%, transparent);
}

.memo-table tbody tr:last-child td {
  border-bottom: 0;
}

.memo-site-column {
  width: 30%;
}

.memo-category-column {
  width: 110px;
}

.memo-time-column {
  width: 190px;
}

.memo-action-column {
  width: 210px;
  text-align: right !important;
}

.memo-site-identity {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 11px;
}

.memo-site-identity > div {
  min-width: 0;
}

.memo-site-identity strong,
.memo-site-identity h3 {
  display: block;
  overflow: hidden;
  margin: 0;
  color: var(--theme-text-soft);
  font-size: 13px;
  font-weight: 650;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.memo-site-avatar {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid color-mix(in srgb, var(--theme-accent) 28%, var(--theme-border));
  border-radius: 10px;
  background:
    linear-gradient(145deg, color-mix(in srgb, var(--theme-accent) 24%, transparent), transparent),
    var(--theme-surface-muted);
  color: var(--theme-link-hover);
  font-size: 14px;
  font-weight: 720;
  box-shadow: inset 0 1px 0 var(--theme-highlight-soft);
}

.memo-category-badge {
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  padding: 4px 9px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--theme-accent) 30%, var(--theme-border));
  border-radius: 999px;
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
  color: var(--theme-link);
  font-size: 11px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.memo-site-link {
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  gap: 4px;
  overflow: hidden;
  margin-top: 3px;
  color: var(--theme-link);
  font-size: 11px;
  line-height: 1.3;
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.memo-site-link:hover {
  color: var(--theme-link-hover);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.memo-account-summary {
  display: grid;
  grid-template-columns: minmax(100px, 0.75fr) minmax(0, 1.25fr);
  align-items: center;
  gap: 3px 16px;
  overflow: hidden;
}

.memo-account-summary strong {
  grid-row: 1 / span 2;
  align-self: center;
  overflow: hidden;
  color: var(--theme-text-soft);
  font-size: 13px;
  font-weight: 620;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.memo-account-summary span {
  grid-column: 2;
  overflow: hidden;
  color: var(--theme-text-muted);
  font-size: 11px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.memo-cell-muted {
  grid-column: 2;
}

.memo-time-cell time {
  color: var(--theme-text-muted);
  font-size: 11px;
  white-space: nowrap;
}

.memo-action-cell {
  text-align: right !important;
}

.memo-row-actions {
  justify-content: flex-end;
}

.memo-row-button {
  flex: 0 0 auto;
  min-width: 42px;
  min-height: 32px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--theme-text-muted);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease;
}

.memo-row-button:hover {
  border-color: var(--theme-border);
  background: var(--theme-control-surface);
  color: var(--theme-text);
}

.memo-row-button-emphasis {
  color: var(--theme-link);
}

.memo-row-button-emphasis:hover {
  border-color: color-mix(in srgb, var(--theme-accent) 34%, var(--theme-border));
  background: var(--theme-accent-soft);
  color: var(--theme-link-hover);
}

.memo-row-button-danger {
  color: color-mix(in srgb, var(--theme-danger) 78%, var(--theme-text-muted));
}

.memo-row-button-danger:hover {
  border-color: color-mix(in srgb, var(--theme-danger) 28%, transparent);
  background: var(--theme-danger-soft);
  color: var(--theme-danger);
}

.memo-mobile-list {
  display: none;
  gap: 10px;
  padding: 12px;
}

.memo-mobile-card {
  padding: 14px;
  border: 1px solid var(--theme-border);
  border-radius: 15px;
  background: color-mix(in srgb, var(--theme-surface-muted) 72%, transparent);
  box-shadow: inset 0 1px 0 var(--theme-highlight-soft);
}

.memo-mobile-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.memo-mobile-card-head time {
  flex: 0 0 auto;
  color: var(--theme-text-muted);
  font-size: 10px;
  white-space: nowrap;
}

.memo-mobile-card-grid,
.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
}

.memo-mobile-card-grid p,
.detail-grid p {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;
  margin: 0;
  padding: 10px;
  border: 1px solid var(--theme-border);
  border-radius: 11px;
  background: var(--theme-surface-muted);
}

.memo-mobile-card-grid span,
.detail-grid span,
.password-label,
.form-field > span,
.form-field > label {
  color: var(--theme-text-muted);
  font-size: 11px;
}

.memo-mobile-card-grid strong,
.detail-grid strong {
  overflow-wrap: anywhere;
  color: var(--theme-text-soft);
  font-size: 13px;
}

.memo-mobile-card-actions {
  justify-content: flex-end;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--theme-divider);
}

.wide {
  grid-column: 1 / -1;
}

.memo-empty-state {
  display: flex;
  min-height: 230px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 30px;
  color: var(--theme-text-muted);
  font-size: 12px;
  text-align: center;
}

.memo-empty-state strong {
  margin-top: 3px;
  color: var(--theme-text-soft);
  font-size: 14px;
}

.memo-empty-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  margin-bottom: 4px;
  border: 1px solid var(--theme-border);
  border-radius: 15px;
  background: var(--theme-control-surface);
  color: var(--theme-text-muted);
}

.memo-loading-indicator {
  width: 22px;
  height: 22px;
  margin-bottom: 3px;
  border: 2px solid var(--theme-border-strong);
  border-top-color: var(--theme-accent);
  border-radius: 50%;
  animation: memo-spin 700ms linear infinite;
}

.memo-pagination {
  display: flex;
  min-height: 56px;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 20px;
  border-top: 1px solid var(--theme-divider);
  color: var(--theme-text-muted);
  font-size: 12px;
}

.memo-page-status strong {
  color: var(--theme-text-soft);
}

.memo-page-status select {
  height: 32px !important;
  min-height: 32px !important;
  padding: 0 28px 0 10px !important;
  border-radius: 9px !important;
  box-shadow: none !important;
  font-size: 12px;
}

.memo-page-actions button {
  display: inline-flex;
  min-height: 32px;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  border: 1px solid var(--theme-border);
  border-radius: 9px;
  background: var(--theme-control-surface);
  color: var(--theme-text-soft);
  font-size: 12px;
  font-weight: 600;
  transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease;
}

.memo-page-actions button:not(:disabled):hover {
  border-color: color-mix(in srgb, var(--theme-accent) 36%, var(--theme-border));
  background: var(--theme-surface-hover);
  color: var(--theme-text);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.dialog-form,
.detail-content,
.verify-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.password-input-wrap {
  position: relative;
}

.password-input-wrap .input {
  width: 100%;
  padding-right: 44px;
}

.password-hold-button {
  position: absolute;
  top: 50%;
  right: 6px;
  display: inline-flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--theme-text-muted);
  transform: translateY(-50%);
  transition: background-color 140ms ease, color 140ms ease, transform 100ms ease;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.password-hold-button:hover,
.password-hold-button.active {
  background: var(--theme-surface-hover);
  color: var(--theme-link-hover);
}

.password-hold-button.active {
  transform: translateY(-50%) scale(0.94);
}

.password-hold-button svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
}

.form-inline-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.textarea {
  min-height: 96px;
  resize: vertical;
}

.detail-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.password-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
  padding: 16px 18px;
  border: 1px solid var(--theme-border);
  border-radius: 16px;
  background: var(--theme-surface-muted);
}

.copy-status-badge {
  flex: 0 0 auto;
  padding: 5px 9px;
  border: 1px solid color-mix(in srgb, var(--theme-success) 35%, var(--theme-border));
  border-radius: 999px;
  background: color-mix(in srgb, var(--theme-success) 12%, transparent);
  color: var(--theme-success);
  font-size: 11px;
  font-weight: 700;
}

.password-value {
  margin: 6px 0 0;
  color: var(--theme-text);
  font-size: 28px;
  line-height: 1.3;
  letter-spacing: 1px;
  overflow-wrap: anywhere;
}

.error-tip {
  margin: 0;
  color: var(--theme-danger);
  font-size: 13px;
}

.detail-status {
  margin: 0;
  padding: 10px 12px;
  border: 1px solid var(--theme-border);
  border-radius: 11px;
  background: var(--theme-surface-muted);
  font-size: 12px;
}

.detail-status.success {
  border-color: color-mix(in srgb, var(--theme-success) 32%, var(--theme-border));
  color: var(--theme-success);
}

.detail-status.error {
  border-color: color-mix(in srgb, var(--theme-danger) 30%, var(--theme-border));
  color: var(--theme-danger);
}

.update-password-form {
  gap: 16px;
}

.password-history-section {
  overflow: hidden;
  border: 1px solid var(--theme-border);
  border-radius: 15px;
  background: color-mix(in srgb, var(--theme-surface-muted) 76%, transparent);
}

.history-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 13px 15px;
  border-bottom: 1px solid var(--theme-divider);
}

.history-heading h3,
.history-heading p {
  margin: 0;
}

.history-heading h3 {
  color: var(--theme-text-soft);
  font-size: 13px;
}

.history-heading p {
  margin-top: 4px;
  color: var(--theme-text-muted);
  font-size: 11px;
}

.history-heading-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 9px;
}

.history-heading-actions > span {
  flex: 0 0 auto;
  color: var(--theme-text-muted);
  font-size: 11px;
}

.history-heading-actions button,
.history-row-actions button {
  min-height: 28px;
  padding: 0 9px;
  border: 1px solid var(--theme-border);
  border-radius: 8px;
  background: var(--theme-control-surface);
  color: var(--theme-link);
  font: inherit;
  font-size: 11px;
  font-weight: 650;
}

.history-heading-actions button:hover,
.history-row-actions button:hover {
  border-color: color-mix(in srgb, var(--theme-accent) 35%, var(--theme-border));
  background: var(--theme-surface-hover);
}

.history-table-wrap {
  overflow-x: auto;
}

.history-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.history-table th,
.history-table td {
  padding: 10px 15px;
  border-bottom: 1px solid var(--theme-divider);
  color: var(--theme-text-muted);
  text-align: left;
  white-space: nowrap;
}

.history-table th {
  color: var(--theme-text-muted);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.history-table tbody tr:last-child td {
  border-bottom: 0;
}

.history-table code {
  color: var(--theme-text-soft);
  font-family: "SFMono-Regular", Consolas, monospace;
  font-size: 12px;
  letter-spacing: 0.08em;
}

.history-action-column {
  width: 112px;
}

.history-row-actions {
  display: flex;
  gap: 6px;
}

.history-row-actions button.danger {
  color: var(--theme-danger);
}

.history-row-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.history-maintain-form {
  gap: 16px;
}

.history-period-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.history-form-hint {
  margin: 0;
  padding: 10px 12px;
  border: 1px solid var(--theme-border);
  border-radius: 10px;
  background: var(--theme-surface-muted);
  color: var(--theme-text-muted);
  font-size: 11px;
  line-height: 1.5;
}

.history-empty {
  margin: 0;
  padding: 20px 15px;
  color: var(--theme-text-muted);
  font-size: 12px;
  text-align: center;
}

.detail-empty {
  min-height: 260px;
}

@keyframes memo-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 900px) {
  .desktop-table {
    display: none;
  }

  .memo-mobile-list {
    display: grid;
  }
}

@media (max-width: 720px) {
  .password-memo-page {
    padding: 14px 12px 22px;
  }

  .memo-page-header {
    align-items: flex-start;
    gap: 12px;
  }

  .memo-back-button {
    min-height: 34px;
    padding-right: 9px;
  }

  .memo-heading-mark {
    width: 38px;
    height: 38px;
    border-radius: 11px;
  }

  .memo-page-title {
    font-size: 21px;
  }

  .memo-page-subtitle {
    max-width: 420px;
    font-size: 12px;
  }

  .memo-list-panel {
    border-radius: 16px;
  }

  .memo-panel-heading {
    padding: 14px;
  }

  .memo-toolbar {
    grid-template-columns: 1fr;
    padding: 11px 14px;
  }

  .memo-toolbar-actions {
    justify-content: flex-end;
  }

  .memo-pagination {
    padding: 10px 14px;
  }

  .form-inline-grid,
  .detail-grid {
    grid-template-columns: 1fr;
  }

  .history-heading {
    align-items: flex-start;
  }

  .history-heading-actions {
    align-items: flex-end;
    flex-direction: column;
  }

  .history-period-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 540px) {
  .memo-page-header {
    display: grid;
    grid-template-columns: 1fr;
  }

  .memo-back-button {
    justify-self: start;
  }

  .memo-panel-heading {
    align-items: flex-start;
  }

  .memo-panel-heading p {
    max-width: 240px;
  }

  .memo-toolbar-actions,
  .memo-button {
    width: 100%;
  }

  .memo-button {
    flex: 1 1 0;
  }

  .memo-mobile-card-head {
    flex-direction: column;
  }

  .memo-mobile-card-grid {
    grid-template-columns: 1fr;
  }

  .memo-mobile-card-grid .wide {
    grid-column: auto;
  }

  .memo-mobile-card-actions .memo-row-button {
    flex: 1 1 0;
  }

  .memo-pagination {
    align-items: stretch;
    flex-direction: column;
  }

  .memo-page-status,
  .memo-page-actions {
    justify-content: space-between;
  }

  .memo-page-actions button {
    flex: 1 1 0;
    justify-content: center;
  }

  .password-value {
    font-size: 22px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .memo-loading-indicator {
    animation-duration: 1400ms;
  }

  .memo-back-button,
  .memo-button {
    transition: none;
  }
}
</style>
