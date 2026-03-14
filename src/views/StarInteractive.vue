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
      <h1 class="title">3D 爱心星图</h1>
      <p class="desc">双击星图可进入主页</p>
      <p class="desc">手势：移动手掌旋转，拇指和食指捏合缩放</p>
      <p class="status">{{ gestureStatus }}</p>
      <button class="enter-btn" @click="enterHome">进入主页</button>
    </div>

    <video ref="videoRef" class="camera-preview" autoplay playsinline muted/>
  </div>
</template>

<script>
import {onBeforeUnmount, onMounted, ref} from 'vue'
import {useRouter} from 'vue-router'

const HANDS_SCRIPT = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js'
const CAMERA_SCRIPT = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js'

const STAR_COUNT = 1200
const HEART_SCALE = 34
const HEART_DEPTH = 130
const Z_OFFSET = 1300

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function randomInRange(min, max) {
  return Math.random() * (max - min) + min
}

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

function createHeartStar() {
  const t = randomInRange(0, Math.PI * 2)
  const fillFactor = Math.sqrt(Math.random())
  const sinT = Math.sin(t)
  const cosT = Math.cos(t)

  const heartX = 16 * sinT * sinT * sinT
  const heartY = 13 * cosT - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)

  return {
    x: heartX * HEART_SCALE * fillFactor + randomInRange(-8, 8),
    y: -heartY * HEART_SCALE * fillFactor + randomInRange(-8, 8),
    z: randomInRange(-HEART_DEPTH, HEART_DEPTH),
    size: randomInRange(0.4, 1.9),
    twinkle: Math.random() * 0.6,
    seed: Math.random() * Math.PI * 2
  }
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

    let stars = []
    let animationFrame = 0
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
    let cameraInstance = null
    let lastPalm = null
    let lastPinchDistance = null

    const enterHome = () => {
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
    }

    const render = (timestamp) => {
      if (!ctx) {
        return
      }

      rotationX += (targetRotationX - rotationX) * 0.08
      rotationY += (targetRotationY - rotationY) * 0.08
      zoom += (targetZoom - zoom) * 0.08

      const cosX = Math.cos(rotationX)
      const sinX = Math.sin(rotationX)
      const cosY = Math.cos(rotationY)
      const sinY = Math.sin(rotationY)
      const focal = 640 * zoom

      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
      ctx.fillRect(0, 0, width, height)

      for (let i = 0; i < stars.length; i += 1) {
        const star = stars[i]
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

        const twinkleWave = 0.4 + Math.sin(timestamp * 0.0012 + star.seed) * star.twinkle
        const alpha = clamp(1.3 - z2 / 1800 + twinkleWave, 0.08, 1)
        const radius = clamp(star.size * perspective * 8, 0.15, 4.5)

        ctx.beginPath()
        ctx.fillStyle = `rgba(255,255,255,${alpha})`
        ctx.arc(x2, y3, radius, 0, Math.PI * 2)
        ctx.fill()
      }

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
      targetZoom = clamp(targetZoom + (-event.deltaY * 0.0012), 0.55, 2.8)
    }

    const onHandsResults = (results) => {
      const hand = results?.multiHandLandmarks?.[0]
      if (!hand) {
        lastPalm = null
        lastPinchDistance = null
        gestureStatus.value = '未检测到手势，可用鼠标拖拽与滚轮操作'
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
            targetZoom = clamp(targetZoom + (pinchDistance - lastPinchDistance) * 15, 0.55, 2.8)
          }
          gestureStatus.value = '检测到捏合手势：缩放星图'
        } else {
          targetRotationY += dx * 5
          targetRotationX = clamp(targetRotationX + dy * 5, -1.2, 1.2)
          gestureStatus.value = '检测到手掌移动：旋转星图'
        }
      }

      lastPalm = currentPalm
      lastPinchDistance = pinchDistance
    }

    const initGestureControl = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        gestureStatus.value = '当前浏览器不支持摄像头手势识别，可使用鼠标操作'
        return
      }

      try {
        await Promise.all([loadScript(HANDS_SCRIPT), loadScript(CAMERA_SCRIPT)])

        if (!window.Hands || !window.Camera) {
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

        handsInstance.onResults(onHandsResults)

        cameraInstance = new window.Camera(videoRef.value, {
          onFrame: async () => {
            if (handsInstance) {
              await handsInstance.send({image: videoRef.value})
            }
          },
          width: 640,
          height: 480
        })

        await cameraInstance.start()
        gestureStatus.value = '摄像头已开启：移动手掌可旋转，捏合可缩放'
      } catch (error) {
        console.error(error)
        gestureStatus.value = '摄像头或手势识别启动失败，可使用鼠标操作'
      }
    }

    onMounted(() => {
      stars = Array.from({length: STAR_COUNT}, () => createHeartStar())
      ctx = canvasRef.value?.getContext('2d')
      resizeCanvas()
      animationFrame = requestAnimationFrame(render)
      window.addEventListener('resize', resizeCanvas)
      window.addEventListener('pointerup', onPointerUp)
      window.addEventListener('pointercancel', onPointerUp)
      initGestureControl()
    })

    onBeforeUnmount(() => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
      }
      window.removeEventListener('resize', resizeCanvas)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)

      if (cameraInstance && typeof cameraInstance.stop === 'function') {
        cameraInstance.stop()
      }

      const stream = videoRef.value?.srcObject
      if (stream && typeof stream.getTracks === 'function') {
        stream.getTracks().forEach((track) => track.stop())
      }
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
  height: 100%;
  overflow: hidden;
  background: #000;
  cursor: grab;
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
  max-width: 360px;
  border-radius: 12px;
  padding: 12px 14px;
  background: rgba(6, 6, 10, 0.48);
  border: 1px solid rgba(255, 255, 255, 0.16);
  color: #f6f8ff;
  backdrop-filter: blur(6px);
}

.title {
  margin: 0 0 6px;
  font-size: 20px;
}

.desc {
  margin: 4px 0;
  font-size: 13px;
  color: rgba(246, 248, 255, 0.85);
}

.status {
  margin: 8px 0 10px;
  font-size: 12px;
  color: #a9cbff;
}

.enter-btn {
  border: none;
  border-radius: 8px;
  height: 34px;
  min-width: 96px;
  padding: 0 12px;
  color: #fff;
  cursor: pointer;
  background: rgba(70, 148, 255, 0.75);
}

.camera-preview {
  position: absolute;
  right: 18px;
  bottom: 18px;
  z-index: 5;
  width: 168px;
  height: 126px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.32);
  background: rgba(0, 0, 0, 0.55);
  object-fit: cover;
  opacity: 0.74;
}

@media (max-width: 720px) {
  .overlay-panel {
    left: 12px;
    right: 12px;
    top: 12px;
    max-width: none;
  }

  .camera-preview {
    width: 132px;
    height: 100px;
    right: 12px;
    bottom: 12px;
  }
}
</style>
