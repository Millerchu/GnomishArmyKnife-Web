<template>
  <div class="login-page">

    <!-- 系统名称（独立显示） -->
    <h1 class="system-name">侏儒军刀</h1>

    <div class="glass-box">
      <h2 class="title">登录</h2>

      <form class="form" @submit.prevent="handleLogin">
        <input v-model="form.username" class="input" placeholder="用户名" required/>
        <input v-model="form.password" class="input" type="password" placeholder="密码" required/>
        <button class="btn" type="submit">登录</button>
      </form>

      <p class="tip">
        没有账号？
        <router-link to="/register">去注册</router-link>
      </p>
    </div>
  </div>
</template>

<script>
import {reactive} from 'vue'
import {useRouter} from 'vue-router'

export default {
  setup() {
    const router = useRouter()
    const form = reactive({username: '', password: ''})

    const handleLogin = () => {
      router.push('/home')
    }

    return {form, handleLogin}
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

/* 系统名称（独立显示） */
.system-name {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 20px;
  color: #fff;
  text-shadow: 0 3px 8px rgba(0, 0, 0, 0.45);
}

/* 毛玻璃登录框 */
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

.tip {
  margin-top: 16px;
  font-size: 14px;
  color: #fff;
}
</style>
