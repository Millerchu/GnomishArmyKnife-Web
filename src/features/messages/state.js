import {reactive} from 'vue'
import {getMessageSummary, consumeMessageStream, markAllMessagesRead} from '../../api/messages'

export const categoryLabels = {ANNOUNCEMENT: '系统公告', BUSINESS: '业务提醒', SECURITY: '安全通知'}
export const sourceLabel = (source = '') => source.startsWith('ADMIN:') ? '管理员' : source === 'PERMISSION' ? '权限管理' : source
export const formatMessageTime = (value) => value ? new Date(value).toLocaleString('zh-CN', {hour12: false}) : '—'
export const messageState = reactive({unreadCount: 0, recent: [], categoryCounts: {}, loading: false, error: '', connected: false, notice: null, revision: 0})
let session = null
let noticeTimer
let noticeGroupStarted = 0

export function dismissMessageNotice() {
  clearTimeout(noticeTimer)
  messageState.notice = null
}
function showNotice(notice) {
  clearTimeout(noticeTimer)
  messageState.notice = notice
  noticeTimer = setTimeout(dismissMessageNotice, 8000)
}

function showArrivals(arrivals, count) {
  const now = Date.now()
  const previous = messageState.notice
  const merge = previous?.kind === 'arrival' && now - noticeGroupStarted < 5000
  if (!merge) noticeGroupStarted = now
  const total = count + (merge ? previous.count : 0)
  const latest = arrivals[0]
  showNotice({kind: 'arrival', count: total, title: total > 1 ? `收到 ${total} 条新消息` : latest?.title || '收到新消息',
    source: sourceLabel(latest?.source), id: total === 1 ? latest?.id : null,
    important: latest?.priority === 'IMPORTANT' || (merge && previous.important)})
}

// 会话对象隔离异步响应，退出或切换账号后旧请求不得重新写入状态。
export function startMessageSession(token) {
  if (session?.token === token) return
  stopMessageSession()
  const current = {token, initialized: false, known: new Set(), permissionRevision: null, backoff: 1000,
    summaryController: new AbortController(), refreshPromise: null, refreshAgain: false}
  session = current
  refreshMessages()
  current.poll = setInterval(refreshMessages, 30000)
  connect(current)
}

export function stopMessageSession() {
  if (session) {
    clearInterval(session.poll)
    clearTimeout(session.retry)
    clearTimeout(session.eventTimer)
    clearTimeout(session.watchdog)
    session.streamController?.abort()
    session.summaryController.abort()
  }
  session = null
  dismissMessageNotice()
  Object.assign(messageState, {unreadCount: 0, recent: [], categoryCounts: {}, loading: false, error: '', connected: false, revision: 0})
}

export async function refreshMessages() {
  const current = session
  if (!current) return
  if (current.refreshPromise) { current.refreshAgain = true; return current.refreshPromise }
  messageState.loading = true
  current.refreshPromise = (async () => {
    try {
      const summary = await getMessageSummary(current.summaryController.signal)
      if (session !== current) return
      const recent = summary.recent || []
      const arrivals = recent.filter(item => !current.known.has(String(item.messageId)) && !item.readAt)
      if (!current.initialized) {
        if (summary.unreadCount) showNotice({kind: 'login', title: `你有 ${summary.unreadCount} 条未读消息`, source: '打开消息中心查看', count: summary.unreadCount})
      } else {
        const increase = Math.max(0, summary.unreadCount - messageState.unreadCount)
        if (arrivals.length || increase) showArrivals(arrivals, Math.max(arrivals.length, increase))
      }
      recent.forEach(item => current.known.add(String(item.messageId)))
      // 此集合仅在页面会话内防止重复弹窗，不承担离线消息持久化。
      if (current.known.size > 5000) current.known = new Set([...current.known].slice(-2500))
      if (current.permissionRevision !== null && current.permissionRevision !== summary.permissionRevision) {
        window.dispatchEvent(new Event('gak:permissions-changed'))
      }
      current.permissionRevision = summary.permissionRevision
      current.initialized = true
      Object.assign(messageState, {unreadCount: summary.unreadCount, recent, categoryCounts: summary.categoryCounts, error: ''})
      messageState.revision++
    } catch (error) {
      if (session === current && !current.summaryController.signal.aborted) messageState.error = '消息暂时无法更新，请重试'
    } finally {
      current.refreshPromise = null
      if (session === current) {
        messageState.loading = false
        if (current.refreshAgain) { current.refreshAgain = false; refreshMessages() }
      }
    }
  })()
  return current.refreshPromise
}

async function connect(current) {
  if (session !== current) return
  current.streamController = new AbortController()
  const armWatchdog = () => {
    clearTimeout(current.watchdog)
    current.watchdog = setTimeout(() => current.streamController.abort(), 45000)
  }
  armWatchdog()
  try {
    await consumeMessageStream({token: current.token, signal: current.streamController.signal, onEvent: ({event}) => {
      if (session !== current) return
      armWatchdog()
      messageState.connected = true
      current.backoff = 1000
      if (event === 'heartbeat') return
      clearTimeout(current.eventTimer)
      current.eventTimer = setTimeout(refreshMessages, 100)
    }})
  } catch (error) {
    if (error.authExpired) { if (session === current) stopMessageSession(); return }
  } finally {
    clearTimeout(current.watchdog)
  }
  if (session !== current) return
  messageState.connected = false
  current.retry = setTimeout(() => connect(current), Math.min(30000, current.backoff + Math.random() * 500))
  current.backoff = Math.min(current.backoff * 2, 30000)
}

export async function readAllMessages() {
  await markAllMessagesRead()
  await refreshMessages()
}
