<template>
  <section class="ai-sync-panel" aria-labelledby="ai-sync-title">
    <header><h3 id="ai-sync-title">官方费用同步</h3></header>
    <p class="sync-explain">同步 OpenAI 组织或 xAI 团队最近 35 个完整 UTC 日的开发者 API 费用。个人套餐额度请手动记录。同一组织只关联一个账号，避免重复统计。</p>
    <p v-if="!eligible.length" class="sync-note">添加 ChatGPT 或 Grok 账号后可配置对应的 API 授权。</p>
    <template v-else>
      <label class="sync-field">关联账号<select v-model="accountId" :disabled="busy"><option v-for="account in eligible" :key="account.id" :value="String(account.id)">{{ account.alias }} · {{ account.toolCode === 'GROK' ? 'xAI' : 'OpenAI' }}</option></select></label>
      <p v-if="loading" role="status">正在读取同步配置…</p>
      <p v-if="error" class="sync-error" role="alert">{{ error }} <button v-if="!connection" type="button" @click="load">重试</button></p>
      <template v-if="connection && !loading">
        <p class="sync-note">{{ connection.enabled ? '已配置授权' : '尚未配置授权' }} · 最后成功：{{ connection.lastSuccessAt ? new Date(connection.lastSuccessAt).toLocaleString() : '尚未成功同步' }}</p>
        <p v-if="!connection.serverConfigured" class="sync-note">服务端尚未配置同步加密主密钥，暂时不能保存授权。手动记录仍可使用。</p>
        <form v-if="editing" @submit.prevent="save">
          <label v-if="isGrok" class="sync-field">xAI 团队 ID<input v-model.trim="teamId" required maxlength="36" :readonly="Boolean(connection.teamId)" :disabled="busy" /></label>
          <label class="sync-field">{{ isGrok ? 'Management API Key' : 'Admin API Key' }}<input v-model="apiKey" type="password" autocomplete="new-password" required maxlength="512" :disabled="busy" placeholder="仅用于服务端调用官方账单 API" /></label>
          <label class="sync-field">每日检查时区<input v-model.trim="zoneId" required maxlength="64" :disabled="busy" placeholder="Asia/Shanghai" /></label>
          <div class="sync-actions"><button type="submit" :disabled="busy || !connection.serverConfigured">{{ busy ? '正在保存…' : '保存授权' }}</button><button type="button" :disabled="busy" @click="cancelEdit">取消</button></div>
        </form>
        <div v-else class="sync-actions">
          <button type="button" :disabled="busy || !connection.serverConfigured" @click="editing = true">{{ connection.enabled ? '更换授权' : '配置授权' }}</button>
          <button v-if="connection.enabled" type="button" :disabled="busy || inFlight" @click="refresh">手动同步</button>
          <button v-if="connection.enabled" type="button" :disabled="busy" @click="revoke">撤销本应用授权</button>
        </div>
        <p v-if="job" role="status" class="sync-note">{{ statusLabels[job.status] || job.status }}<template v-if="job.errorCode"> · {{ errorLabels[job.errorCode] || '同步未完成，请稍后重试' }}</template></p>
        <p v-if="pollExpired" class="sync-note">任务仍在后台处理。<button type="button" @click="resumePoll">重新检查任务</button></p>
      </template>
    </template>
  </section>
</template>
<script setup>
import {computed, onBeforeUnmount, ref, watch} from 'vue'
import {getAiSyncConnection, saveAiSyncConnection, revokeAiSyncConnection, runAiSync, getAiSyncJob} from '@/api/aiSync'
const props = defineProps({accounts: {type: Array, default: () => []}})
const emit = defineEmits(['updated'])
const eligible = computed(() => props.accounts.filter(account => !account.archived && ['CHATGPT', 'GROK'].includes(account.toolCode)))
const accountId = ref('')
const isGrok = computed(() => eligible.value.some(account => String(account.id) === accountId.value && account.toolCode === 'GROK'))
const teamId = ref('')
const connection = ref(null)
const loading = ref(false)
const busy = ref(false)
const error = ref('')
const editing = ref(false)
const apiKey = ref('')
const zoneId = ref('Asia/Shanghai')
const job = ref(null)
const pollExpired = ref(false)
const inFlight = computed(() => ['QUEUED', 'RUNNING', 'RETRY'].includes(job.value?.status))
let generation = 0
let timer
let alive = true
const statusLabels = {QUEUED: '等待同步', RUNNING: '正在同步', RETRY: '等待重试', SUCCEEDED: '同步完成', FAILED: '同步失败', CANCELLED: '同步已取消'}
const errorLabels = {AUTH_REQUIRED: '授权已失效，请重新配置', KEY_REAUTH_REQUIRED: '需要重新配置授权', RATE_LIMITED: '平台限流，后台将按允许时间重试', MAX_ATTEMPTS: '已达到重试上限，可手动重试', PROVIDER_UNAVAILABLE: '平台暂时不可用', SERVER_KEY_NOT_CONFIGURED: '服务端加密配置不可用'}
function payload(response) {
  if (String(response?.data?.code) !== '0') throw new Error(response?.data?.message || '同步操作失败')
  return response.data.data
}
function message(failure) { return failure?.response?.data?.message || failure?.message || '同步操作失败，请稍后重试' }
function cancelEdit() { apiKey.value = ''; editing.value = false }
async function load() {
  const current = ++generation
  clearTimeout(timer)
  job.value = null; pollExpired.value = false; connection.value = null; error.value = ''; cancelEdit()
  if (!accountId.value) return
  loading.value = true
  try {
    const result = payload(await getAiSyncConnection(accountId.value))
    if (!alive || current !== generation) return
    connection.value = result; zoneId.value = result.zoneId || 'Asia/Shanghai'; teamId.value = result.teamId || ''
  } catch (failure) { if (alive && current === generation) error.value = message(failure) }
  finally { if (alive && current === generation) loading.value = false }
}
async function save() {
  if (busy.value) return
  busy.value = true; error.value = ''
  try {
    connection.value = payload(await saveAiSyncConnection(accountId.value, {apiKey: apiKey.value, zoneId: zoneId.value, teamId: isGrok.value ? teamId.value : null}))
    cancelEdit()
  } catch (failure) { error.value = message(failure) }
  finally { apiKey.value = ''; busy.value = false }
}
async function revoke() {
  if (busy.value) return
  busy.value = true; error.value = ''
  try {
    payload(await revokeAiSyncConnection(accountId.value))
    await load()
  } catch (failure) { error.value = message(failure) }
  finally { busy.value = false }
}
async function refresh() {
  if (busy.value) return
  busy.value = true; error.value = ''; pollExpired.value = false
  try {
    job.value = payload(await runAiSync(accountId.value))
    poll(job.value.id, generation, 0)
  } catch (failure) { error.value = message(failure) }
  finally { busy.value = false }
}
function poll(id, current, attempt) {
  clearTimeout(timer)
  if (!alive || current !== generation || !inFlight.value) return
  if (attempt >= 90) { pollExpired.value = true; return }
  timer = setTimeout(async () => {
    try {
      const result = payload(await getAiSyncJob(id))
      if (!alive || current !== generation) return
      job.value = result
      if (inFlight.value) poll(id, current, attempt + 1)
      else {
        const latest = payload(await getAiSyncConnection(accountId.value))
        if (!alive || current !== generation) return
        connection.value = latest
        if (result.status === 'SUCCEEDED') emit('updated')
      }
    } catch (failure) {
      if (!alive || current !== generation) return
      if (inFlight.value) poll(id, current, attempt + 1)
      else error.value = message(failure)
    }
  }, 2000)
}
function resumePoll() {
  pollExpired.value = false
  if (job.value?.id) poll(job.value.id, generation, 0)
}
watch(eligible, accounts => {
  if (!accounts.some(account => String(account.id) === accountId.value)) accountId.value = accounts.length ? String(accounts[0].id) : ''
}, {immediate: true})
watch(accountId, load, {immediate: true})
onBeforeUnmount(() => { alive = false; generation++; clearTimeout(timer); apiKey.value = '' })
</script>
<style scoped>
.ai-sync-panel{padding:22px;border:1px solid var(--theme-border);border-radius:14px;background:var(--theme-surface-muted);margin-top:24px;color:var(--theme-text)}.ai-sync-panel header{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}h3{margin:0;font-size:18px}.sync-explain,.sync-note{font-size:12px;line-height:1.8;color:var(--theme-text-muted)}.sync-field{display:flex;flex-direction:column;gap:7px;font-size:12px;margin:14px 0}.sync-field input,.sync-field select{box-sizing:border-box;width:100%;max-width:460px;border:1px solid var(--theme-border-strong);border-radius:7px;padding:10px;background:var(--theme-field-surface);color:var(--theme-text);font:inherit}.sync-actions{display:flex;flex-wrap:wrap;gap:8px}.ai-sync-panel button{border:1px solid var(--theme-border-strong);border-radius:7px;padding:8px 12px;background:var(--theme-control-surface);color:var(--theme-text);cursor:pointer;font-size:12px}.ai-sync-panel button:disabled{opacity:.5;cursor:default}.ai-sync-panel button:focus-visible,.sync-field input:focus-visible,.sync-field select:focus-visible{outline:2px solid var(--theme-accent);outline-offset:2px}.sync-error{color:var(--theme-danger);font-size:13px}
</style>
