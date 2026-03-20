<template>
  <div class="permission-page">
    <div class="page-nav">
      <button type="button" class="back-home-btn" @click="goBackHome">
        <span class="back-home-icon">←</span>
        <span>返回桌面</span>
      </button>
    </div>

    <div class="hero-panel">
      <div>
        <h1 class="page-title">权限管理</h1>
        <p class="page-subtitle">
          以“用户 - 应用授权”为核心设计。当前重点控制每个用户可进入哪些应用，并预留应用管理、系统日志两块后续能力。
        </p>
      </div>
      <div class="hero-tags">
        <span class="hero-tag">用户 {{ pagination.total }}</span>
        <span class="hero-tag">应用 {{ appCatalog.length }}</span>
        <span class="hero-tag">已授权 {{ grantedCount }} 项</span>
        <span class="hero-tag">{{ permissionSourceLabel }}</span>
      </div>
    </div>

    <section class="filter-panel">
      <div class="filter-grid">
        <label class="field">
          <span>用户检索</span>
          <input
            v-model.trim="filters.keyword"
            class="input"
            maxlength="64"
            placeholder="搜索用户名、昵称、手机号、邮箱"
            @keyup.enter="searchUsers"
          />
        </label>

        <label class="field">
          <span>用户状态</span>
          <select v-model="filters.status" class="input">
            <option value="">全部状态</option>
            <option value="ENABLED">启用</option>
            <option value="DISABLED">禁用</option>
          </select>
        </label>

        <label class="field">
          <span>角色</span>
          <select v-model="filters.roleCode" class="input">
            <option value="">全部角色</option>
            <option value="ADMIN">系统管理员</option>
            <option value="DEV">开发人员</option>
            <option value="USER">普通用户</option>
          </select>
        </label>
      </div>

      <div class="filter-actions">
        <button class="action-btn" :disabled="userLoading" @click="searchUsers">查询</button>
        <button class="ghost-btn" :disabled="userLoading" @click="resetFilters">重置</button>
      </div>
    </section>

    <div class="permission-layout">
      <aside class="user-panel">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">用户清单</h2>
            <p class="panel-tip">选择用户后查看可访问应用、密级分布和授权摘要。</p>
          </div>
        </div>

        <div v-if="userLoading" class="empty-state">加载中...</div>
        <template v-else>
          <div v-if="users.length" class="user-list">
            <button
              v-for="item in users"
              :key="item.id"
              type="button"
              class="user-card"
              :class="{active: `${selectedUserId}` === `${item.id}`}"
              @click="selectUser(item)"
            >
              <div class="user-main">
                <div>
                  <strong class="user-name">{{ item.displayName || item.username }}</strong>
                  <p class="user-subtitle">{{ item.username }}</p>
                </div>
                <span class="status-chip" :class="item.status === 'ENABLED' ? 'enabled' : 'disabled'">
                  {{ item.status === 'ENABLED' ? '启用' : '禁用' }}
                </span>
              </div>
              <div class="user-meta">
                <span>{{ formatRoleText(item.roleCode) }}</span>
                <span>{{ item.permissionCount || 0 }} 项权限</span>
              </div>
            </button>
          </div>
          <div v-else class="empty-state">暂无用户数据</div>
        </template>

        <div class="pager">
          <div class="pager-left">
            <span>第 {{ pagination.pageNo }} / {{ totalPages }} 页</span>
            <select v-model.number="pagination.pageSize" class="pager-select" :disabled="userLoading" @change="changePageSize">
              <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }} 条/页</option>
            </select>
          </div>
          <div class="pager-right">
            <button class="ghost-btn" :disabled="pagination.pageNo <= 1 || userLoading" @click="changePage(-1)">上一页</button>
            <button class="ghost-btn" :disabled="pagination.pageNo >= totalPages || userLoading" @click="changePage(1)">下一页</button>
          </div>
        </div>
      </aside>

      <section class="grant-panel">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">应用授权矩阵</h2>
            <p class="panel-tip">
              当前按“应用是否可见”进行控制。主页后续优先查询当前用户授权表，再决定显示哪些应用入口。
            </p>
          </div>
          <div class="grant-actions">
            <button class="ghost-btn" :disabled="!selectedUserId || permissionLoading || saving" @click="grantBySecurityLevel('PUBLIC')">
              仅公开
            </button>
            <button class="ghost-btn" :disabled="!selectedUserId || permissionLoading || saving" @click="toggleAllApps(true)">
              全选
            </button>
            <button class="ghost-btn" :disabled="!selectedUserId || permissionLoading || saving" @click="toggleAllApps(false)">
              清空
            </button>
            <button class="action-btn" :disabled="!selectedUserId || permissionLoading || saving" @click="savePermissions">
              {{ saving ? '保存中...' : '保存授权' }}
            </button>
          </div>
        </div>

        <div v-if="!selectedUser" class="empty-state grant-empty">
          先从左侧选择一个用户，再进行应用授权。
        </div>
        <template v-else>
          <div class="selected-user-bar">
            <div>
              <strong class="selected-user-name">{{ selectedUser.displayName || selectedUser.username }}</strong>
              <p class="selected-user-tip">
                {{ selectedUser.username }} · {{ formatRoleText(selectedUser.roleCode) }} ·
                {{ selectedUser.status === 'ENABLED' ? '当前启用' : '当前禁用' }}
              </p>
            </div>
            <div class="selected-summary">
              <span class="summary-chip">已授权 {{ grantedCount }} / {{ appCatalog.length }}</span>
              <span class="summary-chip">受限 {{ confidentialGrantedCount }} 项</span>
            </div>
          </div>

          <div v-if="permissionLoading" class="empty-state">正在读取授权信息...</div>
          <div v-else class="app-grid">
            <article
              v-for="app in appCatalog"
              :key="app.featureCode"
              class="app-card"
              :class="{granted: isGranted(app.featureCode)}"
            >
              <div class="app-card-head">
                <div class="app-icon">{{ buildShortText(app.name) }}</div>
                <div class="app-head-main">
                  <strong>{{ app.name }}</strong>
                  <span>{{ app.category || '应用分类待维护' }}</span>
                </div>
                <label class="grant-switch">
                  <input
                    :checked="isGranted(app.featureCode)"
                    type="checkbox"
                    @change="toggleAppPermission(app.featureCode)"
                  />
                  <span>{{ isGranted(app.featureCode) ? '已授权' : '未授权' }}</span>
                </label>
              </div>

              <p class="app-desc">{{ app.description || '应用描述待维护' }}</p>

              <div class="app-tags">
                <span class="tag security">{{ formatSecurityLevel(app.securityLevel) }}</span>
                <span class="tag">{{ formatEncryptionMode(app.encryptionMode) }}</span>
                <span class="tag">编码 {{ app.featureCode }}</span>
              </div>

              <div class="app-foot">
                <span>{{ app.route || '主页聚合应用' }}</span>
                <span>{{ app.enabled === false ? '停用中' : '可上架' }}</span>
              </div>
            </article>
          </div>
        </template>
      </section>

      <aside class="insight-panel">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">权限摘要</h2>
            <p class="panel-tip">把授权结果、未来模块和接入边界放在同一页，避免权限模型继续分散。</p>
          </div>
        </div>

        <div class="summary-grid">
          <article class="summary-card">
            <span>可见应用</span>
            <strong>{{ grantedCount }}</strong>
          </article>
          <article class="summary-card">
            <span>受限应用</span>
            <strong>{{ confidentialGrantedCount }}</strong>
          </article>
          <article class="summary-card">
            <span>应用目录</span>
            <strong>{{ appCatalog.length }}</strong>
          </article>
          <article class="summary-card">
            <span>授权来源</span>
            <strong>{{ permissionSourceLabel }}</strong>
          </article>
        </div>

        <div class="insight-block">
          <div class="insight-head">
            <h3 class="insight-title">当前用户权限</h3>
            <span>{{ grantedCount }} 项</span>
          </div>
          <div v-if="selectedGrantedApps.length" class="granted-list">
            <span v-for="item in selectedGrantedApps" :key="item.featureCode" class="granted-chip">
              {{ item.name }}
            </span>
          </div>
          <div v-else class="subtle-empty">当前用户尚未分配应用权限</div>
        </div>

        <div class="insight-block">
          <div class="insight-head">
            <h3 class="insight-title">预留模块</h3>
            <span>{{ reservedCapabilities.length }} 项</span>
          </div>
          <div class="reserve-list">
            <article v-for="item in reservedCapabilities" :key="item.key" class="reserve-card">
              <div class="reserve-head">
                <strong>{{ item.name }}</strong>
                <span>{{ item.status }}</span>
              </div>
              <p>{{ item.description }}</p>
            </article>
          </div>
        </div>

        <div class="insight-block">
          <div class="insight-head">
            <h3 class="insight-title">接入说明</h3>
          </div>
          <div class="note-box">
            <p>主页应用显示优先读取“当前用户可访问应用”接口。</p>
            <p>权限管理页聚焦应用级授权，不和用户基础资料编辑混在一起。</p>
            <p>后续应用管理将接管图标、加密方式、密级、上下线状态等元数据。</p>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script>
import {computed, onMounted, reactive, ref} from 'vue'
import {useRouter} from 'vue-router'
import {listSystemUsers} from '@/api/systemUser'
import {
  getUserAppPermissions,
  listPermissionApps,
  listPermissionUsers,
  saveUserAppPermissions
} from '@/api/permission'
import {
  APP_SECURITY_LEVEL_OPTIONS,
  RESERVED_SYSTEM_CAPABILITIES,
  USER_APP_DEFINITIONS
} from '@/constants/appCatalog'
import {
  getDraftFeatureCodesForUser,
  saveDraftFeatureCodesForUser
} from '@/utils/permissionDraft'

const PAGE_SIZE_OPTIONS = [8, 12, 20]

function unwrapData(res) {
  const payload = res?.data
  if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data
  }
  return payload
}

function extractErrorMessage(error, fallback) {
  const data = error?.response?.data || {}
  return data.message || data.msg || fallback
}

function parseListPayload(payload) {
  if (Array.isArray(payload)) {
    return {list: payload, total: payload.length}
  }

  if (!payload || typeof payload !== 'object') {
    return {list: [], total: 0}
  }

  const list = payload.list || payload.records || payload.rows || payload.items || []
  const total = Number(payload.total ?? payload.totalCount ?? payload.count ?? (Array.isArray(list) ? list.length : 0))
  return {
    list: Array.isArray(list) ? list : [],
    total: Number.isNaN(total) ? 0 : total
  }
}

function normalizeUser(source = {}) {
  const rawStatus = `${source.status || source.userStatus || ''}`.trim().toUpperCase()
  const statusFromEnabled = typeof source.enabled === 'boolean'
    ? (source.enabled ? 'ENABLED' : 'DISABLED')
    : ''
  const status = statusFromEnabled
    || (['ENABLED', 'ACTIVE', '1', 'NORMAL'].includes(rawStatus) ? 'ENABLED' : '')
    || (['DISABLED', 'INACTIVE', 'LOCKED', '0', 'FORBIDDEN'].includes(rawStatus) ? 'DISABLED' : '')
    || 'ENABLED'

  return {
    id: source.id ?? source.userId ?? source.uid,
    username: source.username || source.userName || '-',
    displayName: source.displayName || source.nickname || source.nickName || '',
    roleCode: `${source.roleCode || source.role || 'USER'}`.toUpperCase(),
    status,
    permissionCount: Number(source.permissionCount ?? source.appCount ?? 0)
  }
}

function normalizeApp(source = {}) {
  return {
    key: source.key || source.appKey || source.featureCode || source.code || '',
    name: source.name || source.appName || source.displayName || '',
    featureCode: source.featureCode || source.code || source.appCode || '',
    route: source.route || source.path || '',
    category: source.category || source.groupName || '',
    securityLevel: source.securityLevel || source.appSecurityLevel || 'INTERNAL',
    encryptionMode: source.encryptionMode || source.encryptMode || 'NONE',
    description: source.description || source.remark || '',
    enabled: typeof source.enabled === 'boolean' ? source.enabled : true
  }
}

function buildShortText(text) {
  return Array.from((text || '').replace(/\s+/g, '')).slice(0, 2).join('') || '应'
}

export default {
  name: 'PermissionManagement',
  setup() {
    const router = useRouter()

    const userLoading = ref(false)
    const permissionLoading = ref(false)
    const saving = ref(false)

    const users = ref([])
    const appCatalog = ref(USER_APP_DEFINITIONS.map((item) => normalizeApp(item)))
    const selectedUserId = ref('')
    const selectedFeatureCodes = ref([])
    const permissionSource = ref('draft')

    const filters = reactive({
      keyword: '',
      status: '',
      roleCode: ''
    })

    const pagination = reactive({
      pageNo: 1,
      pageSize: PAGE_SIZE_OPTIONS[0],
      total: 0
    })

    const pageSizeOptions = PAGE_SIZE_OPTIONS
    const reservedCapabilities = RESERVED_SYSTEM_CAPABILITIES

    const totalPages = computed(() => Math.max(1, Math.ceil((pagination.total || 0) / pagination.pageSize)))
    const selectedUser = computed(() => users.value.find((item) => `${item.id}` === `${selectedUserId.value}`) || null)
    const selectedGrantedApps = computed(() => appCatalog.value.filter((item) => selectedFeatureCodes.value.includes(item.featureCode)))
    const grantedCount = computed(() => selectedGrantedApps.value.length)
    const confidentialGrantedCount = computed(() => (
      selectedGrantedApps.value.filter((item) => item.securityLevel === 'CONFIDENTIAL').length
    ))
    const permissionSourceLabel = computed(() => permissionSource.value === 'backend' ? '真实接口' : '本地草稿')

    const formatRoleText = (roleCode) => {
      if (roleCode === 'ADMIN') {
        return '系统管理员'
      }
      if (roleCode === 'DEV') {
        return '开发人员'
      }
      return '普通用户'
    }

    const formatSecurityLevel = (value) => {
      return APP_SECURITY_LEVEL_OPTIONS.find((item) => item.value === value)?.label || value || '-'
    }

    const formatEncryptionMode = (value) => {
      if (value === 'END_TO_END') {
        return '端到端加密'
      }
      if (value === 'FIELD') {
        return '字段加密'
      }
      return '无额外加密'
    }

    const isGranted = (featureCode) => selectedFeatureCodes.value.includes(featureCode)

    const applyLocalUserPermissionSummary = (list) => {
      return list.map((item) => ({
        ...item,
        permissionCount: getDraftFeatureCodesForUser(item.id).length
      }))
    }

    const loadAppCatalog = async () => {
      try {
        const res = await listPermissionApps()
        const payload = unwrapData(res) || {}
        const rawList = Array.isArray(payload) ? payload : (payload.list || payload.items || payload.apps || [])
        if (Array.isArray(rawList) && rawList.length) {
          appCatalog.value = rawList.map((item) => normalizeApp(item)).filter((item) => item.featureCode)
        }
      } catch (error) {
        appCatalog.value = USER_APP_DEFINITIONS.map((item) => normalizeApp(item))
      }
    }

    const loadUsers = async () => {
      userLoading.value = true
      try {
        const params = {
          pageNo: pagination.pageNo,
          pageSize: pagination.pageSize
        }
        if (filters.keyword) {
          params.keyword = filters.keyword
        }
        if (filters.status) {
          params.status = filters.status
        }
        if (filters.roleCode) {
          params.roleCode = filters.roleCode
        }

        try {
          const res = await listPermissionUsers(params)
          const payload = unwrapData(res) || {}
          const {list, total} = parseListPayload(payload)
          users.value = list.map((item) => normalizeUser(item)).filter((item) => item.id !== null && item.id !== undefined)
          pagination.total = total
        } catch (permissionError) {
          const res = await listSystemUsers(params)
          const payload = unwrapData(res) || {}
          const {list, total} = parseListPayload(payload)
          users.value = applyLocalUserPermissionSummary(
            list.map((item) => normalizeUser(item)).filter((item) => item.id !== null && item.id !== undefined)
          )
          pagination.total = total
        }

        if (!selectedUserId.value && users.value.length) {
          selectedUserId.value = `${users.value[0].id}`
        }
        if (selectedUserId.value) {
          await loadUserPermissions(selectedUserId.value)
        }
      } catch (error) {
        users.value = []
        pagination.total = 0
        selectedUserId.value = ''
        selectedFeatureCodes.value = []
        alert(extractErrorMessage(error, '加载权限用户列表失败'))
      } finally {
        userLoading.value = false
      }
    }

    const loadUserPermissions = async (userId) => {
      if (!userId) {
        selectedFeatureCodes.value = []
        permissionSource.value = 'draft'
        return
      }

      permissionLoading.value = true
      try {
        const res = await getUserAppPermissions(userId)
        const payload = unwrapData(res) || {}
        const featureCodes = payload.grantedFeatureCodes
          || payload.grantedAppCodes
          || payload.featureCodes
          || payload.appCodes
          || []
        selectedFeatureCodes.value = Array.isArray(featureCodes) ? Array.from(new Set(featureCodes.filter(Boolean))) : []
        permissionSource.value = 'backend'
      } catch (error) {
        selectedFeatureCodes.value = getDraftFeatureCodesForUser(userId)
        permissionSource.value = 'draft'
      } finally {
        permissionLoading.value = false
      }
    }

    const selectUser = async (user) => {
      if (!user?.id) {
        return
      }
      selectedUserId.value = `${user.id}`
      await loadUserPermissions(user.id)
    }

    const toggleAppPermission = (featureCode) => {
      const nextSet = new Set(selectedFeatureCodes.value)
      if (nextSet.has(featureCode)) {
        nextSet.delete(featureCode)
      } else {
        nextSet.add(featureCode)
      }
      selectedFeatureCodes.value = Array.from(nextSet)
    }

    const toggleAllApps = (checked) => {
      selectedFeatureCodes.value = checked ? appCatalog.value.map((item) => item.featureCode) : []
    }

    const grantBySecurityLevel = (level) => {
      selectedFeatureCodes.value = appCatalog.value
        .filter((item) => item.securityLevel === level)
        .map((item) => item.featureCode)
    }

    const savePermissions = async () => {
      if (!selectedUserId.value) {
        return
      }

      const payload = {
        grantedFeatureCodes: selectedFeatureCodes.value,
        grantedAppCodes: selectedFeatureCodes.value,
        remark: '由权限管理页提交'
      }

      saving.value = true
      try {
        await saveUserAppPermissions(selectedUserId.value, payload)
        saveDraftFeatureCodesForUser(selectedUserId.value, selectedFeatureCodes.value)
        permissionSource.value = 'backend'
        users.value = users.value.map((item) => (
          `${item.id}` === `${selectedUserId.value}`
            ? {...item, permissionCount: selectedFeatureCodes.value.length}
            : item
        ))
        alert('授权已保存')
      } catch (error) {
        saveDraftFeatureCodesForUser(selectedUserId.value, selectedFeatureCodes.value)
        users.value = users.value.map((item) => (
          `${item.id}` === `${selectedUserId.value}`
            ? {...item, permissionCount: selectedFeatureCodes.value.length}
            : item
        ))
        permissionSource.value = 'draft'
        alert(extractErrorMessage(error, '后端接口暂未接通，已保存到本地草稿'))
      } finally {
        saving.value = false
      }
    }

    const searchUsers = () => {
      pagination.pageNo = 1
      loadUsers()
    }

    const resetFilters = () => {
      filters.keyword = ''
      filters.status = ''
      filters.roleCode = ''
      pagination.pageNo = 1
      loadUsers()
    }

    const changePage = (offset) => {
      const nextPage = pagination.pageNo + offset
      if (nextPage < 1 || nextPage > totalPages.value) {
        return
      }
      pagination.pageNo = nextPage
      loadUsers()
    }

    const changePageSize = () => {
      pagination.pageNo = 1
      loadUsers()
    }

    const goBackHome = () => {
      router.push('/home')
    }

    onMounted(async () => {
      await loadAppCatalog()
      await loadUsers()
    })

    return {
      userLoading,
      permissionLoading,
      saving,
      users,
      appCatalog,
      selectedUserId,
      selectedUser,
      selectedGrantedApps,
      selectedFeatureCodes,
      grantedCount,
      confidentialGrantedCount,
      permissionSourceLabel,
      reservedCapabilities,
      filters,
      pagination,
      pageSizeOptions,
      totalPages,
      buildShortText,
      formatRoleText,
      formatSecurityLevel,
      formatEncryptionMode,
      isGranted,
      searchUsers,
      resetFilters,
      changePage,
      changePageSize,
      selectUser,
      toggleAppPermission,
      toggleAllApps,
      grantBySecurityLevel,
      savePermissions,
      goBackHome
    }
  }
}
</script>

<style scoped>
.permission-page {
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
.filter-panel,
.user-panel,
.grant-panel,
.insight-panel {
  border-radius: 18px;
  padding: 16px 18px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: linear-gradient(135deg, rgba(7, 22, 39, 0.84), rgba(18, 49, 72, 0.76));
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(16px);
}

.hero-panel,
.filter-panel {
  margin-bottom: 14px;
}

.hero-panel,
.panel-head,
.filter-actions,
.pager,
.insight-head,
.selected-user-bar,
.app-card-head,
.reserve-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hero-panel,
.panel-head,
.pager,
.selected-user-bar,
.app-card-head,
.reserve-head {
  justify-content: space-between;
}

.page-title,
.panel-title,
.insight-title,
.user-name,
.selected-user-name {
  margin: 0;
}

.page-title {
  font-size: 28px;
}

.page-subtitle,
.panel-tip,
.user-subtitle,
.selected-user-tip,
.subtle-empty,
.app-desc,
.reserve-card p {
  margin: 6px 0 0;
  color: rgba(255, 255, 255, 0.74);
}

.hero-tags,
.grant-actions,
.selected-summary,
.app-tags,
.granted-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.hero-tag,
.summary-chip,
.tag,
.granted-chip,
.status-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
}

.hero-tag,
.summary-chip,
.granted-chip {
  background: rgba(91, 180, 255, 0.18);
  color: #d7f0ff;
}

.filter-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field span,
.app-head-main span,
.app-foot span,
.summary-card span,
.reserve-head span,
.user-meta span {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.72);
}

.permission-layout {
  display: grid;
  grid-template-columns: minmax(260px, 0.88fr) minmax(0, 1.65fr) minmax(280px, 0.9fr);
  gap: 14px;
}

.input,
.pager-select {
  width: 100%;
  min-height: 40px;
  padding: 9px 12px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  outline: none;
}

.pager-select {
  width: auto;
  min-height: 32px;
  padding: 0 8px;
  border-radius: 8px;
}

.pager-select option {
  color: #222;
}

.action-btn,
.ghost-btn {
  min-height: 38px;
  padding: 0 14px;
  border: none;
  border-radius: 10px;
  color: #fff;
  cursor: pointer;
}

.action-btn {
  background: linear-gradient(135deg, #1996ff, #27d5a4);
}

.ghost-btn {
  background: rgba(255, 255, 255, 0.12);
}

.empty-state {
  min-height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: rgba(255, 255, 255, 0.68);
}

.grant-empty {
  min-height: 420px;
}

.user-list,
.reserve-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.user-card {
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  padding: 14px;
  color: #fff;
  cursor: pointer;
  text-align: left;
  background: rgba(255, 255, 255, 0.08);
}

.user-card.active {
  border-color: rgba(76, 201, 240, 0.55);
  box-shadow: 0 0 0 1px rgba(76, 201, 240, 0.28);
  background: linear-gradient(135deg, rgba(51, 137, 255, 0.18), rgba(39, 213, 164, 0.14));
}

.user-main,
.user-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.user-meta {
  margin-top: 10px;
}

.status-chip.enabled {
  background: rgba(34, 197, 94, 0.24);
  color: #bbf7d0;
}

.status-chip.disabled {
  background: rgba(239, 68, 68, 0.22);
  color: #fecaca;
}

.selected-user-bar {
  margin: 14px 0;
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.08);
}

.app-grid,
.summary-grid {
  display: grid;
  gap: 12px;
}

.app-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.app-card,
.summary-card,
.reserve-card,
.note-box {
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.08);
}

.app-card {
  padding: 16px;
}

.app-card.granted {
  border-color: rgba(34, 197, 94, 0.32);
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.14), rgba(255, 255, 255, 0.08));
}

.app-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  background: linear-gradient(135deg, #1d4ed8, #0ea5e9);
}

.app-head-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.grant-switch {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.grant-switch input {
  width: 16px;
  height: 16px;
}

.tag {
  background: rgba(255, 255, 255, 0.1);
}

.tag.security {
  background: rgba(251, 191, 36, 0.16);
  color: #fde68a;
}

.app-foot {
  margin-top: 14px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.summary-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.summary-card {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary-card strong {
  font-size: 22px;
}

.insight-block {
  margin-top: 16px;
}

.reserve-card,
.note-box {
  padding: 14px;
}

.note-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.note-box p {
  margin: 0;
  color: rgba(255, 255, 255, 0.8);
}

@media (max-width: 1200px) {
  .permission-layout {
    grid-template-columns: 1fr;
  }

  .app-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 840px) {
  .filter-panel {
    grid-template-columns: 1fr;
  }

  .filter-grid,
  .summary-grid,
  .app-grid {
    grid-template-columns: 1fr;
  }

  .panel-head,
  .selected-user-bar {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
