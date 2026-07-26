<template>
  <main class="sso-page">
    <div class="sso-grid" aria-hidden="true"></div>
    <section class="sso-card">
      <header class="brand-lockup">
        <span class="brand-frame">
          <img class="brand-mark" src="/brand/gnomish-army-knife-mark.svg" alt="侏儒军刀" />
        </span>
        <span class="brand-name">GNOMISH ARMY KNIFE</span>
      </header>

      <div class="signal-track" aria-hidden="true">
        <span class="signal-node"></span>
        <span class="signal-line"></span>
        <span class="signal-node signal-node-target"></span>
      </div>

      <div class="status-copy" role="status" aria-live="polite">
        <p class="status-kicker">NAS IDENTITY HANDOFF</p>
        <h1>{{ title }}</h1>
        <p class="status-detail">{{ status }}</p>
      </div>

      <div v-if="$slots.action" class="status-action">
        <slot name="action"></slot>
      </div>
    </section>
  </main>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true
  }
})
</script>

<style scoped>
.sso-page {
  --sso-ink: #f4f8f7;
  --sso-muted: #91a7aa;
  --sso-accent: #62e2c3;
  --sso-panel: rgb(10 24 29 / 88%);
  position: relative;
  min-height: 100vh;
  display: grid;
  place-items: center;
  overflow: hidden;
  padding: 24px;
  color: var(--sso-ink);
  background:
    radial-gradient(circle at 72% 18%, rgb(53 139 127 / 24%), transparent 32%),
    linear-gradient(145deg, #071015 0%, #0b2025 54%, #071216 100%);
}

.sso-grid {
  position: absolute;
  inset: 0;
  opacity: 0.16;
  background-image:
    linear-gradient(rgb(123 223 202 / 24%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(123 223 202 / 24%) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: linear-gradient(to bottom, black, transparent 82%);
}

.sso-card {
  position: relative;
  width: min(460px, 100%);
  padding: 34px 34px 30px;
  border: 1px solid rgb(137 234 213 / 18%);
  border-radius: 6px 28px 6px 28px;
  background: var(--sso-panel);
  box-shadow:
    0 30px 90px rgb(0 0 0 / 40%),
    inset 0 1px rgb(255 255 255 / 5%);
  backdrop-filter: blur(18px);
}

.sso-card::before {
  content: "";
  position: absolute;
  top: -1px;
  left: 34px;
  width: 86px;
  height: 2px;
  background: var(--sso-accent);
  box-shadow: 0 0 18px rgb(98 226 195 / 80%);
}

.brand-lockup {
  display: flex;
  align-items: center;
  gap: 13px;
}

.brand-frame {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border: 1px solid rgb(98 226 195 / 30%);
  border-radius: 12px;
  background: rgb(98 226 195 / 7%);
}

.brand-mark {
  width: 30px;
  height: 30px;
}

.brand-name,
.status-kicker {
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.brand-name {
  color: #c8d7d7;
  font-size: 11px;
  font-weight: 700;
}

.signal-track {
  display: grid;
  grid-template-columns: 10px 1fr 10px;
  align-items: center;
  gap: 8px;
  margin: 36px 0 30px;
}

.signal-node {
  width: 10px;
  height: 10px;
  border: 2px solid var(--sso-accent);
  border-radius: 50%;
  box-shadow: 0 0 14px rgb(98 226 195 / 60%);
}

.signal-node-target {
  animation: target-pulse 1.6s ease-in-out infinite;
}

.signal-line {
  position: relative;
  height: 1px;
  overflow: hidden;
  background: rgb(145 167 170 / 28%);
}

.signal-line::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, var(--sso-accent), transparent);
  transform: translateX(-100%);
  animation: signal-travel 1.6s ease-in-out infinite;
}

.status-kicker {
  margin: 0 0 8px;
  color: var(--sso-accent);
  font-size: 10px;
  font-weight: 700;
}

h1 {
  margin: 0;
  font-size: clamp(24px, 6vw, 34px);
  font-weight: 650;
  letter-spacing: -0.03em;
}

.status-detail {
  min-height: 1.5em;
  margin: 13px 0 0;
  color: var(--sso-muted);
  line-height: 1.6;
}

.status-action {
  margin-top: 25px;
  padding-top: 20px;
  border-top: 1px solid rgb(145 167 170 / 14%);
}

.status-action :deep(a) {
  color: var(--sso-accent);
  font-size: 14px;
  text-underline-offset: 5px;
}

@keyframes signal-travel {
  0% {
    transform: translateX(-100%);
  }
  65%,
  100% {
    transform: translateX(100%);
  }
}

@keyframes target-pulse {
  0%,
  55%,
  100% {
    background: transparent;
  }
  70% {
    background: var(--sso-accent);
  }
}

@media (max-width: 520px) {
  .sso-page {
    padding: 16px;
  }

  .sso-card {
    padding: 28px 24px 25px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .signal-line::after,
  .signal-node-target {
    animation: none;
  }
}
</style>
