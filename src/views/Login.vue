<template>
  <div class="login-page">
    <h1 class="system-name">侏儒军刀</h1>

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

        <input
          v-model="form.password"
          class="input"
          type="password"
          placeholder="密码"
          autocomplete="current-password"
          :disabled="loading"
        />

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
import { encryptPasswordByPublicKey } from '@/utils/rsaEncrypt'

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
    const captchaText = ref('')
    const publicKey = ref('')
    const errorMessage = ref('')

    const refreshCaptcha = async () => {
      const res = await getCaptchaApi()
      captchaText.value = res?.data?.captcha || ''
    }

    const loadPublicKey = async () => {
      const res = await getPasswordPublicKeyApi()
      publicKey.value = res?.data?.publicKey || ''
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

      const rawMessage = (
        error.response?.data?.message ||
        error.response?.data?.msg ||
        error.response?.data?.error ||
        ''
      )
        .toString()
        .toLowerCase()

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

        const { token, user } = res.data || {}
        localStorage.setItem('token', token || '')
        localStorage.setItem('user', JSON.stringify(user || {}))

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

.system-name {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 20px;
  color: #fff;
  text-shadow: 0 3px 8px rgba(0, 0, 0, 0.45);
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

.input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: none;
  font-size: 16px;
  text-align: center;
  outline: none;
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
</style>
