<template>
  <div class="star-page" @dblclick="enterHome">
    <canvas
      ref="canvasRef"
      class="star-canvas"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @wheel.prevent="onWheel"
    />

    <div class="overlay-panel">
      <p class="eyebrow">JAY CHOU · LYRIC SCULPTURE</p>
      <h1 class="title">3D JAY 歌词字阵</h1>
      <p class="desc">双击字阵可进入主页</p>
      <p class="desc">手势：移动手掌旋转，拇指和食指捏合缩放</p>
      <p class="status">{{ gestureStatus }}</p>
      <button class="enter-btn" @click="enterHome">进入主页</button>
    </div>

    <video ref="videoRef" class="camera-preview" autoplay playsinline muted/>
  </div>
</template>

<script>
import {onBeforeUnmount, onMounted, ref} from 'vue'
import {onBeforeRouteLeave, useRouter} from 'vue-router'

const HANDS_SCRIPT = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js'

const JAY_MASK_WIDTH = 1100
const JAY_MASK_HEIGHT = 470
const JAY_SAMPLE_GAP = 11
const JAY_PARTICLE_LIMIT = 1050
const JAY_DEPTH = 170
const JAY_SCENE_SCALE = 1.3
const AMBIENT_STAR_COUNT = 180
const Z_OFFSET = 1300

// 只使用短歌词片段作为字形纹理，既能辨认出处，也不会让画面被长句压满。
const LYRIC_FRAGMENTS = [
  '天青色',
  '等烟雨',
  '雨下',
  '整夜',
  '最美的',
  '不是',
  '下雨天',
  '你发',
  '如雪',
  '快使用',
  '双截棍'
]
const LYRIC_GLYPHS = Array.from(LYRIC_FRAGMENTS.join(''))

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function randomInRange(min, max) {
  return Math.random() * (max - min) + min
}

// 手势能力依赖外部脚本，这里做一次性加载并缓存到页面级。
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-external-script="${src}"]`)
    if (existing) {
      if (existing.getAttribute('data-loaded') === '1') {
        resolve()
      } else {
        existing.addEventListener('load', () => resolve(), {once: true})
        existing.addEventListener('error', () => reject(new Error(`script load failed: ${src}`)), {once: true})
      }
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.setAttribute('data-external-script', src)
    script.onload = () => {
      script.setAttribute('data-loaded', '1')
      resolve()
    }
    script.onerror = () => reject(new Error(`script load failed: ${src}`))
    document.head.appendChild(script)
  })
}

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const targetIndex = Math.floor(Math.random() * (index + 1))
    ;[items[index], items[targetIndex]] = [items[targetIndex], items[index]]
  }
  return items
}

// 在离屏画布上绘制粗体 JAY，再从不透明像素中采样歌词粒子，保证缩放后轮廓仍清晰。
function createJayLyricParticles() {
  const maskCanvas = document.createElement('canvas')
  maskCanvas.width = JAY_MASK_WIDTH
  maskCanvas.height = JAY_MASK_HEIGHT
  const maskContext = maskCanvas.getContext('2d', {willReadFrequently: true})

  if (!maskContext) {
    return []
  }

  maskContext.fillStyle = '#fff'
  maskContext.font = '900 390px Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif'
  maskContext.textAlign = 'center'
  maskContext.textBaseline = 'middle'
  maskContext.fillText('JAY', JAY_MASK_WIDTH / 2, JAY_MASK_HEIGHT / 2 + 16)

  const pixels = maskContext.getImageData(0, 0, JAY_MASK_WIDTH, JAY_MASK_HEIGHT).data
  const candidates = []

  for (let y = JAY_SAMPLE_GAP / 2; y < JAY_MASK_HEIGHT; y += JAY_SAMPLE_GAP) {
    for (let x = JAY_SAMPLE_GAP / 2; x < JAY_MASK_WIDTH; x += JAY_SAMPLE_GAP) {
      const alphaIndex = (Math.floor(y) * JAY_MASK_WIDTH + Math.floor(x)) * 4 + 3
      if (pixels[alphaIndex] < 150) {
        continue
      }
      candidates.push({x, y})
    }
  }

  return shuffle(candidates)
    .slice(0, JAY_PARTICLE_LIMIT)
    .map((point, index) => ({
      x: (point.x - JAY_MASK_WIDTH / 2 + randomInRange(-1.2, 1.2)) * JAY_SCENE_SCALE,
      y: (point.y - JAY_MASK_HEIGHT / 2 + randomInRange(-1.2, 1.2)) * JAY_SCENE_SCALE,
      z: Math.random() < 0.76 ? JAY_DEPTH : randomInRange(-JAY_DEPTH, JAY_DEPTH),
      lyric: LYRIC_GLYPHS[index % LYRIC_GLYPHS.length],
      twinkle: Math.random() * 0.22,
      seed: Math.random() * Math.PI * 2
    }))
}

function createAmbientStars() {
  return Array.from({length: AMBIENT_STAR_COUNT}, () => ({
    x: randomInRange(-1100, 1100),
    y: randomInRange(-700, 700),
    z: randomInRange(-400, 450),
    size: randomInRange(0.25, 1.1),
    seed: Math.random() * Math.PI * 2
  }))
}

function distance(a, b) {
  const dx = (a?.x || 0) - (b?.x || 0)
  const dy = (a?.y || 0) - (b?.y || 0)
  return Math.sqrt(dx * dx + dy * dy)
}

function palmCenter(landmarks) {
  const points = [0, 5, 9, 13, 17]
  const total = points.reduce((acc, index) => {
    const point = landmarks[index] || {x: 0, y: 0}
    return {
      x: acc.x + point.x,
      y: acc.y + point.y
    }
  }, {x: 0, y: 0})
  return {
    x: total.x / points.length,
    y: total.y / points.length
  }
}

export default {
  name: 'StarInteractive',
  setup() {
    const router = useRouter()
    const canvasRef = ref(null)
    const videoRef = ref(null)
    const gestureStatus = ref('正在尝试启动摄像头手势识别...')

    let lyricParticles = []
    let ambientStars = []
    let animationFrame = 0
    let lastRenderTimestamp = 0
    let ctx = null

    let width = 0
    let height = 0
    let dpr = 1

    let rotationX = 0.08
    let rotationY = 0.18
    let targetRotationX = 0.08
    let targetRotationY = 0.18

    let zoom = 1
    let targetZoom = 1

    let dragging = false
    let lastPointerX = 0
    let lastPointerY = 0

    let handsInstance = null
    let mediaStream = null
    let gestureFrame = 0
    let lastPalm = null
    let lastPinchDistance = null
    let isDisposed = false
    let leavingPage = false
    let userAdjustedZoom = false

    const stopMediaStream = (stream) => {
      if (!stream || typeof stream.getTracks !== 'function') {
        return
      }
      stream.getTracks().forEach((track) => {
        try {
          track.enabled = false
          track.stop()
        } catch (error) {
          console.warn('停止媒体轨道失败', error)
        }
      })
    }

    // 路由离开、双击进入主页或初始化中断时都走同一套摄像头清理逻辑。
    const cleanupCamera = async () => {
      lastPalm = null
      lastPinchDistance = null
      if (gestureFrame) {
        cancelAnimationFrame(gestureFrame)
        gestureFrame = 0
      }

      const videoElement = videoRef.value
      stopMediaStream(videoElement?.srcObject)
      stopMediaStream(mediaStream)

      if (videoElement) {
        try {
          videoElement.pause()
        } catch (error) {
          console.warn('暂停摄像头预览失败', error)
        }
        videoElement.srcObject = null
      }

      if (handsInstance && typeof handsInstance.close === 'function') {
        try {
          await handsInstance.close()
        } catch (error) {
          console.warn('关闭手势实例失败', error)
        }
      }

      handsInstance = null
      mediaStream = null
    }

    const enterHome = async () => {
      if (leavingPage) {
        return
      }
      leavingPage = true
      isDisposed = true
      gestureStatus.value = '正在关闭摄像头并进入主页...'
      await cleanupCamera()
      router.push('/home')
    }

    const resizeCanvas = () => {
      const canvas = canvasRef.value
      if (!canvas || !ctx) {
        return
      }
      dpr = window.devicePixelRatio || 1
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      if (!userAdjustedZoom) {
        const fittedZoom = clamp((width - 28) / 560, 0.58, 1)
        zoom = fittedZoom
        targetZoom = fittedZoom
      }
    }

    const render = (timestamp) => {
      if (!ctx) {
        return
      }

      // 歌词字粒子按 30fps 绘制，避免高分屏上频繁 fillText 阻塞页面其他图层合成。
      if (timestamp - lastRenderTimestamp < 33) {
        animationFrame = requestAnimationFrame(render)
        return
      }
      lastRenderTimestamp = timestamp

      rotationX += (targetRotationX - rotationX) * 0.08
      rotationY += (targetRotationY - rotationY) * 0.08
      zoom += (targetZoom - zoom) * 0.08
      if (!dragging && !lastPalm) {
        targetRotationY += 0.00065
      }

      const cosX = Math.cos(rotationX)
      const sinX = Math.sin(rotationX)
      const cosY = Math.cos(rotationY)
      const sinY = Math.sin(rotationY)
      const focal = 1040 * zoom

      ctx.fillStyle = 'rgba(1, 3, 10, 0.38)'
      ctx.fillRect(0, 0, width, height)

      for (let i = 0; i < ambientStars.length; i += 1) {
        const star = ambientStars[i]
        const x1 = star.x * cosY - star.z * sinY
        const z1 = star.x * sinY + star.z * cosY
        const y2 = star.y * cosX - z1 * sinX
        const z2 = star.y * sinX + z1 * cosX + Z_OFFSET

        if (z2 <= 35) {
          continue
        }

        const perspective = focal / z2
        const x2 = x1 * perspective + width / 2
        const y3 = y2 * perspective + height / 2

        if (x2 < -30 || x2 > width + 30 || y3 < -30 || y3 > height + 30) {
          continue
        }

        const alpha = clamp(0.34 + Math.sin(timestamp * 0.001 + star.seed) * 0.2, 0.08, 0.56)
        const radius = clamp(star.size * perspective * 5, 0.15, 2.4)

        ctx.beginPath()
        ctx.fillStyle = `rgba(176, 211, 255, ${alpha})`
        ctx.arc(x2, y3, radius, 0, Math.PI * 2)
        ctx.fill()
      }

      // 由远及近绘制歌词，纵深颜色从冷蓝过渡到香槟金，增强挤出立体感。
      const projectedLyrics = []
      for (let i = 0; i < lyricParticles.length; i += 1) {
        const particle = lyricParticles[i]
        const x1 = particle.x * cosY - particle.z * sinY
        const z1 = particle.x * sinY + particle.z * cosY
        const y2 = particle.y * cosX - z1 * sinX
        const z2 = particle.y * sinX + z1 * cosX + Z_OFFSET

        if (z2 <= 35) {
          continue
        }

        const perspective = focal / z2
        const x2 = x1 * perspective + width / 2
        const y3 = y2 * perspective + height / 2
        if (x2 < -100 || x2 > width + 100 || y3 < -30 || y3 > height + 30) {
          continue
        }

        projectedLyrics.push({particle, perspective, x: x2, y: y3, z: z2})
      }

      projectedLyrics.sort((left, right) => right.z - left.z)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = `700 ${clamp(9.2 * zoom, 5.2, 10.2)}px "PingFang SC", "Microsoft YaHei", sans-serif`
      ctx.shadowColor = 'rgba(145, 205, 255, 0.32)'
      ctx.shadowBlur = 2
      for (let i = 0; i < projectedLyrics.length; i += 1) {
        const projected = projectedLyrics[i]
        const depthRatio = clamp((projected.particle.z + JAY_DEPTH) / (JAY_DEPTH * 2), 0, 1)
        const twinkle = Math.sin(timestamp * 0.0011 + projected.particle.seed) * projected.particle.twinkle
        const alpha = clamp(0.42 + depthRatio * 0.5 + twinkle, 0.26, 1)
        const red = Math.round(128 + depthRatio * 127)
        const green = Math.round(194 + depthRatio * 45)
        const blue = Math.round(255 - depthRatio * 88)
        ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`
        ctx.fillText(projected.particle.lyric, projected.x, projected.y)
      }
      ctx.shadowBlur = 0

      animationFrame = requestAnimationFrame(render)
    }

    const onPointerDown = (event) => {
      dragging = true
      lastPointerX = event.clientX
      lastPointerY = event.clientY
    }

    const onPointerMove = (event) => {
      if (!dragging) {
        return
      }
      const dx = event.clientX - lastPointerX
      const dy = event.clientY - lastPointerY
      lastPointerX = event.clientX
      lastPointerY = event.clientY
      targetRotationY += dx * 0.004
      targetRotationX = clamp(targetRotationX + dy * 0.004, -1.2, 1.2)
    }

    const onPointerUp = () => {
      dragging = false
    }

    const onWheel = (event) => {
      userAdjustedZoom = true
      targetZoom = clamp(targetZoom + (-event.deltaY * 0.0012), 0.55, 2.8)
    }

    const onHandsResults = (results) => {
      const hand = results?.multiHandLandmarks?.[0]
      if (!hand) {
        lastPalm = null
        lastPinchDistance = null
        gestureStatus.value = '未检测到手势，可用鼠标拖拽与滚轮操作字阵'
        return
      }

      const currentPalm = palmCenter(hand)
      const pinchDistance = distance(hand[4], hand[8])
      const isPinching = pinchDistance < 0.065

      if (lastPalm) {
        const dx = currentPalm.x - lastPalm.x
        const dy = currentPalm.y - lastPalm.y

        if (isPinching) {
          if (lastPinchDistance !== null) {
            userAdjustedZoom = true
            targetZoom = clamp(targetZoom + (pinchDistance - lastPinchDistance) * 15, 0.55, 2.8)
          }
          gestureStatus.value = '检测到捏合手势：缩放歌词字阵'
        } else {
          targetRotationY += dx * 5
          targetRotationX = clamp(targetRotationX + dy * 5, -1.2, 1.2)
          gestureStatus.value = '检测到手掌移动：旋转歌词字阵'
        }
      }

      lastPalm = currentPalm
      lastPinchDistance = pinchDistance
    }

    // 手势初始化是异步流程，中途如果页面已经销毁，需要随时中断并回收摄像头。
    const initGestureControl = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        gestureStatus.value = '当前浏览器不支持摄像头手势识别，可使用鼠标操作'
        return
      }

      try {
        await loadScript(HANDS_SCRIPT)
        if (isDisposed) {
          return
        }

        if (!window.Hands) {
          gestureStatus.value = '手势组件不可用，可使用鼠标操作'
          return
        }

        handsInstance = new window.Hands({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        })

        handsInstance.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.55
        })
        if (isDisposed) {
          await cleanupCamera()
          return
        }

        handsInstance.onResults(onHandsResults)
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: {ideal: 640},
            height: {ideal: 480},
            facingMode: 'user'
          },
          audio: false
        })

        if (isDisposed) {
          await cleanupCamera()
          return
        }

        const videoElement = videoRef.value
        if (!videoElement) {
          await cleanupCamera()
          return
        }

        videoElement.srcObject = mediaStream
        await videoElement.play()

        const runGestureFrame = async () => {
          if (isDisposed || !handsInstance || !videoRef.value) {
            return
          }

          if (videoRef.value.readyState >= 2) {
            try {
              await handsInstance.send({image: videoRef.value})
            } catch (error) {
              console.warn('手势识别帧处理失败', error)
            }
          }

          if (!isDisposed) {
            gestureFrame = requestAnimationFrame(runGestureFrame)
          }
        }

        gestureFrame = requestAnimationFrame(runGestureFrame)
        gestureStatus.value = '摄像头已开启：移动手掌可旋转，捏合可缩放'
      } catch (error) {
        console.error(error)
        if (!isDisposed) {
          gestureStatus.value = '摄像头或手势识别启动失败，可使用鼠标操作'
        }
      }
    }

    // 页面挂载时同时启动歌词字阵渲染和手势识别，两者共享同一个销毁时机。
    onMounted(() => {
      isDisposed = false
      leavingPage = false
      lyricParticles = createJayLyricParticles()
      ambientStars = createAmbientStars()
      ctx = canvasRef.value?.getContext('2d')
      resizeCanvas()
      animationFrame = requestAnimationFrame(render)
      window.addEventListener('resize', resizeCanvas)
      window.addEventListener('pointerup', onPointerUp)
      window.addEventListener('pointercancel', onPointerUp)
      initGestureControl()
    })

    onBeforeRouteLeave(async (_to, _from, next) => {
      isDisposed = true
      leavingPage = true
      await cleanupCamera()
      next()
    })

    onBeforeUnmount(async () => {
      isDisposed = true
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
      }
      window.removeEventListener('resize', resizeCanvas)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
      await cleanupCamera()
    })

    return {
      canvasRef,
      videoRef,
      gestureStatus,
      enterHome,
      onPointerDown,
      onPointerMove,
      onWheel
    }
  }
}
</script>

<style scoped>
.star-page {
  position: relative;
  width: 100%;
  min-height: 100vh;
  height: 100%;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 46%, rgba(27, 67, 106, 0.28), transparent 38%),
    radial-gradient(circle at 82% 18%, rgba(188, 139, 70, 0.1), transparent 28%),
    #01030a;
  cursor: grab;
}

.star-page::after {
  position: absolute;
  inset: 0;
  z-index: 2;
  content: '';
  pointer-events: none;
  background: radial-gradient(circle at center, transparent 48%, rgba(0, 0, 0, 0.58) 100%);
}

.star-page:active {
  cursor: grabbing;
}

.star-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  touch-action: none;
}

.overlay-panel {
  position: absolute;
  top: 18px;
  left: 18px;
  z-index: 5;
  max-width: min(360px, calc(100vw - 36px));
  border-radius: 4px 18px 18px 18px;
  padding: 15px 16px 16px;
  background: linear-gradient(145deg, rgba(5, 10, 22, 0.76), rgba(10, 18, 30, 0.54));
  border: 1px solid rgba(225, 194, 139, 0.24);
  color: #f6f8ff;
  box-shadow: 0 18px 55px rgba(0, 0, 0, 0.32), inset 0 1px rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(14px);
}

.eyebrow {
  margin: 0 0 6px;
  color: #e6c98e;
  font-family: "Avenir Next Condensed", "DIN Condensed", sans-serif;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.22em;
}

.title {
  margin: 0 0 8px;
  font-family: Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif;
  font-size: 23px;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-shadow: 0 0 18px rgba(160, 209, 255, 0.28);
}

.desc {
  margin: 4px 0;
  font-size: 13px;
  color: rgba(246, 248, 255, 0.85);
}

.status {
  margin: 8px 0 10px;
  font-size: 12px;
  color: #9ed8ff;
}

.enter-btn {
  border: 1px solid rgba(237, 214, 168, 0.32);
  border-radius: 10px;
  height: 36px;
  width: 100%;
  padding: 0 12px;
  color: #fff9ec;
  cursor: pointer;
  font-weight: 700;
  letter-spacing: 0.08em;
  background: linear-gradient(110deg, rgba(46, 130, 194, 0.78), rgba(181, 132, 66, 0.78));
  transition: transform 0.18s ease, filter 0.18s ease;
}

.enter-btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.14);
}

.camera-preview {
  position: absolute;
  right: 18px;
  bottom: 18px;
  z-index: 5;
  width: 168px;
  height: 126px;
  border-radius: 3px 14px 14px 14px;
  border: 1px solid rgba(225, 194, 139, 0.3);
  background: rgba(0, 0, 0, 0.55);
  object-fit: cover;
  opacity: 0.68;
  box-shadow: 0 16px 45px rgba(0, 0, 0, 0.38);
}

@media (max-width: 720px) {
  .overlay-panel {
    left: 12px;
    right: 12px;
    top: 12px;
    max-width: none;
    padding: 12px;
  }

  .camera-preview {
    width: 132px;
    height: 100px;
    right: 12px;
    bottom: 12px;
  }
}

@media (max-width: 480px) {
  .overlay-panel {
    border-radius: 14px;
  }

  .title {
    font-size: 18px;
  }

  .desc {
    font-size: 12px;
  }

  .status {
    line-height: 1.5;
  }

  .camera-preview {
    width: 96px;
    height: 72px;
    right: 10px;
    bottom: 10px;
    opacity: 0.62;
  }
}
</style>
