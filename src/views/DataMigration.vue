<template>
  <div class="migration-page">
    <div class="page-nav">
      <button type="button" class="back-home-btn" @click="goBackHome">
        <span class="back-home-icon">←</span>
        <span>返回桌面</span>
      </button>
    </div>

    <div class="hero-panel">
      <div>
        <h1 class="page-title">数据迁移</h1>
        <p class="page-subtitle">
          面向管理员的环境间迁移能力。支持系统数据、业务数据和附件一并导出为 ZIP 包，并在目标环境按策略导入。
        </p>
      </div>
      <div class="hero-tags">
        <span class="hero-tag">{{ resourceSourceLabel }}</span>
        <span class="hero-tag">系统资源 {{ systemResources.length }}</span>
        <span class="hero-tag">业务应用 {{ businessApps.length }}</span>
        <span class="hero-tag">历史记录 {{ historyPagination.total }}</span>
      </div>
    </div>

    <section v-if="!isAdmin" class="panel access-panel">
      <h2 class="panel-title">仅系统管理员可使用</h2>
      <p class="panel-tip">
        当前页面涉及跨环境导出、导入和覆盖写入，前端只向管理员开放入口。若需要试用，请使用管理员账号登录。
      </p>
      <div class="access-actions">
        <button class="action-btn" type="button" @click="goBackHome">返回桌面</button>
      </div>
    </section>

    <template v-else>
      <div class="migration-layout">
        <div class="main-column">
          <section class="panel tab-panel">
            <div class="tab-row">
              <button
                class="tab-btn"
                :class="{ active: activeTab === 'export' }"
                type="button"
                @click="activeTab = 'export'"
              >
                导出数据
              </button>
              <button
                class="tab-btn"
                :class="{ active: activeTab === 'import' }"
                type="button"
                @click="activeTab = 'import'"
              >
                导入数据
              </button>
            </div>
            <p class="tab-tip">
              {{ activeTab === 'export'
                ? '先定义迁移范围，再生成 ZIP 包。导出包建议携带 manifest、业务数据和附件清单。'
                : '导入包建议先做结构校验，再按合并、覆盖或严格模式落库，避免目标环境产生脏数据。' }}
            </p>
          </section>

          <section v-if="activeTab === 'export'" class="panel">
            <div class="section-head">
              <div>
                <h2 class="panel-title">导出范围配置</h2>
                <p class="panel-tip">导出范围支持快捷模式和精细勾选，两者最终都会收敛为统一的资源编码集合。</p>
              </div>
              <div class="section-actions">
                <button class="ghost-btn" type="button" :disabled="resourceLoading" @click="fetchResources">
                  {{ resourceLoading ? '刷新中...' : '刷新资源' }}
                </button>
              </div>
            </div>

            <div class="mode-grid">
              <button
                v-for="item in exportScopeModes"
                :key="item.value"
                class="mode-card"
                :class="{ active: exportForm.scopeMode === item.value }"
                type="button"
                @click="applyScopeMode(item.value)"
              >
                <strong>{{ item.label }}</strong>
                <span>{{ item.description }}</span>
              </button>
            </div>

            <div class="selector-grid">
              <article class="selector-card">
                <div class="selector-head">
                  <div>
                    <h3>系统数据</h3>
                    <p>系统基础配置、权限和字典等管理数据。</p>
                  </div>
                  <label class="switch-text">
                    <input
                      :checked="allSystemResourcesChecked"
                      type="checkbox"
                      @change="toggleAllSystemResources($event.target.checked)"
                    />
                    <span>全选</span>
                  </label>
                </div>

                <div v-if="systemResources.length" class="selector-list">
                  <label
                    v-for="item in systemResources"
                    :key="item.code"
                    class="selector-item"
                  >
                    <input
                      :checked="exportForm.systemResourceCodes.includes(item.code)"
                      type="checkbox"
                      @change="toggleSystemResource(item.code, $event.target.checked)"
                    />
                    <div class="selector-main">
                      <div class="selector-title-row">
                        <strong>{{ item.name }}</strong>
                        <span class="mini-tag">{{ item.attachmentSupported ? '含附件' : '结构化数据' }}</span>
                      </div>
                      <p>{{ item.description }}</p>
                    </div>
                  </label>
                </div>
                <div v-else class="empty-state small-empty">暂无系统资源定义</div>
              </article>

              <article class="selector-card">
                <div class="selector-head">
                  <div>
                    <h3>业务数据</h3>
                    <p>按应用维度选择需要迁移的数据，支持只迁移部分业务模块。</p>
                  </div>
                  <label class="switch-text">
                    <input
                      :checked="allBusinessAppsChecked"
                      type="checkbox"
                      @change="toggleAllBusinessApps($event.target.checked)"
                    />
                    <span>全选</span>
                  </label>
                </div>

                <div v-if="businessApps.length" class="selector-list">
                  <label
                    v-for="item in businessApps"
                    :key="item.featureCode"
                    class="selector-item"
                  >
                    <input
                      :checked="exportForm.businessAppCodes.includes(item.featureCode)"
                      type="checkbox"
                      @change="toggleBusinessApp(item.featureCode, $event.target.checked)"
                    />
                    <div class="selector-main">
                      <div class="selector-title-row">
                        <strong>{{ item.name }}</strong>
                        <div class="tag-group">
                          <span class="mini-tag">{{ item.featureCode }}</span>
                          <span class="mini-tag soft">{{ formatSecurityLevel(item.securityLevel) }}</span>
                        </div>
                      </div>
                      <p>{{ item.description || '业务数据包按应用编码独立归档，便于目标环境按模块导入。' }}</p>
                    </div>
                  </label>
                </div>
                <div v-else class="empty-state small-empty">暂无业务应用清单</div>
              </article>
            </div>

            <div class="form-grid">
              <label class="field-item">
                <span>导出包名称</span>
                <input
                  v-model.trim="exportForm.packageName"
                  maxlength="80"
                  placeholder="例如：prod-to-uat-20260329"
                />
              </label>

              <label class="checkbox-row">
                <input v-model="exportForm.includeAttachments" type="checkbox"/>
                <span>同时打包附件资源</span>
              </label>

              <label class="field-item field-span-2">
                <span>导出说明</span>
                <textarea
                  v-model.trim="exportForm.remark"
                  rows="3"
                  maxlength="200"
                  placeholder="可填写来源环境、迁移批次、窗口时间等说明"
                />
              </label>
            </div>

            <div class="summary-bar">
              <article class="summary-card">
                <span>导出模式</span>
                <strong>{{ exportScopeSummaryLabel }}</strong>
              </article>
              <article class="summary-card">
                <span>系统数据</span>
                <strong>{{ exportForm.systemResourceCodes.length }}</strong>
              </article>
              <article class="summary-card">
                <span>业务应用</span>
                <strong>{{ exportForm.businessAppCodes.length }}</strong>
              </article>
              <article class="summary-card">
                <span>附件策略</span>
                <strong>{{ exportForm.includeAttachments ? '包含附件' : '仅元数据' }}</strong>
              </article>
            </div>

            <div class="form-actions">
              <button class="action-btn" type="button" :disabled="exporting" @click="submitExport">
                {{ exporting ? '导出中...' : '生成导出包' }}
              </button>
              <button class="ghost-btn" type="button" :disabled="exporting" @click="resetExportForm">重置配置</button>
            </div>
          </section>

          <section v-else class="panel">
            <div class="section-head">
              <div>
                <h2 class="panel-title">导入执行配置</h2>
                <p class="panel-tip">导入使用 ZIP 包作为唯一入口，文件和元数据通过同一请求提交，方便后端统一做校验和落库。</p>
              </div>
            </div>

            <div
              class="upload-zone"
              :class="{ dragging: fileDragging }"
              @dragenter.prevent="fileDragging = true"
              @dragover.prevent="fileDragging = true"
              @dragleave.prevent="fileDragging = false"
              @drop.prevent="handleFileDrop"
            >
              <input
                ref="fileInputRef"
                class="file-input"
                type="file"
                accept=".zip,application/zip"
                @change="handleFileChange"
              />

              <div class="upload-main">
                <strong>{{ selectedImportFile ? selectedImportFile.name : '选择或拖入 ZIP 包' }}</strong>
                <p>建议文件内包含 `manifest.json`、结构化数据文件和附件索引。</p>
              </div>

              <div class="upload-actions">
                <button class="ghost-btn" type="button" @click="triggerFilePicker">选择文件</button>
                <button
                  v-if="selectedImportFile"
                  class="ghost-btn"
                  type="button"
                  :disabled="importing"
                  @click="clearImportFile"
                >
                  清空文件
                </button>
              </div>
            </div>

            <div class="mode-grid">
              <button
                v-for="item in importModes"
                :key="item.value"
                class="mode-card"
                :class="{ active: importForm.importMode === item.value }"
                type="button"
                @click="importForm.importMode = item.value"
              >
                <strong>{{ item.label }}</strong>
                <span>{{ item.description }}</span>
              </button>
            </div>

            <div class="form-grid">
              <label class="checkbox-row">
                <input v-model="importForm.includeAttachments" type="checkbox"/>
                <span>同步导入附件资源</span>
              </label>

              <label class="checkbox-row">
                <input v-model="importForm.continueOnError" type="checkbox"/>
                <span>出现单项失败后继续后续资源</span>
              </label>

              <label class="field-item field-span-2">
                <span>导入说明</span>
                <textarea
                  v-model.trim="importForm.remark"
                  rows="3"
                  maxlength="200"
                  placeholder="可填写目标环境、执行窗口、审批单号等说明"
                />
              </label>
            </div>

            <div class="summary-bar">
              <article class="summary-card">
                <span>导入文件</span>
                <strong>{{ selectedImportFile ? selectedImportFile.name : '未选择' }}</strong>
              </article>
              <article class="summary-card">
                <span>文件大小</span>
                <strong>{{ selectedImportFile ? formatBytes(selectedImportFile.size) : '-' }}</strong>
              </article>
              <article class="summary-card">
                <span>冲突策略</span>
                <strong>{{ currentImportModeLabel }}</strong>
              </article>
              <article class="summary-card">
                <span>错误策略</span>
                <strong>{{ importForm.continueOnError ? '继续执行' : '立即终止' }}</strong>
              </article>
            </div>

            <div class="form-actions">
              <button class="action-btn" type="button" :disabled="importing" @click="submitImport">
                {{ importing ? '导入中...' : '开始导入' }}
              </button>
            </div>
          </section>
        </div>

        <aside class="side-column">
          <section class="panel insight-panel">
            <div class="section-head compact-head">
              <div>
                <h2 class="panel-title">迁移架构</h2>
                <p class="panel-tip">前后端统一围绕“资源清单 + 任务流转 + ZIP 包”三层结构设计。</p>
              </div>
            </div>

            <div class="flow-list">
              <article v-for="item in architectureFlows" :key="item.key" class="flow-card">
                <span class="flow-index">{{ item.index }}</span>
                <div>
                  <strong>{{ item.title }}</strong>
                  <p>{{ item.description }}</p>
                </div>
              </article>
            </div>
          </section>

          <section class="panel insight-panel">
            <div class="section-head compact-head">
              <div>
                <h2 class="panel-title">当前摘要</h2>
                <p class="panel-tip">用于快速确认本次迁移配置是否覆盖到系统和业务两个维度。</p>
              </div>
            </div>

            <div class="note-list">
              <div class="note-row">
                <span>资源来源</span>
                <strong>{{ resourceSourceLabel }}</strong>
              </div>
              <div class="note-row">
                <span>当前标签页</span>
                <strong>{{ activeTab === 'export' ? '导出' : '导入' }}</strong>
              </div>
              <div class="note-row">
                <span>已选系统资源</span>
                <strong>{{ exportForm.systemResourceCodes.length }}</strong>
              </div>
              <div class="note-row">
                <span>已选业务应用</span>
                <strong>{{ exportForm.businessAppCodes.length }}</strong>
              </div>
              <div class="note-row">
                <span>最近一次任务</span>
                <strong>{{ latestTaskLabel }}</strong>
              </div>
            </div>
          </section>

          <section class="panel insight-panel">
            <div class="section-head compact-head">
              <div>
                <h2 class="panel-title">导入包要求</h2>
                <p class="panel-tip">后端落地时建议把以下文件约束写入 `manifest` 校验逻辑。</p>
              </div>
            </div>

            <ul class="guide-list">
              <li>`manifest.json`：记录版本、源环境、资源清单、统计值和附件索引。</li>
              <li>`system/`：系统数据 JSON，可按用户、权限、字典、应用目录拆分。</li>
              <li>`business/{appCode}/`：按应用独立存放业务数据，便于部分导入。</li>
              <li>`attachments/`：附件文件或附件索引，可结合 MinIO、S3 或本地文件服务处理。</li>
            </ul>
          </section>
        </aside>
      </div>

      <section class="panel task-panel">
        <div class="section-head">
          <div>
            <h2 class="panel-title">导出导入历史</h2>
            <p class="panel-tip">展示已执行的导出、导入任务历史，支持按任务类型和状态筛选，并保留最近一次缓存结果兜底。</p>
          </div>
          <div class="section-actions">
            <span class="hero-tag subtle-tag">{{ historySourceLabel }}</span>
            <button class="ghost-btn" type="button" :disabled="tasksLoading" @click="fetchTasks">
              {{ tasksLoading ? '刷新中...' : '刷新记录' }}
            </button>
          </div>
        </div>

        <div class="history-toolbar">
          <div class="history-filter-grid">
            <label class="field-item">
              <span>历史类型</span>
              <select v-model="historyFilters.taskType" @change="searchHistory">
                <option value="">全部任务</option>
                <option value="EXPORT">仅导出</option>
                <option value="IMPORT">仅导入</option>
              </select>
            </label>

            <label class="field-item">
              <span>执行状态</span>
              <select v-model="historyFilters.status" @change="searchHistory">
                <option value="">全部状态</option>
                <option value="PENDING">排队中</option>
                <option value="RUNNING">执行中</option>
                <option value="SUCCESS">成功</option>
                <option value="PARTIAL_SUCCESS">部分成功</option>
                <option value="FAILED">失败</option>
              </select>
            </label>
          </div>

          <div class="history-actions">
            <button class="ghost-btn" type="button" :disabled="tasksLoading" @click="searchHistory">查询</button>
            <button class="ghost-btn" type="button" :disabled="tasksLoading" @click="resetHistoryFilters">重置</button>
          </div>
        </div>

        <div v-if="tasksLoading && !tasks.length" class="empty-state">加载中...</div>
        <div v-else-if="tasks.length" class="task-list">
          <article v-for="task in tasks" :key="task.id" class="task-card">
            <div class="task-head">
              <div>
                <strong>{{ task.packageName || task.fileName || task.taskNo }}</strong>
                <p>{{ formatTaskType(task.taskType) }} · {{ task.taskNo }}</p>
              </div>
              <span class="status-tag" :class="statusClassName(task.status)">
                {{ formatTaskStatus(task.status) }}
              </span>
            </div>

            <div class="task-meta">
              <span>系统 {{ task.systemResourceCount }}</span>
              <span>业务 {{ task.businessAppCount }}</span>
              <span>记录 {{ task.recordCount }}</span>
              <span>附件 {{ task.attachmentCount }}</span>
            </div>

            <div class="task-foot">
              <div class="task-time">
                <span>创建：{{ formatDateTime(task.createdAt) }}</span>
                <span>完成：{{ formatDateTime(task.finishedAt) }}</span>
              </div>
              <div class="task-actions">
                <button
                  v-if="task.taskType === 'EXPORT'"
                  class="ghost-btn"
                  type="button"
                  :disabled="downloadingTaskId === task.id || !task.canDownload"
                  @click="downloadTask(task)"
                >
                  {{ downloadingTaskId === task.id ? '下载中...' : '下载包' }}
                </button>
                <button
                  v-if="task.taskType === 'EXPORT' && task.canDelete"
                  class="ghost-btn danger-btn"
                  type="button"
                  :disabled="deletingTaskId === task.id"
                  @click="removeTask(task)"
                >
                  {{ deletingTaskId === task.id ? '删除中...' : '删除导出包' }}
                </button>
                <button class="ghost-btn" type="button" :disabled="taskRefreshingId === task.id" @click="refreshTask(task)">
                  {{ taskRefreshingId === task.id ? '刷新中...' : '刷新详情' }}
                </button>
              </div>
            </div>

            <p v-if="task.message" class="task-message">{{ task.message }}</p>
          </article>
        </div>
        <div v-else class="empty-state">
          {{ historyEmptyText }}
        </div>

        <div v-if="historyPagination.total" class="pager">
          <div class="pager-left">
            <span>第 {{ historyPagination.pageNo }} / {{ historyPageCount }} 页</span>
            <select v-model.number="historyPagination.pageSize" :disabled="tasksLoading" @change="changeHistoryPageSize">
              <option v-for="size in pageSizeOptions" :key="size" :value="size">
                {{ size }} 条/页
              </option>
            </select>
          </div>
          <div class="pager-right">
            <button class="ghost-btn" type="button" :disabled="tasksLoading || historyPagination.pageNo <= 1" @click="changeHistoryPage(-1)">
              上一页
            </button>
            <button class="ghost-btn" type="button" :disabled="tasksLoading || historyPagination.pageNo >= historyPageCount" @click="changeHistoryPage(1)">
              下一页
            </button>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script>
import {computed, onMounted, reactive, ref} from 'vue'
import {useRouter} from 'vue-router'
import {
  createDataMigrationExport,
  createDataMigrationImport,
  deleteDataMigrationTask,
  downloadDataMigrationExport,
  getDataMigrationResources,
  getDataMigrationTaskDetail,
  listDataMigrationTasks
} from '@/api/dataMigration'
import {mergeAppCatalogList, normalizeSystemApp, resolveAppCatalogList} from '@/utils/appCatalogDraft'

const EXPORT_SCOPE_MODES = [
  {value: 'ALL', label: '全部数据', description: '同时导出系统数据和全部业务应用数据。'},
  {value: 'SYSTEM_ONLY', label: '仅系统数据', description: '只导出用户、权限、字典和应用目录等平台数据。'},
  {value: 'BUSINESS_ONLY', label: '仅业务数据', description: '只导出业务应用数据，适合局部迁移。'},
  {value: 'CUSTOM', label: '自定义选择', description: '细粒度勾选系统资源和业务应用。'}
]

const IMPORT_MODES = [
  {value: 'MERGE', label: '合并导入', description: '尽量保留目标环境已有数据，按业务主键做增量合并。'},
  {value: 'OVERWRITE', label: '覆盖导入', description: '目标资源存在时执行覆盖更新，适合环境重建或强一致同步。'},
  {value: 'STRICT', label: '严格导入', description: '发现版本或主键冲突立即终止，适合高风险环境。'}
]

const DEFAULT_SYSTEM_RESOURCE_DEFINITIONS = [
  {
    code: 'SYSTEM_USERS',
    name: '用户与账号',
    description: '系统用户、角色标识、状态和个人资料等基础账号数据。',
    attachmentSupported: false
  },
  {
    code: 'SYSTEM_APPS',
    name: '应用目录',
    description: '应用管理维护的应用元数据、路由、图标和上下线配置。',
    attachmentSupported: true
  },
  {
    code: 'SYSTEM_PERMISSIONS',
    name: '权限授权',
    description: '用户与应用的授权矩阵、权限摘要和访问范围控制。',
    attachmentSupported: false
  },
  {
    code: 'SYSTEM_DICTIONARIES',
    name: '数据字典',
    description: '数据字典主表、字典项以及被业务模块引用的选项数据。',
    attachmentSupported: false
  },
  {
    code: 'SYSTEM_SETTINGS',
    name: '系统参数',
    description: '系统级开关、迁移元信息和后续接入的运行参数配置。',
    attachmentSupported: false
  }
]

const ARCHITECTURE_FLOWS = [
  {
    key: 'catalog',
    index: '01',
    title: '资源清单层',
    description: '先枚举系统资源和业务应用，再把导出、导入都建立在统一编码集合之上。'
  },
  {
    key: 'package',
    index: '02',
    title: '归档打包层',
    description: '后端按清单拉取结构化数据与附件，生成 manifest、data 文件和 ZIP 包。'
  },
  {
    key: 'validate',
    index: '03',
    title: '导入校验层',
    description: '导入前校验版本、来源环境、校验和、依赖关系和附件索引。'
  },
  {
    key: 'execute',
    index: '04',
    title: '任务执行层',
    description: '导入导出都沉淀为任务，记录执行状态、统计值、失败原因和下载地址。'
  }
]

const TASK_HISTORY_STORAGE_KEY = 'data_migration_task_history_cache'
const HISTORY_PAGE_SIZE_OPTIONS = [8, 12, 20]

function unwrapData(res) {
  const payload = res?.data
  if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data
  }
  return payload
}

function extractErrorMessage(error, fallback) {
  const data = error?.response?.data || {}
  return data.message || data.msg || fallback
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

function readCurrentUser() {
  try {
    const raw = localStorage.getItem('user')
    return JSON.parse(raw || '{}')
  } catch (error) {
    return {}
  }
}

function normalizeCurrentUser(source = {}) {
  return {
    ...source,
    id: source.id ?? source.userId ?? source.uid ?? null,
    username: source.username || source.userName || '',
    displayName: source.displayName || source.nickname || source.nickName || source.name || '',
    roleCode: `${source.roleCode || source.role || 'USER'}`.toUpperCase()
  }
}

function normalizeMigrationResource(item = {}, index = 0) {
  const code = `${item.code || item.resourceCode || item.key || `RESOURCE_${index + 1}`}`.trim().toUpperCase()
  return {
    code,
    name: item.name || item.resourceName || code,
    description: item.description || item.remark || '迁移资源说明待补充',
    attachmentSupported: Boolean(item.attachmentSupported ?? item.hasAttachment ?? false)
  }
}

function buildDefaultSystemResources() {
  return DEFAULT_SYSTEM_RESOURCE_DEFINITIONS.map((item, index) => normalizeMigrationResource(item, index))
}

function normalizeMigrationTask(item = {}, index = 0) {
  const rawSummary = item.summary || item.statistics || item.stats || {}
  const taskType = `${item.taskType || item.type || 'EXPORT'}`.toUpperCase()
  const status = `${item.status || item.taskStatus || 'PENDING'}`.toUpperCase()

  return {
    id: item.id ?? item.taskId ?? item.jobId ?? `migration-task-${index + 1}`,
    taskNo: item.taskNo || item.jobNo || item.serialNo || `TASK-${index + 1}`,
    taskType,
    status,
    packageName: item.packageName || item.packageCode || item.fileName || '',
    fileName: item.fileName || item.archiveName || '',
    fileSize: Number(item.fileSize ?? item.archiveSize ?? 0) || 0,
    createdAt: item.createdAt || item.createTime || item.startTime || '',
    finishedAt: item.finishedAt || item.finishTime || item.completedAt || '',
    systemResourceCount: Number(
      item.systemResourceCount
      ?? rawSummary.systemResourceCount
      ?? item.systemCount
      ?? 0
    ) || 0,
    businessAppCount: Number(
      item.businessAppCount
      ?? rawSummary.businessAppCount
      ?? item.appCount
      ?? 0
    ) || 0,
    recordCount: Number(
      item.recordCount
      ?? rawSummary.recordCount
      ?? item.totalRecords
      ?? 0
    ) || 0,
    attachmentCount: Number(
      item.attachmentCount
      ?? rawSummary.attachmentCount
      ?? item.fileCount
      ?? 0
    ) || 0,
    downloadUrl: item.downloadUrl || item.fileUrl || '',
    canDownload: Boolean(item.canDownload ?? item.downloadReady ?? item.downloadUrl),
    canDelete: Boolean(item.canDelete ?? (taskType === 'EXPORT')),
    message: item.message || item.remark || item.errorMessage || '',
    operatorName: item.operatorName || item.createdByName || item.creatorName || ''
  }
}

function formatBytes(size) {
  const value = Number(size || 0)
  if (!value) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1)
  const normalized = value / 1024 ** index
  return `${normalized.toFixed(normalized >= 10 || index === 0 ? 0 : 1)} ${units[index]}`
}

function formatDateTime(value) {
  if (!value) {
    return '-'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return `${value}`
  }
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hour = `${date.getHours()}`.padStart(2, '0')
  const minute = `${date.getMinutes()}`.padStart(2, '0')
  const second = `${date.getSeconds()}`.padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

function formatSecurityLevel(value) {
  const normalized = `${value || 'INTERNAL'}`.toUpperCase()
  if (normalized === 'PUBLIC') {
    return '公开'
  }
  if (normalized === 'CONFIDENTIAL') {
    return '受限'
  }
  return '内部'
}

function formatTaskType(value) {
  const normalized = `${value || ''}`.toUpperCase()
  return normalized === 'IMPORT' ? '导入任务' : '导出任务'
}

function formatTaskStatus(value) {
  const normalized = `${value || ''}`.toUpperCase()
  if (['SUCCESS', 'COMPLETED', 'DONE'].includes(normalized)) {
    return '成功'
  }
  if (['FAILED', 'ERROR'].includes(normalized)) {
    return '失败'
  }
  if (['PARTIAL_SUCCESS', 'PARTIAL'].includes(normalized)) {
    return '部分成功'
  }
  if (['RUNNING', 'PROCESSING'].includes(normalized)) {
    return '执行中'
  }
  if (['CANCELLED', 'CANCELED'].includes(normalized)) {
    return '已取消'
  }
  return '排队中'
}

function statusClassName(value) {
  const normalized = `${value || ''}`.toUpperCase()
  if (['SUCCESS', 'COMPLETED', 'DONE'].includes(normalized)) {
    return 'on'
  }
  if (['FAILED', 'ERROR'].includes(normalized)) {
    return 'off'
  }
  if (['PARTIAL_SUCCESS', 'PARTIAL'].includes(normalized)) {
    return 'warn'
  }
  return 'pending'
}

function buildDefaultPackageName() {
  const date = new Date()
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hour = `${date.getHours()}`.padStart(2, '0')
  const minute = `${date.getMinutes()}`.padStart(2, '0')
  return `data-migration-${year}${month}${day}-${hour}${minute}`
}

function sortTasks(list) {
  return [...list].sort((prev, next) => {
    const prevTime = Number.isNaN(new Date(prev.createdAt || 0).getTime()) ? 0 : new Date(prev.createdAt || 0).getTime()
    const nextTime = Number.isNaN(new Date(next.createdAt || 0).getTime()) ? 0 : new Date(next.createdAt || 0).getTime()
    return nextTime - prevTime || `${next.id}`.localeCompare(`${prev.id}`)
  })
}

function buildTaskHistoryKey(task = {}) {
  return `${task.id || ''}::${task.taskNo || ''}`
}

function mergeTaskHistory(currentList = [], incomingList = []) {
  const taskMap = new Map()
  currentList.concat(incomingList).forEach((item, index) => {
    const normalized = normalizeMigrationTask(item, index)
    taskMap.set(buildTaskHistoryKey(normalized), normalized)
  })
  return sortTasks(Array.from(taskMap.values()))
}

function readTaskHistoryCache() {
  try {
    const raw = JSON.parse(localStorage.getItem(TASK_HISTORY_STORAGE_KEY) || '[]')
    if (!Array.isArray(raw)) {
      return []
    }
    return sortTasks(raw.map((item, index) => normalizeMigrationTask(item, index)))
  } catch (error) {
    return []
  }
}

function persistTaskHistoryCache(list) {
  localStorage.setItem(TASK_HISTORY_STORAGE_KEY, JSON.stringify(sortTasks(list).slice(0, 80)))
}

function filterTaskHistory(list, filters = {}) {
  return list.filter((item) => {
    if (filters.taskType && `${item.taskType}`.toUpperCase() !== `${filters.taskType}`.toUpperCase()) {
      return false
    }
    if (filters.status && `${item.status}`.toUpperCase() !== `${filters.status}`.toUpperCase()) {
      return false
    }
    return true
  })
}

export default {
  setup() {
    const router = useRouter()
    const user = ref(normalizeCurrentUser(readCurrentUser()))
    const activeTab = ref('export')
    const resourceLoading = ref(false)
    const exporting = ref(false)
    const importing = ref(false)
    const tasksLoading = ref(false)
    const tasksLoadFailed = ref(false)
    const fileDragging = ref(false)
    const resourceSource = ref('draft')
    const historySource = ref('cache')
    const downloadingTaskId = ref('')
    const deletingTaskId = ref('')
    const taskRefreshingId = ref('')
    const fileInputRef = ref(null)
    const systemResources = ref([])
    const businessApps = ref([])
    const tasks = ref(readTaskHistoryCache())
    const selectedImportFile = ref(null)
    const pageSizeOptions = HISTORY_PAGE_SIZE_OPTIONS

    const exportForm = reactive({
      scopeMode: 'ALL',
      packageName: buildDefaultPackageName(),
      includeAttachments: true,
      systemResourceCodes: [],
      businessAppCodes: [],
      remark: ''
    })

    const importForm = reactive({
      importMode: 'MERGE',
      includeAttachments: true,
      continueOnError: false,
      remark: ''
    })

    const historyFilters = reactive({
      taskType: '',
      status: ''
    })

    const historyPagination = reactive({
      pageNo: 1,
      pageSize: 12,
      total: tasks.value.length
    })

    const isAdmin = computed(() => user.value.roleCode === 'ADMIN')
    const exportScopeModes = EXPORT_SCOPE_MODES
    const importModes = IMPORT_MODES
    const architectureFlows = ARCHITECTURE_FLOWS
    const allSystemResourcesChecked = computed(() => {
      return systemResources.value.length > 0
        && exportForm.systemResourceCodes.length === systemResources.value.length
    })
    const allBusinessAppsChecked = computed(() => {
      return businessApps.value.length > 0
        && exportForm.businessAppCodes.length === businessApps.value.length
    })
    const currentImportModeLabel = computed(() => {
      const matched = IMPORT_MODES.find((item) => item.value === importForm.importMode)
      return matched ? matched.label : '合并导入'
    })
    const resourceSourceLabel = computed(() => {
      return resourceSource.value === 'backend' ? '资源来自后端' : '资源来自前端基线'
    })
    const historySourceLabel = computed(() => {
      if (historySource.value === 'backend') {
        return '历史来自后端'
      }
      if (historySource.value === 'cache') {
        return '历史来自本地缓存'
      }
      return '历史暂不可用'
    })
    const exportScopeSummaryLabel = computed(() => {
      const matched = EXPORT_SCOPE_MODES.find((item) => item.value === exportForm.scopeMode)
      return matched ? matched.label : '自定义选择'
    })
    const historyPageCount = computed(() => {
      return Math.max(1, Math.ceil(historyPagination.total / historyPagination.pageSize))
    })
    const latestTaskLabel = computed(() => {
      if (!tasks.value.length) {
        return '暂无任务'
      }
      const latest = tasks.value[0]
      return `${formatTaskType(latest.taskType)} / ${formatTaskStatus(latest.status)}`
    })
    const historyEmptyText = computed(() => {
      if (historySource.value === 'cache') {
        return '当前展示的是本地缓存历史，等待后端恢复后会自动刷新真实记录。'
      }
      if (tasksLoadFailed.value) {
        return '历史记录接口暂不可用，且本地没有可用缓存。'
      }
      return '暂无迁移历史记录'
    })

    const syncScopeModeBySelection = () => {
      const systemCount = exportForm.systemResourceCodes.length
      const appCount = exportForm.businessAppCodes.length
      const allSystemCount = systemResources.value.length
      const allAppCount = businessApps.value.length

      if (allSystemCount && allAppCount && systemCount === allSystemCount && appCount === allAppCount) {
        exportForm.scopeMode = 'ALL'
        return
      }
      if (allSystemCount && systemCount === allSystemCount && appCount === 0) {
        exportForm.scopeMode = 'SYSTEM_ONLY'
        return
      }
      if (allAppCount && appCount === allAppCount && systemCount === 0) {
        exportForm.scopeMode = 'BUSINESS_ONLY'
        return
      }
      exportForm.scopeMode = 'CUSTOM'
    }

    const applyScopeMode = (mode) => {
      const allSystemCodes = systemResources.value.map((item) => item.code)
      const allBusinessCodes = businessApps.value.map((item) => item.featureCode)

      if (mode === 'ALL') {
        exportForm.systemResourceCodes = allSystemCodes
        exportForm.businessAppCodes = allBusinessCodes
      } else if (mode === 'SYSTEM_ONLY') {
        exportForm.systemResourceCodes = allSystemCodes
        exportForm.businessAppCodes = []
      } else if (mode === 'BUSINESS_ONLY') {
        exportForm.systemResourceCodes = []
        exportForm.businessAppCodes = allBusinessCodes
      }
      exportForm.scopeMode = mode
    }

    const resetExportForm = () => {
      exportForm.packageName = buildDefaultPackageName()
      exportForm.includeAttachments = true
      exportForm.remark = ''
      applyScopeMode('ALL')
    }

    const ensureValidSelections = () => {
      const systemCodeSet = new Set(systemResources.value.map((item) => item.code))
      const businessCodeSet = new Set(businessApps.value.map((item) => item.featureCode))
      exportForm.systemResourceCodes = exportForm.systemResourceCodes.filter((item) => systemCodeSet.has(item))
      exportForm.businessAppCodes = exportForm.businessAppCodes.filter((item) => businessCodeSet.has(item))

      if (!exportForm.systemResourceCodes.length && !exportForm.businessAppCodes.length) {
        applyScopeMode('ALL')
        return
      }
      syncScopeModeBySelection()
    }

    const toggleSystemResource = (code, checked) => {
      const nextSet = new Set(exportForm.systemResourceCodes)
      if (checked) {
        nextSet.add(code)
      } else {
        nextSet.delete(code)
      }
      exportForm.systemResourceCodes = Array.from(nextSet)
      syncScopeModeBySelection()
    }

    const toggleBusinessApp = (featureCode, checked) => {
      const nextSet = new Set(exportForm.businessAppCodes)
      if (checked) {
        nextSet.add(featureCode)
      } else {
        nextSet.delete(featureCode)
      }
      exportForm.businessAppCodes = Array.from(nextSet)
      syncScopeModeBySelection()
    }

    const toggleAllSystemResources = (checked) => {
      exportForm.systemResourceCodes = checked ? systemResources.value.map((item) => item.code) : []
      syncScopeModeBySelection()
    }

    const toggleAllBusinessApps = (checked) => {
      exportForm.businessAppCodes = checked ? businessApps.value.map((item) => item.featureCode) : []
      syncScopeModeBySelection()
    }

    const buildFallbackApps = () => {
      return resolveAppCatalogList().map((item, index) => normalizeSystemApp(item, index))
    }

    const fetchResources = async () => {
      resourceLoading.value = true
      try {
        const res = await getDataMigrationResources()
        const payload = unwrapData(res) || {}
        const backendSystemResources = payload.systemResources
          || payload.resources
          || payload.systemData
          || []
        const backendBusinessApps = payload.businessApps
          || payload.apps
          || payload.businessData
          || []

        systemResources.value = backendSystemResources.length
          ? backendSystemResources.map((item, index) => normalizeMigrationResource(item, index))
          : buildDefaultSystemResources()

        businessApps.value = backendBusinessApps.length
          ? mergeAppCatalogList(buildFallbackApps(), backendBusinessApps)
          : buildFallbackApps()

        resourceSource.value = 'backend'
      } catch (error) {
        console.warn('数据迁移资源接口未接通，回退到前端基线资源', error)
        systemResources.value = buildDefaultSystemResources()
        businessApps.value = buildFallbackApps()
        resourceSource.value = 'draft'
      } finally {
        ensureValidSelections()
        resourceLoading.value = false
      }
    }

    const fetchTasks = async () => {
      const loadCachedHistory = () => {
        const cachedTasks = readTaskHistoryCache()
        const filteredTasks = filterTaskHistory(cachedTasks, historyFilters)
        const start = (historyPagination.pageNo - 1) * historyPagination.pageSize
        const end = start + historyPagination.pageSize
        tasks.value = filteredTasks.slice(start, end)
        historyPagination.total = filteredTasks.length
        historySource.value = filteredTasks.length ? 'cache' : 'unavailable'
      }

      tasksLoading.value = true
      tasksLoadFailed.value = false
      try {
        const res = await listDataMigrationTasks({
          pageNo: historyPagination.pageNo,
          pageSize: historyPagination.pageSize,
          taskType: historyFilters.taskType || undefined,
          status: historyFilters.status || undefined
        })
        const payload = unwrapData(res)
        const parsed = parseListPayload(payload)
        const nextTasks = sortTasks(parsed.list.map((item, index) => normalizeMigrationTask(item, index)))
        tasks.value = nextTasks
        historyPagination.total = parsed.total || nextTasks.length
        historySource.value = 'backend'
        persistTaskHistoryCache(mergeTaskHistory(readTaskHistoryCache(), nextTasks))
      } catch (error) {
        console.warn('读取数据迁移任务失败', error)
        loadCachedHistory()
        tasksLoadFailed.value = !tasks.value.length
      } finally {
        tasksLoading.value = false
      }
    }

    const buildExportPayload = () => {
      return {
        scopeMode: exportForm.scopeMode,
        packageName: exportForm.packageName || buildDefaultPackageName(),
        includeAttachments: exportForm.includeAttachments,
        systemResourceCodes: exportForm.systemResourceCodes,
        businessAppCodes: exportForm.businessAppCodes,
        remark: exportForm.remark
      }
    }

    const submitExport = async () => {
      if (!exportForm.systemResourceCodes.length && !exportForm.businessAppCodes.length) {
        alert('请至少选择一项系统资源或业务应用')
        return
      }

      exporting.value = true
      try {
        const res = await createDataMigrationExport(buildExportPayload())
        const task = normalizeMigrationTask(unwrapData(res) || {}, 0)
        persistTaskHistoryCache(mergeTaskHistory(readTaskHistoryCache(), [task]))
        alert(task.canDownload ? '导出任务创建成功，正在准备下载包。' : '导出任务已创建，请在任务记录里查看状态。')
        await fetchTasks()
        if (task.canDownload || task.downloadUrl) {
          await downloadTask(task)
        }
      } catch (error) {
        console.error(error)
        alert(extractErrorMessage(error, '导出失败，请稍后重试'))
      } finally {
        exporting.value = false
      }
    }

    const triggerFilePicker = () => {
      fileInputRef.value?.click()
    }

    const clearImportFile = () => {
      selectedImportFile.value = null
      if (fileInputRef.value) {
        fileInputRef.value.value = ''
      }
    }

    const acceptImportFile = (file) => {
      if (!file) {
        return
      }
      const lowerName = `${file.name || ''}`.toLowerCase()
      if (!lowerName.endsWith('.zip')) {
        alert('仅支持导入 ZIP 文件')
        return
      }
      selectedImportFile.value = file
    }

    const handleFileChange = (event) => {
      const [file] = event?.target?.files || []
      acceptImportFile(file)
    }

    const handleFileDrop = (event) => {
      fileDragging.value = false
      const [file] = event?.dataTransfer?.files || []
      acceptImportFile(file)
    }

    const submitImport = async () => {
      if (!selectedImportFile.value) {
        alert('请先选择导入 ZIP 包')
        return
      }

      importing.value = true
      try {
        // 导入接口统一走 multipart，文件和元数据一起提交，后端可直接接入文件服务或对象存储。
        const metadata = {
          importMode: importForm.importMode,
          includeAttachments: importForm.includeAttachments,
          continueOnError: importForm.continueOnError,
          remark: importForm.remark
        }
        const formData = new FormData()
        formData.append('file', selectedImportFile.value)
        formData.append('metadata', JSON.stringify(metadata))
        const res = await createDataMigrationImport(formData)
        const task = normalizeMigrationTask(unwrapData(res) || {}, 0)
        persistTaskHistoryCache(mergeTaskHistory(readTaskHistoryCache(), [task]))
        alert(task.status === 'SUCCESS' ? '导入完成' : '导入任务已创建，请在任务记录里查看状态。')
        clearImportFile()
        importForm.remark = ''
        importForm.importMode = 'MERGE'
        importForm.includeAttachments = true
        importForm.continueOnError = false
        await fetchTasks()
      } catch (error) {
        console.error(error)
        alert(extractErrorMessage(error, '导入失败，请稍后重试'))
      } finally {
        importing.value = false
      }
    }

    const triggerBlobDownload = (blob, filename) => {
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      anchor.click()
      window.URL.revokeObjectURL(url)
    }

    const downloadTask = async (task) => {
      if (!task) {
        return
      }
      if (!task.id || !task.canDownload) {
        alert('当前任务的导出包尚未准备完成')
        return
      }

      downloadingTaskId.value = task.id
      try {
        // 下载统一走受权接口，避免 window.open 绕过 axios 鉴权头后被后端判定未登录。
        const res = await downloadDataMigrationExport(task.id)
        const blob = res?.data instanceof Blob ? res.data : new Blob([res?.data])
        const filename = task.fileName || `${task.packageName || task.taskNo || 'data-migration'}.zip`
        triggerBlobDownload(blob, filename)
      } catch (error) {
        console.error(error)
        alert(extractErrorMessage(error, '下载导出包失败'))
      } finally {
        downloadingTaskId.value = ''
      }
    }

    const removeTaskFromHistory = (taskId) => {
      const nextCachedTasks = readTaskHistoryCache().filter((item) => `${item.id}` !== `${taskId}`)
      persistTaskHistoryCache(nextCachedTasks)
      tasks.value = tasks.value.filter((item) => `${item.id}` !== `${taskId}`)
      historyPagination.total = Math.max(0, historyPagination.total - 1)
    }

    const removeTask = async (task) => {
      if (!task?.id || task.taskType !== 'EXPORT') {
        return
      }
      if (!window.confirm('确认删除该导出历史及其压缩包吗？此操作不可恢复。')) {
        return
      }

      deletingTaskId.value = task.id
      try {
        await deleteDataMigrationTask(task.id)
        removeTaskFromHistory(task.id)
        if (!tasks.value.length && historyPagination.pageNo > 1) {
          historyPagination.pageNo -= 1
        }
        await fetchTasks()
      } catch (error) {
        console.error(error)
        alert(extractErrorMessage(error, '删除导出包失败'))
      } finally {
        deletingTaskId.value = ''
      }
    }

    const refreshTask = async (task) => {
      if (!task?.id) {
        await fetchTasks()
        return
      }

      taskRefreshingId.value = task.id
      try {
        const res = await getDataMigrationTaskDetail(task.id)
        const detail = normalizeMigrationTask(unwrapData(res) || {}, 0)
        persistTaskHistoryCache(mergeTaskHistory(readTaskHistoryCache(), [detail]))
        const nextTasks = tasks.value.map((item) => {
          return `${item.id}` === `${task.id}` ? detail : item
        })
        if (!nextTasks.some((item) => `${item.id}` === `${task.id}`)) {
          nextTasks.unshift(detail)
        }
        tasks.value = sortTasks(nextTasks)
      } catch (error) {
        console.warn('刷新任务详情失败，退回整体刷新', error)
        await fetchTasks()
      } finally {
        taskRefreshingId.value = ''
      }
    }

    const goBackHome = () => {
      router.push('/home')
    }

    const searchHistory = async () => {
      historyPagination.pageNo = 1
      await fetchTasks()
    }

    const resetHistoryFilters = async () => {
      historyFilters.taskType = ''
      historyFilters.status = ''
      historyPagination.pageNo = 1
      historyPagination.pageSize = 12
      await fetchTasks()
    }

    const changeHistoryPage = async (delta) => {
      const nextPage = historyPagination.pageNo + delta
      if (nextPage < 1 || nextPage > historyPageCount.value) {
        return
      }
      historyPagination.pageNo = nextPage
      await fetchTasks()
    }

    const changeHistoryPageSize = async () => {
      historyPagination.pageNo = 1
      await fetchTasks()
    }

    onMounted(async () => {
      if (!isAdmin.value) {
        return
      }
      await fetchResources()
      await fetchTasks()
    })

    return {
      activeTab,
      architectureFlows,
      allBusinessAppsChecked,
      allSystemResourcesChecked,
      businessApps,
      clearImportFile,
      currentImportModeLabel,
      deletingTaskId,
      downloadTask,
      downloadingTaskId,
      exportForm,
      exportScopeModes,
      exportScopeSummaryLabel,
      fetchResources,
      fetchTasks,
      fileDragging,
      fileInputRef,
      formatBytes,
      formatDateTime,
      formatSecurityLevel,
      formatTaskStatus,
      formatTaskType,
      goBackHome,
      handleFileChange,
      handleFileDrop,
      historyEmptyText,
      importForm,
      importModes,
      importing,
      isAdmin,
      historyFilters,
      historyPageCount,
      historyPagination,
      historySourceLabel,
      latestTaskLabel,
      pageSizeOptions,
      resetHistoryFilters,
      removeTask,
      refreshTask,
      resourceLoading,
      resourceSourceLabel,
      resetExportForm,
      searchHistory,
      selectedImportFile,
      statusClassName,
      submitExport,
      submitImport,
      systemResources,
      taskRefreshingId,
      tasks,
      tasksLoadFailed,
      tasksLoading,
      changeHistoryPage,
      changeHistoryPageSize,
      toggleAllBusinessApps,
      toggleAllSystemResources,
      toggleBusinessApp,
      toggleSystemResource,
      triggerFilePicker,
      applyScopeMode,
      exporting
    }
  }
}
</script>

<style scoped>
.migration-page {
  width: 100%;
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
  gap: 8px;
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
  flex-wrap: wrap;
  background: linear-gradient(135deg, rgba(7, 22, 39, 0.84), rgba(18, 49, 72, 0.76));
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(16px);
}

.page-title {
  margin: 0;
  font-size: 28px;
}

.page-subtitle {
  max-width: 860px;
  margin: 6px 0 0;
  color: rgba(255, 255, 255, 0.76);
  font-size: 13px;
  line-height: 1.6;
}

.hero-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.hero-tag {
  padding: 7px 12px;
  min-height: 28px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 999px;
  font-size: 12px;
  background: rgba(91, 180, 255, 0.18);
  color: #d7f0ff;
}

.subtle-tag {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.78);
}

.migration-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.9fr) minmax(280px, 0.9fr);
  gap: 20px;
  align-items: start;
}

.main-column,
.side-column {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.panel {
  padding: 16px 18px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: linear-gradient(135deg, rgba(7, 22, 39, 0.84), rgba(18, 49, 72, 0.76));
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(16px);
}

.panel-title {
  margin: 0;
  font-size: 22px;
}

.panel-tip {
  margin: 6px 0 0;
  color: rgba(255, 255, 255, 0.76);
  line-height: 1.6;
}

.access-panel {
  text-align: center;
}

.access-actions {
  margin-top: 18px;
  display: flex;
  justify-content: center;
}

.tab-row {
  display: inline-flex;
  padding: 4px;
  border-radius: 999px;
  gap: 4px;
  background: rgba(255, 255, 255, 0.12);
}

.tab-btn {
  min-width: 108px;
  min-height: 38px;
  padding: 0 16px;
  border: none;
  border-radius: 999px;
  color: rgba(255, 255, 255, 0.76);
  cursor: pointer;
  background: transparent;
}

.tab-btn.active {
  color: #fff;
  background: linear-gradient(135deg, rgba(17, 132, 255, 0.42), rgba(73, 215, 255, 0.3));
  box-shadow: 0 10px 24px rgba(6, 78, 140, 0.24);
}

.tab-tip {
  margin: 12px 0 0;
  color: rgba(255, 255, 255, 0.74);
  line-height: 1.7;
}

.section-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.compact-head {
  margin-bottom: 16px;
}

.section-actions,
.form-actions,
.task-actions,
.upload-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.mode-grid {
  margin-top: 18px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.mode-card {
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  text-align: left;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  background: rgba(255, 255, 255, 0.08);
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.mode-card strong {
  color: #fff;
}

.mode-card.active {
  border-color: rgba(120, 201, 255, 0.36);
  background: linear-gradient(135deg, rgba(17, 132, 255, 0.18), rgba(73, 215, 255, 0.12));
  box-shadow: 0 12px 24px rgba(7, 22, 39, 0.22);
  transform: translateY(-1px);
}

.selector-grid {
  margin-top: 20px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.selector-card {
  padding: 18px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.06);
}

.selector-head {
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.selector-head h3 {
  margin: 0;
  font-size: 18px;
  color: #fff;
}

.selector-head p {
  margin: 8px 0 0;
  color: rgba(255, 255, 255, 0.68);
  line-height: 1.6;
}

.selector-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 420px;
  padding-right: 4px;
  overflow: auto;
}

.selector-item {
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 12px;
  align-items: flex-start;
  background: rgba(255, 255, 255, 0.06);
}

.selector-main {
  min-width: 0;
}

.selector-title-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.selector-title-row strong {
  color: #fff;
}

.selector-main p {
  margin: 8px 0 0;
  color: rgba(255, 255, 255, 0.68);
  line-height: 1.6;
}

.mini-tag {
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 12px;
  color: #c7efff;
  background: rgba(91, 180, 255, 0.16);
}

.mini-tag.soft {
  color: #e2ebff;
  background: rgba(114, 141, 255, 0.14);
}

.tag-group {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.switch-text,
.checkbox-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.82);
}

.form-grid {
  margin-top: 20px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-item span {
  color: rgba(255, 255, 255, 0.78);
  font-size: 14px;
}

.field-item input,
.field-item textarea,
.field-item select {
  width: 100%;
  min-height: 40px;
  padding: 0 12px;
  border: none;
  border-radius: 10px;
  color: #fff;
  font: inherit;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.14);
}

.field-item textarea {
  min-height: 88px;
  padding: 10px 12px;
  resize: vertical;
}

.field-item input:focus,
.field-item textarea:focus,
.field-item select:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(115, 207, 255, 0.24);
}

.field-item input::placeholder,
.field-item textarea::placeholder {
  color: rgba(255, 255, 255, 0.56);
}

.field-span-2 {
  grid-column: span 2;
}

.summary-bar {
  margin-top: 18px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.summary-card {
  padding: 16px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.08);
}

.summary-card span {
  display: block;
  color: rgba(255, 255, 255, 0.64);
  font-size: 13px;
}

.summary-card strong {
  margin-top: 10px;
  display: block;
  color: #fff;
  font-size: 18px;
  line-height: 1.4;
  word-break: break-word;
}

.form-actions {
  margin-top: 18px;
}

.upload-zone {
  margin-top: 18px;
  padding: 18px;
  border: 1px dashed rgba(125, 212, 255, 0.34);
  border-radius: 16px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
  background: rgba(255, 255, 255, 0.06);
}

.upload-zone.dragging {
  border-color: rgba(125, 212, 255, 0.56);
  box-shadow: 0 0 0 3px rgba(115, 207, 255, 0.14);
}

.file-input {
  display: none;
}

.upload-main strong {
  display: block;
  color: #fff;
  font-size: 17px;
}

.upload-main p {
  margin: 8px 0 0;
  color: rgba(255, 255, 255, 0.68);
  line-height: 1.6;
}

.insight-panel {
  position: sticky;
  top: 20px;
}

.flow-list,
.note-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.flow-card {
  padding: 14px;
  border-radius: 14px;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 12px;
  align-items: flex-start;
  background: rgba(255, 255, 255, 0.06);
}

.flow-index {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  background: linear-gradient(135deg, rgba(17, 132, 255, 0.82), rgba(73, 215, 255, 0.76));
}

.flow-card strong {
  color: #fff;
}

.flow-card p {
  margin: 8px 0 0;
  color: rgba(255, 255, 255, 0.68);
  line-height: 1.6;
}

.note-row {
  padding: 12px 14px;
  border-radius: 12px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  color: rgba(255, 255, 255, 0.72);
  background: rgba(255, 255, 255, 0.06);
}

.note-row strong {
  color: #fff;
}

.guide-list {
  margin: 0;
  padding-left: 18px;
  color: rgba(255, 255, 255, 0.72);
  line-height: 1.8;
}

.history-toolbar {
  margin-top: 16px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-end;
  flex-wrap: wrap;
}

.history-filter-grid {
  min-width: min(100%, 520px);
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.history-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.task-panel {
  margin-top: 20px;
}

.task-list {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 14px;
}

.task-card {
  padding: 18px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.06);
}

.task-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.task-head strong {
  display: block;
  color: #fff;
  font-size: 17px;
}

.task-head p {
  margin: 8px 0 0;
  color: rgba(255, 255, 255, 0.68);
}

.status-tag {
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  white-space: nowrap;
}

.status-tag.on {
  color: #047857;
  background: rgba(4, 120, 87, 0.12);
}

.status-tag.off {
  color: #b91c1c;
  background: rgba(185, 28, 28, 0.12);
}

.status-tag.warn {
  color: #b45309;
  background: rgba(180, 83, 9, 0.12);
}

.status-tag.pending {
  color: #1d4ed8;
  background: rgba(29, 78, 216, 0.12);
}

.task-meta {
  margin-top: 14px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.task-meta span {
  padding: 5px 9px;
  border-radius: 999px;
  color: rgba(255, 255, 255, 0.84);
  font-size: 12px;
  background: rgba(255, 255, 255, 0.12);
}

.task-foot {
  margin-top: 16px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-end;
  flex-wrap: wrap;
}

.task-time {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: rgba(255, 255, 255, 0.66);
  font-size: 13px;
}

.task-message {
  margin: 14px 0 0;
  color: rgba(255, 255, 255, 0.72);
  line-height: 1.6;
}

.action-btn,
.ghost-btn {
  min-height: 38px;
  padding: 0 16px;
  border-radius: 999px;
  font: inherit;
  cursor: pointer;
}

.action-btn {
  border: none;
  color: #fff;
  background: linear-gradient(135deg, #1f8fff, #42c6ff);
  box-shadow: 0 12px 24px rgba(0, 119, 255, 0.22);
}

.ghost-btn {
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}

.danger-btn {
  border-color: rgba(248, 113, 113, 0.28);
  color: #fecaca;
  background: rgba(127, 29, 29, 0.18);
}

.action-btn:disabled,
.ghost-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  box-shadow: none;
}

.empty-state {
  padding: 32px 16px;
  text-align: center;
  color: rgba(255, 255, 255, 0.72);
}

.small-empty {
  padding: 24px 12px;
}

.pager {
  margin-top: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.pager-left,
.pager-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.pager-left {
  color: rgba(255, 255, 255, 0.72);
}

.pager-left select {
  min-height: 36px;
  padding: 0 10px;
  border: none;
  border-radius: 10px;
  color: #fff;
  background: rgba(255, 255, 255, 0.14);
}

.selector-list::-webkit-scrollbar {
  width: 8px;
}

.selector-list::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
}

@media (max-width: 1180px) {
  .migration-layout {
    grid-template-columns: 1fr;
  }

  .insight-panel {
    position: static;
  }
}

@media (max-width: 820px) {
  .selector-grid,
  .form-grid,
  .summary-bar,
  .history-filter-grid {
    grid-template-columns: 1fr;
  }

  .field-span-2 {
    grid-column: span 1;
  }
}

@media (max-width: 640px) {
  .hero-panel,
  .panel,
  .selector-card,
  .task-card {
    padding: 12px;
  }

  .task-foot,
  .upload-zone,
  .selector-title-row,
  .note-row,
  .history-toolbar {
    align-items: flex-start;
  }
}
</style>
