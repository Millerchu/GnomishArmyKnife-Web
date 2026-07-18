<template>
  <span class="authenticated-image" :class="{'is-loading': loading, 'has-error': failed}">
    <img v-if="objectUrl" :src="objectUrl" :alt="alt" />
    <span v-else class="authenticated-image-placeholder">{{ failed ? '无法预览' : '读取中' }}</span>
  </span>
</template>

<script>
import {onBeforeUnmount, ref, watch} from 'vue'
import {getAttachmentBlob} from '@/api/attachment'

export default {
  name: 'AuthenticatedImage',
  props: {
    attachmentId: {type: [String, Number], required: true},
    thumbnail: {type: Boolean, default: true},
    alt: {type: String, default: ''}
  },
  setup(props) {
    const objectUrl = ref('')
    const loading = ref(false)
    const failed = ref(false)
    let requestVersion = 0

    const releaseUrl = () => {
      if (objectUrl.value) URL.revokeObjectURL(objectUrl.value)
      objectUrl.value = ''
    }

    const load = async () => {
      const version = ++requestVersion
      releaseUrl()
      loading.value = true
      failed.value = false
      try {
        let response
        try {
          response = await getAttachmentBlob(props.attachmentId, props.thumbnail)
        } catch (error) {
          if (!props.thumbnail) throw error
          response = await getAttachmentBlob(props.attachmentId, false)
        }
        if (version === requestVersion) objectUrl.value = URL.createObjectURL(response.data)
      } catch (error) {
        if (version === requestVersion) failed.value = true
      } finally {
        if (version === requestVersion) loading.value = false
      }
    }

    watch(() => [props.attachmentId, props.thumbnail], load, {immediate: true})
    onBeforeUnmount(() => {
      requestVersion += 1
      releaseUrl()
    })
    return {objectUrl, loading, failed}
  }
}
</script>

<style scoped>
.authenticated-image { display: inline-grid; width: 100%; height: 100%; place-items: center; overflow: hidden; background: var(--theme-surface-muted); }
.authenticated-image img { width: 100%; height: 100%; object-fit: cover; }
.authenticated-image-placeholder { font-size: 11px; color: var(--theme-text-muted); }
</style>
