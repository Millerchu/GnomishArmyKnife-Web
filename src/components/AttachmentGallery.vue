<template>
  <div v-if="attachments.length" class="attachment-gallery">
    <button v-for="attachment in attachments" :key="attachment.id" type="button" @click="open(attachment)">
      <AuthenticatedImage
        v-if="attachment.image || `${attachment.contentType || ''}`.startsWith('image/')"
        :attachment-id="attachment.id"
        :thumbnail="attachment.thumbnailAvailable !== false"
        :alt="attachment.originalFileName"
      />
      <span v-else class="gallery-file">{{ attachment.originalFileName }}</span>
    </button>
  </div>
</template>

<script>
import AuthenticatedImage from '@/components/AuthenticatedImage.vue'
import {getAttachmentBlob} from '@/api/attachment'

export default {
  name: 'AttachmentGallery',
  components: {AuthenticatedImage},
  props: {attachments: {type: Array, default: () => []}},
  setup() {
    const open = async (attachment) => {
      const response = await getAttachmentBlob(attachment.id, false)
      const url = URL.createObjectURL(response.data)
      window.open(url, '_blank', 'noopener')
      window.setTimeout(() => URL.revokeObjectURL(url), 60000)
    }
    return {open}
  }
}
</script>

<style scoped>
.attachment-gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(112px, 1fr)); gap: 10px; }
.attachment-gallery button { height: 104px; padding: 0; overflow: hidden; border: 1px solid rgba(148, 163, 184, .3); border-radius: 13px; background: rgba(248, 250, 252, .76); cursor: zoom-in; }
.attachment-gallery button > * { width: 100%; height: 100%; }
.gallery-file { display: grid; place-items: center; padding: 10px; color: #475569; font-size: 12px; overflow-wrap: anywhere; }
</style>
