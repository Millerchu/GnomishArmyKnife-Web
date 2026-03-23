<template>
  <div class="app-page">
    <div class="page-nav">
      <button type="button" class="back-home-btn" @click="goBackHome">
        <span class="back-home-icon">←</span>
        <span>返回桌面</span>
      </button>
    </div>

    <div class="hero-panel">
      <div>
        <h1 class="page-title">应用管理</h1>
        <p class="page-subtitle">
          应用目录作为权限管理和主页展示的上游数据源，由管理员统一维护名称、图标、密级、加密方式、路由和上下线状态。
        </p>
      </div>
      <div class="hero-tags">
        <span class="hero-tag">应用 {{ pagination.total }}</span>
        <span class="hero-tag">当前页启用 {{ enabledCount }}</span>
        <span class="hero-tag">当前页受限 {{ confidentialCount }}</span>
        <span class="hero-tag">{{ catalogSourceLabel }}</span>
      </div>
    </div>

    <section class="filter-panel">
      <div class="filter-grid">
        <label class="field">
          <span>应用检索</span>
          <input
            v-model.trim="filters.keyword"
            class="input"
            maxlength="64"
            placeholder="搜索应用名称、编码、路由、分类"
            @keyup.enter="searchApps"
          />
        </label>

        <label class="field">
          <span>状态</span>
          <select v-model="filters.status" class="input">
            <option value="">全部状态</option>
            <option v-for="item in APP_STATUS_OPTIONS" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </label>

        <label class="field">
          <span>密级</span>
          <select v-model="filters.securityLevel" class="input">
            <option value="">全部密级</option>
            <option v-for="item in APP_SECURITY_LEVEL_OPTIONS" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </label>

        <label class="field">
          <span>数据来源</span>
          <select v-model="filters.dataSourceMode" class="input">
            <option value="">全部来源</option>
            <option v-for="item in APP_DATA_SOURCE_OPTIONS" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </label>
      </div>

      <div class="filter-actions">
        <button class="action-btn" :disabled="loading" @click="searchApps">查询</button>
        <button class="ghost-btn" :disabled="loading" @click="resetFilters">重置</button>
        <button class="ghost-btn" :disabled="saving || uploadLoading" @click="startCreateApp">新增应用</button>
      </div>
    </section>

    <section class="catalog-panel">
      <div class="panel-head">
        <div>
          <h2 class="panel-title">应用列表</h2>
          <p class="panel-tip">列表展示应用目录，新增和编辑都通过弹窗完成，便于快速批量维护。</p>
        </div>
        <div class="panel-actions">
          <span class="panel-tag">当前页 {{ apps.length }} 项</span>
          <button class="ghost-btn" type="button" @click="goToPermissionManagement">前往权限管理</button>
        </div>
      </div>

      <div class="table-wrap">
        <div class="table-head">
          <span>应用</span>
          <span>编码 / 路由</span>
          <span>数据来源</span>
          <span>密级 / 加密</span>
          <span>图标来源</span>
          <span>状态</span>
          <span>操作</span>
        </div>

        <div v-if="loading && !apps.length" class="empty-state">加载中...</div>
        <template v-else>
          <div v-if="apps.length" class="table-body">
            <article v-for="item in apps" :key="item.id" class="table-row">
              <div class="cell app-cell">
                <div class="app-icon" :class="previewClassName(item.iconType)">
                  <img v-if="usesImageIcon(item.iconType) && item.iconUrl" :src="item.iconUrl" :alt="item.name"/>
                  <span
                    v-else-if="item.iconType === 'PRESET'"
                    class="preset-svg"
                    v-html="getPresetIconSvg(item.iconPreset)"
                  ></span>
                  <span v-else>{{ item.iconText || buildAppIconText(item.name) }}</span>
                </div>
                <div class="app-main">
                  <strong>{{ item.name }}</strong>
                  <span>{{ item.category || '未分类' }}</span>
                </div>
              </div>

              <div class="cell route-cell">
                <strong>{{ item.featureCode }}</strong>
                <span>{{ item.route || '主页聚合应用' }}</span>
              </div>

              <div class="cell source-mode-cell">
                <strong>{{ formatDataSourceMode(item.dataSourceMode) }}</strong>
                <span>{{ item.dataSourceMode === 'REAL' ? '联调真实接口' : '展示演示数据' }}</span>
              </div>

              <div class="cell tag-cell">
                <span class="tag security">{{ formatSecurityLevel(item.securityLevel) }}</span>
                <span class="tag">{{ formatEncryptionMode(item.encryptionMode) }}</span>
              </div>

              <div class="cell source-cell">
                <strong>{{ formatIconType(item.iconType) }}</strong>
                <span>{{ formatIconSummary(item) }}</span>
              </div>

              <div class="cell status-cell">
                <span class="status-chip" :class="item.enabled ? 'enabled' : 'disabled'">
                  {{ item.enabled ? '启用' : '停用' }}
                </span>
                <span class="grant-count">授权 {{ item.grantCount || 0 }}</span>
              </div>

              <div class="cell action-cell">
                <button class="ghost-btn small-btn" type="button" @click="openEditor(item)">编辑</button>
                <button class="ghost-btn small-btn" type="button" :disabled="saving" @click="toggleAppStatus(item)">
                  {{ item.enabled ? '停用' : '启用' }}
                </button>
              </div>
            </article>
          </div>
          <div v-else class="empty-state">暂无应用数据</div>
        </template>
      </div>

      <div class="pager">
        <div class="pager-left">
          <span>第 {{ pagination.pageNo }} / {{ totalPages }} 页</span>
          <select v-model.number="pagination.pageSize" class="pager-select" :disabled="loading" @change="changePageSize">
            <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }} 条/页</option>
          </select>
        </div>
        <div class="pager-right">
          <button class="ghost-btn" :disabled="pagination.pageNo <= 1 || loading" @click="changePage(-1)">上一页</button>
          <button class="ghost-btn" :disabled="pagination.pageNo >= totalPages || loading" @click="changePage(1)">下一页</button>
        </div>
      </div>
    </section>

    <section class="insight-grid">
      <article class="insight-card">
        <h3 class="insight-title">图标策略</h3>
        <div class="note-box">
          <p>支持预设图标、本地上传、图片地址和文本图标四种来源。</p>
          <p>预设图标用于快速落地；本地上传适合品牌化图标；后端接通后可存数据库或文件服务器。</p>
        </div>
      </article>

      <article class="insight-card">
        <h3 class="insight-title">权限联动</h3>
        <div class="note-box">
          <p>权限管理应直接读取应用目录表，而不是写死前端枚举。</p>
          <p>应用停用后，权限管理不可继续授权，主页也应隐藏该应用。</p>
        </div>
      </article>
    </section>

    <div v-if="showEditorDialog" class="dialog-mask" @click.self="closeEditorDialog">
      <div class="editor-dialog">
        <div class="dialog-head">
          <div>
            <h3 class="dialog-title">{{ form.id ? '编辑应用' : '新增应用' }}</h3>
            <p class="dialog-subtitle">应用编码建议稳定不变，权限管理将直接按应用编码授权。</p>
          </div>
          <button class="dialog-close" type="button" :disabled="saving || uploadLoading" @click="closeEditorDialog">×</button>
        </div>

        <div class="preview-card">
          <div class="preview-icon" :class="previewClassName(form.iconType)">
            <img v-if="usesImageIcon(form.iconType) && form.iconUrl" :src="form.iconUrl" :alt="form.name || '应用图标'"/>
            <span
              v-else-if="form.iconType === 'PRESET'"
              class="preset-svg"
              v-html="getPresetIconSvg(form.iconPreset)"
            ></span>
            <span v-else>{{ form.iconText || buildAppIconText(form.name) }}</span>
          </div>
          <div class="preview-main">
            <strong>{{ form.name || '未命名应用' }}</strong>
            <span>{{ form.featureCode || 'APP_XXX' }}</span>
            <p>{{ form.route || '主页聚合应用' }} · {{ form.category || '未分类' }}</p>
          </div>
          <div class="preview-tags">
            <span class="tag">{{ formatDataSourceMode(form.dataSourceMode) }}</span>
            <span class="tag security">{{ formatSecurityLevel(form.securityLevel) }}</span>
            <span class="tag">{{ formatEncryptionMode(form.encryptionMode) }}</span>
          </div>
        </div>

        <div class="editor-grid">
          <label class="field">
            <span>应用名称</span>
            <input v-model.trim="form.name" class="input" maxlength="32" placeholder="例如：待办列表"/>
          </label>

          <label class="field">
            <span>应用编码</span>
            <input v-model.trim="form.featureCode" class="input" maxlength="64" placeholder="例如：APP_TODO_LIST"/>
          </label>

          <label class="field">
            <span>路由地址</span>
            <input v-model.trim="form.route" class="input" maxlength="128" placeholder="/todo-list"/>
          </label>

          <label class="field">
            <span>应用分类</span>
            <input v-model.trim="form.category" class="input" maxlength="32" placeholder="效率工具"/>
          </label>

          <label class="field">
            <span>数据来源</span>
            <select v-model="form.dataSourceMode" class="input">
              <option v-for="item in APP_DATA_SOURCE_OPTIONS" :key="item.value" :value="item.value">
                {{ item.label }}
              </option>
            </select>
          </label>

          <label class="field">
            <span>密级</span>
            <select v-model="form.securityLevel" class="input">
              <option v-for="item in APP_SECURITY_LEVEL_OPTIONS" :key="item.value" :value="item.value">
                {{ item.label }}
              </option>
            </select>
          </label>

          <label class="field">
            <span>加密方式</span>
            <select v-model="form.encryptionMode" class="input">
              <option v-for="item in APP_ENCRYPTION_MODE_OPTIONS" :key="item.value" :value="item.value">
                {{ item.label }}
              </option>
            </select>
          </label>

          <label class="field">
            <span>排序</span>
            <input v-model.number="form.sortNo" class="input" type="number" min="1" max="9999"/>
          </label>

          <label class="field">
            <span>状态</span>
            <select v-model="form.status" class="input">
              <option v-for="item in APP_STATUS_OPTIONS" :key="item.value" :value="item.value">
                {{ item.label }}
              </option>
            </select>
          </label>
        </div>

        <div class="icon-section">
          <div class="section-head">
            <h4>图标设置</h4>
            <select v-model="form.iconType" class="input icon-type-select">
              <option v-for="item in APP_ICON_TYPE_OPTIONS" :key="item.value" :value="item.value">
                {{ item.label }}
              </option>
            </select>
          </div>

          <div v-if="form.iconType === 'PRESET'" class="preset-grid">
            <button
              v-for="item in APP_PRESET_ICONS"
              :key="item.key"
              type="button"
              class="preset-card"
              :class="{active: form.iconPreset === item.key}"
              @click="setPresetIcon(item.key)"
            >
              <span class="preset-preview" v-html="item.svg"></span>
              <span>{{ item.name }}</span>
            </button>
          </div>

          <div v-else-if="form.iconType === 'UPLOAD'" class="upload-panel">
            <label class="upload-box">
              <input
                ref="iconFileInput"
                class="file-input"
                type="file"
                accept="image/*"
                @change="handleIconFileChange"
              />
              <span>{{ uploadLoading ? '上传中...' : '选择本地图标文件' }}</span>
              <small>建议上传 PNG、SVG、JPG，后端接通后将走真实上传接口。</small>
            </label>
            <div v-if="form.iconFileName || form.iconUrl" class="upload-meta">
              <span>{{ form.iconFileName || '已生成本地预览' }}</span>
              <span>{{ form.iconStorageType || 'LOCAL_DRAFT' }}</span>
              <button class="ghost-btn small-btn" type="button" @click="clearUploadedIcon">清空</button>
            </div>
          </div>

          <label v-else-if="form.iconType === 'URL'" class="field">
            <span>图片地址</span>
            <input v-model.trim="form.iconUrl" class="input" maxlength="255" placeholder="https://..."/>
          </label>

          <label v-else class="field">
            <span>文本图标</span>
            <input v-model.trim="form.iconText" class="input" maxlength="8" placeholder="例如：待办"/>
          </label>
        </div>

        <label class="field field-block">
          <span>应用说明</span>
          <textarea v-model.trim="form.description" class="textarea" maxlength="200" placeholder="说明应用用途、权限边界和敏感信息级别"/>
        </label>

        <label class="field field-block">
          <span>维护备注</span>
          <textarea v-model.trim="form.remark" class="textarea" maxlength="200" placeholder="可记录应用负责人、上线说明或注意事项"/>
        </label>

        <div class="dialog-actions">
          <button class="ghost-btn" type="button" :disabled="saving || uploadLoading" @click="resetEditor">重置</button>
          <button class="ghost-btn" type="button" :disabled="saving || uploadLoading" @click="closeEditorDialog">取消</button>
          <button class="action-btn" type="button" :disabled="saving || uploadLoading" @click="submitApp">
            {{ saving ? '保存中...' : '保存应用' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import {computed, onMounted, reactive, ref} from 'vue'
import {useRouter} from 'vue-router'
import {
  createSystemApp,
  listSystemApps,
  updateSystemApp,
  updateSystemAppStatus,
  uploadSystemAppIcon
} from '@/api/appManagement'
import {APP_PRESET_ICONS, getPresetIconSvg} from '@/constants/appIconLibrary'
import {
  APP_DATA_SOURCE_OPTIONS,
  APP_ENCRYPTION_MODE_OPTIONS,
  APP_ICON_TYPE_OPTIONS,
  APP_SECURITY_LEVEL_OPTIONS,
  APP_STATUS_OPTIONS
} from '@/constants/appCatalog'
import {
  buildAppIconText,
  mergeAppCatalogList,
  normalizeSystemApp,
  persistAppCatalogDraftList,
  resolveAppCatalogList
} from '@/utils/appCatalogDraft'

const PAGE_SIZE_OPTIONS = [8, 12, 20]

function unwrapData(res) {
  const payload = res?.data
  if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data
  }
  return payload
}

function parseListPayload(payload) {
  if (Array.isArray(payload)) {
    return {list: payload, total: payload.length}
  }

  if (!payload || typeof payload !== 'object') {
    return {list: [], total: 0}
  }

  const list = payload.list || payload.records || payload.rows || payload.items || []
  const total = Number(payload.total ?? payload.totalCount ?? payload.count ?? (Array.isArray(list) ? list.length : 0))
  return {
    list: Array.isArray(list) ? list : [],
    total: Number.isNaN(total) ? 0 : total
  }
}

function extractErrorMessage(error, fallback) {
  const data = error?.response?.data || {}
  return data.message || data.msg || fallback
}

function createEmptyForm() {
  return {
    id: '',
    name: '',
    featureCode: '',
    route: '',
    category: '',
    dataSourceMode: 'REAL',
    securityLevel: 'INTERNAL',
    encryptionMode: 'NONE',
    iconType: 'PRESET',
    iconPreset: APP_PRESET_ICONS[0]?.key || 'grid',
    iconText: '',
    iconUrl: '',
    iconStorageType: '',
    iconFileName: '',
    sortNo: 10,
    status: 'ENABLED',
    description: '',
    remark: '',
    grantCount: 0
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result || '')
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function normalizeFormPayload(form) {
  const featureCode = `${form.featureCode || ''}`.trim().toUpperCase()
  const iconType = form.iconType || 'PRESET'
  const payload = {
    id: form.id || undefined,
    appCode: featureCode,
    featureCode,
    name: `${form.name || ''}`.trim(),
    route: `${form.route || ''}`.trim(),
    category: `${form.category || ''}`.trim(),
    dataSourceMode: form.dataSourceMode,
    dataSourceType: form.dataSourceMode,
    securityLevel: form.securityLevel,
    encryptionMode: form.encryptionMode,
    iconType,
    iconPreset: iconType === 'PRESET' ? form.iconPreset : '',
    iconText: iconType === 'TEXT' ? (`${form.iconText || ''}`.trim() || buildAppIconText(form.name)) : '',
    iconUrl: ['UPLOAD', 'URL'].includes(iconType) ? `${form.iconUrl || ''}`.trim() : '',
    iconStorageType: iconType === 'UPLOAD' ? (form.iconStorageType || 'LOCAL_DRAFT') : '',
    iconFileName: iconType === 'UPLOAD' ? `${form.iconFileName || ''}`.trim() : '',
    enabled: form.status === 'ENABLED',
    status: form.status,
    sortNo: Number(form.sortNo || 10),
    description: `${form.description || ''}`.trim(),
    remark: `${form.remark || ''}`.trim()
  }
  if (iconType === 'PRESET') {
    payload.iconText = buildAppIconText(form.name)
  }
  return payload
}

export default {
  name: 'AppManagement',
  setup() {
    const router = useRouter()

    const loading = ref(false)
    const saving = ref(false)
    const uploadLoading = ref(false)
    const showEditorDialog = ref(false)
    const apps = ref([])
    const catalogSource = ref('draft')
    const iconFileInput = ref(null)
    const editingSnapshot = ref(createEmptyForm())

    const filters = reactive({
      keyword: '',
      status: '',
      securityLevel: '',
      dataSourceMode: ''
    })

    const pagination = reactive({
      pageNo: 1,
      pageSize: PAGE_SIZE_OPTIONS[0],
      total: 0
    })

    const form = reactive(createEmptyForm())
    const pageSizeOptions = PAGE_SIZE_OPTIONS

    const totalPages = computed(() => Math.max(1, Math.ceil((pagination.total || 0) / pagination.pageSize)))
    const enabledCount = computed(() => apps.value.filter((item) => item.enabled).length)
    const confidentialCount = computed(() => apps.value.filter((item) => item.securityLevel === 'CONFIDENTIAL').length)
    const catalogSourceLabel = computed(() => catalogSource.value === 'backend' ? '真实接口' : '本地草稿')

    const formatSecurityLevel = (value) => {
      return APP_SECURITY_LEVEL_OPTIONS.find((item) => item.value === value)?.label || value || '-'
    }

    const formatDataSourceMode = (value) => {
      return APP_DATA_SOURCE_OPTIONS.find((item) => item.value === value)?.label || value || '-'
    }

    const formatEncryptionMode = (value) => {
      return APP_ENCRYPTION_MODE_OPTIONS.find((item) => item.value === value)?.label || value || '-'
    }

    const formatIconType = (value) => {
      return APP_ICON_TYPE_OPTIONS.find((item) => item.value === value)?.label || value || '-'
    }

    const formatIconSummary = (item) => {
      if (item.iconType === 'PRESET') {
        return APP_PRESET_ICONS.find((icon) => icon.key === item.iconPreset)?.name || '未选择'
      }
      if (item.iconType === 'UPLOAD') {
        return item.iconFileName || item.iconStorageType || '已上传'
      }
      if (item.iconType === 'URL') {
        return item.iconUrl || '远程地址'
      }
      return item.iconText || buildAppIconText(item.name)
    }

    const usesImageIcon = (iconType) => ['UPLOAD', 'URL'].includes(iconType)

    const previewClassName = (iconType) => ({
      'is-image': usesImageIcon(iconType),
      'is-preset': iconType === 'PRESET'
    })

    const syncForm = (source = {}) => {
      const normalized = normalizeSystemApp(source)
      form.id = normalized.id || ''
      form.name = normalized.name || ''
      form.featureCode = normalized.featureCode || ''
      form.route = normalized.route || ''
      form.category = normalized.category || ''
      form.dataSourceMode = normalized.dataSourceMode || 'REAL'
      form.securityLevel = normalized.securityLevel || 'INTERNAL'
      form.encryptionMode = normalized.encryptionMode || 'NONE'
      form.iconType = normalized.iconType || 'PRESET'
      form.iconPreset = normalized.iconPreset || APP_PRESET_ICONS[0]?.key || 'grid'
      form.iconText = normalized.iconText || ''
      form.iconUrl = normalized.iconUrl || ''
      form.iconStorageType = normalized.iconStorageType || ''
      form.iconFileName = normalized.iconFileName || ''
      form.sortNo = normalized.sortNo || 10
      form.status = normalized.enabled ? 'ENABLED' : 'DISABLED'
      form.description = normalized.description || ''
      form.remark = normalized.remark || ''
      form.grantCount = normalized.grantCount || 0
    }

    const applyLocalFilter = (list) => {
      return list.filter((item) => {
        const keyword = filters.keyword.trim().toLowerCase()
        if (keyword) {
          const searchable = [
            item.name,
            item.featureCode,
            item.route,
            item.category
          ].join(' ').toLowerCase()
          if (!searchable.includes(keyword)) {
            return false
          }
        }
        if (filters.status && (item.enabled ? 'ENABLED' : 'DISABLED') !== filters.status) {
          return false
        }
        if (filters.securityLevel && item.securityLevel !== filters.securityLevel) {
          return false
        }
        if (filters.dataSourceMode && item.dataSourceMode !== filters.dataSourceMode) {
          return false
        }
        return true
      })
    }

    const loadApps = async () => {
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
        if (filters.securityLevel) {
          params.securityLevel = filters.securityLevel
        }
        if (filters.dataSourceMode) {
          params.dataSourceMode = filters.dataSourceMode
        }

        try {
          const res = await listSystemApps(params)
          const payload = unwrapData(res) || {}
          const {list, total} = parseListPayload(payload)
          apps.value = list.map((item, index) => normalizeSystemApp(item, index)).filter((item) => item.featureCode)
          pagination.total = total
          catalogSource.value = 'backend'
          persistAppCatalogDraftList(mergeAppCatalogList(resolveAppCatalogList(), apps.value))
        } catch (backendError) {
          const draftList = applyLocalFilter(resolveAppCatalogList())
          pagination.total = draftList.length
          const start = (pagination.pageNo - 1) * pagination.pageSize
          const end = start + pagination.pageSize
          apps.value = draftList.slice(start, end)
          catalogSource.value = 'draft'
        }
      } catch (error) {
        apps.value = []
        pagination.total = 0
        alert(extractErrorMessage(error, '加载应用目录失败'))
      } finally {
        loading.value = false
      }
    }

    const openEditor = (item) => {
      editingSnapshot.value = normalizeSystemApp(item)
      syncForm(item)
      showEditorDialog.value = true
    }

    const startCreateApp = () => {
      const nextSortNo = Math.max(0, ...resolveAppCatalogList().map((item) => Number(item.sortNo || 0))) + 10
      const nextForm = {
        ...createEmptyForm(),
        sortNo: nextSortNo
      }
      editingSnapshot.value = nextForm
      syncForm(nextForm)
      showEditorDialog.value = true
    }

    const closeEditorDialog = () => {
      if (saving.value || uploadLoading.value) {
        return
      }
      showEditorDialog.value = false
    }

    const resetEditor = () => {
      syncForm(editingSnapshot.value || createEmptyForm())
    }

    const setPresetIcon = (iconKey) => {
      form.iconType = 'PRESET'
      form.iconPreset = iconKey
      form.iconUrl = ''
      form.iconStorageType = ''
      form.iconFileName = ''
    }

    const clearUploadedIcon = () => {
      form.iconUrl = ''
      form.iconStorageType = ''
      form.iconFileName = ''
    }

    const handleIconFileChange = async (event) => {
      const file = event?.target?.files?.[0]
      if (!file) {
        return
      }
      if (!file.type.startsWith('image/')) {
        alert('请选择图片文件')
        event.target.value = ''
        return
      }

      uploadLoading.value = true
      try {
        const res = await uploadSystemAppIcon(file)
        const payload = unwrapData(res) || {}
        const iconUrl = payload.iconUrl || payload.url || payload.fileUrl || ''
        if (!iconUrl) {
          throw new Error('图标上传成功但未返回可访问地址')
        }
        form.iconType = 'UPLOAD'
        form.iconUrl = iconUrl
        form.iconStorageType = payload.iconStorageType || payload.storageType || 'FILE_SERVER'
        form.iconFileName = payload.iconFileName || payload.fileName || file.name
      } catch (error) {
        const backendMessage = error?.response?.data?.message || error?.response?.data?.msg || ''
        if (backendMessage) {
          alert(backendMessage)
          return
        }
        const dataUrl = await readFileAsDataUrl(file)
        form.iconType = 'UPLOAD'
        form.iconUrl = `${dataUrl}`
        form.iconStorageType = 'LOCAL_DRAFT'
        form.iconFileName = file.name
        alert(extractErrorMessage(error, '后端上传接口暂未接通，已保存本地预览草稿'))
      } finally {
        uploadLoading.value = false
        event.target.value = ''
      }
    }

    const validateForm = () => {
      if (!form.name.trim()) {
        return '应用名称不能为空'
      }
      if (!form.featureCode.trim()) {
        return '应用编码不能为空'
      }
      if (!/^APP_[A-Z0-9_]+$/.test(form.featureCode.trim().toUpperCase())) {
        return '应用编码格式应为 APP_XXX'
      }
      if (form.route && !form.route.startsWith('/')) {
        return '路由地址应以 / 开头'
      }
      if (form.iconType === 'PRESET' && !form.iconPreset) {
        return '请选择一个预设图标'
      }
      if (form.iconType === 'UPLOAD' && !form.iconUrl) {
        return '请先上传一个本地图标'
      }
      if (form.iconType === 'URL' && !/^https?:\/\//.test(form.iconUrl || '')) {
        return '图片地址需为 http 或 https'
      }
      return ''
    }

    const persistLocalApp = (payload, nextId) => {
      const currentList = resolveAppCatalogList()
      const normalized = normalizeSystemApp({
        ...payload,
        id: nextId
      })
      const nextList = payload.id
        ? currentList.map((item) => {
          if (`${item.id}` === `${payload.id}`) {
            return {
              ...item,
              ...normalized
            }
          }
          return item
        })
        : [...currentList, normalized]
      persistAppCatalogDraftList(nextList)
      return normalized
    }

    const submitApp = async () => {
      const errorMessage = validateForm()
      if (errorMessage) {
        alert(errorMessage)
        return
      }

      const payload = normalizeFormPayload(form)
      saving.value = true
      try {
        let savedApp = null
        if (payload.id) {
          const res = await updateSystemApp(payload.id, payload)
          savedApp = normalizeSystemApp(unwrapData(res) || payload)
          alert('应用信息已更新')
        } else {
          const res = await createSystemApp(payload)
          savedApp = normalizeSystemApp(unwrapData(res) || {
            ...payload,
            id: `draft-${Date.now()}`
          })
          alert('应用已创建')
        }
        persistLocalApp(savedApp, savedApp.id)
        showEditorDialog.value = false
        await loadApps()
      } catch (error) {
        const fallbackId = payload.id || `draft-${Date.now()}`
        persistLocalApp(payload, fallbackId)
        showEditorDialog.value = false
        await loadApps()
        alert(extractErrorMessage(error, '后端接口暂未接通，已保存到本地草稿'))
      } finally {
        saving.value = false
      }
    }

    const toggleAppStatus = async (item) => {
      if (!item?.id) {
        return
      }

      const nextStatus = item.enabled ? 'DISABLED' : 'ENABLED'
      saving.value = true
      try {
        await updateSystemAppStatus(item.id, {
          status: nextStatus,
          enabled: nextStatus === 'ENABLED'
        })
        persistLocalApp({
          ...item,
          status: nextStatus,
          enabled: nextStatus === 'ENABLED'
        }, item.id)
        await loadApps()
      } catch (error) {
        persistLocalApp({
          ...item,
          status: nextStatus,
          enabled: nextStatus === 'ENABLED'
        }, item.id)
        await loadApps()
        alert(extractErrorMessage(error, '后端接口暂未接通，状态已保存到本地草稿'))
      } finally {
        saving.value = false
      }
    }

    const searchApps = () => {
      pagination.pageNo = 1
      loadApps()
    }

    const resetFilters = () => {
      filters.keyword = ''
      filters.status = ''
      filters.securityLevel = ''
      filters.dataSourceMode = ''
      pagination.pageNo = 1
      loadApps()
    }

    const changePage = (offset) => {
      const nextPage = pagination.pageNo + offset
      if (nextPage < 1 || nextPage > totalPages.value) {
        return
      }
      pagination.pageNo = nextPage
      loadApps()
    }

    const changePageSize = () => {
      pagination.pageNo = 1
      loadApps()
    }

    const goBackHome = () => {
      router.push('/home')
    }

    const goToPermissionManagement = () => {
      router.push('/system/permissions')
    }

    onMounted(() => {
      loadApps()
    })

    return {
      APP_DATA_SOURCE_OPTIONS,
      APP_ENCRYPTION_MODE_OPTIONS,
      APP_ICON_TYPE_OPTIONS,
      APP_PRESET_ICONS,
      APP_SECURITY_LEVEL_OPTIONS,
      APP_STATUS_OPTIONS,
      loading,
      saving,
      uploadLoading,
      showEditorDialog,
      apps,
      filters,
      pagination,
      form,
      pageSizeOptions,
      totalPages,
      enabledCount,
      confidentialCount,
      catalogSourceLabel,
      iconFileInput,
      buildAppIconText,
      getPresetIconSvg,
      usesImageIcon,
      previewClassName,
      formatSecurityLevel,
      formatDataSourceMode,
      formatEncryptionMode,
      formatIconType,
      formatIconSummary,
      searchApps,
      resetFilters,
      changePage,
      changePageSize,
      openEditor,
      startCreateApp,
      closeEditorDialog,
      resetEditor,
      setPresetIcon,
      clearUploadedIcon,
      handleIconFileChange,
      submitApp,
      toggleAppStatus,
      goBackHome,
      goToPermissionManagement
    }
  }
}
</script>

<style scoped>
.app-page {
  min-height: 100vh;
  height: 100%;
  padding: 18px 22px 26px;
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

.hero-panel,
.filter-panel,
.catalog-panel,
.insight-card,
.editor-dialog {
  border-radius: 18px;
  padding: 16px 18px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: linear-gradient(135deg, rgba(7, 22, 39, 0.84), rgba(18, 49, 72, 0.76));
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(16px);
}

.hero-panel,
.filter-panel,
.catalog-panel {
  margin-bottom: 14px;
}

.hero-panel,
.panel-head,
.filter-actions,
.pager,
.dialog-head,
.preview-card,
.section-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hero-panel,
.panel-head,
.pager,
.dialog-head,
.preview-card,
.section-head {
  justify-content: space-between;
}

.page-title,
.panel-title,
.dialog-title,
.insight-title {
  margin: 0;
}

.page-title {
  font-size: 28px;
}

.page-subtitle,
.panel-tip,
.dialog-subtitle,
.note-box p {
  margin: 6px 0 0;
  color: rgba(255, 255, 255, 0.76);
  line-height: 1.6;
}

.hero-tags,
.preview-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.hero-tag,
.panel-tag,
.tag,
.status-chip,
.grant-count {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.12);
}

.tag.security,
.status-chip.enabled {
  background: rgba(22, 163, 74, 0.2);
}

.status-chip.disabled {
  background: rgba(244, 63, 94, 0.2);
}

.filter-grid,
.editor-grid,
.insight-grid {
  display: grid;
  gap: 14px;
}

.filter-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.editor-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.filter-actions,
.panel-actions,
.dialog-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 14px;
}

.panel-actions {
  margin-top: 0;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
}

.field-block {
  margin-top: 18px;
}

.input,
.textarea,
.pager-select {
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 12px;
  padding: 11px 12px;
  color: #fff;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.1);
  outline: none;
}

.input:focus,
.textarea:focus,
.pager-select:focus {
  border-color: rgba(96, 204, 255, 0.74);
  box-shadow: 0 0 0 3px rgba(96, 204, 255, 0.14);
}

.textarea {
  min-height: 96px;
  resize: vertical;
}

.action-btn,
.ghost-btn {
  min-height: 38px;
  padding: 0 14px;
  border-radius: 10px;
  border: none;
  color: #fff;
  cursor: pointer;
}

.action-btn {
  background: linear-gradient(135deg, #0f766e, #2563eb);
}

.ghost-btn {
  background: rgba(255, 255, 255, 0.14);
}

.small-btn {
  min-height: 32px;
  padding: 0 12px;
  font-size: 12px;
}

.action-btn:disabled,
.ghost-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.table-wrap {
  margin-top: 18px;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
}

.table-head,
.table-row {
  display: grid;
  grid-template-columns: minmax(220px, 2fr) minmax(180px, 1.4fr) minmax(140px, 1fr) minmax(180px, 1.2fr) minmax(160px, 1.2fr) minmax(150px, 1fr) minmax(160px, 1fr);
  gap: 14px;
  padding: 14px 16px;
  align-items: center;
}

.table-head {
  font-size: 12px;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.68);
  background: rgba(255, 255, 255, 0.08);
}

.table-row + .table-row {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.cell {
  min-width: 0;
}

.app-cell,
.route-cell,
.source-mode-cell,
.source-cell,
.status-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.app-cell {
  flex-direction: row;
  align-items: center;
}

.app-icon,
.preview-icon,
.preset-preview {
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  border-radius: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  background: linear-gradient(135deg, #0f766e, #2563eb);
  overflow: hidden;
}

.app-icon.is-image,
.preview-icon.is-image {
  background: rgba(255, 255, 255, 0.12);
}

.app-icon.is-preset,
.preview-icon.is-preset,
.preset-preview {
  color: #fff;
}

.app-icon img,
.preview-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preset-svg :deep(svg) {
  width: 28px;
  height: 28px;
}

.app-main,
.preview-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.app-main strong,
.route-cell strong,
.source-cell strong,
.preview-main strong {
  font-size: 14px;
}

.app-main span,
.route-cell span,
.source-cell span,
.preview-main span,
.grant-count {
  color: rgba(255, 255, 255, 0.74);
  font-size: 12px;
}

.tag-cell,
.action-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.insight-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.insight-card {
  min-height: 180px;
}

.note-box {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.note-box p {
  margin: 0;
}

.dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  background: rgba(0, 0, 0, 0.45);
}

.editor-dialog {
  width: min(1040px, 100%);
  max-height: calc(100vh - 36px);
  overflow: auto;
}

.dialog-close {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  color: #fff;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.14);
}

.preview-card {
  margin-top: 18px;
  padding: 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.preview-main {
  flex: 1;
}

.icon-section {
  margin-top: 18px;
  padding: 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.icon-type-select {
  width: 220px;
}

.preset-grid {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.preset-card {
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 14px;
  padding: 12px;
  color: #fff;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.08);
}

.preset-card.active {
  border-color: rgba(96, 204, 255, 0.74);
  box-shadow: 0 0 0 2px rgba(96, 204, 255, 0.16);
}

.preset-preview {
  color: #fff;
}

.upload-panel {
  margin-top: 16px;
}

.upload-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  justify-content: center;
  min-height: 150px;
  padding: 16px;
  border: 1px dashed rgba(255, 255, 255, 0.26);
  border-radius: 16px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.05);
}

.upload-box small {
  color: rgba(255, 255, 255, 0.68);
}

.file-input {
  display: none;
}

.upload-meta {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.empty-state {
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.72);
}

@media (max-width: 1200px) {
  .filter-grid,
  .editor-grid,
  .insight-grid,
  .preset-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .table-head,
  .table-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .app-page {
    padding: 16px;
  }

  .filter-grid,
  .editor-grid,
  .insight-grid,
  .preset-grid,
  .table-head,
  .table-row {
    grid-template-columns: 1fr;
  }

  .hero-panel,
  .panel-head,
  .pager,
  .preview-card,
  .dialog-head,
  .section-head {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-actions,
  .panel-actions,
  .dialog-actions {
    justify-content: stretch;
  }

  .action-btn,
  .ghost-btn,
  .icon-type-select {
    width: 100%;
  }
}
</style>
