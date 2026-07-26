<template>
  <NasSsoShell title="正在完成登录" status="正在安全交换 GAK 登录凭证…" />
</template>

<script setup>
import {onMounted} from 'vue'
import {useRoute} from 'vue-router'
import {nasSsoExchangeApi} from '@/api/auth'
import NasSsoShell from '@/components/NasSsoShell.vue'
import {clearAuthState, writeAuthState} from '@/utils/authStorage'
import {buildAppPath} from '@/utils/appPaths'
import {consumeNasSsoState} from '@/utils/nasSso'

const route = useRoute()

const SAFE_FAILURE_REASONS = new Set([
  'NAS_SSO_CODE_INVALID',
  'NAS_SSO_STATE_INVALID',
  'NAS_SSO_USER_NOT_FOUND',
  'NAS_SSO_USER_INVALID',
  'NAS_SSO_TOKEN_INVALID',
  'NAS_SSO_UNAVAILABLE',
  'NAS_SSO_DISABLED',
  'USER_DISABLED'
])

function unwrapData(response) {
  const payload = response?.data
  return payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')
    ? payload.data
    : payload
}

function resolveFailureReason(error) {
  if (error?.message === '单点登录状态校验失败') {
    return 'nas_sso_state_invalid'
  }
  const responseCode = `${error?.response?.data?.code || ''}`.trim().toUpperCase()
  return SAFE_FAILURE_REASONS.has(responseCode)
    ? responseCode.toLowerCase()
    : 'nas_sso_exchange_failed'
}

onMounted(async () => {
  const code = `${route.query.code || ''}`
  const state = `${route.query.state || ''}`
  try {
    if (!code || !consumeNasSsoState(state)) {
      throw new Error('单点登录状态校验失败')
    }
    const response = await nasSsoExchangeApi({code, state})
    const {token, user} = unwrapData(response) || {}
    if (!token || !user) {
      throw new Error('单点登录响应无效')
    }
    writeAuthState(localStorage, {token, user})
    window.location.replace(buildAppPath('home'))
  } catch (error) {
    clearAuthState(localStorage)
    window.location.replace(
      `${buildAppPath('syslogin')}?reason=${resolveFailureReason(error)}`
    )
  }
})
</script>
