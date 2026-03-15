import axios from 'axios'

// 全局请求实例统一处理基础路径、超时和登录态透传。
const request = axios.create({
  baseURL: '/api',
  timeout: 8000,
  withCredentials: true
})

request.interceptors.request.use((config) => {
  // 登录成功后自动附带 Bearer Token，业务接口无需重复处理鉴权头。
  const token = localStorage.getItem('token')
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default request
