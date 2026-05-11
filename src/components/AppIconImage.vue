<template>
  <img v-if="resolvedSrc" :src="resolvedSrc" :alt="alt" :class="imgClass"/>
</template>

<script>
import {ref, watch} from 'vue'

const PROCESSED_ICON_CACHE = new Map()

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`))
    image.src = src
  })
}

function sampleBorderColor(data, width, height) {
  const pixels = []

  for (let x = 0; x < width; x += 1) {
    pixels.push((0 * width + x) * 4)
    pixels.push(((height - 1) * width + x) * 4)
  }

  for (let y = 1; y < height - 1; y += 1) {
    pixels.push((y * width) * 4)
    pixels.push((y * width + (width - 1)) * 4)
  }

  const totals = pixels.reduce((result, offset) => {
    result.red += data[offset]
    result.green += data[offset + 1]
    result.blue += data[offset + 2]
    return result
  }, {red: 0, green: 0, blue: 0})

  const count = Math.max(pixels.length, 1)
  return {
    red: totals.red / count,
    green: totals.green / count,
    blue: totals.blue / count
  }
}

function removeChromaKey(image, chromaKey) {
  const canvas = document.createElement('canvas')
  const width = image.naturalWidth || image.width
  const height = image.naturalHeight || image.height
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d', {willReadFrequently: true})
  context.drawImage(image, 0, 0, width, height)

  const imageData = context.getImageData(0, 0, width, height)
  const {data} = imageData
  const keyColor = chromaKey || sampleBorderColor(data, width, height)
  const transparentThreshold = 14
  const opaqueThreshold = 120

  for (let offset = 0; offset < data.length; offset += 4) {
    const redDistance = data[offset] - keyColor.red
    const greenDistance = data[offset + 1] - keyColor.green
    const blueDistance = data[offset + 2] - keyColor.blue
    const distance = Math.sqrt(redDistance ** 2 + greenDistance ** 2 + blueDistance ** 2)

    if (distance <= transparentThreshold) {
      data[offset + 3] = 0
      continue
    }

    if (distance >= opaqueThreshold) {
      continue
    }

    const alphaRatio = (distance - transparentThreshold) / (opaqueThreshold - transparentThreshold)
    data[offset + 3] = Math.round(data[offset + 3] * alphaRatio)
  }

  context.putImageData(imageData, 0, 0)
  return canvas.toDataURL('image/png')
}

function parseHexColor(hexColor) {
  const normalized = `${hexColor || ''}`.replace('#', '')
  if (normalized.length !== 6) {
    return null
  }

  return {
    red: Number.parseInt(normalized.slice(0, 2), 16),
    green: Number.parseInt(normalized.slice(2, 4), 16),
    blue: Number.parseInt(normalized.slice(4, 6), 16)
  }
}

async function resolveProcessedIcon(src, chromaKey) {
  const cacheKey = `${src}::${chromaKey || 'auto'}`
  if (!PROCESSED_ICON_CACHE.has(cacheKey)) {
    PROCESSED_ICON_CACHE.set(cacheKey, loadImage(src).then((image) => {
      return removeChromaKey(image, parseHexColor(chromaKey))
    }))
  }
  return PROCESSED_ICON_CACHE.get(cacheKey)
}

export default {
  name: 'AppIconImage',
  props: {
    src: {
      type: String,
      default: ''
    },
    alt: {
      type: String,
      default: ''
    },
    imgClass: {
      type: [String, Array, Object],
      default: ''
    },
    chromaKey: {
      type: String,
      default: ''
    }
  },
  setup(props) {
    const resolvedSrc = ref('')

    watch(() => [props.src, props.chromaKey], async ([nextSrc, nextChromaKey]) => {
      if (!nextSrc) {
        resolvedSrc.value = ''
        return
      }

      if (!nextChromaKey) {
        resolvedSrc.value = nextSrc
        return
      }

      try {
        resolvedSrc.value = await resolveProcessedIcon(nextSrc, nextChromaKey)
      } catch (error) {
        resolvedSrc.value = nextSrc
      }
    }, {immediate: true})

    return {
      resolvedSrc
    }
  }
}
</script>
