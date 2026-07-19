<template>
  <MacDialog
    :model-value="modelValue"
    title="快速新增"
    subtitle="选择新增类型后，直接填写对应应用的数据。"
    width="920px"
    panel-class="quick-create-dialog"
    mobile-presentation="fullScreen"
    :close-disabled="submitting"
    @update:model-value="handleVisibleChange"
    @cancel="requestClose"
  >
    <div class="quick-create-shell">
      <label class="type-picker">
        <span>新增类型</span>
        <select :value="selectedTypeCode" :disabled="submitting" @change="handleTypeChange">
          <option value="">请先选择新增类型</option>
          <optgroup v-for="group in groupedTypes" :key="group.name" :label="group.name">
            <option v-for="item in group.items" :key="item.typeCode" :value="item.typeCode">{{ item.label }}</option>
          </optgroup>
        </select>
      </label>

      <div v-if="!types.length" class="quick-empty">当前账号没有可快速新增的应用权限。</div>
      <div v-else-if="!activeType" class="quick-empty">
        <strong>从一个小动作开始</strong>
        <span>选择上方类型，表单会在这里展开。</span>
      </div>

      <form v-else id="quick-create-form" class="quick-form" :class="{'personal-bill-quick-form': activeType.typeCode === 'PERSONAL_BILL'}" @submit.prevent="submit">
        <header class="form-heading">
          <div class="form-mark" :style="activeApp?.iconStyle">
            <AuthenticatedImage
              v-if="activeApp?.iconType === 'UPLOAD' && activeApp?.iconAttachmentId"
              :attachment-id="activeApp.iconAttachmentId"
              :alt="activeType.appName"
            />
            <AppIconImage
              v-else-if="usesImageIcon(activeApp?.iconType) && activeApp?.iconUrl"
              img-class="form-mark-image"
              :src="activeApp.iconUrl"
              :alt="activeType.appName"
              :chroma-key="activeApp.iconChromaKey"
            />
            <span v-else-if="activeApp?.iconType === 'PRESET'" class="form-mark-preset" v-html="getPresetIconSvg(activeApp.iconPreset)" />
            <span v-else>{{ activeApp?.iconText || activeType.appName.slice(0, 1) }}</span>
          </div>
          <div><strong>{{ activeType.label }}</strong><span>{{ activeType.appName }}</span></div>
        </header>
        <p v-if="loadError" class="form-error">{{ loadError }}</p>
        <div class="field-grid">
          <label v-for="field in activeType.fields" :key="field.key" class="form-field" :class="[{'wide-field': ['textarea', 'work-items'].includes(field.type)}, `field-${field.key}`]">
            <span>{{ field.label }}<b v-if="field.required"> *</b></span>
            <textarea v-if="field.type === 'textarea'" v-model.trim="form[field.key]" :rows="field.rows || 3" :maxlength="field.maxlength" :placeholder="field.placeholder" />
            <select v-else-if="field.type === 'select'" v-model="form[field.key]" :required="field.required">
              <option v-for="option in field.options" :key="option[0]" :value="option[0]">{{ option[1] }}</option>
            </select>
            <select v-else-if="field.type === 'package-select'" v-model="form[field.key]" :required="field.required" :disabled="loadingDependencies">
              <option value="">{{ loadingDependencies ? '正在加载软件列表...' : '请选择所属软件' }}</option>
              <option v-for="item in packages" :key="item.id" :value="item.id">{{ item.softwareName || item.name }}</option>
            </select>
            <select v-else-if="field.type === 'dictionary-select'" v-model="form[field.key]" :required="field.required" :disabled="loadingDependencies || !dictionaryOptions[field.key]?.length">
              <option value="">{{ loadingDependencies ? '正在加载字典...' : (dictionaryOptions[field.key]?.length ? '请选择' : '暂无可用字典项') }}</option>
              <option v-for="item in dictionaryOptions[field.key]" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
            <div v-else-if="field.type === 'dictionary-multi'" class="dictionary-checks">
              <label v-for="item in dictionaryOptions[field.key]" :key="item.value" :class="{selected: form[field.key]?.includes(item.value)}">
                <input v-model="form[field.key]" type="checkbox" :value="item.value" /><span>{{ item.label }}</span>
              </label>
              <span v-if="!loadingDependencies && !dictionaryOptions[field.key]?.length" class="dictionary-empty">暂无可用字典项</span>
            </div>
            <div v-else-if="field.type === 'work-items'" class="work-item-editor">
              <div v-for="(workItem, index) in form[field.key]" :key="index" class="work-item-row">
                <span class="work-item-index">{{ index + 1 }}</span>
                <input
                  v-model="form[field.key][index]"
                  type="text"
                  maxlength="4000"
                  :placeholder="index === 0 ? '填写工作内容、处理结果或跟进结论' : '继续添加工作事项'"
                />
                <button type="button" :disabled="form[field.key].length === 1" @click.prevent="removeWorkItem(field.key, index)">移除</button>
              </div>
              <button type="button" class="work-item-add" @click.prevent="addWorkItem(field.key)">＋ 添加一条</button>
            </div>
            <label v-else-if="field.type === 'checkbox'" class="check-control">
              <input v-model="form[field.key]" type="checkbox" /><span>是</span>
            </label>
            <input v-else v-model="form[field.key]" :type="field.inputType || field.type" :required="field.required" :min="field.min" :max="field.max" :step="field.step" :maxlength="field.maxlength" :placeholder="field.placeholder" />
          </label>
        </div>
        <p v-if="submitError" class="form-error">{{ submitError }}</p>
      </form>
    </div>
    <template v-if="activeType" #footer>
      <button form="quick-create-form" type="submit" class="quick-submit" :disabled="submitting || loadingDependencies">
        {{ submitting ? '提交中...' : '保存新增' }}
      </button>
    </template>
  </MacDialog>
</template>

<script setup>
import {computed, reactive, ref, watch} from 'vue'
import MacDialog from '@/components/MacDialog.vue'
import AppIconImage from '@/components/AppIconImage.vue'
import AuthenticatedImage from '@/components/AuthenticatedImage.vue'
import {createWorkLog} from '@/api/workLog'
import {createPasswordMemo} from '@/api/passwordMemo'
import {createTodoTask} from '@/api/todoList'
import {createFuelRecord} from '@/api/fuelStats'
import {createWowCharacter} from '@/api/wowCharacter'
import {createAnnualBudget, createPersonalBill} from '@/api/personalBills'
import {createKnowledgeEntry} from '@/api/knowledgeBase'
import {createSoftwarePackage, createSoftwareVersion, listSoftwarePackages} from '@/api/softwareRepo'
import {createHealthRecord, createHealthReport, createHealthVisit} from '@/api/healthRecord'
import {listDataDictionaryOptionsByUsage} from '@/api/dataDictionary'
import {serializeWorkItemEntries} from '@/utils/workLogCalendar'
import {getPresetIconSvg} from '@/constants/appIconLibrary'

const props = defineProps({
  modelValue: Boolean,
  types: {type: Array, default: () => []},
  apps: {type: Array, default: () => []},
  currentUser: {type: Object, default: () => ({})}
})
const emit = defineEmits(['update:modelValue', 'success'])
const selectedTypeCode = ref('')
const submitting = ref(false)
const loadingDependencies = ref(false)
const submitError = ref('')
const loadError = ref('')
const packages = ref([])
const dictionaryOptions = reactive({})
const form = reactive({})
const initialSnapshot = ref('{}')

const activeType = computed(() => props.types.find((item) => item.typeCode === selectedTypeCode.value) || null)
const activeApp = computed(() => props.apps.find((item) => item.featureCode === activeType.value?.featureCode) || null)
const groupedTypes = computed(() => {
  const groups = new Map()
  props.types.forEach((item) => groups.set(item.appName, [...(groups.get(item.appName) || []), item]))
  return Array.from(groups, ([name, items]) => ({name, items}))
})
const isDirty = computed(() => Boolean(activeType.value) && JSON.stringify(form) !== initialSnapshot.value)

function unwrapData(response) {
  const payload = response?.data
  return payload && Object.prototype.hasOwnProperty.call(payload, 'data') ? payload.data : payload
}

function resetForm(type = activeType.value) {
  Object.keys(form).forEach((key) => delete form[key])
  if (type) Object.assign(form, type.defaults())
  initialSnapshot.value = JSON.stringify(form)
  submitError.value = ''
  loadError.value = ''
}

async function loadDependencies(type) {
  packages.value = []
  Object.keys(dictionaryOptions).forEach((key) => delete dictionaryOptions[key])
  const dictionaryFields = type?.fields?.filter((field) => field.dictionaryUsage) || []
  if (!type?.loadPackages && !dictionaryFields.length) return
  loadingDependencies.value = true
  try {
    const tasks = []
    if (type.loadPackages) {
      tasks.push(listSoftwarePackages({pageNo: 1, pageSize: 100}).then((response) => {
        const payload = unwrapData(response) || {}
        packages.value = payload.list || payload.records || payload.items || (Array.isArray(payload) ? payload : [])
      }))
    }
    dictionaryFields.forEach((field) => {
      tasks.push(listDataDictionaryOptionsByUsage(field.dictionaryUsage).then((response) => {
        const payload = unwrapData(response)
        const list = Array.isArray(payload) ? payload : payload?.list || payload?.items || []
        dictionaryOptions[field.key] = list.map((item) => ({
          value: item.itemValue || item.value || item.itemCode || item.code || '',
          label: item.itemLabel || item.label || item.itemValue || item.value || '',
          isDefault: Boolean(item.isDefault)
        })).filter((item) => item.value && item.label)
        const currentValue = form[field.key]
        if (field.type === 'dictionary-multi' && !currentValue?.length) {
          form[field.key] = dictionaryOptions[field.key].filter((item) => item.isDefault).map((item) => item.value)
        } else if (field.type === 'dictionary-select' && !currentValue) {
          form[field.key] = dictionaryOptions[field.key].find((item) => item.isDefault)?.value || ''
        }
      }))
    })
    await Promise.all(tasks)
    initialSnapshot.value = JSON.stringify(form)
  } catch (error) {
    loadError.value = error?.response?.data?.message || '表单选项加载失败，请稍后重试。'
  } finally {
    loadingDependencies.value = false
  }
}

async function handleTypeChange(event) {
  const nextCode = event.target.value
  if (isDirty.value && !window.confirm('当前填写内容尚未保存，确认切换新增类型吗？')) {
    event.target.value = selectedTypeCode.value
    return
  }
  selectedTypeCode.value = nextCode
  resetForm()
  await loadDependencies(activeType.value)
}

function requestClose() {
  if (submitting.value) return
  if (isDirty.value && !window.confirm('当前填写内容尚未保存，确认关闭吗？')) return
  emit('update:modelValue', false)
}

function handleVisibleChange(value) {
  if (!value) requestClose()
}

function nullable(value) { return value === '' || value === undefined ? null : value }
function numeric(value) { return value === '' || value === null ? null : Number(value) }
function usesImageIcon(iconType) { return ['UPLOAD', 'URL'].includes(iconType) }
function addWorkItem(fieldKey) { form[fieldKey].push('') }
function removeWorkItem(fieldKey, index) {
  if (form[fieldKey].length > 1) form[fieldKey].splice(index, 1)
}

function buildPayload(type) {
  const payload = {...form}
  if (type.api === 'workLog') {
    payload.userId = props.currentUser.id ?? props.currentUser.userId
    payload.typeCodes = Array.isArray(form.typeCodes) ? [...form.typeCodes] : []
    payload.personDay = Number(form.personDay)
    payload.overtimeHours = Number(form.overtimeHours || 0)
    payload.workItem = serializeWorkItemEntries(form.workItems)
    delete payload.workItems
  }
  if (type.api === 'todo') {
    payload.steps = `${form.stepsText}`.split('\n').map((title) => title.trim()).filter(Boolean).map((title, index) => ({title, done: false, sortNo: index + 1}))
    delete payload.stepsText
    payload.reminderAt = nullable(payload.reminderAt)
    payload.dueDate = nullable(payload.dueDate)
  }
  if (type.api === 'fuel') ['odometerKm', 'fuelVolume', 'totalAmount', 'discountedAmount', 'unitPrice'].forEach((key) => { payload[key] = numeric(payload[key]) })
  if (type.api === 'bill') payload.amount = numeric(payload.amount)
  if (type.api === 'wow') {
    Object.assign(payload, {level: Number(form.level), itemLevel: Number(form.itemLevel), mythicBestLevel: Number(form.mythicBestLevel || 0), mythicRuns: [], weeklyVaults: [], keybindings: []})
  }
  if (type.api === 'knowledge') {
    payload.tags = `${form.tagsText}`.split(/[,，]/).map((item) => item.trim()).filter(Boolean)
    delete payload.tagsText
    payload.source = nullable(payload.source)
  }
  if (type.api === 'healthRecord') Object.keys(payload).filter((key) => !['measureDate', 'note'].includes(key)).forEach((key) => { payload[key] = numeric(payload[key]) })
  if (type.api === 'healthVisit' || type.api === 'healthReport') Object.keys(payload).forEach((key) => { if (key !== 'visitId') payload[key] = nullable(payload[key]) })
  if (type.api === 'healthReport') payload.visitId = numeric(payload.visitId)
  return payload
}

const apiHandlers = {
  workLog: (payload) => createWorkLog(payload), passwordMemo: (payload) => createPasswordMemo(payload), todo: (payload) => createTodoTask(payload),
  fuel: (payload) => createFuelRecord(payload), wow: (payload) => createWowCharacter(payload), bill: (payload) => createPersonalBill(payload),
  budget: (payload) => createAnnualBudget(payload), knowledge: (payload) => createKnowledgeEntry(payload), software: (payload) => createSoftwarePackage(payload),
  softwareVersion: (payload) => { const packageId = payload.packageId; delete payload.packageId; return createSoftwareVersion(packageId, payload) },
  healthRecord: (payload) => createHealthRecord(payload), healthVisit: (payload) => createHealthVisit(payload), healthReport: (payload) => createHealthReport(payload)
}

async function submit() {
  if (!activeType.value || submitting.value) return
  submitError.value = ''
  const passwordIdentityMissing = activeType.value.api === 'passwordMemo' && !form.username && !form.registeredPhone && !form.registeredEmail
  if (passwordIdentityMissing) { submitError.value = '用户名、注册手机、注册邮箱至少填写一项。'; return }
  if (activeType.value.api === 'fuel' && Number(form.discountedAmount) > Number(form.totalAmount)) { submitError.value = '优惠后金额不能大于加油金额。'; return }
  if (activeType.value.api === 'bill' && Number(form.amount) <= 0) { submitError.value = '账单金额必须大于 0。'; return }
  if (activeType.value.api === 'workLog' && !serializeWorkItemEntries(form.workItems)) { submitError.value = '请至少填写一条工作内容。'; return }
  submitting.value = true
  try {
    await apiHandlers[activeType.value.api](buildPayload(activeType.value))
    const message = activeType.value.api === 'knowledge' && `${props.currentUser.roleCode || props.currentUser.role}`.toUpperCase() !== 'ADMIN'
      ? '投稿已提交，等待管理员审核'
      : `${activeType.value.label}成功`
    emit('success', message)
    emit('update:modelValue', false)
    selectedTypeCode.value = ''
    resetForm(null)
  } catch (error) {
    submitError.value = error?.response?.data?.message || error?.message || '保存失败，请检查后重试。'
  } finally {
    submitting.value = false
  }
}

watch(() => props.modelValue, (visible) => { if (visible && !selectedTypeCode.value) resetForm(null) })
</script>

<style scoped>
.quick-create-shell {
  display: grid;
  gap: 18px;
  color: var(--theme-text);
}

.type-picker {
  display: grid;
  gap: 9px;
  padding: 16px 18px;
  border: 1px solid var(--theme-border);
  border-radius: 16px;
  background:
    linear-gradient(180deg, var(--theme-highlight-soft), transparent),
    var(--theme-surface-muted);
  box-shadow:
    var(--theme-shadow-xs),
    inset 0 1px 0 var(--theme-highlight-soft);
}

.type-picker > span,
.form-field > span {
  color: var(--theme-text-soft);
  font-size: 13px;
  font-weight: 700;
}

.type-picker select,
.form-field input,
.form-field select,
.form-field textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid var(--theme-border-strong);
  border-radius: 12px;
  background: var(--theme-field-surface);
  color: var(--theme-text);
  font: inherit;
  outline: none;
}

.type-picker select:focus,
.form-field input:focus,
.form-field select:focus,
.form-field textarea:focus {
  border-color: var(--theme-accent);
  box-shadow: 0 0 0 3px var(--theme-focus-ring);
}

.quick-empty {
  min-height: 210px;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 8px;
  padding: 28px;
  border: 1px dashed var(--theme-border-strong);
  border-radius: 18px;
  background:
    radial-gradient(circle at 50% 34%, var(--theme-accent-soft), transparent 28%),
    var(--theme-surface-muted);
  color: var(--theme-text-muted);
  text-align: center;
}

.quick-empty::before {
  content: '+';
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  margin-bottom: 4px;
  border: 1px solid color-mix(in srgb, var(--theme-accent) 28%, var(--theme-border));
  border-radius: 13px;
  background: var(--theme-accent-soft);
  color: var(--theme-accent);
  font-size: 25px;
  font-weight: 500;
}

.quick-empty strong {
  color: var(--theme-text);
  font-size: 20px;
}

.quick-empty span {
  font-size: 14px;
}

.quick-form {
  display: grid;
  gap: 18px;
}

.form-heading {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--theme-divider);
}

.form-heading > div:last-child {
  display: grid;
  gap: 2px;
}

.form-heading strong {
  color: var(--theme-text);
  font-size: 20px;
}

.form-heading span {
  color: var(--theme-text-muted);
  font-size: 12px;
}

.form-mark {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 1px solid var(--theme-border);
  border-radius: 13px;
  background: linear-gradient(145deg, var(--theme-accent), var(--theme-accent-strong));
  box-shadow: var(--theme-shadow-xs);
  color: #fff;
  font-weight: 800;
}

.form-mark-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.form-mark-preset {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
}

.form-mark-preset:deep(svg) {
  width: 24px;
  height: 24px;
  fill: currentColor;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 15px;
}

.form-field {
  display: grid;
  align-content: start;
  gap: 7px;
}

.form-field b {
  color: var(--theme-danger);
}

.wide-field {
  grid-column: 1 / -1;
}

.form-field textarea {
  min-height: 86px;
  resize: vertical;
}

.check-control {
  min-height: 41px;
  display: flex !important;
  align-items: center;
  gap: 8px;
}

.check-control input {
  width: 18px !important;
  height: 18px;
}

.form-error {
  margin: 0;
  padding: 10px 12px;
  border: 1px solid color-mix(in srgb, var(--theme-danger) 26%, transparent);
  border-radius: 10px;
  background: var(--theme-danger-soft);
  color: var(--theme-danger);
  font-size: 13px;
}

.quick-submit {
  min-height: 38px;
  padding: 9px 20px;
  border: 1px solid color-mix(in srgb, var(--theme-accent) 72%, var(--theme-border));
  border-radius: 999px;
  background: linear-gradient(180deg, var(--theme-accent), var(--theme-accent-strong));
  box-shadow:
    var(--theme-shadow-xs),
    inset 0 1px 0 rgba(255, 255, 255, 0.24);
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

.quick-submit:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.dictionary-checks {
  min-height: 42px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 7px;
  border: 1px solid var(--theme-border);
  border-radius: 12px;
  background: var(--theme-surface-muted);
}

.dictionary-checks label {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: 1px solid var(--theme-border);
  border-radius: 999px;
  background: var(--theme-control-surface);
  color: var(--theme-text-soft);
  cursor: pointer;
}

.dictionary-checks label.selected {
  border-color: color-mix(in srgb, var(--theme-accent) 48%, var(--theme-border));
  background: var(--theme-accent-soft);
  color: var(--theme-text);
}

.dictionary-checks input {
  width: 15px !important;
  height: 15px;
}

.dictionary-empty {
  padding: 5px 8px;
  color: var(--theme-text-muted);
  font-size: 13px;
}

.work-item-editor {
  display: grid;
  gap: 10px;
}

.work-item-row {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
}

.work-item-index {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  background: var(--theme-accent-soft);
  color: var(--theme-accent);
  font-size: 12px;
  font-weight: 800;
}

.work-item-row button,
.work-item-add {
  padding: 9px 12px;
  border: 1px solid var(--theme-border);
  border-radius: 9px;
  background: var(--theme-control-surface);
  color: var(--theme-text-soft);
  cursor: pointer;
}

.work-item-row button:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}

.work-item-add {
  justify-self: start;
  border-color: color-mix(in srgb, var(--theme-accent) 36%, var(--theme-border));
  color: var(--theme-accent);
  font-weight: 700;
}

.personal-bill-quick-form {
  padding: 18px;
  border: 1px solid var(--theme-border);
  border-radius: 20px;
  background:
    radial-gradient(circle at 100% 0, var(--theme-accent-soft), transparent 38%),
    var(--theme-surface-muted);
}

.personal-bill-quick-form .field-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.personal-bill-quick-form .field-amount,
.personal-bill-quick-form .field-categoryName,
.personal-bill-quick-form .field-accountName,
.personal-bill-quick-form .field-paymentMethod,
.personal-bill-quick-form .field-merchantName {
  grid-column: span 2;
}

.personal-bill-quick-form .field-note {
  grid-column: 1 / -1;
}

.personal-bill-quick-form .form-field input,
.personal-bill-quick-form .form-field select,
.personal-bill-quick-form .form-field textarea {
  border-color: var(--theme-border-strong);
  background: var(--theme-field-surface);
  color: var(--theme-text);
  color-scheme: inherit;
}

.personal-bill-quick-form .field-amount {
  position: relative;
}

.personal-bill-quick-form .field-amount input {
  height: 58px;
  padding-right: 42px;
  border-color: color-mix(in srgb, var(--theme-accent) 42%, var(--theme-border));
  font-size: 25px;
  font-weight: 800;
}

.personal-bill-quick-form .field-amount::after {
  content: '¥';
  position: absolute;
  right: 14px;
  bottom: 13px;
  color: var(--theme-accent);
  font-size: 21px;
  font-weight: 900;
}

@media (max-width: 720px) {
  .quick-create-shell,
  .quick-form {
    gap: 16px;
  }

  .field-grid {
    grid-template-columns: 1fr;
  }

  .wide-field {
    grid-column: auto;
  }

  .type-picker {
    padding: 14px;
    border-radius: 18px;
  }

  .type-picker > span,
  .form-field > span {
    font-size: 14px !important;
    line-height: 1.4;
  }

  .type-picker select,
  .form-field input,
  .form-field select {
    min-height: 44px;
    font-size: 16px !important;
  }

  .type-picker select optgroup,
  .type-picker select option {
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", sans-serif !important;
    line-height: 1.45 !important;
  }

  .type-picker select optgroup {
    font-size: 14px !important;
    font-weight: 700;
  }

  .type-picker select option {
    font-size: 16px !important;
    font-weight: 500;
  }

  .form-field textarea {
    min-height: 104px;
    font-size: 16px;
  }

  .quick-empty {
    min-height: 160px;
  }

  .work-item-row {
    grid-template-columns: 26px minmax(0, 1fr);
  }

  .work-item-row button {
    grid-column: 2;
    justify-self: end;
    min-height: 44px;
    padding: 8px 12px;
  }

  .work-item-add,
  .quick-submit,
  .check-control {
    min-height: 44px;
  }

  .dictionary-checks label {
    min-height: 44px;
    box-sizing: border-box;
  }

  .personal-bill-quick-form {
    padding: 13px;
  }

  .personal-bill-quick-form .field-grid {
    grid-template-columns: 1fr;
  }

  .personal-bill-quick-form .field-amount,
  .personal-bill-quick-form .field-categoryName,
  .personal-bill-quick-form .field-accountName,
  .personal-bill-quick-form .field-paymentMethod,
  .personal-bill-quick-form .field-merchantName {
    grid-column: auto;
  }
}
</style>
