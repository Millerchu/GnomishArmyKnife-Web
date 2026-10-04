<template>
  <main class="travel-page">
    <nav class="topbar">
      <button @click="router.push('/home')">‹ 返回桌面</button><span>个人生活 / 出行档案</span>
    </nav>
    <header class="hero">
      <div>
        <span class="eyebrow">MY JOURNEYS</span>
        <h1>行笺</h1>
        <p>留住每一程。票据、回忆与费用，随时可查。</p>
      </div>
      <button class="primary" @click="openNew">＋ 新增记录</button>
    </header>
    <div class="toolbar">
      <div class="tabs">
        <button v-for="(label, key) in tabs" :key="key" :class="{ active: tab === key }" @click="tab = key">
          {{ label }}
        </button>
      </div>
      <button :disabled="exporting" @click="download">{{ exporting ? '导出中…' : '导出 CSV' }}</button>
    </div>
    <form class="filters" @submit.prevent="filter">
      <label
        >时间范围<input
          v-model="filters.year"
          type="number"
          min="1"
          max="9999"
          placeholder="全部历史" /></label
      ><label
        >交通类型<select v-model="filters.transportType">
          <option value="">全部交通</option>
          <option v-for="(v, k) in TRANSPORT_TYPES" :key="k" :value="k">{{ v }}</option>
        </select></label
      ><label
        >状态<select v-model="filters.status">
          <option value="">全部状态</option>
          <option v-for="(v, k) in TRAVEL_STATUSES" :key="k" :value="k">{{ v }}</option>
        </select></label
      ><label
        >出行分组<select v-model="filters.groupId">
          <option value="">全部分组</option>
          <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
        </select></label
      ><label class="search">搜索<input v-model="filters.keyword" placeholder="站点、车次或备注" /></label
      ><button class="primary">查询</button><button type="button" @click="resetFilters">重置</button>
    </form>
    <p v-if="error" class="error" role="alert">{{ error }} <button @click="load">重试加载</button></p>
    <p v-if="notice" class="notice" role="status">{{ notice }}</p>
    <div v-if="loading" class="empty" role="status">正在读取出行档案…</div>
    <section v-else-if="tab === 'records'">
      <div v-if="!records.length" class="empty">
        <span class="empty-symbol">↗</span>
        <h2>从一张旧车票开始</h2>
        <p>不记得座位或票价也没关系，填写起终点和日期即可保存。</p>
        <button class="primary" @click="openNew">记录一段行程</button>
      </div>
      <template v-for="(record, index) in records" :key="record.id"
        ><h2
          v-if="
            index === 0 || records[index - 1].departureDate?.slice(0, 7) !== record.departureDate?.slice(0, 7)
          "
          class="month"
        >
          {{ record.departureDate?.slice(0, 7) }}
        </h2>
        <article class="ticket">
          <div class="ticket-date">
            <strong>{{ record.departureDate?.slice(8) }}</strong
            ><span>{{ TRANSPORT_TYPES[record.transportType] }}</span>
          </div>
          <button class="ticket-main" @click="openDetail(record.id)">
            <div class="route">
              <strong>{{ record.departure }}</strong
              ><span class="route-line">→</span><strong>{{ record.arrival }}</strong>
            </div>
            <div class="metadata">
              <span>{{ record.serviceNumber || '车次 / 航班待补充' }}</span
              ><span>{{ record.departureTime?.slice(0, 5) || '时间未填写' }}</span
              ><span>{{ groupName(record.groupId) }}</span
              ><span v-if="isPastPlanned(record)">已过出发日期，请确认是否完成</span>
            </div>
          </button>
          <div class="ticket-end">
            <span class="badge" :class="record.status.toLowerCase()">{{
              TRAVEL_STATUSES[record.status]
            }}</span
            ><strong>{{
              money(
                record.paidAmount == null
                  ? null
                  : Number(record.paidAmount) - Number(record.refundAmount || 0),
                record.currency,
              )
            }}</strong
            ><button @click="openDetail(record.id)">查看详情 ↗</button>
          </div>
        </article></template
      >
      <footer v-if="total" class="pagination">
        <span>共 {{ total }} 条记录</span
        ><button
          :disabled="page === 1"
          @click="changePage(-1)"
        >
          上一页</button
        ><span>{{ page }} / {{ Math.max(1, Math.ceil(total / pageSize)) }}</span
        ><button
          :disabled="page * pageSize >= total"
          @click="changePage(1)"
        >
          下一页
        </button>
      </footer>
    </section>
    <section v-else-if="tab === 'groups'">
      <div class="section-heading">
        <h2>把往返与换乘放在一起</h2>
        <button class="primary" @click="editGroup()">＋ 新建分组</button>
      </div>
      <p class="muted">分组独立于上方筛选。删除分组会保留其中的行程。</p>
      <div class="group-grid">
        <article v-for="g in groups" :key="g.id" class="group-card">
          <span class="eyebrow">JOURNEY</span>
          <h2>{{ g.name }}</h2>
          <p>{{ g.note || '暂无备注' }}</p>
          <div class="actions">
            <button
              @click="openGroupRecords(g.id)"
            >
              查看行程与费用</button
            ><button @click="editGroup(g)">编辑</button
            ><button class="danger" @click="askDelete('group', g)">删除</button>
          </div>
        </article>
      </div>
      <p v-if="!groups.length" class="empty">还没有分组，可先记录单程，稍后整理。</p>
    </section>
    <section v-else class="statistics">
      <div class="stat-grid">
        <article>
          <span>已完成乘坐</span><strong>{{ summary.completedCount || 0 }} <small>次</small></strong>
        </article>
        <article>
          <span>金额未填写</span><strong>{{ summary.unknownAmountCount || 0 }} <small>条</small></strong>
        </article>
        <article v-for="(amount, currency) in summary.netAmounts" :key="currency">
          <span>实际净支出 · {{ currency }}</span
          ><strong>{{ money(amount, currency) }}</strong>
        </article>
      </div>
      <div class="stat-panels">
        <article>
          <h2>交通方式</h2>
          <p v-for="(count, type) in summary.typeCounts" :key="type" class="stat-row">
            <span>{{ TRANSPORT_TYPES[type] || type }}</span
            ><strong>{{ count }} 次</strong>
          </p>
        </article>
        <article>
          <h2>常用路线</h2>
          <p v-for="(count, routeName) in summary.routeCounts" :key="routeName" class="stat-row">
            <span>{{ routeName }}</span
            ><strong>{{ count }} 次</strong>
          </p>
        </article>
      </div>
      <p class="muted">统计采用当前查询条件；乘坐次数仅统计已完成记录，费用包含退票损失，各币种分别计算。</p>
    </section>
    <MacDialog
      v-model="formOpen"
      :title="form.id ? '编辑行程' : '新增行程'"
      width="860px"
      :dirty="dirty"
      ref="recordDialog"
      :close-disabled="saving || uploading"
    >
      <form id="travel-form" class="record-form" @submit.prevent="save(false)">
        <fieldset>
          <legend>这一程</legend>
          <div class="form-grid">
            <label
              >交通类型<select v-model="form.transportType">
                <option v-for="(v, k) in TRANSPORT_TYPES" :value="k" :key="k">{{ v }}</option>
              </select></label
            ><label
              >状态<select v-model="form.status">
                <option v-for="(v, k) in TRAVEL_STATUSES" :value="k" :key="k">{{ v }}</option>
              </select></label
            ><label
              >出发地 *<input
                v-model="form.departure"
                required
                maxlength="96"
                placeholder="城市或车站 / 机场" /></label
            ><label>到达地 *<input v-model="form.arrival" required maxlength="96" /></label
            ><label>出发日期 *<input v-model="form.departureDate" type="date" required /></label
            ><label>出发时间<input v-model="form.departureTime" type="time" /></label
            ><label>到达日期<input v-model="form.arrivalDate" type="date" /></label
            ><label>到达时间<input v-model="form.arrivalTime" type="time" /></label
            ><label>出发地时区<input v-model="form.departureZone" placeholder="Asia/Shanghai" /></label
            ><label>到达地时区<input v-model="form.arrivalZone" placeholder="Asia/Shanghai" /></label
            ><label
              >出行分组<select v-model="form.groupId">
                <option :value="null">不分组</option>
                <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
              </select></label
            ><label
              >用途<select v-model="form.purpose">
                <option :value="null">未填写</option>
                <option v-for="(v, k) in TRAVEL_PURPOSES" :key="k" :value="k">{{ v }}</option>
              </select></label
            >
          </div>
        </fieldset>
        <fieldset>
          <legend>票面信息 · 选填</legend>
          <div class="form-grid">
            <label
              >{{ form.transportType === 'FLIGHT' ? '航班号' : '车次 / 班次'
              }}<input v-model="form.serviceNumber" maxlength="60" /></label
            ><label>承运公司<input v-model="form.carrier" maxlength="96" /></label
            ><label
              >{{ form.transportType === 'FLIGHT' ? '舱位' : '席别'
              }}<input v-model="form.seatClass" maxlength="60" /></label
            ><label v-if="form.transportType === 'TRAIN'"
              >车厢<input v-model="form.carriage" maxlength="30" /></label
            ><label>座位<input v-model="form.seat" maxlength="30" /></label
            ><label>购票平台<input v-model="form.platform" maxlength="96" /></label
            ><label>订单号<input v-model="form.orderNumber" maxlength="96" /></label>
          </div>
        </fieldset>
        <fieldset>
          <legend>费用与个人账单</legend>
          <p v-if="form.previousRecordId" class="notice">
            这是改签后的新行程。保存后原记录将标记为已改签。仅填写这次实际新支付的金额或补差价，原票退款请在原记录中填写。
          </p>
          <div class="form-grid">
            <label
              >支付金额<input
                v-model="form.paidAmount"
                type="number"
                min="0"
                step="0.01"
                placeholder="未知可留空" /></label
            ><label
              >币种<input
                v-model="form.currency"
                maxlength="3"
                pattern="[A-Z]{3}"
                @input="form.currency = form.currency.toUpperCase()" /></label
            ><label>支付日期<input v-model="form.paymentDate" type="date" /></label
            ><label class="check"
              ><input v-model="form.useDepartureDate" type="checkbox" />不知道支付日期，以出发日期代记</label
            ><label>退款金额<input v-model="form.refundAmount" type="number" min="0" step="0.01" /></label
            ><label>退款日期<input v-model="form.refundDate" type="date" /></label>
          </div>
          <label class="check"><input v-model="form.syncBill" type="checkbox" />同步到个人账单</label>
          <p class="muted">
            已关联账单的金额在此统一维护；关闭同步时保留已有账单并解除关联。取消行程不会自动退款。
          </p>
          <div v-if="form.syncBill && !form.bills?.length" class="bill-link">
            <button type="button" :disabled="candidateLoading" @click="loadCandidates">
              {{ candidateLoading ? '读取中…' : '关联已有账单（避免重复记账）' }}</button
            ><label v-if="candidates !== null"
              >选择已有支出<select v-model="form.existingBillId" @change="selectExistingBill">
                <option :value="null">自动创建新账单</option>
                <option v-for="bill in candidates" :key="bill.id" :value="bill.id">
                  {{ bill.billDate }} · {{ bill.categoryName }} · {{ money(bill.amount, bill.currency) }} ·
                  {{ bill.note }}
                </option>
              </select></label
            >
          </div>
        </fieldset>
        <label>备注<textarea v-model="form.note" maxlength="1000" rows="3" /></label
        ><AttachmentManager
          v-model="form.attachments"
          usage-type="ATTACHMENT"
          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
          title="票据与凭证"
          hint="支持截图、照片和 PDF；可拖动排序。"
          @uploading="uploading = $event"
        />
        <p v-if="formError" class="error" role="alert">{{ formError }}</p>
        <div v-if="duplicate" class="notice">
          存在相似行程，请核对日期、车次和站点。<button type="button" :disabled="saving" @click="save(true)">
            确认仍然保存
          </button>
        </div>
      </form>
      <template #footer
        ><button :disabled="saving || uploading" @click="recordDialog?.requestClose()">取消</button
        ><button class="primary" form="travel-form" type="submit" :disabled="saving || uploading">
          {{ saving ? '保存中…' : '保存行程' }}
        </button></template
      >
    </MacDialog>
    <MacDialog v-model="detailOpen" title="行程详情" width="760px"
      ><template v-if="detail"
        ><div class="detail-route">
          <span>{{ TRANSPORT_TYPES[detail.transportType] }} · {{ TRAVEL_STATUSES[detail.status] }}</span>
          <h2>{{ detail.departure }} → {{ detail.arrival }}</h2>
          <p>
            {{ detail.departureDate }} {{ detail.departureTime?.slice(0, 5) }} · {{ detail.departureZone }}
          </p>
          <p v-if="detail.arrivalDate">
            抵达 {{ detail.arrivalDate }} {{ detail.arrivalTime?.slice(0, 5) }} · {{ detail.arrivalZone }}
          </p>
        </div>
        <dl class="details">
          <template v-for="(label, key) in detailFields" :key="key"
            ><dt>{{ label }}</dt>
            <dd>{{ detail[key] || '未填写' }}</dd></template
          >
          <dt>分组 / 用途</dt>
          <dd>{{ groupName(detail.groupId) }} / {{ TRAVEL_PURPOSES[detail.purpose] || '未填写' }}</dd>
          <dt>支付 / 退款</dt>
          <dd>
            {{ money(detail.paidAmount, detail.currency) }} /
            {{ money(detail.refundAmount, detail.currency) }}
          </dd>
          <dt>支付 / 退款日期</dt>
          <dd>
            {{
              detail.paymentDate || (detail.useDepartureDate ? detail.departureDate + '（代记）' : '未填写')
            }}
            / {{ detail.refundDate || '未填写' }}
          </dd>
        </dl>
        <p v-if="detail.previousRecordId">
          <button @click="openDetail(detail.previousRecordId)">查看改签前记录</button>
        </p>
        <p class="note-text">{{ detail.note }}</p>
        <AttachmentGallery :attachments="detail.attachments || []" />
        <div v-if="detail.bills?.length" class="bill-link">
          <h3>关联个人账单</h3>
          <button v-for="bill in detail.bills" :key="bill.id" @click="openBill(bill)">
            {{ bill.billDate }} · {{ money(bill.amount, bill.currency) }} · 查看账单 ↗
          </button>
        </div>
        <p v-else class="muted">暂无关联账单</p></template
      ><template #footer
        ><button class="danger" @click="askDelete('record', detail)">删除</button
        ><button @click="editDetail(true)">复制新增</button
        ><button @click="editDetail(true, true)">改签新增</button
        ><button class="primary" @click="editDetail(false)">编辑</button></template
      ></MacDialog
    >
    <MacDialog
      v-model="groupOpen"
      :form-state="groupForm"
      :title="groupForm.id ? '编辑分组' : '新建出行分组'"
      :close-disabled="saving"
      ><form id="group-form" class="record-form" @submit.prevent="saveGroup">
        <label
          >名称 *<input
            v-model="groupForm.name"
            required
            maxlength="96"
            placeholder="例如：国庆成都旅行" /></label
        ><label>备注<textarea v-model="groupForm.note" maxlength="1000" rows="3" /></label>
        <p v-if="groupError" class="error">{{ groupError }}</p>
      </form>
      <template #footer
        ><button class="primary" type="submit" form="group-form" :disabled="saving">
          保存分组
        </button></template
      ></MacDialog
    >
    <MacDialog v-model="deleteOpen" title="删除确认" :close-disabled="saving"
      ><p>
        {{
          deleteTarget?.type === 'group'
            ? '删除分组后，行程和账单仍会保留。'
            : '删除这条行程及其票据关联？此操作不可恢复。'
        }}
      </p>
      <label v-if="deleteTarget?.type === 'record'" class="check"
        ><input v-model="deleteBills" type="checkbox" />同时删除关联账单（默认保留并解除关联）</label
      >
      <p v-if="deleteError" class="error">{{ deleteError }}</p>
      <template #footer
        ><button :disabled="saving" @click="deleteOpen = false">取消</button
        ><button class="danger" :disabled="saving" @click="confirmDelete">
          {{ saving ? '删除中…' : '确认删除' }}
        </button></template
      ></MacDialog
    >
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref, toRaw } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import MacDialog from '@/components/MacDialog.vue'
import AttachmentManager from '@/components/AttachmentManager.vue'
import AttachmentGallery from '@/components/AttachmentGallery.vue'
import * as api from '@/api/travelRecords'
import {
  TRANSPORT_TYPES,
  TRAVEL_STATUSES,
  TRAVEL_PURPOSES,
  newTravelRecord,
  cloneTravelRecord,
  travelPayload,
  validateTravelRecord,
} from '@/utils/travelRecords'
const router = useRouter(),
  route = useRoute()
const tabs = { records: '行程记录', groups: '出行分组', statistics: '统计回顾' }
const tab = ref('records'),
  filters = reactive({ year: '', transportType: '', status: '', groupId: '', keyword: '' }),
  applied = ref({})
const records = ref([]),
  groups = ref([]),
  summary = ref({}),
  total = ref(0),
  page = ref(1),
  pageSize = 20
const loading = ref(false),
  saving = ref(false),
  exporting = ref(false),
  uploading = ref(false),
  error = ref(''),
  notice = ref('')
const formOpen = ref(false),
  form = ref({}),
  initialForm = ref(''),
  formError = ref(''),
  duplicate = ref(false),
  candidates = ref(null),
  candidateLoading = ref(false)
const detailOpen = ref(false),
  detail = ref(null),
  groupOpen = ref(false),
  groupForm = ref({}),
  groupError = ref(''),
  deleteOpen = ref(false),
  deleteTarget = ref(null),
  deleteBills = ref(false),
  deleteError = ref('')
const recordDialog = ref(null)
const dirty = computed(() => JSON.stringify(form.value) !== initialForm.value)
const detailFields = {
  serviceNumber: '车次 / 航班',
  carrier: '承运公司',
  seatClass: '席别 / 舱位',
  carriage: '车厢',
  seat: '座位',
  platform: '购票平台',
  orderNumber: '订单号',
}
const unwrap = (r) => {
  const body = r?.data
  if (body?.code && ![200, '200', 'SUCCESS', 0, '0'].includes(body.code))
    throw Object.assign(new Error(body.message || body.msg || body.code), { code: body.code })
  return body?.data ?? body
}
const message = (e) =>
  e?.response?.data?.message || e?.response?.data?.msg || e?.message || '操作失败，请稍后重试'
const money = (amount, currency = 'CNY') =>
  amount == null || amount === ''
    ? '金额未填写'
    : `${currency || 'CNY'} ${Number(amount).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const groupName = (id) => groups.value.find((g) => String(g.id) === String(id))?.name || '未分组'
function isPastPlanned(record) {
  const today = new Date()
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  return record.status === 'PLANNED' && record.departureDate < date
}
let loadId = 0
async function load() {
  const current = ++loadId
  loading.value = true
  error.value = ''
  try {
    const results = await Promise.all([
      api.listTravelRecords({ ...applied.value, pageNo: page.value, pageSize }),
      api.listTravelGroups(),
      api.getTravelSummary(applied.value),
    ])
    if (current !== loadId) return
    const data = unwrap(results[0])
    records.value = data.list || []
    total.value = data.total || 0
    page.value = Math.min(page.value, Math.max(1, Math.ceil(total.value / pageSize)))
    groups.value = unwrap(results[1]) || []
    summary.value = unwrap(results[2]) || {}
  } catch (e) {
    if (current === loadId) error.value = message(e)
  } finally {
    if (current === loadId) loading.value = false
  }
}
function changePage(offset) {
  page.value += offset
  load()
}
function openGroupRecords(id) {
  filters.groupId = id
  tab.value = 'records'
  filter()
}
function filter() {
  applied.value = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''))
  page.value = 1
  load()
}
function resetFilters() {
  Object.keys(filters).forEach((k) => (filters[k] = ''))
  filter()
}
function showForm(data) {
  form.value = data
  initialForm.value = JSON.stringify(data)
  formError.value = ''
  duplicate.value = false
  candidates.value = null
  formOpen.value = true
}
function openNew() {
  showForm(newTravelRecord())
}
async function openDetail(id) {
  error.value = ''
  try {
    detail.value = unwrap(await api.getTravelRecord(id))
    detailOpen.value = true
  } catch (e) {
    error.value = message(e)
  }
}
function editDetail(clone, changed = false) {
  detailOpen.value = false
  showForm(clone ? cloneTravelRecord(detail.value, changed) : structuredClone(toRaw(detail.value)))
}
async function save(confirmed) {
  if (saving.value || uploading.value) return
  formError.value = validateTravelRecord(form.value)
  if (formError.value) return
  saving.value = true
  try {
    const payload = { ...travelPayload(form.value), duplicateConfirmed: confirmed }
    unwrap(
      await (form.value.id
        ? api.updateTravelRecord(form.value.id, payload)
        : api.createTravelRecord(payload)),
    )
    initialForm.value = JSON.stringify(form.value)
    formOpen.value = false
    notice.value = '行程已保存'
    await load()
  } catch (e) {
    const text = message(e)
    duplicate.value =
      text.includes('TRAVEL_DUPLICATE') ||
      text.includes('重复') ||
      e?.response?.data?.code === 'TRAVEL_DUPLICATE' ||
      e?.code === 'TRAVEL_DUPLICATE'
    formError.value = text
  } finally {
    saving.value = false
  }
}
async function loadCandidates() {
  candidateLoading.value = true
  try {
    candidates.value =
      unwrap(
        await api.listBillCandidates({
          currency: form.value.currency,
          paymentDate:
            form.value.paymentDate || (form.value.useDepartureDate ? form.value.departureDate : undefined),
          amount: Number(form.value.paidAmount) > 0 ? form.value.paidAmount : undefined,
        }),
      ) || []
  } catch (e) {
    formError.value = message(e)
  } finally {
    candidateLoading.value = false
  }
}
function selectExistingBill() {
  const bill = candidates.value?.find((item) => String(item.id) === String(form.value.existingBillId))
  if (bill) {
    form.value.paidAmount = bill.amount
    form.value.paymentDate = bill.billDate
    form.value.currency = bill.currency || 'CNY'
    form.value.useDepartureDate = false
  }
}
function editGroup(g) {
  groupForm.value = g ? { ...g } : { name: '', note: '' }
  groupError.value = ''
  groupOpen.value = true
}
async function saveGroup() {
  saving.value = true
  try {
    unwrap(
      await (groupForm.value.id
        ? api.updateTravelGroup(groupForm.value.id, groupForm.value)
        : api.createTravelGroup(groupForm.value)),
    )
    groupOpen.value = false
    await load()
  } catch (e) {
    groupError.value = message(e)
  } finally {
    saving.value = false
  }
}
function askDelete(type, item) {
  deleteTarget.value = { type, item }
  deleteBills.value = false
  deleteError.value = ''
  deleteOpen.value = true
}
async function confirmDelete() {
  saving.value = true
  try {
    const t = deleteTarget.value
    unwrap(
      await (t.type === 'group'
        ? api.deleteTravelGroup(t.item.id)
        : api.deleteTravelRecord(t.item.id, deleteBills.value)),
    )
    deleteOpen.value = false
    detailOpen.value = false
    if (t.type === 'group' && String(filters.groupId) === String(t.item.id)) {
      filters.groupId = ''
      delete applied.value.groupId
    }
    await load()
  } catch (e) {
    deleteError.value = message(e)
  } finally {
    saving.value = false
  }
}
function openBill(bill) {
  router.push({
    path: '/personal-bills',
    query: {
      travelRecordId: String(detail.value.id),
      month: bill.billDate?.slice(0, 7),
      currency: bill.currency || detail.value.currency,
    },
  })
}
async function download() {
  exporting.value = true
  try {
    const response = await api.exportTravelRecords(applied.value)
    if (response.data.type?.includes('json')) {
      const data = JSON.parse(await response.data.text())
      throw new Error(data.message || '导出失败')
    }
    const url = URL.createObjectURL(response.data),
      link = document.createElement('a')
    link.href = url
    link.download = '行笺-出行记录.csv'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (e) {
    error.value = message(e)
  } finally {
    exporting.value = false
  }
}
onMounted(async () => {
  await load()
  if (route.query.recordId) await openDetail(route.query.recordId)
})
</script>

<style scoped>
.travel-page {
  max-width: 1280px;
  margin: auto;
  padding: 28px 36px 70px;
  color: var(--theme-text);
}
button,
input,
select,
textarea {
  font: inherit;
}
button {
  border: 1px solid var(--theme-border);
  border-radius: 10px;
  padding: 9px 14px;
  background: var(--theme-surface-raised);
  color: var(--theme-text);
  cursor: pointer;
}
button:hover {
  border-color: var(--theme-accent);
}
button:disabled {
  opacity: 0.5;
  cursor: wait;
}
.primary {
  background: var(--theme-accent);
  color: var(--theme-on-accent);
  border-color: transparent;
}
.danger {
  color: var(--theme-danger);
}
.topbar,
.hero,
.toolbar,
.actions,
.pagination,
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.topbar {
  font-size: 12px;
  color: var(--theme-text-muted);
}
.hero {
  padding: 44px 0 30px;
}
.eyebrow {
  font-size: 11px;
  letter-spacing: 0.2em;
  color: var(--theme-text-muted);
  font-weight: 700;
}
h1 {
  font-size: 36px;
  letter-spacing: -0.04em;
  margin: 8px 0 10px;
}
h2 {
  font-size: 19px;
}
p {
  line-height: 1.7;
}
.hero p,
.muted {
  color: var(--theme-text-muted);
  font-size: 13px;
}
.toolbar {
  border-bottom: 1px solid var(--theme-border);
  padding-bottom: 14px;
}
.tabs {
  display: flex;
  gap: 6px;
}
.tabs button {
  border: 0;
  background: transparent;
}
.tabs .active {
  background: var(--theme-surface-muted);
  color: var(--theme-accent);
  font-weight: 700;
}
.filters {
  display: flex;
  gap: 10px;
  align-items: end;
  margin: 22px 0;
  flex-wrap: wrap;
}
label {
  display: flex;
  flex-direction: column;
  gap: 7px;
  font-size: 12px;
  color: var(--theme-text-soft);
}
input,
select,
textarea {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  border: 1px solid var(--theme-border);
  border-radius: 9px;
  background: var(--theme-surface-raised);
  color: var(--theme-text);
  padding: 10px;
}
.filters label {
  width: 130px;
}
.filters .search {
  flex: 1;
  min-width: 150px;
}
.month {
  font-size: 14px;
  margin: 25px 0 12px;
  color: var(--theme-text-muted);
}
.ticket {
  display: flex;
  align-items: center;
  gap: 22px;
  border: 1px solid var(--theme-border);
  border-radius: 16px;
  background: var(--theme-surface-raised);
  margin-bottom: 12px;
  padding: 22px;
}
.ticket-date {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 58px;
  gap: 6px;
  border-right: 1px dashed var(--theme-border);
  padding-right: 22px;
}
.ticket-date strong {
  font-size: 30px;
  font-variant-numeric: tabular-nums;
}
.ticket-date span {
  font-size: 12px;
  color: var(--theme-text-muted);
}
.ticket-main {
  flex: 1;
  min-width: 0;
  border: 0;
  background: none;
  text-align: left;
  padding: 0;
}
.route {
  display: flex;
  align-items: center;
  gap: 18px;
  font-size: 20px;
}
.route-line {
  color: var(--theme-accent);
}
.metadata {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  font-size: 12px;
  color: var(--theme-text-muted);
  margin-top: 12px;
}
.ticket-end {
  display: flex;
  align-items: end;
  flex-direction: column;
  gap: 10px;
  font-size: 13px;
}
.ticket-end button {
  font-size: 11px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--theme-text-muted);
}
.badge {
  padding: 4px 9px;
  border-radius: 6px;
  background: var(--theme-surface-muted);
  font-size: 11px;
}
.completed {
  color: var(--theme-accent);
}
.pagination {
  justify-content: end;
  font-size: 12px;
  margin-top: 20px;
}
.empty {
  text-align: center;
  padding: 70px 20px;
  color: var(--theme-text-muted);
}
.empty-symbol {
  font-size: 40px;
  color: var(--theme-accent);
}
.error,
.notice {
  padding: 12px;
  border-radius: 10px;
  background: var(--theme-surface-muted);
  font-size: 13px;
}
.error {
  color: var(--theme-danger);
}
.notice {
  color: var(--theme-accent);
}
.group-grid,
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 16px;
}
.group-card,
.stat-grid article,
.stat-panels article {
  padding: 24px;
  border: 1px solid var(--theme-border);
  border-radius: 15px;
  background: var(--theme-surface-raised);
}
.group-card p {
  color: var(--theme-text-muted);
}
.actions {
  flex-wrap: wrap;
  justify-content: start;
}
.actions button {
  font-size: 12px;
}
.stat-grid article {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.stat-grid strong {
  font-size: 26px;
}
.stat-grid span,
small {
  font-size: 12px;
  color: var(--theme-text-muted);
}
.stat-panels {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 18px;
}
.stat-row {
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid var(--theme-border);
  padding: 9px 0;
  font-size: 13px;
}
.record-form {
  display: grid;
  gap: 20px;
}
.record-form fieldset {
  border: 0;
  margin: 0;
  padding: 0;
}
.record-form legend {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 14px;
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 14px;
}
.check {
  flex-direction: row;
  align-items: center;
  line-height: 1.6;
}
.check input {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}
.bill-link {
  display: grid;
  gap: 10px;
  margin: 16px 0;
}
.details {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 12px;
  font-size: 13px;
}
.details dt {
  color: var(--theme-text-muted);
}
.details dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.detail-route {
  padding: 12px 0 20px;
  border-bottom: 1px solid var(--theme-border);
}
.detail-route span,
.detail-route p {
  font-size: 12px;
  color: var(--theme-text-muted);
}
.note-text {
  white-space: pre-wrap;
  font-size: 13px;
}
.section-heading {
  margin-top: 20px;
}
@media (max-width: 700px) {
  .travel-page {
    padding: 18px 16px 45px;
  }
  .hero {
    padding: 30px 0 22px;
    align-items: start;
  }
  h1 {
    font-size: 27px;
  }
  .hero .primary {
    white-space: nowrap;
    font-size: 12px;
    margin-top: 20px;
  }
  .topbar span {
    display: none;
  }
  .toolbar {
    gap: 4px;
  }
  .tabs {
    gap: 0;
  }
  .tabs button,
  .toolbar > button {
    font-size: 12px;
    padding: 8px;
  }
  .filters label {
    width: calc(50% - 5px);
  }
  .filters .search {
    flex-basis: 100%;
  }
  .ticket {
    padding: 16px 12px;
    gap: 12px;
    flex-wrap: wrap;
  }
  .ticket-date {
    min-width: 32px;
    padding-right: 12px;
  }
  .ticket-date strong {
    font-size: 24px;
  }
  .route {
    font-size: 17px;
    gap: 10px;
    flex-wrap: wrap;
  }
  .ticket-end {
    width: 100%;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    border-top: 1px dashed var(--theme-border);
    padding-top: 12px;
  }
  .metadata {
    gap: 8px;
  }
  .form-grid {
    grid-template-columns: 1fr;
  }
  .stat-panels {
    grid-template-columns: 1fr;
  }
  .pagination {
    flex-wrap: wrap;
  }
  .details {
    grid-template-columns: 100px 1fr;
  }
}
</style>
