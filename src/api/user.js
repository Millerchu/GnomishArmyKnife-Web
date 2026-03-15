import request from '@/api/request'

// 当前登录用户的个人资料与密码修改接口。
export function updateProfileApi(data) {
  return request.put('/user/profile', data)
}

export function updatePasswordApi(data) {
  return request.put('/user/password', data)
}
