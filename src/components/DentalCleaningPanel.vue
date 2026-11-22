<template>
  <section class="panel-section dental-panel">
    <header class="dental-header">
      <div>
        <h2>洁牙记录</h2>
        <p v-if="reminder" class="reminder-summary">
          <template v-if="!reminder.enabled">站内消息提醒已关闭</template>
          <template v-else-if="reminder.nextReminderDate">下次站内消息提醒 {{ reminder.nextReminderDate }}</template>
          <template v-else>新增洁牙记录后安排站内消息提醒</template>
        </p>
      </div>
      <div class="dental-actions">
        <button type="button" :disabled="!reminder || busy || loading" @click="openReminder">提醒设置</button>
        <button type="button" class="dental-primary" :disabled="busy || loading" @click="openRecord()">新增洁牙</button>
      </div>
    </header>

    <div v-if="panelError" class="dental-actions">
      <RequestErrorMessage class="dental-error" role="alert" :message="panelError.message" :error="panelError.error" />
      <button v-if="panelError.retry" type="button" :disabled="loading || busy" @click="load">重试</button>
    </div>
    <p v-if="loading" class="dental-empty" role="status">加载中…</p>
    <ul v-else-if="records.length" class="dental-history">
      <li v-for="record in records" :key="record.id" class="dental-entry">
        <div class="dental-entry-main">
          <time :datetime="record.cleaningDate">{{ record.cleaningDate }}</time>
          <strong>{{ record.hospitalName }}</strong>
          <span v-if="record.note" class="dental-note">{{ record.note }}</span>
        </div>
        <span>{{ record.amount == null ? '未记录花费' : currency.format(record.amount) }}</span>
        <div class="dental-actions">
          <button type="button" :disabled="busy" @click="openRecord(record)">编辑</button>
          <button type="button" :disabled="busy" @click="removeRecord(record)">删除</button>
        </div>
      </li>
    </ul>
    <p v-else-if="!panelError" class="dental-empty">暂无洁牙记录</p>

    <MacDialog v-model="showRecord" :title="editingId ? '编辑洁牙记录' : '新增洁牙记录'"
      :form-state="recordForm" :close-disabled="busy" width="480px">
      <form id="dental-cleaning-form" class="dental-form" @submit.prevent="submitRecord">
        <label v-for="field in DENTAL_CLEANING_FIELDS" :key="field.key">
          <span>{{ field.label }}</span>
          <textarea v-if="field.type === 'textarea'" v-model.trim="recordForm[field.key]"
            :maxlength="field.maxlength" rows="3" />
          <input v-else v-model="recordForm[field.key]" :type="field.type" :required="field.required"
            :min="field.min" :max="field.type === 'date' ? dentalToday() : field.max"
            :step="field.step" :maxlength="field.maxlength" />
        </label>
        <RequestErrorMessage v-if="dialogError" class="dental-error" role="alert"
          :message="dialogError.message" :error="dialogError.error" />
      </form>
      <template #footer>
        <button class="dental-primary" type="submit" form="dental-cleaning-form" :disabled="busy">保存记录</button>
      </template>
    </MacDialog>

    <MacDialog v-model="showReminder" title="洁牙提醒设置" :form-state="reminderForm"
      :close-disabled="busy" width="480px">
      <form id="dental-reminder-form" class="dental-form" @submit.prevent="submitReminder">
        <label class="dental-toggle">
          <input v-model="reminderForm.enabled" type="checkbox" /> 启用站内消息提醒
        </label>
        <label>
          <span>提醒周期（月）</span>
          <input v-model.number="reminderForm.intervalMonths" type="number" min="1" max="60" required />
        </label>
        <label>
          <span>提前提醒（天）</span>
          <input v-model.number="reminderForm.leadDays" type="number" min="0"
            :max="Math.min(365, (reminderForm.intervalMonths || 1) * 28 - 1)" required />
        </label>
        <p>从最近一次洁牙起计算。可填 0 天，在计划当天收到提醒。</p>
        <RequestErrorMessage v-if="dialogError" class="dental-error" role="alert"
          :message="dialogError.message" :error="dialogError.error" />
      </form>
      <template #footer>
        <button class="dental-primary" type="submit" form="dental-reminder-form" :disabled="busy">保存设置</button>
      </template>
    </MacDialog>
  </section>
</template>

<script setup>
import {onMounted, ref} from 'vue'
import {createDentalCleaning, deleteDentalCleaning, getDentalCleanings, saveDentalReminder, updateDentalCleaning} from '@/api/healthRecord'
import MacDialog from '@/components/MacDialog.vue'
import RequestErrorMessage from '@/components/RequestErrorMessage.vue'
import {confirmDialog} from '@/components/systemDialog'
import {DENTAL_CLEANING_FIELDS, dentalCleaningPayload, dentalToday, newDentalCleaning} from '@/utils/dentalCleaning'

const records = ref([])
const reminder = ref(null)
const loading = ref(true)
const busy = ref(false)
const panelError = ref(null)
const dialogError = ref(null)
const showRecord = ref(false)
const showReminder = ref(false)
const editingId = ref(null)
const recordForm = ref({})
const reminderForm = ref({})
const currency = new Intl.NumberFormat('zh-CN', {style: 'currency', currency: 'CNY'})

function errorDetail(error, fallback) {
  return {message: error?.response?.data?.message || fallback, error}
}

async function load() {
  loading.value = true
  panelError.value = null
  try {
    const {data} = await getDentalCleanings()
    records.value = data.data.records
    reminder.value = data.data.reminder
  } catch (error) {
    panelError.value = {...errorDetail(error, '洁牙记录和提醒加载失败'), retry: true}
  } finally {
    loading.value = false
  }
}

function openRecord(record) {
  editingId.value = record?.id ?? null
  recordForm.value = record ? {...record, amount: record.amount ?? '', note: record.note ?? ''} : newDentalCleaning()
  dialogError.value = null
  showRecord.value = true
}

function openReminder() {
  const {enabled, intervalMonths, leadDays} = reminder.value
  reminderForm.value = {enabled, intervalMonths, leadDays}
  dialogError.value = null
  showReminder.value = true
}

async function submitRecord() {
  if (busy.value) return
  const payload = dentalCleaningPayload(recordForm.value)
  if (!payload.hospitalName) {
    dialogError.value = {message: '请填写医院或诊所名称'}
    return
  }
  busy.value = true
  dialogError.value = null
  try {
    if (editingId.value) await updateDentalCleaning(editingId.value, payload)
    else await createDentalCleaning(payload)
    showRecord.value = false
    await load()
  } catch (error) {
    dialogError.value = errorDetail(error, '保存洁牙记录失败')
  } finally {
    busy.value = false
  }
}

async function submitReminder() {
  if (busy.value) return
  busy.value = true
  dialogError.value = null
  try {
    const {data} = await saveDentalReminder(reminderForm.value)
    reminder.value = data.data
    showReminder.value = false
  } catch (error) {
    dialogError.value = errorDetail(error, '保存洁牙提醒失败')
  } finally {
    busy.value = false
  }
}

async function removeRecord(record) {
  if (busy.value) return
  busy.value = true
  try {
    const confirmed = await confirmDialog(`将删除 ${record.cleaningDate} 的洁牙记录。`, {
      title: '删除洁牙记录？', confirmText: '删除记录'
    })
    if (!confirmed) return
    await deleteDentalCleaning(record.id)
    await load()
  } catch (error) {
    panelError.value = errorDetail(error, '删除洁牙记录失败')
  } finally {
    busy.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.dental-header, .dental-entry, .dental-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.dental-header, .dental-entry {
  justify-content: space-between;
}
.dental-header h2 {
  margin: 0;
  font-size: 20px;
}
.reminder-summary, .dental-empty, .dental-note, .dental-entry time {
  color: #a9bfd5;
  font-size: 14px;
}
.reminder-summary, .dental-empty {
  margin: 8px 0 0;
}
.dental-history {
  list-style: none;
  margin: 14px 0 0;
  padding: 0;
  border-top: 1px solid #ffffff26;
}
.dental-entry {
  padding: 10px 0;
  border-bottom: 1px solid #ffffff1a;
}
.dental-entry:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}
.dental-entry-main {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 2px;
  overflow-wrap: anywhere;
}
.dental-panel button {
  border: 0;
  border-radius: 10px;
  padding: 8px 12px;
  white-space: nowrap;
  color: #edf4ff;
  background: #ffffff17;
  cursor: pointer;
}
.dental-panel button.dental-primary, button.dental-primary {
  border: 0;
  border-radius: 10px;
  padding: 8px 12px;
  color: #052433;
  background: #5ce0c2;
  cursor: pointer;
}
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.dental-form {
  display: grid;
  gap: 12px;
  color: #edf4ff;
}
.dental-form label:not(.dental-toggle) {
  display: grid;
  gap: 6px;
}
.dental-form input:not([type='checkbox']), .dental-form textarea {
  box-sizing: border-box;
  width: 100%;
  border: 1px solid #94a3b84d;
  border-radius: 12px;
  padding: 9px 11px;
  color: #edf4ff;
  background: #122338;
  color-scheme: dark;
}
.dental-form textarea {
  resize: vertical;
}
.dental-form p {
  margin: 0;
}
.dental-error {
  color: #fca5a5;
}
@media (max-width: 540px) {
  .dental-header, .dental-entry {
    flex-wrap: wrap;
  }
  .dental-entry-main {
    flex-basis: 100%;
  }
}
</style>
