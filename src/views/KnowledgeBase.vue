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
        <p class="page-subtitle">沉淀工作与生活中被反复验证过的方法、边界和踩坑结论，进入页面时会随机抽几条作为灵感横幅。</p>
      </div>
      <div class="hero-tags">
        <span class="hero-tag">总计 {{ total }} 条</span>
        <span class="hero-tag">推荐 {{ featuredEntries.length }} 条</span>
        <span class="hero-tag">真实接口</span>
      </div>
    </div>

    <section class="panel-section">
      <div class="panel-head">
        <div>
          <h2 class="panel-title">随机经验推荐</h2>
          <p class="panel-tip">每次刷新都会随机抽取一组经验卡片，用于快速回看过去积累的做法。</p>
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
            <span class="banner-date">{{ formatDate(item.updatedAt || item.createdAt) }}</span>
          </div>
          <h3 class="banner-title">{{ item.title }}</h3>
          <p class="banner-summary">{{ shortText(item.summary, 96) }}</p>
          <div class="tag-row">
            <span v-for="tag in (item.tags || []).slice(0, 3)" :key="`${item.id}-${tag}`" class="tag-chip">{{ tag }}</span>
          </div>
          <div class="banner-foot">
            <span class="banner-scene">{{ item.scenario || '通用经验' }}</span>
            <button class="mini-btn" type="button" @click.stop="openDetailDialog(item)">查看详情</button>
          </div>
        </article>
      </div>

      <div v-else class="empty-state">暂无经验记录，先新增几条再回来抽取灵感。</div>
    </section>

    <section class="panel-section">
      <div class="panel-head">
        <div>
          <h2 class="panel-title">经验列表</h2>
          <p class="panel-tip">列表保留标题、分类、适用场景和标签，详细内容在弹窗中查看和编辑。</p>
        </div>
        <div class="toolbar-left">
          <button class="action-btn" :disabled="loading || submitting" @click="openCreateDialog">新增经验</button>
          <button class="ghost-btn" :disabled="loading" @click="loadEntries">刷新列表</button>
        </div>
      </div>

      <div v-if="loading && !pagedRecords.length" class="empty-state">加载中...</div>

      <template v-else>
        <div v-if="pagedRecords.length" class="desktop-table">
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
                  <p>{{ shortText(item.summary, 70) }}</p>
                </td>
                <td><span class="category-chip subtle">{{ item.category }}</span></td>
                <td>{{ item.scenario || '-' }}</td>
                <td>{{ buildTagText(item.tags) }}</td>
                <td>{{ formatDate(item.updatedAt || item.createdAt) }}</td>
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
                <p class="mobile-card-summary">{{ shortText(item.summary, 80) }}</p>
              </div>
              <span class="category-chip subtle">{{ item.category }}</span>
            </div>

            <div class="mobile-card-grid">
              <p><span>适用场景</span><strong>{{ item.scenario || '-' }}</strong></p>
              <p><span>来源</span><strong>{{ item.source || '-' }}</strong></p>
              <p class="wide"><span>标签</span><strong>{{ buildTagText(item.tags) }}</strong></p>
              <p class="wide"><span>更新时间</span><strong>{{ formatDate(item.updatedAt || item.createdAt) }}</strong></p>
            </div>

            <div class="row-actions">
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
        <p class="dialog-subtitle">建议记录背景、做法、适用边界和踩坑点，后续回看才有复用价值。</p>
        <form class="dialog-form" @submit.prevent="submitEditDialog">
          <div class="form-inline-grid">
            <label class="form-field">
              <span>标题</span>
              <input v-model.trim="form.title" class="input" maxlength="64" required />
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
              <input v-model.trim="form.scenario" class="input" maxlength="80" required />
            </label>
            <label class="form-field">
              <span>来源</span>
              <input v-model.trim="form.source" class="input" maxlength="80" />
            </label>
          </div>

          <label class="form-field">
            <span>标签</span>
            <input v-model.trim="form.tagsText" class="input" maxlength="120" placeholder="多个标签用逗号分隔" />
          </label>

          <label class="form-field">
            <span>经验摘要</span>
            <textarea v-model.trim="form.summary" class="input textarea" rows="3" maxlength="180" required />
          </label>

          <label class="form-field">
            <span>详细内容</span>
            <textarea v-model.trim="form.content" class="input textarea content-textarea" rows="8" maxlength="2000" required />
          </label>

          <div class="dialog-actions">
            <button type="button" class="ghost-btn" :disabled="submitting" @click="closeEditDialog">取消</button>
            <button type="submit" class="action-btn" :disabled="submitting">{{ submitting ? '提交中...' : '保存经验' }}</button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="showDetailDialog" class="dialog-mask" @click.self="closeDetailDialog">
      <div class="dialog detail-dialog">
        <div class="detail-head">
          <div>
            <h3 class="dialog-title">经验详情</h3>
            <p class="dialog-subtitle">这里展示完整经验内容，便于后续检索和复用。</p>
          </div>
          <button class="dialog-close" @click="closeDetailDialog">x</button>
        </div>

        <div v-if="detailLoading" class="empty-state">详情加载中...</div>

        <div v-else-if="activeDetail" class="detail-content">
          <div class="detail-hero">
            <div>
              <div class="tag-row detail-tag-row">
                <span class="category-chip">{{ activeDetail.category }}</span>
                <span v-for="tag in activeDetail.tags || []" :key="`detail-${tag}`" class="tag-chip">{{ tag }}</span>
              </div>
              <h3 class="detail-title">{{ activeDetail.title }}</h3>
              <p class="detail-summary">{{ activeDetail.summary }}</p>
            </div>
            <div class="detail-meta">
              <p><span>适用场景</span><strong>{{ activeDetail.scenario || '-' }}</strong></p>
              <p><span>来源</span><strong>{{ activeDetail.source || '-' }}</strong></p>
              <p><span>创建时间</span><strong>{{ formatDate(activeDetail.createdAt) }}</strong></p>
              <p><span>更新时间</span><strong>{{ formatDate(activeDetail.updatedAt || activeDetail.createdAt) }}</strong></p>
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

        <div v-else class="empty-state">未找到经验详情</div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  createKnowledgeEntry,
  deleteKnowledgeEntry,
  getKnowledgeEntryDetail,
  getKnowledgeHighlights,
  listKnowledgeEntries,
  updateKnowledgeEntry
} from '@/api/knowledgeBase'

const PAGE_SIZE_OPTIONS = [6, 10, 16]
const HIGHLIGHT_SIZE = 3
const CATEGORY_OPTIONS = ['工作', '生活', '学习', '工具', '健康', '财务', '其他']

function unwrapData(res) {
  const payload = res?.data
  if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data
  }
  return payload
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
    id: item.id,
    title: item.title || '',
    category: item.category || item.categoryName || '',
    scenario: item.scenario || '',
    source: item.source || item.sourceName || '',
    tags: normalizeTags(item.tags || item.tagsText),
    summary: item.summary || '',
    content: item.content || '',
    createdAt: item.createdAt || '',
    updatedAt: item.updatedAt || ''
  }
}

function shortText(text, maxLength = 60) {
  const value = `${text || ''}`.trim()
  if (!value) {
    return '-'
  }
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value
}

export default {
  name: 'KnowledgeBase',
  setup() {
    const router = useRouter()

    const loading = ref(false)
    const submitting = ref(false)
    const detailLoading = ref(false)
    const total = ref(0)
    const pagedRecords = ref([])
    const featuredEntries = ref([])
    const showEditDialog = ref(false)
    const showDetailDialog = ref(false)
    const activeDetail = ref(null)
    const editMode = ref('create')
    const editingId = ref(null)

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

    const formatDate = (value) => {
      if (!value) {
        return '-'
      }
      return `${value}`.replace('T', ' ').slice(0, 16)
    }

    const buildTagText = (tags) => {
      return (tags || []).length ? tags.join(' / ') : '-'
    }

    const loadEntries = async () => {
      loading.value = true
      try {
        const res = await listKnowledgeEntries({
          pageNo: query.pageNo,
          pageSize: query.pageSize
        })
        const payload = unwrapData(res) || {}
        const list = Array.isArray(payload) ? payload : (payload.list || [])
        pagedRecords.value = list.map((item) => normalizeEntry(item))
        total.value = Number(payload.total ?? pagedRecords.value.length ?? 0)
      } catch (error) {
        console.error(error)
        alert('经验列表加载失败')
      } finally {
        loading.value = false
      }
    }

    const refreshHighlights = async () => {
      try {
        const res = await getKnowledgeHighlights({ size: HIGHLIGHT_SIZE })
        const payload = unwrapData(res) || []
        featuredEntries.value = (Array.isArray(payload) ? payload : (payload.list || [])).map((item) => normalizeEntry(item))
      } catch (error) {
        console.error(error)
        alert('推荐经验加载失败')
      }
    }

    const loadPage = async () => {
      loading.value = true
      try {
        const [listRes, highlightRes] = await Promise.all([
          listKnowledgeEntries({
            pageNo: query.pageNo,
            pageSize: query.pageSize
          }),
          getKnowledgeHighlights({ size: HIGHLIGHT_SIZE })
        ])
        const listPayload = unwrapData(listRes) || {}
        const list = Array.isArray(listPayload) ? listPayload : (listPayload.list || [])
        pagedRecords.value = list.map((item) => normalizeEntry(item))
        total.value = Number(listPayload.total ?? pagedRecords.value.length ?? 0)
        const highlightPayload = unwrapData(highlightRes) || []
        featuredEntries.value = (Array.isArray(highlightPayload) ? highlightPayload : (highlightPayload.list || []))
          .map((item) => normalizeEntry(item))
      } catch (error) {
        console.error(error)
        alert('经验库数据加载失败')
      } finally {
        loading.value = false
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

    const resetForm = () => {
      Object.assign(form, {
        title: '',
        category: CATEGORY_OPTIONS[0],
        scenario: '',
        source: '',
        tagsText: '',
        summary: '',
        content: ''
      })
    }

    const fillForm = (item) => {
      Object.assign(form, {
        title: item.title || '',
        category: item.category || CATEGORY_OPTIONS[0],
        scenario: item.scenario || '',
        source: item.source || '',
        tagsText: (item.tags || []).join(', '),
        summary: item.summary || '',
        content: item.content || ''
      })
    }

    const openCreateDialog = () => {
      editMode.value = 'create'
      editingId.value = null
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
      if (submitting.value) {
        return
      }
      const payload = {
        title: form.title,
        category: form.category,
        scenario: form.scenario,
        source: form.source || null,
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
        closeEditDialog()
        await loadPage()
      } catch (error) {
        console.error(error)
        alert('保存经验失败')
      } finally {
        submitting.value = false
      }
    }

    const removeEntry = async (item) => {
      if (!window.confirm(`确认删除【${item.title}】吗？`)) {
        return
      }
      try {
        await deleteKnowledgeEntry(item.id)
        const nextTotal = Math.max(0, total.value - 1)
        const maxPage = Math.max(1, Math.ceil(nextTotal / query.pageSize) || 1)
        if (query.pageNo > maxPage) {
          query.pageNo = maxPage
        }
        await loadPage()
      } catch (error) {
        console.error(error)
        alert('删除经验失败')
      }
    }

    const openDetailDialog = async (item) => {
      showDetailDialog.value = true
      detailLoading.value = true
      try {
        const res = await getKnowledgeEntryDetail(item.id)
        activeDetail.value = normalizeEntry(unwrapData(res) || item)
      } catch (error) {
        console.error(error)
        activeDetail.value = normalizeEntry(item)
      } finally {
        detailLoading.value = false
      }
    }

    const closeDetailDialog = () => {
      if (detailLoading.value) {
        return
      }
      showDetailDialog.value = false
      activeDetail.value = null
    }

    const goBack = () => {
      router.push('/home')
    }

    onMounted(() => {
      loadPage()
    })

    return {
      loading,
      submitting,
      detailLoading,
      total,
      query,
      form,
      pagedRecords,
      featuredEntries,
      showEditDialog,
      showDetailDialog,
      activeDetail,
      editMode,
      pageSizeOptions,
      categoryOptions,
      totalPages,
      shortText,
      formatDate,
      buildTagText,
      goBack,
      refreshHighlights,
      loadEntries,
      handlePageSizeChange,
      changePage,
      openCreateDialog,
      openEditDialog,
      closeEditDialog,
      submitEditDialog,
      removeEntry,
      openDetailDialog,
      closeDetailDialog
    }
  }
}
</script>

<style scoped>
.knowledge-base-page {
  min-height: 100vh;
  height: 100%;
  overflow: auto;
  box-sizing: border-box;
  padding: 14px 18px 20px;
  color: #edf4ff;
}

.page-nav {
  margin-bottom: 12px;
}

.back-home-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  padding: 10px 16px;
  color: #f8fbff;
  background: rgba(12, 32, 52, 0.58);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(12px);
  cursor: pointer;
}

.back-home-icon {
  font-size: 18px;
}

.hero-panel,
.panel-section {
  background: linear-gradient(135deg, rgba(7, 22, 39, 0.82), rgba(17, 49, 73, 0.72));
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 24px;
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(16px);
}

.hero-panel {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  margin-bottom: 14px;
}

.page-title {
  margin: 0;
  font-size: 30px;
}

.page-subtitle,
.panel-tip,
.dialog-subtitle,
.banner-summary,
.mobile-card-summary,
.title-cell p {
  margin: 8px 0 0;
  color: #9db3c8;
  line-height: 1.6;
}

.hero-tags,
.toolbar-left,
.tag-row,
.row-actions,
.dialog-actions,
.pager,
.pager-left,
.pager-right,
.form-inline-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.hero-tag,
.category-chip,
.tag-chip,
.mini-btn,
.ghost-btn,
.action-btn {
  border-radius: 999px;
  border: none;
}

.hero-tag,
.category-chip,
.tag-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 14px;
  font-size: 13px;
}

.hero-tag {
  background: rgba(56, 189, 248, 0.16);
  color: #bfe8ff;
}

.category-chip {
  background: rgba(250, 204, 21, 0.14);
  color: #fde68a;
}

.category-chip.subtle {
  background: rgba(255, 255, 255, 0.08);
  color: #c9d8e8;
}

.tag-chip {
  background: rgba(16, 185, 129, 0.14);
  color: #a7f3d0;
}

.panel-section {
  padding: 18px;
  margin-bottom: 14px;
}

.panel-head,
.banner-card-top,
.banner-foot,
.mobile-card-head,
.detail-head,
.detail-hero {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.panel-head {
  align-items: flex-start;
  margin-bottom: 14px;
}

.panel-title {
  margin: 0;
  font-size: 20px;
}

.banner-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.banner-card,
.mobile-card,
.dialog {
  background: rgba(10, 26, 42, 0.74);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 22px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.banner-card {
  padding: 16px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.banner-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 35px rgba(0, 0, 0, 0.18);
}

.banner-date,
.banner-scene,
.empty-state,
.mobile-card-grid span,
.detail-meta span {
  color: #8ea6bf;
}

.banner-title,
.mobile-card-title,
.detail-title {
  margin: 10px 0 8px;
  font-size: 20px;
}

.banner-foot {
  align-items: center;
  margin-top: 12px;
}

.desktop-table {
  overflow-x: auto;
}

.entry-table {
  width: 100%;
  border-collapse: collapse;
}

.entry-table th,
.entry-table td {
  padding: 12px 10px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
  text-align: left;
  vertical-align: top;
}

.entry-table th {
  color: #9db3c8;
  font-weight: 600;
}

.title-cell strong {
  display: block;
  font-size: 16px;
}

.mobile-list {
  display: none;
}

.mobile-card {
  padding: 14px 16px;
  margin-bottom: 12px;
}

.mobile-card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 10px 0;
}

.mobile-card-grid p,
.detail-meta p {
  margin: 0;
}

.mobile-card-grid strong,
.detail-meta strong {
  display: block;
  margin-top: 4px;
  color: #f3f8ff;
}

.mobile-card-grid .wide {
  grid-column: 1 / -1;
}

.pager {
  align-items: center;
  justify-content: space-between;
  margin-top: 14px;
}

.pager-select,
.input {
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 14px;
  padding: 10px 12px;
  background: rgba(8, 21, 35, 0.82);
  color: #edf4ff;
}

.ghost-btn,
.action-btn,
.mini-btn {
  padding: 9px 14px;
  cursor: pointer;
}

.ghost-btn {
  background: rgba(255, 255, 255, 0.08);
  color: #dbe8f5;
}

.action-btn {
  background: linear-gradient(135deg, #1996ff, #27d5a4);
  color: #fff;
}

.mini-btn {
  padding: 7px 12px;
  background: rgba(255, 255, 255, 0.08);
  color: #dbe8f5;
}

.mini-btn.danger {
  background: #fee2e2;
  color: #b42318;
}

.dialog-mask {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.42);
  z-index: 90;
}

.dialog {
  width: min(820px, 100%);
  max-height: 92vh;
  overflow: auto;
  padding: 20px;
  color: #edf4ff;
  background: linear-gradient(135deg, rgba(8, 20, 34, 0.96), rgba(15, 37, 58, 0.94));
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 28px 80px rgba(0, 0, 0, 0.32);
}

.detail-dialog {
  width: min(900px, 100%);
}

.dialog-title {
  margin: 0;
  font-size: 22px;
}

.dialog-form {
  display: grid;
  gap: 12px;
  margin-top: 12px;
}

.form-inline-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.form-field {
  display: grid;
  gap: 8px;
  font-size: 14px;
  color: #c9d8e8;
}

.textarea {
  resize: vertical;
  min-height: 96px;
}

.detail-content {
  display: grid;
  gap: 14px;
}

.detail-tag-row {
  margin-bottom: 8px;
}

.detail-summary {
  margin: 0;
  font-size: 16px;
  line-height: 1.8;
  color: #d6e4f2;
}

.detail-meta {
  min-width: 220px;
  display: grid;
  gap: 12px;
}

.detail-body {
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(7, 18, 31, 0.76);
}

.detail-body h4 {
  margin: 0 0 12px;
}

.detail-body p {
  margin: 0;
  line-height: 1.9;
  white-space: pre-wrap;
}

.dialog-close {
  border: none;
  background: transparent;
  color: #c9d8e8;
  font-size: 22px;
  cursor: pointer;
}

.empty-state {
  padding: 18px 0;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 1024px) {
  .banner-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .knowledge-base-page {
    padding: 14px 12px 20px;
  }

  .hero-panel,
  .panel-head,
  .detail-head,
  .detail-hero {
    flex-direction: column;
  }

  .desktop-table {
    display: none;
  }

  .mobile-list {
    display: block;
  }

  .banner-grid,
  .form-inline-grid {
    grid-template-columns: 1fr;
  }

  .pager {
    flex-direction: column;
    align-items: flex-start;
  }

  .dialog {
    padding: 18px;
  }
}
</style>
