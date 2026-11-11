import {onBeforeUnmount, onMounted, ref} from 'vue'
import {readAuthState} from '@/utils/authStorage'
import {readUserStorage, userStorageKey} from '@/utils/workbenchStorage'

export function useWorkbenchPreference(key, decode, encode = JSON.stringify) {
  let identity = readAuthState()
  const value = ref(read())
  function read() {
    try { return decode(readUserStorage(localStorage, key, identity.user?.id)) }
    catch { return decode(null) }
  }
  function sync() {
    const next = readAuthState()
    if (next.token === identity.token && next.user?.id === identity.user?.id) return
    identity = next
    value.value = read()
  }
  function save(next) {
    sync()
    value.value = next
    try {
      localStorage.setItem(userStorageKey(key, identity.user?.id), encode(next))
      return true
    } catch { return false }
  }
  onMounted(() => window.addEventListener('gak:auth-changed', sync))
  onBeforeUnmount(() => window.removeEventListener('gak:auth-changed', sync))
  return {value, save}
}
