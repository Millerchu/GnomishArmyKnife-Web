<template>
  <div class="login-page">
    <div class="brand-hero">
      <img class="brand-mark" src="/brand/gnomish-army-knife-mark.svg" alt="侏儒军刀" />
      <div class="brand-copy">
        <h1 class="system-name">侏儒军刀</h1>
        <p class="system-subtitle">像一把幻想工程多功能军刀，把常用个人工具集中到一个系统里。</p>
      </div>
    </div>

    <div class="glass-box">
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
    </div>
  </div>
</template>

<script>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  getCaptchaApi,
  getPasswordPublicKeyApi,
  loginApi
} from '@/api/auth'
import { writeAuthState } from '@/utils/authStorage'
import { encryptPasswordByPublicKey } from '@/utils/rsaEncrypt'

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

    const initLoginDependencies = async () => {
      initLoading.value = true
      errorMessage.value = ''
      try {
        await Promise.all([refreshCaptcha(), loadPublicKey()])
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

      if (message) {
        return message
      }

      return '登录失败，请稍后重试'
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

    return {
      form,
      loading,
      initLoading,
      showPassword,
      captchaText,
      errorMessage,
      refreshCaptcha,
      handleLogin
    }
  }
}
</script>

<style scoped>
.login-page {
  width: 100%;
  height: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 16px;
  position: relative;
}

.brand-hero {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 22px;
}

.brand-mark {
  width: 88px;
  height: 88px;
  flex-shrink: 0;
  filter: drop-shadow(0 10px 24px rgba(2, 12, 33, 0.28));
}

.brand-copy {
  text-align: left;
}

.system-name {
  margin: 0;
  font-size: 32px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 3px 8px rgba(0, 0, 0, 0.45);
}

.system-subtitle {
  margin: 8px 0 0;
  max-width: 320px;
  font-size: 14px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.88);
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
}

.glass-box {
  width: 100%;
  max-width: 380px;
  padding: 24px 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
  text-align: center;
  color: #fff;
}

.title {
  font-size: 22px;
  margin-bottom: 20px;
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
  padding: 10px 12px;
  border-radius: 8px;
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
  min-width: 100px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.25);
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
  padding: 10px 12px;
  margin-top: 4px;
  background: linear-gradient(135deg, #4facfe, #00f2fe);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 18px;
  cursor: pointer;
}

.error-tip {
  margin-top: 12px;
  min-height: 20px;
  color: #ffd4d4;
  font-size: 14px;
}

.tip {
  margin-top: 10px;
  font-size: 14px;
  color: #fff;
}

@media (max-width: 640px) {
  .brand-hero {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }

  .brand-copy {
    text-align: center;
  }

  .system-subtitle {
    max-width: 100%;
  }
}
</style>
