<template>
  <div class="dict-page">
    <div class="page-nav">
      <button type="button" class="back-home-btn" @click="goBackHome">
        <span class="back-home-icon">←</span>
        <span>返回桌面</span>
      </button>
    </div>

    <div class="hero-panel">
      <div>
        <h1 class="page-title">数据字典</h1>
        <p class="page-subtitle">系统管理 / 数据字典，可为工作日志、用户管理等模块维护预设选项</p>
      </div>
      <div class="hero-tags">
        <span class="hero-tag">共 {{ pagination.total }} 条</span>
      </div>
    </div>

    <section class="panel filter-panel">
      <div class="filter-grid">
        <label class="field-item">
          <span>关键字</span>
          <input
            v-model.trim="filters.keyword"
            placeholder="字典编号 / 字典名称 / 引用应用"
            :disabled="loading"
            @keyup.enter="searchDictionaries"
          />
        </label>
        <label class="field-item">
          <span>状态</span>
          <GlassSelect v-model="filters.status" :options="statusFilterOptions" :disabled="loading"/>
        </label>
        <label class="field-item">
          <span>作用范围</span>
          <GlassSelect v-model="filters.dictScope" :options="scopeFilterOptions" :disabled="loading"/>
        </label>
        <label class="field-item">
          <span>引用应用</span>
          <GlassSelect v-model="filters.referenceApp" :options="referenceAppSelectOptions" :disabled="loading"/>
        </label>
      </div>
      <div class="filter-actions">
        <button class="action-btn" :disabled="loading" @click="searchDictionaries">查询</button>
        <button class="ghost-btn" :disabled="loading" @click="resetFilters">重置</button>
      </div>
    </section>

    <section class="panel table-panel">
      <div class="toolbar">
        <div class="toolbar-left">
          <button class="action-btn" :disabled="loading || submitting" @click="openCreateDictionaryDialog">新增字典</button>
          <button class="ghost-btn" :disabled="loading || submitting" @click="fetchDictionaries">刷新列表</button>
        </div>
        <div class="toolbar-right">
          <span>共 {{ pagination.total }} 条</span>
        </div>
      </div>

      <div class="table-wrap desktop-table-wrap">
        <table class="dict-table">
          <thead>
          <tr>
            <th>字典编号</th>
            <th>字典名称</th>
            <th>作用范围</th>
            <th>状态</th>
            <th>创建人</th>
            <th>引用应用</th>
            <th>字典项数</th>
            <th>创建时间</th>
            <th class="action-col">操作</th>
          </tr>
          </thead>
          <tbody>
          <tr v-if="loading && !dictionaries.length">
            <td colspan="9" class="empty-cell">加载中...</td>
          </tr>
          <tr v-else-if="!dictionaries.length">
            <td colspan="9" class="empty-cell">暂无字典数据</td>
          </tr>
          <tr
            v-for="item in dictionaries"
            v-else
            :key="item.id"
            :class="{activeRow: selectedDictionaryId === item.id}"
            @click="selectDictionary(item)"
          >
            <td>{{ item.dictCode }}</td>
            <td>{{ item.dictName }}</td>
            <td>{{ formatDictScope(item.dictScope) }}</td>
            <td>
              <span class="status-tag" :class="item.status === 'ENABLED' ? 'on' : 'off'">
                {{ item.status === 'ENABLED' ? '启用' : '禁用' }}
              </span>
            </td>
            <td>{{ item.creatorName || '-' }}</td>
            <td>{{ formatApps(item.referenceApps) }}</td>
            <td>{{ item.itemCount }}</td>
            <td>{{ item.createTime || '-' }}</td>
            <td class="action-col">
              <button class="mini-btn" :disabled="submitting" @click.stop="selectDictionary(item)">维护字典项</button>
              <button class="mini-btn" :disabled="submitting" @click.stop="openEditDictionaryDialog(item)">编辑</button>
              <button class="mini-btn" :disabled="submitting" @click.stop="toggleDictionaryStatus(item)">
                {{ item.status === 'ENABLED' ? '禁用' : '启用' }}
              </button>
              <button class="mini-btn danger" :disabled="submitting" @click.stop="removeDictionary(item)">删除</button>
            </td>
          </tr>
          </tbody>
        </table>
      </div>

      <div class="mobile-dict-list">
        <div v-if="loading && !dictionaries.length" class="mobile-empty">加载中...</div>
        <div v-else-if="!dictionaries.length" class="mobile-empty">暂无字典数据</div>
        <article
          v-for="item in dictionaries"
          v-else
          :key="item.id"
          class="mobile-dict-card"
          :class="{activeMobileCard: selectedDictionaryId === item.id}"
          @click="selectDictionary(item)"
        >
          <div class="mobile-card-head">
            <div class="mobile-card-title-wrap">
              <strong class="mobile-card-title">{{ item.dictName }}</strong>
              <span class="mobile-card-code">{{ item.dictCode }}</span>
            </div>
            <span class="status-tag" :class="item.status === 'ENABLED' ? 'on' : 'off'">
              {{ item.status === 'ENABLED' ? '启用' : '禁用' }}
            </span>
          </div>

          <div class="mobile-card-grid">
            <p><span>作用范围</span><strong>{{ formatDictScope(item.dictScope) }}</strong></p>
            <p><span>创建人</span><strong>{{ item.creatorName || '-' }}</strong></p>
            <p><span>引用应用</span><strong>{{ formatApps(item.referenceApps) }}</strong></p>
            <p><span>字典项数</span><strong>{{ item.itemCount }}</strong></p>
            <p><span>创建时间</span><strong>{{ item.createTime || '-' }}</strong></p>
          </div>

          <div class="mobile-card-actions">
            <button class="mini-btn" :disabled="submitting" @click.stop="selectDictionary(item)">维护字典项</button>
            <button class="mini-btn" :disabled="submitting" @click.stop="openEditDictionaryDialog(item)">编辑</button>
            <button class="mini-btn" :disabled="submitting" @click.stop="toggleDictionaryStatus(item)">
              {{ item.status === 'ENABLED' ? '禁用' : '启用' }}
            </button>
            <button class="mini-btn danger" :disabled="submitting" @click.stop="removeDictionary(item)">删除</button>
          </div>
        </article>
      </div>

      <div class="pager">
        <div class="pager-left">
          <span>第 {{ pagination.pageNo }} / {{ pageCount }} 页</span>
          <GlassSelect
            v-model="pagination.pageSize"
            class="page-size-select"
            :options="pageSizeOptions"
            :disabled="loading"
            @change="changePageSize"
          />
        </div>
        <div class="pager-right">
          <button class="ghost-btn" :disabled="loading || pagination.pageNo <= 1" @click="changePage(-1)">上一页</button>
          <button class="ghost-btn" :disabled="loading || pagination.pageNo >= pageCount" @click="changePage(1)">下一页</button>
        </div>
      </div>
    </section>

    <section class="panel items-panel">
      <div class="items-head">
        <div>
          <h2 class="items-title">字典项维护</h2>
          <p class="items-subtitle">
            <template v-if="selectedDictionary">
              当前字典：{{ selectedDictionary.dictName }}（{{ selectedDictionary.dictCode }}）
            </template>
            <template v-else>
              请先从上方字典列表中选择一个字典
            </template>
          </p>
        </div>
        <div class="toolbar-left">
          <button class="action-btn" :disabled="!selectedDictionary || loading || submitting" @click="openCreateItemDialog">
            新增字典项
          </button>
          <button class="ghost-btn" :disabled="!selectedDictionary || loading || submitting" @click="fetchDictionaryItems">
            刷新字典项
          </button>
        </div>
      </div>

      <div v-if="selectedDictionary" class="table-wrap desktop-item-table-wrap">
        <table class="dict-table">
          <thead>
          <tr>
            <th>字典项编码</th>
            <th>显示名称</th>
            <th>实际值</th>
            <th>排序</th>
            <th>状态</th>
            <th>默认项</th>
            <th>说明</th>
            <th class="action-col">操作</th>
          </tr>
          </thead>
          <tbody>
          <tr v-if="itemsLoading && !dictionaryItems.length">
            <td colspan="8" class="empty-cell">加载中...</td>
          </tr>
          <tr v-else-if="!dictionaryItems.length">
            <td colspan="8" class="empty-cell">该字典暂无字典项</td>
          </tr>
          <tr v-for="item in dictionaryItems" v-else :key="item.id">
            <td>{{ item.itemCode }}</td>
            <td>{{ item.itemLabel }}</td>
            <td>{{ item.itemValue }}</td>
            <td>{{ item.sort }}</td>
            <td>
              <span class="status-tag" :class="item.status === 'ENABLED' ? 'on' : 'off'">
                {{ item.status === 'ENABLED' ? '启用' : '禁用' }}
              </span>
            </td>
            <td>{{ item.isDefault ? '是' : '否' }}</td>
            <td>{{ item.description || '-' }}</td>
            <td class="action-col">
              <button class="mini-btn" :disabled="submitting" @click="openEditItemDialog(item)">编辑</button>
              <button class="mini-btn" :disabled="submitting" @click="toggleItemStatus(item)">
                {{ item.status === 'ENABLED' ? '禁用' : '启用' }}
              </button>
              <button class="mini-btn danger" :disabled="submitting" @click="removeItem(item)">删除</button>
            </td>
          </tr>
          </tbody>
        </table>
      </div>

      <div v-if="selectedDictionary" class="mobile-item-list">
        <div v-if="itemsLoading && !dictionaryItems.length" class="mobile-empty">加载中...</div>
        <div v-else-if="!dictionaryItems.length" class="mobile-empty">该字典暂无字典项</div>
        <article v-for="item in dictionaryItems" v-else :key="item.id" class="mobile-dict-card">
          <div class="mobile-card-head">
            <div class="mobile-card-title-wrap">
              <strong class="mobile-card-title">{{ item.itemLabel }}</strong>
              <span class="mobile-card-code">{{ item.itemCode }}</span>
            </div>
            <span class="status-tag" :class="item.status === 'ENABLED' ? 'on' : 'off'">
              {{ item.status === 'ENABLED' ? '启用' : '禁用' }}
            </span>
          </div>

          <div class="mobile-card-grid">
            <p><span>实际值</span><strong>{{ item.itemValue }}</strong></p>
            <p><span>排序</span><strong>{{ item.sort }}</strong></p>
            <p><span>默认项</span><strong>{{ item.isDefault ? '是' : '否' }}</strong></p>
            <p><span>说明</span><strong>{{ item.description || '-' }}</strong></p>
          </div>

          <div class="mobile-card-actions">
            <button class="mini-btn" :disabled="submitting" @click="openEditItemDialog(item)">编辑</button>
            <button class="mini-btn" :disabled="submitting" @click="toggleItemStatus(item)">
              {{ item.status === 'ENABLED' ? '禁用' : '启用' }}
            </button>
            <button class="mini-btn danger" :disabled="submitting" @click="removeItem(item)">删除</button>
          </div>
        </article>
      </div>
    </section>

    <div v-if="showDictionaryDialog" class="dialog-mask" @click.self="closeDictionaryDialog">
      <div class="dialog">
        <h3 class="dialog-title">{{ dictionaryDialogMode === 'create' ? '新增数据字典' : '编辑数据字典' }}</h3>
        <form class="dialog-form" @submit.prevent="submitDictionaryDialog">
          <label class="field-item">
            <span>字典编号</span>
            <input
              v-model.trim="dictionaryForm.dictCode"
              :disabled="dictionaryDialogMode === 'edit' || submitting"
              maxlength="64"
              placeholder="如 WORK_LOG_PROJECT"
              required
            />
          </label>
          <label class="field-item">
            <span>字典名称</span>
            <input
              v-model.trim="dictionaryForm.dictName"
              :disabled="submitting"
              maxlength="32"
              placeholder="请输入字典名称"
              required
            />
          </label>
          <label class="field-item">
            <span>状态</span>
            <GlassSelect v-model="dictionaryForm.status" :options="statusOptions" :disabled="submitting"/>
          </label>
          <label class="field-item">
            <span>作用范围</span>
            <GlassSelect v-model="dictionaryForm.dictScope" :options="scopeOptions" :disabled="submitting"/>
          </label>
          <label class="field-item">
            <span>引用应用</span>
            <input
              v-model.trim="dictionaryForm.referenceAppsText"
              :disabled="submitting"
              maxlength="120"
              placeholder="多个应用用逗号分隔，如 工作日志,用户管理"
            />
          </label>
          <label class="field-item">
            <span>说明</span>
            <textarea
              v-model.trim="dictionaryForm.description"
              :disabled="submitting"
              rows="3"
              maxlength="160"
              placeholder="可选"
            />
          </label>

          <div class="dialog-actions">
            <button type="button" class="ghost-btn" :disabled="submitting" @click="closeDictionaryDialog">取消</button>
            <button type="submit" class="action-btn" :disabled="submitting">
              {{ submitting ? '提交中...' : '确认' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="showItemDialog" class="dialog-mask" @click.self="closeItemDialog">
      <div class="dialog">
        <h3 class="dialog-title">{{ itemDialogMode === 'create' ? '新增字典项' : '编辑字典项' }}</h3>
        <form class="dialog-form" @submit.prevent="submitItemDialog">
          <label class="field-item">
            <span>字典项编码</span>
            <input
              v-model.trim="itemForm.itemCode"
              :disabled="itemDialogMode === 'edit' || submitting"
              maxlength="64"
              placeholder="如 backend"
              required
            />
          </label>
          <label class="field-item">
            <span>显示名称</span>
            <input
              v-model.trim="itemForm.itemLabel"
              :disabled="submitting"
              maxlength="32"
              placeholder="如 后端项目"
              required
            />
          </label>
          <label class="field-item">
            <span>实际值</span>
            <input
              v-model.trim="itemForm.itemValue"
              :disabled="submitting"
              maxlength="64"
              placeholder="如 BACKEND"
              required
            />
          </label>
          <label class="field-item">
            <span>排序</span>
            <input
              v-model.number="itemForm.sort"
              :disabled="submitting"
              type="number"
              min="0"
              step="1"
              required
            />
          </label>
          <label class="field-item">
            <span>状态</span>
            <GlassSelect v-model="itemForm.status" :options="statusOptions" :disabled="submitting"/>
          </label>
          <label class="checkbox-item">
            <input v-model="itemForm.isDefault" type="checkbox" :disabled="submitting"/>
            <span>设为默认项</span>
          </label>
          <label class="field-item">
            <span>说明</span>
            <textarea
              v-model.trim="itemForm.description"
              :disabled="submitting"
              rows="3"
              maxlength="160"
              placeholder="可选"
            />
          </label>

          <div class="dialog-actions">
            <button type="button" class="ghost-btn" :disabled="submitting" @click="closeItemDialog">取消</button>
            <button type="submit" class="action-btn" :disabled="submitting">
              {{ submitting ? '提交中...' : '确认' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import {computed, onMounted, reactive, ref} from 'vue'
import {useRouter} from 'vue-router'
import GlassSelect from '@/components/GlassSelect.vue'
import {
  createDataDictionary,
  createDataDictionaryItem,
  deleteDataDictionary,
  deleteDataDictionaryItem,
  listDataDictionaries,
  listDataDictionaryItems,
  updateDataDictionary,
  updateDataDictionaryItem,
  updateDataDictionaryItemStatus,
  updateDataDictionaryStatus
} from '@/api/dataDictionary'

function extractErrorMessage(error, fallback) {
  const data = error?.response?.data || {}
  return data.message || data.msg || fallback
}

function unwrapData(res) {
  const payload = res?.data
  if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data
  }
  return payload
}

function parseListPayload(payload) {
  if (Array.isArray(payload)) {
    return {
      list: payload,
      total: payload.length
    }
  }

  if (!payload || typeof payload !== 'object') {
    return {
      list: [],
      total: 0
    }
  }

  const list = payload.list
    || payload.records
    || payload.rows
    || payload.items
    || payload.content
    || payload.result
    || []

  const total = Number(
    payload.total
    ?? payload.totalCount
    ?? payload.count
    ?? payload.pageTotal
    ?? (Array.isArray(list) ? list.length : 0)
  )

  return {
    list: Array.isArray(list) ? list : [],
    total: Number.isNaN(total) ? 0 : total
  }
}

function normalizeStatus(value) {
  if (typeof value === 'boolean') {
    return value ? 'ENABLED' : 'DISABLED'
  }
  const text = `${value ?? ''}`.toUpperCase()
  if (['DISABLED', 'INACTIVE', '0', 'LOCKED', 'FORBIDDEN'].includes(text)) {
    return 'DISABLED'
  }
  return 'ENABLED'
}

function normalizeReferenceApps(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean)
  }
  if (typeof value === 'string') {
    return value
      .split(/[,，/]/)
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

function normalizeDictionary(item) {
  const source = item || {}
  return {
    id: source.id ?? source.dictionaryId ?? source.dictId,
    dictCode: source.dictCode || source.code || source.dictionaryCode || '',
    dictName: source.dictName || source.name || source.dictionaryName || '',
    dictScope: `${source.dictScope || source.scope || source.rangeScope || 'PUBLIC'}`.toUpperCase(),
    status: normalizeStatus(source.status ?? source.enabled),
    creatorName: source.creatorName || source.createBy || source.creator || '',
    referenceApps: normalizeReferenceApps(source.referenceApps || source.referenceApp || source.applications),
    itemCount: Number(source.itemCount ?? source.itemsCount ?? source.count ?? 0) || 0,
    createTime: source.createTime || source.createdAt || '',
    description: source.description || source.remark || ''
  }
}

function normalizeDictionaryItem(item) {
  const source = item || {}
  return {
    id: source.id ?? source.itemId,
    itemCode: source.itemCode || source.code || '',
    itemLabel: source.itemLabel || source.label || source.name || '',
    itemValue: source.itemValue || source.value || '',
    sort: Number(source.sort ?? source.sortNo ?? 0) || 0,
    status: normalizeStatus(source.status ?? source.enabled),
    isDefault: Boolean(source.isDefault ?? source.defaultFlag ?? source.defaulted),
    description: source.description || source.remark || ''
  }
}

function extractEntityId(payload, candidates = ['id']) {
  if (!payload || typeof payload !== 'object') {
    return null
  }
  for (const key of candidates) {
    if (payload[key] !== undefined && payload[key] !== null) {
      return payload[key]
    }
  }
  return null
}

export default {
  name: 'DataDictionary',
  components: {
    GlassSelect
  },
  setup() {
    const router = useRouter()

    const loading = ref(false)
    const itemsLoading = ref(false)
    const submitting = ref(false)

    const dictionaries = ref([])
    const dictionaryItems = ref([])
    const selectedDictionaryId = ref(null)

    const filters = reactive({
      keyword: '',
      status: '',
      dictScope: '',
      referenceApp: ''
    })

    const pagination = reactive({
      pageNo: 1,
      pageSize: 10,
      total: 0
    })

    const showDictionaryDialog = ref(false)
    const dictionaryDialogMode = ref('create')
    const dictionaryForm = reactive({
      id: null,
      dictCode: '',
      dictName: '',
      dictScope: 'PUBLIC',
      status: 'ENABLED',
      referenceAppsText: '',
      description: ''
    })

    const showItemDialog = ref(false)
    const itemDialogMode = ref('create')
    const itemForm = reactive({
      id: null,
      itemCode: '',
      itemLabel: '',
      itemValue: '',
      sort: 1,
      status: 'ENABLED',
      isDefault: false,
      description: ''
    })

    const pageCount = computed(() => {
      const totalPage = Math.ceil((pagination.total || 0) / pagination.pageSize)
      return Math.max(totalPage, 1)
    })

    const selectedDictionary = computed(() => {
      return dictionaries.value.find((item) => item.id === selectedDictionaryId.value) || null
    })

    const referenceAppOptions = computed(() => {
      const set = new Set()
      dictionaries.value.forEach((item) => {
        item.referenceApps.forEach((app) => set.add(app))
      })
      return Array.from(set)
    })

    const statusFilterOptions = [
      {label: '全部', value: ''},
      {label: '启用', value: 'ENABLED'},
      {label: '禁用', value: 'DISABLED'}
    ]

    const statusOptions = [
      {label: '启用', value: 'ENABLED'},
      {label: '禁用', value: 'DISABLED'}
    ]

    const scopeFilterOptions = [
      {label: '全部', value: ''},
      {label: '公共', value: 'PUBLIC'},
      {label: '个人', value: 'PERSONAL'}
    ]

    const scopeOptions = [
      {label: '公共', value: 'PUBLIC'},
      {label: '个人', value: 'PERSONAL'}
    ]

    const pageSizeOptions = [
      {label: '10 条/页', value: 10},
      {label: '20 条/页', value: 20},
      {label: '50 条/页', value: 50}
    ]

    const referenceAppSelectOptions = computed(() => [
      {label: '全部', value: ''},
      ...referenceAppOptions.value.map((item) => ({label: item, value: item}))
    ])

    const formatApps = (apps) => {
      return apps && apps.length ? apps.join('、') : '-'
    }

    const formatDictScope = (dictScope) => {
      return dictScope === 'PERSONAL' ? '个人' : '公共'
    }

    const fetchDictionaryItems = async () => {
      if (!selectedDictionaryId.value) {
        dictionaryItems.value = []
        return
      }

      itemsLoading.value = true
      try {
        const res = await listDataDictionaryItems(selectedDictionaryId.value)
        const payload = unwrapData(res)
        const {list} = parseListPayload(payload)
        dictionaryItems.value = list
          .map((item) => normalizeDictionaryItem(item))
          .sort((a, b) => a.sort - b.sort)
      } catch (error) {
        console.error(error)
        dictionaryItems.value = []
        alert(extractErrorMessage(error, '加载字典项失败，请稍后重试'))
      } finally {
        itemsLoading.value = false
      }
    }

    const fetchDictionaries = async () => {
      loading.value = true
      try {
        const params = {
          pageNo: pagination.pageNo,
          pageSize: pagination.pageSize
        }
        if (filters.keyword) {
          params.keyword = filters.keyword
        }
        if (filters.status) {
          params.status = filters.status
        }
        if (filters.dictScope) {
          params.dictScope = filters.dictScope
        }
        if (filters.referenceApp) {
          params.referenceApp = filters.referenceApp
        }

        const res = await listDataDictionaries(params)
        const payload = unwrapData(res)
        const {list, total} = parseListPayload(payload)
        dictionaries.value = list
          .map((item) => normalizeDictionary(item))
          .filter((item) => item.id !== null && item.id !== undefined)
        pagination.total = total

        if (!dictionaries.value.length) {
          selectedDictionaryId.value = null
          dictionaryItems.value = []
          return
        }

        const exists = dictionaries.value.some((item) => item.id === selectedDictionaryId.value)
        selectedDictionaryId.value = exists ? selectedDictionaryId.value : dictionaries.value[0].id
        await fetchDictionaryItems()
      } catch (error) {
        console.error(error)
        dictionaries.value = []
        dictionaryItems.value = []
        selectedDictionaryId.value = null
        pagination.total = 0
        alert(extractErrorMessage(error, '加载数据字典失败，请稍后重试'))
      } finally {
        loading.value = false
      }
    }

    const goBackHome = () => {
      router.push('/home')
    }

    const searchDictionaries = () => {
      pagination.pageNo = 1
      fetchDictionaries()
    }

    const resetFilters = () => {
      filters.keyword = ''
      filters.status = ''
      filters.dictScope = ''
      filters.referenceApp = ''
      pagination.pageNo = 1
      fetchDictionaries()
    }

    const changePage = (direction) => {
      const nextPage = pagination.pageNo + direction
      if (nextPage < 1 || nextPage > pageCount.value) {
        return
      }
      pagination.pageNo = nextPage
      fetchDictionaries()
    }

    const changePageSize = () => {
      pagination.pageNo = 1
      fetchDictionaries()
    }

    const selectDictionary = (item) => {
      selectedDictionaryId.value = item.id
      fetchDictionaryItems()
    }

    const openCreateDictionaryDialog = () => {
      if (submitting.value) {
        return
      }
      dictionaryDialogMode.value = 'create'
      dictionaryForm.id = null
      dictionaryForm.dictCode = ''
      dictionaryForm.dictName = ''
      dictionaryForm.dictScope = 'PUBLIC'
      dictionaryForm.status = 'ENABLED'
      dictionaryForm.referenceAppsText = ''
      dictionaryForm.description = ''
      showDictionaryDialog.value = true
    }

    const openEditDictionaryDialog = (item) => {
      if (submitting.value) {
        return
      }
      dictionaryDialogMode.value = 'edit'
      dictionaryForm.id = item.id
      dictionaryForm.dictCode = item.dictCode
      dictionaryForm.dictName = item.dictName
      dictionaryForm.dictScope = item.dictScope || 'PUBLIC'
      dictionaryForm.status = item.status
      dictionaryForm.referenceAppsText = item.referenceApps.join(', ')
      dictionaryForm.description = item.description
      showDictionaryDialog.value = true
    }

    const closeDictionaryDialog = () => {
      if (submitting.value) {
        return
      }
      showDictionaryDialog.value = false
    }

    const submitDictionaryDialog = async () => {
      if (!dictionaryForm.dictCode) {
        alert('字典编号不能为空')
        return
      }
      if (!dictionaryForm.dictName) {
        alert('字典名称不能为空')
        return
      }

      const payload = {
        dictCode: dictionaryForm.dictCode,
        dictName: dictionaryForm.dictName,
        dictScope: dictionaryForm.dictScope,
        status: dictionaryForm.status,
        enabled: dictionaryForm.status === 'ENABLED',
        referenceApps: normalizeReferenceApps(dictionaryForm.referenceAppsText),
        description: dictionaryForm.description
      }

      submitting.value = true
      try {
        let nextSelectedId = selectedDictionaryId.value

        if (dictionaryDialogMode.value === 'create') {
          const res = await createDataDictionary(payload)
          const createdId = extractEntityId(unwrapData(res), ['id', 'dictionaryId', 'dictId'])
          if (createdId !== null) {
            nextSelectedId = createdId
          }
          pagination.pageNo = 1
        } else {
          await updateDataDictionary(dictionaryForm.id, payload)
          nextSelectedId = dictionaryForm.id
        }

        selectedDictionaryId.value = nextSelectedId
        showDictionaryDialog.value = false
        await fetchDictionaries()
        alert(dictionaryDialogMode.value === 'create' ? '数据字典新增成功' : '数据字典更新成功')
      } catch (error) {
        console.error(error)
        alert(extractErrorMessage(error, '保存失败，请稍后重试'))
      } finally {
        submitting.value = false
      }
    }

    const toggleDictionaryStatus = async (item) => {
      const nextStatus = item.status === 'ENABLED' ? 'DISABLED' : 'ENABLED'

      submitting.value = true
      try {
        await updateDataDictionaryStatus(item.id, {
          status: nextStatus,
          enabled: nextStatus === 'ENABLED'
        })
        await fetchDictionaries()
      } catch (error) {
        console.error(error)
        alert(extractErrorMessage(error, '状态更新失败'))
      } finally {
        submitting.value = false
      }
    }

    const removeDictionary = async (item) => {
      const confirmed = confirm(`确认删除字典【${item.dictName}】吗？其下字典项也会被清理。`)
      if (!confirmed) {
        return
      }

      submitting.value = true
      try {
        await deleteDataDictionary(item.id)
        if (selectedDictionaryId.value === item.id) {
          selectedDictionaryId.value = null
        }
        await fetchDictionaries()
        alert('删除成功')
      } catch (error) {
        console.error(error)
        alert(extractErrorMessage(error, '删除失败'))
      } finally {
        submitting.value = false
      }
    }

    const openCreateItemDialog = () => {
      if (!selectedDictionary.value || submitting.value) {
        return
      }
      itemDialogMode.value = 'create'
      itemForm.id = null
      itemForm.itemCode = ''
      itemForm.itemLabel = ''
      itemForm.itemValue = ''
      itemForm.sort = dictionaryItems.value.length + 1
      itemForm.status = 'ENABLED'
      itemForm.isDefault = !dictionaryItems.value.length
      itemForm.description = ''
      showItemDialog.value = true
    }

    const openEditItemDialog = (item) => {
      if (submitting.value) {
        return
      }
      itemDialogMode.value = 'edit'
      itemForm.id = item.id
      itemForm.itemCode = item.itemCode
      itemForm.itemLabel = item.itemLabel
      itemForm.itemValue = item.itemValue
      itemForm.sort = item.sort
      itemForm.status = item.status
      itemForm.isDefault = item.isDefault
      itemForm.description = item.description
      showItemDialog.value = true
    }

    const closeItemDialog = () => {
      if (submitting.value) {
        return
      }
      showItemDialog.value = false
    }

    const submitItemDialog = async () => {
      if (!selectedDictionary.value) {
        alert('请先选择字典')
        return
      }
      if (!itemForm.itemCode || !itemForm.itemLabel || !itemForm.itemValue) {
        alert('请完整填写字典项信息')
        return
      }

      const payload = {
        itemCode: itemForm.itemCode,
        itemLabel: itemForm.itemLabel,
        itemValue: itemForm.itemValue,
        sort: Number(itemForm.sort) || 0,
        status: itemForm.status,
        enabled: itemForm.status === 'ENABLED',
        isDefault: itemForm.isDefault,
        description: itemForm.description
      }

      submitting.value = true
      try {
        if (itemDialogMode.value === 'create') {
          await createDataDictionaryItem(selectedDictionary.value.id, payload)
        } else {
          await updateDataDictionaryItem(selectedDictionary.value.id, itemForm.id, payload)
        }

        showItemDialog.value = false
        await fetchDictionaries()
        alert(itemDialogMode.value === 'create' ? '字典项新增成功' : '字典项更新成功')
      } catch (error) {
        console.error(error)
        alert(extractErrorMessage(error, '保存失败，请稍后重试'))
      } finally {
        submitting.value = false
      }
    }

    const toggleItemStatus = async (item) => {
      if (!selectedDictionary.value) {
        return
      }
      const nextStatus = item.status === 'ENABLED' ? 'DISABLED' : 'ENABLED'

      submitting.value = true
      try {
        await updateDataDictionaryItemStatus(selectedDictionary.value.id, item.id, {
          status: nextStatus,
          enabled: nextStatus === 'ENABLED'
        })
        await fetchDictionaryItems()
      } catch (error) {
        console.error(error)
        alert(extractErrorMessage(error, '状态更新失败'))
      } finally {
        submitting.value = false
      }
    }

    const removeItem = async (item) => {
      if (!selectedDictionary.value) {
        return
      }
      const confirmed = confirm(`确认删除字典项【${item.itemLabel}】吗？`)
      if (!confirmed) {
        return
      }

      submitting.value = true
      try {
        await deleteDataDictionaryItem(selectedDictionary.value.id, item.id)
        await fetchDictionaries()
        alert('删除成功')
      } catch (error) {
        console.error(error)
        alert(extractErrorMessage(error, '删除失败'))
      } finally {
        submitting.value = false
      }
    }

    onMounted(() => {
      fetchDictionaries()
    })

    return {
      loading,
      itemsLoading,
      submitting,
      dictionaries,
      dictionaryItems,
      selectedDictionaryId,
      selectedDictionary,
      filters,
      pagination,
      pageCount,
      referenceAppOptions,
      referenceAppSelectOptions,
      statusFilterOptions,
      statusOptions,
      scopeFilterOptions,
      scopeOptions,
      pageSizeOptions,
      formatDictScope,
      showDictionaryDialog,
      dictionaryDialogMode,
      dictionaryForm,
      showItemDialog,
      itemDialogMode,
      itemForm,
      formatApps,
      goBackHome,
      searchDictionaries,
      resetFilters,
      fetchDictionaries,
      fetchDictionaryItems,
      changePage,
      changePageSize,
      selectDictionary,
      openCreateDictionaryDialog,
      openEditDictionaryDialog,
      closeDictionaryDialog,
      submitDictionaryDialog,
      toggleDictionaryStatus,
      removeDictionary,
      openCreateItemDialog,
      openEditItemDialog,
      closeItemDialog,
      submitItemDialog,
      toggleItemStatus,
      removeItem
    }
  }
}
</script>

<style scoped>
.dict-page {
  width: 100%;
  height: 100%;
  padding: 18px 22px;
  color: #fff;
  overflow: auto;
}

.page-nav {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 12px;
}

.back-home-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 42px;
  padding: 0 16px 0 12px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  color: #fff;
  cursor: pointer;
  background: rgba(12, 32, 52, 0.58);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(12px);
  transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;
}

.back-home-btn:hover {
  transform: translateY(-1px);
  background: rgba(16, 40, 64, 0.76);
  border-color: rgba(255, 255, 255, 0.28);
}

.back-home-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.14);
}

.hero-panel {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
  padding: 16px 18px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: linear-gradient(135deg, rgba(7, 22, 39, 0.82), rgba(17, 49, 73, 0.72));
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(16px);
}

.page-title {
  margin: 0;
  font-size: 26px;
}

.page-subtitle {
  margin: 6px 0 0;
  color: rgba(255, 255, 255, 0.78);
  font-size: 13px;
}

.hero-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.hero-tag {
  padding: 7px 12px;
  border-radius: 999px;
  font-size: 12px;
  background: rgba(91, 180, 255, 0.18);
  color: #d7f0ff;
}

.panel {
  border-radius: 14px;
  background:
    linear-gradient(135deg, rgba(10, 40, 60, 0.62), rgba(7, 25, 46, 0.68));
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.26);
  backdrop-filter: blur(12px);
}

.filter-panel,
.table-panel,
.items-panel {
  padding: 14px 16px;
}

.table-panel,
.items-panel {
  margin-top: 12px;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
}

.field-item input,
.field-item select,
.field-item textarea {
  width: 100%;
  height: 36px;
  border: none;
  outline: none;
  border-radius: 8px;
  padding: 0 10px;
  color: #fff;
  background: rgba(255, 255, 255, 0.14);
}

.field-item textarea {
  min-height: 72px;
  height: auto;
  padding: 8px 10px;
  resize: vertical;
}

.field-item input::placeholder,
.field-item textarea::placeholder {
  color: rgba(255, 255, 255, 0.62);
}

.field-item option {
  color: #111;
}

.filter-actions,
.toolbar,
.items-head,
.pager,
.dialog-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.filter-actions,
.toolbar,
.pager {
  margin-top: 12px;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.items-title {
  margin: 0;
  font-size: 18px;
}

.items-subtitle {
  margin: 6px 0 0;
  color: rgba(255, 255, 255, 0.76);
  font-size: 13px;
}

.table-wrap {
  width: 100%;
  overflow-x: auto;
}

.mobile-dict-list,
.mobile-item-list {
  display: none;
}

.mobile-dict-card {
  border-radius: 14px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.08);
}

.activeMobileCard {
  border-color: rgba(82, 171, 255, 0.42);
  background: rgba(82, 171, 255, 0.14);
}

.mobile-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.mobile-card-title-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.mobile-card-title {
  font-size: 15px;
  word-break: break-word;
}

.mobile-card-code {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.66);
  word-break: break-all;
}

.mobile-card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.mobile-card-grid p {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mobile-card-grid span {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.62);
}

.mobile-card-grid strong {
  font-size: 13px;
  font-weight: 500;
  color: #fff;
  word-break: break-word;
}

.mobile-card-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.mobile-empty {
  padding: 24px 12px;
  text-align: center;
  color: rgba(255, 255, 255, 0.72);
}

.dict-table {
  width: 100%;
  min-width: 1080px;
  border-collapse: collapse;
}

.dict-table th,
.dict-table td {
  padding: 10px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  text-align: left;
  font-size: 13px;
}

.dict-table th {
  color: rgba(255, 255, 255, 0.88);
  font-weight: 600;
}

.activeRow {
  background: rgba(82, 171, 255, 0.14);
}

.action-col {
  width: 280px;
  white-space: nowrap;
}

.empty-cell {
  text-align: center !important;
  padding: 28px 8px !important;
  color: rgba(255, 255, 255, 0.72);
}

.status-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 52px;
  height: 24px;
  border-radius: 999px;
  padding: 0 10px;
  font-size: 12px;
}

.status-tag.on {
  color: #c8f7d4;
  background: rgba(34, 197, 94, 0.24);
}

.status-tag.off {
  color: #ffd0d0;
  background: rgba(239, 68, 68, 0.22);
}

.pager-left,
.pager-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pager-left select {
  border: none;
  outline: none;
  border-radius: 8px;
  height: 32px;
  padding: 0 8px;
  color: #fff;
  background: rgba(255, 255, 255, 0.16);
}

.pager-left option {
  color: #111;
}

.dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px;
  background: rgba(0, 0, 0, 0.44);
}

.dialog {
  width: 100%;
  max-width: 560px;
  max-height: calc(100vh - 28px);
  overflow: auto;
  border-radius: 14px;
  padding: 14px;
  background: rgba(10, 27, 49, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.16);
}

.dialog-title {
  margin: 2px 0 12px;
  font-size: 18px;
}

.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.checkbox-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.88);
}

.ghost-btn,
.action-btn,
.mini-btn {
  border: none;
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
}

.ghost-btn,
.action-btn {
  min-width: 82px;
  height: 34px;
  padding: 0 12px;
}

.mini-btn {
  min-width: 54px;
  height: 28px;
  padding: 0 8px;
  margin-right: 6px;
  background: rgba(255, 255, 255, 0.16);
}

.mini-btn:last-child {
  margin-right: 0;
}

.ghost-btn {
  background: rgba(255, 255, 255, 0.16);
}

.action-btn {
  background: linear-gradient(135deg, rgba(53, 171, 154, 0.88), rgba(58, 128, 255, 0.88));
}

.danger,
.mini-btn.danger {
  background: rgba(224, 79, 79, 0.76);
}

.ghost-btn:disabled,
.action-btn:disabled,
.mini-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Polished glassmorphism layer for the data dictionary workspace. */
.dict-page {
  color: #eef7ff;
}

.dict-page .hero-panel,
.dict-page .filter-panel,
.dict-page .table-panel,
.dict-page .items-panel {
  border: 1px solid rgba(221, 239, 255, 0.18) !important;
  background:
    linear-gradient(180deg, rgba(19, 48, 58, 0.68), rgba(7, 20, 35, 0.76)),
    rgba(6, 24, 34, 0.54) !important;
  box-shadow:
    0 28px 70px rgba(0, 7, 18, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.14) !important;
  backdrop-filter: blur(24px) saturate(150%);
}

.dict-page .hero-panel,
.dict-page .filter-panel {
  border-radius: 24px !important;
}

.dict-page .table-panel,
.dict-page .items-panel {
  padding: 18px !important;
  border-radius: 22px !important;
}

.dict-page .page-title {
  color: #f4fbff !important;
  font-weight: 860;
  text-shadow: 0 1px 18px rgba(109, 226, 213, 0.12);
}

.dict-page .page-subtitle,
.dict-page .items-subtitle {
  color: rgba(221, 236, 246, 0.74) !important;
}

.dict-page .hero-tag,
.dict-page .toolbar-right {
  min-height: 34px;
  padding: 0 13px;
  border: 1px solid rgba(226, 243, 255, 0.18) !important;
  border-radius: 999px;
  color: rgba(240, 250, 255, 0.92) !important;
  background: rgba(255, 255, 255, 0.09) !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.dict-page .filter-actions {
  justify-content: flex-start !important;
}

.dict-page .filter-actions .ghost-btn {
  margin-left: 0 !important;
}

.dict-page .field-item {
  color: rgba(225, 241, 251, 0.82) !important;
  font-weight: 760;
}

.dict-page .field-item input,
.dict-page .field-item textarea {
  border: 1px solid rgba(221, 239, 255, 0.24) !important;
  border-radius: 14px !important;
  color: #eff9ff !important;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.07)),
    rgba(6, 24, 36, 0.5) !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.14),
    0 10px 24px rgba(0, 7, 18, 0.16) !important;
  backdrop-filter: blur(18px) saturate(145%);
}

.dict-page .field-item input::placeholder,
.dict-page .field-item textarea::placeholder {
  color: rgba(220, 234, 246, 0.48) !important;
}

.dict-page .field-item input:focus,
.dict-page .field-item textarea:focus {
  border-color: rgba(93, 231, 213, 0.64) !important;
  box-shadow:
    0 0 0 3px rgba(93, 231, 213, 0.16),
    0 12px 26px rgba(0, 7, 18, 0.22) !important;
}

.dict-page .toolbar,
.dict-page .items-head,
.dict-page .pager {
  color: rgba(244, 251, 255, 0.94) !important;
}

.dict-page .toolbar {
  margin-top: 0 !important;
  margin-bottom: 14px !important;
}

.dict-page .table-wrap {
  border-radius: 20px !important;
  border: 1px solid rgba(221, 239, 255, 0.2) !important;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.04)),
    rgba(7, 20, 34, 0.46) !important;
  box-shadow:
    0 22px 56px rgba(0, 7, 18, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.12) !important;
  overflow: auto !important;
  backdrop-filter: blur(22px) saturate(150%);
}

.dict-page .dict-table {
  min-width: 1120px !important;
  border-collapse: separate !important;
  border-spacing: 0 !important;
  background: transparent !important;
}

.dict-page .dict-table th,
.dict-page .dict-table td {
  padding: 13px 14px !important;
  border-bottom: 1px solid rgba(226, 241, 255, 0.13) !important;
  color: rgba(239, 248, 255, 0.9) !important;
  font-size: 14px !important;
  line-height: 1.36 !important;
  text-align: left !important;
}

.dict-page .dict-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  height: 46px;
  background:
    linear-gradient(180deg, rgba(244, 249, 255, 0.17), rgba(222, 239, 255, 0.1)),
    rgba(11, 28, 43, 0.72) !important;
  color: rgba(234, 245, 255, 0.82) !important;
  font-size: 12px !important;
  font-weight: 820 !important;
  letter-spacing: 0 !important;
  box-shadow: inset 0 -1px 0 rgba(226, 241, 255, 0.18);
  backdrop-filter: blur(20px) saturate(155%);
}

.dict-page .dict-table tbody tr {
  cursor: pointer;
  background: rgba(255, 255, 255, 0.055) !important;
  transition:
    background-color 160ms cubic-bezier(0.2, 0.9, 0.2, 1),
    box-shadow 160ms cubic-bezier(0.2, 0.9, 0.2, 1),
    transform 160ms cubic-bezier(0.2, 0.9, 0.2, 1);
}

.dict-page .dict-table tbody tr:nth-child(even) {
  background: rgba(255, 255, 255, 0.035) !important;
}

.dict-page .dict-table tbody tr:hover {
  background: rgba(83, 211, 199, 0.14) !important;
  box-shadow: inset 4px 0 0 rgba(83, 211, 199, 0.82) !important;
}

.dict-page .dict-table tbody tr.activeRow {
  background:
    linear-gradient(90deg, rgba(80, 143, 255, 0.22), rgba(79, 219, 205, 0.08)) !important;
  box-shadow:
    inset 4px 0 0 #4aa7ff,
    inset 0 1px 0 rgba(255, 255, 255, 0.08) !important;
}

.dict-page .dict-table td:first-child,
.dict-page .dict-table td:nth-child(7),
.dict-page .dict-table td:nth-child(8) {
  font-variant-numeric: tabular-nums;
}

.dict-page .dict-table td:first-child {
  color: #d6f2ff !important;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-size: 13px !important;
  font-weight: 760;
}

.dict-page .dict-table td:nth-child(2),
.dict-page .dict-table td:nth-child(5),
.dict-page .dict-table td:nth-child(6) {
  color: #f7fbff !important;
  font-weight: 700;
}

.dict-page .action-col {
  width: 320px !important;
  text-align: right !important;
  white-space: nowrap !important;
}

.dict-page .action-col .mini-btn,
.dict-page .mini-btn {
  min-width: auto !important;
  height: 32px !important;
  margin-right: 6px !important;
  padding: 0 12px !important;
  border-radius: 999px !important;
  border: 1px solid rgba(221, 239, 255, 0.22) !important;
  background: rgba(255, 255, 255, 0.1) !important;
  color: rgba(242, 250, 255, 0.9) !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    0 7px 16px rgba(0, 8, 18, 0.18) !important;
  font-size: 13px !important;
  font-weight: 750 !important;
  backdrop-filter: blur(14px);
}

.dict-page .action-col .mini-btn:first-child {
  border-color: rgba(94, 234, 212, 0.34) !important;
  background: rgba(20, 184, 166, 0.18) !important;
  color: #c6fff4 !important;
}

.dict-page .action-col .mini-btn:not(:disabled):hover,
.dict-page .mini-btn:not(:disabled):hover {
  transform: translateY(-1px);
  border-color: rgba(148, 217, 255, 0.42) !important;
  background: rgba(255, 255, 255, 0.16) !important;
}

.dict-page .action-col .mini-btn.danger,
.dict-page .mini-btn.danger {
  border-color: rgba(255, 151, 151, 0.28) !important;
  background: rgba(220, 38, 38, 0.16) !important;
  color: #ffd0d0 !important;
}

.dict-page .status-tag {
  height: 27px !important;
  min-width: 58px !important;
  padding: 0 12px !important;
  border-radius: 999px !important;
  font-size: 12px !important;
  font-weight: 820 !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.28),
    0 8px 18px rgba(0, 7, 18, 0.14);
}

.dict-page .status-tag.on {
  border: 1px solid rgba(95, 232, 159, 0.36) !important;
  background: rgba(34, 197, 94, 0.18) !important;
  color: #baf7cd !important;
}

.dict-page .status-tag.off {
  border: 1px solid rgba(255, 151, 151, 0.3) !important;
  background: rgba(239, 68, 68, 0.16) !important;
  color: #ffd3d3 !important;
}

.dict-page .empty-cell {
  color: rgba(226, 240, 251, 0.68) !important;
  background: rgba(255, 255, 255, 0.035) !important;
}

.dict-page .pager {
  margin-top: 14px !important;
  padding: 2px 0 0;
}

.dict-page .pager-left,
.dict-page .pager-right {
  min-height: 40px;
}

.dict-page .page-size-select {
  min-width: 118px;
}

.dict-page .ghost-btn,
.dict-page .action-btn {
  min-height: 38px !important;
  border-radius: 999px !important;
  font-weight: 780 !important;
}

.dict-page .ghost-btn {
  border: 1px solid rgba(226, 243, 255, 0.2) !important;
  background: rgba(255, 255, 255, 0.12) !important;
  color: rgba(242, 250, 255, 0.92) !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.14),
    0 10px 24px rgba(0, 7, 18, 0.18) !important;
  backdrop-filter: blur(16px) saturate(145%);
}

.dict-page .action-btn {
  border: 1px solid rgba(91, 235, 218, 0.28) !important;
  background:
    linear-gradient(180deg, rgba(32, 189, 173, 0.94), rgba(10, 125, 121, 0.96)) !important;
  color: #ffffff !important;
  box-shadow:
    0 14px 30px rgba(3, 105, 99, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.28) !important;
}

.dict-page .ghost-btn:not(:disabled):hover,
.dict-page .action-btn:not(:disabled):hover {
  transform: translateY(-1px);
}

.dict-page .dialog-mask {
  background: rgba(1, 8, 16, 0.42) !important;
  backdrop-filter: blur(12px) saturate(130%) !important;
}

.dict-page .dialog {
  position: relative;
  border: 1px solid rgba(230, 244, 255, 0.2) !important;
  border-radius: 24px !important;
  background:
    linear-gradient(180deg, rgba(26, 57, 72, 0.82), rgba(8, 22, 36, 0.86)),
    rgba(10, 26, 40, 0.72) !important;
  box-shadow:
    0 34px 90px rgba(0, 7, 18, 0.48),
    inset 0 1px 0 rgba(255, 255, 255, 0.16) !important;
  backdrop-filter: blur(30px) saturate(160%) !important;
}

.dict-page .dialog::before {
  content: "";
  position: absolute;
  top: 18px;
  left: 20px;
  width: 11px;
  height: 11px;
  border-radius: 999px;
  background: #ff5f57;
  box-shadow: 18px 0 0 #febc2e, 36px 0 0 #28c840;
}

.dict-page .dialog-title {
  padding-left: 72px;
  color: #f4fbff !important;
  font-weight: 840 !important;
}

.dict-page .dialog-actions {
  border-top: 1px solid rgba(226, 241, 255, 0.12);
  position: sticky;
  bottom: -1px;
  z-index: 2;
  margin: 2px -14px -14px;
  padding: 16px 14px 14px !important;
  border-color: rgba(226, 241, 255, 0.12) !important;
  border-radius: 0 0 22px 22px;
  background:
    linear-gradient(180deg, rgba(10, 28, 42, 0), rgba(8, 22, 36, 0.88) 34%),
    rgba(8, 22, 36, 0.56) !important;
  backdrop-filter: blur(18px) saturate(145%) !important;
}

.dict-page .checkbox-item {
  color: rgba(225, 241, 251, 0.82) !important;
}

.dict-page .mobile-dict-card {
  border: 1px solid rgba(221, 239, 255, 0.18) !important;
  background: rgba(255, 255, 255, 0.08) !important;
  box-shadow:
    0 18px 38px rgba(0, 7, 18, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
  backdrop-filter: blur(18px) saturate(145%);
}

@media (max-width: 980px) {
  .filter-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 760px) {
  .dict-page {
    padding: 12px;
  }

  .hero-panel {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-grid {
    grid-template-columns: 1fr;
  }

  .filter-actions,
  .toolbar,
  .pager,
  .items-head {
    align-items: stretch;
  }

  .filter-actions,
  .toolbar-left,
  .toolbar-right,
  .pager-left,
  .pager-right,
  .items-head {
    width: 100%;
  }

  .filter-actions .action-btn,
  .filter-actions .ghost-btn,
  .toolbar-left .action-btn,
  .toolbar-left .ghost-btn,
  .pager-right .ghost-btn {
    flex: 1 1 calc(50% - 4px);
  }

  .desktop-table-wrap,
  .desktop-item-table-wrap {
    display: none;
  }

  .mobile-dict-list,
  .mobile-item-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .dialog {
    max-width: none;
    padding: 12px;
  }

  .dialog-actions .ghost-btn,
  .dialog-actions .action-btn {
    flex: 1 1 calc(50% - 4px);
  }
}

@media (max-width: 480px) {
  .mobile-card-grid {
    grid-template-columns: 1fr;
  }

  .mobile-card-actions .mini-btn {
    flex: 1 1 calc(50% - 4px);
    min-width: 0;
    margin-right: 0;
  }

  .filter-actions .action-btn,
  .filter-actions .ghost-btn,
  .toolbar-left .action-btn,
  .toolbar-left .ghost-btn,
  .pager-right .ghost-btn,
  .dialog-actions .ghost-btn,
  .dialog-actions .action-btn {
    flex-basis: 100%;
  }
}
</style>
