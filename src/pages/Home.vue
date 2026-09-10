<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useItemsStore } from '../stores/items';
import { useCategoriesStore } from '../stores/categories';
import { useSettingsStore } from '../stores/settings';
import SummaryCard from '../components/SummaryCard.vue';
import CategoryTabs from '../components/CategoryTabs.vue';
import SearchBar from '../components/SearchBar.vue';
import SortPanel from '../components/SortPanel.vue';
import ItemCard from '../components/ItemCard.vue';
import type { Item } from '../types';
import type { SortKey } from '../stores/items';

const router = useRouter();
const itemsStore = useItemsStore();
const categoriesStore = useCategoriesStore();
const settingsStore = useSettingsStore();

const showSortPanel = ref(false);
const searchQuery = ref('');

const activeCategoryId = computed(() => itemsStore.filters.categoryId);
const sortedItems = computed(() => itemsStore.sortedItems);
const summary = computed(() => itemsStore.summary);

function onCategorySelect(categoryId: string) {
  itemsStore.setCategoryFilter(categoryId);
}

function onSearchInput(query: string) {
  searchQuery.value = query;
  itemsStore.setSearchQuery(query);
}

function onSortSelect(sortKey: SortKey) {
  itemsStore.setSortKey(sortKey);
  showSortPanel.value = false;
}

function onItemClick(item: Item) {
  router.push({ name: 'item-detail', params: { id: item.id } });
}

function goToAdd() {
  router.push({ name: 'item-form' });
}

function goToTrends() {
  router.push({ name: 'trends' });
}

const hasActiveFilters = computed(() => itemsStore.hasActiveFilters);

function clearAllFilters() {
  itemsStore.clearFilters();
  searchQuery.value = '';
}

onMounted(async () => {
  await Promise.all([
    itemsStore.loadItems(),
    categoriesStore.loadActiveCategories(),
  ]);
});
</script>

<template>
  <div class="home-page">
    <header class="home-hero">
      <div>
        <p class="home-hero__eyebrow">GUI WU BEN</p>
        <h1>归物本</h1>
        <p class="home-hero__subtitle">让每一笔投入，都清晰可见</p>
      </div>
      <button type="button" class="home-hero__note" aria-label="查看成本趋势" @click="goToTrends">
        <span>更好的生活</span>
        <span>从记录开始</span>
        <small>查看成本趋势 →</small>
      </button>
    </header>

    <!-- Summary Card -->
    <SummaryCard
      :item-count="summary.itemCount"
      :total-investment="summary.totalInvestment"
      :total-daily-cost="summary.totalDailyCost"
      :total-monthly-cost="summary.totalMonthlyCost"
      :amount-visible="settingsStore.amountVisible"
      :cost-display-unit="settingsStore.costDisplayUnit"
      @toggle-visibility="settingsStore.toggleAmountVisibility()"
      @toggle-unit="settingsStore.setCostDisplayUnit(settingsStore.costDisplayUnit === 'day' ? 'month' : 'day')"
      @add-first-item="goToAdd"
    />

    <!-- Category + Search + Sort -->
    <div class="toolbar">
      <div class="toolbar-top">
        <CategoryTabs
          :categories="categoriesStore.activeCategories"
          :active-category-id="activeCategoryId"
          @select="onCategorySelect"
        />
        <button
          class="sort-btn"
          :class="{ active: itemsStore.sortKey !== 'createdAt-desc' }"
          aria-label="排序"
          @click="showSortPanel = true"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M6 12h12M10 18h4"/>
          </svg>
          <span v-if="itemsStore.sortKey !== 'createdAt-desc'" class="sort-dot" />
        </button>
      </div>
      <SearchBar v-model="searchQuery" @update:model-value="onSearchInput" />
    </div>

    <!-- Filtered state info -->
    <div v-if="hasActiveFilters" class="filter-info">
      <span class="filter-info-text">
        筛选结果：{{ sortedItems.length }} 条记录
      </span>
      <button class="clear-filter-btn" @click="clearAllFilters">清除筛选</button>
    </div>

    <!-- Item List -->
    <div class="item-list" v-if="sortedItems.length > 0">
      <ItemCard
        v-for="item in sortedItems"
        :key="item.id"
        :item="item"
        :cost-display-unit="settingsStore.costDisplayUnit"
        :amount-visible="settingsStore.amountVisible"
        @click="onItemClick"
      />
    </div>

    <!-- Empty state -->
    <div v-else-if="!itemsStore.loading" class="empty-state">
      <div v-if="hasActiveFilters" class="empty-icon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <p>没有找到匹配的记录</p>
        <button class="clear-filter-btn primary" @click="clearAllFilters">清除筛选</button>
      </div>
      <div v-else class="empty-icon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M12 8v8M8 12h8"/>
        </svg>
        <p>还没有消费记录</p>
        <p class="empty-sub">记录长期物品或周期费用，看清每一天实际花了多少</p>
        <button class="add-first-btn" @click="goToAdd">添加第一条记录</button>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-else class="loading-skeleton">
      <div v-for="n in 3" :key="n" class="skeleton-card">
        <div class="skeleton-shape skeleton-icon" />
        <div class="skeleton-content">
          <div class="skeleton-shape skeleton-line w-60" />
          <div class="skeleton-shape skeleton-line w-40" />
          <div class="skeleton-shape skeleton-line w-30" />
        </div>
      </div>
    </div>

    <!-- Sort Panel -->
    <SortPanel
      :show="showSortPanel"
      :current-sort-key="itemsStore.sortKey"
      @close="showSortPanel = false"
      @select="onSortSelect"
    />
  </div>
</template>

<style scoped>
.home-page {
  padding: calc(22px + var(--safe-area-top)) 16px;
  padding-bottom: calc(var(--bottom-nav-height) + 32px + var(--safe-area-bottom));
  max-width: var(--content-max-width);
  margin: 0 auto;
  min-height: 100dvh;
}

.home-hero {
  min-height: 128px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 8px 24px;
}

.home-hero__eyebrow {
  margin-bottom: 4px;
  color: var(--color-primary);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 2.6px;
}

.home-hero h1 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: clamp(34px, 9vw, 46px);
  font-weight: 850;
  letter-spacing: -1.8px;
  line-height: 1.05;
}

.home-hero__subtitle {
  margin-top: 10px;
  color: var(--color-text-secondary);
  font-size: 16px;
  letter-spacing: 0.2px;
}

.home-hero__note {
  flex: 0 0 auto;
  margin-top: 8px;
  padding: 4px 2px 7px;
  color: #727fd0;
  text-align: right;
  font-family: 'KaiTi', 'STKaiti', serif;
  font-size: 15px;
  line-height: 1.45;
  transform: rotate(-4deg);
  border-bottom: 2px solid rgba(113, 126, 220, 0.4);
}

.home-hero__note span,
.home-hero__note small {
  display: block;
}

.home-hero__note small {
  margin-top: 2px;
  font-family: var(--font-family);
  font-size: 10px;
  font-weight: 650;
}

.home-hero__note:active {
  opacity: 0.7;
}

.toolbar {
  margin-top: 20px;
}

.toolbar-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sort-btn {
  flex-shrink: 0;
  position: relative;
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.88);
  color: var(--color-text-secondary);
  min-width: 52px;
  min-height: 52px;
  border: 1px solid rgba(255, 255, 255, 0.92);
  box-shadow: var(--shadow-sm);
}

.sort-btn.active {
  color: var(--color-primary);
}

.sort-dot {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 8px;
  height: 8px;
  background: var(--color-primary);
  border-radius: 50%;
}

.filter-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 4px 4px;
}

.filter-info-text {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.clear-filter-btn {
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  padding: var(--spacing-xs) var(--spacing-sm);
  min-height: 44px;
}

.clear-filter-btn.primary {
  background: var(--color-primary);
  color: white;
  border-radius: var(--radius-md);
  padding: var(--spacing-sm) var(--spacing-lg);
  margin-top: var(--spacing-md);
}

.item-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-top: 16px;
  padding: 48px 24px;
  text-align: center;
  color: var(--color-text-tertiary);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: var(--shadow-sm);
}

.empty-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
}

.empty-sub {
  font-size: var(--font-size-sm);
  max-width: 240px;
}

.add-first-btn {
  background: linear-gradient(135deg, #6f74ff, #4d46eb);
  color: white;
  border-radius: var(--radius-full);
  padding: var(--spacing-md) var(--spacing-2xl);
  font-size: var(--font-size-lg);
  font-weight: 500;
  min-height: 44px;
  margin-top: var(--spacing-md);
}

/* Loading skeleton */
.loading-skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  margin-top: var(--spacing-md);
}

.skeleton-card {
  display: flex;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
}

.skeleton-shape {
  background: var(--color-surface-secondary);
  border-radius: var(--radius-sm);
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  flex-shrink: 0;
}

.skeleton-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.skeleton-line {
  height: 12px;
}

.w-60 { width: 60%; }
.w-40 { width: 40%; }
.w-30 { width: 30%; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@media (max-width: 380px) {
  .home-page { padding-left: 12px; padding-right: 12px; }
  .home-hero { min-height: 116px; padding-left: 4px; padding-right: 4px; }
  .home-hero__note { font-size: 13px; }
}
</style>
