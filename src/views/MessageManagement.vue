<template>
  <main class="messages-page">
    <nav class="messages-nav"><RouterLink to="/home">← 返回桌面</RouterLink><RouterLink to="/messages">我的消息</RouterLink></nav>
    <header class="messages-heading"><div><span class="messages-eyebrow">COMMUNICATIONS</span><h1>消息管理</h1><p>把需要知道的事，送到对的人面前。</p></div><div role="tablist" aria-label="消息管理视图"><button class="msg-button messages-tab" role="tab" :aria-selected="tab === 'compose'" @click="tab = 'compose'">发布消息</button> <button class="msg-button messages-tab" role="tab" :aria-selected="tab === 'history'" @click="tab = 'history'; loadHistory()">发送记录</button></div></header>
    <p v-if="error" class="messages-error" role="alert">{{ error }}</p><p v-if="success" class="messages-success" role="status">{{ success }}</p>
    <section v-if="tab === 'compose'" class="messages-panel">
      <form class="messages-compose" @submit.prevent="preview">
        <label>消息标题<input v-model="form.title" maxlength="120" required placeholder="用一句话说明这条消息" :disabled="sending"></label>
        <div class="messages-form-pair"><label>消息分类<select v-model="form.category" :disabled="sending"><option v-for="(label, value) in categoryLabels" :key="value" :value="value">{{ label }}</option></select></label><label>重要级别<select v-model="form.priority" :disabled="sending"><option value="NORMAL">普通</option><option value="IMPORTANT">重要</option></select></label></div>
        <label>正文<textarea v-model="form.body" maxlength="10000" required placeholder="写下完整内容，支持换行。" :disabled="sending"></textarea><span class="messages-meta">{{ form.body.length }} / 10000</span></label>
        <label>发送范围<select v-model="form.audience" :disabled="sending"><option value="USERS">指定用户</option><option value="ALL">全体有效用户</option></select></label>
        <div v-if="form.audience === 'USERS'" class="messages-recipient-picker">
          <div class="messages-toolbar"><input v-model="recipientSearch.keyword" aria-label="搜索接收用户" placeholder="搜索用户名或昵称" maxlength="80" @keydown.enter.prevent="searchUsers"><button type="button" class="msg-button" :disabled="usersLoading" @click="searchUsers">搜索用户</button></div>
          <div class="messages-chips"><button v-for="user in selectedUsers" :key="user.id" type="button" class="messages-chip" :disabled="sending" :aria-label="`移除${user.displayName || user.username}`" @click="selectedUsers = selectedUsers.filter(item => item.id !== user.id)">{{ user.displayName || user.username }} ×</button></div>
          <p v-if="usersLoading" class="messages-meta">正在加载用户…</p><p v-else-if="!options.list.length" class="messages-meta">没有匹配的有效用户</p>
          <div class="messages-recipient-options"><label v-for="user in options.list" :key="user.id"><input type="checkbox" :checked="selectedUsers.some(item => item.id === user.id)" :disabled="sending" @change="toggleUser(user, $event.target.checked)">{{ user.displayName || user.username }} <small>{{ user.username }}</small></label></div>
          <div class="messages-pagination"><span>已选 {{ selectedUsers.length }} 人 · 共 {{ options.total }} 人 · 第 {{ recipientSearch.pageNo }} 页</span><button type="button" class="msg-button" :disabled="recipientSearch.pageNo === 1 || usersLoading" @click="recipientSearch.pageNo--; loadUsers()">上一页</button><button type="button" class="msg-button" :disabled="recipientSearch.pageNo * 20 >= options.total || usersLoading" @click="recipientSearch.pageNo++; loadUsers()">下一页</button></div>
        </div>
        <p v-else class="messages-meta">按发送时的有效用户生成接收名单。之后新注册的用户不会收到这条消息。</p>
        <div class="messages-actions"><button class="msg-button primary" :disabled="sending">预览并发送 →</button></div>
      </form>
    </section>
    <section v-else class="messages-panel" :aria-busy="historyLoading">
      <div class="messages-toolbar"><select v-model="historyQuery.category" aria-label="发送记录分类" @change="historyQuery.pageNo = 1; loadHistory()"><option value="">全部分类</option><option v-for="(label, value) in categoryLabels" :key="value" :value="value">{{ label }}</option></select><button class="msg-button" :disabled="historyLoading" @click="loadHistory">刷新记录</button></div>
      <p v-if="!history.list.length" class="messages-empty">{{ historyLoading ? '正在加载发送记录…' : '还没有发送记录' }}</p>
      <ul class="messages-list"><li v-for="item in history.list" :key="item.id" class="messages-row"><button class="messages-row-main" @click="detail = item"><div class="messages-meta"><span>{{ categoryLabels[item.category] }}</span><span>{{ sourceLabel(item.source) }}</span><span v-if="item.priority === 'IMPORTANT'" class="messages-important">重要</span></div><strong>{{ item.title }}</strong><p>{{ item.body }}</p><div class="messages-meta"><span>{{ formatMessageTime(item.createdAt) }}</span><span>{{ item.audience === 'ALL' ? '全体用户' : '指定用户' }}</span></div></button><button class="msg-button" @click="showRecipients(item)">已读 {{ item.readCount }} / {{ item.recipientCount }} 人</button></li></ul>
      <footer class="messages-pagination"><span>共 {{ history.total }} 条 · 第 {{ historyQuery.pageNo }} 页</span><button class="msg-button" :disabled="historyQuery.pageNo === 1 || historyLoading" @click="historyQuery.pageNo--; loadHistory()">上一页</button><button class="msg-button" :disabled="historyQuery.pageNo * 20 >= history.total || historyLoading" @click="historyQuery.pageNo++; loadHistory()">下一页</button></footer>
    </section>
    <MacDialog v-model="previewOpen" title="确认发送消息" subtitle="请核对内容和接收范围，发送后无法修改或撤回。" width="640px" :close-disabled="sending">
      <template v-if="pending"><div class="messages-meta"><span>{{ categoryLabels[pending.category] }}</span><span>{{ pending.priority === 'IMPORTANT' ? '重要' : '普通' }}</span></div><h3>{{ pending.title }}</h3><p class="message-preview-body">{{ pending.body }}</p><p>接收范围：<strong>{{ pending.audience === 'ALL' ? '全体有效用户（以发送时为准）' : `${pending.userIds.length} 位指定用户` }}</strong></p><p v-if="pending.audience === 'USERS'" class="messages-meta">{{ pendingNames }}</p></template>
      <p v-if="sendError" class="messages-error" role="alert">{{ sendError }}</p>
      <template #footer><button class="msg-button" :disabled="sending" @click="previewOpen = false">返回编辑</button><button class="msg-button primary" :disabled="sending" @click="confirmSend">{{ sending ? '正在发送…' : '确认发送' }}</button></template>
    </MacDialog>
    <MacDialog :model-value="Boolean(recipientMessage)" :title="`阅读情况 · ${recipientMessage?.title || ''}`" width="700px" @update:model-value="value => {if (!value) recipientMessage = null}">
      <p v-if="recipientError" class="messages-error" role="alert">{{ recipientError }}</p><table class="messages-table"><thead><tr><th>接收用户</th><th>状态</th><th>阅读时间</th></tr></thead><tbody><tr v-for="user in recipients.list" :key="user.userId"><td>{{ user.displayName || user.username }}</td><td>{{ user.readAt ? '已读' : '未读' }}</td><td>{{ formatMessageTime(user.readAt) }}</td></tr></tbody></table><p v-if="!recipients.list.length" class="messages-meta">{{ recipientsLoading ? '正在加载…' : '暂无收件记录' }}</p>
      <template #footer><span class="messages-meta">共 {{ recipients.total }} 人 · 第 {{ recipientsPage }} 页</span><button class="msg-button" :disabled="recipientsPage === 1 || recipientsLoading" @click="recipientsPage--; loadRecipients()">上一页</button><button class="msg-button" :disabled="recipientsPage * 20 >= recipients.total || recipientsLoading" @click="recipientsPage++; loadRecipients()">下一页</button><button class="msg-button" :disabled="recipientsLoading" @click="loadRecipients">刷新</button></template>
    </MacDialog>
    <MessageDetail :message="detail" @close="detail = null"/>
  </main>
</template>
<script setup>
import {reactive, ref, onBeforeUnmount} from 'vue'
import {createMessageSendKey} from '../utils/messageStream'
import MacDialog from '../components/MacDialog.vue'
import MessageDetail from '../components/MessageDetail.vue'
import {sendMessage, listSentMessages, listRecipientOptions, listMessageRecipients} from '../api/messages'
import {categoryLabels, sourceLabel, formatMessageTime, refreshMessages} from '../features/messages/state'
import '../features/messages/messages.css'
const initialForm = () => ({title: '', body: '', category: 'ANNOUNCEMENT', priority: 'NORMAL', audience: 'USERS'})
const form = reactive(initialForm()), selectedUsers = ref([])
const tab = ref('compose'), error = ref(''), success = ref(''), sending = ref(false), previewOpen = ref(false), sendError = ref('')
const pending = ref(null), pendingNames = ref(''), detail = ref(null)
const options = reactive({list: [], total: 0}), recipientSearch = reactive({keyword: '', pageNo: 1}), usersLoading = ref(false)
const history = reactive({list: [], total: 0}), historyQuery = reactive({pageNo: 1, category: ''}), historyLoading = ref(false)
const recipientMessage = ref(null), recipients = reactive({list: [], total: 0}), recipientsPage = ref(1), recipientsLoading = ref(false), recipientError = ref('')
let usersVersion = 0, historyVersion = 0, recipientVersion = 0, disposed = false, previousPayload = '', previousKey = ''
function toggleUser(user, checked) {
  selectedUsers.value = checked ? [...selectedUsers.value.filter(item => item.id !== user.id), user] : selectedUsers.value.filter(item => item.id !== user.id)
}
function searchUsers() { recipientSearch.pageNo = 1; loadUsers() }
async function loadUsers() {
  const version = ++usersVersion; usersLoading.value = true
  try { const result = await listRecipientOptions({...recipientSearch, pageSize: 20}); if (!disposed && version === usersVersion) { Object.assign(options, result); error.value = '' } }
  catch { if (!disposed && version === usersVersion) error.value = '用户清单加载失败，请重新搜索' }
  finally { if (version === usersVersion && !disposed) usersLoading.value = false }
}
function preview() {
  error.value = ''; success.value = ''; sendError.value = ''
  if (!form.title.trim() || !form.body.trim()) { error.value = '请填写标题和正文'; return }
  if (form.audience === 'USERS' && !selectedUsers.value.length) { error.value = '请至少选择一位接收用户'; return }
  const payload = {...form, title: form.title.trim(), body: form.body.trim(), userIds: form.audience === 'ALL' ? [] : selectedUsers.value.map(user => user.id).sort()}
  // 网络结果不确定时保留同一键；编辑内容后才创建新的发送操作。
  const signature = JSON.stringify(payload)
  if (signature !== previousPayload) { previousPayload = signature; previousKey = createMessageSendKey() }
  pending.value = {...payload, idempotencyKey: previousKey}
  pendingNames.value = selectedUsers.value.map(user => user.displayName || user.username).join('、')
  previewOpen.value = true
}
async function confirmSend() {
  if (sending.value || !pending.value) return
  sending.value = true; sendError.value = ''
  try {
    await sendMessage(pending.value)
    if (disposed) return
    previewOpen.value = false; success.value = '消息已发送，接收用户可以在消息中心查看。'
    Object.assign(form, initialForm()); selectedUsers.value = []; previousPayload = ''; previousKey = ''; pending.value = null
    tab.value = 'history'; historyQuery.pageNo = 1; await Promise.all([loadHistory(), refreshMessages()])
  } catch (failure) { if (!disposed) sendError.value = failure.response?.data?.message || failure.message || '发送结果暂未确认，请重试；重复点击不会重复发送' }
  finally { sending.value = false }
}
async function loadHistory() {
  const version = ++historyVersion; historyLoading.value = true
  try { const result = await listSentMessages({...historyQuery, category: historyQuery.category || undefined, pageSize: 20}); if (!disposed && version === historyVersion) { Object.assign(history, result); error.value = '' } }
  catch { if (!disposed && version === historyVersion) error.value = '发送记录加载失败，请重试' }
  finally { if (version === historyVersion && !disposed) historyLoading.value = false }
}
function showRecipients(message) { recipientMessage.value = message; recipientsPage.value = 1; recipients.list = []; loadRecipients() }
async function loadRecipients() {
  const version = ++recipientVersion; recipientsLoading.value = true; recipientError.value = ''
  try { const result = await listMessageRecipients(recipientMessage.value.id, {pageNo: recipientsPage.value, pageSize: 20}); if (!disposed && version === recipientVersion) Object.assign(recipients, result) }
  catch { if (!disposed && version === recipientVersion) recipientError.value = '阅读情况加载失败，请重试' }
  finally { if (version === recipientVersion && !disposed) recipientsLoading.value = false }
}
onBeforeUnmount(() => { disposed = true })
loadUsers()
</script>
<style scoped>.message-preview-body{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.8;max-height:40vh;overflow:auto}</style>
