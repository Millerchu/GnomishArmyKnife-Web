<template>
  <NasSsoShell title="正在连接 NAS 登录状态" :status="statusText">
    <template #action>
      <router-link to="/syslogin">使用 GAK 账号登录</router-link>
    </template>
  </NasSsoShell>
</template>

<script setup>
import {onMounted, ref} from 'vue'
import NasSsoShell from '@/components/NasSsoShell.vue'
import {buildNasSsoBridgeUrl, generateNasSsoState, storeNasSsoState} from '@/utils/nasSso'

const statusText = ref('即将自动进入侏儒军刀…')

onMounted(() => {
  try {
    const state = generateNasSsoState()
    storeNasSsoState(state)
    window.location.replace(buildNasSsoBridgeUrl(state))
  } catch (error) {
    statusText.value = error?.message || '无法启动 NAS 单点登录，请使用 GAK 账号登录'
  }
})
</script>
