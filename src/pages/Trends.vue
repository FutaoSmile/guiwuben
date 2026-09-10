<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import CostTrend from '../components/CostTrend.vue';
import { useItemsStore } from '../stores/items';
import { useSettingsStore } from '../stores/settings';

const router = useRouter();
const itemsStore = useItemsStore();
const settingsStore = useSettingsStore();

onMounted(() => itemsStore.loadItems());
</script>

<template>
  <main class="trends-page">
    <header class="trends-page__header">
      <button type="button" class="trends-page__back" aria-label="返回首页" @click="router.back()">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" aria-hidden="true">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>
      <div>
        <h1>成本趋势</h1>
        <p>观察消费成本如何随时间变化</p>
      </div>
    </header>

    <CostTrend
      v-if="itemsStore.items.length > 0"
      :items="itemsStore.items"
      :amount-visible="settingsStore.amountVisible"
    />

    <section v-else-if="!itemsStore.loading" class="trends-page__empty">
      <span class="trends-page__empty-icon" aria-hidden="true">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
          <path d="M4 19V9M10 19V5M16 19v-7M22 19V3" />
        </svg>
      </span>
      <h2>还没有趋势数据</h2>
      <p>添加一件物品或一笔周期费用后，这里会自动生成趋势。</p>
      <button type="button" @click="router.push({ name: 'item-form' })">添加记录</button>
    </section>
  </main>
</template>

<style scoped>
.trends-page {
  width: 100%;
  max-width: var(--content-max-width);
  min-height: 100vh;
  margin: 0 auto;
  padding: var(--spacing-lg) var(--spacing-md) calc(var(--spacing-3xl) + var(--safe-area-bottom));
}

.trends-page__header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding-top: var(--safe-area-top);
  margin-bottom: var(--spacing-lg);
}

.trends-page__back {
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-lg);
  color: var(--color-text-primary);
}

.trends-page__back:active { background: var(--color-surface-secondary); }
.trends-page__back:focus-visible { outline: 3px solid var(--color-primary-bg); outline-offset: 2px; }
.trends-page__header h1 { font-size: var(--font-size-xl); font-weight: 650; }
.trends-page__header p { margin-top: 2px; color: var(--color-text-secondary); font-size: var(--font-size-sm); }

.trends-page :deep(.trend-card) { margin-top: 0; }

.trends-page__empty {
  margin-top: 20vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  color: var(--color-text-secondary);
}

.trends-page__empty-icon { width: 64px; height: 64px; display: grid; place-items: center; border-radius: 20px; color: var(--color-primary); background: var(--color-primary-bg); }
.trends-page__empty h2 { margin-top: var(--spacing-lg); color: var(--color-text-primary); font-size: var(--font-size-lg); }
.trends-page__empty p { max-width: 260px; margin-top: var(--spacing-xs); font-size: var(--font-size-sm); }
.trends-page__empty button { min-height: 44px; margin-top: var(--spacing-lg); padding: 0 20px; border-radius: var(--radius-lg); background: var(--color-primary); color: white; font-weight: 600; }

.trends-page { padding: calc(20px + var(--safe-area-top)) 16px 40px; min-height: 100dvh; }
.trends-page__header { padding: 0 4px; margin-bottom: 20px; }
.trends-page__header h1 { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
.trends-page__empty { padding: 36px 20px; border-radius: var(--radius-xl); background: rgba(255, 255, 255, 0.84); box-shadow: var(--shadow-sm); }
</style>
