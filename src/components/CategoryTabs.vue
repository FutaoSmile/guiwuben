<script setup lang="ts">
import type { Category } from '../types';

defineProps<{
  categories: Category[];
  activeCategoryId: string;
}>();

const emit = defineEmits<{
  (e: 'select', categoryId: string): void;
}>();
</script>

<template>
  <nav class="category-tabs" role="tablist" aria-label="分类筛选">
    <div class="category-tabs__scroll">
      <button
        v-for="cat in categories"
        :key="cat.id"
        class="category-tabs__pill"
        :class="{ 'category-tabs__pill--active': activeCategoryId === cat.id }"
        :style="activeCategoryId === cat.id ? {
          '--pill-active-color': cat.color,
          '--pill-active-bg': cat.color + '18',
        } : {}"
        role="tab"
        :aria-selected="activeCategoryId === cat.id"
        :aria-label="cat.name"
        type="button"
        @click="emit('select', cat.id)"
      >
        <span
          v-if="cat.iconKey && cat.iconKey !== 'all'"
          class="category-tabs__dot"
          :style="{ background: cat.color }"
          aria-hidden="true"
        ></span>
        <span
          v-else-if="cat.iconKey === 'all'"
          class="category-tabs__all-icon"
          aria-hidden="true"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <rect x="3" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/>
            <rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
        </span>
        {{ cat.name }}
      </button>
    </div>
  </nav>
</template>

<style scoped>
.category-tabs {
  --tabs-padding-x: 0;
  --tabs-gap: 10px;
  --tabs-pill-height: 48px;
  --tabs-pill-font: 14px;
  --tabs-pill-bg: var(--tab-bg, rgba(255, 255, 255, 0.52));
  --tabs-pill-text: var(--tab-text, #6b7280);
  --tabs-pill-active-text: var(--tab-active-text, #1a1a2e);
  --tabs-pill-active-bg: var(--tab-active-bg, #eef2ff);
  --tabs-pill-active-color: #6366f1;

  overflow: hidden;
  margin: 0;
  padding: 0;
}

.category-tabs__scroll {
  display: flex;
  gap: var(--tabs-gap);
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  padding: 2px var(--tabs-padding-x) 8px;
  scrollbar-width: none;
}

.category-tabs__scroll::-webkit-scrollbar {
  display: none;
}

.category-tabs__pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  min-height: 48px;
  padding: 6px 17px;
  font-size: var(--tabs-pill-font);
  font-weight: 500;
  line-height: 1.3;
  color: var(--tabs-pill-text);
  background: var(--tabs-pill-bg);
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 24px;
  box-shadow: 0 7px 18px rgba(73, 91, 140, 0.05);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

.category-tabs__pill:active {
  transform: scale(0.96);
}

.category-tabs__pill--active {
  color: #ffffff;
  background: linear-gradient(135deg, #7478ff, #5550ed);
  border-color: transparent;
  font-weight: 600;
  box-shadow: 0 10px 22px rgba(81, 75, 235, 0.24);
}

.category-tabs__pill--active .category-tabs__dot {
  background: currentColor !important;
}

.category-tabs__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.category-tabs__all-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* ========= Responsive ========= */
@media (max-width: 359px) {
  .category-tabs {
    --tabs-padding-x: 12px;
  }

  .category-tabs__pill {
    padding: 4px 12px;
    font-size: 13px;
  }
}

@media (min-width: 420px) {
  .category-tabs {
    --tabs-padding-x: 0;
  }
}

/* ========= Dark Mode ========= */
@media (prefers-color-scheme: dark) {
  .category-tabs {
    --tabs-pill-bg: #2a2a3e;
    --tabs-pill-text: #9ca3af;
    --tabs-pill-active-text: #e4e4ef;
    --tabs-pill-active-bg: rgba(129, 140, 248, 0.15);
  }
}
</style>
