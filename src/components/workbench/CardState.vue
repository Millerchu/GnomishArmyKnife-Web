<template>
  <div class="wb-card-body" :aria-busy="loading">
    <div v-if="loading" class="wb-skeleton" role="status" aria-label="正在加载">
      <i v-for="n in 4" :key="n"></i>
    </div>
    <div v-else-if="error" class="wb-empty wb-error" role="alert">
      <strong>加载失败</strong><p>{{ error }}</p><button type="button" @click="$emit('retry')">重试</button>
    </div>
    <div v-else-if="empty" class="wb-empty">
      <strong>{{ emptyTitle }}</strong><p>{{ emptyText }}</p>
    </div>
    <template v-else><slot /></template>
    <footer v-if="!loading && !error && !empty" class="wb-card-footer">
      <button type="button" class="wb-link" @click="router.push(route)">打开{{ appName }} →</button>
    </footer>
  </div>
</template>
<script setup>
import {useRouter} from 'vue-router'
defineProps({loading: Boolean, error: String, empty: Boolean, emptyTitle: String, emptyText: String, route: String, appName: String})
defineEmits(['retry'])
const router = useRouter()
</script>
