import request, {apiBaseUrl, redirectToLogin} from './request'
import {createSseParser} from '../utils/messageStream'

function unwrap(response) {
  if (String(response.data?.code) !== '0') throw new Error(response.data?.message || '消息请求失败')
  return response.data.data
}
export const getMessageSummary = (signal) => request.get('/messages/summary', {signal}).then(unwrap)
export const listInbox = (params) => request.get('/messages/inbox', {params}).then(unwrap)
export const getInboxMessage = (id) => request.get(`/messages/inbox/${encodeURIComponent(id)}`).then(unwrap)
export const markMessageRead = (id) => request.put(`/messages/inbox/${encodeURIComponent(id)}/read`).then(unwrap)
export const markAllMessagesRead = () => request.put('/messages/inbox/read-all').then(unwrap)
export const sendMessage = (payload) => request.post('/messages/admin/send', payload).then(unwrap)
export const listSentMessages = (params) => request.get('/messages/admin/sent', {params}).then(unwrap)
export const listMessageRecipients = (id, params) => request.get(`/messages/admin/sent/${encodeURIComponent(id)}/recipients`, {params}).then(unwrap)
export const listRecipientOptions = (params) => request.get('/messages/admin/recipient-options', {params}).then(unwrap)

// 流请求携带现有 Bearer 头，独立于普通 HTTP 的 8 秒超时。
export async function consumeMessageStream({token, signal, onEvent}) {
  const response = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/messages/stream`, {
    headers: {Authorization: `Bearer ${token}`, Accept: 'text/event-stream'},
    credentials: 'include', signal
  })
  if (response.status === 401) {
    redirectToLogin()
    const error = new Error('登录状态已失效')
    error.authExpired = true
    throw error
  }
  if (!response.ok || !response.headers.get('content-type')?.includes('text/event-stream') || !response.body) {
    throw new Error('实时消息连接暂时不可用')
  }
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  const parse = createSseParser(onEvent)
  try {
    while (!signal.aborted) {
      const {value, done} = await reader.read()
      if (done) break
      parse(decoder.decode(value, {stream: true}))
    }
  } finally {
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}
