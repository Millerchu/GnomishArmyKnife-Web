<template>
  <button
    class="theme-toggle"
    type="button"
    :aria-label="toggleLabel"
    :title="toggleLabel"
    @click="handleToggle"
  >
    <svg
      v-if="appliedTheme === THEME_PREFERENCE.DARK"
      class="theme-toggle-icon"
      data-theme-icon="sun"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3.5" fill="currentColor" />
      <path
        d="M12 2.25v2.1M12 19.65v2.1M2.25 12h2.1M19.65 12h2.1M5.1 5.1l1.48 1.48M17.42 17.42l1.48 1.48M18.9 5.1l-1.48 1.48M6.58 17.42 5.1 18.9"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-width="1.8"
      />
    </svg>

    <svg
      v-else
      class="theme-toggle-icon"
      data-theme-icon="moon"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M20.46 15.28A8.8 8.8 0 0 1 8.72 3.54 8.8 8.8 0 1 0 20.46 15.28Z"
        fill="currentColor"
      />
    </svg>
  </button>
</template>

<script setup>
import {computed, ref} from 'vue'

import {
  getAppliedTheme,
  THEME_PREFERENCE,
  toggleThemePreference
} from '../utils/themePreference'

const appliedTheme = ref(getAppliedTheme())

const toggleLabel = computed(() => appliedTheme.value === THEME_PREFERENCE.DARK
  ? '切换为浅色主题'
  : '切换为深色主题')

function handleToggle() {
  const {resolvedTheme} = toggleThemePreference()
  appliedTheme.value = resolvedTheme
}
</script>

<style scoped>
.theme-toggle {
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  padding: 0;
  border: 1px solid var(--theme-border);
  border-radius: 50%;
  display: inline-grid;
  place-items: center;
  color: var(--theme-text);
  background: var(--theme-control-surface);
  box-shadow: var(--theme-shadow-xs);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  cursor: pointer;
  transition:
    color 180ms ease,
    background-color 180ms ease,
    border-color 180ms ease,
    transform 180ms ease;
}

.theme-toggle:hover {
  border-color: var(--theme-border-strong);
  background: var(--theme-surface-hover);
  color: var(--theme-accent);
  transform: translateY(-1px);
}

.theme-toggle:active {
  transform: translateY(0) scale(0.94);
}

.theme-toggle:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 4px var(--theme-focus-ring),
    var(--theme-shadow-xs);
}

.theme-toggle-icon {
  width: 19px;
  height: 19px;
  display: block;
}

@media (max-width: 640px) {
  .theme-toggle {
    width: 34px;
    height: 34px;
    flex-basis: 34px;
  }

  .theme-toggle-icon {
    width: 17px;
    height: 17px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .theme-toggle {
    transition: none;
  }

  .theme-toggle:hover,
  .theme-toggle:active {
    transform: none;
  }
}
</style>
