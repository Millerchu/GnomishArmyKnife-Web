export interface CaptchaResponse {
  captcha: string
}

export interface PasswordPublicKeyResponse {
  publicKey: string
}

export interface LoginRequest {
  username: string
  encryptedPassword: string
  captcha: string
}

export interface LoginResponse<TUser = Record<string, unknown>> {
  token: string
  user: TUser
}
