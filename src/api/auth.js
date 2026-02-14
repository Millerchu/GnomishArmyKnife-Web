import axios from 'axios'

const request = axios.create({
    baseURL: '/api',
    timeout: 5000
})

// 登录
export function loginApi(data) {
    return request.post('/auth/login', data)
}

// 注册
export function registerApi(data) {
    return request.post('/auth/register', data)
}

export default request
