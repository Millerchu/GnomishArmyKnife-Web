import {computed, inject, onBeforeUnmount, onMounted, provide, ref} from 'vue'
import {getCurrentUserAccessibleApps} from '@/api/permission'
import {buildDefaultAppCatalog, mergeAppCatalogList} from '@/utils/appCatalogDraft'
import {readAuthState} from '@/utils/authStorage'
import {resolvePermissionViewState} from '@/utils/permissionAccess'
import {sortHomeTools} from '@/utils/homeToolOrder'
import {resolveQuickCreateTypes} from '@/constants/quickCreateRegistry'
import {useWorkbenchPreference} from '@/composables/useWorkbenchPreference'
import {normalizeWorkbenchOrder} from '@/utils/workbenchStorage'
import {buildToolEntry, extractAccessibleApps, isSystemMenuOnlyRoute, TOOL_CUSTOM_ORDER_STORAGE_KEY, unwrapData} from '@/utils/workbenchApps'

export const WORKBENCH_ACCESS = Symbol('workbench-access')

export function useWorkbenchAccess(shared = false) {
  const injected = inject(WORKBENCH_ACCESS, null)
  if (injected) return injected
  const loading = ref(true)
  const featureCodes = ref([])
  const source = ref('unavailable')
  const catalog = ref(buildDefaultAppCatalog())
  const {value: customOrder, save: saveOrder} = useWorkbenchPreference(TOOL_CUSTOM_ORDER_STORAGE_KEY, raw => normalizeWorkbenchOrder(JSON.parse(raw)))
  const tools = computed(() => sortHomeTools(catalog.value
    .filter(app => featureCodes.value.includes(app.featureCode) && !isSystemMenuOnlyRoute(app.route))
    .map(buildToolEntry), customOrder.value))
  const quickCreateTypes = computed(() => resolveQuickCreateTypes(featureCodes.value))
  let generation = 0
  let alive = true
  let identity = null
  async function reload() {
    const current = ++generation
    const auth = readAuthState()
    const changed = !identity || identity.token !== auth.token || identity.userId !== auth.user?.id
    identity = {token: auth.token, userId: auth.user?.id}
    if (changed) {
      loading.value = true
      featureCodes.value = []
      source.value = 'unavailable'
      catalog.value = buildDefaultAppCatalog()
    }
    if (!auth.token || !auth.user) { loading.value = false; return }
    try {
      const response = await getCurrentUserAccessibleApps()
      if (!alive || current !== generation) return
      if (response?.data?.code != null && !['0', '200'].includes(String(response.data.code))) throw new Error('权限读取失败')
      const payload = unwrapData(response)
      if (payload == null || typeof payload !== 'object') throw new Error('权限响应缺少数据')
      const state = resolvePermissionViewState(payload)
      catalog.value = mergeAppCatalogList(buildDefaultAppCatalog(), extractAccessibleApps(payload))
      featureCodes.value = state.accessibleFeatureCodes
      source.value = state.appPermissionSource
    } catch {
      if (!alive || current !== generation) return
      // 同账号后台刷新失败保留最后一次成功授权；身份变化时旧值已清除。
    } finally {
      if (alive && current === generation) loading.value = false
    }
  }
  function setOrder(order) {
    // 未出现在当前授权目录的历史键也保留，恢复授权后仍沿用用户顺序。
    saveOrder(normalizeWorkbenchOrder([...normalizeWorkbenchOrder(order), ...customOrder.value]))
  }
  const access = {loading, featureCodes, source, tools, quickCreateTypes, catalog, reload, setOrder}
  if (shared) provide(WORKBENCH_ACCESS, access)
  onMounted(() => {
    reload()
    window.addEventListener('gak:permissions-changed', reload)
    window.addEventListener('gak:auth-changed', reload)
  })
  onBeforeUnmount(() => {
    alive = false
    generation++
    window.removeEventListener('gak:permissions-changed', reload)
    window.removeEventListener('gak:auth-changed', reload)
  })
  return access
}
