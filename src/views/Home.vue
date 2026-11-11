<template>
  <div class="home-page">
    <main class="main-area">
      <div class="top-bar">
        <div class="top-left-actions">
          <button
            class="easter-egg-trigger"
            type="button"
            aria-label="主页彩蛋入口"
            title="连续点击三次试试看"
            @click="handleEasterEggTrigger"
          >
            <span class="easter-egg-mark">侏</span>
          </button>
          <a
            class="printer-service-link"
            href="http://192.168.31.138:1180/"
            target="_blank"
            rel="noopener noreferrer"
            title="打印机管理"
            aria-label="打印机管理（在新标签页打开）"
          >
            <svg class="printer-service-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M7 8V3h10v5M7 17H4V8h16v9h-3M7 14h10v7H7z" />
              <path d="M16 11h1" />
            </svg>
          </a>
        </div>

        <div class="top-right-wrap">
          <div class="welcome-wrap">
            <AuthenticatedImage
              v-if="avatarAttachment"
              class="header-avatar"
              :attachment-id="avatarAttachment.id"
              :alt="`${user.displayName || user.username || '用户'}的头像`"
            />
            <span v-else class="header-avatar avatar-fallback">{{ avatarInitial }}</span>
            <span class="welcome-label">欢迎，</span>
            <span class="user-name-text">
              {{ user.displayName || user.username || '用户' }}
            </span>
          </div>

          <span class="current-date">{{ currentDateText }}</span>

          <ThemeToggle class="home-theme-toggle" />

          <MessageHost inline />

          <div ref="systemMenuRef" class="system-menu-box">
            <button
              ref="systemMenuToggleRef"
              class="system-menu-toggle"
              :class="{ active: showSystemMenu }"
              type="button"
              aria-label="系统菜单"
              aria-controls="home-system-menu"
              :aria-expanded="showSystemMenu"
              @click.stop="toggleSystemMenu"
            >
              <svg class="gear-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.03 7.03 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.8a.5.5 0 0 0-.49.42l-.36 2.54c-.58.22-1.13.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.48a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.31.6.22l2.39-.96c.5.4 1.05.72 1.63.94l.36 2.54c.04.24.25.42.49.42h3.8c.24 0 .45-.18.49-.42l.36-2.54c.58-.22 1.13-.54 1.63-.94l2.39.96c.22.09.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z"
                  fill="currentColor"
                />
              </svg>
            </button>

            <Transition name="system-menu-material">
              <div
                v-if="showSystemMenu"
                id="home-system-menu"
                class="system-menu-dropdown"
                role="group"
                aria-label="系统菜单"
              >
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
            </Transition>
          </div>
        </div>
      </div>

      <div v-if="surfaceNotice.message" class="surface-notice" :class="surfaceNotice.type" role="status"><div><strong>{{ surfaceNotice.title }}</strong><p>{{ surfaceNotice.message }}</p></div><button type="button" class="notice-close" @click="clearSurfaceNotice">收起提示</button></div>
      <WorkbenchPanel :loading="appPermissionLoading" :source="appPermissionSource" :feature-codes="accessibleFeatureCodes" :tools="tools" :types="quickCreateTypes" :display-name="user.displayName || user.username || '用户'" :date-text="currentDateText" :now="currentTime" :mobile="isMobileViewport" :refresh-key="refreshKey" @create="openQuickCreate" @retry-permissions="access.reload" @order="access.setOrder" @notice="showSurfaceNotice" />
      <RequirementBoard ref="requirementBoard" :current-user="user" @notice="showSurfaceNotice" />
      <nav class="mobile-workbench-bar" aria-label="工作台操作">
        <button type="button" @click="openSearch">⌕ 搜索</button>
        <button class="mobile-quick-create" type="button" :disabled="appPermissionLoading || !quickCreateTypes.length" aria-label="快速新增" @click="openQuickCreate()">＋ 快速新增</button>
        <button type="button" @click="requirementBoard?.togglePanel()">▤ 看板</button>
      </nav>
    </main>

    <MacDialog
      v-model="logoutPending"
      :confirm-on-dirty="false"
      title="确认退出当前账号？"
      subtitle="退出后会返回登录页，本地登录态会被清理。"
      width="440px"
      panel-class="home-logout-dialog"
      mobile-presentation="sheet"
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
      :form-state="{profileForm, passwordForm, avatarIds: profileAvatarAttachments.map(item => item.id)}"
      :form-ready="!dialogLoading"
      title="个人中心"
      width="720px"
      panel-class="home-profile-dialog"
      mobile-presentation="fullScreen"
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
          :inert="dialogLoading"
          id="home-profile-dialog-form"
          class="dialog-form dialog-density-grid dialog-grid-cols-2"
          @submit.prevent="submitProfile"
        >
          <section class="profile-identity-card">
            <div class="profile-avatar-preview">
              <AuthenticatedImage
                v-if="profileAvatarAttachments[0]"
                :attachment-id="profileAvatarAttachments[0].id"
                :alt="`${profileForm.displayName || profileForm.username || '用户'}的头像`"
              />
              <span v-else>{{ profileAvatarInitial }}</span>
            </div>
            <div class="profile-identity-copy">
              <strong>{{ profileForm.displayName || profileForm.username || '设置你的昵称' }}</strong>
              <span>支持 JPEG、PNG、WebP、GIF，头像将通过鉴权附件接口保存。</span>
            </div>
          </section>
          <AttachmentManager
            v-model="profileAvatarAttachments"
            usage-type="IMAGE"
            :max-count="1"
            title="个人头像"
            hint="选择一张图片作为头像；移除后保存即可恢复为文字头像。"
          />
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
import AuthenticatedImage from '@/components/AuthenticatedImage.vue'
import AttachmentManager from '@/components/AttachmentManager.vue'
import MacDialog from '@/components/MacDialog.vue'
import MessageHost from '@/components/MessageHost.vue'
import RequirementBoard from '@/components/RequirementBoard.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import WorkbenchPanel from '@/components/workbench/WorkbenchPanel.vue'
import useHomeShell from '@/composables/useHomeShell'

export default {
  components: {AuthenticatedImage, AttachmentManager, MacDialog, MessageHost, RequirementBoard, ThemeToggle, WorkbenchPanel},
  setup: useHomeShell
}
</script>

<style scoped src="../components/workbench/homeShell.css"></style>
