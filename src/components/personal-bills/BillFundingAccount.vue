<template>
  <div class="funding-account">
    <label>
      <span>资金账户</span>
      <select :value="selection" @change="selectAccount($event.target.value)">
        <option value="">未填写</option>
        <option value="manual">手动输入</option>
        <option v-if="showOriginalOption" :value="originalCardId">{{ originalAccountName }}（原账单账户）</option>
        <optgroup v-for="group in cardGroups" :key="group.type" :label="group.label">
          <option v-for="card in group.cards" :key="card.id" :value="String(card.id)">{{ cardLabel(card) }}</option>
        </optgroup>
      </select>
    </label>
    <input
      v-if="selection === 'manual'"
      :value="accountName"
      aria-label="手填资金账户"
      maxlength="64"
      placeholder="例如 微信零钱"
      @input="$emit('update:accountName', $event.target.value)"
    />
    <small v-if="loading" role="status">正在加载银行卡…</small>
    <small v-else-if="loadError" role="alert">银行卡加载失败 <button type="button" @click="loadCards">重试</button></small>
    <small v-else-if="!cards.length">暂无可用银行卡</small>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { listPersonalBankCards } from '@/api/personalBills'
import { bankCardTypes, cardLabel, cardSnapshot } from './bankCardLabels'

const props = defineProps({
  bankCardId: { type: String, default: null },
  accountName: { type: String, default: '' },
  originalCardId: { type: String, default: null },
  originalAccountName: { type: String, default: '' }
})
const emit = defineEmits(['update:bankCardId', 'update:accountName'])
const manual = ref(!props.bankCardId && Boolean(props.accountName))
const cards = ref([])
const loading = ref(true)
const loadError = ref(false)
const selection = computed(() => props.bankCardId || (manual.value ? 'manual' : ''))
const showOriginalOption = computed(() => {
  if (!props.originalCardId) return false
  const card = cards.value.find(item => String(item.id) === props.originalCardId)
  return !card || cardSnapshot(card) !== props.originalAccountName
})
const cardGroups = computed(() => bankCardTypes.map(({ type, label }) => ({
  type, label, cards: cards.value.filter(card => card.cardType === type
    && (!showOriginalOption.value || String(card.id) !== props.originalCardId))
})).filter(group => group.cards.length))

async function loadCards() {
  loading.value = true
  loadError.value = false
  try {
    const { data } = await listPersonalBankCards()
    if (!Array.isArray(data?.data)) throw new Error('银行卡列表格式无效')
    cards.value = data.data
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

function selectAccount(value) {
  manual.value = value === 'manual'
  if (manual.value || !value) {
    emit('update:bankCardId', null)
    emit('update:accountName', '')
    return
  }
  emit('update:bankCardId', value)
  emit('update:accountName', '')
}

onMounted(loadCards)
</script>

<style scoped>
.funding-account,
.funding-account label {
  display: grid;
  gap: 5px;
  min-width: 0;
}
.funding-account span,
.funding-account small {
  color: var(--theme-text-muted);
  font-size: 11px;
}
.funding-account button {
  border: 0;
  padding: 2px 4px;
  background: transparent;
  color: var(--theme-link);
  cursor: pointer;
}
.funding-account select,
.funding-account input {
  width: 100%;
  min-width: 0;
  min-height: 38px;
  padding: 0 11px;
  border: 1px solid var(--theme-border-strong);
  border-radius: 10px;
  background: var(--theme-field-surface);
  color: var(--theme-text);
  font: inherit;
}
</style>
