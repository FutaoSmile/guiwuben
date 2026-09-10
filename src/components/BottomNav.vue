<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();

function navigate(target: string) {
  if (target === 'add') {
    router.push({ name: 'item-form' });
  } else if (target === 'settings') {
    router.push({ name: 'settings' });
  } else {
    router.push('/');
  }
}

function isActive(target: string): boolean {
  if (target === 'home') return route.path === '/';
  if (target === 'add') return route.path === '/add';
  if (target === 'settings') return route.path === '/settings';
  return false;
}
</script>

<template>
  <nav class="bottom-nav" role="tablist" aria-label="底部导航">
    <!-- Home Tab -->
    <button
      class="bottom-nav__tab"
      :class="{ 'bottom-nav__tab--active': isActive('home') }"
      role="tab"
      :aria-selected="isActive('home')"
      aria-label="首页"
      type="button"
      @click="navigate('home')"
    >
      <svg
        class="bottom-nav__icon"
        width="24" height="24"
        viewBox="0 0 24 24"
        fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round"
        aria-hidden="true"
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
      <span class="bottom-nav__label">首页</span>
    </button>

    <!-- Add Tab (center, prominent) -->
    <button
      class="bottom-nav__tab bottom-nav__tab--add"
      :class="{ 'bottom-nav__tab--active': isActive('add') }"
      role="tab"
      :aria-selected="isActive('add')"
      aria-label="新增记录"
      type="button"
      @click="navigate('add')"
    >
      <span class="bottom-nav__add-icon" aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </span>
      <span class="bottom-nav__label">新增</span>
    </button>

    <!-- Settings Tab -->
    <button
      class="bottom-nav__tab"
      :class="{ 'bottom-nav__tab--active': isActive('settings') }"
      role="tab"
      :aria-selected="isActive('settings')"
      aria-label="设置"
      type="button"
      @click="navigate('settings')"
    >
      <svg
        class="bottom-nav__icon"
        width="24" height="24"
        viewBox="0 0 24 24"
        fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
      <span class="bottom-nav__label">设置</span>
    </button>
  </nav>
</template>

<style scoped>
.bottom-nav {
  --nav-height: 76px;
  --nav-bg: rgba(255, 255, 255, 0.92);
  --nav-text: var(--color-text-tertiary, #94a3b8);
  --nav-text-active: var(--color-primary, #6366f1);
  --nav-border: var(--color-border, #e2e8f0);
  --nav-add-bg: var(--color-primary, #6366f1);
  --nav-add-text: #ffffff;

  display: flex;
  align-items: flex-start;
  justify-content: space-around;
  height: calc(var(--nav-height) + env(safe-area-inset-bottom, 0px));
  padding-bottom: env(safe-area-inset-bottom, 0px);
  background: var(--nav-bg);
  border: 1px solid rgba(255, 255, 255, 0.96);
  border-bottom: none;
  position: fixed;
  bottom: 0;
  left: 12px;
  right: 12px;
  z-index: 100;
  max-width: 496px;
  margin: 0 auto;
  border-radius: 24px 24px 0 0;
  box-shadow: 0 -10px 35px rgba(73, 91, 140, 0.12);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.bottom-nav__tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex: 1;
  min-width: 64px;
  min-height: 44px;
  padding: 8px 0 0;
  background: transparent;
  border: none;
  color: var(--nav-text);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: color 0.2s;
  position: relative;
}

.bottom-nav__tab--active {
  color: var(--nav-text-active);
}

.bottom-nav__tab--active:not(.bottom-nav__tab--add)::after {
  content: '';
  position: absolute;
  bottom: 3px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}

.bottom-nav__icon {
  display: block;
}

.bottom-nav__label {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.2;
}

/* ========= Add Tab (Center, Prominent) ========= */
.bottom-nav__tab--add {
  position: relative;
  padding-top: 0;
  margin-top: -20px;
}

.bottom-nav__add-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(145deg, #7277ff, #4c45ec);
  color: var(--nav-add-text);
  box-shadow: 0 10px 24px rgba(79, 70, 229, 0.34);
  transition: transform 0.2s, box-shadow 0.2s;
}

.bottom-nav__tab--add:active .bottom-nav__add-icon {
  transform: scale(0.92);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.2);
}

/* ========= Responsive ========= */
@media (max-width: 359px) {
  .bottom-nav {
    --nav-height: 56px;
  }
  .bottom-nav__add-icon {
    width: 46px;
    height: 46px;
  }
  .bottom-nav__tab--add {
    margin-top: -8px;
  }
}

@media (min-width: 420px) {
  .bottom-nav {
    max-width: 496px;
    left: 50%;
    right: auto;
    width: calc(100% - 24px);
    transform: translateX(-50%);
  }
}
</style>
