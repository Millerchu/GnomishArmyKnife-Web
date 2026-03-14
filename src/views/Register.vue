<template>
  <div class="login-page">
    <div class="glass-box">
      <h2 class="title">注册</h2>

      <form class="form" @submit.prevent="handleRegister">
        <input
          v-model.trim="form.username"
          class="input"
          placeholder="用户名（username）"
          maxlength="32"
          required
          :disabled="loading"
        />

        <input
          v-model="form.password"
          class="input"
          type="password"
          minlength="6"
          maxlength="64"
          placeholder="注册密码（initialPassword）"
          required
          :disabled="loading"
        />

        <input
          v-model="form.confirmPassword"
          class="input"
          type="password"
          minlength="6"
          maxlength="64"
          placeholder="确认密码"
          required
          :disabled="loading"
        />

        <input
          v-model.trim="form.displayName"
          class="input"
          placeholder="昵称（displayName）"
          maxlength="32"
          :disabled="loading"
        />

        <input
          v-model.trim="form.phone"
          class="input"
          placeholder="手机号（phone）"
          maxlength="20"
          :disabled="loading"
        />

        <input
          v-model.trim="form.email"
          class="input"
          type="email"
          placeholder="邮箱（email）"
          maxlength="64"
          :disabled="loading"
        />

        <p class="fixed-tip">默认注册为普通用户，初始状态为启用</p>

        <button class="btn" type="submit" :disabled="loading">
          {{ loading ? '注册中...' : '注册' }}
        </button>
      </form>

      <p v-if="errorMessage" class="error-tip">{{ errorMessage }}</p>

      <p class="tip">
        已有账号？
        <router-link to="/login">去登录</router-link>
      </p>
    </div>
  </div>
</template>

<script>
import {reactive, ref} from 'vue'
import {useRouter} from 'vue-router'
import {registerApi} from '@/api/auth'

function extractErrorMessage(error, fallback) {
  const data = error?.response?.data || {}
  return data.message || data.msg || fallback
}

export default {
  setup() {
    const router = useRouter()
    const loading = ref(false)
    const errorMessage = ref('')

    const form = reactive({
      username: '',
      password: '',
      confirmPassword: '',
      displayName: '',
      phone: '',
      email: ''
    })

    const handleRegister = async () => {
      errorMessage.value = ''

      if (!form.username) {
        errorMessage.value = '请输入用户名'
        return
      }

      if (!form.password || form.password.length < 6) {
        errorMessage.value = '密码长度不能少于 6 位'
        return
      }

      if (form.password !== form.confirmPassword) {
        errorMessage.value = '两次输入的密码不一致'
        return
      }

      if (loading.value) {
        return
      }

      loading.value = true
      try {
        const payload = {
          username: form.username,
          password: form.password,
          initialPassword: form.password,
          displayName: form.displayName,
          phone: form.phone,
          email: form.email,
          roleCode: 'USER',
          status: 'ENABLED',
          enabled: true
        }

        await registerApi(payload)

        alert('注册成功，请登录')
        router.push('/login')
      } catch (err) {
        console.error(err)
        errorMessage.value = extractErrorMessage(err, '注册失败，请检查输入')
      } finally {
        loading.value = false
      }
    }

    return {
      form,
      loading,
      errorMessage,
      handleRegister
    }
  }
}
</script>

<style scoped>
.login-page {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 14px;
}

.glass-box {
  width: 100%;
  max-width: 460px;
  max-height: calc(100vh - 28px);
  overflow: auto;
  padding: 20px 18px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
  text-align: center;
  color: #fff;
}

.title {
  font-size: 24px;
  margin-bottom: 14px;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.input {
  width: 100%;
  min-height: 38px;
  padding: 8px 10px;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  outline: none;
  color: #fff;
  background: rgba(255, 255, 255, 0.18);
}

.input::placeholder {
  color: rgba(255, 255, 255, 0.72);
}

.fixed-tip {
  margin: 2px 0 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.76);
}

.btn {
  margin-top: 2px;
  min-height: 38px;
  background: linear-gradient(135deg, #5ab0ff, #7cd2ff);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.error-tip {
  margin: 12px 0 0;
  font-size: 13px;
  color: #ffd4d4;
}

.tip {
  margin-top: 14px;
  font-size: 14px;
  color: #fff;
}

.tip :deep(a) {
  color: #fff;
  text-decoration: underline;
}

@media (max-width: 480px) {
  .glass-box {
    max-width: none;
    padding: 16px 14px;
  }
}
</style>
