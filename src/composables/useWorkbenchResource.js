import {onBeforeUnmount, onMounted, ref, shallowRef, watch} from 'vue'
import {unwrapData} from '@/utils/workbenchApps'

export function useWorkbenchResource(loader, emit, refreshKey) {
  const loading = ref(true)
  const error = ref('')
  const data = shallowRef(null)
  let generation = 0
  let alive = true
  const isAlive = () => alive
  async function load() {
    const current = ++generation
    loading.value = true
    error.value = ''
    emit?.('state', {status: 'loading'})
    try {
      const result = await loader()
      if (!alive || current !== generation) return
      data.value = result
      emit?.('state', {status: 'ready', data: result})
    } catch {
      if (!alive || current !== generation) return
      error.value = '暂时无法加载，请稍后重试。'
      emit?.('state', {status: 'error'})
    } finally {
      if (alive && current === generation) loading.value = false
    }
  }
  onMounted(load)
  if (refreshKey) watch(refreshKey, load)
  onBeforeUnmount(() => { alive = false; generation++ })
  return {loading, error, data, load, isAlive}
}

export async function workbenchPayload(promise) {
  const response = await promise
  const envelope = response?.data
  if (envelope?.code != null && !['0', '200'].includes(String(envelope.code))) {
    throw new Error(envelope.message || '加载失败')
  }
  const data = unwrapData(response)
  if (data == null) throw new Error('响应缺少数据')
  return data
}
