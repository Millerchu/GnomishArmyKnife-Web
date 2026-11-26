<template>
  <main class="bank-card-workspace" aria-label="银行卡管理">
    <section class="app-card bank-card-list" aria-labelledby="bank-card-heading">
      <header class="section-header">
        <h2 id="bank-card-heading">银行卡</h2>
        <button class="primary-action" type="button" @click="openCard()">＋ 新增银行卡</button>
      </header>

      <p v-if="loading" class="status" role="status">正在加载银行卡…</p>
      <p v-else-if="loadError" class="status" role="alert">{{ loadError }} <button type="button" @click="loadCards">重试</button></p>
      <p v-else-if="!cards.length" class="status">还没有银行卡。添加后，记账时即可选择。</p>
      <p v-if="actionError" class="status" role="alert">{{ actionError }}</p>

      <section v-for="group in cardGroups" :key="group.type" class="card-group">
        <h3>{{ group.label }}</h3>
        <ul class="card-rows">
          <li v-for="card in group.cards" :key="card.id" class="card-row">
            <div class="card-copy">
              <div class="card-name">
                <strong>{{ cardSnapshot(card) }}</strong>
                <span v-if="card.archived" class="archived">已归档</span>
              </div>
              <small>{{ card.institution }}<template v-if="card.cardType === 'CREDIT'"> · {{ groupName(card.creditAccountId) }}</template></small>
              <small v-if="card.note">{{ card.note }}</small>
            </div>
            <div class="card-actions">
              <button type="button" :disabled="busyCardId === card.id" @click="openCard(card)">编辑</button>
              <button type="button" :disabled="Boolean(busyCardId)" @click="toggleArchive(card)">{{ card.archived ? '恢复' : '归档' }}</button>
            </div>
          </li>
        </ul>
      </section>
    </section>

    <PersonalCreditPanel :linked-counts="linkedCounts" @groups-changed="creditGroups = $event" />

    <MacDialog v-model="showCardDialog" :form-state="form" :title="editingId ? '编辑银行卡' : '新增银行卡'"
      width="560px" :close-disabled="saving">
      <form id="bank-card-form" class="card-form" @submit.prevent="saveCard">
        <label>卡片类型
          <select v-model="form.cardType" @change="clearDebitCreditGroup">
            <option v-for="type in bankCardTypes" :key="type.type" :value="type.type">{{ type.label }}</option>
          </select>
        </label>
        <label>银行<input v-model.trim="form.institution" maxlength="64" required placeholder="例如 招商银行" /></label>
        <label>卡片名称<input v-model.trim="form.cardName" maxlength="56" required placeholder="例如 工资卡" /></label>
        <label>尾号（可选）<input v-model.trim="form.lastFour" maxlength="4" inputmode="numeric" pattern="[0-9]{4}" /></label>
        <label v-if="form.cardType === 'CREDIT'" class="wide">授信组（可选）
          <select v-model="form.creditAccountId">
            <option :value="null">暂不关联</option>
            <option v-if="form.creditAccountId && !creditGroups.some(group => group.id === form.creditAccountId)" :value="form.creditAccountId">保留原授信组</option>
            <option v-for="group in creditGroups" :key="group.id" :value="group.id">{{ group.accountName }} · {{ group.institution }}</option>
          </select>
        </label>
        <label class="wide">备注（可选）<input v-model.trim="form.note" maxlength="160" /></label>
        <p v-if="saveError" class="status wide" role="alert">{{ saveError }}</p>
      </form>
      <template #footer>
        <button class="primary-action" type="submit" form="bank-card-form" :disabled="saving">{{ saving ? '保存中…' : '保存银行卡' }}</button>
      </template>
    </MacDialog>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import MacDialog from '@/components/MacDialog.vue'
import PersonalCreditPanel from './PersonalCreditPanel.vue'
import { bankCardTypes, cardSnapshot } from './bankCardLabels'
import { archivePersonalBankCard, createPersonalBankCard, listPersonalBankCards, updatePersonalBankCard } from '@/api/personalBills'

const cards = ref([])
const creditGroups = ref([])
const loading = ref(true)
const saving = ref(false)
const loadError = ref('')
const actionError = ref('')
const saveError = ref('')
const editingId = ref(null)
const busyCardId = ref(null)
const showCardDialog = ref(false)
const defaults = () => ({ cardType: 'DEBIT', cardName: '', institution: '', lastFour: '', creditAccountId: null, note: '' })
const form = reactive(defaults())
const cardGroups = computed(() => bankCardTypes.map(({ type, label }) => ({
  type, label, cards: cards.value.filter(card => card.cardType === type)
})).filter(group => group.cards.length))
const linkedCounts = computed(() => {
  const counts = new Map()
  for (const card of cards.value) {
    if (card.creditAccountId) counts.set(card.creditAccountId, (counts.get(card.creditAccountId) || 0) + 1)
  }
  return counts
})

function groupName(id) {
  if (!id) return '未关联授信组'
  return creditGroups.value.find(group => group.id === id)?.accountName || '已关联授信组'
}

async function loadCards() {
  loading.value = true
  loadError.value = ''
  try {
    const { data } = await listPersonalBankCards({ includeArchived: true })
    if (!Array.isArray(data?.data)) throw new Error('银行卡列表格式无效')
    cards.value = data.data
  } catch (error) {
    loadError.value = error?.response?.data?.message || '银行卡加载失败'
  } finally {
    loading.value = false
  }
}

function openCard(card) {
  editingId.value = card?.id ?? null
  for (const [key, value] of Object.entries(defaults())) form[key] = card?.[key] ?? value
  saveError.value = ''
  actionError.value = ''
  showCardDialog.value = true
}

function clearDebitCreditGroup() {
  if (form.cardType === 'DEBIT') form.creditAccountId = null
}

async function saveCard() {
  if (saving.value) return
  saving.value = true
  saveError.value = ''
  const payload = { ...form, lastFour: form.lastFour || null }
  try {
    if (editingId.value) await updatePersonalBankCard(editingId.value, payload)
    else await createPersonalBankCard(payload)
    showCardDialog.value = false
    await loadCards()
  } catch (error) {
    saveError.value = error?.response?.data?.message || '保存银行卡失败'
  } finally {
    saving.value = false
  }
}

async function toggleArchive(card) {
  if (busyCardId.value) return
  busyCardId.value = card.id
  actionError.value = ''
  try {
    await archivePersonalBankCard(card.id, !card.archived)
    await loadCards()
  } catch (error) {
    actionError.value = error?.response?.data?.message || '更新银行卡状态失败'
  } finally {
    busyCardId.value = null
  }
}

onMounted(loadCards)
</script>

<style scoped>
.bank-card-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
  align-items: start;
  gap: 16px;
  color: var(--theme-text);
}
.bank-card-list { padding: 20px; border: 1px solid var(--theme-border); border-radius: 22px; }
.section-header, .card-row, .card-actions, .card-name {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.section-header, .card-row { justify-content: space-between; }
h2 { margin: 0; font-size: 18px; }
h3 { margin: 20px 0 7px; color: var(--theme-text-muted); font-size: 13px; }
.card-rows { margin: 0; padding: 0; list-style: none; }
.card-row { padding: 12px 0; border-top: 1px solid var(--theme-divider); }
.card-copy { display: grid; gap: 4px; min-width: 0; overflow-wrap: anywhere; }
.card-copy small, .status { color: var(--theme-text-muted); }
.archived {
  padding: 2px 6px;
  border: 1px solid var(--theme-border);
  border-radius: 6px;
  color: var(--theme-text-muted);
  font-size: 11px;
}
button {
  padding: 8px 12px;
  border: 0;
  border-radius: 9px;
  background: var(--theme-accent-soft);
  color: var(--theme-link);
  cursor: pointer;
}
button:disabled { opacity: .6; cursor: default; }
.primary-action { background: var(--theme-accent); color: var(--theme-on-accent); }
.card-form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.card-form label { display: grid; gap: 6px; font-size: 13px; }
.card-form input, .card-form select {
  width: 100%;
  min-width: 0;
  height: 38px;
  padding: 0 10px;
  border: 1px solid var(--theme-border-strong);
  border-radius: 8px;
  background: var(--theme-field-surface);
  color: var(--theme-text);
}
.wide { grid-column: 1 / -1; }
@media (max-width: 900px) { .bank-card-workspace { grid-template-columns: 1fr; } }
@media (max-width: 520px) {
  .card-form { grid-template-columns: 1fr; }
  .bank-card-list { padding: 16px; }
  .section-header button, .card-actions button { min-height: 40px; }
}
</style>
