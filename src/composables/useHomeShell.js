import {useWorkbenchAccess} from './useWorkbenchAccess'
import {unwrapData} from '@/utils/workbenchApps'

import {computed, onBeforeUnmount, onMounted, reactive, ref} from 'vue'
import {useRouter} from 'vue-router'
import {changePasswordApi, getPasswordPublicKeyApi} from '@/api/auth'
import {listSystemUsers, updateSystemUser} from '@/api/systemUser'
import {clearAuthState, readAuthState, writeAuthState} from '@/utils/authStorage'
import {encryptPasswordByPublicKey} from '@/utils/rsaEncrypt'
import {getMyAvatarAttachments, saveMyAvatarAttachments} from '@/api/attachment'

const WEEK_LABELS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
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

function extractErrorMessage(error, fallback) {
  const data = error?.response?.data || {}
  return data.message || data.msg || fallback
}

function buildNotice(type = '', title = '', message = '') {
  return {type, title, message}
}

export default function useHomeShell() {
  const router = useRouter()
  const user = ref(normalizeCurrentUser(readAuthState(localStorage).user || {}))
  const currentTime = ref(new Date())

  const showUserDialog = ref(false)
  const showSystemMenu = ref(false)
  const activeDialogTab = ref('profile')
  const dialogLoading = ref(false)
  const access = useWorkbenchAccess()
  const {loading: appPermissionLoading, featureCodes: accessibleFeatureCodes, source: appPermissionSource, tools, quickCreateTypes, catalog: toolCatalog} = access
  const surfaceNotice = reactive(buildNotice())
  const isMobileViewport = ref(false)
  const systemMenuRef = ref(null)
  const systemMenuToggleRef = ref(null)
  const easterEggClickCount = ref(0)
  const logoutPending = ref(false)
  const refreshKey = ref(0)
  const requirementBoard = ref(null)
  const avatarAttachments = ref([])
  const profileAvatarAttachments = ref([])
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
  const avatarAttachment = computed(() => avatarAttachments.value[0] || null)
  const avatarInitial = computed(() => Array.from(user.value.displayName || user.value.username || '我')[0])
  const profileAvatarInitial = computed(() => Array.from(profileForm.displayName || profileForm.username || '我')[0])
  const systemMenus = [
    {key: 'profile', name: '个人中心', shortName: '我'},
    {key: 'user', name: '用户管理', shortName: '用'},
    {key: 'app', name: '应用管理', shortName: '应'},
    {key: 'messages', name: '消息管理', shortName: '信'},
    {key: 'permission', name: '权限管理', shortName: '权'},
    {key: 'migration', name: '数据迁移', shortName: '迁'},
    {key: 'dict', name: '数据字典', shortName: '字'},
    {key: 'log', name: '系统日志', shortName: '志'},
    {key: 'logout', name: '退出登录', shortName: '退'}
  ]
  const visibleSystemMenus = computed(() => {
    if (currentUserRole.value === 'ADMIN') {
      // 系统日志必须有后端明确授权；目录 enabled 默认为 true，仅作补充检查，不能替代授权。
      return systemMenus.filter((item) => item.key !== 'log' || (
        !appPermissionLoading.value
        && user.value.enabled !== false
        && (!user.value.status || user.value.status === 'ENABLED')
        && appPermissionSource.value === 'backend'
        && accessibleFeatureCodes.value.includes('APP_SYSTEM_LOG')
        && toolCatalog.value.some((app) => app.featureCode === 'APP_SYSTEM_LOG' && app.enabled)
      ))
    }
    return systemMenus.filter((item) => ['profile', 'logout'].includes(item.key))
  })

  const openQuickCreate = (typeCode = '') => window.dispatchEvent(new CustomEvent('gak:open-quick-create', {detail: {typeCode}}))
  const openSearch = () => window.dispatchEvent(new Event('gak:open-command'))
  const handleQuickCreateSuccess = (event) => {
    refreshKey.value++
    showSurfaceNotice('success', '快速新增成功', event.detail?.message || '保存成功')
  }

  const syncProfileForm = () => {
    const currentUser = normalizeCurrentUser(user.value || {})
    profileForm.username = currentUser.username || ''
    profileForm.displayName = currentUser.displayName || ''
    profileForm.phone = currentUser.phone || ''
    profileForm.email = currentUser.email || ''
    profileAvatarAttachments.value = avatarAttachments.value.map((item) => ({...item}))
  }

  const loadCurrentUserAvatar = async () => {
    const response = await getMyAvatarAttachments()
    const attachments = unwrapData(response)
    avatarAttachments.value = Array.isArray(attachments) ? attachments : []
    profileAvatarAttachments.value = avatarAttachments.value.map((item) => ({...item}))
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
    if (menu.key === 'messages') {
      router.push('/system/messages')
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
    if (menu.key === 'log' && visibleSystemMenus.value.some((item) => item.key === 'log')) {
      router.push('/system-log')
      return
    }
    if (menu.key === 'logout') {
      requestLogout()
      return
    }
    showSurfaceNotice('info', '菜单待接入', `菜单【${menu.name}】已登记，后续会在系统管理能力中继续接入。`)
  }

  const closeSystemMenu = (restoreTriggerFocus = false) => {
    if (!showSystemMenu.value) {
      return
    }
    showSystemMenu.value = false
    if (restoreTriggerFocus) {
      systemMenuToggleRef.value?.focus({preventScroll: true})
    }
  }

  const toggleSystemMenu = () => {
    showSystemMenu.value = !showSystemMenu.value
  }

  const handleSystemMenuAction = (menu) => {
    closeSystemMenu(true)
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
    closeSystemMenu(true)
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
      await Promise.all([loadCurrentUserProfile(), loadCurrentUserAvatar()])
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
      const avatarResponse = await saveMyAvatarAttachments(profileAvatarAttachments.value.map((item) => item.id))
      avatarAttachments.value = Array.isArray(unwrapData(avatarResponse)) ? unwrapData(avatarResponse) : []
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
    isMobileViewport.value = window.matchMedia('(max-width: 720px)').matches
  }

  onMounted(() => {
    // 首次权限加载由共享上下文负责，回到首页时复用后台刷新，避免重复首屏请求。
    if (!appPermissionLoading.value) access.reload()
    timer = setInterval(() => {
      currentTime.value = new Date()
    }, 60 * 1000)
    syncMobileViewport()
    window.addEventListener('resize', syncMobileViewport)
    window.addEventListener('gak:quick-created', handleQuickCreateSuccess)
    document.addEventListener('click', handleDocumentClick)
    document.addEventListener('keydown', handleEscapeKey)
    loadCurrentUserAvatar().catch(() => {
      avatarAttachments.value = []
    })
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
    window.removeEventListener('gak:quick-created', handleQuickCreateSuccess)
    document.removeEventListener('click', handleDocumentClick)
    document.removeEventListener('keydown', handleEscapeKey)
  })

  return {
    access,
    accessibleFeatureCodes,
    currentTime,
    refreshKey,
    requirementBoard,
    openQuickCreate,
    openSearch,
    user,
    showSystemMenu,
    systemMenuRef,
    systemMenuToggleRef,
    currentDateText,
    currentUserRole,
    avatarAttachment,
    avatarInitial,
    profileAvatarAttachments,
    profileAvatarInitial,
    appPermissionLoading,
    appPermissionSource,
    systemMenus,
    visibleSystemMenus,
    tools,
    isMobileViewport,
    showUserDialog,
    activeDialogTab,
    dialogLoading,
    profileForm,
    passwordForm,
    surfaceNotice,
    logoutPending,
    quickCreateTypes,
    handleQuickCreateSuccess,
    logout,
    requestLogout,
    cancelLogoutRequest,
    confirmLogout,
    clearSurfaceNotice,
    showSurfaceNotice,
    goToStarInteractive,
    handleEasterEggTrigger,
    onSystemMenuClick,
    toggleSystemMenu,
    handleSystemMenuAction,
    openUserDialog,
    closeUserDialog,
    switchDialogTab,
    submitProfile,
    submitPassword
  }
}
