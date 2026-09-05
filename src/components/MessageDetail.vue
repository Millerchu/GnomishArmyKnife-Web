<template>
  <MacDialog :model-value="Boolean(message)" :title="message?.title || '消息详情'" width="640px" @update:model-value="value => {if (!value) emit('close')}">
    <template v-if="message"><div class="message-detail-meta"><span>{{ categoryLabels[message.category] }}</span><span v-if="message.priority === 'IMPORTANT'">重要</span><span>{{ sourceLabel(message.source) }}</span><span>{{ formatMessageTime(message.receivedAt || message.createdAt) }}</span></div>
      <p class="message-body">{{ message.body }}</p>
    </template>
    <template #footer><button v-if="message?.target === 'HOME'" class="msg-button primary" @click="router.push('/home')">返回桌面</button><button class="msg-button" @click="emit('close')">关闭</button></template>
  </MacDialog>
</template>
<script setup>
import {useRouter} from 'vue-router'
import MacDialog from './MacDialog.vue'
import {categoryLabels, sourceLabel, formatMessageTime} from '../features/messages/state'
defineProps({message: Object})
const emit = defineEmits(['close'])
const router = useRouter()
</script>
<style scoped>.message-detail-meta{display:flex;gap:12px;flex-wrap:wrap;font-size:12px;color:var(--theme-text-muted)}.message-body{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.8;margin-top:24px}</style>
