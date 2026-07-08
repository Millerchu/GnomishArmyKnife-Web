<template>
  <div class="app">
    <!-- 背景层（带渐变遮罩 + 动画） -->
    <div class="bg-layer" :style="bgStyle"></div>

    <!-- 内容层 -->
    <div class="content">
      <router-view/>
    </div>
  </div>
</template>

<script>
import {onMounted, ref} from 'vue'

const FALLBACK_BACKGROUND = `
  linear-gradient(
    180deg,
    rgba(2, 8, 16, 0.84) 0%,
    rgba(7, 30, 45, 0.84) 48%,
    rgba(26, 34, 44, 0.88) 100%
  ),
  linear-gradient(135deg, #06111f 0%, #0b2c3f 46%, #2b3141 100%)
`

export default {
  setup() {
    const bgStyle = ref({
      background: FALLBACK_BACKGROUND,
      opacity: 1,
      transition: 'opacity 1.2s ease'
    })

    // 加载 Bing 壁纸（带缓存）
    const loadWallpaper = async () => {
      const cacheKey = 'bing_wallpaper'
      const cacheDateKey = 'bing_wallpaper_date'
      const today = new Date().toDateString()

      // 如果缓存存在且是今天 → 直接用缓存
      const cachedUrl = localStorage.getItem(cacheKey)
      const cachedDate = localStorage.getItem(cacheDateKey)

      if (cachedUrl && cachedDate === today) {
        setBg(cachedUrl)
        return
      }

      // 否则请求新壁纸
      try {
        const res = await fetch(
            'https://bing.biturl.top/?resolution=1920&format=json&index=0&mkt=zh-CN'
        )
        const data = await res.json()
        const url = data.url

        // 缓存
        localStorage.setItem(cacheKey, url)
        localStorage.setItem(cacheDateKey, today)

        setBg(url)
      } catch (e) {
        setFallbackBg()
        console.error('壁纸加载失败：', e)
      }
    }

    // 设置背景并淡入
    const setBg = (url) => {
      bgStyle.value = {
        background: `
          linear-gradient(
            rgba(0,0,0,0.45),
            rgba(0,0,0,0.45)
          ),
          url(${url}) center/cover no-repeat
        `,
        opacity: 1,
        transition: 'opacity 1.2s ease'
      }
    }

    const setFallbackBg = () => {
      bgStyle.value = {
        background: FALLBACK_BACKGROUND,
        opacity: 1,
        transition: 'opacity 1.2s ease'
      }
    }

    onMounted(() => {
      loadWallpaper()
    })

    return {bgStyle}
  }
}
</script>

<style>
.app {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  position: relative;
}

/* 背景层 */
.bg-layer {
  position: absolute;
  inset: 0;
  z-index: 1;
}

/* 内容层 */
.content {
  position: relative;
  z-index: 2;
  width: 100%;
  height: 100%;
}
</style>
