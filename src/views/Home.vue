<template>
  <div class="home-page">
    <aside class="side-menu" :class="{ collapsed: menuCollapsed }">
      <div class="menu-head">
        <span v-if="!menuCollapsed" class="menu-title">系统菜单</span>
        <button class="collapse-btn" @click="toggleMenu">
          <svg
            v-if="isMobileViewport && menuCollapsed"
            class="settings-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.03 7.03 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.8a.5.5 0 0 0-.49.42l-.36 2.54c-.58.22-1.13.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.48a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.31.6.22l2.39-.96c.5.4 1.05.72 1.63.94l.36 2.54c.04.24.25.42.49.42h3.8c.24 0 .45-.18.49-.42l.36-2.54c.58-.22 1.13-.54 1.63-.94l2.39.96c.22.09.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z"
              fill="currentColor"
            />
          </svg>
          <template v-else>
            {{ menuCollapsed ? '>' : '<' }}
          </template>
        </button>
      </div>

      <nav class="menu-list">
        <button
          v-for="item in systemMenus"
          :key="item.key"
          class="menu-item"
          :title="item.name"
          @click="onSystemMenuClick(item)"
        >
          <span class="menu-icon">{{ item.shortName }}</span>
          <span v-if="!menuCollapsed" class="menu-label">{{ item.name }}</span>
        </button>
      </nav>
    </aside>

    <main class="main-area">
      <div class="top-bar">
        <button class="star-back-btn" @click="goToStarInteractive">返回星空互动图</button>

        <div class="top-right-wrap">
          <div class="welcome-wrap">
            <span class="welcome-label">欢迎，</span>
            <button class="user-name-btn" @click="openUserDialog()">
              {{ user.displayName || user.username || '用户' }}
            </button>
          </div>

          <span class="current-date">{{ currentDateText }}</span>
          <button class="logout-btn" @click="logout">退出</button>
        </div>
      </div>

      <section class="main-panel">
        <div class="panel-head">
          <div>
            <h1 class="home-title">侏儒军刀</h1>
            <p class="home-subtitle">{{ permissionHintText }}</p>
          </div>
          <span class="app-count">{{ appPermissionStatusText }}</span>
        </div>

        <div v-if="appPermissionLoading" class="home-state">
          正在读取当前账号的应用权限...
        </div>
        <div v-else-if="tools.length" class="grid">
          <button
            v-for="tool in tools"
            :key="tool.key"
            class="tool-item"
            :class="{
              dragging: draggingToolKey === tool.key,
              'drag-over': dragOverToolKey === tool.key && draggingToolKey !== tool.key
            }"
            type="button"
            draggable="true"
            @dragstart="handleToolDragStart(tool, $event)"
            @dragenter.prevent="handleToolDragEnter(tool)"
            @dragover.prevent
            @drop.prevent="handleToolDrop(tool)"
            @dragend="handleToolDragEnd"
            @click="openTool(tool)"
          >
            <div class="tool-top">
              <div class="icon-box" :style="tool.iconStyle">
                <img v-if="usesImageIcon(tool.iconType) && tool.iconUrl" class="icon-image" :src="tool.iconUrl" :alt="tool.name"/>
                <span v-else-if="tool.iconType === 'PRESET'" class="icon-svg" v-html="getPresetIconSvg(tool.iconPreset)"></span>
                <span v-else class="icon-text">{{ tool.iconText }}</span>
              </div>
            </div>

            <div class="tool-content">
              <p class="tool-name">{{ tool.name }}</p>
            </div>
          </button>
        </div>
        <div v-else class="home-state">
          当前账号暂无可见应用，请先在权限管理中完成授权。
        </div>
      </section>
    </main>

    <div v-if="showUserDialog" class="dialog-mask" @click.self="closeUserDialog">
      <div class="user-dialog">
        <div class="dialog-head">
          <h3 class="dialog-title">个人中心</h3>
          <button class="dialog-close" @click="closeUserDialog">x</button>
        </div>

        <div class="tab-row">
          <button
            class="tab-btn"
            :class="{ active: activeDialogTab === 'profile' }"
            @click="switchDialogTab('profile')"
          >
            个人信息
          </button>
          <button
            class="tab-btn"
            :class="{ active: activeDialogTab === 'password' }"
            @click="switchDialogTab('password')"
          >
            修改密码
          </button>
        </div>

        <form
          v-if="activeDialogTab === 'profile'"
          class="dialog-form"
          @submit.prevent="submitProfile"
        >
          <label class="form-item">
            <span>用户名</span>
            <input v-model="profileForm.username" disabled/>
          </label>
          <label class="form-item">
            <span>昵称</span>
            <input v-model.trim="profileForm.displayName" maxlength="32"/>
          </label>
          <label class="form-item">
            <span>手机号</span>
            <input v-model.trim="profileForm.phone" maxlength="20"/>
          </label>
          <label class="form-item">
            <span>邮箱</span>
            <input v-model.trim="profileForm.email" type="email" maxlength="64"/>
          </label>

          <div class="dialog-actions">
            <button type="button" class="ghost-btn" :disabled="dialogLoading" @click="closeUserDialog">取消</button>
            <button type="submit" class="action-btn" :disabled="dialogLoading">
              {{ dialogLoading ? '保存中...' : '保存信息' }}
            </button>
          </div>
        </form>

        <form
          v-else
          class="dialog-form"
          @submit.prevent="submitPassword"
        >
          <label class="form-item">
            <span>当前密码</span>
            <input
              v-model="passwordForm.oldPassword"
              type="password"
              required
              minlength="6"
              maxlength="64"
              autocomplete="current-password"
            />
          </label>
          <label class="form-item">
            <span>新密码</span>
            <input
              v-model="passwordForm.newPassword"
              type="password"
              required
              minlength="6"
              maxlength="64"
              autocomplete="new-password"
            />
          </label>
          <label class="form-item">
            <span>确认新密码</span>
            <input
              v-model="passwordForm.confirmPassword"
              type="password"
              required
              minlength="6"
              maxlength="64"
              autocomplete="new-password"
            />
          </label>

          <div class="dialog-actions">
            <button type="button" class="ghost-btn" :disabled="dialogLoading" @click="closeUserDialog">取消</button>
            <button type="submit" class="action-btn" :disabled="dialogLoading">
              {{ dialogLoading ? '提交中...' : '修改密码' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import {computed, onBeforeUnmount, onMounted, reactive, ref} from 'vue'
import {useRouter} from 'vue-router'
import {changePasswordApi, getPasswordPublicKeyApi} from '@/api/auth'
import {getCurrentUserAccessibleApps} from '@/api/permission'
import {getPresetIconSvg} from '@/constants/appIconLibrary'
import {listSystemUsers, updateSystemUser} from '@/api/systemUser'
import {mergeAppCatalogList, normalizeSystemApp, resolveAppCatalogList} from '@/utils/appCatalogDraft'
import {encryptPasswordByPublicKey} from '@/utils/rsaEncrypt'
import {readPermissionDraftMap} from '@/utils/permissionDraft'

const WEEK_LABELS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
const APP_COLOR_PALETTE = [
  ['#0f766e', '#2563eb'],
  ['#7c3aed', '#ec4899'],
  ['#b45309', '#f97316'],
  ['#047857', '#22c55e'],
  ['#1d4ed8', '#38bdf8'],
  ['#be123c', '#f43f5e'],
  ['#4338ca', '#8b5cf6'],
  ['#0f766e', '#14b8a6'],
  ['#9a3412', '#fb7185'],
  ['#1f2937', '#4b5563'],
  ['#854d0e', '#eab308']
]
const TOOL_USAGE_STORAGE_KEY = 'home_tool_usage_map'
const TOOL_CUSTOM_ORDER_STORAGE_KEY = 'home_tool_custom_order'

function unwrapData(res) {
  const payload = res?.data
  if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data
  }
  return payload
}

function normalizeCurrentUser(source = {}) {
  return {
    ...source,
    id: source.id ?? source.userId ?? source.uid ?? null,
    username: source.username || source.userName || '',
    displayName: source.displayName || source.nickname || source.nickName || source.name || '',
    phone: source.phone || source.mobile || source.mobilePhone || source.telephone || '',
    email: source.email || source.emailAddress || source.mail || ''
  }
}

function formatDateText(date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}年${month}月${day}日 ${WEEK_LABELS[date.getDay()]}`
}

function hashText(text) {
  return Array.from(text).reduce((total, char) => total + char.charCodeAt(0), 0)
}

function hexToRgba(hex, alpha) {
  const value = hex.replace('#', '')
  const normalized = value.length === 3
    ? value.split('').map((item) => item + item).join('')
    : value
  const red = parseInt(normalized.slice(0, 2), 16)
  const green = parseInt(normalized.slice(2, 4), 16)
  const blue = parseInt(normalized.slice(4, 6), 16)
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

function buildToolIconText(name) {
  const normalized = name.replace(/\s+/g, '')
  const chars = Array.from(normalized)
  return chars.slice(0, 2).join('')
}

function buildToolEntry(item, index) {
  const palette = APP_COLOR_PALETTE[hashText(item.name) % APP_COLOR_PALETTE.length]
  return {
    ...item,
    order: index + 1,
    iconText: buildToolIconText(item.name),
    iconStyle: {
      background: `linear-gradient(135deg, ${palette[0]}, ${palette[1]})`,
      boxShadow: `0 12px 24px ${hexToRgba(palette[0], 0.35)}`
    }
  }
}

function usesImageIcon(iconType) {
  return ['UPLOAD', 'URL'].includes(iconType)
}

function extractAccessibleFeatureCodes(payload) {
  if (!payload) {
    return []
  }
  if (Array.isArray(payload)) {
    return Array.from(new Set(payload
      .map((item) => (typeof item === 'string' ? item : item?.featureCode || item?.code || item?.appCode))
      .filter(Boolean)))
  }

  const rawCodes = payload.featureCodes || payload.grantedFeatureCodes || payload.appCodes || payload.grantedAppCodes
  if (Array.isArray(rawCodes)) {
    return Array.from(new Set(rawCodes.filter(Boolean)))
  }

  const rawApps = payload.apps || payload.list || payload.items || []
  if (Array.isArray(rawApps)) {
    return Array.from(new Set(rawApps.map((item) => item?.featureCode || item?.code || item?.appCode).filter(Boolean)))
  }

  return []
}

function extractAccessibleApps(payload) {
  if (!payload) {
    return []
  }
  if (Array.isArray(payload)) {
    return payload
      .filter((item) => item && typeof item === 'object')
      .map((item, index) => normalizeSystemApp(item, index))
      .filter((item) => item.featureCode)
  }

  const rawApps = payload.apps || payload.list || payload.items || []
  if (Array.isArray(rawApps)) {
    return rawApps
      .map((item, index) => normalizeSystemApp(item, index))
      .filter((item) => item.featureCode)
  }
  return []
}

function extractErrorMessage(error, fallback) {
  const data = error?.response?.data || {}
  return data.message || data.msg || fallback
}

// 使用频率和自定义顺序都走本地持久化，保证桌面排序在刷新后仍然生效。
function readUsageMap() {
  try {
    const raw = localStorage.getItem(TOOL_USAGE_STORAGE_KEY)
    const parsed = JSON.parse(raw || '{}')
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch (error) {
    return {}
  }
}

function persistUsageMap(map) {
  localStorage.setItem(TOOL_USAGE_STORAGE_KEY, JSON.stringify(map))
}

function readCustomOrder() {
  try {
    const raw = localStorage.getItem(TOOL_CUSTOM_ORDER_STORAGE_KEY)
    const parsed = JSON.parse(raw || '[]')
    return Array.isArray(parsed)
      ? Array.from(new Set(parsed.filter((item) => typeof item === 'string' && item.trim())))
      : []
  } catch (error) {
    return []
  }
}

function persistCustomOrder(order) {
  localStorage.setItem(TOOL_CUSTOM_ORDER_STORAGE_KEY, JSON.stringify(order))
}

export default {
  setup() {
    const router = useRouter()
    const user = ref(normalizeCurrentUser(JSON.parse(localStorage.getItem('user') || '{}')))
    const menuCollapsed = ref(true)
    const currentTime = ref(new Date())
    const isMobileViewport = ref(window.innerWidth <= 640)

    const showUserDialog = ref(false)
    const activeDialogTab = ref('profile')
    const dialogLoading = ref(false)
    const appPermissionLoading = ref(false)
    const accessibleFeatureCodes = ref(null)
    const appPermissionSource = ref('catalog')
    const toolCatalog = ref(resolveAppCatalogList())
    const toolUsageMap = ref(readUsageMap())
    const customToolOrder = ref(readCustomOrder())
    const draggingToolKey = ref('')
    const dragOverToolKey = ref('')
    const suppressNextToolOpen = ref(false)

    // 顶部个人中心的资料与密码修改共用一个弹框，按 tab 切换表单。
    const profileForm = reactive({
      username: '',
      displayName: '',
      phone: '',
      email: ''
    })

    const passwordForm = reactive({
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    })

    let timer = null

    const syncViewport = () => {
      isMobileViewport.value = window.innerWidth <= 640
    }

    const currentDateText = computed(() => formatDateText(currentTime.value))
    const appPermissionStatusText = computed(() => {
      if (appPermissionLoading.value) {
        return '权限加载中'
      }
      if (appPermissionSource.value === 'backend') {
        return `已授权 ${tools.value.length} 个应用`
      }
      if (appPermissionSource.value === 'draft') {
        return `草稿权限 ${tools.value.length} 个应用`
      }
      return `应用总数 ${tools.value.length}`
    })
    const permissionHintText = computed(() => {
      if (appPermissionSource.value === 'backend') {
        return '主页已优先按当前用户授权显示应用入口，桌面排序仍支持使用频率与拖拽自定义。'
      }
      if (appPermissionSource.value === 'draft') {
        return '主页当前按本地权限草稿显示应用入口，待后端接口接通后将自动切换为真实授权。'
      }
      return '主页会优先读取当前用户应用权限；在权限接口未接通前，默认展示应用目录并支持桌面排序。'
    })

    const systemMenus = [
      {key: 'user', name: '用户管理', shortName: '用'},
      {key: 'app', name: '应用管理', shortName: '应'},
      {key: 'permission', name: '权限管理', shortName: '权'},
      {key: 'dict', name: '数据字典', shortName: '字'},
      {key: 'log', name: '系统日志', shortName: '志'}
    ]

    // 默认按使用频率排序；一旦用户拖拽过桌面，就优先采用自定义顺序。
    const tools = computed(() => {
      const baseDefinitions = Array.isArray(accessibleFeatureCodes.value)
        ? toolCatalog.value.filter((item) => accessibleFeatureCodes.value.includes(item.featureCode))
        : toolCatalog.value
      const nextTools = baseDefinitions.map((item, index) => buildToolEntry({
        ...item,
        usageCount: Number(toolUsageMap.value[item.key] ?? item.usageCount ?? 0)
      }, index))

      if (!customToolOrder.value.length) {
        return nextTools.sort((prev, next) => next.usageCount - prev.usageCount || prev.order - next.order)
      }

      const orderMap = new Map(customToolOrder.value.map((item, index) => [item, index]))
      return nextTools.sort((prev, next) => {
        const prevOrder = orderMap.has(prev.key) ? orderMap.get(prev.key) : Number.MAX_SAFE_INTEGER
        const nextOrder = orderMap.has(next.key) ? orderMap.get(next.key) : Number.MAX_SAFE_INTEGER
        return prevOrder - nextOrder || next.usageCount - prev.usageCount || prev.order - next.order
      })
    })

    const incrementToolUsage = (toolKey) => {
      toolUsageMap.value = {
        ...toolUsageMap.value,
        [toolKey]: Number(toolUsageMap.value[toolKey] || 0) + 1
      }
      persistUsageMap(toolUsageMap.value)
    }

    const syncProfileForm = () => {
      const currentUser = normalizeCurrentUser(user.value || {})
      profileForm.username = currentUser.username || ''
      profileForm.displayName = currentUser.displayName || ''
      profileForm.phone = currentUser.phone || ''
      profileForm.email = currentUser.email || ''
    }

    const resetPasswordForm = () => {
      passwordForm.oldPassword = ''
      passwordForm.newPassword = ''
      passwordForm.confirmPassword = ''
    }

    const persistUser = (nextUserPatch) => {
      user.value = normalizeCurrentUser({
        ...(user.value || {}),
        ...nextUserPatch
      })
      localStorage.setItem('user', JSON.stringify(user.value))
    }

    const loadCurrentUserProfile = async () => {
      const currentUser = normalizeCurrentUser(user.value || {})
      if (!currentUser.username && !currentUser.id) {
        return
      }

      const res = await listSystemUsers({
        pageNo: 1,
        pageSize: 100,
        keyword: currentUser.username || ''
      })
      const payload = unwrapData(res) || {}
      const rawList = payload.list || payload.records || payload.rows || payload.items || []
      const list = Array.isArray(rawList) ? rawList.map((item) => normalizeCurrentUser(item)) : []
      const profile = list.find((item) => {
        if (currentUser.id !== null && currentUser.id !== undefined) {
          return `${item.id}` === `${currentUser.id}`
        }
        return item.username === currentUser.username
      }) || {}

      if (!profile.username && !profile.displayName && !profile.phone && !profile.email) {
        return
      }
      persistUser(profile)
      syncProfileForm()
    }

    const loadCurrentUserAccessibleApps = async () => {
      appPermissionLoading.value = true
      try {
        const res = await getCurrentUserAccessibleApps()
        const payload = unwrapData(res)
        accessibleFeatureCodes.value = extractAccessibleFeatureCodes(payload)
        const accessibleApps = extractAccessibleApps(payload)
        toolCatalog.value = accessibleApps.length
          ? mergeAppCatalogList(resolveAppCatalogList(), accessibleApps)
          : resolveAppCatalogList()
        appPermissionSource.value = 'backend'
      } catch (error) {
        const currentUser = normalizeCurrentUser(user.value || {})
        const draftMap = readPermissionDraftMap()
        const draftUserId = currentUser.id !== null && currentUser.id !== undefined ? `${currentUser.id}` : ''
        if (draftUserId && Object.prototype.hasOwnProperty.call(draftMap, draftUserId)) {
          accessibleFeatureCodes.value = draftMap[draftUserId]
          appPermissionSource.value = 'draft'
        } else {
          accessibleFeatureCodes.value = null
          appPermissionSource.value = 'catalog'
        }
        toolCatalog.value = resolveAppCatalogList()
      } finally {
        appPermissionLoading.value = false
      }
    }

    const logout = () => {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      sessionStorage.removeItem('currentUserPlainPassword')
      router.push('/login')
    }

    const goToStarInteractive = () => {
      router.push('/star-interactive')
    }

    const toggleMenu = () => {
      menuCollapsed.value = !menuCollapsed.value
    }

    const onSystemMenuClick = (menu) => {
      if (menu.key === 'user') {
        router.push('/system/users')
        return
      }
      if (menu.key === 'app') {
        router.push('/system/apps')
        return
      }
      if (menu.key === 'permission') {
        router.push('/system/permissions')
        return
      }
      if (menu.key === 'dict') {
        router.push('/system/dictionaries')
        return
      }
      alert(`菜单【${menu.name}】待接入具体功能`)
    }

    const openTool = (tool) => {
      if (suppressNextToolOpen.value) {
        suppressNextToolOpen.value = false
        return
      }
      incrementToolUsage(tool.key)
      if (tool.route) {
        router.push(tool.route)
        return
      }
      alert(`应用【${tool.name}】已登记，后续在权限管理中维护权限和接入能力`)
    }

    // 拖拽排序只调整展示顺序，不直接修改使用频率，避免两个规则互相污染。
    const handleToolDragStart = (tool, event) => {
      draggingToolKey.value = tool.key
      dragOverToolKey.value = tool.key
      if (event?.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', tool.key)
      }
    }

    const handleToolDragEnter = (tool) => {
      if (!draggingToolKey.value || draggingToolKey.value === tool.key) {
        return
      }
      dragOverToolKey.value = tool.key
    }

    const handleToolDrop = (tool) => {
      const fromKey = draggingToolKey.value
      const toKey = tool.key
      if (!fromKey || fromKey === toKey) {
        handleToolDragEnd()
        return
      }

      const currentOrder = tools.value.map((item) => item.key)
      const fromIndex = currentOrder.indexOf(fromKey)
      const toIndex = currentOrder.indexOf(toKey)
      if (fromIndex === -1 || toIndex === -1) {
        handleToolDragEnd()
        return
      }

      const nextOrder = [...currentOrder]
      nextOrder.splice(fromIndex, 1)
      nextOrder.splice(toIndex, 0, fromKey)
      customToolOrder.value = nextOrder
      persistCustomOrder(nextOrder)
      suppressNextToolOpen.value = true
      handleToolDragEnd()
    }

    const handleToolDragEnd = () => {
      draggingToolKey.value = ''
      dragOverToolKey.value = ''
    }

    const openUserDialog = async (tab = 'profile') => {
      activeDialogTab.value = tab
      syncProfileForm()
      resetPasswordForm()
      showUserDialog.value = true
      if (tab !== 'profile') {
        return
      }

      dialogLoading.value = true
      try {
        await loadCurrentUserProfile()
      } catch (error) {
        console.warn('加载当前用户资料失败，继续使用本地缓存数据', error)
      } finally {
        dialogLoading.value = false
      }
    }

    const closeUserDialog = () => {
      if (dialogLoading.value) {
        return
      }
      showUserDialog.value = false
    }

    const switchDialogTab = (tab) => {
      if (dialogLoading.value) {
        return
      }
      activeDialogTab.value = tab
    }

    const submitProfile = async () => {
      dialogLoading.value = true
      try {
        const currentUser = normalizeCurrentUser(user.value || {})
        if (currentUser.id === null || currentUser.id === undefined) {
          throw new Error('当前用户ID缺失，无法更新个人信息')
        }

        const payload = {
          username: profileForm.username,
          displayName: profileForm.displayName,
          phone: profileForm.phone,
          email: profileForm.email,
          roleCode: currentUser.roleCode || 'USER',
          status: currentUser.status || 'ENABLED',
          enabled: typeof currentUser.enabled === 'boolean'
            ? currentUser.enabled
            : (currentUser.status || 'ENABLED') === 'ENABLED',
          remark: currentUser.remark || ''
        }

        const res = await updateSystemUser(currentUser.id, payload)
        const savedUser = normalizeCurrentUser(unwrapData(res) || {})
        persistUser({
          ...savedUser,
          displayName: savedUser.displayName || profileForm.displayName,
          phone: savedUser.phone || profileForm.phone,
          email: savedUser.email || profileForm.email
        })
        alert('个人信息已更新')
        showUserDialog.value = false
      } catch (error) {
        console.error(error)
        alert(extractErrorMessage(error, '更新失败，请稍后重试'))
      } finally {
        dialogLoading.value = false
      }
    }

    const submitPassword = async () => {
      if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
        alert('请完整填写密码信息')
        return
      }

      if (passwordForm.newPassword.length < 6) {
        alert('新密码长度不能少于 6 位')
        return
      }

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        alert('两次输入的新密码不一致')
        return
      }

      if (passwordForm.oldPassword === passwordForm.newPassword) {
        alert('新密码不能与当前密码相同')
        return
      }

      dialogLoading.value = true
      try {
        const currentUser = normalizeCurrentUser(user.value || {})
        const username = currentUser.username || profileForm.username

        const keyRes = await getPasswordPublicKeyApi()
        const publicKey = (unwrapData(keyRes) || {}).publicKey || ''
        if (!publicKey) {
          throw new Error('公钥未就绪，请稍后重试')
        }
        const oldEncryptedPassword = encryptPasswordByPublicKey(passwordForm.oldPassword, publicKey)
        const newEncryptedPassword = encryptPasswordByPublicKey(passwordForm.newPassword, publicKey)

        if (!username) {
          throw new Error('当前用户名缺失，无法修改密码')
        }

        await changePasswordApi({
          username,
          oldEncryptedPassword,
          newEncryptedPassword
        })

        alert('密码修改成功，请重新登录')
        logout()
      } catch (error) {
        console.error(error)
        alert(extractErrorMessage(error, '密码修改失败，请稍后重试'))
      } finally {
        dialogLoading.value = false
      }
    }

    onMounted(() => {
      timer = setInterval(() => {
        currentTime.value = new Date()
      }, 60 * 1000)
      window.addEventListener('resize', syncViewport)
      loadCurrentUserAccessibleApps()
    })

    onBeforeUnmount(() => {
      if (timer) {
        clearInterval(timer)
      }
      window.removeEventListener('resize', syncViewport)
    })

    return {
      user,
      isMobileViewport,
      menuCollapsed,
      currentDateText,
      appPermissionLoading,
      appPermissionStatusText,
      permissionHintText,
      getPresetIconSvg,
      systemMenus,
      tools,
      usesImageIcon,
      draggingToolKey,
      dragOverToolKey,
      showUserDialog,
      activeDialogTab,
      dialogLoading,
      profileForm,
      passwordForm,
      logout,
      goToStarInteractive,
      toggleMenu,
      onSystemMenuClick,
      openTool,
      handleToolDragStart,
      handleToolDragEnter,
      handleToolDrop,
      handleToolDragEnd,
      openUserDialog,
      closeUserDialog,
      switchDialogTab,
      submitProfile,
      submitPassword
    }
  }
}
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  height: 100%;
  display: flex;
  color: #fff;
  overflow: hidden;
}

.side-menu {
  width: 220px;
  padding: 14px 10px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: rgba(10, 26, 48, 0.6);
  border-right: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(12px);
  transition: width 0.3s ease;
}

.side-menu.collapsed {
  width: 72px;
}

.menu-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 36px;
}

.menu-title {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 1px;
}

.collapse-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: #fff;
  background: rgba(255, 255, 255, 0.2);
}

.settings-icon {
  width: 18px;
  height: 18px;
  display: block;
}

.menu-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.menu-item {
  border: none;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 40px;
  padding: 8px 10px;
  border-radius: 10px;
  color: #fff;
  text-align: left;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.12);
}

.menu-item:hover {
  background: rgba(255, 255, 255, 0.22);
}

.menu-icon {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.24);
}

.menu-label {
  font-size: 14px;
}

.main-area {
  flex: 1;
  min-width: 0;
  padding: 20px 28px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow: auto;
}

.top-bar {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  color: #fff;
  font-size: 14px;
}

.top-right-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 16px;
}

.star-back-btn {
  border: none;
  height: 34px;
  padding: 0 12px;
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
  font-size: 13px;
  background: rgba(82, 164, 255, 0.6);
}

.star-back-btn:hover {
  background: rgba(82, 164, 255, 0.78);
}

.welcome-wrap {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.welcome-label {
  font-weight: 500;
}

.user-name-btn {
  border: none;
  padding: 4px 8px;
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.18);
}

.user-name-btn:hover {
  background: rgba(255, 255, 255, 0.28);
}

.current-date {
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.16);
}

.logout-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(6px);
}

.main-panel {
  flex: 1;
  padding: 20px 22px 22px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.28);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(18px);
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 18px;
}

.home-title {
  font-size: 26px;
  margin: 0;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
}

.home-subtitle {
  margin: 8px 0 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.78);
}

.app-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.88);
  background: rgba(255, 255, 255, 0.14);
}

.home-state {
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 18px;
  color: rgba(255, 255, 255, 0.82);
  background: rgba(255, 255, 255, 0.08);
  border: 1px dashed rgba(255, 255, 255, 0.18);
}

.grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}

.tool-item {
  appearance: none;
  border: 1px solid rgba(255, 255, 255, 0.16);
  padding: 14px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 14px;
  cursor: pointer;
  color: #fff;
  text-align: left;
  background:
    linear-gradient(160deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.08));
  transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}

.tool-item:hover {
  transform: translateY(-3px);
  border-color: rgba(255, 255, 255, 0.28);
  background:
    linear-gradient(160deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1));
}

.tool-item.dragging {
  opacity: 0.6;
  transform: scale(0.98);
}

.tool-item.drag-over {
  border-color: rgba(96, 204, 255, 0.72);
  box-shadow: 0 0 0 2px rgba(96, 204, 255, 0.26);
  background:
    linear-gradient(160deg, rgba(96, 204, 255, 0.18), rgba(255, 255, 255, 0.08));
}

.tool-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.icon-box {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

.icon-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.icon-svg :deep(svg) {
  width: 28px;
  height: 28px;
}

.icon-text {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #fff;
}

.tool-content {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.tool-name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.38);
}

.user-dialog {
  width: 100%;
  max-width: 440px;
  max-height: calc(100vh - 32px);
  overflow: auto;
  border-radius: 14px;
  padding: 16px 16px 14px;
  color: #fff;
  background: rgba(13, 30, 52, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(16px);
}

.dialog-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.dialog-title {
  margin: 0;
  font-size: 18px;
}

.dialog-close {
  border: none;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  cursor: pointer;
  color: #fff;
  background: rgba(255, 255, 255, 0.2);
}

.tab-row {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.tab-btn {
  border: none;
  flex: 1;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  color: #fff;
  background: rgba(255, 255, 255, 0.16);
}

.tab-btn.active {
  background: rgba(89, 173, 255, 0.58);
}

.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
}

.form-item input {
  height: 36px;
  border: none;
  border-radius: 8px;
  padding: 0 10px;
  color: #fff;
  background: rgba(255, 255, 255, 0.2);
}

.form-item input:disabled {
  color: rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.14);
}

.form-item input::placeholder {
  color: rgba(255, 255, 255, 0.7);
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
  flex-wrap: wrap;
}

.ghost-btn,
.action-btn {
  border: none;
  min-width: 82px;
  height: 34px;
  border-radius: 8px;
  cursor: pointer;
  color: #fff;
}

.ghost-btn {
  background: rgba(255, 255, 255, 0.18);
}

.action-btn {
  background: rgba(72, 160, 255, 0.75);
}

@media (max-width: 900px) {
  .main-area {
    padding: 14px;
  }

  .top-bar {
    align-items: stretch;
  }

  .star-back-btn {
    width: 100%;
  }

  .top-right-wrap {
    width: 100%;
    justify-content: space-between;
  }

  .grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }
}

@media (max-width: 640px) {
  .home-page {
    position: relative;
  }

  .side-menu {
    position: fixed;
    top: 12px;
    left: 12px;
    bottom: auto;
    z-index: 12;
    width: 60px;
    padding: 10px 8px;
    border-radius: 14px;
  }

  .side-menu.collapsed {
    width: 60px;
  }

  .side-menu:not(.collapsed) {
    width: 188px;
  }

  .side-menu.collapsed .menu-list {
    display: none;
  }

  .side-menu.collapsed .menu-head {
    justify-content: center;
  }

  .side-menu.collapsed .collapse-btn {
    width: 40px;
    height: 40px;
    border-radius: 999px;
    background: linear-gradient(135deg, rgba(74, 162, 255, 0.92), rgba(67, 201, 163, 0.92));
    box-shadow: 0 10px 24px rgba(30, 102, 196, 0.32);
  }

  .main-area {
    width: 100%;
    padding: 70px 12px 12px;
  }

  .panel-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .tool-item {
    min-height: 150px;
    padding: 12px;
  }

  .tool-top {
    align-items: center;
  }

  .icon-box {
    width: 56px;
    height: 56px;
    border-radius: 14px;
  }

  .icon-text {
    font-size: 18px;
  }

  .top-right-wrap,
  .filter-actions,
  .dialog-actions {
    width: 100%;
  }

  .current-date,
  .logout-btn,
  .user-name-btn {
    width: auto;
  }

  .user-dialog {
    padding: 14px 12px 12px;
  }

  .dialog-actions .ghost-btn,
  .dialog-actions .action-btn {
    flex: 1 1 calc(50% - 4px);
  }
}

@media (max-width: 420px) {
  .grid {
    grid-template-columns: 1fr;
  }

  .top-right-wrap {
    gap: 10px;
  }

  .welcome-wrap {
    width: 100%;
    justify-content: space-between;
  }

  .current-date,
  .logout-btn {
    width: 100%;
    text-align: center;
  }
}
</style>
