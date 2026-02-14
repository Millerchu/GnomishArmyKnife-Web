<template>
  <div class="login-page">
    <div class="glass-box">
      <h2 class="title">注册</h2>

      <form class="form" @submit.prevent="handleRegister">
        <input
            v-model="form.username"
            class="input"
            placeholder="用户名"
            required
        />

        <input
            v-model="form.displayName"
            class="input"
            placeholder="昵称（显示名称）"
            required
        />

        <input
            v-model="form.password"
            class="input"
            type="password"
            placeholder="密码"
            required
        />

        <button class="btn" type="submit">注册</button>
      </form>

      <p class="tip">
        已有账号？
        <router-link to="/login">去登录</router-link>
      </p>
    </div>
  </div>
</template>

<script>
import {reactive} from 'vue'
import {useRouter} from 'vue-router'
import {registerApi} from '@/api/auth'

export default {
  setup() {
    const router = useRouter()

    const form = reactive({
      username: '',
      password: '',
      displayName: ''
    })

    const handleRegister = async () => {
      try {
        await registerApi(form)

        alert('注册成功，请登录')
        router.push('/login')
      } catch (err) {
        console.error(err)
        alert('注册失败，请检查输入')
      }
    }

    return {form, handleRegister}
  }
}
</script>

<style scoped>
/* 复用 Login.vue 样式 */
.login-page {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.glass-box {
  width: 80%;
  max-width: 340px;
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
  font-size: 24px;
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

.btn {
  padding: 10px 12px;
  background: linear-gradient(135deg, #67c23a, #9be15d);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 18px;
}

.tip {
  margin-top: 16px;
  font-size: 14px;
  color: #fff;
}
</style>
