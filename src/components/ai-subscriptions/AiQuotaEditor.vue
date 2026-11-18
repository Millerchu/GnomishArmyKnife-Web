<template>
  <form class="quota-editor" @submit.prevent="submit">
    <label>采集时间（北京时间）
      <input v-model="observedAt" type="datetime-local" step="1" required />
    </label>
    <p>按厂商页面录入已用或剩余比例。未显示的窗口可以留空；只显示倒计时时，直接填写原文。</p>
    <fieldset v-for="(window, index) in windows" :key="index">
      <legend>{{ window.label || '自定义窗口' }}</legend>
      <div class="quota-fields">
        <label>名称<input v-model.trim="window.label" maxlength="80" required /></label>
        <label>百分比口径<select v-model="window.reading"><option value="USED">已用</option><option value="REMAINING">剩余</option></select></label>
        <label>百分比（%）<input v-model="window.percent" type="number" min="0" max="100" step="0.0001" placeholder="未显示可留空" /></label>
        <label>自动重置时间<input v-model="window.resetAt" type="datetime-local" /></label>
        <label>重置提示或额外额度状态<input v-model.trim="window.resetHint" maxlength="120" placeholder="如 7 天后重置、从不过期、未启用" /></label>
        <label v-if="tool === 'GROK'">统计期间（选填）<input v-model.trim="window.periodLabel" maxlength="80" placeholder="如 11 月 18 日至 11 月 25 日" /></label>
        <label>剩余数量<input v-model.trim="window.remaining" inputmode="numeric" pattern="[0-9]{1,24}" placeholder="如 1000000000" /></label>
        <label>数量单位<input v-model.trim="window.unit" maxlength="24" :required="Boolean(window.remaining)" placeholder="填写厂商显示的单位" /></label>
      </div>
      <div v-if="tool === 'GROK' && window.label.includes('Bot') || window.breakdown.length" class="quota-breakdown">
        <p>Grok Bot 用量明细可按来源或 Bot 命名。保留官网总数与各项的独立读数，四舍五入可能产生差异。</p>
        <div v-for="(row, rowIndex) in window.breakdown" :key="rowIndex" class="quota-fields quota-row">
          <label>分组<select v-model="row.group"><option value="SOURCE">按来源</option><option value="BOT">按 Bot</option></select></label>
          <label>项目<input v-model.trim="row.label" maxlength="80" placeholder="如你、例行任务、Bot 之间" required /></label>
          <label>占每周限额（%）<input v-model="row.percent" type="number" min="0" max="100" step="0.0001" required /></label>
          <button type="button" @click="window.breakdown.splice(rowIndex, 1)">删除明细</button>
        </div>
        <button type="button" :disabled="window.breakdown.length >= 24" @click="window.breakdown.push({group:'SOURCE', label:'', percent:''})">＋ 添加用量明细</button>
      </div>
      <button type="button" class="remove-window" :disabled="windows.length === 1" @click="windows.splice(index, 1)">移除此窗口</button>
    </fieldset>
    <button type="button" :disabled="windows.length >= 12" @click="windows.push(quotaWindow())">＋ 添加额度窗口</button>
    <fieldset v-if="tool === 'CHATGPT' || resets.length">
      <legend>手动重置机会</legend>
      <p>这里记录采集时可用的次数和到期时间。到期时间不同的机会分开填写。</p>
      <div v-for="(reset, index) in resets" :key="index" class="quota-fields quota-row">
        <label>范围<input v-model.trim="reset.label" maxlength="80" required /></label>
        <label>可用次数<input v-model.number="reset.count" type="number" min="1" max="10000" step="1" required /></label>
        <label>到期时间<input v-model="reset.expiresAt" type="datetime-local" /></label>
        <button type="button" @click="resets.splice(index, 1)">删除机会</button>
      </div>
      <button type="button" :disabled="resets.length >= 30" @click="resets.push({label:'完全重置（每周 + 5 小时）', count:1, expiresAt:''})">＋ 添加重置机会</button>
    </fieldset>
    <p v-if="error" role="alert" class="quota-error">{{ error }}</p>
    <div class="quota-actions">
      <button type="button" :disabled="saving" @click="$emit('cancel')">取消</button>
      <button type="submit" class="quota-primary" :disabled="saving">{{ saving ? '正在保存…' : '保存额度快照' }}</button>
    </div>
  </form>
</template>

<script setup>
import {ref} from 'vue'
import {aiPayload, saveAiQuotaSnapshot} from '@/api/aiSubscriptions'
import {hasQuotaReading, quotaObservationTime, quotaPayload, quotaPreset, quotaWindow} from '@/utils/aiQuotaSnapshots'

const props = defineProps({accountId: {type: String, required: true}, tool: {type: String, required: true}})
const emit = defineEmits(['saved', 'cancel', 'busy'])
const observedAt = ref(quotaObservationTime())
const windows = ref(quotaPreset(props.tool))
const resets = ref([])
const saving = ref(false)
const error = ref('')

async function submit() {
  if (saving.value) return
  error.value = ''
  const request = quotaPayload(props.accountId, observedAt.value, windows.value, resets.value)
  if (!request.windows.length || windows.value.some(window =>
    !hasQuotaReading(window) && (window.breakdown.length || window.periodLabel || window.resetAt || window.unit))) {
    error.value = '请为额度窗口填写百分比、剩余数量或状态。'
    return
  }
  saving.value = true
  emit('busy', true)
  try { emit('saved', aiPayload(await saveAiQuotaSnapshot(request))) }
  catch (failure) { error.value = failure.response?.data?.message || failure.message || '保存失败，请重试。' }
  finally { saving.value = false; emit('busy', false) }
}
</script>

<style scoped>
.quota-editor{display:grid;gap:14px;color:var(--theme-text)}
.quota-editor p{margin:0;color:var(--theme-text-muted);font-size:13px;line-height:1.6}
.quota-editor label{display:grid;gap:6px;min-width:0;font-size:13px}
.quota-editor input,.quota-editor select{width:100%;min-width:0;padding:8px;box-sizing:border-box}
.quota-editor fieldset{min-width:0;margin:0;padding:14px;border:1px solid var(--theme-border);border-radius:12px;background:var(--theme-surface-muted)}
.quota-editor legend{padding:0 6px;font-weight:600}
.quota-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(155px,100%),1fr));gap:12px}
.quota-row{align-items:end;margin:10px 0}
.quota-breakdown,.remove-window{margin-top:12px}
.quota-actions{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap}
.quota-editor button{justify-self:start;padding:8px 12px;border:1px solid var(--theme-border);border-radius:8px;background:var(--theme-control-surface);color:var(--theme-text);cursor:pointer}
.quota-editor button.quota-primary{background:var(--theme-accent-strong);color:var(--theme-on-accent)}
.quota-editor button:disabled{cursor:default;opacity:.55}
.quota-editor .quota-error{color:var(--theme-danger)}
</style>
