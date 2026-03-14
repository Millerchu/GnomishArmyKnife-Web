<template>
  <div class="home-page">
    <aside class="side-menu" :class="{ collapsed: menuCollapsed }">
      <div class="menu-head">
        <span v-if="!menuCollapsed" class="menu-title">系统菜单</span>
        <button class="collapse-btn" @click="toggleMenu">
          {{ menuCollapsed ? '>' : '<' }}
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
            <p class="home-subtitle">当前固定展示全部应用，后续由权限管理统一维护，并支持按使用频率排序。</p>
          </div>
          <span class="app-count">应用总数 {{ tools.length }}</span>
        </div>

        <div class="grid">
          <button
            v-for="tool in tools"
            :key="tool.key"
            class="tool-item"
            type="button"
            @click="openTool(tool)"
          >
            <div class="tool-top">
              <div class="icon-box" :style="tool.iconStyle">
                <span class="icon-text">{{ tool.iconText }}</span>
              </div>
              <span class="tool-state">{{ tool.statusText }}</span>
            </div>

            <div class="tool-content">
              <p class="tool-name">{{ tool.name }}</p>
              <p class="tool-meta">{{ tool.featureCode }}</p>
            </div>
          </button>
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
            <input v-model.trim="profileForm.displayName" required maxlength="32"/>
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
import {getPasswordPublicKeyApi} from '@/api/auth'
import {updatePasswordApi, updateProfileApi} from '@/api/user'
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
const APP_DEFINITIONS = [
  {key: 'calculator', name: '计算器', featureCode: 'APP_CALCULATOR', usageCount: 0},
  {key: 'work-log', name: '工作日志', featureCode: 'APP_WORK_LOG', route: '/work-log', usageCount: 0},
  {key: 'password-vault', name: '密码备忘录', featureCode: 'APP_PASSWORD_MEMO', usageCount: 0},
  {key: 'todo-list', name: '待办列表', featureCode: 'APP_TODO_LIST', usageCount: 0},
  {key: 'fuel-stats', name: '油耗统计', featureCode: 'APP_FUEL_STATS', usageCount: 0},
  {key: 'wow-character', name: 'WoW角色统计', featureCode: 'APP_WOW_CHARACTER', usageCount: 0},
  {key: 'personal-bills', name: '个人账单', featureCode: 'APP_PERSONAL_BILLS', usageCount: 0},
  {key: 'annual-budget', name: '年度预算', featureCode: 'APP_ANNUAL_BUDGET', usageCount: 0},
  {key: 'knowledge-base', name: '个人经验库', featureCode: 'APP_KNOWLEDGE_BASE', usageCount: 0},
  {key: 'software-repo', name: '软件仓库', featureCode: 'APP_SOFTWARE_REPO', usageCount: 0},
  {key: 'health-record', name: '个人健康记录', featureCode: 'APP_HEALTH_RECORD', usageCount: 0}
]

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
    },
    statusText: item.route ? '已接入' : '待接入'
  }
}

function extractErrorMessage(error, fallback) {
  const data = error?.response?.data || {}
  return data.message || data.msg || fallback
}

export default {
  setup() {
    const router = useRouter()
    const user = ref(JSON.parse(localStorage.getItem('user') || '{}'))
    const menuCollapsed = ref(true)
    const currentTime = ref(new Date())

    const showUserDialog = ref(false)
    const activeDialogTab = ref('profile')
    const dialogLoading = ref(false)

    const profileForm = reactive({
      username: '',
      displayName: ''
    })

    const passwordForm = reactive({
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    })

    let timer = null

    const currentDateText = computed(() => formatDateText(currentTime.value))

    const systemMenus = [
      {key: 'user', name: '用户管理', shortName: '用'},
      {key: 'permission', name: '权限管理', shortName: '权'},
      {key: 'dict', name: '数据字典', shortName: '字'},
      {key: 'log', name: '系统日志', shortName: '志'}
    ]

    const tools = computed(() => (
      APP_DEFINITIONS
        .map((item, index) => buildToolEntry(item, index))
        .sort((prev, next) => next.usageCount - prev.usageCount || prev.order - next.order)
    ))

    const syncProfileForm = () => {
      profileForm.username = user.value?.username || ''
      profileForm.displayName = user.value?.displayName || ''
    }

    const resetPasswordForm = () => {
      passwordForm.oldPassword = ''
      passwordForm.newPassword = ''
      passwordForm.confirmPassword = ''
    }

    const persistUser = (nextUserPatch) => {
      user.value = {
        ...(user.value || {}),
        ...nextUserPatch
      }
      localStorage.setItem('user', JSON.stringify(user.value))
    }

    const logout = () => {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
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
      if (menu.key === 'dict') {
        router.push('/system/dictionaries')
        return
      }
      alert(`菜单【${menu.name}】待接入具体功能`)
    }

    const openTool = (tool) => {
      if (tool.route) {
        router.push(tool.route)
        return
      }
      alert(`应用【${tool.name}】已登记，后续在权限管理中维护权限和接入能力`)
    }

    const openUserDialog = (tab = 'profile') => {
      activeDialogTab.value = tab
      syncProfileForm()
      resetPasswordForm()
      showUserDialog.value = true
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
      if (!profileForm.displayName) {
        alert('昵称不能为空')
        return
      }

      dialogLoading.value = true
      try {
        await updateProfileApi({
          displayName: profileForm.displayName
        })
        persistUser({displayName: profileForm.displayName})
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
        let oldEncryptedPassword = ''
        let newEncryptedPassword = ''

        try {
          const keyRes = await getPasswordPublicKeyApi()
          const publicKey = keyRes?.data?.publicKey || ''
          if (publicKey) {
            oldEncryptedPassword = encryptPasswordByPublicKey(passwordForm.oldPassword, publicKey)
            newEncryptedPassword = encryptPasswordByPublicKey(passwordForm.newPassword, publicKey)
          }
        } catch (error) {
          console.warn('加载公钥失败，回退为明文提交流程')
        }

        await updatePasswordApi({
          oldPassword: passwordForm.oldPassword,
          newPassword: passwordForm.newPassword,
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
    })

    onBeforeUnmount(() => {
      if (timer) {
        clearInterval(timer)
      }
    })

    return {
      user,
      menuCollapsed,
      currentDateText,
      systemMenus,
      tools,
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
  height: 100%;
  display: flex;
  color: #fff;
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

.grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}

.tool-item {
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
}

.icon-text {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #fff;
}

.tool-state {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.84);
  background: rgba(255, 255, 255, 0.12);
}

.tool-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tool-name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.tool-meta {
  margin: 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.68);
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

  .top-right-wrap {
    justify-content: flex-start;
  }

  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }
}

@media (max-width: 640px) {
  .home-page {
    position: relative;
  }

  .side-menu {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 8;
  }

  .main-area {
    width: 100%;
    padding-left: 72px;
  }

  .panel-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
