<template>
  <main class="messages-page">
    <nav class="messages-nav"><RouterLink to="/home">← 返回桌面</RouterLink><RouterLink v-if="isAdmin" to="/system/messages">消息管理</RouterLink></nav>
    <header class="messages-heading"><div><span class="messages-eyebrow">INBOX</span><h1>消息中心</h1><p>与你有关的更新，都在这里。<span v-if="state.unreadCount">还有 {{ state.unreadCount }} 条未读消息。</span></p></div><button class="msg-button" :disabled="busy || !state.unreadCount" @click="readAll">全部标记已读</button></header>
    <p v-if="error" class="messages-error" role="alert">{{ error }} <button class="msg-button" @click="load">重试</button></p>
    <section class="messages-panel" aria-label="收件箱" :aria-busy="loading">
      <div class="messages-toolbar"><select v-model="filters.category" aria-label="消息分类" @change="search"><option value="">全部分类</option><option v-for="(label, value) in categoryLabels" :key="value" :value="value">{{ label }}</option></select><select v-model="filters.unread" aria-label="阅读状态" @change="search"><option value="">全部消息</option><option value="true">未读</option><option value="false">已读</option></select><button class="msg-button" :disabled="loading" @click="load">刷新</button></div>
      <p v-if="loading && !inbox.list.length" class="messages-empty">正在加载消息…</p>
      <p v-else-if="!inbox.list.length && !error" class="messages-empty">这里暂时没有消息<br>有新的通知时，我们会在右上角提醒你。</p>
      <ul class="messages-list"><li v-for="item in inbox.list" :key="item.id" class="messages-row" :class="{unread: !item.readAt}">
        <span v-if="!item.readAt" class="messages-unread-dot" aria-label="未读"></span><button class="messages-row-main" @click="openMessage(item.id)"><div class="messages-meta"><span>{{ categoryLabels[item.category] }}</span><span v-if="item.priority === 'IMPORTANT'" class="messages-important">重要</span></div><strong>{{ item.title }}</strong><p>{{ item.body }}</p><div class="messages-meta"><span>{{ sourceLabel(item.source) }}</span><time>{{ formatMessageTime(item.receivedAt) }}</time></div></button><button v-if="!item.readAt" class="msg-button" :disabled="busy" @click="read(item.id)">标记已读</button><span v-else class="messages-meta">已读</span>
      </li></ul>
      <footer class="messages-pagination"><span>共 {{ inbox.total }} 条 · 第 {{ page }} 页</span><button class="msg-button" :disabled="page === 1 || loading" @click="page--; load()">上一页</button><button class="msg-button" :disabled="page * 20 >= inbox.total || loading" @click="page++; load()">下一页</button></footer>
    </section>
    <MessageDetail :message="detail" @close="closeDetail"/>
  </main>
</template>
<script setup>
import {computed, ref, reactive, watch, onBeforeUnmount} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import MessageDetail from '../components/MessageDetail.vue'
import {readAuthState} from '../utils/authStorage'
import {listInbox, getInboxMessage, markMessageRead} from '../api/messages'
import {messageState as state, categoryLabels, sourceLabel, formatMessageTime, refreshMessages, readAllMessages} from '../features/messages/state'
import '../features/messages/messages.css'
const route = useRoute(), router = useRouter()
const isAdmin = computed(() => readAuthState().user?.roleCode?.toUpperCase() === 'ADMIN')
const inbox = reactive({list: [], total: 0}), filters = reactive({category: '', unread: ''})
const page = ref(1), loading = ref(false), busy = ref(false), error = ref(''), detail = ref(null)
let requestVersion = 0, detailVersion = 0, disposed = false
async function load() {
  const version = ++requestVersion
  loading.value = true
  try {
    const result = await listInbox({pageNo: page.value, pageSize: 20, category: filters.category || undefined, unread: filters.unread || undefined})
    if (version !== requestVersion || disposed) return
    Object.assign(inbox, result); error.value = ''
  } catch { if (version === requestVersion && !disposed) error.value = '消息加载失败，请稍后重试' }
  finally { if (version === requestVersion && !disposed) loading.value = false }
}
function search() { page.value = 1; load() }
async function read(id) {
  busy.value = true
  try { await markMessageRead(id); await Promise.all([load(), refreshMessages()]) }
  catch { error.value = '标记已读失败，请重试' } finally { busy.value = false }
}
async function readAll() {
  busy.value = true
  try { await readAllMessages(); await load() } catch { error.value = '标记已读失败，请重试' } finally { busy.value = false }
}
async function openMessage(id) {
  const version = ++detailVersion
  try {
    const result = await getInboxMessage(id)
    if (disposed || version !== detailVersion) return
    detail.value = result
    if (!result.readAt) await read(id)
  } catch { if (!disposed) error.value = '消息不存在或暂时无法打开' }
}
function closeDetail() { detailVersion++; detail.value = null; if (route.query.message) router.replace({path: '/messages'}) }
watch(() => route.query.message, id => { if (id) openMessage(id) }, {immediate: true})
watch(() => state.revision, load)
onBeforeUnmount(() => { disposed = true; requestVersion++; detailVersion++ })
load()
</script>
