import {post} from './request'

export const loginApi = (data) => post('/login', data)
export const registerApi = (data) => post('/register', data)
