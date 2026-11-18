<template>
  <section class="quota-panel">
    <div class="quota-heading">
      <div><h2>套餐额度</h2><p>按账号查看厂商页面上的额度快照。所有日期为北京时间。</p></div>
      <button v-if="account && !account.archived && !editing" type="button" @click="editing = true">＋ 记录额度快照</button>
    </div>
    <p v-if="!accounts.length">请先添加要记录的 AI 账号。 <button type="button" @click="$emit('create-account')">添加账号</button></p>
    <label v-else class="quota-account">选择账号
      <select v-model="accountId" :disabled="editing">
        <option v-for="item in accounts" :key="item.id" :value="String(item.id)">{{ item.alias }} · {{ toolName(item.toolCode) }}{{ item.archived ? '（已归档）' : '' }}</option>
      </select>
    </label>
    <AiQuotaEditor v-if="editing && account" :account-id="accountId" :tool="account.toolCode"
      @saved="afterSave" @cancel="editing = false" />
    <div v-else-if="loading" role="status">正在读取额度快照…</div>
    <p v-else-if="error" role="alert">{{ error }} <button type="button" @click="load">重试</button></p>
    <template v-else-if="snapshots.length">
      <h3 class="quota-timestamp">最近记录 <time>{{ quotaDateLabel(snapshots[0].observedAt) }}</time></h3>
      <AiQuotaReadings :snapshot="snapshots[0]" />
      <AiQuotaTrend :snapshots="snapshots" />
      <div v-if="snapshots.length > 1" class="quota-history">
        <h3>历史快照</h3>
        <details v-for="snapshot in snapshots.slice(1)" :key="snapshot.id">
          <summary>{{ quotaDateLabel(snapshot.observedAt) }}</summary>
          <AiQuotaReadings :snapshot="snapshot" />
        </details>
      </div>
    </template>
    <p v-else-if="account">这个账号还没有额度快照。</p>
  </section>
</template>

<script setup>
import {computed, onBeforeUnmount, ref, watch} from 'vue'
import AiQuotaEditor from './AiQuotaEditor.vue'
import AiQuotaReadings from './AiQuotaReadings.vue'
import AiQuotaTrend from './AiQuotaTrend.vue'
import {aiPayload, listAiQuotaSnapshots} from '@/api/aiSubscriptions'
import {quotaDateLabel} from '@/utils/aiQuotaSnapshots'

const props = defineProps({accounts: {type: Array, required: true}, tools: {type: Array, required: true}})
defineEmits(['create-account'])
const accountId = ref('')
const account = computed(() => props.accounts.find(item => String(item.id) === accountId.value))
const snapshots = ref([])
const loading = ref(false), editing = ref(false), error = ref('')
let generation = 0

function toolName(code) { return props.tools.find(tool => tool.code === code)?.name || code }
async function load() {
  const current = ++generation
  error.value = ''
  snapshots.value = []
  loading.value = Boolean(accountId.value)
  if (!loading.value) return
  try {
    const result = aiPayload(await listAiQuotaSnapshots(accountId.value))
    if (current === generation) snapshots.value = result
  } catch (failure) {
    if (current === generation) error.value = failure.response?.data?.message || failure.message || '暂时无法读取额度快照'
  } finally {
    if (current === generation) loading.value = false
  }
}
function afterSave() {
  editing.value = false
  load()
}
watch(() => props.accounts, accounts => {
  if (!accounts.some(item => String(item.id) === accountId.value)) {
    editing.value = false
    const selected = accounts.find(item => !item.archived) ?? accounts[0]
    accountId.value = selected ? String(selected.id) : ''
  }
}, {immediate:true})
watch(accountId, load, {immediate:true})
onBeforeUnmount(() => { generation++ })
</script>

<style scoped>
.quota-panel{display:grid;gap:16px}
.quota-panel h2,.quota-panel h3,.quota-panel p{margin:0}
.quota-panel p,.quota-timestamp time{color:var(--theme-text-muted);font-size:13px;line-height:1.8}
.quota-heading{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.quota-account{justify-self:start;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.quota-account select{max-width:100%;min-width:0;padding:8px}
.quota-heading button,.quota-panel>p button{padding:8px 12px;border:1px solid var(--theme-border);border-radius:8px;background:var(--theme-control-surface);color:var(--theme-text);cursor:pointer}
.quota-timestamp{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
.quota-history{display:grid;gap:8px}
.quota-history details{border:1px solid var(--theme-border);border-radius:10px;padding:12px}
.quota-history summary{cursor:pointer}
.quota-history details[open] summary{margin-bottom:12px}
</style>
