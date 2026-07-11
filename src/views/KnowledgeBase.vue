<template>
  <div class="knowledge-base-page">
    <div class="page-nav">
      <button type="button" class="back-home-btn" @click="goBack">
        <span class="back-home-icon">←</span>
        <span>返回桌面</span>
      </button>
    </div>

    <section class="hero-panel">
      <div class="hero-copy">
        <p class="eyebrow">Public Knowledge Desk</p>
        <h1 class="page-title">经验库</h1>
        <p class="page-subtitle">
          已发布经验默认对所有登录用户可见。普通用户提交后进入待审核队列，管理员审核通过后才会进入公共经验库。
        </p>
      </div>
      <div class="hero-stats">
        <span class="hero-chip">公共条目 {{ publishedTotal }}</span>
        <span class="hero-chip">推荐 {{ highlightEntries.length }}</span>
        <span class="hero-chip" :class="isAdmin ? 'hero-chip-admin' : 'hero-chip-user'">
          {{ isAdmin ? '管理员审核视图' : '投稿审核制' }}
        </span>
      </div>
    </section>

    <p v-if="pageMessage.text" class="page-message" :class="`page-message-${pageMessage.tone}`">
      {{ pageMessage.text }}
    </p>

    <section class="panel-section compact-section">
      <div class="panel-head">
        <div>
          <h2 class="panel-title">今日精选经验</h2>
          <p class="panel-tip">登录页短句会从这里随机抽取已发布经验。</p>
        </div>
        <button class="ghost-btn" :disabled="highlightLoading" @click="loadHighlights">
          {{ highlightLoading ? '切换中...' : '换一组' }}
        </button>
      </div>

      <div v-if="highlightLoading && !highlightEntries.length" class="empty-state">加载推荐中...</div>
      <div v-else-if="highlightEntries.length" class="highlight-strip">
        <button
          v-for="item in highlightEntries"
          :key="item.id"
          type="button"
          class="highlight-pill"
          @click="openDetailDialog(item)"
        >
          <span class="highlight-pill-title">{{ item.title }}</span>
          <span class="highlight-pill-summary">{{ shortText(item.summary, 38) }}</span>
        </button>
      </div>
      <div v-else class="empty-state">暂无已发布经验，登录页暂不会展示经验短句。</div>
    </section>

    <section class="panel-section">
      <div class="panel-head">
        <div>
          <h2 class="panel-title">公共经验库</h2>
          <p class="panel-tip">所有登录用户都能浏览这里的已发布条目。普通用户的新增会先进入待审核队列。</p>
        </div>
        <div class="panel-actions">
          <button class="action-btn" :disabled="submitting" @click="openCreateDialog">
            {{ isAdmin ? '新增并发布' : '投稿经验' }}
          </button>
          <button class="ghost-btn" :disabled="publishedLoading" @click="loadPublishedEntries">
            {{ publishedLoading ? '刷新中...' : '刷新公共库' }}
          </button>
        </div>
      </div>

      <div v-if="publishedLoading && !publishedEntries.length" class="empty-state">公共经验加载中...</div>
      <template v-else>
        <div v-if="publishedEntries.length" class="entry-list">
          <article v-for="item in publishedEntries" :key="item.id" class="entry-row">
            <div class="entry-row-main">
              <div class="entry-row-title">
                <h3 class="entry-title">{{ item.title }}</h3>
                <span class="status-chip status-chip-published">已发布</span>
              </div>
              <p class="entry-summary">{{ shortText(item.summary, 116) }}</p>
              <div class="entry-row-meta">
                <span>{{ item.category || '未分类' }}</span>
                <span>{{ item.scenario || '通用场景' }}</span>
                <span>{{ item.source || '未标注来源' }}</span>
                <span>{{ formatDate(item.updatedAt || item.createdAt) }}</span>
              </div>
            </div>
            <div class="entry-row-tags">
              <span v-for="tag in (item.tags || []).slice(0, 3)" :key="`${item.id}-${tag}`" class="tag-chip">{{ tag }}</span>
            </div>
            <div class="row-actions row-actions-fixed">
              <button class="mini-btn" @click="openDetailDialog(item)">查看详情</button>
              <button v-if="canEdit(item)" class="mini-btn" @click="openEditDialog(item)">编辑</button>
              <button v-if="canDelete(item)" class="mini-btn danger" @click="removeEntry(item)">删除</button>
            </div>
          </article>
        </div>
        <div v-else class="empty-state">当前还没有已发布经验。</div>
      </template>
    </section>

    <section class="panel-section">
      <div class="panel-head">
        <div>
          <h2 class="panel-title">我的投稿</h2>
          <p class="panel-tip">这里会保留你提交过的待审核、已驳回和已发布条目，方便继续补充和修改。</p>
        </div>
        <button class="ghost-btn" :disabled="submissionLoading" @click="loadMySubmissions">
          {{ submissionLoading ? '刷新中...' : '刷新投稿' }}
        </button>
      </div>

      <div v-if="submissionLoading && !mySubmissionEntries.length" class="empty-state">投稿记录加载中...</div>
      <div v-else-if="mySubmissionEntries.length" class="entry-list">
        <article v-for="item in mySubmissionEntries" :key="item.id" class="entry-row">
          <div class="entry-row-main">
            <div class="entry-row-title">
              <h3 class="entry-title">{{ item.title }}</h3>
              <span class="status-chip" :class="`status-chip-${statusMeta(item.status).tone}`">
                {{ statusMeta(item.status).label }}
              </span>
            </div>
            <p class="entry-summary">{{ shortText(item.summary, 108) }}</p>
            <div class="entry-row-meta">
              <span>{{ item.category || '未分类' }}</span>
              <span>{{ item.scenario || '通用场景' }}</span>
              <span>{{ formatDate(item.updatedAt || item.createdAt) }}</span>
              <span>审核备注：{{ shortText(item.reviewRemark || '暂无', 24) }}</span>
            </div>
          </div>
          <div class="row-actions row-actions-fixed">
            <button class="mini-btn" @click="openDetailDialog(item)">查看详情</button>
            <button v-if="canEdit(item)" class="mini-btn" @click="openEditDialog(item)">继续修改</button>
            <button v-if="canDelete(item)" class="mini-btn danger" @click="removeEntry(item)">删除投稿</button>
          </div>
        </article>
      </div>
      <div v-else class="empty-state">你还没有提交过经验。</div>
    </section>

    <section v-if="isAdmin" class="panel-section admin-panel">
      <div class="panel-head">
        <div>
          <h2 class="panel-title">待审核投稿</h2>
          <p class="panel-tip">管理员可以在这里快速看待审核内容，审核动作也支持在详情弹层中处理。</p>
        </div>
        <button class="ghost-btn" :disabled="pendingLoading" @click="loadPendingReview">
          {{ pendingLoading ? '刷新中...' : '刷新待审核' }}
        </button>
      </div>

      <div v-if="pendingLoading && !pendingEntries.length" class="empty-state">待审核列表加载中...</div>
      <div v-else-if="pendingEntries.length" class="entry-list">
        <article v-for="item in pendingEntries" :key="item.id" class="entry-row">
          <div class="entry-row-main">
            <div class="entry-row-title">
              <h3 class="entry-title">{{ item.title }}</h3>
              <span class="status-chip status-chip-pending">待审核</span>
            </div>
            <p class="entry-summary">{{ shortText(item.summary, 112) }}</p>
            <div class="entry-row-meta">
              <span>投稿人 ID：{{ item.ownerUserId || '-' }}</span>
              <span>{{ item.category || '未分类' }}</span>
              <span>{{ item.scenario || '通用场景' }}</span>
              <span>{{ formatDate(item.updatedAt || item.createdAt) }}</span>
            </div>
          </div>
          <div class="row-actions row-actions-fixed">
            <button class="mini-btn" @click="openDetailDialog(item)">查看详情</button>
            <button class="mini-btn approve" :disabled="reviewSubmitting" @click="reviewEntry(item, 'publish')">通过发布</button>
            <button class="mini-btn danger" :disabled="reviewSubmitting" @click="reviewEntry(item, 'reject')">驳回</button>
          </div>
        </article>
      </div>
      <div v-else class="empty-state">当前没有待审核投稿。</div>
    </section>

    <MacDialog
      v-model="showEditDialog"
      :title="editMode === 'create' ? (isAdmin ? '新增公共经验' : '投稿经验') : '编辑经验'"
      :subtitle="isAdmin ? '管理员新增后会直接发布。' : '普通用户提交后会进入待审核队列。'"
      width="820px"
      panel-class="knowledge-entry-dialog"
      :close-disabled="submitting"
      @cancel="closeEditDialog"
    >
        <form id="knowledge-entry-dialog-form" class="dialog-form" @submit.prevent="submitEditDialog">
          <div class="form-grid">
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

          <div class="form-grid">
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
            <span>摘要</span>
            <textarea v-model.trim="form.summary" class="input textarea" rows="3" maxlength="180" required />
          </label>

          <label class="form-field">
            <span>详细内容</span>
            <textarea v-model.trim="form.content" class="input textarea content-textarea" rows="9" maxlength="2000" required />
          </label>

        </form>
        <template #footer>
          <button form="knowledge-entry-dialog-form" type="submit" class="action-btn" :disabled="submitting">
            {{ submitting ? '提交中...' : (editMode === 'create' ? (isAdmin ? '保存并发布' : '提交投稿') : '保存修改') }}
          </button>
        </template>
    </MacDialog>

    <MacDialog
      v-model="showDetailDialog"
      title="经验详情"
      subtitle="公共库、投稿状态和审核备注都在这里完整展示。"
      width="900px"
      panel-class="knowledge-entry-detail-dialog"
      :close-disabled="detailLoading || reviewSubmitting"
      @cancel="closeDetailDialog"
    >
      <div class="detail-dialog">
        <div v-if="detailLoading" class="empty-state">详情加载中...</div>
        <div v-else-if="activeDetail" class="detail-content">
          <div class="detail-hero">
            <div class="detail-main">
              <div class="tag-row">
                <span class="status-chip" :class="`status-chip-${statusMeta(activeDetail.status).tone}`">
                  {{ statusMeta(activeDetail.status).label }}
                </span>
                <span class="meta-chip">{{ activeDetail.category || '未分类' }}</span>
                <span v-for="tag in activeDetail.tags" :key="`detail-${tag}`" class="tag-chip">{{ tag }}</span>
              </div>
              <h3 class="detail-title">{{ activeDetail.title }}</h3>
              <p class="detail-summary">{{ activeDetail.summary }}</p>
            </div>
            <div class="detail-meta">
              <p><span>投稿人 ID</span><strong>{{ activeDetail.ownerUserId || '-' }}</strong></p>
              <p><span>适用场景</span><strong>{{ activeDetail.scenario || '-' }}</strong></p>
              <p><span>来源</span><strong>{{ activeDetail.source || '-' }}</strong></p>
              <p><span>创建时间</span><strong>{{ formatDate(activeDetail.createdAt) }}</strong></p>
              <p><span>更新时间</span><strong>{{ formatDate(activeDetail.updatedAt || activeDetail.createdAt) }}</strong></p>
              <p><span>审核备注</span><strong>{{ activeDetail.reviewRemark || '暂无' }}</strong></p>
            </div>
          </div>

          <div class="detail-body">
            <h4>详细内容</h4>
            <p>{{ activeDetail.content || '-' }}</p>
          </div>

          <div v-if="isAdmin && activeDetail.status === 'PENDING'" class="review-box">
            <label class="form-field">
              <span>审核备注</span>
              <textarea v-model.trim="reviewForm.reviewRemark" class="input textarea" rows="3" maxlength="200" placeholder="可选，给投稿人留下审核意见" />
            </label>
            <div class="dialog-actions">
              <button class="mini-btn approve" :disabled="reviewSubmitting" @click="reviewEntry(activeDetail, 'publish')">
                {{ reviewSubmitting ? '处理中...' : '通过发布' }}
              </button>
              <button class="mini-btn danger" :disabled="reviewSubmitting" @click="reviewEntry(activeDetail, 'reject')">
                {{ reviewSubmitting ? '处理中...' : '驳回投稿' }}
              </button>
            </div>
          </div>

        </div>
        <div v-else class="empty-state">未找到经验详情。</div>
      </div>
      <template #footer>
        <button v-if="activeDetail && canEdit(activeDetail)" type="button" class="action-btn" @click="openEditDialog(activeDetail)">编辑当前条目</button>
      </template>
    </MacDialog>
  </div>
</template>

<script>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import MacDialog from '@/components/MacDialog.vue'
import {
  createKnowledgeEntry,
  deleteKnowledgeEntry,
  getKnowledgeEntryDetail,
  getKnowledgeHighlights,
  listKnowledgeEntries,
  publishKnowledgeEntry,
  rejectKnowledgeEntry,
  updateKnowledgeEntry
} from '@/api/knowledgeBase'
import { readAuthState } from '@/utils/authStorage'
import {
  canDeleteKnowledgeEntry,
  canEditKnowledgeEntry,
  getKnowledgeStatusMeta,
  isKnowledgeAdmin,
  KNOWLEDGE_VIEW,
  normalizeCurrentUser,
  normalizeKnowledgeEntry,
  normalizeKnowledgeTags
} from '@/utils/knowledgeBaseAccess'

const CATEGORY_OPTIONS = ['工作', '生活', '学习', '工具', '健康', '财务', '其他']
const HIGHLIGHT_SIZE = 4
const PUBLIC_PAGE_SIZE = 12
const SUBMISSION_PAGE_SIZE = 20
const REVIEW_PAGE_SIZE = 20

function unwrapData(res) {
  const payload = res?.data
  if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data
  }
  return payload
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
  components: {MacDialog},
  setup() {
    const router = useRouter()
    const currentUser = ref(normalizeCurrentUser(readAuthState(localStorage).user || {}))
    const isAdmin = computed(() => isKnowledgeAdmin(currentUser.value))

    const pageMessage = reactive({
      text: '',
      tone: 'info'
    })

    const publishedLoading = ref(false)
    const highlightLoading = ref(false)
    const submissionLoading = ref(false)
    const pendingLoading = ref(false)
    const detailLoading = ref(false)
    const submitting = ref(false)
    const reviewSubmitting = ref(false)

    const publishedEntries = ref([])
    const mySubmissionEntries = ref([])
    const pendingEntries = ref([])
    const highlightEntries = ref([])
    const publishedTotal = ref(0)

    const showEditDialog = ref(false)
    const showDetailDialog = ref(false)
    const editMode = ref('create')
    const editingId = ref(null)
    const activeDetail = ref(null)

    const form = reactive({
      title: '',
      category: CATEGORY_OPTIONS[0],
      scenario: '',
      source: '',
      tagsText: '',
      summary: '',
      content: ''
    })

    const reviewForm = reactive({
      reviewRemark: ''
    })

    const categoryOptions = CATEGORY_OPTIONS

    const formatDate = (value) => {
      if (!value) {
        return '-'
      }
      return `${value}`.replace('T', ' ').slice(0, 16)
    }

    const showMessage = (text, tone = 'info') => {
      pageMessage.text = text
      pageMessage.tone = tone
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

    const loadPublishedEntries = async () => {
      publishedLoading.value = true
      try {
        const res = await listKnowledgeEntries({
          view: KNOWLEDGE_VIEW.PUBLISHED,
          pageNo: 1,
          pageSize: PUBLIC_PAGE_SIZE
        })
        const payload = unwrapData(res) || {}
        const list = Array.isArray(payload) ? payload : (payload.list || [])
        publishedEntries.value = list.map((item) => normalizeKnowledgeEntry(item))
        publishedTotal.value = Number(payload.total ?? publishedEntries.value.length ?? 0)
      } catch (error) {
        console.error(error)
        showMessage('公共经验库加载失败，请稍后重试', 'danger')
      } finally {
        publishedLoading.value = false
      }
    }

    const loadHighlights = async () => {
      highlightLoading.value = true
      try {
        const res = await getKnowledgeHighlights({ size: HIGHLIGHT_SIZE })
        const payload = unwrapData(res) || []
        const list = Array.isArray(payload) ? payload : (payload.list || [])
        highlightEntries.value = list.map((item) => normalizeKnowledgeEntry(item))
      } catch (error) {
        console.error(error)
        highlightEntries.value = []
        showMessage('经验推荐加载失败，登录页将暂时不展示经验短句', 'warning')
      } finally {
        highlightLoading.value = false
      }
    }

    const loadMySubmissions = async () => {
      submissionLoading.value = true
      try {
        const res = await listKnowledgeEntries({
          view: KNOWLEDGE_VIEW.MY_SUBMISSIONS,
          pageNo: 1,
          pageSize: SUBMISSION_PAGE_SIZE
        })
        const payload = unwrapData(res) || {}
        const list = Array.isArray(payload) ? payload : (payload.list || [])
        mySubmissionEntries.value = list.map((item) => normalizeKnowledgeEntry(item))
      } catch (error) {
        console.error(error)
        showMessage('我的投稿加载失败，请稍后重试', 'danger')
      } finally {
        submissionLoading.value = false
      }
    }

    const loadPendingReview = async () => {
      if (!isAdmin.value) {
        pendingEntries.value = []
        return
      }
      pendingLoading.value = true
      try {
        const res = await listKnowledgeEntries({
          view: KNOWLEDGE_VIEW.PENDING_REVIEW,
          pageNo: 1,
          pageSize: REVIEW_PAGE_SIZE
        })
        const payload = unwrapData(res) || {}
        const list = Array.isArray(payload) ? payload : (payload.list || [])
        pendingEntries.value = list.map((item) => normalizeKnowledgeEntry(item))
      } catch (error) {
        console.error(error)
        showMessage('待审核投稿加载失败，请稍后重试', 'danger')
      } finally {
        pendingLoading.value = false
      }
    }

    const reloadAll = async () => {
      await Promise.all([
        loadPublishedEntries(),
        loadHighlights(),
        loadMySubmissions(),
        isAdmin.value ? loadPendingReview() : Promise.resolve()
      ])
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

    const completeEditDialog = () => {
      showEditDialog.value = false
      resetForm()
    }

    const closeEditDialog = () => {
      if (submitting.value) {
        return
      }
      completeEditDialog()
    }

    const submitEditDialog = async () => {
      if (submitting.value) {
        return
      }
      submitting.value = true
      try {
        const payload = {
          title: form.title,
          category: form.category,
          scenario: form.scenario,
          source: form.source || null,
          tags: normalizeKnowledgeTags(form.tagsText),
          summary: form.summary,
          content: form.content
        }
        if (editMode.value === 'create') {
          await createKnowledgeEntry(payload)
          showMessage(isAdmin.value ? '公共经验已发布' : '投稿已提交，等待管理员审核', 'success')
        } else {
          await updateKnowledgeEntry(editingId.value, payload)
          showMessage(isAdmin.value ? '经验已更新' : '投稿修改已保存，并重新进入待审核', 'success')
        }
        completeEditDialog()
        await reloadAll()
      } catch (error) {
        console.error(error)
        showMessage('保存经验失败，请检查后重试', 'danger')
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
        showMessage('经验已删除', 'success')
        if (activeDetail.value?.id === item.id) {
          closeDetailDialog()
        }
        await reloadAll()
      } catch (error) {
        console.error(error)
        showMessage('删除经验失败，请稍后重试', 'danger')
      }
    }

    const openDetailDialog = async (item) => {
      showDetailDialog.value = true
      detailLoading.value = true
      reviewForm.reviewRemark = item.reviewRemark || ''
      try {
        const res = await getKnowledgeEntryDetail(item.id)
        activeDetail.value = normalizeKnowledgeEntry(unwrapData(res) || item)
        reviewForm.reviewRemark = activeDetail.value.reviewRemark || ''
      } catch (error) {
        console.error(error)
        activeDetail.value = normalizeKnowledgeEntry(item)
      } finally {
        detailLoading.value = false
      }
    }

    const closeDetailDialog = () => {
      if (detailLoading.value || reviewSubmitting.value) {
        return
      }
      showDetailDialog.value = false
      activeDetail.value = null
      reviewForm.reviewRemark = ''
    }

    const reviewEntry = async (item, action) => {
      if (reviewSubmitting.value) {
        return
      }
      reviewSubmitting.value = true
      try {
        const payload = { reviewRemark: reviewForm.reviewRemark || '' }
        if (action === 'publish') {
          await publishKnowledgeEntry(item.id, payload)
          showMessage('投稿已发布到公共经验库', 'success')
        } else {
          await rejectKnowledgeEntry(item.id, payload)
          showMessage('投稿已驳回，投稿人可继续修改', 'warning')
        }
        if (activeDetail.value?.id === item.id) {
          // 审核成功属于内部完成流程，不受用户交互关闭锁影响。
          showDetailDialog.value = false
          activeDetail.value = null
          reviewForm.reviewRemark = ''
        }
        await reloadAll()
      } catch (error) {
        console.error(error)
        showMessage('审核操作失败，请稍后重试', 'danger')
      } finally {
        reviewSubmitting.value = false
      }
    }

    const canEdit = (item) => canEditKnowledgeEntry(item, currentUser.value)
    const canDelete = (item) => canDeleteKnowledgeEntry(item, currentUser.value)
    const statusMeta = (status) => getKnowledgeStatusMeta(status)
    const goBack = () => router.push('/home')

    onMounted(() => {
      reloadAll()
    })

    return {
      isAdmin,
      pageMessage,
      publishedLoading,
      highlightLoading,
      submissionLoading,
      pendingLoading,
      detailLoading,
      submitting,
      reviewSubmitting,
      publishedEntries,
      mySubmissionEntries,
      pendingEntries,
      highlightEntries,
      publishedTotal,
      showEditDialog,
      showDetailDialog,
      editMode,
      activeDetail,
      form,
      reviewForm,
      categoryOptions,
      shortText,
      formatDate,
      statusMeta,
      canEdit,
      canDelete,
      goBack,
      openCreateDialog,
      openEditDialog,
      closeEditDialog,
      submitEditDialog,
      removeEntry,
      openDetailDialog,
      closeDetailDialog,
      loadHighlights,
      loadPublishedEntries,
      loadMySubmissions,
      loadPendingReview,
      reviewEntry
    }
  }
}
</script>

<style scoped>
.knowledge-base-page {
  min-height: 100vh;
  height: 100%;
  overflow: auto;
  padding: 16px 18px 28px;
  color: #eff6ff;
  background:
    radial-gradient(circle at top left, rgba(56, 189, 248, 0.1), transparent 26%),
    radial-gradient(circle at top right, rgba(251, 191, 36, 0.1), transparent 24%);
}

.page-nav {
  margin-bottom: 12px;
}

.back-home-btn,
.ghost-btn,
.action-btn,
.mini-btn {
  border: none;
  cursor: pointer;
}

.back-home-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 16px;
  border-radius: 999px;
  color: #f8fbff;
  background: rgba(10, 28, 48, 0.74);
  border: 1px solid rgba(148, 163, 184, 0.18);
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.16);
}

.hero-panel,
.panel-section {
  border-radius: 26px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  background: linear-gradient(145deg, rgba(8, 22, 38, 0.88), rgba(14, 37, 59, 0.76));
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(18px);
}

.hero-panel {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 18px 20px;
  margin-bottom: 12px;
}

.eyebrow {
  margin: 0 0 10px;
  font-size: 12px;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: #8fd6ff;
}

.page-title,
.panel-title,
.detail-title {
  margin: 0;
}

.page-title {
  font-size: 28px;
}

.page-subtitle,
.panel-tip,
.highlight-summary,
.entry-summary,
.detail-summary,
.detail-body p {
  margin: 8px 0 0;
  line-height: 1.65;
  color: #a3b8cc;
}

.page-subtitle {
  max-width: 760px;
}

.hero-stats,
.panel-actions,
.row-actions,
.dialog-actions,
.tag-row,
.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.hero-stats {
  align-items: center;
  justify-content: flex-end;
}

.hero-chip,
.status-chip,
.meta-chip,
.tag-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 13px;
}

.hero-chip {
  min-height: 42px;
  background: rgba(191, 219, 254, 0.12);
  color: #dbeafe;
}

.hero-chip-admin {
  background: rgba(251, 191, 36, 0.14);
  color: #fde68a;
}

.hero-chip-user {
  background: rgba(34, 197, 94, 0.14);
  color: #bbf7d0;
}

.page-message {
  margin: 0 0 14px;
  padding: 12px 16px;
  border-radius: 18px;
  font-size: 14px;
  border: 1px solid transparent;
}

.page-message-info {
  color: #dbeafe;
  background: rgba(59, 130, 246, 0.12);
  border-color: rgba(96, 165, 250, 0.24);
}

.page-message-success {
  color: #d1fae5;
  background: rgba(34, 197, 94, 0.12);
  border-color: rgba(74, 222, 128, 0.24);
}

.page-message-warning {
  color: #fef3c7;
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(251, 191, 36, 0.24);
}

.page-message-danger {
  color: #fecaca;
  background: rgba(239, 68, 68, 0.12);
  border-color: rgba(248, 113, 113, 0.24);
}

.panel-section {
  margin-bottom: 12px;
  padding: 16px;
}

.compact-section {
  padding-bottom: 14px;
}

.panel-head,
.highlight-head,
.entry-card-head,
.submission-head,
.detail-hero {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.panel-head {
  align-items: flex-start;
  margin-bottom: 12px;
}

.panel-title {
  font-size: 19px;
}

.highlight-card,
.entry-card,
.submission-card,
.pending-card,
.review-box {
  border-radius: 22px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  background: rgba(6, 18, 31, 0.62);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.highlight-card,
.entry-card,
.submission-card,
.pending-card {
  padding: 18px;
}

.highlight-card {
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.highlight-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 32px rgba(0, 0, 0, 0.18);
}

.highlight-title,
.entry-title {
  margin: 0;
  font-size: 17px;
  line-height: 1.3;
}

.highlight-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.highlight-pill {
  min-width: 0;
  min-height: 58px;
  padding: 10px 12px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 16px;
  color: #eff6ff;
  text-align: left;
  cursor: pointer;
  background: rgba(6, 18, 31, 0.62);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.highlight-pill-title,
.highlight-pill-summary {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.highlight-pill-title {
  font-weight: 700;
}

.highlight-pill-summary {
  margin-top: 5px;
  font-size: 12px;
  color: #8ea4ba;
}

.entry-list {
  display: grid;
  gap: 8px;
}

.entry-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  background: rgba(6, 18, 31, 0.58);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.entry-row-main {
  min-width: 0;
}

.entry-row-title,
.entry-row-meta,
.entry-row-tags {
  display: flex;
  align-items: center;
  gap: 8px;
}

.entry-row-title {
  min-width: 0;
}

.entry-row-title .entry-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.entry-row-meta {
  flex-wrap: wrap;
  margin-top: 6px;
  color: #8ea4ba;
  font-size: 12px;
}

.entry-row-meta span:not(:last-child)::after {
  content: "/";
  margin-left: 8px;
  color: rgba(142, 164, 186, 0.62);
}

.entry-row-tags {
  max-width: 260px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.row-actions-fixed {
  flex-wrap: nowrap;
  justify-content: flex-end;
}

.entry-row .entry-summary {
  margin-top: 5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.date-text,
.owner-label {
  font-size: 13px;
  color: #8ea4ba;
}

.status-chip-published {
  color: #d1fae5;
  background: rgba(16, 185, 129, 0.14);
}

.status-chip-pending {
  color: #fef3c7;
  background: rgba(245, 158, 11, 0.14);
}

.status-chip-rejected {
  color: #fecaca;
  background: rgba(239, 68, 68, 0.14);
}

.meta-chip {
  background: rgba(255, 255, 255, 0.07);
  color: #dbeafe;
}

.tag-chip {
  background: rgba(56, 189, 248, 0.12);
  color: #bae6fd;
}

.entry-meta-grid,
.detail-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 16px;
  margin-top: 14px;
}

.entry-meta-grid p,
.detail-meta p {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.entry-meta-grid span,
.detail-meta span {
  font-size: 12px;
  color: #8ea4ba;
}

.entry-meta-grid strong,
.detail-meta strong {
  color: #f8fbff;
}

.submission-list {
  display: grid;
  gap: 12px;
}

.admin-panel {
  border-color: rgba(251, 191, 36, 0.24);
}

.ghost-btn,
.action-btn,
.mini-btn {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.ghost-btn:disabled,
.action-btn:disabled,
.mini-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.ghost-btn {
  padding: 10px 16px;
  border-radius: 999px;
  color: #dbeafe;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.action-btn,
.mini-btn.approve {
  color: #051521;
  background: linear-gradient(135deg, #facc15, #f59e0b);
}

.action-btn {
  padding: 11px 18px;
  border-radius: 999px;
  font-weight: 700;
}

.mini-btn {
  padding: 9px 14px;
  border-radius: 999px;
  color: #f8fbff;
  background: rgba(59, 130, 246, 0.14);
}

.mini-btn.danger {
  color: #fee2e2;
  background: rgba(239, 68, 68, 0.16);
}

.empty-state {
  padding: 22px 0 10px;
  color: #8ea4ba;
}

.dialog-form {
  margin-top: 18px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
}

.form-field span {
  color: #dbeafe;
  font-size: 14px;
}

.input {
  width: 100%;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 16px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.06);
  color: #f8fbff;
  outline: none;
}

.textarea {
  resize: vertical;
}

.content-textarea {
  min-height: 200px;
}

.detail-content {
  margin-top: 18px;
}

.detail-main {
  flex: 1;
}

.detail-body {
  margin-top: 18px;
  padding: 18px;
  border-radius: 20px;
  background: rgba(4, 15, 27, 0.56);
}

.detail-body h4 {
  margin: 0;
}

.review-box {
  margin-top: 18px;
  padding: 18px;
}

@media (max-width: 900px) {
  .hero-panel,
  .panel-head,
  .detail-hero {
    flex-direction: column;
  }

  .highlight-strip,
  .form-grid,
  .entry-meta-grid,
  .detail-meta {
    grid-template-columns: 1fr;
  }

  .entry-row {
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .entry-row-tags,
  .row-actions-fixed {
    justify-content: flex-start;
  }

  .entry-row-tags {
    max-width: none;
  }

  .dialog {
    padding: 18px;
  }
}

@media (max-width: 640px) {
  .knowledge-base-page {
    padding: 12px 12px 24px;
  }

  .panel-section,
  .hero-panel {
    padding: 12px;
    border-radius: 22px;
  }

  .page-title {
    font-size: 24px;
  }

  .highlight-title,
  .entry-title {
    font-size: 16px;
  }

  .hero-stats,
  .panel-actions {
    gap: 6px;
  }

  .entry-row {
    padding: 11px;
  }

  .entry-row-title {
    align-items: flex-start;
    flex-direction: column;
  }

  .entry-row-title .entry-title,
  .entry-row .entry-summary {
    white-space: normal;
  }

  .row-actions-fixed {
    flex-wrap: wrap;
  }
}
</style>
