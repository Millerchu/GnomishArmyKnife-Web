import {computed, onBeforeUnmount, onMounted, ref} from 'vue'
import {getWorkbenchPreferences, saveWorkbenchPreferences} from '@/api/workbenchPreference'
import {readAuthState} from '@/utils/authStorage'
import {userStorageKey} from '@/utils/workbenchStorage'
import {WORKBENCH_LAYOUT_KEY} from '@/utils/workbenchLayout'
import {applyWorkbenchPayload, cloneLayout, composeWorkbenchPayload, defaultGridCards, DOCK_COLLAPSED_KEY, DOCK_ORDER_KEY, readWorkbenchGrid, WORKBENCH_GRID_KEY} from '@/utils/workbenchGrid'

export const WORKBENCH_SYNC_KEY = 'gak_workbench_sync_v1'
const preferenceEvent = 'gak:workbench-preference-changed'
const validVersion = value => Number.isSafeInteger(value) && value >= 0

export function useWorkbenchLayout() {
  let identity = readAuthState()
  let epoch = 0
  let alive = true
  let fetching = false
  let fetchTask = null
  let lastGet = -Infinity
  let dockTimer
  let dockRevision = 0
  let pendingCards = false
  let customized = hasLocalCustomization()
  const layout = ref(readWorkbenchGrid(localStorage, identity.user?.id))
  const hasCachedLayout = ref(hasCache())
  const version = ref(null)
  const pending = ref(false)
  const draft = ref(null)
  const saving = ref(false)
  const waitingForSync = ref(false)
  const busy = computed(() => saving.value || waitingForSync.value)
  const error = ref('')
  const notice = ref('')
  // 最新云端版本只在应用或成功写入后成为基准，整理中的 GET 不推进基准。
  const conflict = ref(null)
  const editing = computed(() => draft.value !== null)
  const dirty = computed(() => editing.value && JSON.stringify(draft.value.cards) !== JSON.stringify(layout.value.cards))
  const current = computed(() => draft.value || layout.value)
  restoreMarker()
  function key(name) { return userStorageKey(name, identity.user?.id) }
  function hasLocalCustomization() {
    try { return [WORKBENCH_GRID_KEY, WORKBENCH_LAYOUT_KEY, DOCK_COLLAPSED_KEY, DOCK_ORDER_KEY].some(name => localStorage.getItem(key(name)) !== null || localStorage.getItem(name) !== null) }
    catch { return false }
  }
  function hasCache() {
    try { return JSON.parse(localStorage.getItem(key(WORKBENCH_GRID_KEY)))?.schemaVersion === 1 }
    catch { return false }
  }
  function restoreMarker() {
    try {
      const marker = JSON.parse(localStorage.getItem(key(WORKBENCH_SYNC_KEY)))
      version.value = validVersion(marker?.version) ? marker.version : null
      pending.value = marker?.pending === true
      // 兼容半成品的旧标记：来源不明的待同步内容按卡片修改保护。
      pendingCards = pending.value && marker?.pendingCards !== false
    } catch { version.value = null; pending.value = false; pendingCards = false }
  }
  function mark(isPending, cardsPending = pendingCards) {
    pending.value = isPending
    pendingCards = isPending && cardsPending
    localStorage.setItem(key(WORKBENCH_SYNC_KEY), JSON.stringify({uploaded: version.value !== null && version.value > 0, version: version.value, pending: isPending, ...(isPending ? {pendingCards} : {})}))
  }
  function cache(snapshot) {
    localStorage.setItem(key(WORKBENCH_GRID_KEY), JSON.stringify(snapshot))
    localStorage.setItem(key(DOCK_COLLAPSED_KEY), String(snapshot.dock.collapsed))
    localStorage.setItem(key(DOCK_ORDER_KEY), JSON.stringify(snapshot.dock.order))
    layout.value = snapshot
    hasCachedLayout.value = true
    customized = true
    // 通知坞与 App 级共享排序重读，不触发认证/权限刷新，也不触发另一次 PUT。
    window.dispatchEvent(new CustomEvent(preferenceEvent, {detail: {userId: identity.user?.id}}))
  }
  function documentFrom(response) {
    const body = response?.data
    if (String(body?.code) !== '0' || !validVersion(body?.data?.version)) throw new Error('工作台同步响应无效')
    return body.data
  }
  function applyDocument(doc) {
    cache(applyWorkbenchPayload(doc.payload, doc.schemaVersion))
    version.value = doc.version
    mark(false)
    notice.value = ''
    conflict.value = null
  }
  function snapshot(next = layout.value) {
    const dock = readWorkbenchGrid(localStorage, identity.user?.id).dock
    return {schemaVersion: 1, ...composeWorkbenchPayload(next, dock.collapsed, dock.order)}
  }
  function begin() { clearTimeout(dockTimer); error.value = ''; draft.value = cloneLayout(layout.value) }
  function cancel(resumeDock = true) {
    draft.value = null; conflict.value = null; error.value = ''
    if (resumeDock && pending.value) scheduleDock()
  }
  function reset() { if (editing.value) draft.value.cards = defaultGridCards() }
  function active(ticket) { return alive && ticket === epoch }
  function showConflict(doc, next) {
    if (!editing.value) draft.value = cloneLayout(next)
    conflict.value = doc
    notice.value = '云端有更新，请选择要保留的布局。'
  }
  // 写入串行；revision 防止响应覆盖请求期间发生的即时坞修改。
  async function commitLayout(next, mode = 'edit', base = version.value) {
    if (saving.value) return false
    clearTimeout(dockTimer)
    const ticket = epoch
    const owner = identity
    // 卸载只结束 UI 生命周期；已提交的 PUT 仍需落缓存。换账号或登录失效则丢弃。
    const canAccept = () => {
      const auth = readAuthState()
      return identity === owner && auth.token === owner.token && Boolean(auth.token) && auth.user?.id === owner.user?.id && (active(ticket) || !alive)
    }
    const submitted = snapshot(next)
    const revision = dockRevision
    let accepted = false
    saving.value = true; error.value = ''
    try {
      const doc = documentFrom(await saveWorkbenchPreferences({version: base ?? 0, schemaVersion: 1, payload: composeWorkbenchPayload(submitted, submitted.dock.collapsed, submitted.dock.order)}))
      if (!canAccept()) return false
      // 服务端已经提交，即使本机缓存不可写也不能再次发送旧版本。
      accepted = true
      version.value = doc.version
      conflict.value = null
      if (revision === dockRevision) applyDocument(doc)
      else {
        version.value = doc.version
        cache(snapshot(applyWorkbenchPayload(doc.payload, doc.schemaVersion)))
        mark(true, false)
      }
      if (mode === 'edit') cancel(false)
      return true
    } catch (failure) {
      if (!canAccept()) return false
      if (accepted) {
        error.value = '布局保存失败：云端已保存，但本机缓存写入失败，请重试完成或取消整理。'
        if (mode !== 'edit') notice.value = error.value
        return false
      }
      const status = failure?.response?.status
      const doc = failure?.response?.data?.data
      if (status === 409 && validVersion(doc?.version)) {
        if (mode === 'dock' || mode === 'initial') { applyDocument(doc); notice.value = '应用坞设置已按其他设备的最新版本更新' }
        else if (!alive) { cache(submitted); mark(true, true) }
        else showConflict(doc, submitted)
      } else if (!status || status >= 500) {
        // 登录失效已由现有拦截器清理身份并递增 epoch，不在这里重写旧账号。
        if (!readAuthState().token) return false
        try {
          cache(snapshot(submitted)); mark(true, pendingCards || mode !== 'dock')
          if (mode === 'edit') cancel(false)
          notice.value = '已保存在本机，稍后自动同步'
        } catch { error.value = '布局保存失败，请重试或取消本次整理。' }
      } else if (status !== 401) {
        error.value = status === 400 || status === 415 ? '布局未能同步，请重试。' + (failure.response?.data?.message || '') : '布局保存失败，请重试。'
        if (mode !== 'edit') notice.value = error.value
      }
      return false
    } finally {
      if (active(ticket)) {
        saving.value = false
        if (revision !== dockRevision && !editing.value) scheduleDock()
      }
    }
  }
  function reload(force = false) {
    if (fetching) return fetchTask
    fetchTask = fetchLayout(force)
    return fetchTask
  }
  async function fetchLayout(force) {
    if (!identity.token || !identity.user || fetching || saving.value || (!force && Date.now() - lastGet < 5000)) return
    const ticket = epoch
    fetching = true; lastGet = Date.now()
    try {
      const doc = documentFrom(await getWorkbenchPreferences())
      if (!active(ticket)) return
      if (editing.value) {
        if (doc.version !== version.value) notice.value = '云端有更新，完成整理时将检查冲突。'
        return
      }
      if (pending.value) {
        if (doc.version === version.value || (version.value === null && doc.version === 0)) {
          version.value = doc.version
          await commitLayout(layout.value, pendingCards ? 'retry' : 'dock')
        } else if (pendingCards) showConflict(doc, snapshot())
        else { applyDocument(doc); notice.value = '应用坞设置已按其他设备的最新版本更新' }
      } else if (doc.version === 0 && doc.payload === null) {
        version.value = 0
        if (customized) await commitLayout(layout.value, 'initial')
        else notice.value = ''
      } else if (force || version.value !== doc.version || !hasCachedLayout.value) applyDocument(doc)
      else notice.value = ''
    } catch {
      if (active(ticket) && readAuthState().token) notice.value = pending.value ? '已保存在本机，稍后自动同步' : '暂未与服务器同步，已使用本机布局'
    } finally { if (active(ticket)) { fetching = false; fetchTask = null } }
  }
  async function finish() {
    if (!editing.value || busy.value) return
    const ticket = epoch
    waitingForSync.value = fetching
    try {
      // 等当前 GET 结束后提交；整理中的 GET 不推进基准，仍由 PUT 的 409 仲裁。
      if (fetching) await fetchTask
      if (!active(ticket) || !editing.value || saving.value) return
      waitingForSync.value = false
      await commitLayout(draft.value)
    } finally { if (active(ticket)) waitingForSync.value = false }
  }
  function useCloud() {
    if (!conflict.value || saving.value) return
    try { applyDocument(conflict.value); cancel() }
    catch { error.value = '布局缓存写入失败，请重试。' }
  }
  async function overwriteCloud() {
    if (!conflict.value || saving.value) return
    await commitLayout(draft.value, 'edit', conflict.value.version)
  }
  function scheduleDock() {
    clearTimeout(dockTimer)
    // 错误不无限重试；只在下一次用户动作或成功 GET 时重试。
    dockTimer = setTimeout(() => {
      if (editing.value || saving.value || fetching || !identity.token) return
      if (version.value === null) reload(true)
      else commitLayout(layout.value, pendingCards ? 'retry' : 'dock')
    }, 800)
  }
  function dockChanged(event) {
    if (event.detail?.userId !== identity.user?.id || ![DOCK_COLLAPSED_KEY, DOCK_ORDER_KEY].includes(event.detail?.key)) return
    dockRevision++
    try { cache(snapshot()); mark(true) } catch { notice.value = '本机缓存不可用，请完成整理以同步布局。' }
    if (!editing.value) scheduleDock()
  }
  function syncIdentity() {
    const next = readAuthState()
    if (identity.token === next.token && identity.user?.id === next.user?.id) return
    epoch++; clearTimeout(dockTimer)
    identity = next; fetching = false; fetchTask = null; saving.value = false; waitingForSync.value = false; lastGet = -Infinity; dockRevision = 0
    draft.value = null; conflict.value = null; error.value = ''; notice.value = ''
    customized = hasLocalCustomization()
    layout.value = readWorkbenchGrid(localStorage, identity.user?.id)
    hasCachedLayout.value = hasCache()
    restoreMarker()
    reload(true)
  }
  function onFocus() { reload() }
  function onVisibility() { if (document.visibilityState === 'visible') reload() }
  function beforeUnload(event) {
    if (!dirty.value) return
    event.preventDefault(); event.returnValue = ''
  }
  onMounted(() => {
    window.addEventListener('gak:auth-changed', syncIdentity)
    window.addEventListener(preferenceEvent, dockChanged)
    window.addEventListener('beforeunload', beforeUnload)
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    reload(true)
  })
  onBeforeUnmount(() => {
    alive = false; epoch++; clearTimeout(dockTimer)
    window.removeEventListener('gak:auth-changed', syncIdentity)
    window.removeEventListener(preferenceEvent, dockChanged)
    window.removeEventListener('beforeunload', beforeUnload)
    window.removeEventListener('focus', onFocus)
    document.removeEventListener('visibilitychange', onVisibility)
  })
  return {layout, hasCachedLayout, draft, current, editing, dirty, saving, busy, waitingForSync, error, notice, conflict, version, pending, begin, cancel, reset, finish, commitLayout, reload, useCloud, overwriteCloud}
}
