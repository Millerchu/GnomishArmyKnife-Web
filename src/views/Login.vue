<template>
  <div class="login-page">
    <div class="page-shell">
      <section class="brand-hero">
        <div class="brand-header">
          <img class="brand-mark" src="/brand/gnomish-army-knife-mark.svg" alt="侏儒军刀" />
          <div class="brand-copy">
            <p class="brand-kicker">Personal Toolkit Console</p>
            <h1 class="system-name">侏儒军刀</h1>
            <p class="system-subtitle">像一把幻想工程多功能军刀，把常用个人工具和逐步沉淀的经验入口收进同一个系统。</p>
          </div>
        </div>

        <div v-if="knowledgeTickerItems.length" class="ticker-panel">
          <div class="ticker-head">
            <div>
              <p class="ticker-kicker">今日经验</p>
              <h2 class="ticker-title">登录前先看一条可复用做法</h2>
            </div>
            <button type="button" class="ticker-switch" @click="showNextTicker">
              换一句
            </button>
          </div>

          <div class="ticker-quote">
            <p class="ticker-slogan">“{{ activeTicker.slogan }}”</p>
            <div class="ticker-meta">
              <span>{{ activeTicker.title }}</span>
              <span>{{ tickerIndex + 1 }} / {{ knowledgeTickerItems.length }}</span>
            </div>
          </div>

          <div class="ticker-dots">
            <button
              v-for="itemIndex in knowledgeTickerItems.length"
              :key="itemIndex"
              type="button"
              class="ticker-dot"
              :class="{ 'ticker-dot-active': tickerIndex === itemIndex - 1 }"
              @click="tickerIndex = itemIndex - 1"
            />
          </div>
        </div>
      </section>

      <section class="glass-box" :aria-busy="loading || initLoading">
        <h2 class="title">登录</h2>

        <form class="form" @submit.prevent="handleLogin">
          <div class="credential-group">
            <label class="sr-only" for="login-username">用户名</label>
            <input
              id="login-username"
              v-model.trim="form.username"
              class="input username-input"
              name="username"
              placeholder="用户名"
              autocomplete="username"
              :disabled="loading"
            />

            <div class="password-field">
              <label class="sr-only" for="login-password">密码</label>
              <input
                id="login-password"
                v-model="form.password"
                class="input password-input"
                name="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="密码"
                autocomplete="current-password"
                :disabled="loading"
              />
              <button
                class="password-toggle"
                type="button"
                :disabled="loading"
                :aria-label="showPassword ? '隐藏密码' : '显示密码'"
                :title="showPassword ? '隐藏密码' : '显示密码'"
                :aria-pressed="showPassword"
                @click="showPassword = !showPassword"
              >
                <svg v-if="showPassword" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M3 12s3.6-6 9-6 9 6 9 6-3.6 6-9 6-9-6-9-6Zm9 3.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"
                    fill="currentColor"
                  />
                </svg>
                <svg v-else viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M4.7 4.7 19.3 19.3l-1.4 1.4-2.8-2.8A10.6 10.6 0 0 1 12 18c-5.4 0-9-6-9-6a17.4 17.4 0 0 1 4.3-4.8L3.3 6.1l1.4-1.4Zm5.2 5.2a3.2 3.2 0 0 0 4.2 4.2l-4.2-4.2Zm2.1-3.9c5.4 0 9 6 9 6a17.7 17.7 0 0 1-4.4 4.8l-1.4-1.4A15.1 15.1 0 0 0 18.5 12c-.8-1.1-3.1-3.7-6.5-3.7-.8 0-1.5.1-2.2.4L8 7c1.2-.6 2.5-1 4-1Z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div class="captcha-row">
            <label class="sr-only" for="login-captcha">验证码</label>
            <input
              id="login-captcha"
              v-model.trim="form.captcha"
              class="input captcha-input"
              name="captcha"
              maxlength="4"
              placeholder="验证码"
              autocomplete="off"
              autocapitalize="off"
              spellcheck="false"
              :disabled="loading || initLoading"
            />
            <button
              class="captcha-box"
              type="button"
              :disabled="loading || initLoading"
              :aria-label="captchaText ? `验证码 ${captchaText}，点击刷新` : '验证码加载中'"
              :title="captchaText ? '点击刷新验证码' : '验证码加载中'"
              @click="refreshCaptcha"
            >
              {{ captchaText || '加载中...' }}
            </button>
          </div>

          <button class="btn" type="submit" :disabled="loading || initLoading">
            {{ loading ? '登录中...' : '登录' }}
          </button>
        </form>

        <p
          v-if="errorMessage"
          id="login-error"
          class="error-tip"
          role="alert"
          aria-live="assertive"
        >
          {{ errorMessage }}
        </p>

        <p class="tip">
          没有账号？
          <router-link to="/register">去注册</router-link>
        </p>
      </section>
    </div>
  </div>
</template>

<script>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  getCaptchaApi,
  getPasswordPublicKeyApi,
  loginApi
} from '@/api/auth'
import { getPublicKnowledgeHighlights } from '@/api/knowledgeBase'
import { writeAuthState } from '@/utils/authStorage'
import { buildKnowledgeTickerItems, getNextTickerIndex } from '@/utils/loginKnowledgeTicker'
import { encryptPasswordByPublicKey } from '@/utils/rsaEncrypt'

const TICKER_INTERVAL_MS = 6000

function unwrapData(res) {
  const payload = res?.data
  if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data
  }
  return payload
}

export default {
  setup() {
    const router = useRouter()

    const form = reactive({
      username: '',
      password: '',
      captcha: ''
    })

    const loading = ref(false)
    const initLoading = ref(false)
    const showPassword = ref(false)
    const captchaText = ref('')
    const publicKey = ref('')
    const errorMessage = ref('')
    const knowledgeTickerItems = ref([])
    const tickerIndex = ref(0)

    let tickerTimer = null

    const activeTicker = computed(() => {
      return knowledgeTickerItems.value[tickerIndex.value] || {
        title: '',
        slogan: ''
      }
    })

    const startTicker = () => {
      if (tickerTimer || knowledgeTickerItems.value.length <= 1) {
        return
      }
      tickerTimer = window.setInterval(() => {
        tickerIndex.value = getNextTickerIndex(tickerIndex.value, knowledgeTickerItems.value.length)
      }, TICKER_INTERVAL_MS)
    }

    const stopTicker = () => {
      if (!tickerTimer) {
        return
      }
      window.clearInterval(tickerTimer)
      tickerTimer = null
    }

    const showNextTicker = () => {
      tickerIndex.value = getNextTickerIndex(tickerIndex.value, knowledgeTickerItems.value.length)
    }

    const refreshCaptcha = async () => {
      const res = await getCaptchaApi()
      const payload = unwrapData(res) || {}
      captchaText.value = payload.captcha || ''
    }

    const loadPublicKey = async () => {
      const res = await getPasswordPublicKeyApi()
      const payload = unwrapData(res) || {}
      publicKey.value = payload.publicKey || ''
    }

    const loadKnowledgeTicker = async () => {
      try {
        const res = await getPublicKnowledgeHighlights({ size: 6 })
        const payload = unwrapData(res) || []
        const list = Array.isArray(payload) ? payload : (payload.list || [])
        knowledgeTickerItems.value = buildKnowledgeTickerItems(list)
        tickerIndex.value = 0
        stopTicker()
        startTicker()
      } catch (error) {
        console.error(error)
        knowledgeTickerItems.value = []
        stopTicker()
      }
    }

    const initLoginDependencies = async () => {
      initLoading.value = true
      errorMessage.value = ''
      try {
        await Promise.all([refreshCaptcha(), loadPublicKey(), loadKnowledgeTicker()])
      } catch (error) {
        console.error(error)
        errorMessage.value = '初始化失败，请刷新页面重试'
      } finally {
        initLoading.value = false
      }
    }

    const getLoginErrorMessage = (error) => {
      if (!error?.response) {
        return '网络异常，请检查网络后重试'
      }

      const data = error.response?.data || {}
      const code = (data.code || data.errorCode || '').toString().toUpperCase()
      const message = (
        data.message ||
        data.msg ||
        data.error ||
        ''
      ).toString()

      if (code) {
        if (code.includes('CAPTCHA')) {
          return '验证码错误或已过期'
        }
        if (code.includes('PASSWORD') || code.includes('CREDENTIAL')) {
          return '用户名或密码错误'
        }
        if (code.includes('DECRYPT')) {
          return '密码解密失败'
        }
      }

      const rawMessage = message.toLowerCase()

      if (rawMessage.includes('captcha') || rawMessage.includes('验证码')) {
        return '验证码错误或已过期'
      }

      if (
        rawMessage.includes('username') ||
        rawMessage.includes('password') ||
        rawMessage.includes('用户名') ||
        rawMessage.includes('密码') ||
        rawMessage.includes('credential')
      ) {
        return '用户名或密码错误'
      }

      if (rawMessage.includes('decrypt') || rawMessage.includes('解密')) {
        return '密码解密失败'
      }

      return message || '登录失败，请稍后重试'
    }

    const handleLogin = async () => {
      errorMessage.value = ''

      if (!form.username) {
        errorMessage.value = '请输入用户名'
        return
      }

      if (!form.password) {
        errorMessage.value = '请输入密码'
        return
      }

      if (!form.captcha || form.captcha.length !== 4) {
        errorMessage.value = '请输入4位验证码'
        return
      }

      if (!publicKey.value) {
        errorMessage.value = '公钥未就绪，请刷新验证码后重试'
        return
      }

      if (loading.value) {
        return
      }

      loading.value = true

      try {
        const encryptedPassword = encryptPasswordByPublicKey(
          form.password,
          publicKey.value
        )

        const res = await loginApi({
          username: form.username,
          encryptedPassword,
          captcha: form.captcha
        })

        const { token, user } = unwrapData(res) || {}
        writeAuthState(localStorage, { token, user })

        router.push('/home')
      } catch (error) {
        console.error(error)
        errorMessage.value = getLoginErrorMessage(error)
        form.captcha = ''
        await refreshCaptcha()
      } finally {
        loading.value = false
      }
    }

    onMounted(() => {
      initLoginDependencies()
    })

    onBeforeUnmount(() => {
      stopTicker()
    })

    return {
      form,
      loading,
      initLoading,
      showPassword,
      captchaText,
      errorMessage,
      knowledgeTickerItems,
      tickerIndex,
      activeTicker,
      refreshCaptcha,
      handleLogin,
      showNextTicker
    }
  }
}
</script>

<style scoped>
.login-page {
  height: 100%;
  min-height: 100vh;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  background:
    radial-gradient(circle at top left, var(--theme-accent-soft), transparent 26%),
    radial-gradient(circle at bottom right, var(--theme-warning-soft), transparent 24%);
}

.page-shell {
  width: min(1120px, 100%);
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(360px, 420px);
  gap: 24px;
  align-items: stretch;
}

.brand-hero,
.glass-box {
  border-radius: 26px;
  backdrop-filter: blur(18px);
}

.brand-hero {
  padding: 30px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background:
    linear-gradient(145deg, rgba(7, 23, 39, 0.9), rgba(13, 44, 70, 0.78)),
    radial-gradient(circle at top right, rgba(250, 204, 21, 0.12), transparent 28%);
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.22);
  color: #f8fbff;
}

.brand-header {
  display: flex;
  align-items: center;
  gap: 18px;
}

.brand-mark {
  width: 92px;
  height: 92px;
  flex-shrink: 0;
  filter: drop-shadow(0 14px 28px rgba(0, 0, 0, 0.24));
}

.brand-kicker,
.ticker-kicker {
  margin: 0 0 10px;
  font-size: 12px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: #8fd6ff;
}

.system-name {
  margin: 0;
  font-size: 38px;
}

.system-subtitle {
  margin: 10px 0 0;
  max-width: 480px;
  font-size: 15px;
  line-height: 1.72;
  color: rgba(255, 255, 255, 0.84);
}

.ticker-panel {
  margin-top: 28px;
  padding: 22px;
  border-radius: 24px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.06), rgba(250, 204, 21, 0.08));
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.ticker-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.ticker-title {
  margin: 0;
  font-size: 24px;
}

.ticker-switch {
  padding: 10px 15px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.06);
  color: #f8fbff;
  cursor: pointer;
}

.ticker-quote {
  margin-top: 22px;
}

.ticker-slogan {
  margin: 0;
  font-size: 28px;
  line-height: 1.5;
  color: #f8fbff;
  text-wrap: pretty;
}

.ticker-meta {
  margin-top: 16px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  color: rgba(219, 234, 254, 0.74);
}

.ticker-dots {
  margin-top: 18px;
  display: flex;
  gap: 8px;
}

.ticker-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  cursor: pointer;
}

.ticker-dot-active {
  background: #facc15;
}

.glass-box {
  width: 100%;
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  border: 1px solid var(--theme-border);
  background:
    linear-gradient(180deg, var(--theme-highlight-soft), transparent),
    var(--theme-surface-strong);
  color: var(--theme-text);
  box-shadow: var(--theme-shadow-md);
}

.title {
  margin: 0 0 22px;
  font-size: 24px;
  text-align: center;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.credential-group {
  display: contents;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.password-field {
  position: relative;
}

.input {
  width: 100%;
  padding: 11px 12px;
  border-radius: 12px;
  border: none;
  font-size: 16px;
  text-align: center;
  outline: none;
  color: var(--theme-text);
  background: var(--theme-field-surface);
}

.password-input {
  padding-right: 46px;
}

.password-toggle {
  position: absolute;
  top: 50%;
  right: 10px;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: 999px;
  color: var(--theme-text-muted);
  background: var(--theme-accent-soft);
  transform: translateY(-50%);
  cursor: pointer;
}

.password-toggle svg {
  width: 18px;
  height: 18px;
}

.password-toggle:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.captcha-row {
  display: flex;
  gap: 10px;
}

.captcha-input {
  flex: 1;
}

.captcha-box {
  min-width: 108px;
  border: none;
  border-radius: 12px;
  background: var(--theme-control-surface);
  color: var(--theme-text);
  font-weight: 700;
  letter-spacing: 2px;
  cursor: pointer;
}

.captcha-box:disabled,
.btn:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.btn {
  padding: 12px;
  margin-top: 4px;
  background: linear-gradient(135deg, #38bdf8, #facc15);
  color: #072036;
  border: none;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
}

.error-tip {
  margin-top: 12px;
  min-height: 20px;
  color: var(--theme-danger);
  font-size: 14px;
}

.tip {
  margin-top: 12px;
  font-size: 14px;
  color: var(--theme-text-soft);
  text-align: center;
}

@media (max-width: 980px) {
  .page-shell {
    grid-template-columns: 1fr;
  }

  .brand-hero {
    padding: 24px;
  }

  .ticker-slogan {
    font-size: 24px;
  }
}

@media (max-width: 720px) {
  .login-page {
    --mobile-space-xs: 8px;
    --mobile-space-sm: 12px;
    --mobile-space-md: 16px;
    --mobile-control-height: 48px;
    --mobile-card-radius: 28px;
    --mobile-control-radius: 14px;
    --mobile-glass-surface: color-mix(in srgb, var(--theme-surface-strong) 88%, transparent);
    --mobile-field-surface: color-mix(in srgb, var(--theme-field-surface) 92%, transparent);
    --mobile-hairline: var(--theme-divider);
    --mobile-shadow: var(--theme-shadow-md);
    height: 100vh;
    height: 100dvh;
    min-height: 100vh;
    min-height: 100dvh;
    padding:
      max(18px, env(safe-area-inset-top, 0px))
      max(16px, env(safe-area-inset-right, 0px))
      max(20px, env(safe-area-inset-bottom, 0px))
      max(16px, env(safe-area-inset-left, 0px));
    align-items: flex-start;
    justify-content: flex-start;
    background:
      radial-gradient(circle at 86% 2%, var(--theme-accent-soft), transparent 34%),
      linear-gradient(180deg, transparent 8%, var(--theme-surface-muted));
    -webkit-tap-highlight-color: transparent;
  }

  .page-shell {
    width: min(420px, 100%);
    margin-block: auto;
    margin-inline: auto;
    display: flex;
    flex-direction: column;
    gap: 0;
    align-items: start;
  }

  .brand-hero,
  .glass-box {
    width: 100%;
  }

  .brand-hero {
    padding: 4px 12px 20px;
    justify-content: center;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    color: var(--theme-text);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

  .brand-header {
    flex-direction: row;
    justify-content: center;
    gap: 12px;
    text-align: left;
  }

  .brand-kicker,
  .system-subtitle {
    display: none;
  }

  .ticker-panel {
    display: none;
  }

  .brand-mark {
    width: 58px;
    height: 58px;
    filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.2));
  }

  .system-name {
    font-size: 30px;
    line-height: 1.06;
    letter-spacing: -0.025em;
  }

  .glass-box {
    padding: 24px 20px 20px;
    justify-content: flex-start;
    border: 1px solid var(--theme-border);
    border-radius: var(--mobile-card-radius);
    background:
      linear-gradient(180deg, var(--theme-highlight-soft), transparent 44%),
      var(--mobile-glass-surface);
    box-shadow:
      var(--mobile-shadow),
      inset 0 1px 0 var(--theme-highlight);
    backdrop-filter: blur(28px) saturate(170%);
    -webkit-backdrop-filter: blur(28px) saturate(170%);
  }

  .title {
    margin-bottom: 18px;
    font-size: 28px;
    line-height: 1.12;
    letter-spacing: -0.025em;
    text-align: left;
  }

  .form {
    gap: var(--mobile-space-sm);
  }

  .credential-group {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid var(--theme-border) !important;
    border-radius: var(--mobile-control-radius) !important;
    background: var(--mobile-field-surface) !important;
    box-shadow: inset 0 1px 0 var(--theme-highlight-soft) !important;
    transition: border-color 140ms ease-out, box-shadow 140ms ease-out;
  }

  .credential-group:focus-within {
    border-color: var(--theme-accent);
    box-shadow: 0 0 0 3px var(--theme-focus-ring);
  }

  .input {
    min-height: var(--mobile-control-height) !important;
    height: var(--mobile-control-height) !important;
    padding: 0 var(--mobile-space-md) !important;
    border: 1px solid var(--theme-border) !important;
    border-radius: var(--mobile-control-radius) !important;
    font-size: 16px !important;
    line-height: 1.35;
    text-align: left;
    caret-color: var(--theme-accent);
    background: var(--mobile-field-surface) !important;
    box-shadow: inset 0 1px 0 var(--theme-highlight-soft) !important;
    transition: background-color 120ms ease-out, border-color 120ms ease-out, box-shadow 120ms ease-out;
  }

  .input::placeholder {
    color: var(--theme-text-muted);
    opacity: 1;
  }

  .input:focus {
    border-color: var(--theme-accent) !important;
    background: color-mix(in srgb, var(--mobile-field-surface) 86%, var(--theme-accent-soft)) !important;
    box-shadow: 0 0 0 3px var(--theme-focus-ring) !important;
  }

  .credential-group .input {
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

  .credential-group .username-input {
    border-bottom: 1px solid var(--mobile-hairline) !important;
  }

  .credential-group .input:focus {
    background: var(--theme-accent-soft) !important;
    box-shadow: none !important;
  }

  .password-input {
    padding-right: 52px !important;
  }

  .password-toggle {
    right: 2px;
    width: 44px;
    height: 44px;
    color: var(--theme-text-soft);
    background: transparent;
    transition: color 100ms ease-out, background-color 100ms ease-out, transform 100ms ease-out;
    touch-action: manipulation;
  }

  .password-toggle:active {
    color: var(--theme-accent);
    background: var(--theme-accent-soft);
    transform: translateY(-50%) scale(0.94);
  }

  .captcha-row {
    gap: var(--mobile-space-xs);
  }

  .captcha-input {
    min-width: 0;
  }

  .captcha-box {
    min-width: 112px;
    min-height: var(--mobile-control-height);
    padding-inline: var(--mobile-space-sm);
    border: 1px solid var(--theme-border);
    border-radius: var(--mobile-control-radius);
    background: var(--theme-control-surface);
    transition: background-color 100ms ease-out, transform 100ms ease-out;
    touch-action: manipulation;
  }

  .captcha-box:active:not(:disabled) {
    background: var(--theme-accent-soft);
    transform: scale(0.97);
  }

  .btn {
    min-height: 50px;
    padding: 0 var(--mobile-space-md);
    margin-top: 0;
    border-radius: var(--mobile-control-radius);
    background: var(--theme-accent);
    color: var(--theme-on-accent);
    font-size: 17px;
    line-height: 1;
    font-weight: 650;
    letter-spacing: 0.01em;
    box-shadow: 0 8px 22px color-mix(in srgb, var(--theme-accent) 28%, transparent);
    transition: background-color 100ms ease-out, transform 100ms ease-out, opacity 100ms ease-out;
    touch-action: manipulation;
  }

  .btn:active:not(:disabled) {
    background: var(--theme-accent-strong);
    transform: scale(0.98);
  }

  .btn:disabled,
  .captcha-box:disabled {
    opacity: 0.58;
  }

  .error-tip {
    min-height: 0;
    margin: var(--mobile-space-sm) 0 0;
    padding: 10px 12px;
    border-radius: 12px;
    color: var(--theme-danger);
    background: var(--theme-danger-soft);
    font-size: 13px;
    line-height: 1.45;
  }

  .tip {
    margin: var(--mobile-space-sm) 0 0;
    line-height: 1.5;
  }

  .tip a {
    display: inline-flex;
    min-height: 44px;
    align-items: center;
    color: var(--theme-link);
  }

  .ticker-title {
    font-size: 20px;
  }

  .ticker-slogan {
    font-size: 20px;
  }

  .ticker-meta {
    flex-direction: column;
  }
}

@media (max-width: 720px) and (prefers-reduced-transparency: reduce) {
  .glass-box {
    background: var(--theme-surface-raised);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

  .credential-group,
  .input {
    background: var(--theme-field-surface);
  }
}

@media (max-width: 720px) and (prefers-contrast: more) {
  .glass-box,
  .credential-group,
  .input,
  .captcha-box {
    border-color: var(--theme-border-strong);
  }

  .glass-box {
    background: var(--theme-surface-raised);
  }

  .input::placeholder {
    color: var(--theme-text-soft);
  }
}

@media (max-width: 720px) and (prefers-reduced-motion: reduce) {
  .credential-group,
  .input,
  .password-toggle,
  .captcha-box,
  .btn {
    transition: color 80ms linear, background-color 80ms linear, border-color 80ms linear;
  }

  .password-toggle:active,
  .captcha-box:active:not(:disabled),
  .btn:active:not(:disabled) {
    transform: none;
  }

  .password-toggle:active {
    transform: translateY(-50%);
  }
}
</style>
