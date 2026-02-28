import axios from 'axios'

const request = axios.create({
  baseURL: '/api',
  timeout: 8000,
  withCredentials: true
})

request.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default request
