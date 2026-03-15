<template>
  <div class="knowledge-base-page">
    <div class="page-nav">
      <button type="button" class="back-home-btn" @click="goBack">
        <span class="back-home-icon">←</span>
        <span>返回桌面</span>
      </button>
    </div>

    <div class="hero-panel">
      <div>
        <h1 class="page-title">经验库</h1>
        <p class="page-subtitle">记录工作和生活中反复验证过的经验，进入页面会随机抽取几条作为灵感横幅，其余内容按列表维护。</p>
      </div>
      <div class="hero-tags">
        <span class="hero-tag">{{ usingLocalData ? '本地演示数据' : '已接真实接口' }}</span>
        <span class="hero-tag">总计 {{ total }} 条</span>
        <span class="hero-tag">随机推荐 {{ featuredEntries.length }} 条</span>
      </div>
    </div>

    <section class="banner-panel">
      <div class="panel-head">
        <div>
          <h2 class="panel-title">随机经验推荐</h2>
          <span class="panel-tip">每次进入会随机抽取一组经验卡片，点击即可查看完整内容。</span>
        </div>
        <div class="toolbar-left">
          <button class="ghost-btn" :disabled="loading" @click="refreshHighlights">换一组</button>
        </div>
      </div>

      <div v-if="loading && !featuredEntries.length" class="empty-state">加载中...</div>

      <div v-else-if="featuredEntries.length" class="banner-grid">
        <article
          v-for="item in featuredEntries"
          :key="item.id"
          class="banner-card"
          @click="openDetailDialog(item)"
        >
          <div class="banner-card-top">
            <span class="category-chip">{{ item.category }}</span>
            <span class="banner-date">{{ item.updatedAt || item.createdAt || '-' }}</span>
          </div>
          <h3 class="banner-title">{{ item.title }}</h3>
          <p class="banner-summary">{{ shortText(item.summary, 88) }}</p>
          <div class="tag-row">
            <span v-for="tag in item.tags.slice(0, 3)" :key="`${item.id}-${tag}`" class="tag-chip">{{ tag }}</span>
          </div>
          <div class="banner-foot">
            <span class="banner-scene">{{ item.scenario || '通用经验' }}</span>
            <button class="mini-btn" type="button" @click.stop="openDetailDialog(item)">查看详情</button>
          </div>
        </article>
      </div>

      <div v-else class="empty-state">暂无经验记录，先新增几条再回来抽取灵感。</div>
    </section>

    <section class="list-panel">
      <div class="panel-head">
        <div>
          <h2 class="panel-title">经验列表</h2>
          <span class="panel-tip">列表保留常用信息，详细内容在详情弹窗里查看和编辑。</span>
        </div>
      </div>

      <div class="toolbar">
        <div class="toolbar-left">
          <button class="action-btn" :disabled="loading" @click="openCreateDialog">新增经验</button>
          <button class="ghost-btn" :disabled="loading" @click="loadEntries">刷新列表</button>
        </div>
        <div class="toolbar-right">
          <span>共 {{ total }} 条</span>
          <span v-if="usingLocalData" class="mock-tip">当前为演示数据（后端未联通）</span>
        </div>
      </div>

      <div v-if="loading" class="empty-state">加载中...</div>

      <template v-else>
        <div v-if="pagedRecords.length" class="table-wrap desktop-table">
          <table class="entry-table">
            <thead>
            <tr>
              <th>标题</th>
              <th>分类</th>
              <th>适用场景</th>
              <th>标签</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="item in pagedRecords" :key="item.id">
              <td class="title-cell">
                <strong>{{ item.title }}</strong>
                <p>{{ shortText(item.summary, 56) }}</p>
              </td>
              <td>
                <span class="category-chip subtle">{{ item.category }}</span>
              </td>
              <td>{{ item.scenario || '-' }}</td>
              <td>{{ buildTagText(item.tags) }}</td>
              <td>{{ item.updatedAt || item.createdAt || '-' }}</td>
              <td>
                <div class="row-actions">
                  <button class="mini-btn" @click="openDetailDialog(item)">详情</button>
                  <button class="mini-btn" @click="openEditDialog(item)">编辑</button>
                  <button class="mini-btn danger" @click="removeEntry(item)">删除</button>
                </div>
              </td>
            </tr>
            </tbody>
          </table>
        </div>

        <div v-if="pagedRecords.length" class="mobile-list">
          <article v-for="item in pagedRecords" :key="item.id" class="mobile-card">
            <div class="mobile-card-head">
              <div>
                <h3 class="mobile-card-title">{{ item.title }}</h3>
                <p class="mobile-card-summary">{{ shortText(item.summary, 74) }}</p>
              </div>
              <span class="category-chip subtle">{{ item.category }}</span>
            </div>

            <div class="mobile-card-grid">
              <p><span>适用场景</span><strong>{{ item.scenario || '-' }}</strong></p>
              <p><span>来源</span><strong>{{ item.source || '-' }}</strong></p>
              <p class="wide"><span>标签</span><strong>{{ buildTagText(item.tags) }}</strong></p>
              <p class="wide"><span>更新时间</span><strong>{{ item.updatedAt || item.createdAt || '-' }}</strong></p>
            </div>

            <div class="mobile-card-actions">
              <button class="mini-btn" @click="openDetailDialog(item)">详情</button>
              <button class="mini-btn" @click="openEditDialog(item)">编辑</button>
              <button class="mini-btn danger" @click="removeEntry(item)">删除</button>
            </div>
          </article>
        </div>

        <div v-else class="empty-state">暂无经验记录</div>
      </template>

      <div class="pager">
        <div class="pager-left">
          <span>第 {{ query.pageNo }} / {{ totalPages }} 页</span>
          <select v-model.number="query.pageSize" class="pager-select" :disabled="loading" @change="handlePageSizeChange">
            <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }} 条/页</option>
          </select>
        </div>
        <div class="pager-right">
          <button class="ghost-btn" :disabled="query.pageNo <= 1 || loading" @click="changePage(-1)">上一页</button>
          <button class="ghost-btn" :disabled="query.pageNo >= totalPages || loading" @click="changePage(1)">下一页</button>
        </div>
      </div>
    </section>

    <div v-if="showEditDialog" class="dialog-mask" @click.self="closeEditDialog">
      <div class="dialog">
        <h3 class="dialog-title">{{ editMode === 'create' ? '新增经验' : '编辑经验' }}</h3>
        <p class="dialog-subtitle">建议把能重复复用的方法、踩坑总结或生活技巧都沉淀到这里。</p>
        <form class="dialog-form" @submit.prevent="submitEditDialog">
          <div class="form-inline-grid">
            <label class="form-field">
              <span>标题</span>
              <input v-model.trim="form.title" class="input" maxlength="64" placeholder="例如：需求澄清时先画边界图" required />
            </label>

            <label class="form-field">
              <span>分类</span>
              <select v-model="form.category" class="input" required>
                <option v-for="item in categoryOptions" :key="item" :value="item">{{ item }}</option>
              </select>
            </label>
          </div>

          <div class="form-inline-grid">
            <label class="form-field">
              <span>适用场景</span>
              <input v-model.trim="form.scenario" class="input" maxlength="80" placeholder="例如：需求评审 / 家庭采购 / 自我管理" required />
            </label>

            <label class="form-field">
              <span>来源</span>
              <input v-model.trim="form.source" class="input" maxlength="80" placeholder="例如：项目复盘 / 社区讨论 / 个人实践" />
            </label>
          </div>

          <label class="form-field">
            <span>标签</span>
            <input v-model.trim="form.tagsText" class="input" maxlength="120" placeholder="多个标签用逗号分隔，例如：沟通, 复盘, 效率" />
          </label>

          <label class="form-field">
            <span>经验摘要</span>
            <textarea v-model.trim="form.summary" class="input textarea" rows="3" maxlength="180" placeholder="一句话概括经验的核心结论" required />
          </label>

          <label class="form-field">
            <span>详细内容</span>
            <textarea v-model.trim="form.content" class="input textarea content-textarea" rows="8" maxlength="2000" placeholder="记录背景、做法、踩坑点、适用边界和建议动作" required />
          </label>

          <div class="dialog-actions">
            <button type="button" class="ghost-btn" :disabled="submitting" @click="closeEditDialog">取消</button>
            <button type="submit" class="action-btn" :disabled="submitting">
              {{ submitting ? '提交中...' : (editMode === 'create' ? '保存经验' : '更新经验') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="showDetailDialog" class="dialog-mask" @click.self="closeDetailDialog">
      <div class="dialog detail-dialog">
        <div class="detail-head">
          <div>
            <h3 class="dialog-title">经验详情</h3>
            <p class="detail-subtitle">这里展示完整经验内容，便于后续回看和复用。</p>
          </div>
          <button class="dialog-close" @click="closeDetailDialog">x</button>
        </div>

        <div v-if="detailLoading" class="empty-state detail-empty">详情加载中...</div>

        <div v-else-if="activeDetail" class="detail-content">
          <div class="detail-hero">
            <div>
              <div class="tag-row detail-tag-row">
                <span class="category-chip">{{ activeDetail.category }}</span>
                <span v-for="tag in activeDetail.tags" :key="`detail-${tag}`" class="tag-chip">{{ tag }}</span>
              </div>
              <h3 class="detail-title">{{ activeDetail.title }}</h3>
              <p class="detail-summary">{{ activeDetail.summary }}</p>
            </div>
            <div class="detail-meta">
              <p><span>适用场景</span><strong>{{ activeDetail.scenario || '-' }}</strong></p>
              <p><span>来源</span><strong>{{ activeDetail.source || '-' }}</strong></p>
              <p><span>创建时间</span><strong>{{ activeDetail.createdAt || '-' }}</strong></p>
              <p><span>更新时间</span><strong>{{ activeDetail.updatedAt || activeDetail.createdAt || '-' }}</strong></p>
            </div>
          </div>

          <div class="detail-body">
            <h4>详细内容</h4>
            <p>{{ activeDetail.content || '-' }}</p>
          </div>

          <div class="dialog-actions">
            <button type="button" class="ghost-btn" @click="closeDetailDialog">关闭</button>
            <button type="button" class="action-btn" @click="openEditDialog(activeDetail)">编辑当前经验</button>
          </div>
        </div>

        <div v-else class="empty-state detail-empty">未找到经验详情</div>
      </div>
    </div>
  </div>
</template>

<script>
import {computed, onMounted, reactive, ref} from 'vue'
import {useRouter} from 'vue-router'
import {
  createKnowledgeEntry,
  deleteKnowledgeEntry,
  getKnowledgeEntryDetail,
  getKnowledgeHighlights,
  listKnowledgeEntries,
  updateKnowledgeEntry
} from '@/api/knowledgeBase'

const LOCAL_ENTRY_KEY = 'knowledge_base_entries'
const HIGHLIGHT_SIZE = 3
const PAGE_SIZE_OPTIONS = [6, 10, 16]
const CATEGORY_OPTIONS = ['工作', '生活', '学习', '工具', '健康', '财务', '其他']

const DEFAULT_ENTRIES = [
  {
    id: 'knowledge-1',
    title: '需求评审前先写“不做什么”',
    category: '工作',
    scenario: '需求评审 / 项目启动',
    source: '多次项目复盘',
    tags: ['需求', '沟通', '边界'],
    summary: '先把本期不做的范围说清楚，能显著降低后续返工和认知偏差。',
    content: '在需求评审会前，把本期明确不做的功能、暂不支持的边界、依赖前提和风险写在第一页。这样开发、测试、产品和业务能先对齐边界，而不是默认“以后可能会做”的内容都算在当前版本里。实际使用下来，这比一开始只讲要做什么更能降低扯皮。',
    createdAt: '2026-02-18 20:15',
    updatedAt: '2026-03-10 21:36'
  },
  {
    id: 'knowledge-2',
    title: '囤货前先看单位价格',
    category: '生活',
    scenario: '家庭采购 / 日常囤货',
    source: '日常消费记录',
    tags: ['采购', '预算', '生活'],
    summary: '不要只看满减和大包装，先换算到每 100g 或每件单价再决定。',
    content: '很多促销文案会强化“第 2 件半价”或“大包装更划算”，但真正有效的比较方式是统一换算成单位价格。像纸巾、洗衣液、米面粮油这些长期消耗品，单位价格往往比活动文案更真实。经验是先看单位价格，再决定是否需要囤货，避免买便宜了但也囤多了。',
    createdAt: '2026-01-22 10:08',
    updatedAt: '2026-03-08 09:42'
  },
  {
    id: 'knowledge-3',
    title: '复杂任务拆成“可验证的小闭环”',
    category: '工作',
    scenario: '技术开发 / 排查问题',
    source: '线上问题处理',
    tags: ['开发', '排查', '效率'],
    summary: '越复杂的问题越不能一次性全改，先做最小闭环验证方向是否正确。',
    content: '处理复杂问题时，不要一开始就全量重构或同时改多个变量。应该先找一个最小可验证路径，例如只替换一个接口返回、只改一个组件状态流、只验证一条关键链路。这样每次实验都有结果，有结果就能快速判断方向，避免在错误路径上投入太多时间。',
    createdAt: '2026-02-02 14:18',
    updatedAt: '2026-03-07 17:24'
  },
  {
    id: 'knowledge-4',
    title: '晨间固定动作比宏大计划更有用',
    category: '生活',
    scenario: '个人习惯 / 精力管理',
    source: '个人实践',
    tags: ['习惯', '自律', '健康'],
    summary: '把早晨前 30 分钟固定成少量可重复动作，比制定一整套复杂计划更稳定。',
    content: '一个稳定的晨间流程可以只包含 3 件事，例如喝水、简单拉伸、列当天最重要的 3 个任务。关键不是动作多，而是每天都能做。经历过多轮失败后发现，真正长期有效的是“低摩擦、固定、能完成”，而不是看起来很完美的高强度计划。',
    createdAt: '2026-01-09 07:50',
    updatedAt: '2026-03-06 08:12'
  },
  {
    id: 'knowledge-5',
    title: '软件安装包命名统一带版本和平台',
    category: '工具',
    scenario: '软件归档 / 文件管理',
    source: '软件仓库整理',
    tags: ['文件管理', '软件', '规范'],
    summary: '安装包文件名统一为“软件名_版本号_平台”，后续检索和分发会轻松很多。',
    content: '个人收集的软件如果命名混乱，后续几个月后就很难快速定位。建议统一成“软件名_版本号_平台_可选补充信息”的格式，例如 `everything_1.4.1.1024_windows_x64.exe`。这样在文件服务器、本地仓库、聊天窗口分发时都更清晰，也方便后续做自动扫描。',
    createdAt: '2026-02-12 16:32',
    updatedAt: '2026-03-05 22:18'
  },
  {
    id: 'knowledge-6',
    title: '记账时把“固定支出”单独看',
    category: '财务',
    scenario: '记账 / 预算复盘',
    source: '个人账单复盘',
    tags: ['记账', '预算', '复盘'],
    summary: '先把房租、订阅、通勤这类固定支出单列，才容易看清真正可优化的弹性支出。',
    content: '很多人复盘账单时直接看总支出，但真正需要优化的往往不是固定支出。先把固定支出单独分类，再看餐饮、购物、娱乐这些弹性支出，才能判断本月是结构性问题还是临时波动。这样做预算时也更准确。',
    createdAt: '2026-02-26 21:09',
    updatedAt: '2026-03-04 20:41'
  },
  {
    id: 'knowledge-7',
    title: '学新东西先找“反例”',
    category: '学习',
    scenario: '学习新工具 / 新方法',
    source: '长期自学总结',
    tags: ['学习', '方法论'],
    summary: '除了看正确示例，也要主动找不适用场景，才能真正理解边界。',
    content: '只看成功案例容易误以为方法万能。更有效的方式是学完后马上追问：它不适用于什么场景？有哪些前提？什么情况下会失败？反例能帮你更快建立边界感，也更容易把知识迁移到真实问题里。',
    createdAt: '2026-01-28 11:12',
    updatedAt: '2026-03-03 19:55'
  }
]

function unwrapData(res) {
  const payload = res?.data
  if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data
  }
  return payload
}

function formatDateTime(date = new Date()) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hour = `${date.getHours()}`.padStart(2, '0')
  const minute = `${date.getMinutes()}`.padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

function normalizeTags(value) {
  if (Array.isArray(value)) {
    return value.map((item) => `${item || ''}`.trim()).filter(Boolean)
  }
  if (!value) {
    return []
  }
  return `${value}`
    .split(/[，,、/\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeEntry(item = {}) {
  return {
    id: item.id ?? item.entryId ?? `knowledge-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: item.title || item.experienceTitle || item.name || '',
    category: item.category || item.categoryName || '其他',
    scenario: item.scenario || item.scene || '',
    source: item.source || item.sourceName || '',
    tags: normalizeTags(item.tags || item.tagList || item.tagNames),
    summary: item.summary || item.description || '',
    content: item.content || item.detail || item.body || '',
    createdAt: item.createdAt || item.createTime || '',
    updatedAt: item.updatedAt || item.updateTime || item.createdAt || item.createTime || ''
  }
}

function loadLocalEntries() {
  try {
    const raw = localStorage.getItem(LOCAL_ENTRY_KEY)
    if (!raw) {
      localStorage.setItem(LOCAL_ENTRY_KEY, JSON.stringify(DEFAULT_ENTRIES))
      return DEFAULT_ENTRIES.map((item) => normalizeEntry(item))
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return DEFAULT_ENTRIES.map((item) => normalizeEntry(item))
    }
    return parsed.map((item) => normalizeEntry(item))
  } catch (error) {
    return DEFAULT_ENTRIES.map((item) => normalizeEntry(item))
  }
}

function persistLocalEntries(list) {
  localStorage.setItem(LOCAL_ENTRY_KEY, JSON.stringify(list))
}

function chooseRandomEntries(list, size) {
  const source = Array.isArray(list) ? [...list] : []
  if (source.length <= size) {
    return source
  }
  for (let index = source.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    const temp = source[index]
    source[index] = source[randomIndex]
    source[randomIndex] = temp
  }
  return source.slice(0, size)
}

function shortText(text, maxLength = 60) {
  const value = `${text || ''}`.trim()
  if (!value) {
    return '-'
  }
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value
}

function extractErrorMessage(error, fallback) {
  const data = error?.response?.data || {}
  return data.message || data.msg || fallback
}

export default {
  name: 'KnowledgeBase',
  setup() {
    const router = useRouter()

    const loading = ref(false)
    const submitting = ref(false)
    const usingLocalData = ref(false)
    const total = ref(0)
    const allLocalRecords = ref([])
    const pagedRecords = ref([])
    const featuredEntries = ref([])

    const showEditDialog = ref(false)
    const showDetailDialog = ref(false)
    const detailLoading = ref(false)
    const activeDetail = ref(null)
    const editMode = ref('create')
    const editingId = ref('')

    const query = reactive({
      pageNo: 1,
      pageSize: PAGE_SIZE_OPTIONS[0]
    })

    const form = reactive({
      title: '',
      category: CATEGORY_OPTIONS[0],
      scenario: '',
      source: '',
      tagsText: '',
      summary: '',
      content: ''
    })

    const pageSizeOptions = PAGE_SIZE_OPTIONS
    const categoryOptions = CATEGORY_OPTIONS

    const totalPages = computed(() => Math.max(1, Math.ceil(total.value / query.pageSize)))

    const sortEntries = (list) => [...list].sort((prev, next) => {
      const nextTime = `${next.updatedAt || next.createdAt || ''}`
      const prevTime = `${prev.updatedAt || prev.createdAt || ''}`
      return nextTime.localeCompare(prevTime)
    })

    const fillForm = (entry) => {
      form.title = entry.title || ''
      form.category = entry.category || CATEGORY_OPTIONS[0]
      form.scenario = entry.scenario || ''
      form.source = entry.source || ''
      form.tagsText = (entry.tags || []).join(', ')
      form.summary = entry.summary || ''
      form.content = entry.content || ''
    }

    const resetForm = () => {
      fillForm({})
    }

    const applyLocalPaging = () => {
      total.value = allLocalRecords.value.length
      const safePageNo = Math.min(query.pageNo, Math.max(1, Math.ceil(total.value / query.pageSize) || 1))
      query.pageNo = safePageNo
      const startIndex = (safePageNo - 1) * query.pageSize
      pagedRecords.value = allLocalRecords.value.slice(startIndex, startIndex + query.pageSize)
    }

    const refreshLocalHighlights = () => {
      featuredEntries.value = chooseRandomEntries(allLocalRecords.value, HIGHLIGHT_SIZE)
    }

    const syncLocalEntries = (records) => {
      allLocalRecords.value = sortEntries(records.map((item) => normalizeEntry(item)))
      persistLocalEntries(allLocalRecords.value)
      applyLocalPaging()
      refreshLocalHighlights()
    }

    const normalizeListPayload = (payload) => {
      const rawList = Array.isArray(payload)
        ? payload
        : (payload?.list || payload?.records || payload?.rows || payload?.items || [])
      return rawList.map((item) => normalizeEntry(item))
    }

    const applyHighlightPayload = (payload, fallbackList = []) => {
      const rawList = Array.isArray(payload)
        ? payload
        : (payload?.list || payload?.records || payload?.rows || payload?.items || payload?.entries || [])
      const normalized = rawList.map((item) => normalizeEntry(item))
      featuredEntries.value = chooseRandomEntries(normalized.length ? normalized : fallbackList, HIGHLIGHT_SIZE)
    }

    const loadEntries = async () => {
      loading.value = true
      try {
        const [listResult, highlightResult] = await Promise.allSettled([
          listKnowledgeEntries({
            pageNo: query.pageNo,
            pageSize: query.pageSize
          }),
          getKnowledgeHighlights({
            size: HIGHLIGHT_SIZE
          })
        ])

        if (listResult.status !== 'fulfilled') {
          throw listResult.reason
        }

        const payload = unwrapData(listResult.value)
        const normalizedList = normalizeListPayload(payload)
        pagedRecords.value = normalizedList
        total.value = Number(payload?.total ?? payload?.count ?? normalizedList.length ?? 0)
        usingLocalData.value = false

        if (highlightResult.status === 'fulfilled') {
          applyHighlightPayload(unwrapData(highlightResult.value), normalizedList)
        } else {
          featuredEntries.value = chooseRandomEntries(normalizedList, HIGHLIGHT_SIZE)
        }
      } catch (error) {
        allLocalRecords.value = sortEntries(loadLocalEntries())
        usingLocalData.value = true
        applyLocalPaging()
        refreshLocalHighlights()
      } finally {
        loading.value = false
      }
    }

    const refreshHighlights = async () => {
      if (loading.value) {
        return
      }
      if (usingLocalData.value) {
        refreshLocalHighlights()
        return
      }
      try {
        const res = await getKnowledgeHighlights({size: HIGHLIGHT_SIZE})
        applyHighlightPayload(unwrapData(res), pagedRecords.value)
      } catch (error) {
        featuredEntries.value = chooseRandomEntries(pagedRecords.value, HIGHLIGHT_SIZE)
      }
    }

    const handlePageSizeChange = () => {
      query.pageNo = 1
      loadEntries()
    }

    const changePage = (offset) => {
      const nextPage = query.pageNo + offset
      if (nextPage < 1 || nextPage > totalPages.value) {
        return
      }
      query.pageNo = nextPage
      loadEntries()
    }

    const openCreateDialog = () => {
      editMode.value = 'create'
      editingId.value = ''
      resetForm()
      showEditDialog.value = true
    }

    const openEditDialog = (item) => {
      editMode.value = 'edit'
      editingId.value = item.id
      fillForm(item)
      showEditDialog.value = true
      showDetailDialog.value = false
    }

    const closeEditDialog = () => {
      if (submitting.value) {
        return
      }
      showEditDialog.value = false
      resetForm()
    }

    const submitEditDialog = async () => {
      if (!form.title) {
        alert('请输入标题')
        return
      }
      if (!form.category) {
        alert('请选择分类')
        return
      }
      if (!form.scenario) {
        alert('请输入适用场景')
        return
      }
      if (!form.summary) {
        alert('请输入经验摘要')
        return
      }
      if (!form.content) {
        alert('请输入详细内容')
        return
      }
      if (submitting.value) {
        return
      }

      const payload = {
        title: form.title,
        category: form.category,
        scenario: form.scenario,
        source: form.source,
        tags: normalizeTags(form.tagsText),
        summary: form.summary,
        content: form.content
      }

      submitting.value = true
      try {
        if (editMode.value === 'create') {
          await createKnowledgeEntry(payload)
        } else {
          await updateKnowledgeEntry(editingId.value, payload)
        }
        showEditDialog.value = false
        resetForm()
        await loadEntries()
      } catch (error) {
        const now = formatDateTime()
        const currentList = loadLocalEntries()
        if (editMode.value === 'create') {
          currentList.unshift(normalizeEntry({
            ...payload,
            id: `knowledge-${Date.now()}`,
            createdAt: now,
            updatedAt: now
          }))
        } else {
          const nextList = currentList.map((item) => (
            item.id === editingId.value
              ? normalizeEntry({
                ...item,
                ...payload,
                updatedAt: now
              })
              : item
          ))
          syncLocalEntries(nextList)
          usingLocalData.value = true
          showEditDialog.value = false
          resetForm()
          return
        }
        syncLocalEntries(currentList)
        usingLocalData.value = true
        showEditDialog.value = false
        resetForm()
      } finally {
        submitting.value = false
      }
    }

    const removeEntry = async (item) => {
      if (!window.confirm(`确认删除【${item.title}】吗？`)) {
        return
      }
      const nextTotal = Math.max(0, total.value - 1)
      const maxPage = Math.max(1, Math.ceil(nextTotal / query.pageSize) || 1)
      if (query.pageNo > maxPage) {
        query.pageNo = maxPage
      }
      try {
        await deleteKnowledgeEntry(item.id)
        await loadEntries()
      } catch (error) {
        const nextList = loadLocalEntries().filter((record) => record.id !== item.id)
        syncLocalEntries(nextList)
        usingLocalData.value = true
      }
    }

    const closeDetailDialog = () => {
      if (detailLoading.value) {
        return
      }
      showDetailDialog.value = false
      activeDetail.value = null
    }

    const openDetailDialog = async (item) => {
      showDetailDialog.value = true
      detailLoading.value = true
      activeDetail.value = normalizeEntry(item)
      try {
        const res = await getKnowledgeEntryDetail(item.id)
        activeDetail.value = normalizeEntry(unwrapData(res) || item)
      } catch (error) {
        const fallback = loadLocalEntries().find((record) => record.id === item.id) || item
        activeDetail.value = normalizeEntry(fallback)
        usingLocalData.value = true
      } finally {
        detailLoading.value = false
      }
    }

    const buildTagText = (tags) => {
      return (tags || []).length ? tags.join(' / ') : '-'
    }

    const goBack = () => {
      router.push('/home')
    }

    onMounted(() => {
      loadEntries()
    })

    return {
      loading,
      submitting,
      usingLocalData,
      total,
      featuredEntries,
      pagedRecords,
      query,
      pageSizeOptions,
      totalPages,
      categoryOptions,
      showEditDialog,
      showDetailDialog,
      detailLoading,
      activeDetail,
      editMode,
      form,
      shortText,
      buildTagText,
      loadEntries,
      refreshHighlights,
      handlePageSizeChange,
      changePage,
      openCreateDialog,
      openEditDialog,
      closeEditDialog,
      submitEditDialog,
      removeEntry,
      openDetailDialog,
      closeDetailDialog,
      goBack
    }
  }
}
</script>

<style scoped>
.knowledge-base-page {
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

.hero-panel,
.banner-panel,
.list-panel,
.dialog {
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: linear-gradient(135deg, rgba(9, 26, 43, 0.84), rgba(19, 56, 78, 0.74));
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(16px);
}

.hero-panel,
.banner-panel,
.list-panel {
  padding: 16px 18px;
}

.hero-panel,
.panel-head,
.toolbar,
.pager,
.row-actions,
.mobile-card-actions,
.dialog-actions,
.detail-head,
.hero-tags,
.tag-row,
.banner-card-top,
.banner-foot,
.detail-tag-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hero-panel,
.panel-head,
.toolbar,
.pager,
.detail-head {
  justify-content: space-between;
}

.hero-panel,
.banner-panel {
  margin-bottom: 14px;
}

.page-title,
.panel-title,
.dialog-title,
.detail-title {
  margin: 0;
}

.page-title {
  font-size: 28px;
}

.page-subtitle,
.panel-tip,
.dialog-subtitle,
.detail-subtitle,
.mock-tip,
.empty-state,
.banner-summary,
.mobile-card-summary {
  margin: 6px 0 0;
  color: rgba(255, 255, 255, 0.74);
}

.hero-tags {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.hero-tag,
.category-chip,
.tag-chip,
.banner-date {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
}

.hero-tag {
  background: rgba(255, 255, 255, 0.14);
  color: #ffe7c3;
}

.category-chip {
  background: rgba(251, 146, 60, 0.2);
  color: #ffe6c9;
}

.category-chip.subtle {
  background: rgba(255, 255, 255, 0.1);
}

.tag-chip {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.84);
}

.banner-date {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.72);
}

.toolbar {
  margin-top: 14px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.toolbar-right {
  color: rgba(255, 255, 255, 0.74);
}

.banner-grid {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.banner-card {
  display: flex;
  min-height: 220px;
  flex-direction: column;
  justify-content: space-between;
  padding: 16px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  cursor: pointer;
  background:
    radial-gradient(circle at top right, rgba(251, 146, 60, 0.22), transparent 38%),
    linear-gradient(160deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.04));
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.banner-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.24);
  box-shadow: 0 16px 28px rgba(0, 0, 0, 0.18);
}

.banner-card-top {
  justify-content: space-between;
}

.banner-title {
  margin: 14px 0 0;
  font-size: 22px;
  line-height: 1.25;
}

.banner-summary {
  min-height: 66px;
  line-height: 1.6;
}

.tag-row {
  flex-wrap: wrap;
}

.banner-foot {
  justify-content: space-between;
  margin-top: 14px;
}

.banner-scene {
  color: rgba(255, 255, 255, 0.74);
  font-size: 13px;
}

.table-wrap {
  overflow-x: auto;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
}

.entry-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 980px;
}

.entry-table th,
.entry-table td {
  padding: 14px 16px;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  vertical-align: top;
}

.entry-table th {
  color: rgba(255, 255, 255, 0.72);
  font-size: 13px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.04);
}

.entry-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.04);
}

.entry-table tbody tr:last-child td {
  border-bottom: none;
}

.title-cell strong {
  display: block;
  font-size: 15px;
}

.title-cell p {
  margin: 6px 0 0;
  color: rgba(255, 255, 255, 0.68);
  line-height: 1.55;
}

.row-actions {
  flex-wrap: wrap;
}

.mobile-list {
  display: none;
}

.mobile-card {
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.08);
  padding: 14px;
}

.mobile-card + .mobile-card {
  margin-top: 12px;
}

.mobile-card-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.mobile-card-title {
  margin: 0;
  font-size: 16px;
}

.mobile-card-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.mobile-card-grid p,
.detail-meta p {
  margin: 0;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mobile-card-grid p.wide {
  grid-column: span 2;
}

.mobile-card-grid span,
.detail-meta span {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.68);
}

.mobile-card-actions {
  margin-top: 12px;
  flex-wrap: wrap;
}

.pager {
  margin-top: 14px;
  flex-wrap: wrap;
}

.pager-left,
.pager-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pager-select,
.input {
  width: 100%;
  min-height: 40px;
  padding: 9px 12px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  outline: none;
}

.input::placeholder,
.textarea::placeholder {
  color: rgba(255, 255, 255, 0.48);
}

.action-btn,
.ghost-btn,
.mini-btn {
  border: none;
  border-radius: 10px;
  color: #fff;
  cursor: pointer;
}

.action-btn,
.ghost-btn {
  min-height: 38px;
  padding: 0 14px;
}

.action-btn {
  background: linear-gradient(135deg, #ff8a34, #ff5f8f);
}

.ghost-btn {
  background: rgba(255, 255, 255, 0.12);
}

.mini-btn {
  min-height: 30px;
  padding: 0 10px;
  background: rgba(255, 255, 255, 0.16);
}

.mini-btn.danger {
  background: rgba(239, 68, 68, 0.68);
}

.dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 40;
  padding: 18px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(4, 10, 18, 0.56);
}

.dialog {
  width: min(860px, 100%);
  max-height: calc(100vh - 36px);
  overflow: auto;
  padding: 20px;
  border-radius: 20px;
}

.dialog-form {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-inline-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-field span {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.72);
}

.textarea {
  resize: vertical;
  min-height: 96px;
}

.content-textarea {
  min-height: 180px;
}

.dialog-actions {
  justify-content: flex-end;
  flex-wrap: wrap;
}

.detail-dialog {
  width: min(920px, 100%);
}

.detail-head {
  align-items: flex-start;
}

.dialog-close {
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 999px;
  color: #fff;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.12);
}

.detail-content {
  margin-top: 14px;
}

.detail-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
  gap: 14px;
}

.detail-title {
  margin-top: 12px;
  font-size: 26px;
}

.detail-summary {
  margin: 10px 0 0;
  color: rgba(255, 255, 255, 0.82);
  line-height: 1.6;
}

.detail-tag-row {
  flex-wrap: wrap;
  justify-content: flex-start;
}

.detail-meta {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.detail-body {
  margin-top: 14px;
  padding: 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.06);
}

.detail-body h4 {
  margin: 0 0 10px;
  font-size: 16px;
}

.detail-body p {
  margin: 0;
  color: rgba(255, 255, 255, 0.84);
  line-height: 1.75;
  white-space: pre-wrap;
}

.detail-empty,
.empty-state {
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 1180px) {
  .banner-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 860px) {
  .banner-grid,
  .detail-hero,
  .form-inline-grid {
    grid-template-columns: 1fr;
  }

  .desktop-table {
    display: none;
  }

  .mobile-list {
    display: block;
  }
}

@media (max-width: 720px) {
  .knowledge-base-page {
    padding: 12px;
  }

  .hero-panel,
  .panel-head,
  .toolbar,
  .pager,
  .detail-head,
  .dialog-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .hero-tags,
  .toolbar-left,
  .toolbar-right,
  .pager-left,
  .pager-right,
  .mobile-card-actions {
    width: 100%;
  }

  .banner-card {
    min-height: 188px;
    padding: 14px;
  }

  .banner-title {
    font-size: 18px;
  }

  .banner-summary {
    min-height: auto;
  }

  .mobile-card-grid {
    grid-template-columns: 1fr;
  }

  .mobile-card-grid p.wide {
    grid-column: span 1;
  }
}

@media (max-width: 560px) {
  .hero-panel,
  .banner-panel,
  .list-panel,
  .dialog {
    padding: 14px;
    border-radius: 16px;
  }

  .page-title {
    font-size: 24px;
  }

  .banner-grid {
    gap: 10px;
  }

  .banner-card {
    min-height: 170px;
  }

  .detail-title {
    font-size: 22px;
  }

  .dialog-mask {
    padding: 10px;
  }
}
</style>
