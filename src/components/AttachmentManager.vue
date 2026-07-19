<template>
  <section class="attachment-manager">
    <div class="attachment-manager-head">
      <div>
        <strong>{{ title }}</strong>
        <span>{{ modelValue.length }} / {{ maxCount }}</span>
      </div>
      <label class="attachment-upload" :class="{disabled: uploading || modelValue.length >= maxCount}">
        <input :accept="accept" type="file" multiple :disabled="uploading || modelValue.length >= maxCount" @change="handleFiles" />
        {{ uploading ? `上传中 ${progress}%` : '选择文件' }}
      </label>
    </div>

    <p v-if="hint" class="attachment-hint">{{ hint }}</p>
    <p v-if="errorMessage" class="attachment-error">{{ errorMessage }}</p>

    <div v-if="modelValue.length" class="attachment-grid">
      <article
        v-for="(attachment, index) in modelValue"
        :key="attachment.id"
        class="attachment-card"
        :class="{'is-dragging': draggingIndex === index}"
        draggable="true"
        @dragstart="startDrag(index)"
        @dragover.prevent
        @drop.prevent="dropAt(index)"
        @dragend="draggingIndex = null"
      >
        <AuthenticatedImage
          v-if="attachment.image || `${attachment.contentType || ''}`.startsWith('image/')"
          :attachment-id="attachment.id"
          :thumbnail="attachment.thumbnailAvailable !== false"
          :alt="attachment.originalFileName"
        />
        <div v-else class="attachment-file-icon">{{ fileBadge(attachment) }}</div>
        <div class="attachment-meta">
          <strong :title="attachment.originalFileName">{{ attachment.originalFileName }}</strong>
          <span>{{ formatSize(attachment.fileSize) }}</span>
        </div>
        <div class="attachment-actions">
          <button type="button" :disabled="index === 0" title="前移" @click="move(index, -1)">←</button>
          <button type="button" :disabled="index === modelValue.length - 1" title="后移" @click="move(index, 1)">→</button>
          <button type="button" class="danger" title="移除" @click="remove(attachment)">×</button>
        </div>
      </article>
    </div>
    <div v-if="failedFiles.length" class="attachment-failures">
      <span>{{ failedFiles.length }} 个文件上传失败</span>
      <button type="button" :disabled="uploading" @click="retryFailed">重试失败项</button>
    </div>
  </section>
</template>

<script>
import {ref} from 'vue'
import AuthenticatedImage from '@/components/AuthenticatedImage.vue'
import {deleteAttachment, uploadAttachment} from '@/api/attachment'

function unwrapData(response) {
  return response?.data?.data ?? response?.data
}

export default {
  name: 'AttachmentManager',
  components: {AuthenticatedImage},
  props: {
    modelValue: {type: Array, default: () => []},
    usageType: {type: String, default: 'IMAGE'},
    maxCount: {type: Number, default: 9},
    accept: {type: String, default: 'image/jpeg,image/png,image/webp,image/gif'},
    title: {type: String, default: '附件与图片'},
    hint: {type: String, default: ''}
  },
  emits: ['update:modelValue'],
  setup(props, {emit}) {
    const uploading = ref(false)
    const progress = ref(0)
    const errorMessage = ref('')
    const failedFiles = ref([])
    const draggingIndex = ref(null)

    const update = (items) => emit('update:modelValue', items.map((item, index) => ({...item, sortNo: index})))

    const uploadFiles = async (files) => {
      if (!files.length) return
      uploading.value = true
      errorMessage.value = ''
      const fileProgress = new Map(files.map((file) => [file, 0]))
      const results = await Promise.allSettled(files.map((file) => uploadAttachment(file, props.usageType, (progressEvent) => {
        fileProgress.set(file, progressEvent.total ? progressEvent.loaded / progressEvent.total : 0)
        progress.value = Math.round([...fileProgress.values()].reduce((sum, value) => sum + value, 0) * 100 / files.length)
      })))
      const uploaded = []
      const failed = []
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          uploaded.push({...unwrapData(result.value), _pending: true})
        } else {
          failed.push(files[index])
        }
      })
      if (uploaded.length) update([...props.modelValue, ...uploaded])
      failedFiles.value = failed
      errorMessage.value = failed.length ? '部分文件上传失败，可保留成功项并重试失败项' : ''
      uploading.value = false
      progress.value = 0
    }

    const handleFiles = async (event) => {
      const remaining = props.maxCount - props.modelValue.length
      const files = Array.from(event.target.files || []).slice(0, remaining)
      event.target.value = ''
      await uploadFiles(files)
    }

    const retryFailed = async () => {
      const files = [...failedFiles.value]
      failedFiles.value = []
      await uploadFiles(files)
    }

    const remove = async (attachment) => {
      if (attachment._pending) {
        try { await deleteAttachment(attachment.id) } catch (error) { /* 延迟清理会兜底 */ }
      }
      update(props.modelValue.filter((item) => item.id !== attachment.id))
    }

    const move = (index, direction) => {
      const target = index + direction
      if (target < 0 || target >= props.modelValue.length) return
      const items = [...props.modelValue]
      ;[items[index], items[target]] = [items[target], items[index]]
      update(items)
    }

    const startDrag = (index) => { draggingIndex.value = index }
    const dropAt = (targetIndex) => {
      const sourceIndex = draggingIndex.value
      draggingIndex.value = null
      if (sourceIndex === null || sourceIndex === targetIndex) return
      const items = [...props.modelValue]
      const [moved] = items.splice(sourceIndex, 1)
      items.splice(targetIndex, 0, moved)
      update(items)
    }

    const formatSize = (bytes) => {
      const size = Number(bytes || 0)
      if (size < 1024) return `${size} B`
      if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
      return `${(size / 1024 / 1024).toFixed(1)} MB`
    }
    const fileBadge = (item) => `${item.originalFileName || ''}`.split('.').pop()?.slice(0, 4).toUpperCase() || 'FILE'

    return {
      uploading, progress, errorMessage, failedFiles, draggingIndex,
      handleFiles, retryFailed, remove, move, startDrag, dropAt, formatSize, fileBadge
    }
  }
}
</script>

<style scoped>
.attachment-manager { grid-column: 1 / -1; padding: 12px; border: 1px solid var(--theme-border); border-radius: 14px; background: var(--theme-surface-muted); }
.attachment-manager-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.attachment-manager-head > div { display: flex; align-items: baseline; gap: 8px; color: var(--theme-text); }
.attachment-manager-head span, .attachment-hint { color: var(--theme-text-muted); font-size: 12px; }
.attachment-upload { padding: 7px 12px; border-radius: 10px; background: var(--theme-accent); color: var(--theme-on-accent); font-size: 12px; cursor: pointer; }
.attachment-upload.disabled { opacity: .5; cursor: not-allowed; }
.attachment-upload input { display: none; }
.attachment-hint, .attachment-error { margin: 7px 0 0; }
.attachment-error { color: var(--theme-danger); font-size: 12px; }
.attachment-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(132px, 1fr)); gap: 9px; margin-top: 10px; }
.attachment-card { position: relative; min-width: 0; overflow: hidden; border: 1px solid var(--theme-border); border-radius: 12px; background: var(--theme-surface-raised); }
.attachment-card.is-dragging { opacity: .45; }
.attachment-card > :first-child { display: grid; width: 100%; height: 86px; place-items: center; }
.attachment-file-icon { background: linear-gradient(145deg, var(--theme-surface-muted), var(--theme-surface-strong)); color: var(--theme-text-soft); font-weight: 800; font-size: 13px; letter-spacing: .08em; }
.attachment-meta { min-width: 0; padding: 7px 8px 5px; display: grid; gap: 2px; }
.attachment-meta strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; color: var(--theme-text); }
.attachment-meta span { font-size: 10px; color: var(--theme-text-muted); }
.attachment-actions { display: flex; justify-content: flex-end; gap: 3px; padding: 0 6px 6px; }
.attachment-actions button { width: 24px; height: 22px; border: 0; border-radius: 7px; background: var(--theme-control-surface); cursor: pointer; color: var(--theme-text-soft); }
.attachment-actions button:disabled { opacity: .35; cursor: default; }
.attachment-actions .danger { color: var(--theme-danger); }
.attachment-failures { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 9px; color: var(--theme-danger); font-size: 12px; }
.attachment-failures button { border: 1px solid color-mix(in srgb, var(--theme-danger) 30%, transparent); border-radius: 8px; padding: 5px 9px; background: var(--theme-danger-soft); color: var(--theme-danger); cursor: pointer; }

@media (max-width: 720px) {
  .attachment-manager-head,
  .attachment-failures {
    flex-wrap: wrap;
  }

  .attachment-upload,
  .attachment-failures button {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .attachment-grid {
    grid-template-columns: repeat(auto-fill, minmax(152px, 1fr));
  }

  .attachment-actions {
    gap: 4px;
  }

  .attachment-actions button {
    width: 44px;
    min-width: 44px;
    height: 44px;
    min-height: 44px;
  }
}
</style>
