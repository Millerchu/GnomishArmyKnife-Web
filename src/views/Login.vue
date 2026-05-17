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

      <section class="glass-box">
        <h2 class="title">登录</h2>

        <form class="form" @submit.prevent="handleLogin">
          <input
            v-model.trim="form.username"
            class="input"
            placeholder="用户名"
            autocomplete="username"
            :disabled="loading"
          />

          <div class="password-field">
            <input
              v-model="form.password"
              class="input password-input"
              :type="showPassword ? 'text' : 'password'"
              placeholder="密码"
              autocomplete="current-password"
              :disabled="loading"
            />
            <button
              class="password-toggle"
              type="button"
              :disabled="loading"
              aria-label="按住查看密码"
              title="按住查看密码"
              @mousedown.prevent="showPassword = true"
              @mouseup.prevent="showPassword = false"
              @mouseleave="showPassword = false"
              @touchstart.prevent="showPassword = true"
              @touchend.prevent="showPassword = false"
              @touchcancel.prevent="showPassword = false"
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

          <div class="captcha-row">
            <input
              v-model.trim="form.captcha"
              class="input captcha-input"
              maxlength="4"
              placeholder="验证码"
              :disabled="loading || initLoading"
            />
            <button
              class="captcha-box"
              type="button"
              :disabled="loading || initLoading"
              @click="refreshCaptcha"
            >
              {{ captchaText || '加载中...' }}
            </button>
          </div>

          <button class="btn" type="submit" :disabled="loading || initLoading">
            {{ loading ? '登录中...' : '登录' }}
          </button>
        </form>

        <p v-if="errorMessage" class="error-tip">{{ errorMessage }}</p>

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
  min-height: 100vh;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(circle at top left, rgba(56, 189, 248, 0.24), transparent 26%),
    radial-gradient(circle at bottom right, rgba(250, 204, 21, 0.18), transparent 24%);
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
  border: 1px solid rgba(255, 255, 255, 0.18);
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
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
  box-shadow: 0 16px 38px rgba(0, 0, 0, 0.22);
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
  color: rgba(32, 52, 86, 0.78);
  background: rgba(79, 172, 254, 0.12);
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
  background: rgba(255, 255, 255, 0.24);
  color: #fff;
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
  color: #ffe4e6;
  font-size: 14px;
}

.tip {
  margin-top: 12px;
  font-size: 14px;
  color: #fff;
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

@media (max-width: 640px) {
  .login-page {
    padding: 14px;
  }

  .brand-header,
  .ticker-head {
    flex-direction: column;
  }

  .brand-mark {
    width: 80px;
    height: 80px;
  }

  .system-name {
    font-size: 32px;
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
</style>
