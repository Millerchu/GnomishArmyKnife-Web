<template>
  <div
    v-if="active"
    ref="host"
    class="message-host"
    :class="{'is-inline': inline}"
    @keydown.esc.stop="closePanel"
  >
    <button ref="bell" class="message-bell" type="button" :aria-label="`消息，${state.unreadCount} 条未读`"
      :aria-expanded="open" aria-controls="message-popover" @click="togglePanel">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"/><path d="M9 21h6"/></svg>
      <span v-if="state.unreadCount" class="message-badge">{{ state.unreadCount > 99 ? '99+' : state.unreadCount }}</span>
    </button>
    <section v-if="open" id="message-popover" class="message-popover" aria-label="最近消息">
      <header><div><strong>消息</strong><small>{{ state.unreadCount }} 条未读</small></div><button :disabled="busy || !state.unreadCount" @click="readAll">全部已读</button></header>
      <p v-if="state.error || actionError" class="message-error" role="alert">{{ actionError || state.error }} <button @click="refreshMessages">重试</button></p>
      <p v-if="state.loading && !state.recent.length" class="message-empty">正在加载消息…</p>
      <p v-else-if="!state.recent.length && !state.error" class="message-empty">暂时没有消息<br><small>新的通知会出现在这里</small></p>
      <ul class="message-preview-list">
        <li v-for="item in state.recent" :key="item.id"><button class="message-preview" @click="view(item.id)">
          <span class="message-dot" :class="{unread: !item.readAt, important: item.priority === 'IMPORTANT'}"></span>
          <span><strong>{{ item.title }}</strong><small>{{ sourceLabel(item.source) }} · {{ formatMessageTime(item.receivedAt) }}</small></span>
        </button></li>
      </ul>
      <footer><button @click="view()">查看全部消息 <span aria-hidden="true">→</span></button></footer>
    </section>
    <aside v-if="state.notice && !open" class="message-toast" :class="{important: state.notice.important}" role="status" aria-live="polite">
      <button class="message-toast-close" aria-label="关闭消息提示" @click="dismissMessageNotice">×</button>
      <small>{{ state.notice.source || '消息中心' }}</small><strong>{{ state.notice.title }}</strong>
      <button @click="view(state.notice.id); dismissMessageNotice()">查看消息 →</button>
    </aside>
  </div>
</template>
<script setup>
import {ref, watch, onMounted, onBeforeUnmount} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {readAuthState} from '../utils/authStorage'
import {messageState as state, startMessageSession, stopMessageSession, refreshMessages, readAllMessages, dismissMessageNotice, sourceLabel, formatMessageTime} from '../features/messages/state'
defineProps({
  inline: {
    type: Boolean,
    default: false
  }
})
const route = useRoute()
const router = useRouter()
const active = ref(false)
const open = ref(false)
const busy = ref(false)
const actionError = ref('')
const host = ref(null)
const bell = ref(null)
function syncAuth() {
  const auth = readAuthState()
  active.value = Boolean(auth.token && auth.user && !['/login', '/register'].includes(route.path))
  if (active.value) startMessageSession(auth.token)
  else { stopMessageSession(); open.value = false }
}
function closePanel() { open.value = false; bell.value?.focus() }
function togglePanel() { open.value = !open.value; if (open.value) refreshMessages() }
function outside(event) { if (!host.value?.contains(event.target)) open.value = false }
function view(id) { open.value = false; router.push({path: '/messages', query: id ? {message: String(id)} : {}}) }
async function readAll() {
  busy.value = true; actionError.value = ''
  try { await readAllMessages() } catch { actionError.value = '标记失败，请重试' } finally { busy.value = false }
}
function visible() { if (document.visibilityState === 'visible') { syncAuth(); refreshMessages() } }
watch(() => route.path, syncAuth)
onMounted(() => {
  syncAuth()
  window.addEventListener('gak:auth-changed', syncAuth)
  window.addEventListener('storage', syncAuth)
  window.addEventListener('online', refreshMessages)
  document.addEventListener('visibilitychange', visible)
  document.addEventListener('pointerdown', outside)
})
onBeforeUnmount(() => {
  stopMessageSession()
  window.removeEventListener('gak:auth-changed', syncAuth)
  window.removeEventListener('storage', syncAuth)
  window.removeEventListener('online', refreshMessages)
  document.removeEventListener('visibilitychange', visible)
  document.removeEventListener('pointerdown', outside)
})
</script>
<style scoped>
.message-host{position:fixed;right:24px;top:18px;z-index:90;color:var(--theme-text)}
.message-host.is-inline{position:relative;right:auto;top:auto;flex:0 0 40px}
.message-host button{font:inherit;color:inherit;cursor:pointer}
.message-bell{margin-left:auto;position:relative;display:grid;place-items:center;width:40px;height:40px;border:1px solid var(--theme-border);border-radius:50%;color:var(--theme-text-soft);background:var(--theme-control-surface);box-shadow:var(--theme-shadow-xs);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);transition:transform .2s ease,background .2s ease,border-color .2s ease,color .2s ease}
.message-bell:hover,.message-bell[aria-expanded="true"]{border-color:color-mix(in srgb,var(--theme-accent) 42%,var(--theme-border));color:var(--theme-accent);background:var(--theme-surface-hover)}
.message-bell:active{transform:scale(.96)}
.message-bell svg{width:18px;height:18px}.message-badge{position:absolute;right:-5px;top:-5px;background:#dc4141;color:white;border-radius:12px;padding:2px 5px;font-size:10px;min-width:17px;font-weight:700}
.message-popover{width:min(390px,calc(100vw - 24px));margin-top:10px;border:1px solid var(--theme-border);border-radius:18px;background:var(--theme-popover-surface);box-shadow:0 20px 60px #0003;overflow:hidden;backdrop-filter:blur(28px)}
.message-popover header{display:flex;align-items:center;justify-content:space-between;padding:18px;border-bottom:1px solid var(--theme-border)}
.message-popover header strong{font-size:20px}.message-popover small{display:block;margin-top:5px;color:var(--theme-text-muted);font-size:12px}
.message-popover header button,.message-popover footer button,.message-toast button{border:0;background:none;color:var(--theme-accent);font-size:12px;padding:8px}
.message-preview-list{padding:0;margin:0;list-style:none;max-height:min(55vh,480px);overflow:auto}
.message-preview{display:flex;gap:10px;text-align:left;width:100%;padding:14px 18px;border:0;background:none;border-bottom:1px solid var(--theme-border)}
.message-preview:hover{background:var(--theme-surface-hover)}.message-preview strong{font-size:14px;display:block;overflow-wrap:anywhere}.message-dot{flex:0 0 7px;width:7px;height:7px;margin-top:6px;border-radius:50%}.message-dot.unread{background:var(--theme-accent)}.message-dot.unread.important{background:#e69b38}
.message-popover footer button{width:100%;padding:14px}.message-empty{text-align:center;padding:32px 18px;line-height:1.8}.message-error{padding:0 18px;font-size:13px;color:#d96355}
.message-toast{position:absolute;top:58px;right:0;width:min(350px,calc(100vw - 24px));padding:18px 35px 12px 18px;border:1px solid var(--theme-border);border-radius:16px;background:var(--theme-popover-surface);box-shadow:0 12px 40px #0003;backdrop-filter:blur(25px)}
.message-popover~.message-toast{top:auto;margin-top:12px}.message-toast.important{border-left:3px solid #e69b38}.message-toast strong{display:block;margin:8px 0;font-size:14px;overflow-wrap:anywhere}.message-toast small{color:var(--theme-text-muted)}.message-toast .message-toast-close{position:absolute;right:8px;top:5px;font-size:20px;color:var(--theme-text-muted)}
.message-host button:disabled{opacity:.45;cursor:default}.message-host button:focus-visible{outline:2px solid var(--theme-accent);outline-offset:-2px}
@media(max-width:720px){.message-host{right:12px;top:12px}.message-host.is-inline{right:auto;top:auto;flex-basis:var(--mobile-control-size)}.message-bell{width:44px;height:44px;border-radius:14px;background:color-mix(in srgb,var(--theme-control-surface) 76%,transparent)}.message-popover{margin-top:8px}}
</style>
