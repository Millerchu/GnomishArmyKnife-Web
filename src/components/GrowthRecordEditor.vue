<template>
  <MacDialog ref="dialog" :model-value="open" :title="title" width="620px" mobile-presentation="sheet"
    :form-state="form" :form-baseline-key="baseline" :close-disabled="saving" @update:model-value="$emit('update:open', $event)">
    <form id="growth-record-form" class="growth-form" @submit.prevent="submit">
      <p v-if="error || validationError" role="alert" class="form-error">{{ error || validationError }}</p>
      <template v-if="kind === 'child'">
        <label class="full">宝宝昵称<input v-model="form.name" required maxlength="64" autocomplete="off" /></label>
        <label>出生日期<input v-model="form.birthday" type="date" required :max="today" /></label>
        <label>性别<select v-model="form.gender"><option value="UNKNOWN">暂不填写</option><option value="BOY">男孩</option><option value="GIRL">女孩</option></select></label>
      </template>
      <template v-else-if="kind === 'measurement'">
        <label class="full">测量日期<input v-model="form.measureDate" type="date" required :min="birthday" :max="today" /></label>
        <label v-for="metric in GROWTH_METRICS" :key="metric.key">{{ metric.label }}（{{ metric.unit }}）<input v-model="form[metric.key]" type="number" min="0.01" max="9999.99" step="0.01" /></label>
        <label>记录人<input v-model="form.recordedBy" maxlength="64" /></label>
        <p class="form-tip full">身高、体重、头围至少填写一项；没有测量的项目留空即可。</p>
      </template>
      <template v-else-if="kind === 'vaccination'">
        <label class="full">疫苗名称<input v-model="form.vaccineName" required maxlength="128" /></label>
        <label>针次<input v-model="form.dose" type="number" required min="1" max="99" step="1" /></label>
        <label>状态<select v-model="form.status"><option value="COMPLETED">已接种</option><option value="PLANNED">待接种计划</option></select></label>
        <label class="full">{{ form.status === 'PLANNED' ? '预约日期' : '接种日期' }}<input v-model="form.vaccinationDate" type="date" required :min="birthday" :max="form.status === 'COMPLETED' ? today : undefined" /></label>
        <label class="full">接种单位<input v-model="form.institution" maxlength="128" /></label>
        <p class="form-tip full">完成预约后，将状态改为“已接种”，并填写实际接种日期。</p>
      </template>
      <template v-else>
        <label class="full">里程碑标题<input v-model="form.title" required maxlength="128" /></label>
        <label class="full">发生日期<input v-model="form.eventDate" type="date" required :min="birthday" :max="today" /></label>
      </template>
      <label class="full">{{ kind === 'milestone' ? '那天的故事' : '备注' }}<textarea v-model="form.note" rows="3" maxlength="1000" /></label>
    </form>
    <template #footer><button class="ghost-btn" :disabled="saving" @click="dialog?.requestClose()">取消</button><button class="action-btn" type="submit" form="growth-record-form" :disabled="saving">{{ saving ? '保存中…' : '保存' }}</button></template>
  </MacDialog>
</template>

<script setup>
import {ref, watch} from 'vue'
import MacDialog from '@/components/MacDialog.vue'
import {GROWTH_METRICS, hasMetric, localToday} from '@/utils/growthRecords'
const props = defineProps({open: Boolean, kind: String, title: String, birthday: String,
  saving: Boolean, error: String, baseline: Number})
const form = defineModel('form', {type: Object, required: true})
const emit = defineEmits(['update:open', 'save'])
const dialog = ref(null), validationError = ref('')
const today = localToday()
watch(() => props.baseline, () => { validationError.value = '' })
function submit() {
  validationError.value = ''
  if (props.kind === 'measurement' && !GROWTH_METRICS.some(({key}) => hasMetric(form.value[key]))) {
    validationError.value = '身高、体重、头围至少填写一项'
    return
  }
  emit('save')
}
</script>

<style scoped>
.growth-form{display:grid;grid-template-columns:1fr 1fr;gap:14px}label{display:flex;flex-direction:column;gap:7px;color:var(--theme-text-soft);font-size:13px}.full{grid-column:1/-1}input,select,textarea{width:100%;border:1px solid var(--theme-border);border-radius:12px;padding:10px 12px;color:var(--theme-text);background:var(--theme-field-surface);font:inherit}.form-tip{font-size:12px;color:var(--theme-text-muted);margin:0}.form-error{grid-column:1/-1;color:var(--theme-danger);margin:0}button{border:0;border-radius:999px;padding:9px 16px;background:var(--theme-control-surface);color:var(--theme-text)}.action-btn{background:var(--theme-accent);color:white}button:disabled{opacity:.6}textarea{resize:vertical}
</style>
