<template>
  <CardState :loading="loading" :error="error" :empty="empty" empty-title="暂无已发布经验" empty-text="这里展示最近已发布的经验；新增经验可能需要审核。"
    action-label="＋ 新增经验" type-code="KNOWLEDGE_ENTRY" route="/knowledge-base" app-name="经验库" @retry="load" @create="$emit('create', $event)">
    <ul class="wb-knowledge-list">
      <li v-for="(entry, index) in data.list" :key="index">
        <button type="button" class="wb-knowledge-entry" @click="router.push('/knowledge-base')">
          <strong class="wb-truncate" :title="entry.title">{{ entry.title }}</strong>
          <span class="wb-entry-meta"><span class="wb-truncate">{{ entry.category }}</span><time>{{ entry.updatedAt || '暂无日期' }}</time></span>
          <p v-if="entry.summary" class="wb-entry-summary">{{ entry.summary }}</p>
        </button>
      </li>
    </ul>
  </CardState>
</template>
<script setup>
import {computed} from 'vue'
import {useRouter} from 'vue-router'
import {listKnowledgeEntries} from '@/api/knowledgeBase'
import {useWorkbenchResource, workbenchPayload} from '@/composables/useWorkbenchResource'
import {workbenchKnowledgeEntries} from '@/utils/workbenchData'
import CardState from './CardState.vue'
const props = defineProps({refreshKey: Number})
const emit = defineEmits(['create', 'state'])
const router = useRouter()
const {loading, error, data, load} = useWorkbenchResource(async () => workbenchKnowledgeEntries(await workbenchPayload(listKnowledgeEntries({view: 'published', pageNo: 1, pageSize: 5}))), emit, () => props.refreshKey)
const empty = computed(() => data.value && !data.value.list.length)
</script>
