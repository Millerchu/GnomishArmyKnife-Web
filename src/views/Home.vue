<template>
  <div class="home-page">

    <!-- 顶部用户栏 -->
    <div class="top-bar">
      <span class="welcome">欢迎，{{ user.displayName }}</span>
      <button class="logout-btn" @click="logout">退出</button>
    </div>

    <!-- 系统名称 -->
    <h1 class="home-title">侏儒军刀</h1>

    <!-- 工具图标网格 -->
    <div class="grid">
      <div
          v-for="tool in tools"
          :key="tool.name"
          class="tool-item"
          @click="openTool(tool)"
      >
        <div class="icon-box">
          <img :src="tool.icon" class="icon"/>
        </div>
        <p class="tool-name">{{ tool.name }}</p>
      </div>
    </div>

  </div>
</template>

<script>
import {useRouter} from 'vue-router'

export default {
  setup() {
    const router = useRouter()
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const logout = () => {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      router.push('/login')
    }

    const tools = [
      {name: '计算器', icon: '/src/assets/icons/calc.png'},
      {name: '工作日志', icon: '/src/assets/icons/log.png'},
      {name: '密码备忘录', icon: '/src/assets/icons/password.png'},
      {name: '待办事项', icon: '/src/assets/icons/todo.png'}
    ]

    const openTool = (tool) => {
      if (tool.name === '工作日志') {
        router.push('/work-log')
        return
      }
      alert(`功能【${tool.name}】后续扩展`)
    }

    return {user, logout, tools, openTool}
  }
}
</script>

<style scoped>
.home-page {
  padding: 20px;
  color: #fff;
  position: relative;
}

/* 顶部右上角用户栏 */


.top-bar {
  width: 100%;
  padding: 12px 20px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 16px;
  color: #fff;
  font-size: 16px;
}

.welcome {
  font-weight: 500;
}

.logout-btn {
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 6px;
  color: #fff;
  cursor: pointer;
  backdrop-filter: blur(6px);
}

.logout-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  padding: 6px 10px;
  border-radius: 6px;
  color: #fff;
  cursor: pointer;
  font-size: 12px;
}

.home-title {
  text-align: center;
  font-size: 26px;
  margin-top: 60px;
  margin-bottom: 20px;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
}

/* 网格布局 */
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 22px;
  padding: 10px;
}

.tool-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
}

.icon-box {
  width: 70px;
  height: 70px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  display: flex;
  justify-content: center;
  align-items: center;
}

.icon {
  width: 40px;
  height: 40px;
}

.tool-name {
  margin-top: 8px;
  font-size: 14px;
}
</style>
