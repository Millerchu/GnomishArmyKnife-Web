<template>
  <div class="home-page">
    <main class="main-area">
      <div class="top-bar">
        <button
          class="easter-egg-trigger"
          type="button"
          aria-label="主页彩蛋入口"
          title="连续点击三次试试看"
          @click="handleEasterEggTrigger"
        >
          <span class="easter-egg-mark">侏</span>
        </button>

        <div class="top-right-wrap">
          <div class="welcome-wrap">
            <span class="welcome-label">欢迎，</span>
            <span class="user-name-text">
              {{ user.displayName || user.username || '用户' }}
            </span>
          </div>

          <span class="current-date">{{ currentDateText }}</span>

          <div ref="systemMenuRef" class="system-menu-box">
            <button
              class="system-menu-toggle"
              :class="{ active: showSystemMenu }"
              type="button"
              aria-label="系统菜单"
              @click.stop="toggleSystemMenu"
            >
              <svg class="gear-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.03 7.03 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.8a.5.5 0 0 0-.49.42l-.36 2.54c-.58.22-1.13.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.48a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.31.6.22l2.39-.96c.5.4 1.05.72 1.63.94l.36 2.54c.04.24.25.42.49.42h3.8c.24 0 .45-.18.49-.42l.36-2.54c.58-.22 1.13-.54 1.63-.94l2.39.96c.22.09.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z"
                  fill="currentColor"
                />
              </svg>
            </button>

            <div v-if="showSystemMenu" class="system-menu-dropdown">
              <div class="system-menu-header">
                <strong>{{ user.displayName || user.username || '当前用户' }}</strong>
                <span>系统菜单</span>
              </div>

              <button
                v-for="item in visibleSystemMenus"
                :key="item.key"
                type="button"
                class="system-dropdown-item"
                :class="{ danger: item.key === 'logout' }"
                @click="handleSystemMenuAction(item)"
              >
                <span class="menu-icon">{{ item.shortName }}</span>
                <span>{{ item.name }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <section class="main-panel">
        <div class="panel-head">
          <div>
            <h1 class="home-title">侏儒军刀</h1>
            <p class="home-subtitle">{{ permissionHintText }}</p>
          </div>
          <span class="app-count" :class="permissionBadgeClass">{{ appPermissionStatusText }}</span>
        </div>

        <div v-if="surfaceNotice.message" class="surface-notice" :class="surfaceNotice.type">
          <div>
            <strong>{{ surfaceNotice.title }}</strong>
            <p>{{ surfaceNotice.message }}</p>
          </div>
          <button type="button" class="notice-close" @click="clearSurfaceNotice">收起提示</button>
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
            :draggable="!isMobileViewport"
            @dragstart="handleToolDragStart(tool, $event)"
            @dragenter.prevent="handleToolDragEnter(tool)"
            @dragover.prevent
            @drop.prevent="handleToolDrop(tool)"
            @dragend="handleToolDragEnd"
            @click="openTool(tool)"
          >
            <div class="tool-layout">
              <div class="icon-box" :style="tool.iconStyle">
                <AppIconImage
                  v-if="usesImageIcon(tool.iconType) && tool.iconUrl"
                  :img-class="'icon-image'"
                  :src="tool.iconUrl"
                  :alt="tool.name"
                  :chroma-key="tool.iconChromaKey"
                />
                <span v-else-if="tool.iconType === 'PRESET'" class="icon-svg" v-html="getPresetIconSvg(tool.iconPreset)"></span>
                <span v-else class="icon-text">{{ tool.iconText }}</span>
              </div>

              <div class="tool-content">
                <p class="tool-name">{{ tool.name }}</p>
                <p class="tool-desc">{{ tool.description || '应用简介待补充' }}</p>
              </div>
            </div>
          </button>
        </div>
        <div v-else class="home-state">
          {{ appPermissionSource === 'unavailable'
            ? '应用权限接口当前不可用，请先恢复后端权限服务。'
            : '当前账号暂无可见应用，请先在权限管理中完成授权。' }}
        </div>
      </section>
    </main>

    <MacDialog
      v-model="logoutPending"
      title="确认退出当前账号？"
      subtitle="退出后会返回登录页，本地登录态会被清理。"
      width="440px"
      panel-class="home-logout-dialog"
      :close-disabled="false"
      @cancel="cancelLogoutRequest"
    >
      <p class="confirm-copy">请确认是否退出当前账号。</p>
      <template #footer>
          <button type="button" class="action-btn" @click="confirmLogout">确认退出</button>
      </template>
    </MacDialog>

    <MacDialog
      v-model="showUserDialog"
      title="个人中心"
      width="520px"
      panel-class="home-profile-dialog"
      :close-disabled="dialogLoading"
      @cancel="closeUserDialog"
    >
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
          id="home-profile-dialog-form"
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

        </form>

        <form
          v-else
          id="home-password-dialog-form"
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

        </form>
        <template #footer>
          <button
            v-if="activeDialogTab === 'profile'"
            form="home-profile-dialog-form"
            type="submit"
            class="action-btn"
            :disabled="dialogLoading"
          >
            {{ dialogLoading ? '保存中...' : '保存信息' }}
          </button>
          <button
            v-else
            form="home-password-dialog-form"
            type="submit"
            class="action-btn"
            :disabled="dialogLoading"
          >
            {{ dialogLoading ? '提交中...' : '修改密码' }}
          </button>
        </template>
    </MacDialog>
  </div>
</template>

<script>
import {computed, onBeforeUnmount, onMounted, reactive, ref} from 'vue'
import {useRouter} from 'vue-router'
import {changePasswordApi, getPasswordPublicKeyApi} from '@/api/auth'
import AppIconImage from '@/components/AppIconImage.vue'
import MacDialog from '@/components/MacDialog.vue'
import {getCurrentUserAccessibleApps} from '@/api/permission'
import {getPresetIconSvg} from '@/constants/appIconLibrary'
import {listSystemUsers, updateSystemUser} from '@/api/systemUser'
import {buildDefaultAppCatalog, mergeAppCatalogList, normalizeSystemApp} from '@/utils/appCatalogDraft'
import {clearAuthState, readAuthState, writeAuthState} from '@/utils/authStorage'
import {sortHomeTools} from '@/utils/homeToolOrder'
import {resolvePermissionViewState} from '@/utils/permissionAccess'
import {encryptPasswordByPublicKey} from '@/utils/rsaEncrypt'

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
    roleCode: `${source.roleCode || source.role || 'USER'}`.toUpperCase(),
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

function isSystemMenuOnlyRoute(route = '') {
  const normalized = `${route || ''}`.trim().toLowerCase()
  if (!normalized) {
    return false
  }

  if (normalized.startsWith('/system/')) {
    return true
  }

  return [
    '/data-dictionary',
    '/user-management',
    '/app-management',
    '/permission-management',
    '/data-migration'
  ].includes(normalized)
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

function buildNotice(type = '', title = '', message = '') {
  return {type, title, message}
}

export default {
  components: {
    AppIconImage,
    MacDialog
  },
  setup() {
    const router = useRouter()
    const user = ref(normalizeCurrentUser(readAuthState(localStorage).user || {}))
    const currentTime = ref(new Date())

    const showUserDialog = ref(false)
    const showSystemMenu = ref(false)
    const activeDialogTab = ref('profile')
    const dialogLoading = ref(false)
    const appPermissionLoading = ref(false)
    const accessibleFeatureCodes = ref([])
    const appPermissionSource = ref('unavailable')
    const surfaceNotice = reactive(buildNotice())
    const toolCatalog = ref(buildDefaultAppCatalog())
    const customToolOrder = ref(readCustomOrder())
    const draggingToolKey = ref('')
    const dragOverToolKey = ref('')
    const suppressNextToolOpen = ref(false)
    const isMobileViewport = ref(false)
    const systemMenuRef = ref(null)
    const easterEggClickCount = ref(0)
    const logoutPending = ref(false)
    let easterEggTimer = null
    let surfaceNoticeTimer = null

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

    const currentDateText = computed(() => formatDateText(currentTime.value))
    const currentUserRole = computed(() => `${normalizeCurrentUser(user.value || {}).roleCode || 'USER'}`.toUpperCase())
    const appPermissionStatusText = computed(() => {
      if (appPermissionLoading.value) {
        return '权限加载中'
      }
      if (appPermissionSource.value === 'backend') {
        return `已授权 ${tools.value.length} 个应用`
      }
      if (appPermissionSource.value === 'admin-fallback') {
        return `管理员兜底 ${tools.value.length} 个应用`
      }
      if (appPermissionSource.value === 'unavailable') {
        return '权限不可用'
      }
      return `已授权 ${tools.value.length} 个应用`
    })
    const permissionHintText = computed(() => {
      if (appPermissionSource.value === 'backend') {
        return '主页已优先按当前用户授权显示应用入口，桌面排序保持稳定，也支持拖拽自定义。'
      }
      if (appPermissionSource.value === 'admin-fallback') {
        return '当前账号尚未写入正式授权，主页按管理员兜底目录展示。建议尽快在权限管理中补齐授权。'
      }
      if (appPermissionSource.value === 'unavailable') {
        return '当前无法读取应用权限，主页已停止使用本地草稿回退，请恢复权限接口后再访问应用入口。'
      }
      return '主页已优先按当前用户授权显示应用入口。'
    })
    const permissionBadgeClass = computed(() => {
      if (appPermissionSource.value === 'backend') {
        return 'is-success'
      }
      if (appPermissionSource.value === 'admin-fallback') {
        return 'is-warning'
      }
      if (appPermissionSource.value === 'unavailable') {
        return 'is-error'
      }
      return 'is-neutral'
    })

    const systemMenus = [
      {key: 'profile', name: '个人中心', shortName: '我'},
      {key: 'user', name: '用户管理', shortName: '用'},
      {key: 'app', name: '应用管理', shortName: '应'},
      {key: 'permission', name: '权限管理', shortName: '权'},
      {key: 'migration', name: '数据迁移', shortName: '迁'},
      {key: 'dict', name: '数据字典', shortName: '字'},
      {key: 'log', name: '系统日志', shortName: '志'},
      {key: 'logout', name: '退出登录', shortName: '退'}
    ]
    const visibleSystemMenus = computed(() => {
      if (currentUserRole.value === 'ADMIN') {
        return systemMenus
      }
      return systemMenus.filter((item) => ['profile', 'logout'].includes(item.key))
    })

    // 默认沿用应用目录顺序；一旦用户拖拽过桌面，就优先采用自定义顺序。
    const tools = computed(() => {
      const baseDefinitions = Array.isArray(accessibleFeatureCodes.value)
        ? toolCatalog.value.filter((item) => accessibleFeatureCodes.value.includes(item.featureCode))
        : toolCatalog.value
      // 系统管理类页面统一从右上角系统菜单进入，不在主页桌面重复展示图标。
      const desktopVisibleDefinitions = baseDefinitions.filter((item) => !isSystemMenuOnlyRoute(item.route))
      const nextTools = desktopVisibleDefinitions.map((item, index) => buildToolEntry(item, index))
      return sortHomeTools(nextTools, customToolOrder.value)
    })

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
      writeAuthState(localStorage, {
        token: readAuthState(localStorage).token,
        user: user.value
      })
    }

    const showSurfaceNotice = (type, title, message) => {
      if (surfaceNoticeTimer) {
        clearTimeout(surfaceNoticeTimer)
        surfaceNoticeTimer = null
      }
      logoutPending.value = false
      surfaceNotice.type = type
      surfaceNotice.title = title
      surfaceNotice.message = message
      if (type !== 'error') {
        surfaceNoticeTimer = setTimeout(() => {
          clearSurfaceNotice()
        }, 3200)
      }
    }

    const clearSurfaceNotice = () => {
      if (surfaceNoticeTimer) {
        clearTimeout(surfaceNoticeTimer)
        surfaceNoticeTimer = null
      }
      surfaceNotice.type = ''
      surfaceNotice.title = ''
      surfaceNotice.message = ''
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
      clearSurfaceNotice()
    }

    const loadCurrentUserAccessibleApps = async () => {
      appPermissionLoading.value = true
      try {
        const res = await getCurrentUserAccessibleApps()
        const payload = unwrapData(res)
        const permissionState = resolvePermissionViewState(payload)
        accessibleFeatureCodes.value = permissionState.accessibleFeatureCodes
        const accessibleApps = extractAccessibleApps(payload)
        toolCatalog.value = accessibleApps.length
          ? mergeAppCatalogList(buildDefaultAppCatalog(), accessibleApps)
          : buildDefaultAppCatalog()
        appPermissionSource.value = permissionState.appPermissionSource
      } catch (error) {
        const permissionState = resolvePermissionViewState(null, error)
        accessibleFeatureCodes.value = permissionState.accessibleFeatureCodes
        appPermissionSource.value = permissionState.appPermissionSource
        toolCatalog.value = buildDefaultAppCatalog()
      } finally {
        appPermissionLoading.value = false
      }
    }

    const logout = () => {
      clearAuthState(localStorage)
      router.push('/login')
    }

    const requestLogout = () => {
      logoutPending.value = true
    }

    const cancelLogoutRequest = () => {
      logoutPending.value = false
    }

    const confirmLogout = () => {
      logoutPending.value = false
      logout()
    }

    const goToStarInteractive = () => {
      router.push('/star-interactive')
    }

    const resetEasterEggProgress = () => {
      easterEggClickCount.value = 0
      if (easterEggTimer) {
        clearTimeout(easterEggTimer)
        easterEggTimer = null
      }
    }

    const handleEasterEggTrigger = () => {
      easterEggClickCount.value += 1
      if (easterEggTimer) {
        clearTimeout(easterEggTimer)
      }

      if (easterEggClickCount.value >= 3) {
        resetEasterEggProgress()
        goToStarInteractive()
        return
      }

      easterEggTimer = setTimeout(() => {
        resetEasterEggProgress()
      }, 1200)
    }

    const onSystemMenuClick = (menu) => {
      if (menu.key === 'profile') {
        openUserDialog()
        return
      }
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
      if (menu.key === 'migration') {
        router.push('/system/data-migrations')
        return
      }
      if (menu.key === 'logout') {
        requestLogout()
        return
      }
      showSurfaceNotice('info', '菜单待接入', `菜单【${menu.name}】已登记，后续会在系统管理能力中继续接入。`)
    }

    const closeSystemMenu = () => {
      showSystemMenu.value = false
    }

    const toggleSystemMenu = () => {
      showSystemMenu.value = !showSystemMenu.value
    }

    const handleSystemMenuAction = (menu) => {
      closeSystemMenu()
      onSystemMenuClick(menu)
    }

    const handleDocumentClick = (event) => {
      const container = systemMenuRef.value
      if (showSystemMenu.value && container && !container.contains(event.target)) {
        closeSystemMenu()
      }
    }

    const handleEscapeKey = (event) => {
      if (event.key !== 'Escape') {
        return
      }
      clearSurfaceNotice()
      closeSystemMenu()
    }

    const openTool = (tool) => {
      if (suppressNextToolOpen.value) {
        suppressNextToolOpen.value = false
        return
      }
      if (tool.route) {
        router.push(tool.route)
        return
      }
      showSurfaceNotice('info', '应用暂未开放', `应用【${tool.name}】已登记，后续会在权限管理中维护入口与接入能力。`)
    }

    // 拖拽排序只调整展示顺序，不影响应用目录本身的排序配置。
    const handleToolDragStart = (tool, event) => {
      if (isMobileViewport.value) {
        event?.preventDefault()
        return
      }
      draggingToolKey.value = tool.key
      dragOverToolKey.value = tool.key
      if (event?.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', tool.key)
      }
    }

    const handleToolDragEnter = (tool) => {
      if (isMobileViewport.value) {
        return
      }
      if (!draggingToolKey.value || draggingToolKey.value === tool.key) {
        return
      }
      dragOverToolKey.value = tool.key
    }

    const handleToolDrop = (tool) => {
      if (isMobileViewport.value) {
        handleToolDragEnd()
        return
      }
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
        showSurfaceNotice('warning', '资料同步失败', '个人中心暂时无法刷新最新资料，当前先展示本地登录信息。')
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
        showSurfaceNotice('success', '资料已更新', '个人中心资料已经写回后端并同步到当前登录态。')
        showUserDialog.value = false
      } catch (error) {
        console.error(error)
        showSurfaceNotice('error', '资料更新失败', extractErrorMessage(error, '更新失败，请稍后重试'))
      } finally {
        dialogLoading.value = false
      }
    }

    const submitPassword = async () => {
      if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
        showSurfaceNotice('warning', '密码信息不完整', '请完整填写当前密码、新密码和确认密码。')
        return
      }

      if (passwordForm.newPassword.length < 6) {
        showSurfaceNotice('warning', '新密码过短', '新密码长度不能少于 6 位。')
        return
      }

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        showSurfaceNotice('warning', '两次输入不一致', '请确认两次输入的新密码保持一致。')
        return
      }

      if (passwordForm.oldPassword === passwordForm.newPassword) {
        showSurfaceNotice('warning', '密码未变化', '新密码不能与当前密码相同。')
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

        showUserDialog.value = false
        showSurfaceNotice('success', '密码修改成功', '当前账号即将退出，请使用新密码重新登录。')
        window.setTimeout(() => {
          logout()
        }, 800)
      } catch (error) {
        console.error(error)
        showSurfaceNotice('error', '密码修改失败', extractErrorMessage(error, '密码修改失败，请稍后重试'))
      } finally {
        dialogLoading.value = false
      }
    }

    const syncMobileViewport = () => {
      isMobileViewport.value = window.matchMedia('(max-width: 640px)').matches
      if (isMobileViewport.value) {
        handleToolDragEnd()
      }
    }

    onMounted(() => {
      timer = setInterval(() => {
        currentTime.value = new Date()
      }, 60 * 1000)
      syncMobileViewport()
      window.addEventListener('resize', syncMobileViewport)
      document.addEventListener('click', handleDocumentClick)
      document.addEventListener('keydown', handleEscapeKey)
      loadCurrentUserAccessibleApps()
    })

    onBeforeUnmount(() => {
      if (timer) {
        clearInterval(timer)
      }
      if (surfaceNoticeTimer) {
        clearTimeout(surfaceNoticeTimer)
      }
      resetEasterEggProgress()
      window.removeEventListener('resize', syncMobileViewport)
      document.removeEventListener('click', handleDocumentClick)
      document.removeEventListener('keydown', handleEscapeKey)
    })

    return {
      user,
      showSystemMenu,
      systemMenuRef,
      currentDateText,
      currentUserRole,
      appPermissionLoading,
      appPermissionStatusText,
      permissionHintText,
      permissionBadgeClass,
      getPresetIconSvg,
      systemMenus,
      visibleSystemMenus,
      tools,
      usesImageIcon,
      isMobileViewport,
      draggingToolKey,
      dragOverToolKey,
      showUserDialog,
      activeDialogTab,
      dialogLoading,
      profileForm,
      passwordForm,
      surfaceNotice,
      logoutPending,
      logout,
      requestLogout,
      cancelLogoutRequest,
      confirmLogout,
      clearSurfaceNotice,
      goToStarInteractive,
      handleEasterEggTrigger,
      onSystemMenuClick,
      toggleSystemMenu,
      handleSystemMenuAction,
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
  color: #fff;
  overflow: hidden;
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

.main-area {
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

.system-menu-box {
  position: relative;
}

.system-menu-toggle {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
  transition: transform 0.2s ease, background 0.2s ease;
}

.system-menu-toggle:hover,
.system-menu-toggle.active {
  background: rgba(96, 204, 255, 0.24);
}

.system-menu-toggle.active {
  transform: rotate(18deg);
}

.gear-icon {
  width: 18px;
  height: 18px;
  display: block;
}

.system-menu-dropdown {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 12;
  width: 220px;
  padding: 10px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(7, 22, 39, 0.92);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(18px);
}

.system-menu-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px 12px;
}

.system-menu-header strong {
  font-size: 14px;
}

.system-menu-header span {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.66);
}

.system-dropdown-item {
  width: 100%;
  min-height: 42px;
  border: none;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 10px;
  color: #fff;
  cursor: pointer;
  text-align: left;
  background: transparent;
}

.system-dropdown-item:hover {
  background: rgba(255, 255, 255, 0.12);
}

.system-dropdown-item.danger {
  color: #fecaca;
}

.easter-egg-trigger {
  width: 34px;
  height: 34px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(10px);
  transition: transform 0.18s ease, color 0.18s ease, background 0.18s ease;
}

.easter-egg-trigger:hover {
  transform: translateY(-1px);
  color: rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.1);
}

.easter-egg-mark {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.welcome-wrap {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.welcome-label {
  font-weight: 500;
}

.user-name-text {
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.18);
}

.current-date {
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.16);
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

.app-count.is-success,
.surface-notice.success {
  box-shadow: inset 0 0 0 1px rgba(34, 197, 94, 0.22);
}

.app-count.is-warning,
.surface-notice.warning {
  box-shadow: inset 0 0 0 1px rgba(245, 158, 11, 0.28);
}

.app-count.is-error,
.surface-notice.error {
  box-shadow: inset 0 0 0 1px rgba(248, 113, 113, 0.26);
}

.surface-notice {
  border-radius: 16px;
  padding: 14px 16px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: linear-gradient(135deg, rgba(13, 30, 52, 0.8), rgba(10, 24, 42, 0.72));
  margin-bottom: 18px;
}

.surface-notice p {
  color: rgba(255, 255, 255, 0.72);
}

.surface-notice strong {
  font-size: 16px;
}

.surface-notice p,
.surface-notice strong {
  margin: 0;
}

.surface-notice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.surface-notice.success {
  border-color: rgba(34, 197, 94, 0.24);
}

.surface-notice.warning {
  border-color: rgba(245, 158, 11, 0.26);
}

.surface-notice.error {
  border-color: rgba(248, 113, 113, 0.24);
}

.confirm-copy {
  margin: 0;
}

.confirm-copy {
  margin-top: 10px;
  color: rgba(255, 255, 255, 0.74);
}

.notice-close {
  border: none;
  min-width: 64px;
  height: 34px;
  border-radius: 999px;
  cursor: pointer;
  color: #fff;
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
  min-height: 126px;
  padding: 16px;
  border-radius: 16px;
  display: flex;
  align-items: center;
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

.tool-layout {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
}

.icon-box {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  flex: 0 0 64px;
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
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.tool-name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.2;
}

.tool-desc {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.76);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
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

  .easter-egg-trigger {
    width: 34px;
  }

  .top-right-wrap {
    width: 100%;
    justify-content: flex-end;
  }

  .grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }
}

@media (max-width: 640px) {
  .home-page {
    overflow: auto;
  }

  .main-area {
    width: 100%;
    min-height: 100vh;
    padding: 8px 12px 18px !important;
    gap: 8px !important;
  }

  .top-bar {
    gap: 8px;
  }

  .easter-egg-trigger {
    width: 28px;
    height: 28px;
    border-radius: 8px;
  }

  .top-right-wrap {
    gap: 8px;
    justify-content: flex-end;
  }

  .welcome-label,
  .current-date {
    display: none;
  }

  .user-name-text {
    padding: 3px 7px;
    font-size: 12px;
  }

  .system-menu-toggle {
    width: 34px;
    height: 34px;
  }

  .main-panel {
    padding: 4px 0 0;
    border: none;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    backdrop-filter: none;
  }

  .panel-head {
    display: none;
  }

  .surface-notice {
    flex-direction: column;
    align-items: flex-start;
  }

  .grid {
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    gap: 18px 8px !important;
    align-items: start;
  }

  .tool-item {
    min-height: 0 !important;
    padding: 0 !important;
    border: none;
    border-radius: 0;
    align-items: flex-start;
    justify-content: center;
    background: transparent;
    box-shadow: none;
    cursor: pointer;
    text-align: center;
    -webkit-user-drag: none;
    user-select: none;
  }

  .tool-item:hover {
    transform: none;
    border-color: transparent;
    background: transparent;
  }

  .tool-item.dragging,
  .tool-item.drag-over {
    opacity: 1;
    transform: none;
    box-shadow: none;
    background: transparent;
  }

  .tool-layout {
    flex-direction: column;
    align-items: center;
    gap: 7px;
  }

  .icon-box {
    width: 68px !important;
    height: 68px !important;
    flex-basis: 68px;
    border-radius: 18px !important;
  }

  .icon-text {
    font-size: 20px;
  }

  .tool-content {
    width: 100%;
    align-items: center;
    gap: 0;
  }

  .tool-name {
    max-width: 72px;
    min-height: 34px;
    font-size: 12px !important;
    font-weight: 600;
    line-height: 1.35;
    text-align: center;
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.55);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .tool-desc {
    display: none;
  }

  .filter-actions,
  .dialog-actions {
    width: 100%;
  }

  .top-right-wrap {
    width: auto;
    margin-left: auto;
    justify-content: flex-end;
  }

  .system-menu-box {
    margin-left: auto;
  }

  .system-menu-dropdown {
    width: min(240px, calc(100vw - 24px));
  }

  .current-date,
  .user-name-text {
    width: auto;
  }

  .dialog-actions .ghost-btn,
  .dialog-actions .action-btn {
    flex: 1 1 calc(50% - 4px);
  }
}

@media (max-width: 420px) {
  .grid {
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    gap: 16px 6px !important;
  }

  .top-right-wrap {
    gap: 10px;
  }

  .welcome-wrap {
    width: auto;
    justify-content: flex-end;
  }

  .current-date {
    width: 100%;
    text-align: center;
  }
}
</style>
