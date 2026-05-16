export const AUTH_TOKEN_STORAGE_KEY = 'token'
export const AUTH_USER_STORAGE_KEY = 'user'

export function readAuthState(storage = localStorage) {
  const token = storage.getItem(AUTH_TOKEN_STORAGE_KEY) || ''
  const rawUser = storage.getItem(AUTH_USER_STORAGE_KEY)

  if (!rawUser) {
    return {
      token,
      user: null
    }
  }

  try {
    return {
      token,
      user: JSON.parse(rawUser)
    }
  } catch (error) {
    return {
      token,
      user: null
    }
  }
}

export function writeAuthState(storage = localStorage, {token = '', user = null} = {}) {
  storage.setItem(AUTH_TOKEN_STORAGE_KEY, token || '')
  storage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user || {}))
}

export function clearAuthState(storage = localStorage) {
  storage.removeItem(AUTH_TOKEN_STORAGE_KEY)
  storage.removeItem(AUTH_USER_STORAGE_KEY)
}
